const express = require('express');
const Notification = require('../models/Notification');
const { protect } = require('../middleware/authMiddleware');
const {
  createNotification,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  getNotifications,
} = require('../services/notificationService');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');

const router = express.Router();

// GET /api/notifications
router.get('/', protect, async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const result = await getNotifications(req.user._id, parseInt(page), parseInt(limit));

    return paginatedResponse(res, result.notifications, page, limit, result.pagination.total);
  } catch (error) {
    next(error);
  }
});

// GET /api/notifications/unread-count
router.get('/unread-count', protect, async (req, res, next) => {
  try {
    const count = await getUnreadCount(req.user._id);

    return successResponse(res, 200, 'Unread count retrieved', { count });
  } catch (error) {
    next(error);
  }
});

// PUT /api/notifications/read-all
router.put('/read-all', protect, async (req, res, next) => {
  try {
    await markAllAsRead(req.user._id);

    return successResponse(res, 200, 'All notifications marked as read');
  } catch (error) {
    next(error);
  }
});

// PUT /api/notifications/:id/read
router.put('/:id/read', protect, async (req, res, next) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return errorResponse(res, 404, 'Notification not found');
    }

    if (notification.recipient.toString() !== req.user._id.toString()) {
      return errorResponse(res, 403, 'Not authorized to update this notification');
    }

    const updated = await markAsRead(req.params.id);

    return successResponse(res, 200, 'Notification marked as read', { notification: updated });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/notifications/:id
router.delete('/:id', protect, async (req, res, next) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return errorResponse(res, 404, 'Notification not found');
    }

    if (notification.recipient.toString() !== req.user._id.toString()) {
      return errorResponse(res, 403, 'Not authorized to delete this notification');
    }

    await Notification.findByIdAndDelete(req.params.id);

    return successResponse(res, 200, 'Notification deleted');
  } catch (error) {
    next(error);
  }
});

module.exports = router;
