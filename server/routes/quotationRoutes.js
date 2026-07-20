const express = require('express');
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');
const Quotation = require('../models/Quotation');
const Intent = require('../models/Intent');
const Supplier = require('../models/Supplier');
const Notification = require('../models/Notification');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const { uploadQuotationFiles, handleUploadError } = require('../middleware/uploadMiddleware');
const { successResponse, errorResponse } = require('../utils/response');

const router = express.Router();

// POST /api/quotations
router.post(
  '/',
  protect,
  authorize('admin', 'manager'),
  uploadQuotationFiles,
  handleUploadError,
  [
    body('intent').isMongoId().withMessage('Valid intent ID is required'),
    body('supplier').notEmpty().withMessage('Supplier name or ID is required'),
    body('items')
      .optional()
      .custom((value) => {
        if (Array.isArray(value)) return true;
        if (typeof value === 'string') {
          try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed);
          } catch (err) {
            return false;
          }
        }
        return false;
      })
      .withMessage('Items must be an array'),
    body('totalAmount').isNumeric().withMessage('Total amount must be a number'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return errorResponse(res, 422, errors.array().map((e) => e.msg).join(', '));
      }

      const { intent, supplier, totalAmount, deliveryDays, paymentTerms, validityDays, notes, quotationNumber } = req.body;
      let items = req.body.items || [];

      if (typeof items === 'string') {
        try {
          items = JSON.parse(items);
        } catch (parseError) {
          items = [];
        }
      }

      if (!Array.isArray(items)) items = [items];

      const processedItems = items
        .filter((item) => item && (item.name?.trim() || item.unitPrice || item.quantity || item.deliveryTime || item.warranty))
        .map((item) => ({
          name: item.name?.trim() || '',
          quantity: parseFloat(item.quantity) || 0,
          unitPrice: parseFloat(item.unitPrice) || 0,
          totalPrice: (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0),
          deliveryTime: item.deliveryTime ? item.deliveryTime.toString() : '',
          warranty: item.warranty || '',
        }));

      if (!processedItems.length) {
        return errorResponse(res, 400, 'Enter item prices for quotation items');
      }

      if (processedItems.length > 0) {
        const invalidItem = processedItems.find((item) => item.quantity <= 0 || item.unitPrice < 0);
        if (invalidItem) {
          return errorResponse(res, 400, 'Quantity and unit price are required for each quoted item');
        }
      }

      const intentDoc = await Intent.findById(intent);
      if (!intentDoc) {
        return errorResponse(res, 404, 'Intent not found');
      }

      let supplierDoc = null;
      let supplierId = supplier;
      if (mongoose.Types.ObjectId.isValid(supplier)) {
        supplierDoc = await Supplier.findById(supplier);
      }

      if (!supplierDoc) {
        supplierDoc = await Supplier.findOne({
          companyName: { $regex: `^${supplier}$`, $options: 'i' },
        });
      }

      if (!supplierDoc) {
        supplierDoc = await Supplier.create({
          companyName: supplier,
          contactPerson: 'Unknown',
          email: `supplier-${Date.now()}@example.com`,
          phone: '0000000000',
        });
      }

      supplierId = supplierDoc._id;

      const existing = await Quotation.findOne({ intent, supplier: supplierId });
      if (existing) {
        return errorResponse(res, 400, 'Quotation already exists for this supplier on this intent');
      }

      const files = [];
      if (req.files && req.files.files && req.files.files.length > 0) {
        req.files.files.forEach((file) => {
          files.push({
            name: file.originalname,
            url: file.path,
            uploadedAt: new Date(),
          });
        });
      }

      const quotation = await Quotation.create({
        intent,
        supplier: supplierId,
        quotationNumber,
        files,
        items: processedItems,
        totalAmount,
        deliveryDays,
        paymentTerms,
        validityDays,
        notes,
        status: 'SUBMITTED',
      });

      await Intent.findByIdAndUpdate(intent, {
        $push: {
          quotations: quotation._id,
          statusHistory: {
            status: 'PENDING_QUOTATION',
            changedBy: req.user._id,
            changedAt: new Date(),
            remarks: `Quotation uploaded from ${supplierDoc.companyName}`,
          },
        },
      });

      const populated = await Quotation.findById(quotation._id)
        .populate('supplier', 'companyName contactPerson')
        .populate('intent', 'intentId title');

      return successResponse(res, 201, 'Quotation uploaded', { quotation: populated });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/quotations/intent/:intentId
