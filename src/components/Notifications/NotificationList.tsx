import React from 'react';
import { useApp } from '../../context/AppContext';
import { Bell, CheckSquare, Calendar, AlertTriangle, Info } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export function NotificationList() {
  const { state, dispatch } = useApp();

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'task_assigned':
        return CheckSquare;
      case 'task_completed':
        return CheckSquare;
      case 'project_updated':
        return Info;
      case 'deadline_approaching':
        return AlertTriangle;
      case 'system':
        return Bell;
      default:
        return Bell;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'task_assigned':
        return 'bg-blue-100 text-blue-600';
      case 'task_completed':
        return 'bg-green-100 text-green-600';
      case 'project_updated':
        return 'bg-purple-100 text-purple-600';
      case 'deadline_approaching':
        return 'bg-orange-100 text-orange-600';
      case 'system':
        return 'bg-gray-100 text-gray-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const markAsRead = (notificationId: string) => {
    dispatch({
      type: 'MARK_NOTIFICATION_READ',
      payload: notificationId,
    });
  };

  const markAllAsRead = () => {
    state.notifications.forEach(notification => {
      if (!notification.read) {
        dispatch({
          type: 'MARK_NOTIFICATION_READ',
          payload: notification.id,
        });
      }
    });
  };

  const unreadCount = state.notifications.filter(n => !n.read).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            Mark all as read
          </button>
        )}
      </div>

      {unreadCount > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            You have {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
          </p>
        </div>
      )}

      <div className="space-y-3">
        {state.notifications.map((notification) => {
          const Icon = getNotificationIcon(notification.type);
          return (
            <div
              key={notification.id}
              className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                notification.read
                  ? 'bg-white border-gray-200 hover:bg-gray-50'
                  : 'bg-blue-50 border-blue-200 hover:bg-blue-100'
              }`}
              onClick={() => !notification.read && markAsRead(notification.id)}
            >
              <div className="flex items-start">
                <div className={`p-2 rounded-lg mr-3 ${getNotificationColor(notification.type)}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className={`text-sm font-medium ${
                      notification.read ? 'text-gray-900' : 'text-gray-900'
                    }`}>
                      {notification.title}
                    </h3>
                    {!notification.read && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full" />
                    )}
                  </div>
                  <p className={`text-sm mt-1 ${
                    notification.read ? 'text-gray-600' : 'text-gray-700'
                  }`}>
                    {notification.message}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {state.notifications.length === 0 && (
        <div className="text-center py-12">
          <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No notifications yet</p>
        </div>
      )}
      
    </div>
  );
}