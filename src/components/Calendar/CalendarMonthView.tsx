import React, { useMemo } from 'react';
import { CalendarEvent, CalendarView } from '../../types/calendar';
import { CalendarEventCard } from './CalendarEventCard';

interface CalendarMonthViewProps {
  events: CalendarEvent[];
  view: CalendarView;
  onEventClick: (event: CalendarEvent) => void;
  onDateClick: (date: Date) => void;
  onEventDrop: (event: CalendarEvent, newStart: Date, newEnd: Date) => void;
  getEventsForDate: (date: Date) => CalendarEvent[];
  isToday: (date: Date) => boolean;
  isCurrentMonth: (date: Date) => boolean;
}

export function CalendarMonthView({
  events,
  view,
  onEventClick,
  onDateClick,
  onEventDrop,
  getEventsForDate,
  isToday,
  isCurrentMonth
}: CalendarMonthViewProps) {
  const monthDays = useMemo(() => {
    const { date } = view;
    const year = date.getFullYear();
    const month = date.getMonth();
    
    // Get first day of month and adjust to start on Sunday
    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - startDate.getDay());
    
    // Generate 42 days (6 weeks)
    const days: Date[] = [];
    for (let i = 0; i < 42; i++) {
      const day = new Date(startDate);
      day.setDate(startDate.getDate() + i);
      days.push(day);
    }
    
    return days;
  }, [view.date]);

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const handleDragStart = (e: React.DragEvent, event: CalendarEvent) => {
    e.dataTransfer.setData('application/json', JSON.stringify(event));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, date: Date) => {
    e.preventDefault();
    try {
      const eventData = JSON.parse(e.dataTransfer.getData('application/json'));
      const event = events.find(ev => ev.id === eventData.id);
      
      if (event) {
        const newStart = new Date(date);
        const originalStart = new Date(event.startDate);
        const originalEnd = new Date(event.endDate);
        const duration = originalEnd.getTime() - originalStart.getTime();
        
        // Preserve time of day
        newStart.setHours(originalStart.getHours(), originalStart.getMinutes());
        const newEnd = new Date(newStart.getTime() + duration);
        
        onEventDrop(event, newStart, newEnd);
      }
    } catch (error) {
      console.error('Error handling event drop:', error);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Week day headers */}
      <div className="grid grid-cols-7 border-b border-gray-200">
        {weekDays.map(day => (
          <div key={day} className="p-3 text-center text-sm font-medium text-gray-700 bg-gray-50">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="flex-1 grid grid-cols-7 grid-rows-6">
        {monthDays.map((date, index) => {
          const dayEvents = getEventsForDate(date);
          const isCurrentMonthDay = isCurrentMonth(date);
          const isTodayDate = isToday(date);
          
          return (
            <div
              key={index}
              className={`border-r border-b border-gray-200 p-2 min-h-[120px] cursor-pointer hover:bg-gray-50 transition-colors ${
                !isCurrentMonthDay ? 'bg-gray-50 text-gray-400' : 'bg-white'
              }`}
              onClick={() => onDateClick(date)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, date)}
            >
              {/* Date number */}
              <div className="flex items-center justify-between mb-1">
                <span className={`text-sm font-medium ${
                  isTodayDate 
                    ? 'bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center' 
                    : isCurrentMonthDay 
                      ? 'text-gray-900' 
                      : 'text-gray-400'
                }`}>
                  {date.getDate()}
                </span>
                
                {dayEvents.length > 3 && (
                  <span className="text-xs text-gray-500">
                    +{dayEvents.length - 3}
                  </span>
                )}
              </div>

              {/* Events */}
              <div className="space-y-1">
                {dayEvents.slice(0, 3).map(event => (
                  <CalendarEventCard
                    key={event.id}
                    event={event}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick(event);
                    }}
                    onDragStart={(e) => handleDragStart(e, event)}
                    compact
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}