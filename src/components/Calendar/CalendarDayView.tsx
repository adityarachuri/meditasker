import React, { useMemo } from 'react';
import { CalendarEvent, CalendarView } from '../../types/calendar';
import { CalendarEventCard } from './CalendarEventCard';

interface CalendarDayViewProps {
  events: CalendarEvent[];
  view: CalendarView;
  onEventClick: (event: CalendarEvent) => void;
  onDateClick: (date: Date) => void;
  onEventDrop: (event: CalendarEvent, newStart: Date, newEnd: Date) => void;
  getEventsForDate: (date: Date) => CalendarEvent[];
  isToday: (date: Date) => boolean;
  isCurrentMonth: (date: Date) => boolean;
}

export function CalendarDayView({
  events,
  view,
  onEventClick,
  onDateClick,
  onEventDrop,
  getEventsForDate,
  isToday
}: CalendarDayViewProps) {
  const { date } = view;
  const dayEvents = getEventsForDate(date);

  const timeSlots = useMemo(() => {
    const slots: { time: string; hour: number; minute: number }[] = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time = new Date();
        time.setHours(hour, minute, 0, 0);
        slots.push({
          time: time.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true 
          }),
          hour,
          minute
        });
      }
    }
    return slots;
  }, []);

  const getEventPosition = (event: CalendarEvent) => {
    const eventStart = new Date(event.startDate);
    const eventEnd = new Date(event.endDate);
    
    if (event.allDay) {
      return { top: 0, height: 60 };
    }
    
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    
    const startMinutes = (eventStart.getTime() - dayStart.getTime()) / (1000 * 60);
    const durationMinutes = (eventEnd.getTime() - eventStart.getTime()) / (1000 * 60);
    
    const top = Math.max(0, (startMinutes / 30) * 30); // 30px per 30 minutes
    const height = Math.max(30, (durationMinutes / 30) * 30);
    
    return { top, height };
  };

  const handleDragStart = (e: React.DragEvent, event: CalendarEvent) => {
    e.dataTransfer.setData('application/json', JSON.stringify(event));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, hour: number, minute: number) => {
    e.preventDefault();
    try {
      const eventData = JSON.parse(e.dataTransfer.getData('application/json'));
      const event = events.find(ev => ev.id === eventData.id);
      
      if (event) {
        const newStart = new Date(date);
        newStart.setHours(hour, minute, 0, 0);
        
        const originalStart = new Date(event.startDate);
        const originalEnd = new Date(event.endDate);
        const duration = originalEnd.getTime() - originalStart.getTime();
        
        const newEnd = new Date(newStart.getTime() + duration);
        
        onEventDrop(event, newStart, newEnd);
      }
    } catch (error) {
      console.error('Error handling event drop:', error);
    }
  };

  const allDayEvents = dayEvents.filter(event => event.allDay);
  const timedEvents = dayEvents.filter(event => !event.allDay);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            {date.toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </h2>
          <div className="text-sm text-gray-600">
            {dayEvents.length} event{dayEvents.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* All-day events */}
      {allDayEvents.length > 0 && (
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <h3 className="text-sm font-medium text-gray-700 mb-2">All Day</h3>
          <div className="space-y-2">
            {allDayEvents.map(event => (
              <CalendarEventCard
                key={event.id}
                event={event}
                onClick={() => onEventClick(event)}
                onDragStart={(e) => handleDragStart(e, event)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Time grid */}
      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-12 gap-0">
          {/* Time column */}
          <div className="col-span-2 border-r border-gray-200">
            {timeSlots.map((slot, index) => (
              <div 
                key={index} 
                className="h-8 p-1 border-b border-gray-100 text-xs text-gray-500 flex items-center"
              >
                {slot.minute === 0 && slot.time}
              </div>
            ))}
          </div>

          {/* Event column */}
          <div className="col-span-10 relative">
            {timeSlots.map((slot, index) => (
              <div
                key={index}
                className="h-8 border-b border-gray-100 cursor-pointer hover:bg-blue-50 relative"
                onClick={() => {
                  const clickDate = new Date(date);
                  clickDate.setHours(slot.hour, slot.minute, 0, 0);
                  onDateClick(clickDate);
                }}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, slot.hour, slot.minute)}
              >
                {/* Current time indicator */}
                {isToday(date) && (() => {
                  const now = new Date();
                  const currentMinutes = now.getHours() * 60 + now.getMinutes();
                  const slotMinutes = slot.hour * 60 + slot.minute;
                  
                  if (Math.abs(currentMinutes - slotMinutes) < 15) {
                    return (
                      <div className="absolute left-0 right-0 h-0.5 bg-red-500 z-20" 
                           style={{ top: '50%' }}>
                        <div className="absolute left-0 w-2 h-2 bg-red-500 rounded-full -mt-1"></div>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
            ))}

            {/* Timed events */}
            {timedEvents.map(event => {
              const position = getEventPosition(event);
              return (
                <div
                  key={event.id}
                  className="absolute left-2 right-2 z-10"
                  style={{
                    top: `${position.top}px`,
                    height: `${position.height}px`
                  }}
                >
                  <CalendarEventCard
                    event={event}
                    onClick={() => onEventClick(event)}
                    onDragStart={(e) => handleDragStart(e, event)}
                    showTime
                    detailed
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}