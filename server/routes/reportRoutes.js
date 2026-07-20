const express = require('express');
const Intent = require('../models/Intent');
const Supplier = require('../models/Supplier');
const Invoice = require('../models/Invoice');
const PurchaseOrder = require('../models/PurchaseOrder');
const Delivery = require('../models/Delivery');
const GoodsReceiptNote = require('../models/GoodsReceiptNote');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const { successResponse, errorResponse } = require('../utils/response');
const {
  generateProcurementReport,
  generateSupplierReport,
  generateInvoiceReport,
  generateDeliveryReport,
} = require('../services/excelService');

const router = express.Router();

// GET /api/reports/procurement
router.get('/procurement', protect, authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const { startDate, endDate, department, status, priority, format } = req.query;

    const filter = {};
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }
    if (department) filter.department = department;
    if (status) filter.status = status;
    if (priority) filter.priority = priority;

    const intents = await Intent.find(filter)
      .populate('requester', 'name email')
      .populate('department', 'name')
      .sort({ createdAt: -1 })
      .lean();

    const stats = {
      totalIntents: intents.length,
      totalEstimatedCost: intents.reduce((sum, i) => sum + (i.estimatedCost || 0), 0),
      byStatus: {},
      byPriority: {},
      byDepartment: {},
    };

    intents.forEach((intent) => {
      stats.byStatus[intent.status] = (stats.byStatus[intent.status] || 0) + 1;
      stats.byPriority[intent.priority] = (stats.byPriority[intent.priority] || 0) + 1;
      const deptName = intent.department?.name || 'Unknown';
      stats.byDepartment[deptName] = (stats.byDepartment[deptName] || 0) + 1;
    });

    if (format === 'excel') {
      const buffer = await generateProcurementReport({ intents });
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=procurement-report.xlsx');
      return res.send(buffer);
    }

    return successResponse(res, 200, 'Procurement report generated', { stats, intents });
  } catch (error) {
    next(error);
  }
});

// GET /api/reports/supplier
router.get('/supplier', protect, authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const { format } = req.query;

    const suppliers = await Supplier.find()
      .sort({ companyName: 1 })
      .lean();

    const stats = {
      totalSuppliers: suppliers.length,
      activeSuppliers: suppliers.filter((s) => s.isActive).length,
      averageRating: suppliers.length
        ? (suppliers.reduce((sum, s) => sum + (s.rating || 0), 0) / suppliers.length).toFixed(2)
        : 0,
      byRating: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0, 0: 0 },
    };

    suppliers.forEach((supplier) => {
      const rating = Math.floor(supplier.rating || 0);
      stats.byRating[rating] = (stats.byRating[rating] || 0) + 1;
    });

    if (format === 'excel') {
      const buffer = await generateSupplierReport({ suppliers });
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=supplier-report.xlsx');
      return res.send(buffer);
    }

    return successResponse(res, 200, 'Supplier report generated', { stats, suppliers });
  } catch (error) {
    next(error);
  }
});

// GET /api/reports/invoice
router.get('/invoice', protect, authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const { startDate, endDate, status, paymentStatus, format } = req.query;

    const filter = {};
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }
    if (status) filter.status = status;
    if (paymentStatus) filter.paymentStatus = paymentStatus;

    const invoices = await Invoice.find(filter)
      .populate('intent', 'intentId title')
      .populate('purchaseOrder', 'poNumber')
      .populate('supplier', 'companyName')
      .populate('verifiedBy', 'name')
      .sort({ createdAt: -1 })
      .lean();

    const stats = {
      totalInvoices: invoices.length,
      totalAmount: invoices.reduce((sum, i) => sum + (i.totalAmount || 0), 0),
      totalPaid: invoices.filter((i) => i.paymentStatus === 'PAID').reduce((sum, i) => sum + (i.totalAmount || 0), 0),
      totalUnpaid: invoices.filter((i) => i.paymentStatus === 'UNPAID').reduce((sum, i) => sum + (i.totalAmount || 0), 0),
      byStatus: {},
      byPaymentStatus: {},
    };

    invoices.forEach((invoice) => {
      stats.byStatus[invoice.status] = (stats.byStatus[invoice.status] || 0) + 1;
      stats.byPaymentStatus[invoice.paymentStatus] = (stats.byPaymentStatus[invoice.paymentStatus] || 0) + 1;
    });

    if (format === 'excel') {
      const buffer = await generateInvoiceReport({ invoices });
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=invoice-report.xlsx');
      return res.send(buffer);
    }

    return successResponse(res, 200, 'Invoice report generated', { stats, invoices });
  } catch (error) {
    next(error);
  }
});

