const { PurchaseOrder, Intent, Supplier, User, AuditLog } = require('../models/index');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');
const { PO_STATUSES, INTENT_STATUSES } = require('../utils/constants');

const createPO = async (req, res) => {
  try {
    const { intentId, supplierId, type, items, totalAmount, tax, grandTotal, deliveryDate, deliveryAddress, paymentTerms, specialInstructions } = req.body;

    if (!intentId || !supplierId) {
      return errorResponse(res, 400, 'Intent ID and Supplier ID are required');
    }

    const intent = await Intent.findById(intentId);
    if (!intent) {
      return errorResponse(res, 404, 'Intent not found');
    }

    const supplier = await Supplier.findById(supplierId);
    if (!supplier) {
      return errorResponse(res, 404, 'Supplier not found');
    }

    const po = await PurchaseOrder.create({
      intent: intentId,
      supplier: supplierId,
      type: type || 'SAMPLE',
      items: items || [],
      totalAmount: totalAmount || 0,
      tax: tax || 0,
      grandTotal: grandTotal || (totalAmount || 0) + (tax || 0),
      deliveryDate,
      deliveryAddress,
      paymentTerms,
      specialInstructions,
      status: 'DRAFT',
      statusHistory: [{ status: 'DRAFT', changedBy: req.user._id, changedAt: new Date(), remarks: 'Purchase order created' }],
    });

    await AuditLog.create({
      user: req.user._id,
      action: 'CREATE',
      entity: 'PurchaseOrder',
      entityId: po._id,
      newData: { poNumber: po.poNumber, type: po.type },
      ipAddress: req.ip,
    });

    const populated = await PurchaseOrder.findById(po._id)
      .populate('intent', 'intentId title')
      .populate('supplier', 'companyName contactPerson email')
      .populate('statusHistory.changedBy', 'name email');

    return successResponse(res, 201, 'Purchase order created successfully', populated);
  } catch (error) {
    return errorResponse(res, 500, error.message || 'Failed to create purchase order');
  }
};

const getPOs = async (req, res) => {
  try {
    const { page = 1, limit = 20, type, status, startDate, endDate, search, sort = '-createdAt' } = req.query;

    const filter = {};
    if (type) filter.type = type;
    if (status) filter.status = status;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }
    if (search) {
      filter.$or = [
        { poNumber: { $regex: search, $options: 'i' } },
      ];
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const [purchaseOrders, total] = await Promise.all([
      PurchaseOrder.find(filter)
        .populate('intent', 'intentId title status')
        .populate('supplier', 'companyName contactPerson')
        .populate('adminApproval.approvedBy', 'name email')
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      PurchaseOrder.countDocuments(filter),
    ]);

    return paginatedResponse(res, purchaseOrders, pageNum, limitNum, total);
  } catch (error) {
    return errorResponse(res, 500, error.message || 'Failed to fetch purchase orders');
  }
};

const getPOById = async (req, res) => {
  try {
    const po = await PurchaseOrder.findById(req.params.id)
      .populate('intent', 'intentId title description status requester department')
      .populate({
        path: 'intent',
        populate: [
          { path: 'requester', select: 'name email department' },
          { path: 'department', select: 'name' },
        ],
      })
      .populate('supplier', 'companyName contactPerson email phone address')
      .populate('adminApproval.approvedBy', 'name email')
      .populate('statusHistory.changedBy', 'name email')
      .lean();

    if (!po) {
      return errorResponse(res, 404, 'Purchase order not found');
    }

    return successResponse(res, 200, 'Purchase order retrieved successfully', po);
  } catch (error) {
    return errorResponse(res, 500, error.message || 'Failed to fetch purchase order');
  }
};

const updatePO = async (req, res) => {
  try {
    const po = await PurchaseOrder.findById(req.params.id);
    if (!po) {
      return errorResponse(res, 404, 'Purchase order not found');
    }

    if (po.type === 'ORIGINAL' && req.user.role !== 'admin') {
      return errorResponse(res, 403, 'Only admins can update original purchase orders');
    }

    const allowedUpdates = ['items', 'totalAmount', 'tax', 'grandTotal', 'deliveryDate', 'deliveryAddress', 'paymentTerms', 'specialInstructions', 'documents'];
    const updates = {};
    for (const key of allowedUpdates) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }

    if (Object.keys(updates).length === 0) {
      return errorResponse(res, 400, 'No valid fields to update');
    }

    const oldData = {
      items: po.items,
      totalAmount: po.totalAmount,
      tax: po.tax,
      grandTotal: po.grandTotal,
    };

    Object.assign(po, updates);
    await po.save();

    await AuditLog.create({
      user: req.user._id,
      action: 'UPDATE',
      entity: 'PurchaseOrder',
      entityId: po._id,
      oldData,
      newData: updates,
      ipAddress: req.ip,
    });

    const populated = await PurchaseOrder.findById(po._id)
      .populate('intent', 'intentId title')
      .populate('supplier', 'companyName contactPerson');

    return successResponse(res, 200, 'Purchase order updated successfully', populated);
  } catch (error) {
    return errorResponse(res, 500, error.message || 'Failed to update purchase order');
  }
};

