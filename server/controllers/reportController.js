const mongoose = require('mongoose');
const { Intent, PurchaseOrder, Delivery, Invoice, Supplier, User, Department, GoodsReceiptNote } = require('../models/index');
const { successResponse, errorResponse } = require('../utils/response');
const {
  generateProcurementReport,
  generateSupplierReport,
  generateInvoiceReport,
  generateDeliveryReport,
} = require('../services/excelService');

const getProcurementReport = async (req, res) => {
  try {
    const { department, startDate, endDate, status, intentType, page = 1, limit = 50 } = req.query;

    const matchFilter = {};
    if (department) matchFilter.department = new mongoose.Types.ObjectId(department);
    if (status) matchFilter.status = status;
    if (startDate || endDate) {
      matchFilter.createdAt = {};
      if (startDate) matchFilter.createdAt.$gte = new Date(startDate);
      if (endDate) matchFilter.createdAt.$lte = new Date(endDate);
    }

    const intents = await Intent.find(matchFilter)
      .populate('requester', 'name email')
      .populate('department', 'name')
      .populate('selectedSupplier', 'companyName')
      .sort('-createdAt')
      .lean();

    const totalIntents = intents.length;
    const totalEstimatedCost = intents.reduce((sum, i) => sum + (i.estimatedCost || 0), 0);

    const statusCounts = {};
    intents.forEach((intent) => {
      statusCounts[intent.status] = (statusCounts[intent.status] || 0) + 1;
    });

    const poFilter = {};
    if (startDate || endDate) {
      poFilter.createdAt = {};
      if (startDate) poFilter.createdAt.$gte = new Date(startDate);
      if (endDate) poFilter.createdAt.$lte = new Date(endDate);
    }

    const purchaseOrders = await PurchaseOrder.find(poFilter)
      .populate('intent', 'intentId department')
      .populate('supplier', 'companyName')
      .lean();

    const totalPOAmount = purchaseOrders.reduce((sum, po) => sum + (po.grandTotal || 0), 0);

    const invoiceFilter = {};
    if (startDate || endDate) {
      invoiceFilter.createdAt = {};
      if (startDate) invoiceFilter.createdAt.$gte = new Date(startDate);
      if (endDate) invoiceFilter.createdAt.$lte = new Date(endDate);
    }

    const invoices = await Invoice.find(invoiceFilter).lean();
    const totalInvoiceAmount = invoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);

    const reportData = {
      summary: {
        totalIntents,
        totalEstimatedCost,
        totalPOAmount,
        totalInvoiceAmount,
        totalPOs: purchaseOrders.length,
        totalInvoices: invoices.length,
      },
      statusCounts,
      intents,
      purchaseOrders,
      invoices,
    };

    return successResponse(res, 200, 'Procurement report generated successfully', reportData);
  } catch (error) {
    return errorResponse(res, 500, error.message || 'Failed to generate procurement report');
  }
};

