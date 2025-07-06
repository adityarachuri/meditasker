import React from 'react';
import { 
  LayoutDashboard, 
  FolderOpen, 
  CheckSquare, 
  Users, 
  Calendar, 
  BarChart3, 
  Settings, 
  Bell,
  LogOut
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'projects', label: 'Projects', icon: FolderOpen },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare },
  { id: 'team', label: 'Team', icon: Users },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const { state } = useApp();
  const unreadNotifications = state.notifications.filter(n => !n.read).length;
  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">SHI</span>
          </div>
          <div className="ml-3">
            <h1 className="text-lg font-semibold text-gray-900">Softique Health Insure</h1>
            <p className="text-sm text-gray-500">Project Management</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Icon className="w-5 h-5 mr-3" />
              {item.label}
            </button>
          );
        })}
        
        <button
          onClick={() => onTabChange('notifications')}
          className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
            activeTab === 'notifications'
              ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
              : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
          }`}
        >
          <Bell className="w-5 h-5 mr-3" />
          Notifications
          {unreadNotifications > 0 && (
            <span className="ml-auto bg-red-500 text-white text-xs rounded-full px-2 py-1">
              {unreadNotifications}
            </span>
          )}
        </button>
      </nav>

      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center">
          <img
            src={state.currentUser?.avatar || 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=50&h=50&fit=crop'}
            alt={state.currentUser?.name}
            className="w-10 h-10 rounded-full"
          />
          <div className="ml-3 flex-1">
            <p className="text-sm font-medium text-gray-900">{state.currentUser?.name}</p>
            <p className="text-xs text-gray-500">{state.currentUser?.role}</p>
          </div>
          <button className="p-2 text-gray-400 hover:text-gray-600">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}