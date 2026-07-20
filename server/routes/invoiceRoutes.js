const express = require('express');
const { body, validationResult } = require('express-validator');
const Invoice = require('../models/Invoice');
const Intent = require('../models/Intent');
const PurchaseOrder = require('../models/PurchaseOrder');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const { uploadInvoiceFiles, handleUploadError } = require('../middleware/uploadMiddleware');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');

const router = express.Router();

// POST /api/invoices
router.post(
  '/',
  protect,
  authorize('admin', 'manager'),
  uploadInvoiceFiles,
  handleUploadError,
  [
    body('intent').isMongoId().withMessage('Valid intent ID is required'),
    body('purchaseOrder').isMongoId().withMessage('Valid purchase order ID is required'),
    body('supplier').isMongoId().withMessage('Valid supplier ID is required'),
    body('invoiceNumber').trim().notEmpty().withMessage('Invoice number is required'),
    body('invoiceDate').isISO8601().withMessage('Valid invoice date is required'),
    body('amount').isNumeric().withMessage('Amount must be a number'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return errorResponse(res, 422, errors.array().map((e) => e.msg).join(', '));
      }

      const {
        intent, purchaseOrder, supplier, invoiceNumber,
        invoiceDate, dueDate, amount, tax, totalAmount, notes,
      } = req.body;

      const intentDoc = await Intent.findById(intent);
      if (!intentDoc) {
        return errorResponse(res, 404, 'Intent not found');
      }

      const poDoc = await PurchaseOrder.findById(purchaseOrder);
      if (!poDoc) {
        return errorResponse(res, 404, 'Purchase order not found');
      }

      const existingInvoice = await Invoice.findOne({ invoiceNumber });
      if (existingInvoice) {
        return errorResponse(res, 400, 'Invoice with this number already exists');
      }

      const files = [];
      if (req.files && req.files.length > 0) {
        req.files.forEach((file) => {
          files.push({
            name: file.originalname,
            url: file.path,
            uploadedAt: new Date(),
          });
        });
      }

      const computedTotal = totalAmount || (amount + (tax || 0));

      const invoice = await Invoice.create({
        intent,
        purchaseOrder,
        supplier,
        invoiceNumber,
        invoiceDate: new Date(invoiceDate),
        dueDate: dueDate ? new Date(dueDate) : undefined,
        amount,
        tax: tax || 0,
        totalAmount: computedTotal,
        files,
        status: 'PENDING',
        paymentStatus: 'UNPAID',
      });

      await Intent.findByIdAndUpdate(intent, {
        invoice: invoice._id,
        status: 'INVOICE_UPLOADED',
        $push: {
          statusHistory: {
            status: 'INVOICE_UPLOADED',
            changedBy: req.user._id,
            changedAt: new Date(),
            remarks: `Invoice ${invoiceNumber} uploaded`,
          },
        },
      });

      const adminUsers = await require('../models/User').find({ role: 'admin', isActive: true });
      for (const admin of adminUsers) {
        await Notification.create({
          recipient: admin._id,
          sender: req.user._id,
          title: 'New Invoice Pending Review',
          message: `Invoice ${invoiceNumber} has been uploaded for PO ${poDoc.poNumber}`,
          type: 'INFO',
          referenceModel: 'Invoice',
          referenceId: invoice._id,
        });
      }

      const populated = await Invoice.findById(invoice._id)
        .populate('intent', 'intentId title')
        .populate('purchaseOrder', 'poNumber')
        .populate('supplier', 'companyName');

      return successResponse(res, 201, 'Invoice uploaded', { invoice: populated });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/invoices
router.get('/', protect, async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, paymentStatus, supplier, intent } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (paymentStatus) filter.paymentStatus = paymentStatus;
    if (supplier) filter.supplier = supplier;
    if (intent) filter.intent = intent;

    if (req.user.role === 'user') {
      const userIntents = await Intent.find({ requester: req.user._id }).select('_id');
      filter.intent = { $in: userIntents.map((i) => i._id) };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [invoices, total] = await Promise.all([
      Invoice.find(filter)
        .populate('intent', 'intentId title')
        .populate('purchaseOrder', 'poNumber')
        .populate('supplier', 'companyName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Invoice.countDocuments(filter),
    ]);

    return paginatedResponse(res, invoices, page, limit, total);
  } catch (error) {
    next(error);
  }
});

// GET /api/invoices/intent/:intentId
router.get('/intent/:intentId', protect, async (req, res, next) => {
  try {
    const invoices = await Invoice.find({ intent: req.params.intentId })
      .populate('purchaseOrder', 'poNumber')
      .populate('supplier', 'companyName contactPerson')
      .populate('verifiedBy', 'name')
      .sort({ createdAt: -1 })
      .lean();

    return successResponse(res, 200, 'Invoices retrieved', { invoices });
  } catch (error) {
    next(error);
  }
});

// GET /api/invoices/:id
router.get('/:id', protect, async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('intent', 'intentId title requester')
      .populate('purchaseOrder', 'poNumber items totalAmount')
      .populate('supplier', 'companyName contactPerson email phone')
      .populate('verifiedBy', 'name email');

    if (!invoice) {
      return errorResponse(res, 404, 'Invoice not found');
    }

    return successResponse(res, 200, 'Invoice retrieved', { invoice });
  } catch (error) {
    next(error);
  }
});

