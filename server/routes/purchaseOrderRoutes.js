const express = require('express');
const { body, validationResult } = require('express-validator');
const PurchaseOrder = require('../models/PurchaseOrder');
const Intent = require('../models/Intent');
const Supplier = require('../models/Supplier');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const { uploadPurchaseOrderFiles, handleUploadError } = require('../middleware/uploadMiddleware');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');
const { generatePurchaseOrderPDF } = require('../services/pdfService');
const { sendSamplePOToAdmin } = require('../services/emailService');
const { PO_STATUSES } = require('../utils/constants');
const User = require('../models/User');

const router = express.Router();

// POST /api/purchase-orders/generate-original
router.post('/generate-original', protect, authorize('admin'), async (req, res, next) => {
  try {
    const purchaseOrderController = require('../controllers/purchaseOrderController');
    return purchaseOrderController.generateOriginalPO(req, res);
  } catch (error) {
    next(error);
  }
});

// POST /api/purchase-orders/generate-sample
router.post('/generate-sample', protect, authorize('manager', 'admin'), async (req, res, next) => {
  try {
    const purchaseOrderController = require('../controllers/purchaseOrderController');
    return purchaseOrderController.generateSamplePO(req, res);
  } catch (error) {
    next(error);
  }
});

// POST /api/purchase-orders
router.post(
  '/',
  protect,
  authorize('admin', 'manager'),
  uploadPurchaseOrderFiles,
  handleUploadError,
  [
    body('supplier').isMongoId().withMessage('Valid supplier ID is required'),
    body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
    body('items.*.name').trim().notEmpty().withMessage('Item name is required'),
    body('items.*.quantity').isNumeric().withMessage('Quantity must be a number'),
    body('items.*.unitPrice').isNumeric().withMessage('Unit price must be a number'),
    body('totalAmount').isNumeric().withMessage('Total amount must be a number'),
    body('poType').optional().isIn(['NORMAL', 'OPEN']).withMessage('PO type must be NORMAL or OPEN'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return errorResponse(res, 422, errors.array().map((e) => e.msg).join(', '));
      }

      const {
        intent, supplier, items, totalAmount, tax, grandTotal,
        deliveryDate, deliveryAddress, paymentTerms, specialInstructions, type, poType,
      } = req.body;

      const isOpenPO = poType === 'OPEN';
      let intentDoc = null;
      if (!isOpenPO) {
        if (!intent) {
          return errorResponse(res, 400, 'Intent ID is required for normal purchase orders');
        }
        intentDoc = await Intent.findById(intent);
        if (!intentDoc) {
          return errorResponse(res, 404, 'Intent not found');
        }
      }

      const supplierDoc = await Supplier.findById(supplier);
      if (!supplierDoc) {
        return errorResponse(res, 404, 'Supplier not found');
      }

      const processedItems = items.map((item) => ({
        ...item,
        totalPrice: item.quantity * item.unitPrice,
      }));

      const documents = [];
      if (req.files && req.files.length > 0) {
        req.files.forEach((file) => {
          documents.push({
            name: file.originalname,
            url: file.path,
            type: file.mimetype,
          });
        });
      }

      const purchaseOrder = await PurchaseOrder.create({
        intent: isOpenPO ? undefined : intent,
        supplier,
        type: isOpenPO ? 'OPEN' : type || 'SAMPLE',
        poType: isOpenPO ? 'OPEN' : 'NORMAL',
        items: processedItems,
        totalAmount,
        tax: tax || 0,
        grandTotal: grandTotal || totalAmount,
        deliveryDate: deliveryDate ? new Date(deliveryDate) : undefined,
        deliveryAddress,
        paymentTerms,
        specialInstructions,
        documents,
        adminApproval: isOpenPO
          ? { approvedBy: req.user._id, approvedAt: new Date(), remarks: 'Open PO created', status: 'APPROVED' }
          : { status: 'PENDING' },
        status: isOpenPO ? PO_STATUSES.OPEN : undefined,
      });

      if (!isOpenPO) {
        await Intent.findByIdAndUpdate(intent, {
          purchaseOrder: purchaseOrder._id,
          status: type === 'ORIGINAL' ? 'PENDING_ADMIN_APPROVAL' : 'SAMPLE_PO_CREATED',
        });

        await Intent.findByIdAndUpdate(intent, {
          $push: {
            statusHistory: {
              status: type === 'ORIGINAL' ? 'PENDING_ADMIN_APPROVAL' : 'SAMPLE_PO_CREATED',
              changedBy: req.user._id,
              changedAt: new Date(),
              remarks: 'Purchase order created',
            },
          },
        });
      }

      const adminUsers = await require('../models/User').find({ role: 'admin', isActive: true });
      for (const admin of adminUsers) {
        await Notification.create({
          recipient: admin._id,
          sender: req.user._id,
          title: 'New Purchase Order Pending Approval',
          message: `Purchase order ${purchaseOrder.poNumber} requires your approval`,
          type: 'INFO',
          referenceModel: 'PurchaseOrder',
          referenceId: purchaseOrder._id,
        });
      }

      const populated = await PurchaseOrder.findById(purchaseOrder._id)
        .populate('intent', 'intentId title')
        .populate('supplier', 'companyName contactPerson');

      return successResponse(res, 201, 'Purchase order created', { purchaseOrder: populated });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/purchase-orders
router.get('/', protect, async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, status, supplier, intent } = req.query;

    const filter = {};
    if (search) {
      filter.$or = [
        { poNumber: { $regex: search, $options: 'i' } },
      ];
    }
    if (status) filter.status = status;
    if (supplier) filter.supplier = supplier;
    if (intent) filter.intent = intent;

    if (req.user.role === 'user') {
      const userIntents = await Intent.find({ requester: req.user._id }).select('_id');
      filter.intent = { $in: userIntents.map((i) => i._id) };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [orders, total] = await Promise.all([
      PurchaseOrder.find(filter)
        .populate('intent', 'intentId title')
        .populate('supplier', 'companyName contactPerson')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      PurchaseOrder.countDocuments(filter),
    ]);

    return paginatedResponse(res, orders, page, limit, total);
  } catch (error) {
    next(error);
  }
});

