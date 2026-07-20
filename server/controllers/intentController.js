const Intent = require('../models/Intent');
const Department = require('../models/Department');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');
const { INTENT_STATUSES } = require('../utils/constants');

const createIntent = async (req, res) => {
  try {
    const {
      title,
      description,
      department,
      items,
      estimatedCost,
      priority,
      documents,
    } = req.body;

    const dept = await Department.findById(department);
    if (!dept) {
      return errorResponse(res, 400, 'Department not found');
    }

    const intent = await Intent.create({
      title,
      description,
      requester: req.user._id,
      department,
      items,
      estimatedCost,
      priority,
      documents,
    });

    const populatedIntent = await Intent.findById(intent._id)
      .populate('requester', 'name email')
      .populate('department', 'name');

    return successResponse(res, 201, 'Intent created successfully', populatedIntent);
  } catch (error) {
    return errorResponse(res, 500, error.message || 'Error creating intent');
  }
};

const getIntents = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      department,
      priority,
      startDate,
      endDate,
      search,
    } = req.query;

    const query = {};

    if (req.user.role === 'user') {
      query.requester = req.user._id;
    } else if (req.user.role === 'manager') {
      query.$or = [
        { status: INTENT_STATUSES.PENDING_MANAGER_APPROVAL },
        { requester: req.user._id },
      ];
    }

    if (status) {
      if (query.$or) {
        delete query.$or;
        query.status = status;
        if (req.user.role === 'user') {
          query.requester = req.user._id;
        }
      } else {
        query.status = status;
      }
    }

    if (department) {
      query.department = department;
    }

    if (priority) {
      query.priority = priority;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate);
      }
    }

    if (search) {
      const searchQuery = {
        $or: [
          { title: { $regex: search, $options: 'i' } },
          { intentId: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
        ],
      };

      if (query.$or && req.user.role === 'manager') {
        const existingOr = query.$or;
        delete query.$or;
        query.$and = [
          { $or: existingOr },
          searchQuery,
        ];
      } else if (req.user.role === 'user') {
        query.$or = searchQuery.$or;
        query.requester = req.user._id;
      } else {
        Object.assign(query, searchQuery);
      }
    }

    const total = await Intent.countDocuments(query);
    const intents = await Intent.find(query)
      .populate('requester', 'name email')
      .populate('department', 'name')
      .populate('selectedSupplier', 'companyName')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit, 10));

    return paginatedResponse(res, intents, page, limit, total);
  } catch (error) {
    return errorResponse(res, 500, error.message || 'Error fetching intents');
  }
};

const getIntentById = async (req, res) => {
  try {
    const intent = await Intent.findById(req.params.id)
      .populate('requester', 'name email phone department')
      .populate('department', 'name description')
      .populate('selectedSupplier', 'companyName contactPerson email phone')
      .populate({
        path: 'quotations',
        populate: { path: 'supplier', select: 'companyName contactPerson email' },
      })
      .populate('purchaseOrder')
      .populate('delivery')
      .populate('invoice');

    if (!intent) {
      return errorResponse(res, 404, 'Intent not found');
    }

    return successResponse(res, 200, 'Intent retrieved successfully', intent);
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return errorResponse(res, 400, 'Invalid intent ID format');
    }
    return errorResponse(res, 500, error.message || 'Error fetching intent');
  }
};

