import axios from './axios';

const notificationApi = {
  getNotifications: (params) => axios.get('/notifications', { params }),
  getUnreadCount: () => axios.get('/notifications/unread-count'),
  // Server routes expect PUT for marking read/read-all
  markAsRead: (id) => axios.put(`/notifications/${id}/read`),
  markAllAsRead: () => axios.put('/notifications/read-all'),
  deleteNotification: (id) => axios.delete(`/notifications/${id}`),
};

export default notificationApi;
