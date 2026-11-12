import React, { useMemo } from 'react';
import { CalendarEvent, CalendarView } from '../../types/calendar';
import { CalendarEventCard } from './CalendarEventCard';

interface CalendarWeekViewProps {
  events: CalendarEvent[];
  view: CalendarView;
  onEventClick: (event: CalendarEvent) => void;
  onDateClick: (date: Date) => void;
  onEventDrop: (event: CalendarEvent, newStart: Date, newEnd: Date) => void;
  getEventsForDate: (date: Date) => CalendarEvent[];
  isToday: (date: Date) => boolean;
  isCurrentMonth: (date: Date) => boolean;
}

export function CalendarWeekView({
  events,
  view,
  onEventClick,
  onDateClick,
  onEventDrop,
  getEventsForDate,
  isToday
}: CalendarWeekViewProps) {
  const weekDays = useMemo(() => {
    const { date } = view;
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - date.getDay()); // Start on Sunday
    
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push(day);
    }
    
    return days;
  }, [view]);

  const timeSlots = useMemo(() => {
    const slots: string[] = [];
    for (let hour = 0; hour < 24; hour++) {
      const time = new Date();
      time.setHours(hour, 0, 0, 0);
      slots.push(time.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        hour12: true 
      }));
    }
    return slots;
  }, []);

  // Only ever called for events already filtered to `!event.allDay` (below).
  const getEventPosition = (event: CalendarEvent, date: Date) => {
    const eventStart = new Date(event.startDate);
    const eventEnd = new Date(event.endDate);

    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    
    const startMinutes = (eventStart.getTime() - dayStart.getTime()) / (1000 * 60);
    const durationMinutes = (eventEnd.getTime() - eventStart.getTime()) / (1000 * 60);
    
    const top = Math.max(0, (startMinutes / 60) * 60); // 60px per hour
    const height = Math.max(20, (durationMinutes / 60) * 60);
    
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

  const handleDrop = (e: React.DragEvent, date: Date, hour: number) => {
    e.preventDefault();
    try {
      const eventData = JSON.parse(e.dataTransfer.getData('application/json'));
      const event = events.find(ev => ev.id === eventData.id);
      
      if (event) {
        const newStart = new Date(date);
        newStart.setHours(hour, 0, 0, 0);
        
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

  const weekDayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="flex flex-col h-full">
      {/* Header with days */}
      <div className="grid grid-cols-8 border-b border-gray-200 bg-gray-50">
        <div className="p-3 border-r border-gray-200"></div>
        {weekDays.map((date, index) => {
          const isTodayDate = isToday(date);
          return (
            <div
              key={index}
              className="p-3 text-center border-r border-gray-200 cursor-pointer hover:bg-gray-100"
              onClick={() => onDateClick(date)}
            >
              <div className="text-sm font-medium text-gray-700">
                {weekDayNames[index]}
              </div>
              <div className={`text-lg font-semibold mt-1 ${
                isTodayDate 
                  ? 'bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center mx-auto' 
                  : 'text-gray-900'
              }`}>
                {date.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      {/* Time grid */}
      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-8">
          {/* Time column */}
          <div className="border-r border-gray-200">
            {timeSlots.map((time, hour) => (
              <div key={hour} className="h-16 p-2 border-b border-gray-100 text-xs text-gray-500">
                {hour > 0 && time}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {weekDays.map((date, dayIndex) => (
            <div key={dayIndex} className="border-r border-gray-200 relative">
              {/* All-day events */}
              <div className="h-12 border-b border-gray-200 bg-gray-50 p-1">
                {getEventsForDate(date)
                  .filter(event => event.allDay)
                  .slice(0, 2)
                  .map(event => (
                    <CalendarEventCard
                      key={event.id}
                      event={event}
                      onClick={() => onEventClick(event)}
                      onDragStart={(e) => handleDragStart(e, event)}
                      compact
                      className="mb-1"
                    />
                  ))}
              </div>

              {/* Hourly slots */}
              {timeSlots.map((_time, hour) => (
                <div
                  key={hour}
                  className="h-16 border-b border-gray-100 relative cursor-pointer hover:bg-blue-50"
                  onClick={() => {
                    const clickDate = new Date(date);
                    clickDate.setHours(hour, 0, 0, 0);
                    onDateClick(clickDate);
                  }}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, date, hour)}
                >
                  {/* Timed events */}
                  {getEventsForDate(date)
                    .filter(event => !event.allDay)
                    .filter(event => {
                      const eventStart = new Date(event.startDate);
                      return eventStart.getHours() === hour;
                    })
                    .map(event => {
                      const position = getEventPosition(event, date);
                      return (
                        <div
                          key={event.id}
                          className="absolute left-1 right-1 z-10"
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
                          />
                        </div>
                      );
                    })}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}