const updateIntent = async (req, res) => {
  try {
    const intent = await Intent.findById(req.params.id);
    if (!intent) {
      return errorResponse(res, 404, 'Intent not found');
    }

    // Allow managers/admins to approve/reject (update status/approval fields)
    const isApprovalUpdate = req.body.status || req.body.managerApproval || req.body.adminApproval;
    
    if (isApprovalUpdate) {
      // Manager approval/rejection
      if (req.body.managerApproval && req.user.role !== 'manager' && req.user.role !== 'admin') {
        return errorResponse(res, 403, 'Only managers can approve intents');
      }
      
      // Admin approval/rejection
      if (req.body.adminApproval && req.user.role !== 'admin') {
        return errorResponse(res, 403, 'Only admins can approve intents');
      }

      // Update approval fields and status
      const updates = {
        ...(req.body.status && { status: req.body.status }),
        ...(req.body.managerApproval && { managerApproval: req.body.managerApproval }),
        ...(req.body.adminApproval && { adminApproval: req.body.adminApproval }),
      };

      const updatedIntent = await Intent.findByIdAndUpdate(
        req.params.id,
        { $set: updates },
        { new: true, runValidators: true }
      )
        .populate('requester', 'name email')
        .populate('department', 'name');

      return successResponse(res, 200, 'Intent updated successfully', updatedIntent);
    }

    // Regular draft updates - only allow owner or admin
    if (intent.status !== 'DRAFT') {
      return errorResponse(res, 400, 'Only draft intents can be updated');
    }

    if (intent.requester.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return errorResponse(res, 403, 'You can only update your own draft intents');
    }

    const allowedFields = [
      'title',
      'description',
      'department',
      'items',
      'estimatedCost',
      'priority',
      'documents',
    ];

    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return errorResponse(res, 400, 'No valid fields to update');
    }

    const updatedIntent = await Intent.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    )
      .populate('requester', 'name email')
      .populate('department', 'name');

    return successResponse(res, 200, 'Intent updated successfully', updatedIntent);
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return errorResponse(res, 400, 'Invalid intent ID format');
    }
    return errorResponse(res, 500, error.message || 'Error updating intent');
  }
};

const deleteIntent = async (req, res) => {
  try {
    const intent = await Intent.findById(req.params.id);
    if (!intent) {
      return errorResponse(res, 404, 'Intent not found');
    }

    if (intent.status !== 'DRAFT') {
      return errorResponse(res, 400, 'Only draft intents can be deleted');
    }

    if (intent.requester.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return errorResponse(res, 403, 'You can only delete your own draft intents');
    }

    await Intent.findByIdAndDelete(req.params.id);

    return successResponse(res, 200, 'Intent deleted successfully');
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return errorResponse(res, 400, 'Invalid intent ID format');
    }
    return errorResponse(res, 500, error.message || 'Error deleting intent');
  }
};

const submitIntent = async (req, res) => {
  try {
    const intent = await Intent.findById(req.params.id);
    if (!intent) {
      return errorResponse(res, 404, 'Intent not found');
    }

    if (intent.status !== 'DRAFT') {
      return errorResponse(res, 400, 'Only draft intents can be submitted');
    }

    if (intent.requester.toString() !== req.user._id.toString()) {
      return errorResponse(res, 403, 'You can only submit your own intents');
    }

    if (!intent.items || intent.items.length === 0) {
      return errorResponse(res, 400, 'Intent must have at least one item before submission');
    }

    intent.status = INTENT_STATUSES.PENDING_MANAGER_APPROVAL;
    intent.statusHistory.push({
      status: INTENT_STATUSES.PENDING_MANAGER_APPROVAL,
      changedBy: req.user._id,
      changedAt: new Date(),
      remarks: req.body.remarks || 'Intent submitted for manager approval',
    });

    await intent.save();

    const populatedIntent = await Intent.findById(intent._id)
      .populate('requester', 'name email')
      .populate('department', 'name');

    return successResponse(res, 200, 'Intent submitted for manager approval', populatedIntent);
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return errorResponse(res, 400, 'Invalid intent ID format');
    }
    return errorResponse(res, 500, error.message || 'Error submitting intent');
  }
};

const getMyIntents = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;

    const query = { requester: req.user._id };

    if (status) {
      query.status = status;
    }

    const total = await Intent.countDocuments(query);
    const intents = await Intent.find(query)
      .populate('department', 'name')
      .populate('selectedSupplier', 'companyName')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit, 10));

    return paginatedResponse(res, intents, page, limit, total);
  } catch (error) {
    return errorResponse(res, 500, error.message || 'Error fetching your intents');
  }
};

module.exports = {
  createIntent,
  getIntents,
  getIntentById,
  updateIntent,
  deleteIntent,
  submitIntent,
  getMyIntents,
};
