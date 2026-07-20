const express = require('express');
const { body, query, validationResult } = require('express-validator');
const Intent = require('../models/Intent');
const Department = require('../models/Department');
const User = require('../models/User');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const { uploadIntentFiles, handleUploadError } = require('../middleware/uploadMiddleware');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');

const router = express.Router();

// POST /api/intents
router.post(
  '/',
  protect,
  uploadIntentFiles,
  handleUploadError,
  (req, res, next) => {
    if (req.body.items && typeof req.body.items === 'string') {
      try {
        req.body.items = JSON.parse(req.body.items);
      } catch (e) {
        // leave as-is, validation will catch it
      }
    }
    next();
  },
  [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('description').trim().notEmpty().withMessage('Description is required'),
    body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
    body('items.*.name').trim().notEmpty().withMessage('Item name is required'),
    body('items.*.quantity').isNumeric().withMessage('Item quantity must be a number'),
    body('department').trim().notEmpty().withMessage('Department is required'),
    body('estimatedCost').optional({ nullable: true }).isNumeric().withMessage('Estimated cost must be a number'),
    body('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).withMessage('Invalid priority'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return errorResponse(res, 422, errors.array().map((e) => e.msg).join(', '));
      }

      const { title, description, items, department, estimatedCost, priority, justification, deliveryDate, category } = req.body;

      const dept = await Department.findById(department);
      if (!dept) {
        return errorResponse(res, 400, 'Department not found');
      }

      const documents = [];
      if (req.files && req.files.length > 0) {
        req.files.forEach((file) => {
          documents.push({
            name: file.originalname,
            url: file.path,
            type: file.mimetype,
            uploadedAt: new Date(),
          });
        });
      }

      const intent = await Intent.create({
        title,
        description,
        requester: req.user._id,
        department,
        items,
        estimatedCost,
        priority: priority || 'MEDIUM',
        category: category || 'GOODS',
        justification,
        deliveryDate: deliveryDate ? new Date(deliveryDate) : undefined,
        documents,
        status: 'DRAFT',
      });

      const populatedIntent = await Intent.findById(intent._id)
        .populate('requester', 'name email')
        .populate('department', 'name');

      return successResponse(res, 201, 'Intent created', { intent: populatedIntent });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/intents
router.get('/', protect, async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      status,
      priority,
      category,
      department,
      requester,
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const filter = {};

    if (req.user.role === 'user') {
      filter.requester = req.user._id;
    } else if (req.user.role === 'manager') {
      filter.$or = [
        { requester: req.user._id },
        { department: { $in: (await Department.find({ head: req.user._id })).map((d) => d._id) } },
      ];
    }

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { intentId: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (category) filter.category = category;
    if (department) filter.department = department;
    if (requester) filter.requester = requester;

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [intents, total] = await Promise.all([
      Intent.find(filter)
        .populate('requester', 'name email avatar')
        .populate('department', 'name')
        .populate('selectedSupplier', 'companyName')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Intent.countDocuments(filter),
    ]);

    return paginatedResponse(res, intents, page, limit, total);
  } catch (error) {
    next(error);
  }
});

// GET /api/intents/my
router.get('/my', protect, async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, priority } = req.query;

    const filter = { requester: req.user._id };
    if (status) filter.status = status;
    if (priority) filter.priority = priority;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [intents, total] = await Promise.all([
      Intent.find(filter)
        .populate('department', 'name')
        .populate('selectedSupplier', 'companyName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Intent.countDocuments(filter),
    ]);

    return paginatedResponse(res, intents, page, limit, total);
  } catch (error) {
    next(error);
  }
});

// GET /api/intents/:id
router.get('/:id', protect, async (req, res, next) => {
  try {
    const intent = await Intent.findById(req.params.id)
      .populate('requester', 'name email avatar phone')
      .populate('department', 'name description')
      .populate('selectedSupplier', 'companyName contactPerson email phone')
      .populate('quotations')
      .populate('purchaseOrder')
      .populate('delivery')
      .populate('invoice');

    if (!intent) {
      return errorResponse(res, 404, 'Intent not found');
    }

    if (req.user.role === 'user' && intent.requester._id.toString() !== req.user._id.toString()) {
      return errorResponse(res, 403, 'Not authorized to view this intent');
    }

    return successResponse(res, 200, 'Intent retrieved', { intent });
  } catch (error) {
    next(error);
  }
});

