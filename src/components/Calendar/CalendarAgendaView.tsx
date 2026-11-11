import { useMemo } from 'react';
import { CalendarEvent, CalendarView } from '../../types/calendar';
import { CalendarEventCard } from './CalendarEventCard';
import { Calendar, Clock } from 'lucide-react';

interface CalendarAgendaViewProps {
  events: CalendarEvent[];
  view: CalendarView;
  onEventClick: (event: CalendarEvent) => void;
  onDateClick: (date: Date) => void;
  onEventDrop: (event: CalendarEvent, newStart: Date, newEnd: Date) => void;
  getEventsForDate: (date: Date) => CalendarEvent[];
  isToday: (date: Date) => boolean;
  isCurrentMonth: (date: Date) => boolean;
}

export function CalendarAgendaView({
  events,
  view,
  onEventClick,
  onDateClick,
  getEventsForDate,
  isToday
}: CalendarAgendaViewProps) {
  const agendaDays = useMemo(() => {
    const { date } = view;
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    
    const days: { date: Date; events: CalendarEvent[] }[] = [];
    
    // Show next 30 days
    for (let i = 0; i < 30; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      
      const dayEvents = getEventsForDate(currentDate);
      if (dayEvents.length > 0 || i < 7) { // Always show first week
        days.push({
          date: currentDate,
          events: dayEvents
        });
      }
    }
    
    return days;
  }, [view, getEventsForDate]);

  const groupEventsByTime = (events: CalendarEvent[]) => {
    const allDay = events.filter(event => event.allDay);
    const timed = events.filter(event => !event.allDay);
    
    // Sort timed events by start time
    timed.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
    
    return { allDay, timed };
  };

  const getEventDuration = (event: CalendarEvent) => {
    if (event.allDay) return null;
    
    const start = new Date(event.startDate);
    const end = new Date(event.endDate);
    const durationMs = end.getTime() - start.getTime();
    const durationMinutes = Math.round(durationMs / (1000 * 60));
    
    if (durationMinutes < 60) {
      return `${durationMinutes}m`;
    } else {
      const hours = Math.floor(durationMinutes / 60);
      const minutes = durationMinutes % 60;
      return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Agenda</h2>
          <div className="text-sm text-gray-600">
            {events.length} event{events.length !== 1 ? 's' : ''} in next 30 days
          </div>
        </div>
      </div>

      {/* Agenda list */}
      <div className="flex-1 overflow-auto">
        {agendaDays.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <Calendar className="w-12 h-12 mb-4" />
            <p>No events scheduled</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {agendaDays.map(({ date, events: dayEvents }, index) => {
              const { allDay, timed } = groupEventsByTime(dayEvents);
              const isTodayDate = isToday(date);
              
              return (
                <div key={index} className="p-4">
                  {/* Date header */}
                  <div 
                    className="flex items-center mb-3 cursor-pointer hover:text-blue-600"
                    onClick={() => onDateClick(date)}
                  >
                    <div className={`flex items-center ${
                      isTodayDate ? 'text-blue-600 font-semibold' : 'text-gray-900'
                    }`}>
                      <Calendar className="w-4 h-4 mr-2" />
                      <span className="text-lg">
                        {date.toLocaleDateString('en-US', { 
                          weekday: 'long', 
                          month: 'long', 
                          day: 'numeric',
                          year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
                        })}
                      </span>
                      {isTodayDate && (
                        <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                          Today
                        </span>
                      )}
                    </div>
                    <div className="ml-auto text-sm text-gray-500">
                      {dayEvents.length} event{dayEvents.length !== 1 ? 's' : ''}
                    </div>
                  </div>

                  {/* Events */}
                  {dayEvents.length === 0 ? (
                    <div className="text-gray-500 text-sm italic ml-6">
                      No events scheduled
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* All-day events */}
                      {allDay.map(event => (
                        <div key={event.id} className="flex items-start space-x-3">
                          <div className="flex-shrink-0 w-20 text-sm text-gray-500 pt-1">
                            All day
                          </div>
                          <div className="flex-1">
                            <CalendarEventCard
                              event={event}
                              onClick={() => onEventClick(event)}
                              detailed
                              className="cursor-pointer hover:shadow-md transition-shadow"
                            />
                          </div>
                        </div>
                      ))}

                      {/* Timed events */}
                      {timed.map(event => {
                        const duration = getEventDuration(event);
                        return (
                          <div key={event.id} className="flex items-start space-x-3">
                            <div className="flex-shrink-0 w-20 text-sm text-gray-500 pt-1">
                              <div className="flex items-center">
                                <Clock className="w-3 h-3 mr-1" />
                                {new Date(event.startDate).toLocaleTimeString('en-US', { 
                                  hour: 'numeric', 
                                  minute: '2-digit',
                                  hour12: true 
                                })}
                              </div>
                              {duration && (
                                <div className="text-xs text-gray-400 mt-1">
                                  {duration}
                                </div>
                              )}
                            </div>
                            <div className="flex-1">
                              <CalendarEventCard
                                event={event}
                                onClick={() => onEventClick(event)}
                                detailed
                                showTime={false} // Time is shown separately
                                className="cursor-pointer hover:shadow-md transition-shadow"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}