// GET /api/reports/open-purchase-orders
router.get('/open-purchase-orders', protect, authorize('admin', 'manager', 'store_manager'), async (req, res, next) => {
  try {
    const { supplier, startDate, endDate } = req.query;
    const filter = { status: { $in: ['OPEN', 'PARTIALLY_RECEIVED'] } };
    if (supplier) filter.supplier = supplier;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const purchaseOrders = await PurchaseOrder.find(filter)
      .populate('supplier', 'companyName contactPerson')
      .sort({ createdAt: -1 })
      .lean();

    const report = purchaseOrders.map((po) => ({
      poNumber: po.poNumber,
      supplier: po.supplier?.companyName || 'N/A',
      orderedQuantity: po.totalOrderedQuantity,
      receivedQuantity: po.receivedQuantity,
      remainingQuantity: po.remainingQuantity,
      purchaseDate: po.createdAt,
      status: po.status,
    }));

    return successResponse(res, 200, 'Open purchase order report generated', { openPurchaseOrders: report });
  } catch (error) {
    next(error);
  }
});

// GET /api/reports/grn
router.get('/grn', protect, authorize('admin', 'manager', 'store_manager'), async (req, res, next) => {
  try {
    const { supplier, purchaseOrderId, startDate, endDate } = req.query;
    const filter = {};
    if (supplier) filter.supplier = supplier;
    if (purchaseOrderId) filter.purchaseOrder = purchaseOrderId;
    if (startDate || endDate) {
      filter.deliveryDate = {};
      if (startDate) filter.deliveryDate.$gte = new Date(startDate);
      if (endDate) filter.deliveryDate.$lte = new Date(endDate);
    }

    const grns = await GoodsReceiptNote.find(filter)
      .populate('purchaseOrder', 'poNumber')
      .populate('supplier', 'companyName')
      .sort({ deliveryDate: -1 })
      .lean();

    const report = grns.map((grn) => ({
      grnNumber: grn.grnNumber,
      purchaseOrder: grn.purchaseOrder?.poNumber || 'N/A',
      supplier: grn.supplier?.companyName || 'N/A',
      products: grn.items.map((item) => item.name).join(', '),
      receivedQuantity: grn.totalReceivedQuantity,
      deliveryDate: grn.deliveryDate,
      status: grn.status,
    }));

    return successResponse(res, 200, 'GRN report generated', { grns: report });
  } catch (error) {
    next(error);
  }
});

// GET /api/reports/pending-deliveries
router.get('/pending-deliveries', protect, authorize('admin', 'manager', 'store_manager'), async (req, res, next) => {
  try {
    const { supplier, startDate, endDate } = req.query;
    const filter = {
      remainingQuantity: { $gt: 0 },
      status: { $nin: ['COMPLETED', 'CLOSED', 'CANCELLED'] },
    };
    if (supplier) filter.supplier = supplier;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const purchaseOrders = await PurchaseOrder.find(filter)
      .populate('supplier', 'companyName contactPerson')
      .sort({ createdAt: -1 })
      .lean();

    const report = purchaseOrders.map((po) => ({
      poNumber: po.poNumber,
      supplier: po.supplier?.companyName || 'N/A',
      orderedQuantity: po.totalOrderedQuantity,
      receivedQuantity: po.receivedQuantity,
      remainingQuantity: po.remainingQuantity,
      purchaseDate: po.createdAt,
      status: po.status,
    }));

    return successResponse(res, 200, 'Pending delivery report generated', { pendingDeliveries: report });
  } catch (error) {
    next(error);
  }
});

// GET /api/reports/inventory-receipts
router.get('/inventory-receipts', protect, authorize('admin', 'manager', 'store_manager'), async (req, res, next) => {
  try {
    const { startDate, endDate, period = 'daily' } = req.query;
    const match = {};
    if (startDate || endDate) {
      match.deliveryDate = {};
      if (startDate) match.deliveryDate.$gte = new Date(startDate);
      if (endDate) match.deliveryDate.$lte = new Date(endDate);
    }

    const groupId = period === 'monthly'
      ? { year: { $year: '$deliveryDate' }, month: { $month: '$deliveryDate' } }
      : { year: { $year: '$deliveryDate' }, month: { $month: '$deliveryDate' }, day: { $dayOfMonth: '$deliveryDate' } };

    const receipts = await GoodsReceiptNote.aggregate([
      { $match: match },
      {
        $group: {
          _id: groupId,
          totalReceivedQuantity: { $sum: '$totalReceivedQuantity' },
          totalDeliveries: { $sum: 1 },
          totalOrders: { $addToSet: '$purchaseOrder' },
        },
      },
      {
        $project: {
          period: '$_id',
          totalReceivedQuantity: 1,
          totalDeliveries: 1,
          totalOrders: { $size: '$totalOrders' },
          _id: 0,
        },
      },
      { $sort: { 'period.year': 1, 'period.month': 1, 'period.day': 1 } },
    ]);

    return successResponse(res, 200, 'Inventory receipt report generated', { period, receipts });
  } catch (error) {
    next(error);
  }
});

