import React from 'react';
import { Search, Bell, Plus, Database } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { EnterpriseMonitoring } from '../Advanced/EnterpriseMonitoring';
import { GlobalSearch } from '../Advanced/GlobalSearch';

interface HeaderProps {
  title: string;
  onSearch?: (query: string) => void;
  onAddNew?: () => void;
  showAddButton?: boolean;
  sessionManager?: React.ReactNode;
}

export function Header({ title, onSearch, onAddNew, showAddButton = false, sessionManager }: HeaderProps) {
  const { state } = useApp();
  const [showGlobalSearch, setShowGlobalSearch] = React.useState(false);
  const unreadNotifications = state.notifications.filter(n => !n.read).length;

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        </div>

        <div className="flex items-center space-x-4">
          <button
            onClick={() => setShowGlobalSearch(!showGlobalSearch)}
            className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            title="Global Search (1M+ records)"
          >
            <Search className="w-4 h-4 mr-2" />
            <span className="hidden md:inline">Search All</span>
          </button>
          
          {onSearch && !showGlobalSearch && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search..."
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-64"
                onChange={(e) => onSearch(e.target.value)}
              />
            </div>
          )}

          {/* Enterprise Monitoring */}
          <div className="hidden lg:block">
            <EnterpriseMonitoring />
          </div>

          {/* Session Manager */}
          {sessionManager}

          {showAddButton && onAddNew && (
            <button
              onClick={onAddNew}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add New
            </button>
          )}

          <div className="relative">
            <button className="p-2 text-gray-400 hover:text-gray-600 relative">
              <Bell className="w-5 h-5" />
              {unreadNotifications > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {unreadNotifications}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
      
      {/* Global Search Overlay */}
      {showGlobalSearch && (
        <div className="absolute top-full left-0 right-0 z-50 p-6 bg-white border-b border-gray-200 shadow-lg">
          <GlobalSearch onClose={() => setShowGlobalSearch(false)} />
        </div>
      )}
    </header>
  );
}