router.get('/intent/:intentId', protect, async (req, res, next) => {
  try {
    const quotations = await Quotation.find({ intent: req.params.intentId })
      .populate('supplier', 'companyName contactPerson email phone rating')
      .sort({ createdAt: -1 })
      .lean();

    return successResponse(res, 200, 'Quotations retrieved', { quotations });
  } catch (error) {
    next(error);
  }
});

// PUT /api/quotations/:id
router.put(
  '/:id',
  protect,
  authorize('admin', 'manager'),
  uploadQuotationFiles,
  handleUploadError,
  async (req, res, next) => {
    try {
      const quotation = await Quotation.findById(req.params.id);
      if (!quotation) {
        return errorResponse(res, 404, 'Quotation not found');
      }

      const allowedFields = ['items', 'totalAmount', 'deliveryDays', 'paymentTerms', 'validityDays', 'notes', 'quotationNumber'];
      const updates = {};
      allowedFields.forEach((field) => {
        if (req.body[field] !== undefined) {
          updates[field] = req.body[field];
        }
      });

      if (updates.items) {
        let parsedItems = updates.items;
        if (typeof parsedItems === 'string') {
          try {
            parsedItems = JSON.parse(parsedItems);
          } catch (parseError) {
            parsedItems = [];
          }
        }
        if (!Array.isArray(parsedItems)) parsedItems = [parsedItems];
        updates.items = parsedItems.map((item) => ({
          ...item,
          totalPrice: item.quantity * item.unitPrice,
        }));
      }

      if (req.files && req.files.files && req.files.files.length > 0) {
        const newFiles = req.files.files.map((file) => ({
          name: file.originalname,
          url: file.path,
          uploadedAt: new Date(),
        }));
        updates.$push = { files: { $each: newFiles } };
      }


      const updated = await Quotation.findByIdAndUpdate(req.params.id, updates, {
        new: true,
        runValidators: true,
      })
        .populate('supplier', 'companyName contactPerson')
        .populate('intent', 'intentId title');

      return successResponse(res, 200, 'Quotation updated', { quotation: updated });
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/quotations/:id/select
router.put(
  '/:id/select',
  protect,
  authorize('admin', 'manager'),
  async (req, res, next) => {
    try {
      const quotation = await Quotation.findById(req.params.id)
        .populate('intent', 'intentId title requester')
        .populate('supplier', 'companyName');

      if (!quotation) {
        return errorResponse(res, 404, 'Quotation not found');
      }

      await Quotation.updateMany(
        { intent: quotation.intent._id },
        { isSelected: false, status: 'REJECTED' }
      );

      quotation.isSelected = true;
      quotation.status = 'SELECTED';
      await quotation.save();

      await Intent.findByIdAndUpdate(quotation.intent._id, {
        selectedSupplier: quotation.supplier._id,
        status: 'PENDING_PO',
      });

      await Intent.findByIdAndUpdate(quotation.intent._id, {
        $push: {
          statusHistory: {
            status: 'PENDING_PO',
            changedBy: req.user._id,
            changedAt: new Date(),
            remarks: `Supplier ${quotation.supplier.companyName} selected`,
          },
        },
      });

      const requester = quotation.intent.requester;
      if (requester) {
        await Notification.create({
          recipient: requester,
          sender: req.user._id,
          title: 'Supplier Selected',
          message: `Supplier ${quotation.supplier.companyName} has been selected for intent ${quotation.intent.intentId}`,
          type: 'SUCCESS',
          referenceModel: 'Intent',
          referenceId: quotation.intent._id,
        });
      }

      return successResponse(res, 200, 'Supplier selected successfully', { quotation });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/quotations/:id
router.delete('/:id', protect, authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const quotation = await Quotation.findById(req.params.id);
    if (!quotation) {
      return errorResponse(res, 404, 'Quotation not found');
    }

    if (quotation.isSelected) {
      return errorResponse(res, 400, 'Cannot delete a selected quotation');
    }

    await Intent.findByIdAndUpdate(quotation.intent, {
      $pull: { quotations: quotation._id },
    });

    await Quotation.findByIdAndDelete(req.params.id);

    return successResponse(res, 200, 'Quotation deleted');
  } catch (error) {
    next(error);
  }
});

module.exports = router;
