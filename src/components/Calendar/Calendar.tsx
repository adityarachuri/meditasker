import { useState } from 'react';
import { useCalendar } from '../../hooks/useCalendar';
import { CalendarHeader } from './CalendarHeader';
import { CalendarMonthView } from './CalendarMonthView';
import { CalendarWeekView } from './CalendarWeekView';
import { CalendarDayView } from './CalendarDayView';
import { CalendarAgendaView } from './CalendarAgendaView';
import { CalendarSidebar } from './CalendarSidebar';
import { EventModal } from './EventModal';
import { CalendarEvent } from '../../types/calendar';

export function Calendar() {
  const {
    view,
    events,
    loading,
    error,
    filter,
    statistics,
    navigateToDate,
    navigatePrevious,
    navigateNext,
    navigateToday,
    changeViewType,
    createEvent,
    updateEvent,
    deleteEvent,
    searchEvents,
    getEventsForDate,
    updateFilter,
    clearFilter,
    isToday,
    isCurrentMonth
  } = useCalendar();

  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setShowEventModal(true);
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setSelectedEvent(null);
    setShowEventModal(true);
  };

  const handleEventCreate = async (eventData: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newEvent = createEvent(eventData);
    if (newEvent) {
      setShowEventModal(false);
      setSelectedEvent(null);
      setSelectedDate(null);
    }
    return newEvent;
  };

  const handleEventUpdate = async (id: string, updates: Partial<CalendarEvent>) => {
    const updatedEvent = updateEvent(id, updates);
    if (updatedEvent) {
      setShowEventModal(false);
      setSelectedEvent(null);
    }
    return updatedEvent;
  };

  const handleEventDelete = async (id: string) => {
    const success = deleteEvent(id);
    if (success) {
      setShowEventModal(false);
      setSelectedEvent(null);
    }
    return success;
  };

  const handleEventDrop = (event: CalendarEvent, newStart: Date, newEnd: Date) => {
    updateEvent(event.id, {
      startDate: newStart.toISOString(),
      endDate: newEnd.toISOString()
    });
  };

  const renderCalendarView = () => {
    const commonProps = {
      events,
      view,
      onEventClick: handleEventClick,
      onDateClick: handleDateClick,
      onEventDrop: handleEventDrop,
      getEventsForDate,
      isToday,
      isCurrentMonth
    };

    switch (view.type) {
      case 'month':
        return <CalendarMonthView {...commonProps} />;
      case 'week':
        return <CalendarWeekView {...commonProps} />;
      case 'day':
        return <CalendarDayView {...commonProps} />;
      case 'agenda':
        return <CalendarAgendaView {...commonProps} />;
      default:
        return <CalendarMonthView {...commonProps} />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div
          role="status"
          aria-label="Loading calendar"
          className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"
        ></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="text-red-600 mb-2">Error loading calendar</div>
          <div className="text-gray-600">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-white">
      {/* Sidebar */}
      <CalendarSidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        filter={filter}
        onFilterChange={updateFilter}
        onClearFilter={clearFilter}
        statistics={statistics}
        onSearch={searchEvents}
        onCreateEvent={() => {
          setSelectedEvent(null);
          setSelectedDate(new Date());
          setShowEventModal(true);
        }}
      />

      {/* Main calendar area */}
      <div className="flex-1 flex flex-col">
        <CalendarHeader
          view={view}
          onViewTypeChange={changeViewType}
          onNavigatePrevious={navigatePrevious}
          onNavigateNext={navigateNext}
          onNavigateToday={navigateToday}
          onNavigateToDate={navigateToDate}
        />

        <div className="flex-1 overflow-hidden">
          {renderCalendarView()}
        </div>
      </div>

      {/* Event Modal */}
      {showEventModal && (
        <EventModal
          event={selectedEvent}
          defaultDate={selectedDate}
          onSave={selectedEvent ? handleEventUpdate : handleEventCreate}
          onDelete={selectedEvent ? handleEventDelete : undefined}
          onClose={() => {
            setShowEventModal(false);
            setSelectedEvent(null);
            setSelectedDate(null);
          }}
        />
      )}
      
    </div>
  );
}