import React from 'react';
import { CalendarEvent } from '../../types/calendar';
import { Clock, MapPin, Users, AlertCircle } from 'lucide-react';

interface CalendarEventCardProps {
  event: CalendarEvent;
  onClick?: (event: React.MouseEvent) => void;
  onDragStart?: (event: React.DragEvent) => void;
  compact?: boolean;
  detailed?: boolean;
  showTime?: boolean;
  className?: string;
}

export function CalendarEventCard({
  event,
  onClick,
  onDragStart,
  compact = false,
  detailed = false,
  showTime = false,
  className = ''
}: CalendarEventCardProps) {
  const getStatusIcon = () => {
    switch (event.status) {
      case 'completed':
        return '✓';
      case 'cancelled':
        return '✗';
      case 'in-progress':
        return '⏳';
      default:
        return null;
    }
  };

  const getPriorityColor = () => {
    switch (event.priority) {
      case 'critical':
        return 'border-l-red-500';
      case 'high':
        return 'border-l-orange-500';
      case 'medium':
        return 'border-l-yellow-500';
      case 'low':
        return 'border-l-green-500';
      default:
        return 'border-l-gray-500';
    }
  };

  const getTypeIcon = () => {
    switch (event.type) {
      case 'meeting':
        return '👥';
      case 'deadline':
        return '⏰';
      case 'milestone':
        return '🎯';
      case 'task':
        return '📋';
      case 'project':
        return '📁';
      case 'personal':
        return '👤';
      default:
        return '📅';
    }
  };

  const formatTime = () => {
    if (event.allDay) return 'All day';
    
    const start = new Date(event.startDate);
    const end = new Date(event.endDate);
    
    const startTime = start.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
    
    if (start.toDateString() === end.toDateString()) {
      const endTime = end.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
      return `${startTime} - ${endTime}`;
    }
    
    return startTime;
  };

  if (compact) {
    return (
      <div
        className={`text-xs p-1 rounded truncate cursor-pointer border-l-2 ${getPriorityColor()} ${className}`}
        style={{ backgroundColor: event.color + '20', color: event.color }}
        onClick={onClick}
        onDragStart={onDragStart}
        draggable={!!onDragStart}
        title={`${event.title}${event.description ? ` - ${event.description}` : ''}`}
      >
        <span className="mr-1">{getTypeIcon()}</span>
        {event.title}
        {getStatusIcon() && (
          <span className="ml-1">{getStatusIcon()}</span>
        )}
      </div>
    );
  }

  return (
    <div
      className={`bg-white border rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer border-l-4 ${getPriorityColor()} ${className}`}
      onClick={onClick}
      onDragStart={onDragStart}
      draggable={!!onDragStart}
    >
      <div className="p-3">
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center space-x-2">
            <span className="text-lg">{getTypeIcon()}</span>
            <h3 className={`font-medium text-gray-900 ${detailed ? 'text-base' : 'text-sm'}`}>
              {event.title}
            </h3>
            {getStatusIcon() && (
              <span className="text-sm">{getStatusIcon()}</span>
            )}
          </div>
          
          {event.priority === 'critical' && (
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
          )}
        </div>

        {/* Time */}
        {(showTime || detailed) && (
          <div className="flex items-center text-sm text-gray-600 mb-2">
            <Clock className="w-4 h-4 mr-1" />
            {formatTime()}
          </div>
        )}

        {/* Description */}
        {detailed && event.description && (
          <p className="text-sm text-gray-600 mb-2 line-clamp-2">
            {event.description}
          </p>
        )}

        {/* Location */}
        {detailed && event.location && (
          <div className="flex items-center text-sm text-gray-600 mb-2">
            <MapPin className="w-4 h-4 mr-1" />
            {event.location}
          </div>
        )}

        {/* Attendees */}
        {detailed && event.attendees && event.attendees.length > 0 && (
          <div className="flex items-center text-sm text-gray-600">
            <Users className="w-4 h-4 mr-1" />
            {event.attendees.length} attendee{event.attendees.length !== 1 ? 's' : ''}
          </div>
        )}

        {/* Priority badge */}
        {detailed && (
          <div className="mt-2 flex items-center justify-between">
            <span className={`px-2 py-1 text-xs rounded-full ${
              event.priority === 'critical' ? 'bg-red-100 text-red-800' :
              event.priority === 'high' ? 'bg-orange-100 text-orange-800' :
              event.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
              'bg-green-100 text-green-800'
            }`}>
              {event.priority.charAt(0).toUpperCase() + event.priority.slice(1)}
            </span>
            
            <span className={`px-2 py-1 text-xs rounded-full ${
              event.status === 'completed' ? 'bg-green-100 text-green-800' :
              event.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
              event.status === 'cancelled' ? 'bg-red-100 text-red-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}