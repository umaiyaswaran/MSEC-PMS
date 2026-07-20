const express = require('express');
const { body, validationResult } = require('express-validator');
const Delivery = require('../models/Delivery');
const Intent = require('../models/Intent');
const PurchaseOrder = require('../models/PurchaseOrder');
const Notification = require('../models/Notification');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');

const router = express.Router();

// POST /api/deliveries
router.post(
  '/',
  protect,
  authorize('admin', 'manager'),
  [
    body('intent').isMongoId().withMessage('Valid intent ID is required'),
    body('purchaseOrder').isMongoId().withMessage('Valid purchase order ID is required'),
    body('supplier').isMongoId().withMessage('Valid supplier ID is required'),
    body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
    body('items.*.name').trim().notEmpty().withMessage('Item name is required'),
    body('items.*.orderedQuantity').isNumeric().withMessage('Ordered quantity must be a number'),
    body('deliveryDate').isISO8601().withMessage('Valid delivery date is required'),
    body('type').isIn(['PARTIAL', 'FULL']).withMessage('Type must be PARTIAL or FULL'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return errorResponse(res, 422, errors.array().map((e) => e.msg).join(', '));
      }

      const { intent, purchaseOrder, supplier, items, deliveryDate, type, condition, remarks } = req.body;

      const intentDoc = await Intent.findById(intent);
      if (!intentDoc) {
        return errorResponse(res, 404, 'Intent not found');
      }

      const poDoc = await PurchaseOrder.findById(purchaseOrder);
      if (!poDoc) {
        return errorResponse(res, 404, 'Purchase order not found');
      }

      const processedItems = items.map((item) => ({
        name: item.name,
        orderedQuantity: item.orderedQuantity,
        deliveredQuantity: item.deliveredQuantity || 0,
        status: item.deliveredQuantity >= item.orderedQuantity ? 'DELIVERED' : item.deliveredQuantity > 0 ? 'PARTIAL' : 'PENDING',
        notes: item.notes,
      }));

      const delivery = await Delivery.create({
        intent,
        purchaseOrder,
        supplier,
        items: processedItems,
        type,
        deliveryDate: new Date(deliveryDate),
        condition,
        remarks,
        receivedBy: req.user._id,
        status: type === 'FULL' ? 'COMPLETED' : 'PARTIAL',
      });

      const intentUpdate = {};
      if (type === 'FULL') {
        intentUpdate.status = 'FULL_DELIVERY';
        intentUpdate.delivery = delivery._id;
      } else {
        intentUpdate.status = 'PARTIAL_DELIVERY';
      }

      await Intent.findByIdAndUpdate(intent, {
        ...intentUpdate,
        $push: {
          statusHistory: {
            status: intentUpdate.status,
            changedBy: req.user._id,
            changedAt: new Date(),
            remarks: `${type} delivery recorded`,
          },
        },
      });

      const populated = await Delivery.findById(delivery._id)
        .populate('intent', 'intentId title')
        .populate('purchaseOrder', 'poNumber')
        .populate('supplier', 'companyName');

      return successResponse(res, 201, 'Delivery recorded', { delivery: populated });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/deliveries
router.get('/', protect, async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, type, supplier, intent } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (supplier) filter.supplier = supplier;
    if (intent) filter.intent = intent;

    if (req.user.role === 'user') {
      const userIntents = await Intent.find({ requester: req.user._id }).select('_id');
      filter.intent = { $in: userIntents.map((i) => i._id) };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [deliveries, total] = await Promise.all([
      Delivery.find(filter)
        .populate('intent', 'intentId title')
        .populate('purchaseOrder', 'poNumber')
        .populate('supplier', 'companyName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Delivery.countDocuments(filter),
    ]);

    return paginatedResponse(res, deliveries, page, limit, total);
  } catch (error) {
    next(error);
  }
});

// GET /api/deliveries/intent/:intentId
router.get('/intent/:intentId', protect, async (req, res, next) => {
  try {
    const deliveries = await Delivery.find({ intent: req.params.intentId })
      .populate('purchaseOrder', 'poNumber')
      .populate('supplier', 'companyName contactPerson')
      .populate('receivedBy', 'name')
      .populate('inspectedBy', 'name')
      .sort({ createdAt: -1 })
      .lean();

    return successResponse(res, 200, 'Deliveries retrieved', { deliveries });
  } catch (error) {
    next(error);
  }
});

// GET /api/deliveries/:id
router.get('/:id', protect, async (req, res, next) => {
  try {
    const delivery = await Delivery.findById(req.params.id)
      .populate('intent', 'intentId title requester')
      .populate('purchaseOrder', 'poNumber items')
      .populate('supplier', 'companyName contactPerson email phone')
      .populate('receivedBy', 'name email')
      .populate('inspectedBy', 'name email');

    if (!delivery) {
      return errorResponse(res, 404, 'Delivery not found');
    }

    return successResponse(res, 200, 'Delivery retrieved', { delivery });
  } catch (error) {
    next(error);
  }
});

// PUT /api/deliveries/:id
router.put(
  '/:id',
  protect,
  authorize('admin', 'manager'),
  async (req, res, next) => {
    try {
      const delivery = await Delivery.findById(req.params.id);
      if (!delivery) {
        return errorResponse(res, 404, 'Delivery not found');
      }

      if (!['PENDING', 'IN_TRANSIT'].includes(delivery.status)) {
        return errorResponse(res, 400, 'Cannot update delivery in current status');
      }

      const allowedFields = ['items', 'deliveryDate', 'condition', 'remarks', 'status'];
      const updates = {};
      allowedFields.forEach((field) => {
        if (req.body[field] !== undefined) {
          updates[field] = req.body[field];
        }
      });

      const updated = await Delivery.findByIdAndUpdate(req.params.id, updates, {
        new: true,
        runValidators: true,
      })
        .populate('intent', 'intentId title')
        .populate('supplier', 'companyName');

      return successResponse(res, 200, 'Delivery updated', { delivery: updated });
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/deliveries/:id/status
router.put('/:id/status', protect, authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const { status, remarks } = req.body;

    if (!['PENDING', 'IN_TRANSIT', 'PARTIAL', 'COMPLETED', 'RETURNED'].includes(status)) {
      return errorResponse(res, 400, 'Invalid status');
    }

    const delivery = await Delivery.findById(req.params.id);
    if (!delivery) {
      return errorResponse(res, 404, 'Delivery not found');
    }

    delivery.status = status;
    if (remarks) delivery.remarks = remarks;

    if (status === 'COMPLETED') {
      delivery.items.forEach((item) => {
        if (item.status !== 'DELIVERED') {
          item.deliveredQuantity = item.orderedQuantity;
          item.status = 'DELIVERED';
        }
      });
      delivery.inspectedBy = req.user._id;
    }

    await delivery.save();

    await Intent.findByIdAndUpdate(delivery.intent, {
      $push: {
        statusHistory: {
          status: status === 'COMPLETED' ? 'FULL_DELIVERY' : status,
          changedBy: req.user._id,
          changedAt: new Date(),
          remarks: `Delivery status updated to ${status}`,
        },
      },
    });

    return successResponse(res, 200, 'Delivery status updated', { delivery });
  } catch (error) {
    next(error);
  }
});

// PUT /api/deliveries/:id/partial
router.put('/:id/partial', protect, authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const { items, remarks } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return errorResponse(res, 400, 'Items array is required');
    }

    const delivery = await Delivery.findById(req.params.id);
    if (!delivery) {
      return errorResponse(res, 404, 'Delivery not found');
    }

    delivery.items = delivery.items.map((existingItem, index) => {
      const incoming = items.find((i) => i.name === existingItem.name);
      if (incoming) {
        return {
          ...existingItem,
          deliveredQuantity: incoming.deliveredQuantity || existingItem.deliveredQuantity,
          status: incoming.deliveredQuantity >= existingItem.orderedQuantity ? 'DELIVERED' : 'PARTIAL',
          notes: incoming.notes || existingItem.notes,
        };
      }
      return existingItem;
    });

    delivery.type = 'PARTIAL';
    delivery.status = 'PARTIAL';
    if (remarks) delivery.remarks = remarks;

    await delivery.save();

    const updated = await Delivery.findById(delivery._id)
      .populate('intent', 'intentId title')
      .populate('supplier', 'companyName');

    return successResponse(res, 200, 'Partial delivery recorded', { delivery: updated });
  } catch (error) {
    next(error);
  }
});

