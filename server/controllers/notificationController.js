const { Notification } = require('../models/index');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');

const getNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20, isRead, type, search } = req.query;

    const filter = { recipient: req.user._id };
    if (isRead !== undefined) {
      filter.isRead = isRead === 'true';
    }
    if (type) {
      filter.type = type;
    }
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { message: { $regex: search, $options: 'i' } },
      ];
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const [notifications, total] = await Promise.all([
      Notification.find(filter)
        .populate('sender', 'name email avatar')
        .sort('-createdAt')
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Notification.countDocuments(filter),
    ]);

    return paginatedResponse(res, notifications, pageNum, limitNum, total);
  } catch (error) {
    return errorResponse(res, 500, error.message || 'Failed to fetch notifications');
  }
};

const getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      recipient: req.user._id,
      isRead: false,
    });

    return successResponse(res, 200, 'Unread count retrieved successfully', { count });
  } catch (error) {
    return errorResponse(res, 500, error.message || 'Failed to fetch unread count');
  }
};

const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return errorResponse(res, 404, 'Notification not found');
    }

    if (notification.recipient.toString() !== req.user._id.toString()) {
      return errorResponse(res, 403, 'You can only mark your own notifications as read');
    }

    notification.isRead = true;
    await notification.save();

    return successResponse(res, 200, 'Notification marked as read', notification);
  } catch (error) {
    return errorResponse(res, 500, error.message || 'Failed to mark notification as read');
  }
};

const markAllAsRead = async (req, res) => {
  try {
    const result = await Notification.updateMany(
      { recipient: req.user._id, isRead: false },
      { isRead: true }
    );

    return successResponse(res, 200, 'All notifications marked as read', {
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    return errorResponse(res, 500, error.message || 'Failed to mark all notifications as read');
  }
};

const deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return errorResponse(res, 404, 'Notification not found');
    }

    if (notification.recipient.toString() !== req.user._id.toString()) {
      return errorResponse(res, 403, 'You can only delete your own notifications');
    }

    await Notification.findByIdAndDelete(req.params.id);

    return successResponse(res, 200, 'Notification deleted successfully');
  } catch (error) {
    return errorResponse(res, 500, error.message || 'Failed to delete notification');
  }
};

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
};