const getSupplierReport = async (req, res) => {
  try {
    const { startDate, endDate, supplierId } = req.query;

    const supplierFilter = {};
    if (supplierId) supplierFilter._id = new mongoose.Types.ObjectId(supplierId);

    const suppliers = await Supplier.find(supplierFilter).lean();

    const poFilter = {};
    if (startDate || endDate) {
      poFilter.createdAt = {};
      if (startDate) poFilter.createdAt.$gte = new Date(startDate);
      if (endDate) poFilter.createdAt.$lte = new Date(endDate);
    }
    if (supplierId) poFilter.supplier = new mongoose.Types.ObjectId(supplierId);

    const purchaseOrders = await PurchaseOrder.find(poFilter)
      .populate('supplier', 'companyName')
      .populate('intent', 'intentId')
      .lean();

    const deliveryFilter = {};
    if (startDate || endDate) {
      deliveryFilter.createdAt = {};
      if (startDate) deliveryFilter.createdAt.$gte = new Date(startDate);
      if (endDate) deliveryFilter.createdAt.$lte = new Date(endDate);
    }
    if (supplierId) deliveryFilter.supplier = new mongoose.Types.ObjectId(supplierId);

    const deliveries = await Delivery.find(deliveryFilter)
      .populate('supplier', 'companyName')
      .lean();

    const invoiceFilter = {};
    if (startDate || endDate) {
      invoiceFilter.createdAt = {};
      if (startDate) invoiceFilter.createdAt.$gte = new Date(startDate);
      if (endDate) invoiceFilter.createdAt.$lte = new Date(endDate);
    }
    if (supplierId) invoiceFilter.supplier = new mongoose.Types.ObjectId(supplierId);

    const invoices = await Invoice.find(invoiceFilter)
      .populate('supplier', 'companyName')
      .lean();

    const supplierPerformance = suppliers.map((supplier) => {
      const supplierPOs = purchaseOrders.filter(
        (po) => po.supplier && po.supplier._id.toString() === supplier._id.toString()
      );
      const supplierDeliveries = deliveries.filter(
        (d) => d.supplier && d.supplier._id.toString() === supplier._id.toString()
      );
      const supplierInvoices = invoices.filter(
        (inv) => inv.supplier && inv.supplier._id.toString() === supplier._id.toString()
      );

      const totalOrders = supplierPOs.length;
      const totalSpend = supplierInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);

      const deliveryTimes = supplierDeliveries
        .filter((d) => d.deliveryDate && d.createdAt)
        .map((d) => {
          const created = new Date(d.createdAt);
          const delivered = new Date(d.deliveryDate);
          return (delivered - created) / (1000 * 60 * 60 * 24);
        });

      const avgDeliveryTime = deliveryTimes.length > 0
        ? Math.round((deliveryTimes.reduce((sum, t) => sum + t, 0) / deliveryTimes.length) * 10) / 10
        : 0;

      const completedDeliveries = supplierDeliveries.filter((d) => d.status === 'COMPLETED').length;
      const onTimeRate = supplierDeliveries.length > 0
        ? Math.round((completedDeliveries / supplierDeliveries.length) * 100)
        : 0;

      return {
        _id: supplier._id,
        companyName: supplier.companyName,
        contactPerson: supplier.contactPerson,
        email: supplier.email,
        phone: supplier.phone,
        rating: supplier.rating || 0,
        isActive: supplier.isActive,
        totalOrders,
        totalSpend,
        avgDeliveryTime,
        onTimeDeliveryRate: onTimeRate,
        totalDeliveries: supplierDeliveries.length,
        totalInvoices: supplierInvoices.length,
      };
    });

    supplierPerformance.sort((a, b) => b.totalOrders - a.totalOrders);

    return successResponse(res, 200, 'Supplier report generated successfully', {
      summary: {
        totalSuppliers: suppliers.length,
        activeSuppliers: suppliers.filter((s) => s.isActive).length,
        totalOrders: purchaseOrders.length,
        totalSpend: invoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0),
      },
      suppliers: supplierPerformance,
    });
  } catch (error) {
    return errorResponse(res, 500, error.message || 'Failed to generate supplier report');
  }
};

const getInvoiceReport = async (req, res) => {
  try {
    const { startDate, endDate, status, paymentStatus } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (paymentStatus) filter.paymentStatus = paymentStatus;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const invoices = await Invoice.find(filter)
      .populate('intent', 'intentId title')
      .populate('purchaseOrder', 'poNumber')
      .populate('supplier', 'companyName')
      .populate('verifiedBy', 'name email')
      .sort('-createdAt')
      .lean();

    const totalAmount = invoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
    const totalTax = invoices.reduce((sum, inv) => sum + (inv.tax || 0), 0);
    const totalWithTax = invoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);

    const statusCounts = {};
    invoices.forEach((inv) => {
      statusCounts[inv.status] = (statusCounts[inv.status] || 0) + 1;
    });

    const paymentStatusCounts = {};
    invoices.forEach((inv) => {
      paymentStatusCounts[inv.paymentStatus] = (paymentStatusCounts[inv.paymentStatus] || 0) + 1;
    });

    const paidAmount = invoices
      .filter((inv) => inv.paymentStatus === 'PAID')
      .reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);

    const unpaidAmount = invoices
      .filter((inv) => inv.paymentStatus === 'UNPAID')
      .reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);

    return successResponse(res, 200, 'Invoice report generated successfully', {
      summary: {
        totalInvoices: invoices.length,
        totalAmount,
        totalTax,
        totalWithTax,
        paidAmount,
        unpaidAmount,
      },
      statusCounts,
      paymentStatusCounts,
      invoices,
    });
  } catch (error) {
    return errorResponse(res, 500, error.message || 'Failed to generate invoice report');
  }
};

