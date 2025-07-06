import React from 'react';
import { useApp } from '../../context/AppContext';
import { formatDistanceToNow } from 'date-fns';

export function RecentActivity() {
  const { state } = useApp();
  const recentActivities = state.activities.slice(0, 5);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'task_created':
        return '📝';
      case 'task_updated':
        return '📋';
      case 'task_completed':
        return '✅';
      case 'project_created':
        return '📁';
      case 'user_joined':
        return '👋';
      default:
        return '📌';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
      <div className="space-y-3">
        {recentActivities.map((activity) => {
          const user = state.users.find(u => u.id === activity.userId);
          return (
            <div key={activity.id} className="flex items-start space-x-3">
              <div className="text-lg">{getActivityIcon(activity.type)}</div>
              <div className="flex-1">
                <p className="text-sm text-gray-900">{activity.description}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}