// GET /api/purchase-orders/intent/:intentId
router.get('/intent/:intentId', protect, async (req, res, next) => {
  try {
    const orders = await PurchaseOrder.find({ intent: req.params.intentId })
      .populate('supplier', 'companyName contactPerson email')
      .sort({ createdAt: -1 })
      .lean();

    return successResponse(res, 200, 'Purchase orders retrieved', { orders });
  } catch (error) {
    next(error);
  }
});

// GET /api/purchase-orders/:id
router.get('/:id', protect, async (req, res, next) => {
  try {
    const order = await PurchaseOrder.findById(req.params.id)
      .populate('intent', 'intentId title description requester department priority category estimatedCost justification deliveryDate items')
      .populate({
        path: 'intent',
        populate: [
          { path: 'requester', select: 'name email' },
          { path: 'department', select: 'name' },
        ],
      })
      .populate('supplier', 'companyName contactPerson email phone address')
      .populate('adminApproval.approvedBy', 'name email');

    if (!order) {
      return errorResponse(res, 404, 'Purchase order not found');
    }

    return successResponse(res, 200, 'Purchase order retrieved', { purchaseOrder: order });
  } catch (error) {
    next(error);
  }
});

// PUT /api/purchase-orders/:id
router.put(
  '/:id',
  protect,
  authorize('admin', 'manager'),
  uploadPurchaseOrderFiles,
  handleUploadError,
  async (req, res, next) => {
    try {
      const order = await PurchaseOrder.findById(req.params.id);
      if (!order) {
        return errorResponse(res, 404, 'Purchase order not found');
      }

      if (!['DRAFT', 'SAMPLE'].includes(order.status)) {
        return errorResponse(res, 400, 'Cannot update purchase order in current status');
      }

      const allowedFields = [
        'items', 'totalAmount', 'tax', 'grandTotal', 'deliveryDate',
        'deliveryAddress', 'paymentTerms', 'specialInstructions', 'notes',
      ];

      const updates = {};
      allowedFields.forEach((field) => {
        if (req.body[field] !== undefined) {
          updates[field] = req.body[field];
        }
      });

      if (updates.items) {
        updates.items = updates.items.map((item) => ({
          ...item,
          totalPrice: item.quantity * item.unitPrice,
        }));
      }

      if (req.files && req.files.length > 0) {
        const newDocs = req.files.map((file) => ({
          name: file.originalname,
          url: file.path,
          type: file.mimetype,
        }));
        updates.$push = { documents: { $each: newDocs } };
      }

      const updated = await PurchaseOrder.findByIdAndUpdate(req.params.id, updates, {
        new: true,
        runValidators: true,
      })
        .populate('intent', 'intentId title')
        .populate('supplier', 'companyName');

      return successResponse(res, 200, 'Purchase order updated', { purchaseOrder: updated });
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/purchase-orders/:id/approve
router.put('/:id/approve', protect, authorize('admin'), async (req, res, next) => {
  try {
    const order = await PurchaseOrder.findById(req.params.id)
      .populate('intent', 'intentId title requester');

    if (!order) {
      return errorResponse(res, 404, 'Purchase order not found');
    }

    if (order.adminApproval.status === 'APPROVED') {
      return errorResponse(res, 400, 'Purchase order already approved');
    }

    order.adminApproval = {
      approvedBy: req.user._id,
      approvedAt: new Date(),
      remarks: req.body.remarks || 'Approved',
      status: 'APPROVED',
    };
    order.status = 'APPROVED';
    order.statusHistory.push({
      status: 'APPROVED',
      changedBy: req.user._id,
      changedAt: new Date(),
      remarks: req.body.remarks || 'Approved by admin',
    });

    await order.save();

    await Intent.findByIdAndUpdate(order.intent._id, {
      status: 'PO_APPROVED',
      $push: {
        statusHistory: {
          status: 'PO_APPROVED',
          changedBy: req.user._id,
          changedAt: new Date(),
          remarks: 'Purchase order approved',
        },
      },
    });

    if (order.createdBy) {
      await Notification.create({
        recipient: order.createdBy,
        sender: req.user._id,
        title: 'Sample PO Approved',
        message: `Sample purchase order ${order.poNumber} has been approved by admin.`,
        type: 'SUCCESS',
        referenceModel: 'PurchaseOrder',
        referenceId: order._id,
      });
    }

    if (order.intent.requester) {
      await Notification.create({
        recipient: order.intent.requester,
        sender: req.user._id,
        title: 'Purchase Order Approved',
        message: `Purchase order ${order.poNumber} has been approved`,
        type: 'SUCCESS',
        referenceModel: 'PurchaseOrder',
        referenceId: order._id,
      });
    }

    return successResponse(res, 200, 'Purchase order approved', { purchaseOrder: order });
  } catch (error) {
    next(error);
  }
});

// PUT /api/purchase-orders/:id/reject
router.put('/:id/reject', protect, authorize('admin'), async (req, res, next) => {
  try {
    const order = await PurchaseOrder.findById(req.params.id)
      .populate('intent', 'intentId title requester');

    if (!order) {
      return errorResponse(res, 404, 'Purchase order not found');
    }

    order.adminApproval = {
      approvedBy: req.user._id,
      approvedAt: new Date(),
      remarks: req.body.remarks || 'Rejected',
      status: 'REJECTED',
    };
    order.status = 'CANCELLED';
    order.statusHistory.push({
      status: 'CANCELLED',
      changedBy: req.user._id,
      changedAt: new Date(),
      remarks: req.body.remarks || 'Rejected by admin',
    });

    await order.save();

    await Intent.findByIdAndUpdate(order.intent._id, {
      status: 'REJECTED_BY_ADMIN',
      $push: {
        statusHistory: {
          status: 'REJECTED_BY_ADMIN',
          changedBy: req.user._id,
          changedAt: new Date(),
          remarks: req.body.remarks || 'Purchase order rejected',
        },
      },
    });

    if (order.createdBy) {
      await Notification.create({
        recipient: order.createdBy,
        sender: req.user._id,
        title: 'Sample PO Rejected',
        message: `Sample purchase order ${order.poNumber} was rejected. Reason: ${req.body.remarks || 'No reason provided'}`,
        type: 'ERROR',
        referenceModel: 'PurchaseOrder',
        referenceId: order._id,
      });
    }

    if (order.intent.requester) {
      await Notification.create({
        recipient: order.intent.requester,
        sender: req.user._id,
        title: 'Purchase Order Rejected',
        message: `Purchase order ${order.poNumber} has been rejected. Reason: ${req.body.remarks || 'No reason provided'}`,
        type: 'ERROR',
        referenceModel: 'PurchaseOrder',
        referenceId: order._id,
      });
    }

    return successResponse(res, 200, 'Purchase order rejected', { purchaseOrder: order });
  } catch (error) {
    next(error);
  }
});

// GET /api/purchase-orders/:id/pdf
router.get('/:id/pdf', protect, async (req, res, next) => {
  try {
    const order = await PurchaseOrder.findById(req.params.id)
      .populate('intent', 'intentId title description requester department priority category justification estimatedCost items')
      .populate('supplier', 'companyName contactPerson email phone address')
      .populate('adminApproval.approvedBy', 'name email');

    if (!order) {
      return errorResponse(res, 404, 'Purchase order not found');
    }

    const filePath = await generatePurchaseOrderPDF(order);
    const fileName = `PO-${order.poNumber}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    const fileStream = require('fs').createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    next(error);
  }
});

// POST /api/purchase-orders/:id/send-sample-to-admin
router.post('/:id/send-sample-to-admin', protect, authorize('manager', 'admin'), async (req, res, next) => {
  try {
    const order = await PurchaseOrder.findById(req.params.id)
      .populate('intent', 'intentId title description requester department')
      .populate('supplier', 'companyName contactPerson email phone');

    if (!order) {
      return errorResponse(res, 404, 'Purchase order not found');
    }

    if (order.type !== 'SAMPLE') {
      return errorResponse(res, 400, 'Only Sample PO can be sent to admin');
    }

    const filePath = await generatePurchaseOrderPDF(order);

    const adminUsers = await User.find({ role: 'admin', isActive: true });

    for (const admin of adminUsers) {
      try {
        await sendSamplePOToAdmin(order, order.intent, admin, filePath);
      } catch (emailErr) {
        console.error(`Failed to send email to ${admin.email}:`, emailErr.message);
      }

      await Notification.create({
        recipient: admin._id,
        sender: req.user._id,
        title: 'Sample PO Ready for Review',
        message: `Sample PO ${order.poNumber} for intent ${order.intent?.intentId} is ready for your review`,
        type: 'INFO',
        referenceModel: 'PurchaseOrder',
        referenceId: order._id,
      });
    }

    return successResponse(res, 200, 'Sample PO sent to admin successfully', { poNumber: order.poNumber });
  } catch (error) {
    next(error);
  }
});

// POST /api/purchase-orders/:id/notify-store-manager
router.post('/:id/notify-store-manager', protect, authorize('admin'), async (req, res, next) => {
  try {
    const order = await PurchaseOrder.findById(req.params.id);
    if (!order) {
      return errorResponse(res, 404, 'Purchase order not found');
    }

    const storeManagers = await User.find({ role: 'store_manager', isActive: true });
    if (!storeManagers.length) {
      return errorResponse(res, 404, 'No store manager available');
    }

    for (const manager of storeManagers) {
      await Notification.create({
        recipient: manager._id,
        sender: req.user._id,
        title: 'Approved PO Ready for GRN',
        message: `Purchase order ${order.poNumber} is ready for goods receipt processing.`,
        type: 'INFO',
        referenceModel: 'PurchaseOrder',
        referenceId: order._id,
      });
    }

    return successResponse(res, 200, 'Store managers notified', { poNumber: order.poNumber });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
