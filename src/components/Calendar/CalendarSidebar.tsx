import { useState } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Search, 
  Filter,
  Calendar,
  BarChart3,
  Settings
} from 'lucide-react';
import { CalendarFilter } from '../../types/calendar';

interface CalendarSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  filter: CalendarFilter;
  onFilterChange: (filter: Partial<CalendarFilter>) => void;
  onClearFilter: () => void;
  statistics: {
    totalEvents: number;
    eventsByType: Record<string, number>;
    eventsByStatus: Record<string, number>;
    upcomingEvents: number;
    overdueEvents: number;
  };
  onSearch: (query: string) => void;
  onCreateEvent: () => void;
}

export function CalendarSidebar({
  collapsed,
  onToggle,
  filter,
  onFilterChange,
  onClearFilter,
  statistics,
  onSearch,
  onCreateEvent
}: CalendarSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    onSearch(query);
  };

  const toggleFilter = (filterType: keyof CalendarFilter, value: string) => {
    const currentValues = filter[filterType] as string[];
    const newValues = currentValues.includes(value)
      ? currentValues.filter(v => v !== value)
      : [...currentValues, value];
    
    onFilterChange({ [filterType]: newValues });
  };

  const eventTypes = [
    { value: 'task', label: 'Tasks', color: 'bg-blue-500' },
    { value: 'project', label: 'Projects', color: 'bg-purple-500' },
    { value: 'meeting', label: 'Meetings', color: 'bg-cyan-500' },
    { value: 'deadline', label: 'Deadlines', color: 'bg-red-500' },
    { value: 'milestone', label: 'Milestones', color: 'bg-green-500' },
    { value: 'personal', label: 'Personal', color: 'bg-pink-500' }
  ];

  const priorities = [
    { value: 'critical', label: 'Critical', color: 'bg-red-500' },
    { value: 'high', label: 'High', color: 'bg-orange-500' },
    { value: 'medium', label: 'Medium', color: 'bg-yellow-500' },
    { value: 'low', label: 'Low', color: 'bg-green-500' }
  ];

  const statuses = [
    { value: 'scheduled', label: 'Scheduled', color: 'bg-gray-500' },
    { value: 'in-progress', label: 'In Progress', color: 'bg-blue-500' },
    { value: 'completed', label: 'Completed', color: 'bg-green-500' },
    { value: 'cancelled', label: 'Cancelled', color: 'bg-red-500' }
  ];

  if (collapsed) {
    return (
      <div className="w-16 bg-white border-r border-gray-200 flex flex-col items-center py-4">
        <button
          onClick={onToggle}
          aria-label="Expand sidebar"
          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
        
        <button
          onClick={onCreateEvent}
          className="mt-4 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          title="Create Event"
        >
          <Plus className="w-5 h-5" />
        </button>
        
        <div className="mt-4 space-y-2">
          <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
            <Calendar className="w-4 h-4 text-gray-600" />
          </div>
          <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
            <BarChart3 className="w-4 h-4 text-gray-600" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Calendar</h2>
          <button
            onClick={onToggle}
            aria-label="Collapse sidebar"
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>

        {/* Create Event Button */}
        <button
          onClick={onCreateEvent}
          className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Event
        </button>
      </div>

      {/* Search */}
      <div className="p-4 border-b border-gray-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search events..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Statistics */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-900">Overview</h3>
          <BarChart3 className="w-4 h-4 text-gray-600" />
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center p-2 bg-gray-50 rounded-lg">
            <div className="text-lg font-semibold text-gray-900">{statistics.totalEvents}</div>
            <div className="text-xs text-gray-600">Total Events</div>
          </div>
          <div className="text-center p-2 bg-blue-50 rounded-lg">
            <div className="text-lg font-semibold text-blue-600">{statistics.upcomingEvents}</div>
            <div className="text-xs text-gray-600">Upcoming</div>
          </div>
          <div className="text-center p-2 bg-green-50 rounded-lg">
            <div className="text-lg font-semibold text-green-600">
              {statistics.eventsByStatus.completed || 0}
            </div>
            <div className="text-xs text-gray-600">Completed</div>
          </div>
          <div className="text-center p-2 bg-red-50 rounded-lg">
            <div className="text-lg font-semibold text-red-600">{statistics.overdueEvents}</div>
            <div className="text-xs text-gray-600">Overdue</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex-1 overflow-auto">
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-900">Filters</h3>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="p-1 text-gray-600 hover:text-gray-900"
              >
                <Filter className="w-4 h-4" />
              </button>
              {(filter.types.length > 0 || filter.priorities.length > 0 || filter.statuses.length > 0) && (
                <button
                  onClick={onClearFilter}
                  className="text-xs text-blue-600 hover:text-blue-700"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {showFilters && (
            <div className="space-y-4">
              {/* Event Types */}
              <div>
                <h4 className="text-xs font-medium text-gray-700 mb-2">Event Types</h4>
                <div className="space-y-1">
                  {eventTypes.map(type => (
                    <label key={type.value} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={filter.types.includes(type.value)}
                        onChange={() => toggleFilter('types', type.value)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div className={`w-3 h-3 rounded-full ml-2 mr-2 ${type.color}`} />
                      <span className="text-sm text-gray-700">{type.label}</span>
                      <span className="ml-auto text-xs text-gray-500">
                        {statistics.eventsByType[type.value] || 0}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Priorities */}
              <div>
                <h4 className="text-xs font-medium text-gray-700 mb-2">Priority</h4>
                <div className="space-y-1">
                  {priorities.map(priority => (
                    <label key={priority.value} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={filter.priorities.includes(priority.value)}
                        onChange={() => toggleFilter('priorities', priority.value)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div className={`w-3 h-3 rounded-full ml-2 mr-2 ${priority.color}`} />
                      <span className="text-sm text-gray-700">{priority.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Status */}
              <div>
                <h4 className="text-xs font-medium text-gray-700 mb-2">Status</h4>
                <div className="space-y-1">
                  {statuses.map(status => (
                    <label key={status.value} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={filter.statuses.includes(status.value)}
                        onChange={() => toggleFilter('statuses', status.value)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div className={`w-3 h-3 rounded-full ml-2 mr-2 ${status.color}`} />
                      <span className="text-sm text-gray-700">{status.label}</span>
                      <span className="ml-auto text-xs text-gray-500">
                        {statistics.eventsByStatus[status.value] || 0}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <button className="flex items-center text-sm text-gray-600 hover:text-gray-900">
          <Settings className="w-4 h-4 mr-2" />
          Calendar Settings
        </button>
      </div>
    </div>
  );
}