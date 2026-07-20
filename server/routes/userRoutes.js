const express = require('express');
const { body, param, validationResult } = require('express-validator');
const User = require('../models/User');
const Department = require('../models/Department');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');

const router = express.Router();

// ========== USER ROUTES ==========

// GET /api/users
router.get('/', protect, authorize('admin'), async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, role, department, isActive } = req.query;

    const filter = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }
    if (role) filter.role = role;
    if (department) filter.department = department;
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [users, total] = await Promise.all([
      User.find(filter)
        .populate('department', 'name')
        .select('-password -resetPasswordToken -resetPasswordExpire')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      User.countDocuments(filter),
    ]);

    return paginatedResponse(res, users, page, limit, total);
  } catch (error) {
    next(error);
  }
});

// GET /api/users/:id
router.get('/:id', protect, authorize('admin'), async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .populate('department', 'name description')
      .select('-password -resetPasswordToken -resetPasswordExpire');

    if (!user) {
      return errorResponse(res, 404, 'User not found');
    }

    return successResponse(res, 200, 'User retrieved', { user });
  } catch (error) {
    next(error);
  }
});

// PUT /api/users/:id
router.put(
  '/:id',
  protect,
  authorize('admin'),
  [
    body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
    body('email').optional().isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('role').optional().isIn(['user', 'manager', 'admin']).withMessage('Invalid role'),
    body('phone').optional().trim(),
    body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return errorResponse(res, 422, errors.array().map((e) => e.msg).join(', '));
      }

      const { name, email, role, phone, department, isActive } = req.body;

      const user = await User.findById(req.params.id);
      if (!user) {
        return errorResponse(res, 404, 'User not found');
      }

      if (email && email !== user.email) {
        const existing = await User.findOne({ email });
        if (existing) {
          return errorResponse(res, 400, 'Email already in use');
        }
      }

      if (name !== undefined) user.name = name;
      if (email !== undefined) user.email = email;
      if (role !== undefined) user.role = role;
      if (phone !== undefined) user.phone = phone;
      if (department !== undefined) user.department = department;
      if (isActive !== undefined) user.isActive = isActive;

      await user.save();

      const updatedUser = await User.findById(user._id)
        .populate('department', 'name')
        .select('-password -resetPasswordToken -resetPasswordExpire');

      return successResponse(res, 200, 'User updated', { user: updatedUser });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/users/:id
router.delete('/:id', protect, authorize('admin'), async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return errorResponse(res, 404, 'User not found');
    }

    if (user._id.toString() === req.user._id.toString()) {
      return errorResponse(res, 400, 'Cannot delete your own account');
    }

    await User.findByIdAndDelete(req.params.id);

    return successResponse(res, 200, 'User deleted');
  } catch (error) {
    next(error);
  }
});

// ========== DEPARTMENT ROUTES ==========

const departmentRouter = express.Router();

// GET /api/departments
departmentRouter.get('/', protect, async (req, res, next) => {
  try {
    const departments = await Department.find({ isActive: true })
      .populate('head', 'name email')
      .sort({ name: 1 })
      .lean();

    return successResponse(res, 200, 'Departments retrieved', { departments });
  } catch (error) {
    next(error);
  }
});

// POST /api/departments
departmentRouter.post(
  '/',
  protect,
  authorize('admin'),
  [
    body('name').trim().notEmpty().withMessage('Department name is required'),
    body('description').optional().trim(),
    body('head').optional().isMongoId().withMessage('Invalid user ID'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return errorResponse(res, 422, errors.array().map((e) => e.msg).join(', '));
      }

      const { name, description, head } = req.body;

      const existing = await Department.findOne({ name });
      if (existing) {
        return errorResponse(res, 400, 'Department with this name already exists');
      }

      const department = await Department.create({ name, description, head });

      return successResponse(res, 201, 'Department created', { department });
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/departments/:id
departmentRouter.put(
  '/:id',
  protect,
  authorize('admin'),
  [
    body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
    body('description').optional().trim(),
    body('head').optional().isMongoId().withMessage('Invalid user ID'),
    body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return errorResponse(res, 422, errors.array().map((e) => e.msg).join(', '));
      }

      const department = await Department.findById(req.params.id);
      if (!department) {
        return errorResponse(res, 404, 'Department not found');
      }

      const { name, description, head, isActive } = req.body;

      if (name && name !== department.name) {
        const existing = await Department.findOne({ name });
        if (existing) {
          return errorResponse(res, 400, 'Department name already in use');
        }
      }

      if (name !== undefined) department.name = name;
      if (description !== undefined) department.description = description;
      if (head !== undefined) department.head = head;
      if (isActive !== undefined) department.isActive = isActive;

      await department.save();

      return successResponse(res, 200, 'Department updated', { department });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/departments/:id
departmentRouter.delete('/:id', protect, authorize('admin'), async (req, res, next) => {
  try {
    const department = await Department.findById(req.params.id);
    if (!department) {
      return errorResponse(res, 404, 'Department not found');
    }

    await Department.findByIdAndDelete(req.params.id);

    return successResponse(res, 200, 'Department deleted');
  } catch (error) {
    next(error);
  }
});

module.exports = router;
module.exports.departmentRouter = departmentRouter;
