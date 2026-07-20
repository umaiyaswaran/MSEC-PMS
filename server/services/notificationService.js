const Notification = require('../models/Notification');

const createNotification = async ({
  recipient,
  sender,
  title,
  message,
  type = 'INFO',
  referenceModel,
  referenceId,
}) => {
  const notification = await Notification.create({
    recipient,
    sender,
    title,
    message,
    type,
    referenceModel,
    referenceId,
  });

  return notification;
};

const getUnreadCount = async (userId) => {
  const count = await Notification.countDocuments({
    recipient: userId,
    isRead: false,
  });
  return count;
};

const markAsRead = async (notificationId) => {
  const notification = await Notification.findByIdAndUpdate(
    notificationId,
    { isRead: true },
    { new: true }
  );
  return notification;
};

const markAllAsRead = async (userId) => {
  const result = await Notification.updateMany(
    { recipient: userId, isRead: false },
    { isRead: true }
  );
  return result;
};

const getNotifications = async (userId, page = 1, limit = 20) => {
  const skip = (page - 1) * limit;

  const [notifications, total] = await Promise.all([
    Notification.find({ recipient: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('sender', 'name email avatar')
      .populate('recipient', 'name email avatar')
      .lean(),
    Notification.countDocuments({ recipient: userId }),
  ]);

  return {
    notifications,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
  };
};

module.exports = {
  createNotification,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  getNotifications,
};