const approvePO = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return errorResponse(res, 403, 'Only admins can approve purchase orders');
    }

    const po = await PurchaseOrder.findById(req.params.id);
    if (!po) {
      return errorResponse(res, 404, 'Purchase order not found');
    }

    if (po.status === PO_STATUSES.APPROVED || po.status === PO_STATUSES.SENT) {
      return errorResponse(res, 400, 'Purchase order is already approved or sent');
    }

    const { remarks } = req.body;

    po.status = PO_STATUSES.APPROVED;
    po.adminApproval = {
      approvedBy: req.user._id,
      approvedAt: new Date(),
      remarks: remarks || 'Approved by admin',
      status: 'APPROVED',
    };
    po.statusHistory.push({
      status: PO_STATUSES.APPROVED,
      changedBy: req.user._id,
      changedAt: new Date(),
      remarks: remarks || 'Purchase order approved by admin',
    });

    await po.save();

    await Intent.findByIdAndUpdate(po.intent, {
      status: INTENT_STATUSES.PO_APPROVED,
      adminApproval: {
        approvedBy: req.user._id,
        approvedAt: new Date(),
        remarks: remarks || 'PO approved',
        status: 'APPROVED',
      },
    });

    await AuditLog.create({
      user: req.user._id,
      action: 'APPROVE',
      entity: 'PurchaseOrder',
      entityId: po._id,
      newData: { status: PO_STATUSES.APPROVED, remarks },
      ipAddress: req.ip,
    });

    const populated = await PurchaseOrder.findById(po._id)
      .populate('intent', 'intentId title')
      .populate('supplier', 'companyName contactPerson')
      .populate('adminApproval.approvedBy', 'name email');

    return successResponse(res, 200, 'Purchase order approved successfully', populated);
  } catch (error) {
    return errorResponse(res, 500, error.message || 'Failed to approve purchase order');
  }
};

const rejectPO = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return errorResponse(res, 403, 'Only admins can reject purchase orders');
    }

    const po = await PurchaseOrder.findById(req.params.id);
    if (!po) {
      return errorResponse(res, 404, 'Purchase order not found');
    }

    if (po.status === PO_STATUSES.CANCELLED) {
      return errorResponse(res, 400, 'Purchase order is already cancelled');
    }

    const { remarks } = req.body;
    if (!remarks) {
      return errorResponse(res, 400, 'Rejection remarks are required');
    }

    po.status = PO_STATUSES.CANCELLED;
    po.adminApproval = {
      approvedBy: req.user._id,
      approvedAt: new Date(),
      remarks,
      status: 'REJECTED',
    };
    po.statusHistory.push({
      status: PO_STATUSES.CANCELLED,
      changedBy: req.user._id,
      changedAt: new Date(),
      remarks,
    });

    await po.save();

    await Intent.findByIdAndUpdate(po.intent, {
      status: INTENT_STATUSES.REJECTED_BY_ADMIN,
      adminApproval: {
        approvedBy: req.user._id,
        approvedAt: new Date(),
        remarks,
        status: 'REJECTED',
      },
    });

    await AuditLog.create({
      user: req.user._id,
      action: 'REJECT',
      entity: 'PurchaseOrder',
      entityId: po._id,
      newData: { status: PO_STATUSES.CANCELLED, remarks },
      ipAddress: req.ip,
    });

    const populated = await PurchaseOrder.findById(po._id)
      .populate('intent', 'intentId title')
      .populate('supplier', 'companyName contactPerson')
      .populate('adminApproval.approvedBy', 'name email');

    return successResponse(res, 200, 'Purchase order rejected', populated);
  } catch (error) {
    return errorResponse(res, 500, error.message || 'Failed to reject purchase order');
  }
};

const getPOsByIntent = async (req, res) => {
  try {
    const { intentId } = req.params;
    const { page = 1, limit = 20, type, status } = req.query;

    const filter = { intent: intentId };
    if (type) filter.type = type;
    if (status) filter.status = status;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const [purchaseOrders, total] = await Promise.all([
      PurchaseOrder.find(filter)
        .populate('intent', 'intentId title')
        .populate('supplier', 'companyName contactPerson')
        .populate('adminApproval.approvedBy', 'name email')
        .sort('-createdAt')
        .skip(skip)
        .limit(limitNum)
        .lean(),
      PurchaseOrder.countDocuments(filter),
    ]);

    return paginatedResponse(res, purchaseOrders, pageNum, limitNum, total);
  } catch (error) {
    return errorResponse(res, 500, error.message || 'Failed to fetch purchase orders');
  }
};

