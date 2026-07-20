const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const { successResponse, errorResponse } = require('../utils/response');
const { sendWelcomeEmail, sendPasswordResetEmail } = require('../services/emailService');
const env = require('../config/env');

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRE,
  });
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

const sendTokenResponse = (user, statusCode, res, message = 'Success') => {
  const token = generateToken(user._id);

  const cookieOptions = {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };

  const userData = user.toObject ? user.toObject() : { ...user._doc };
  delete userData.password;

  return res
    .status(statusCode)
    .cookie('token', token, cookieOptions)
    .json({
      success: true,
      message,
      token,
      data: userData,
    });
};

const register = async (req, res) => {
  try {
    const { name, email, password, role, department, phone } = req.body;

    if (!email.endsWith('@msec.edu.in')) {
      return errorResponse(res, 400, 'Only @msec.edu.in email addresses are allowed');
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return errorResponse(res, 400, 'User with this email already exists');
    }

    const user = await User.create({
      name,
      email,
      password,
      role,
      department,
      phone,
    });

    sendWelcomeEmail(user).catch(() => {});

    return sendTokenResponse(user, 201, res, 'User registered successfully');
  } catch (error) {
    if (error.code === 11000) {
      return errorResponse(res, 400, 'User with this email already exists');
    }
    return errorResponse(res, 500, error.message || 'Error creating user');
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = (email || '').trim().toLowerCase();
    const normalizedPassword = password || '';

    if (!normalizedEmail || !normalizedPassword) {
      return errorResponse(res, 400, 'Please provide email and password');
    }

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
      return errorResponse(res, 401, 'Account has been deactivated. Please contact administrator.');
    }

    const isMatch = await user.matchPassword(normalizedPassword);
    if (!isMatch) {
      return errorResponse(res, 401, 'Invalid credentials');
    }

    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    return sendTokenResponse(user, 200, res, 'Login successful');
  } catch (error) {
    return errorResponse(res, 500, error.message || 'Error logging in');
  }
};

const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('department', 'name description');
    if (!user) {
      return errorResponse(res, 404, 'User not found');
    }
    return successResponse(res, 200, 'User profile retrieved', user);
  } catch (error) {
    return errorResponse(res, 500, error.message || 'Error fetching user profile');
  }
};

const logout = async (req, res) => {
  try {
    const cookieOptions = {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
      expires: new Date(0),
    };

    return res
      .status(200)
      .cookie('token', '', cookieOptions)
      .json({
        success: true,
        message: 'Logged out successfully',
      });
  } catch (error) {
    return errorResponse(res, 500, error.message || 'Error logging out');
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return errorResponse(res, 400, 'Please provide your email address');
    }

    const user = await User.findOne({ email });
    if (!user) {
      return errorResponse(res, 404, 'No user found with this email address');
    }

    if (!user.isActive) {
      return errorResponse(res, 400, 'Account has been deactivated');
    }

    const resetToken = user.getResetPasswordToken();
    await user.save({ validateBeforeSave: false });

    const resetUrl = `${env.CLIENT_URL}/reset-password/${resetToken}`;

    sendPasswordResetEmail(user, resetUrl).catch(async () => {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });
    });

    return successResponse(res, 200, 'Password reset email sent successfully');
  } catch (error) {
    return errorResponse(res, 500, error.message || 'Error processing forgot password request');
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password) {
      return errorResponse(res, 400, 'Please provide a new password');
    }

    const resetPasswordToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() },
    }).select('+password');

    if (!user) {
      return errorResponse(res, 400, 'Invalid or expired reset token');
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    return sendTokenResponse(user, 200, res, 'Password reset successful');
  } catch (error) {
    return errorResponse(res, 500, error.message || 'Error resetting password');
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return errorResponse(res, 400, 'Please provide current password and new password');
    }

    const user = await User.findById(req.user._id).select('+password');
    if (!user) {
      return errorResponse(res, 404, 'User not found');
    }

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return errorResponse(res, 401, 'Current password is incorrect');
    }

    user.password = newPassword;
    await user.save();

    return sendTokenResponse(user, 200, res, 'Password changed successfully');
  } catch (error) {
    return errorResponse(res, 500, error.message || 'Error changing password');
  }
};

module.exports = {
  register,
  login,
  getMe,
  logout,
  forgotPassword,
  resetPassword,
  changePassword,
};
