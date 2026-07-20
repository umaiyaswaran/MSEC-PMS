const { Delivery, Intent, PurchaseOrder, Supplier, AuditLog } = require('../models/index');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');
const { DELIVERY_STATUSES, INTENT_STATUSES } = require('../utils/constants');

const createDelivery = async (req, res) => {
  try {
    const { intentId, purchaseOrderId, supplierId, items, type, deliveryDate, receivedBy, inspectedBy, condition, remarks, documents } = req.body;

    if (!intentId || !purchaseOrderId || !supplierId) {
      return errorResponse(res, 400, 'Intent ID, Purchase Order ID, and Supplier ID are required');
    }

    const intent = await Intent.findById(intentId);
    if (!intent) {
      return errorResponse(res, 404, 'Intent not found');
    }

    const po = await PurchaseOrder.findById(purchaseOrderId);
    if (!po) {
      return errorResponse(res, 404, 'Purchase order not found');
    }

    const supplier = await Supplier.findById(supplierId);
    if (!supplier) {
      return errorResponse(res, 404, 'Supplier not found');
    }

    const delivery = await Delivery.create({
      intent: intentId,
      purchaseOrder: purchaseOrderId,
      supplier: supplierId,
      items: items || [],
      type: type || 'FULL',
      deliveryDate: deliveryDate || new Date(),
      receivedBy: receivedBy || req.user._id,
      inspectedBy,
      condition,
      remarks,
      documents: documents || [],
      status: DELIVERY_STATUSES.PENDING,
    });

    await Intent.findByIdAndUpdate(intentId, { status: INTENT_STATUSES.DELIVERY_PENDING });

    await AuditLog.create({
      user: req.user._id,
      action: 'CREATE',
      entity: 'Delivery',
      entityId: delivery._id,
      newData: { deliveryNumber: delivery.deliveryNumber, type: delivery.type },
      ipAddress: req.ip,
    });

    const populated = await Delivery.findById(delivery._id)
      .populate('intent', 'intentId title')
      .populate('purchaseOrder', 'poNumber')
      .populate('supplier', 'companyName contactPerson')
      .populate('receivedBy', 'name email')
      .populate('inspectedBy', 'name email');

    return successResponse(res, 201, 'Delivery record created successfully', populated);
  } catch (error) {
    return errorResponse(res, 500, error.message || 'Failed to create delivery record');
  }
};

const getDeliveries = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, type, startDate, endDate, supplierId, search, sort = '-createdAt' } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (supplierId) filter.supplier = supplierId;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }
    if (search) {
      filter.$or = [
        { deliveryNumber: { $regex: search, $options: 'i' } },
        { condition: { $regex: search, $options: 'i' } },
      ];
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const [deliveries, total] = await Promise.all([
      Delivery.find(filter)
        .populate('intent', 'intentId title status')
        .populate('purchaseOrder', 'poNumber type')
        .populate('supplier', 'companyName contactPerson')
        .populate('receivedBy', 'name email')
        .populate('inspectedBy', 'name email')
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Delivery.countDocuments(filter),
    ]);

    return paginatedResponse(res, deliveries, pageNum, limitNum, total);
  } catch (error) {
    return errorResponse(res, 500, error.message || 'Failed to fetch deliveries');
  }
};

const getDeliveryById = async (req, res) => {
  try {
    const delivery = await Delivery.findById(req.params.id)
      .populate('intent', 'intentId title description status requester')
      .populate({
        path: 'intent',
        populate: [
          { path: 'requester', select: 'name email department' },
          { path: 'department', select: 'name' },
        ],
      })
      .populate('purchaseOrder', 'poNumber type items totalAmount grandTotal')
      .populate('supplier', 'companyName contactPerson email phone address')
      .populate('receivedBy', 'name email')
      .populate('inspectedBy', 'name email')
      .lean();

    if (!delivery) {
      return errorResponse(res, 404, 'Delivery not found');
    }

    return successResponse(res, 200, 'Delivery retrieved successfully', delivery);
  } catch (error) {
    return errorResponse(res, 500, error.message || 'Failed to fetch delivery');
  }
};

