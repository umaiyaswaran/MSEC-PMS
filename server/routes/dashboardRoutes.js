const express = require('express');
const Intent = require('../models/Intent');
const PurchaseOrder = require('../models/PurchaseOrder');
const Invoice = require('../models/Invoice');
const Delivery = require('../models/Delivery');
const Supplier = require('../models/Supplier');
const User = require('../models/User');
const Department = require('../models/Department');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const { successResponse, errorResponse } = require('../utils/response');

const router = express.Router();

// GET /api/dashboard/admin
router.get('/admin', protect, authorize('admin'), async (req, res, next) => {
  try {
    const [
      totalIntents,
      pendingApprovals,
      activePOs,
      totalInvoices,
      pendingPayments,
      totalSuppliers,
      totalUsers,
      totalDepartments,
      recentIntents,
    ] = await Promise.all([
      Intent.countDocuments(),
      Intent.countDocuments({ status: { $in: ['PENDING_MANAGER_APPROVAL', 'PENDING_ADMIN_APPROVAL'] } }),
      PurchaseOrder.countDocuments({ status: { $in: ['APPROVED', 'SENT', 'CONFIRMED'] } }),
      Invoice.countDocuments(),
      Invoice.countDocuments({ paymentStatus: 'UNPAID', status: { $in: ['APPROVED', 'VERIFIED'] } }),
      Supplier.countDocuments({ isActive: true }),
      User.countDocuments({ isActive: true }),
      Department.countDocuments({ isActive: true }),
      Intent.find()
        .populate('requester', 'name avatar')
        .populate('department', 'name')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
    ]);

    const totalSpent = await Invoice.aggregate([
      { $match: { paymentStatus: 'PAID' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]);

    const totalEstimated = await Intent.aggregate([
      { $group: { _id: null, total: { $sum: '$estimatedCost' } } },
    ]);

    const stats = {
      totalIntents,
      pendingApprovals,
      activePOs,
      totalInvoices,
      pendingPayments,
      totalSuppliers,
      totalUsers,
      totalDepartments,
      totalSpent: totalSpent[0]?.total || 0,
      totalEstimatedCost: totalEstimated[0]?.total || 0,
      recentIntents,
    };

    return successResponse(res, 200, 'Admin dashboard stats', { stats });
  } catch (error) {
    next(error);
  }
});

// GET /api/dashboard/manager
router.get('/manager', protect, authorize('manager', 'admin'), async (req, res, next) => {
  try {
    // Get intents pending manager approval
    const teamIntents = await Intent.find({ 
      status: 'PENDING_MANAGER_APPROVAL'
    })
      .populate('requester', 'name email avatar department')
      .populate('department', 'name')
      .sort('-createdAt')
      .limit(20)
      .lean();

    // Count pending approvals
    const pendingApprovals = await Intent.countDocuments({
      status: 'PENDING_MANAGER_APPROVAL',
    });

    const intentStatusCounts = await Intent.aggregate([
      {
        $match: {
          status: 'PENDING_MANAGER_APPROVAL',
        },
      },
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentActivity = await Intent.find({ createdAt: { $gte: thirtyDaysAgo } })
      .populate('requester', 'name email avatar')
      .populate('department', 'name')
      .sort('-createdAt')
      .limit(15)
      .lean();

    return successResponse(res, 200, 'Manager dashboard retrieved successfully', {
      pendingApprovals,
      teamIntents,
      intentStatusCounts,
      recentActivity,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/dashboard/user
router.get('/user', protect, async (req, res, next) => {
  try {
    const [
      myIntents,
      myPendingIntents,
      myApprovedIntents,
      myRejectedIntents,
    ] = await Promise.all([
      Intent.countDocuments({ requester: req.user._id }),
      Intent.countDocuments({ requester: req.user._id, status: { $in: ['DRAFT', 'PENDING_MANAGER_APPROVAL', 'PENDING_QUOTATION', 'PENDING_PO', 'SAMPLE_PO_CREATED', 'PENDING_ADMIN_APPROVAL', 'PO_APPROVED', 'PO_SENT', 'DELIVERY_PENDING'] } }),
      Intent.countDocuments({ requester: req.user._id, status: { $in: ['FULL_DELIVERY', 'INVOICE_UPLOADED', 'PAYMENT_COMPLETED', 'CLOSED'] } }),
      Intent.countDocuments({ requester: req.user._id, status: { $in: ['REJECTED_BY_MANAGER', 'REJECTED_BY_ADMIN'] } }),
    ]);

    const recentIntents = await Intent.find({ requester: req.user._id })
      .populate('department', 'name')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    const stats = {
      myIntents,
      myPendingIntents,
      myApprovedIntents,
      myRejectedIntents,
      recentIntents,
    };

    return successResponse(res, 200, 'User dashboard stats', { stats });
  } catch (error) {
    next(error);
  }
});

// GET /api/dashboard/charts
router.get('/charts', protect, authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const [
      monthlyIntents,
      statusDistribution,
      priorityDistribution,
      departmentDistribution,
      monthlySpending,
    ] = await Promise.all([
      Intent.aggregate([
        { $match: { createdAt: { $gte: sixMonthsAgo } } },
        {
          $group: {
            _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]),
      Intent.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Intent.aggregate([
        { $group: { _id: '$priority', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Intent.aggregate([
        {
          $lookup: {
            from: 'departments',
            localField: 'department',
            foreignField: '_id',
            as: 'dept',
          },
        },
        { $unwind: { path: '$dept', preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: '$dept.name',
            count: { $sum: 1 },
            totalCost: { $sum: '$estimatedCost' },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      Invoice.aggregate([
        { $match: { createdAt: { $gte: sixMonthsAgo } } },
        {
          $group: {
            _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
            totalAmount: { $sum: '$totalAmount' },
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]),
    ]);

    const charts = {
      monthlyIntents: monthlyIntents.map((item) => ({
        month: `${item._id.year}-${String(item._id.month).padStart(2, '0')}`,
        count: item.count,
      })),
      statusDistribution: statusDistribution.map((item) => ({
        status: item._id,
        count: item.count,
      })),
      priorityDistribution: priorityDistribution.map((item) => ({
        priority: item._id,
        count: item.count,
      })),
      departmentDistribution: departmentDistribution.map((item) => ({
        department: item._id || 'Unknown',
        count: item.count,
        totalCost: item.totalCost,
      })),
      monthlySpending: monthlySpending.map((item) => ({
        month: `${item._id.year}-${String(item._id.month).padStart(2, '0')}`,
        totalAmount: item.totalAmount,
        count: item.count,
      })),
    };

    return successResponse(res, 200, 'Chart data retrieved', { charts });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
