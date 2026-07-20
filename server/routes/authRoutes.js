const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { protect } = require('../middleware/authMiddleware');
const { successResponse, errorResponse } = require('../utils/response');
const { sendWelcomeEmail, sendPasswordResetEmail } = require('../services/emailService');

const router = express.Router();

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '7d' });
};

const isDemoLogin = (email, password) => {
  return typeof email === 'string' && email.trim().toLowerCase().endsWith('@msec.edu.in') && password === 'msec@123';
};

const getDemoUserName = (email) => {
  const localPart = email.split('@')[0].trim();
  if (!localPart) return 'User';
  return localPart.replace(/[_.-]+/g, ' ').replace(/\s+/g, ' ').trim() || 'User';
};

const getDemoUserRole = (email) => {
  const localPart = email.split('@')[0].trim().toLowerCase();
  if (localPart === 'admin') return 'admin';
  if (localPart === 'manager') return 'manager';
  if (['storemanager', 'store_manager', 'store-manager'].includes(localPart)) return 'store_manager';
  return 'user';
};

const sendTokenResponse = (user, statusCode, res, message) => {
  const token = generateToken(user._id);
  const cookieOptions = {
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  };

  res.cookie('token', token, cookieOptions);

  const userData = {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    department: user.department,
    phone: user.phone,
    avatar: user.avatar,
    isActive: user.isActive,
    createdAt: user.createdAt,
  };

  return res.status(statusCode).json({
    success: true,
    message,
    data: { user: userData, token },
  });
};

// POST /api/auth/register
router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
    body('department').optional().trim(),
    body('phone').optional().trim(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return errorResponse(res, 422, errors.array().map((e) => e.msg).join(', '));
      }

      const { name, email, password, department, phone } = req.body;

      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return errorResponse(res, 400, 'User with this email already exists');
      }

      const user = await User.create({ name, email, password, department, phone });

      sendWelcomeEmail(user).catch(() => {});

      sendTokenResponse(user, 201, res, 'User registered successfully');
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/auth/login
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return errorResponse(res, 422, errors.array().map((e) => e.msg).join(', '));
      }

      const { email, password } = req.body;
      const normalizedEmail = (email || '').trim().toLowerCase();
      const normalizedPassword = password || '';

      let user = await User.findOne({ email: normalizedEmail }).select('+password');

      if (!user && isDemoLogin(normalizedEmail, normalizedPassword)) {
        user = await User.create({
          name: getDemoUserName(normalizedEmail),
          email: normalizedEmail,
          password: normalizedPassword,
          role: getDemoUserRole(normalizedEmail),
          isActive: true,
        });
      }

      if (!user) {
        return errorResponse(res, 401, 'Invalid credentials');
      }

      if (!user.isActive) {
        return errorResponse(res, 401, 'Account has been deactivated');
      }

      const isMatch = await user.matchPassword(normalizedPassword);
      if (!isMatch) {
        return errorResponse(res, 401, 'Invalid credentials');
      }

      user.lastLogin = new Date();
      await user.save({ validateBeforeSave: false });

      sendTokenResponse(user, 200, res, 'Login successful');
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/auth/me
router.get('/me', protect, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('department', 'name description')
      .select('-password -resetPasswordToken -resetPasswordExpire');

    return successResponse(res, 200, 'User profile retrieved', { user });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.cookie('token', '', {
    httpOnly: true,
    expires: new Date(0),
    secure: process.env.NODE_ENV === 'production',
  });

  return successResponse(res, 200, 'Logged out successfully');
});

// POST /api/auth/forgot-password
router.post(
  '/forgot-password',
  [body('email').isEmail().withMessage('Valid email is required').normalizeEmail()],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return errorResponse(res, 422, errors.array().map((e) => e.msg).join(', '));
      }

      const user = await User.findOne({ email: req.body.email });
      if (!user) {
        return successResponse(res, 200, 'If an account exists, a reset email has been sent');
      }

      const resetToken = user.getResetPasswordToken();
      await user.save({ validateBeforeSave: false });

      const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

      sendPasswordResetEmail(user, resetUrl).catch(async () => {
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        await user.save({ validateBeforeSave: false });
      });

      return successResponse(res, 200, 'If an account exists, a reset email has been sent');
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/auth/reset-password/:token
router.put(
  '/reset-password/:token',
  [
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return errorResponse(res, 422, errors.array().map((e) => e.msg).join(', '));
      }

      const resetPasswordToken = crypto
        .createHash('sha256')
        .update(req.params.token)
        .digest('hex');

      const user = await User.findOne({
        resetPasswordToken,
        resetPasswordExpire: { $gt: Date.now() },
      }).select('+password');

      if (!user) {
        return errorResponse(res, 400, 'Invalid or expired reset token');
      }

      user.password = req.body.password;
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save();

      sendTokenResponse(user, 200, res, 'Password reset successful');
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/auth/change-password
router.put(
  '/change-password',
  protect,
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 6 })
      .withMessage('New password must be at least 6 characters'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return errorResponse(res, 422, errors.array().map((e) => e.msg).join(', '));
      }

      const user = await User.findById(req.user._id).select('+password');
      const isMatch = await user.matchPassword(req.body.currentPassword);

      if (!isMatch) {
        return errorResponse(res, 400, 'Current password is incorrect');
      }

      user.password = req.body.newPassword;
      await user.save();

      sendTokenResponse(user, 200, res, 'Password changed successfully');
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