const updateDelivery = async (req, res) => {
  try {
    const delivery = await Delivery.findById(req.params.id);
    if (!delivery) {
      return errorResponse(res, 404, 'Delivery not found');
    }

    const allowedUpdates = ['items', 'type', 'deliveryDate', 'receivedBy', 'inspectedBy', 'condition', 'remarks', 'documents'];
    const updates = {};
    for (const key of allowedUpdates) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }

    if (Object.keys(updates).length === 0) {
      return errorResponse(res, 400, 'No valid fields to update');
    }

    const oldData = { condition: delivery.condition, remarks: delivery.remarks };

    Object.assign(delivery, updates);
    await delivery.save();

    await AuditLog.create({
      user: req.user._id,
      action: 'UPDATE',
      entity: 'Delivery',
      entityId: delivery._id,
      oldData,
      newData: updates,
      ipAddress: req.ip,
    });

    const populated = await Delivery.findById(delivery._id)
      .populate('intent', 'intentId title')
      .populate('purchaseOrder', 'poNumber')
      .populate('supplier', 'companyName contactPerson');

    return successResponse(res, 200, 'Delivery updated successfully', populated);
  } catch (error) {
    return errorResponse(res, 500, error.message || 'Failed to update delivery');
  }
};

const updateDeliveryStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const validTransitions = {
      [DELIVERY_STATUSES.PENDING]: [DELIVERY_STATUSES.IN_TRANSIT],
      [DELIVERY_STATUSES.IN_TRANSIT]: [DELIVERY_STATUSES.PARTIAL, DELIVERY_STATUSES.COMPLETED, DELIVERY_STATUSES.RETURNED],
      [DELIVERY_STATUSES.PARTIAL]: [DELIVERY_STATUSES.IN_TRANSIT, DELIVERY_STATUSES.COMPLETED],
    };

    const delivery = await Delivery.findById(req.params.id);
    if (!delivery) {
      return errorResponse(res, 404, 'Delivery not found');
    }

    if (!status) {
      return errorResponse(res, 400, 'Status is required');
    }

    if (!Object.values(DELIVERY_STATUSES).includes(status)) {
      return errorResponse(res, 400, 'Invalid status value');
    }

    const allowed = validTransitions[delivery.status];
    if (!allowed || !allowed.includes(status)) {
      return errorResponse(res, 400, `Cannot transition from ${delivery.status} to ${status}`);
    }

    const oldStatus = delivery.status;
    delivery.status = status;
    await delivery.save();

    const intentUpdates = {};
    if (status === DELIVERY_STATUSES.PARTIAL) {
      intentUpdates.status = INTENT_STATUSES.PARTIAL_DELIVERY;
    } else if (status === DELIVERY_STATUSES.COMPLETED) {
      intentUpdates.status = INTENT_STATUSES.FULL_DELIVERY;
    }
    if (Object.keys(intentUpdates).length > 0) {
      await Intent.findByIdAndUpdate(delivery.intent, intentUpdates);
    }

    await AuditLog.create({
      user: req.user._id,
      action: 'UPDATE_STATUS',
      entity: 'Delivery',
      entityId: delivery._id,
      oldData: { status: oldStatus },
      newData: { status },
      ipAddress: req.ip,
    });

    return successResponse(res, 200, 'Delivery status updated successfully', delivery);
  } catch (error) {
    return errorResponse(res, 500, error.message || 'Failed to update delivery status');
  }
};