// PUT /api/deliveries/:id/full
router.put('/:id/full', protect, authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const { items, condition, remarks } = req.body;

    const delivery = await Delivery.findById(req.params.id);
    if (!delivery) {
      return errorResponse(res, 404, 'Delivery not found');
    }

    if (items && Array.isArray(items)) {
      delivery.items = delivery.items.map((existingItem) => {
        const incoming = items.find((i) => i.name === existingItem.name);
        if (incoming) {
          return {
            ...existingItem,
            deliveredQuantity: existingItem.orderedQuantity,
            status: 'DELIVERED',
            notes: incoming.notes || existingItem.notes,
          };
        }
        return { ...existingItem, deliveredQuantity: existingItem.orderedQuantity, status: 'DELIVERED' };
      });
    } else {
      delivery.items = delivery.items.map((item) => ({
        ...item,
        deliveredQuantity: item.orderedQuantity,
        status: 'DELIVERED',
      }));
    }

    delivery.type = 'FULL';
    delivery.status = 'COMPLETED';
    delivery.inspectedBy = req.user._id;
    if (condition) delivery.condition = condition;
    if (remarks) delivery.remarks = remarks;

    await delivery.save();

    await Intent.findByIdAndUpdate(delivery.intent, {
      status: 'FULL_DELIVERY',
      delivery: delivery._id,
      $push: {
        statusHistory: {
          status: 'FULL_DELIVERY',
          changedBy: req.user._id,
          changedAt: new Date(),
          remarks: 'Full delivery completed',
        },
      },
    });

    const updated = await Delivery.findById(delivery._id)
      .populate('intent', 'intentId title')
      .populate('supplier', 'companyName');

    return successResponse(res, 200, 'Full delivery recorded', { delivery: updated });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