// PUT /api/invoices/:id
router.put(
  '/:id',
  protect,
  authorize('admin', 'manager'),
  uploadInvoiceFiles,
  handleUploadError,
  async (req, res, next) => {
    try {
      const invoice = await Invoice.findById(req.params.id);
      if (!invoice) {
        return errorResponse(res, 404, 'Invoice not found');
      }

      if (!['PENDING', 'REJECTED'].includes(invoice.status)) {
        return errorResponse(res, 400, 'Cannot update invoice in current status');
      }

      const allowedFields = [
        'invoiceNumber', 'invoiceDate', 'dueDate', 'amount', 'tax', 'totalAmount', 'notes',
      ];

      const updates = {};
      allowedFields.forEach((field) => {
        if (req.body[field] !== undefined) {
          updates[field] = req.body[field];
        }
      });

      if (updates.amount !== undefined || updates.tax !== undefined) {
        const amt = updates.amount !== undefined ? updates.amount : invoice.amount;
        const tx = updates.tax !== undefined ? updates.tax : invoice.tax;
        updates.totalAmount = amt + tx;
      }

      if (req.files && req.files.length > 0) {
        const newFiles = req.files.map((file) => ({
          name: file.originalname,
          url: file.path,
          uploadedAt: new Date(),
        }));
        updates.$push = { files: { $each: newFiles } };
      }

      const updated = await Invoice.findByIdAndUpdate(req.params.id, updates, {
        new: true,
        runValidators: true,
      })
        .populate('intent', 'intentId title')
        .populate('purchaseOrder', 'poNumber')
        .populate('supplier', 'companyName');

      return successResponse(res, 200, 'Invoice updated', { invoice: updated });
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/invoices/:id/verify
router.put('/:id/verify', protect, authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return errorResponse(res, 404, 'Invoice not found');
    }

    if (invoice.status !== 'PENDING') {
      return errorResponse(res, 400, 'Invoice is not in pending status');
    }

    invoice.status = 'VERIFIED';
    invoice.verifiedBy = req.user._id;
    invoice.verifiedAt = new Date();
    await invoice.save();

    const updated = await Invoice.findById(invoice._id)
      .populate('intent', 'intentId title')
      .populate('purchaseOrder', 'poNumber')
      .populate('supplier', 'companyName')
      .populate('verifiedBy', 'name');

    return successResponse(res, 200, 'Invoice verified', { invoice: updated });
  } catch (error) {
    next(error);
  }
});