const generateSamplePO = async (req, res) => {
  try {
    const { intentId, supplierId } = req.body;

    if (!intentId || !supplierId) {
      return errorResponse(res, 400, 'Intent ID and Supplier ID are required');
    }

    const intent = await Intent.findById(intentId).populate('department', 'name');
    if (!intent) {
      return errorResponse(res, 404, 'Intent not found');
    }

    const supplier = await Supplier.findById(supplierId);
    if (!supplier) {
      return errorResponse(res, 404, 'Supplier not found');
    }

    const Quotation = require('../models/Quotation');
    const selectedQuotation = await Quotation.findOne({
      intent: intentId,
      supplier: supplierId,
      isSelected: true,
    });

    let items;
    let totalAmount;

    if (selectedQuotation && selectedQuotation.items && selectedQuotation.items.length > 0) {
      items = selectedQuotation.items.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice || 0,
        totalPrice: (item.quantity || 0) * (item.unitPrice || 0),
        description: item.warranty || '',
      }));
      totalAmount = selectedQuotation.totalAmount || items.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
    } else {
      items = (intent.items || []).map((item) => ({
        name: item.name,
        quantity: item.quantity,
        unitPrice: 0,
        totalPrice: 0,
        description: item.description || '',
      }));
      totalAmount = 0;
    }

    const po = await PurchaseOrder.create({
      intent: intentId,
      createdBy: req.user._id,
      supplier: supplierId,
      type: 'SAMPLE',
      items,
      totalAmount,
      tax: 0,
      grandTotal: totalAmount,
      deliveryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      paymentTerms: selectedQuotation?.paymentTerms || '',
      status: 'SAMPLE',
      statusHistory: [{ status: 'SAMPLE', changedBy: req.user._id, changedAt: new Date(), remarks: 'Sample PO generated from intent' }],
    });

    await Intent.findByIdAndUpdate(intentId, {
      status: INTENT_STATUSES.SAMPLE_PO_CREATED,
      purchaseOrder: po._id,
    });

    await AuditLog.create({
      user: req.user._id,
      action: 'CREATE',
      entity: 'PurchaseOrder',
      entityId: po._id,
      newData: { poNumber: po.poNumber, type: 'SAMPLE', intentId },
      ipAddress: req.ip,
    });

    const populated = await PurchaseOrder.findById(po._id)
      .populate('intent', 'intentId title description')
      .populate('supplier', 'companyName contactPerson email phone');

    return successResponse(res, 201, 'Sample purchase order generated successfully', populated);
  } catch (error) {
    return errorResponse(res, 500, error.message || 'Failed to generate sample PO');
  }
};

const generateOriginalPO = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return errorResponse(res, 403, 'Only admins can generate original purchase orders');
    }

    const { samplePOId } = req.body;

    if (!samplePOId) {
      return errorResponse(res, 400, 'Sample PO ID is required');
    }

    const samplePO = await PurchaseOrder.findById(samplePOId);
    if (!samplePO) {
      return errorResponse(res, 404, 'Sample purchase order not found');
    }

    if (samplePO.type !== 'SAMPLE') {
      return errorResponse(res, 400, 'Source must be a sample purchase order');
    }

    if (samplePO.adminApproval?.status !== 'APPROVED') {
      return errorResponse(res, 400, 'Sample PO must be approved before generating original PO');
    }

    const po = await PurchaseOrder.create({
      intent: samplePO.intent,
      supplier: samplePO.supplier,
      type: 'ORIGINAL',
      items: samplePO.items,
      totalAmount: samplePO.totalAmount,
      tax: samplePO.tax,
      grandTotal: samplePO.grandTotal,
      deliveryDate: samplePO.deliveryDate,
      deliveryAddress: samplePO.deliveryAddress,
      paymentTerms: samplePO.paymentTerms,
      specialInstructions: samplePO.specialInstructions,
      status: PO_STATUSES.APPROVED,
      adminApproval: {
        approvedBy: req.user._id,
        approvedAt: new Date(),
        remarks: 'Original PO generated from approved sample PO',
        status: 'APPROVED',
      },
      statusHistory: [
        { status: PO_STATUSES.APPROVED, changedBy: req.user._id, changedAt: new Date(), remarks: 'Original PO created from approved sample' },
      ],
    });

    await Intent.findByIdAndUpdate(samplePO.intent, {
      status: INTENT_STATUSES.PO_SENT,
      purchaseOrder: po._id,
    });

    await AuditLog.create({
      user: req.user._id,
      action: 'CREATE',
      entity: 'PurchaseOrder',
      entityId: po._id,
      newData: { poNumber: po.poNumber, type: 'ORIGINAL', samplePOId: samplePO._id },
      ipAddress: req.ip,
    });

    const populated = await PurchaseOrder.findById(po._id)
      .populate('intent', 'intentId title description')
      .populate('supplier', 'companyName contactPerson email phone')
      .populate('adminApproval.approvedBy', 'name email');

    return successResponse(res, 201, 'Original purchase order generated successfully', populated);
  } catch (error) {
    return errorResponse(res, 500, error.message || 'Failed to generate original PO');
  }
};

module.exports = {
  createPO,
  getPOs,
  getPOById,
  updatePO,
  approvePO,
  rejectPO,
  getPOsByIntent,
  generateSamplePO,
  generateOriginalPO,
};
