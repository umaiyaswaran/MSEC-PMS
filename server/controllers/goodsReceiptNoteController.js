const GoodsReceiptNote = require('../models/GoodsReceiptNote');
const PurchaseOrder = require('../models/PurchaseOrder');
const Supplier = require('../models/Supplier');
const User = require('../models/User');
const Intent = require('../models/Intent');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');
const { PO_STATUSES } = require('../utils/constants');

const createGoodsReceiptNote = async (req, res, next) => {
  try {
    const {
      purchaseOrderId,
      items,
      deliveryDate,
      vehicleNumber,
      driverName,
      challanNumber,
      remarks,
    } = req.body;

    if (!purchaseOrderId) {
      return errorResponse(res, 400, 'Purchase order ID is required');
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return errorResponse(res, 400, 'At least one GRN item is required');
    }

    if (!deliveryDate) {
      return errorResponse(res, 400, 'Delivery date is required');
    }

    const po = await PurchaseOrder.findById(purchaseOrderId);
    if (!po) {
      return errorResponse(res, 404, 'Purchase order not found');
    }

    if ([PO_STATUSES.COMPLETED, PO_STATUSES.CLOSED].includes(po.status)) {
      return errorResponse(res, 400, 'This Purchase Order is already completed. New GRN cannot be created.');
    }

    // If PO reports no remaining quantity, allow override only when `force` flag is provided
    // and user is allowed (store_manager or admin). This lets store managers correct data
    // when PO state is stale, while preventing silent over-receives.
    const allowForce = !!req.body.force && ['store_manager', 'admin'].includes(req.user.role);
    if (po.remainingQuantity === 0 && !allowForce) {
      return errorResponse(res, 400, 'This Purchase Order has no remaining quantity to receive.');
    }

    const poItemsByName = po.items.reduce((map, item) => {
      map[item.name] = item;
      return map;
    }, {});

    let totalReceived = 0;
    let totalOrdered = 0;
    let totalRemaining = 0;

    const processedItems = items.map((item) => {
      if (!item.name) {
        throw new Error('Each GRN item must include a name');
      }
      const poItem = poItemsByName[item.name];
      if (!poItem) {
        throw new Error(`Item '${item.name}' is not part of the Purchase Order`);
      }

      const orderedQuantity = poItem.quantity;
      const receivedQuantity = Number(item.receivedQuantity);
      if (typeof receivedQuantity !== 'number' || Number.isNaN(receivedQuantity)) {
        throw new Error(`Received quantity for item '${item.name}' must be a number`);
      }

      if (receivedQuantity < 0) {
        throw new Error(`Received quantity for item '${item.name}' cannot be negative`);
      }

      if (receivedQuantity > poItem.remainingQuantity) {
        // If force override is enabled for permitted users, allow as long as we don't exceed total ordered quantity
        if (allowForce) {
          const currentlyReceived = poItem.receivedQuantity || 0;
          if (receivedQuantity + currentlyReceived > poItem.quantity) {
            throw new Error(`Received quantity for item '${item.name}' exceeds the ordered quantity.`);
          }
        } else {
          throw new Error('Received quantity does not match the remaining Purchase Order quantity.');
        }
      }

      const remainingQuantity = orderedQuantity - (poItem.receivedQuantity + receivedQuantity);
      totalReceived += receivedQuantity;
      totalOrdered += orderedQuantity;
      totalRemaining += remainingQuantity;

      return {
        name: item.name,
        orderedQuantity,
        receivedQuantity,
        remainingQuantity: Math.max(remainingQuantity, 0),
        unitPrice: poItem.unitPrice,
        totalPrice: poItem.unitPrice * receivedQuantity,
        remarks: item.remarks || '',
      };
    });

    if (totalReceived === 0) {
      return errorResponse(res, 400, 'Received quantity must be greater than zero');
    }

    const grn = await GoodsReceiptNote.create({
      purchaseOrder: po._id,
      supplier: po.supplier,
      items: processedItems,
      totalOrderedQuantity: po.totalOrderedQuantity,
      totalReceivedQuantity: totalReceived,
      totalRemainingQuantity: Math.max(po.remainingQuantity - totalReceived, 0),
      deliveryDate: new Date(deliveryDate),
      vehicleNumber: vehicleNumber || '',
      driverName: driverName || '',
      challanNumber: challanNumber || '',
      remarks: remarks || '',
      challanDocuments: [],
      deliveryDocuments: [],
      storeManager: req.user._id,
      status: totalRemaining === 0 ? 'FINAL' : 'PARTIAL',
    });

    if (req.files) {
      if (req.files.deliveryImages) {
        grn.deliveryDocuments = req.files.deliveryImages.map((file) => ({
          name: file.originalname,
          url: file.path,
          type: file.mimetype,
        }));
      }
      if (req.files.challanFiles) {
        grn.challanDocuments = req.files.challanFiles.map((file) => ({
          name: file.originalname,
          url: file.path,
          type: file.mimetype,
        }));
      }
      await grn.save();
    }

    po.items = po.items.map((poItem) => {
      const grnItem = processedItems.find((item) => item.name === poItem.name);
      if (!grnItem) return poItem;
      const newReceived = (poItem.receivedQuantity || 0) + grnItem.receivedQuantity;
      const newRemaining = Math.max(poItem.quantity - newReceived, 0);
      return {
        ...poItem.toObject ? poItem.toObject() : poItem,
        receivedQuantity: newReceived,
        remainingQuantity: newRemaining,
      };
    });
    po.receivedQuantity = po.items.reduce((sum, item) => sum + (item.receivedQuantity || 0), 0);
    po.remainingQuantity = Math.max(po.totalOrderedQuantity - po.receivedQuantity, 0);
    if (po.remainingQuantity === 0) {
      po.status = PO_STATUSES.COMPLETED;
      po.isClosed = true;
    } else {
      po.status = PO_STATUSES.PARTIALLY_RECEIVED;
    }
    po.statusHistory.push({
      status: po.status,
      changedBy: req.user._id,
      changedAt: new Date(),
      remarks: `GRN ${grn.grnNumber} created`,
    });
    await po.save();

    await AuditLog.create({
      user: req.user._id,
      action: 'CREATE',
      entity: 'GoodsReceiptNote',
      entityId: grn._id,
      newData: {
        grnNumber: grn.grnNumber,
        purchaseOrder: po._id,
        totalReceivedQuantity: totalReceived,
      },
      ipAddress: req.ip,
    });

    const populatedGRN = await GoodsReceiptNote.findById(grn._id)
      .populate('purchaseOrder', 'poNumber status totalOrderedQuantity receivedQuantity remainingQuantity')
      .populate('supplier', 'companyName contactPerson email phone')
      .populate('storeManager', 'name email');

    const intent = await Intent.findById(po.intent).select('requester');
    const recipients = [po.createdBy, intent?.requester].filter(Boolean);
    for (const recipientId of recipients) {
      await Notification.create({
        recipient: recipientId,
        sender: req.user._id,
        title: 'GRN Created',
        message: `GRN ${grn.grnNumber} was created for purchase order ${po.poNumber}.`,
        type: 'SUCCESS',
        referenceModel: 'GoodsReceiptNote',
        referenceId: grn._id,
      });
    }

    return successResponse(res, 201, 'Goods Receipt Note created successfully', { goodsReceiptNote: populatedGRN });
  } catch (error) {
    return errorResponse(res, 500, error.message || 'Failed to create GRN');
  }
};