const getDashboardStats = async (req, res) => {
  try {
    const [
      totalIntents,
      pendingManagerApprovals,
      pendingAdminApprovals,
      totalSuppliers,
      activeSuppliers,
      recentIntents,
    ] = await Promise.all([
      Intent.countDocuments(),
      Intent.countDocuments({ status: 'PENDING_MANAGER_APPROVAL' }),
      Intent.countDocuments({ status: 'PENDING_ADMIN_APPROVAL' }),
      Supplier.countDocuments(),
      Supplier.countDocuments({ isActive: true }),
      Intent.find()
        .populate('requester', 'name email avatar')
        .populate('department', 'name')
        .sort('-createdAt')
        .limit(10)
        .lean(),
    ]);

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlySpend = await Invoice.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo }, paymentStatus: 'PAID' } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          totalSpend: { $sum: '$totalAmount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    const totalSpend = await Invoice.aggregate([
      { $match: { paymentStatus: 'PAID' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]);

    return successResponse(res, 200, 'Dashboard stats retrieved successfully', {
      totalIntents,
      pendingApprovals: pendingManagerApprovals + pendingAdminApprovals,
      pendingManagerApprovals,
      pendingAdminApprovals,
      totalSpend: totalSpend[0]?.total || 0,
      activeSuppliers,
      totalSuppliers,
      recentActivity: recentIntents,
      monthlySpend,
    });
  } catch (error) {
    return errorResponse(res, 500, error.message || 'Failed to fetch dashboard stats');
  }
};

const exportReport = async (req, res) => {
  try {
    const { type, startDate, endDate, department, status } = req.query;

    if (!type) {
      return errorResponse(res, 400, 'Report type is required (procurement, supplier, invoice, delivery)');
    }

    const validTypes = ['procurement', 'supplier', 'invoice', 'delivery'];
    if (!validTypes.includes(type)) {
      return errorResponse(res, 400, `Invalid report type. Must be one of: ${validTypes.join(', ')}`);
    }

    const filter = {};
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    let buffer;
    let fileName;

    switch (type) {
      case 'procurement': {
        const intentFilter = { ...filter };
        if (department) intentFilter.department = new mongoose.Types.ObjectId(department);
        if (status) intentFilter.status = status;

        const intents = await Intent.find(intentFilter)
          .populate('requester', 'name email')
          .populate('department', 'name')
          .sort('-createdAt')
          .lean();

        buffer = await generateProcurementReport({ intents });
        fileName = `procurement-report-${Date.now()}.xlsx`;
        break;
      }
      case 'supplier': {
        const suppliers = await Supplier.find()
          .populate('department', 'name')
          .lean();

        const poFilter = { ...filter };
        const purchaseOrders = await PurchaseOrder.find(poFilter)
          .populate('supplier', 'companyName')
          .lean();

        const enrichedSuppliers = suppliers.map((s) => {
          const supplierPOs = purchaseOrders.filter(
            (po) => po.supplier && po.supplier._id.toString() === s._id.toString()
          );
          return {
            ...s,
            totalQuotations: supplierPOs.length,
          };
        });

        buffer = await generateSupplierReport({ suppliers: enrichedSuppliers });
        fileName = `supplier-report-${Date.now()}.xlsx`;
        break;
      }
      case 'invoice': {
        const invoiceFilter = { ...filter };
        if (status) invoiceFilter.status = status;

        const invoices = await Invoice.find(invoiceFilter)
          .populate('intent', 'intentId')
          .populate('purchaseOrder', 'poNumber')
          .populate('supplier', 'companyName')
          .populate('verifiedBy', 'name')
          .sort('-createdAt')
          .lean();

        buffer = await generateInvoiceReport({ invoices });
        fileName = `invoice-report-${Date.now()}.xlsx`;
        break;
      }
      case 'delivery': {
        const deliveryFilter = { ...filter };
        if (status) deliveryFilter.status = status;

        const deliveries = await Delivery.find(deliveryFilter)
          .populate('intent', 'intentId')
          .populate('purchaseOrder', 'poNumber')
          .populate('supplier', 'companyName')
          .populate('receivedBy', 'name')
          .populate('inspectedBy', 'name')
          .sort('-createdAt')
          .lean();

        buffer = await generateDeliveryReport({ deliveries });
        fileName = `delivery-report-${Date.now()}.xlsx`;
        break;
      }
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    return res.send(Buffer.from(buffer));
  } catch (error) {
    return errorResponse(res, 500, error.message || 'Failed to export report');
  }
};

module.exports = {
  getProcurementReport,
  getSupplierReport,
  getInvoiceReport,
  getDashboardStats,
  exportReport,
};