const recordPartialDelivery = async (req, res) => {
  try {
    const { items, remarks } = req.body;

    const delivery = await Delivery.findById(req.params.id);
    if (!delivery) {
      return errorResponse(res, 404, 'Delivery not found');
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return errorResponse(res, 400, 'Items array with delivered quantities is required');
    }

    delivery.items = delivery.items.map((existingItem) => {
      const updateItem = items.find((i) => i.name === existingItem.name);
      if (updateItem) {
        return {
          ...existingItem,
          deliveredQuantity: updateItem.deliveredQuantity || 0,
          status: updateItem.deliveredQuantity >= existingItem.orderedQuantity ? 'DELIVERED' : 'PARTIAL',
          notes: updateItem.notes || existingItem.notes,
        };
      }
      return existingItem;
    });

    const allDelivered = delivery.items.every((item) => item.deliveredQuantity >= item.orderedQuantity);
    delivery.type = allDelivered ? 'FULL' : 'PARTIAL';
    delivery.status = allDelivered ? DELIVERY_STATUSES.COMPLETED : DELIVERY_STATUSES.PARTIAL;
    delivery.remarks = remarks || delivery.remarks;

    await delivery.save();

    const intentUpdates = {};
    if (allDelivered) {
      intentUpdates.status = INTENT_STATUSES.FULL_DELIVERY;
    } else {
      intentUpdates.status = INTENT_STATUSES.PARTIAL_DELIVERY;
    }
    await Intent.findByIdAndUpdate(delivery.intent, intentUpdates);

    await AuditLog.create({
      user: req.user._id,
      action: 'PARTIAL_DELIVERY',
      entity: 'Delivery',
      entityId: delivery._id,
      newData: { items: delivery.items, type: delivery.type, status: delivery.status },
      ipAddress: req.ip,
    });

    const populated = await Delivery.findById(delivery._id)
      .populate('intent', 'intentId title')
      .populate('purchaseOrder', 'poNumber')
      .populate('supplier', 'companyName contactPerson');

    return successResponse(res, 200, 'Partial delivery recorded successfully', populated);
  } catch (error) {
    return errorResponse(res, 500, error.message || 'Failed to record partial delivery');
  }
};

const recordFullDelivery = async (req, res) => {
  try {
    const { condition, inspectedBy, remarks } = req.body;

    const delivery = await Delivery.findById(req.params.id);
    if (!delivery) {
      return errorResponse(res, 404, 'Delivery not found');
    }

    delivery.items = delivery.items.map((item) => ({
      ...item,
      deliveredQuantity: item.orderedQuantity,
      status: 'DELIVERED',
    }));

    delivery.type = 'FULL';
    delivery.status = DELIVERY_STATUSES.COMPLETED;
    delivery.deliveryDate = new Date();
    delivery.condition = condition || 'Good';
    delivery.inspectedBy = inspectedBy || req.user._id;
    delivery.remarks = remarks || delivery.remarks;

    await delivery.save();

    await Intent.findByIdAndUpdate(delivery.intent, { status: INTENT_STATUSES.FULL_DELIVERY });

    await AuditLog.create({
      user: req.user._id,
      action: 'FULL_DELIVERY',
      entity: 'Delivery',
      entityId: delivery._id,
      newData: { status: DELIVERY_STATUSES.COMPLETED, type: 'FULL' },
      ipAddress: req.ip,
    });

    const populated = await Delivery.findById(delivery._id)
      .populate('intent', 'intentId title')
      .populate('purchaseOrder', 'poNumber')
      .populate('supplier', 'companyName contactPerson')
      .populate('receivedBy', 'name email')
      .populate('inspectedBy', 'name email');

    return successResponse(res, 200, 'Full delivery recorded successfully', populated);
  } catch (error) {
    return errorResponse(res, 500, error.message || 'Failed to record full delivery');
  }
};

const getDeliveriesByIntent = async (req, res) => {
  try {
    const { intentId } = req.params;
    const { page = 1, limit = 20, status, type } = req.query;

    const filter = { intent: intentId };
    if (status) filter.status = status;
    if (type) filter.type = type;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const [deliveries, total] = await Promise.all([
      Delivery.find(filter)
        .populate('intent', 'intentId title')
        .populate('purchaseOrder', 'poNumber')
        .populate('supplier', 'companyName contactPerson')
        .populate('receivedBy', 'name email')
        .sort('-createdAt')
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Delivery.countDocuments(filter),
    ]);

    return paginatedResponse(res, deliveries, pageNum, limitNum, total);
  } catch (error) {
    return errorResponse(res, 500, error.message || 'Failed to fetch deliveries');
  }
};

module.exports = {
  createDelivery,
  getDeliveries,
  getDeliveryById,
  updateDelivery,
  updateDeliveryStatus,
  recordPartialDelivery,
  recordFullDelivery,
  getDeliveriesByIntent,
};