const getGoodsReceiptNotes = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, purchaseOrderId, supplier, status, startDate, endDate, grnNumber } = req.query;
    const filter = {};
    if (purchaseOrderId) filter.purchaseOrder = purchaseOrderId;
    if (supplier) filter.supplier = supplier;
    if (status) filter.status = status;
    if (grnNumber) filter.grnNumber = { $regex: grnNumber, $options: 'i' };
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const [grns, total] = await Promise.all([
      GoodsReceiptNote.find(filter)
        .populate('purchaseOrder', 'poNumber status')
        .populate('supplier', 'companyName')
        .populate('storeManager', 'name email')
        .sort('-createdAt')
        .skip(skip)
        .limit(limitNum)
        .lean(),
      GoodsReceiptNote.countDocuments(filter),
    ]);

    return paginatedResponse(res, grns, pageNum, limitNum, total);
  } catch (error) {
    return errorResponse(res, 500, error.message || 'Failed to fetch GRNs');
  }
};

const getGoodsReceiptNoteById = async (req, res, next) => {
  try {
    const grn = await GoodsReceiptNote.findById(req.params.id)
      .populate('purchaseOrder', 'poNumber status totalOrderedQuantity receivedQuantity remainingQuantity')
      .populate('supplier', 'companyName contactPerson email phone')
      .populate('storeManager', 'name email');
    if (!grn) {
      return errorResponse(res, 404, 'Goods Receipt Note not found');
    }
    return successResponse(res, 200, 'Goods Receipt Note retrieved successfully', { goodsReceiptNote: grn });
  } catch (error) {
    return errorResponse(res, 500, error.message || 'Failed to fetch GRN');
  }
};

module.exports = {
  createGoodsReceiptNote,
  getGoodsReceiptNotes,
  getGoodsReceiptNoteById,
};
