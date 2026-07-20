import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import notificationApi from '../api/notificationApi';

const NotificationContext = createContext(null);

export { NotificationContext };

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const intervalRef = useRef(null);

  const fetchUnreadCount = useCallback(async () => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    try {
      const res = await notificationApi.getUnreadCount();
      const payload = res.data || {};
      // support both wrapper `{ data: { count } }` and legacy `{ count }`
      const count = payload.data?.count ?? payload.count ?? payload.unreadCount ?? 0;
      setUnreadCount(count);
    } catch {
      // silently fail
    }
  }, [user]);

  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    try {
      const res = await notificationApi.getNotifications({ limit: 50 });
      const payload = res.data || {};
      // backend paginatedResponse returns { data: [...], pagination: {...} }
      const list = payload.data ?? payload.notifications ?? [];
      setNotifications(list);
      await fetchUnreadCount();
    } catch {
      // silently fail
    }
  }, [fetchUnreadCount, user]);

  useEffect(() => {
    fetchNotifications();
    intervalRef.current = setInterval(() => {
      fetchUnreadCount();
    }, 30000);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchNotifications, fetchUnreadCount, user]);

  const addNotification = (notification) => {
    setNotifications((prev) => [notification, ...prev]);
    setUnreadCount((prev) => prev + 1);
  };

  const markAsRead = async (id) => {
    await notificationApi.markAsRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n._id === id || n.id === id ? { ...n, read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const markAllAsRead = async () => {
    await notificationApi.markAllAsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const deleteNotification = async (id) => {
    await notificationApi.deleteNotification(id);
    setNotifications((prev) => prev.filter((n) => n._id !== id && n.id !== id));
    fetchUnreadCount();
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        refresh: fetchNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}

export default NotificationContext;
