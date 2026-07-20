const mongoose = require('mongoose');
const { Intent, PurchaseOrder, Invoice, Delivery, User, Supplier } = require('../models/index');
const { successResponse, errorResponse } = require('../utils/response');

const getAdminDashboard = async (req, res) => {
  try {
    const [
      totalUsers,
      totalIntents,
      pendingManagerApprovals,
      pendingAdminApprovals,
      totalSuppliers,
      activeSuppliers,
      recentIntents,
    ] = await Promise.all([
      User.countDocuments(),
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

    const intentStatusCounts = await Intent.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
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

    const totalSpendResult = await Invoice.aggregate([
      { $match: { paymentStatus: 'PAID' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]);

    const monthlyIntents = await Intent.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    return successResponse(res, 200, 'Admin dashboard retrieved successfully', {
      totalUsers,
      totalIntents,
      pendingApprovals: pendingManagerApprovals + pendingAdminApprovals,
      pendingManagerApprovals,
      pendingAdminApprovals,
      totalSpend: totalSpendResult[0]?.total || 0,
      activeSuppliers,
      totalSuppliers,
      intentStatusCounts,
      recentIntents,
      monthlySpend,
      monthlyIntents,
    });
  } catch (error) {
    return errorResponse(res, 500, error.message || 'Failed to fetch admin dashboard');
  }
};

const getManagerDashboard = async (req, res) => {
  try {
    const userId = req.user._id;

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
    return errorResponse(res, 500, error.message || 'Failed to fetch manager dashboard');
  }
};

const getUserDashboard = async (req, res) => {
  try {
    const userId = req.user._id;

    const [myIntents, myIntentsByStatus, recentActivity, pendingActions] = await Promise.all([
      Intent.find({ requester: userId })
        .populate('department', 'name')
        .sort('-createdAt')
        .limit(20)
        .lean(),
      Intent.aggregate([
        { $match: { requester: new mongoose.Types.ObjectId(userId) } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Intent.find({ requester: userId })
        .sort('-createdAt')
        .limit(10)
        .lean(),
      Intent.countDocuments({
        requester: userId,
        status: { $in: ['DRAFT', 'REJECTED_BY_MANAGER', 'REJECTED_BY_ADMIN'] },
      }),
    ]);

    const totalIntents = myIntents.length;
    const totalEstimatedCost = myIntents.reduce((sum, i) => sum + (i.estimatedCost || 0), 0);

    return successResponse(res, 200, 'User dashboard retrieved successfully', {
      totalIntents,
      totalEstimatedCost,
      myIntentsByStatus: myIntentsByStatus.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      recentActivity,
      pendingActions,
      intents: myIntents,
    });
  } catch (error) {
    return errorResponse(res, 500, error.message || 'Failed to fetch user dashboard');
  }
};

const getChartData = async (req, res) => {
  try {
    const { months = 6 } = req.query;
    const numMonths = parseInt(months, 10) || 6;

    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - numMonths);

    const [monthlySpend, monthlyIntents, monthlyDeliveries, topSuppliers] = await Promise.all([
      Invoice.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
            },
            totalSpend: { $sum: '$totalAmount' },
            paidSpend: {
              $sum: {
                $cond: [{ $eq: ['$paymentStatus', 'PAID'] }, '$totalAmount', 0],
              },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]),
      Intent.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]),
      Delivery.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              status: '$status',
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]),
      PurchaseOrder.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: '$supplier',
            totalOrders: { $sum: 1 },
            totalSpend: { $sum: '$grandTotal' },
          },
        },
        { $sort: { totalSpend: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: 'suppliers',
            localField: '_id',
            foreignField: '_id',
            as: 'supplier',
          },
        },
        { $unwind: { path: '$supplier', preserveNullAndEmptyArrays: true } },
      ]),
    ]);

    const monthLabels = [];
    const now = new Date();
    for (let i = numMonths - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthLabels.push({
        year: d.getFullYear(),
        month: d.getMonth() + 1,
        label: d.toLocaleString('default', { month: 'short', year: 'numeric' }),
      });
    }

    const fillMonthlyData = (data, key) => {
      return monthLabels.map((label) => {
        const found = data.find((d) => d._id.year === label.year && d._id.month === label.month);
        return {
          label: label.label,
          year: label.year,
          month: label.month,
          value: found ? (found[key] || found.count || 0) : 0,
        };
      });
    };

    return successResponse(res, 200, 'Chart data retrieved successfully', {
      monthlySpend: fillMonthlyData(monthlySpend, 'totalSpend'),
      monthlyPaidSpend: fillMonthlyData(monthlySpend, 'paidSpend'),
      monthlyIntents: fillMonthlyData(monthlyIntents, 'count'),
      monthlyDeliveries: fillMonthlyData(monthlyDeliveries, 'count'),
      topSuppliers: topSuppliers.map((s) => ({
        name: s.supplier?.companyName || 'Unknown',
        totalOrders: s.totalOrders,
        totalSpend: s.totalSpend,
      })),
    });
  } catch (error) {
    return errorResponse(res, 500, error.message || 'Failed to fetch chart data');
  }
};

module.exports = {
  getAdminDashboard,
  getManagerDashboard,
  getUserDashboard,
  getChartData,
};