// GET /api/reports/supplier-delivery-performance
router.get('/supplier-delivery-performance', protect, authorize('admin', 'manager', 'store_manager'), async (req, res, next) => {
  try {
    const { startDate, endDate, supplierId } = req.query;
    const supplierFilter = {};
    if (supplierId) supplierFilter._id = supplierId;

    const suppliers = await Supplier.find(supplierFilter).lean();

    const grnMatch = {};
    if (supplierId) grnMatch.supplier = supplierId;
    if (startDate || endDate) {
      grnMatch.deliveryDate = {};
      if (startDate) grnMatch.deliveryDate.$gte = new Date(startDate);
      if (endDate) grnMatch.deliveryDate.$lte = new Date(endDate);
    }

    const grns = await GoodsReceiptNote.find(grnMatch)
      .populate('purchaseOrder', 'poNumber deliveryDate')
      .lean();

    const performance = suppliers.map((supplier) => {
      const supplierGRNs = grns.filter((grn) => grn.supplier.toString() === supplier._id.toString());
      const totalDeliveries = supplierGRNs.length;
      const partialDeliveries = supplierGRNs.filter((grn) => grn.status === 'PARTIAL').length;
      const completedDeliveries = supplierGRNs.filter((grn) => grn.status === 'FINAL').length;
      const lateDeliveries = supplierGRNs.filter((grn) => {
        return grn.deliveryDate && grn.purchaseOrder?.deliveryDate && new Date(grn.deliveryDate) > new Date(grn.purchaseOrder.deliveryDate);
      }).length;

      return {
        _id: supplier._id,
        companyName: supplier.companyName,
        contactPerson: supplier.contactPerson,
        email: supplier.email,
        phone: supplier.phone,
        totalDeliveries,
        partialDeliveries,
        completedDeliveries,
        lateDeliveries,
      };
    });

    return successResponse(res, 200, 'Supplier delivery performance generated', { performance });
  } catch (error) {
    next(error);
  }
});

// GET /api/reports/export
router.get('/export', protect, authorize('admin'), async (req, res, next) => {
  try {
    const { type, startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    }

    let buffer;
    let filename;

    switch (type) {
      case 'intents': {
        const intents = await Intent.find(dateFilter)
          .populate('requester', 'name email')
          .populate('department', 'name')
          .sort({ createdAt: -1 })
          .lean();
        buffer = await generateProcurementReport({ intents });
        filename = 'intents-export.xlsx';
        break;
      }
      case 'suppliers': {
        const suppliers = await Supplier.find().sort({ companyName: 1 }).lean();
        buffer = await generateSupplierReport({ suppliers });
        filename = 'suppliers-export.xlsx';
        break;
      }
      case 'invoices': {
        const invoices = await Invoice.find(dateFilter)
          .populate('intent', 'intentId')
          .populate('purchaseOrder', 'poNumber')
          .populate('supplier', 'companyName')
          .populate('verifiedBy', 'name')
          .sort({ createdAt: -1 })
          .lean();
        buffer = await generateInvoiceReport({ invoices });
        filename = 'invoices-export.xlsx';
        break;
      }
      case 'deliveries': {
        const deliveries = await Delivery.find(dateFilter)
          .populate('intent', 'intentId')
          .populate('purchaseOrder', 'poNumber')
          .populate('supplier', 'companyName')
          .populate('receivedBy', 'name')
          .populate('inspectedBy', 'name')
          .sort({ createdAt: -1 })
          .lean();
        buffer = await generateDeliveryReport({ deliveries });
        filename = 'deliveries-export.xlsx';
        break;
      }
      default:
        return errorResponse(res, 400, 'Invalid export type. Use: intents, suppliers, invoices, deliveries');
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    return res.send(buffer);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
