import React from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Plus } from 'lucide-react';
import { CalendarView } from '../../types/calendar';

interface CalendarHeaderProps {
  view: CalendarView;
  onViewTypeChange: (type: CalendarView['type']) => void;
  onNavigatePrevious: () => void;
  onNavigateNext: () => void;
  onNavigateToday: () => void;
  onNavigateToDate: (date: Date) => void;
}

export function CalendarHeader({
  view,
  onViewTypeChange,
  onNavigatePrevious,
  onNavigateNext,
  onNavigateToday,
  onNavigateToDate
}: CalendarHeaderProps) {
  const formatTitle = () => {
    const { type, date } = view;
    const options: Intl.DateTimeFormatOptions = {};

    switch (type) {
      case 'day':
        return date.toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
      case 'week':
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        
        if (weekStart.getMonth() === weekEnd.getMonth()) {
          return `${weekStart.toLocaleDateString('en-US', { month: 'long' })} ${weekStart.getDate()}-${weekEnd.getDate()}, ${weekStart.getFullYear()}`;
        } else {
          return `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${weekStart.getFullYear()}`;
        }
      case 'month':
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
      case 'agenda':
        return `Agenda - ${date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
      default:
        return date.toLocaleDateString();
    }
  };

  const viewTypes: { type: CalendarView['type']; label: string }[] = [
    { type: 'month', label: 'Month' },
    { type: 'week', label: 'Week' },
    { type: 'day', label: 'Day' },
    { type: 'agenda', label: 'Agenda' }
  ];

  return (
    <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
      <div className="flex items-center space-x-4">
        {/* Navigation */}
        <div className="flex items-center space-x-2">
          <button
            onClick={onNavigatePrevious}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Previous"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <button
            onClick={onNavigateToday}
            className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Today
          </button>
          
          <button
            onClick={onNavigateNext}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Next"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Title */}
        <h1 className="text-xl font-semibold text-gray-900">
          {formatTitle()}
        </h1>
      </div>

      <div className="flex items-center space-x-4">
        {/* View Type Selector */}
        <div className="flex items-center bg-gray-100 rounded-lg p-1">
          {viewTypes.map(({ type, label }) => (
            <button
              key={type}
              onClick={() => onViewTypeChange(type)}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                view.type === type
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Date Picker */}
        <div className="relative">
          <input
            type="date"
            value={view.date.toISOString().split('T')[0]}
            onChange={(e) => onNavigateToDate(new Date(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>
    </div>
  );
}