// PUT /api/intents/:id
router.put(
  '/:id',
  protect,
  uploadIntentFiles,
  handleUploadError,
  (req, res, next) => {
    if (req.body.items && typeof req.body.items === 'string') {
      try {
        req.body.items = JSON.parse(req.body.items);
      } catch (e) {
        // leave as-is
      }
    }
    next();
  },
  async (req, res, next) => {
    try {
      const intent = await Intent.findById(req.params.id);
      if (!intent) {
        return errorResponse(res, 404, 'Intent not found');
      }

      const isApprovalUpdate = req.body.status || req.body.managerApproval || req.body.adminApproval;

      if (isApprovalUpdate) {
        if (req.body.managerApproval && req.user.role !== 'manager' && req.user.role !== 'admin') {
          return errorResponse(res, 403, 'Only managers can approve/reject intents');
        }
        if (req.body.adminApproval && req.user.role !== 'admin') {
          return errorResponse(res, 403, 'Only admins can approve/reject intents');
        }

        const updates = {};
        if (req.body.status) updates.status = req.body.status;
        if (req.body.managerApproval) updates.managerApproval = req.body.managerApproval;
        if (req.body.adminApproval) updates.adminApproval = req.body.adminApproval;

        updates.$push = {
          statusHistory: {
            status: req.body.status || intent.status,
            changedBy: req.user._id,
            changedAt: new Date(),
            remarks: (req.body.managerApproval && req.body.managerApproval.remarks) ||
                     (req.body.adminApproval && req.body.adminApproval.remarks) || '',
          },
        };

        const oldData = { status: intent.status, managerApproval: intent.managerApproval, adminApproval: intent.adminApproval };
        const updatedIntent = await Intent.findByIdAndUpdate(req.params.id, updates, {
          new: true,
          runValidators: true,
        })
          .populate('requester', 'name email')
          .populate('department', 'name');

        await AuditLog.create({
          user: req.user._id,
          action: 'UPDATE',
          entity: 'Intent',
          entityId: intent._id,
          oldData,
          newData: updatedIntent.toObject(),
          ipAddress: req.ip,
        });

        return successResponse(res, 200, 'Intent updated', { intent: updatedIntent });
      }

      if (req.user.role === 'user' && intent.requester.toString() !== req.user._id.toString()) {
        return errorResponse(res, 403, 'Not authorized to update this intent');
      }

      if (!['DRAFT', 'REJECTED_BY_MANAGER'].includes(intent.status) && req.user.role === 'user') {
        return errorResponse(res, 400, 'Cannot update intent in current status');
      }

      const allowedFields = ['title', 'description', 'items', 'estimatedCost', 'priority', 'category', 'justification', 'deliveryDate'];
      const updates = {};
      allowedFields.forEach((field) => {
        if (req.body[field] !== undefined) {
          updates[field] = req.body[field];
        }
      });

      if (req.files && req.files.length > 0) {
        const newDocs = req.files.map((file) => ({
          name: file.originalname,
          url: file.path,
          type: file.mimetype,
          uploadedAt: new Date(),
        }));
        updates.$push = { documents: { $each: newDocs } };
      }

      const oldData = { status: intent.status, ...intent.toObject() };
      const updatedIntent = await Intent.findByIdAndUpdate(req.params.id, updates, {
        new: true,
        runValidators: true,
      })
        .populate('requester', 'name email')
        .populate('department', 'name');

      await AuditLog.create({
        user: req.user._id,
        action: 'UPDATE',
        entity: 'Intent',
        entityId: intent._id,
        oldData,
        newData: updatedIntent.toObject(),
        ipAddress: req.ip,
      });

      return successResponse(res, 200, 'Intent updated', { intent: updatedIntent });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/intents/:id
router.delete('/:id', protect, async (req, res, next) => {
  try {
    const intent = await Intent.findById(req.params.id);
    if (!intent) {
      return errorResponse(res, 404, 'Intent not found');
    }

    if (req.user.role === 'user' && intent.requester.toString() !== req.user._id.toString()) {
      return errorResponse(res, 403, 'Not authorized to delete this intent');
    }

    if (!['DRAFT', 'REJECTED_BY_MANAGER'].includes(intent.status)) {
      return errorResponse(res, 400, 'Cannot delete intent in current status');
    }

    await Intent.findByIdAndDelete(req.params.id);

    return successResponse(res, 200, 'Intent deleted');
  } catch (error) {
    next(error);
  }
});

// PUT /api/intents/:id/submit
router.put('/:id/submit', protect, async (req, res, next) => {
  try {
    const intent = await Intent.findById(req.params.id)
      .populate('requester', 'name email')
      .populate('department', 'name head');

    if (!intent) {
      return errorResponse(res, 404, 'Intent not found');
    }

    if (intent.requester._id.toString() !== req.user._id.toString()) {
      return errorResponse(res, 403, 'Only the requester can submit this intent');
    }

    if (!['DRAFT', 'REJECTED_BY_MANAGER'].includes(intent.status)) {
      return errorResponse(res, 400, 'Intent cannot be submitted in current status');
    }

    intent.status = 'PENDING_MANAGER_APPROVAL';
    intent.statusHistory.push({
      status: 'PENDING_MANAGER_APPROVAL',
      changedBy: req.user._id,
      changedAt: new Date(),
      remarks: 'Submitted for manager approval',
    });

    await intent.save();

    if (intent.department && intent.department.head) {
      const manager = await User.findById(intent.department.head);
      if (manager) {
        await Notification.create({
          recipient: manager._id,
          sender: req.user._id,
          title: 'New Intent Pending Approval',
          message: `Intent ${intent.intentId} - ${intent.title} requires your approval`,
          type: 'INFO',
          referenceModel: 'Intent',
          referenceId: intent._id,
        });
      }
    }

    const updatedIntent = await Intent.findById(intent._id)
      .populate('requester', 'name email')
      .populate('department', 'name');

    return successResponse(res, 200, 'Intent submitted for approval', { intent: updatedIntent });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