// PUT /api/invoices/:id/approve
router.put('/:id/approve', protect, authorize('admin'), async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('intent', 'intentId title requester');

    if (!invoice) {
      return errorResponse(res, 404, 'Invoice not found');
    }

    if (!['PENDING', 'VERIFIED'].includes(invoice.status)) {
      return errorResponse(res, 400, 'Invoice cannot be approved in current status');
    }

    invoice.status = 'APPROVED';
    await invoice.save();

    await Intent.findByIdAndUpdate(invoice.intent._id, {
      status: 'PAYMENT_PENDING',
      $push: {
        statusHistory: {
          status: 'PAYMENT_PENDING',
          changedBy: req.user._id,
          changedAt: new Date(),
          remarks: `Invoice ${invoice.invoiceNumber} approved for payment`,
        },
      },
    });

    if (invoice.intent.requester) {
      await Notification.create({
        recipient: invoice.intent.requester,
        sender: req.user._id,
        title: 'Invoice Approved',
        message: `Invoice ${invoice.invoiceNumber} has been approved for payment`,
        type: 'SUCCESS',
        referenceModel: 'Invoice',
        referenceId: invoice._id,
      });
    }

    return successResponse(res, 200, 'Invoice approved', { invoice });
  } catch (error) {
    next(error);
  }
});

// PUT /api/invoices/:id/reject
router.put('/:id/reject', protect, authorize('admin'), async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('intent', 'intentId title requester');

    if (!invoice) {
      return errorResponse(res, 404, 'Invoice not found');
    }

    if (invoice.status === 'PAID') {
      return errorResponse(res, 400, 'Cannot reject a paid invoice');
    }

    invoice.status = 'REJECTED';
    await invoice.save();

    await Intent.findByIdAndUpdate(invoice.intent._id, {
      $push: {
        statusHistory: {
          status: 'REJECTED_BY_ADMIN',
          changedBy: req.user._id,
          changedAt: new Date(),
          remarks: `Invoice ${invoice.invoiceNumber} rejected: ${req.body.reason || 'No reason provided'}`,
        },
      },
    });

    if (invoice.intent.requester) {
      await Notification.create({
        recipient: invoice.intent.requester,
        sender: req.user._id,
        title: 'Invoice Rejected',
        message: `Invoice ${invoice.invoiceNumber} has been rejected. Reason: ${req.body.reason || 'No reason provided'}`,
        type: 'ERROR',
        referenceModel: 'Invoice',
        referenceId: invoice._id,
      });
    }

    return successResponse(res, 200, 'Invoice rejected', { invoice });
  } catch (error) {
    next(error);
  }
});

// PUT /api/invoices/:id/payment
router.put(
  '/:id/payment',
  protect,
  authorize('admin'),
  [
    body('paymentStatus').isIn(['UNPAID', 'PARTIAL', 'PAID']).withMessage('Invalid payment status'),
    body('paymentMethod').optional().trim(),
    body('paymentReference').optional().trim(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return errorResponse(res, 422, errors.array().map((e) => e.msg).join(', '));
      }

      const invoice = await Invoice.findById(req.params.id)
        .populate('intent', 'intentId title requester');

      if (!invoice) {
        return errorResponse(res, 404, 'Invoice not found');
      }

      const { paymentStatus, paymentMethod, paymentReference, paymentDate } = req.body;

      invoice.paymentStatus = paymentStatus;
      if (paymentMethod) invoice.paymentMethod = paymentMethod;
      if (paymentReference) invoice.paymentReference = paymentReference;
      if (paymentDate) invoice.paymentDate = new Date(paymentDate);

      if (paymentStatus === 'PAID') {
        invoice.status = 'PAID';
        invoice.paymentDate = invoice.paymentDate || new Date();

        await Intent.findByIdAndUpdate(invoice.intent._id, {
          status: 'PAYMENT_COMPLETED',
          $push: {
            statusHistory: {
              status: 'PAYMENT_COMPLETED',
              changedBy: req.user._id,
              changedAt: new Date(),
              remarks: 'Payment completed',
            },
          },
        });

        if (invoice.intent.requester) {
          await Notification.create({
            recipient: invoice.intent.requester,
            sender: req.user._id,
            title: 'Payment Completed',
            message: `Payment for invoice ${invoice.invoiceNumber} has been completed`,
            type: 'SUCCESS',
            referenceModel: 'Invoice',
            referenceId: invoice._id,
          });
        }
      }

      await invoice.save();

      return successResponse(res, 200, 'Payment status updated', { invoice });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
