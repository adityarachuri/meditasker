import {
  LayoutDashboard,
  FolderOpen,
  CheckSquare,
  Users,
  Calendar,
  BarChart3,
  Settings,
  Bell,
  LogOut,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../hooks/useAuth';

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
  const { state, dispatch } = useApp();
  const { state: authState, logout } = useAuth();
  // Persisted (via AppProvider's settings -> localStorage sync) so the
  // sidebar stays collapsed/expanded across reloads.
  const collapsed = state.settings.sidebarCollapsed;
  const setCollapsed = (value: boolean) =>
    dispatch({ type: 'UPDATE_SETTINGS', payload: { sidebarCollapsed: value } });
  const unreadNotifications = state.notifications.filter(n => !n.read).length;
  return (
    <div className={`${collapsed ? 'w-20' : 'w-64'} bg-white border-r border-gray-200 flex flex-col transition-all duration-200`}>
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">MT</span>
            </div>
            {!collapsed && (
              <div className="ml-3">
                <h1 className="text-lg font-semibold text-gray-900">MediTasker</h1>
                <p className="text-sm text-gray-500">Project Management</p>
              </div>
            )}
          </div>
          {!collapsed && (
            <button
              onClick={() => setCollapsed(true)}
              className="p-1 text-gray-400 hover:text-gray-600"
              title="Collapse sidebar"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
        </div>
        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            className="mt-3 w-full flex items-center justify-center p-1 text-gray-400 hover:text-gray-600"
            title="Expand sidebar"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              title={collapsed ? item.label : undefined}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                collapsed ? 'justify-center' : ''
              } ${
                isActive
                  ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Icon className={`w-5 h-5 ${collapsed ? '' : 'mr-3'}`} />
              {!collapsed && item.label}
            </button>
          );
        })}

        <button
          onClick={() => onTabChange('notifications')}
          title={collapsed ? 'Notifications' : undefined}
          className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
            collapsed ? 'justify-center' : ''
          } ${
            activeTab === 'notifications'
              ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
              : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
          }`}
        >
          <Bell className={`w-5 h-5 ${collapsed ? '' : 'mr-3'}`} />
          {!collapsed && 'Notifications'}
          {unreadNotifications > 0 && (
            <span className={collapsed ? 'absolute top-1 right-1 bg-red-500 text-white text-xs rounded-full px-1.5' : 'ml-auto bg-red-500 text-white text-xs rounded-full px-2 py-1'}>
              {unreadNotifications}
            </span>
          )}
        </button>
      </nav>

      <div className="p-4 border-t border-gray-200">
        <div className={`flex items-center ${collapsed ? 'justify-center' : ''}`}>
          <img
            src={authState.user?.avatar || 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=50&h=50&fit=crop'}
            alt={authState.user?.name}
            className="w-10 h-10 rounded-full flex-shrink-0"
          />
          {!collapsed && (
            <div className="ml-3 flex-1">
              <p className="text-sm font-medium text-gray-900">{authState.user?.name}</p>
              <p className="text-xs text-gray-500">{authState.user?.role}</p>
            </div>
          )}
          <button
            onClick={logout}
            className={collapsed ? 'hidden' : 'p-2 text-gray-400 hover:text-gray-600'}
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
        {collapsed && (
          <button
            onClick={logout}
            className="mt-2 w-full flex items-center justify-center p-2 text-gray-400 hover:text-gray-600"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}