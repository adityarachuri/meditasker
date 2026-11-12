import { render, screen, fireEvent } from '@testing-library/react';
import { CalendarAgendaView } from '../CalendarAgendaView';
import { CalendarEvent, CalendarView } from '../../../types/calendar';

const makeEvent = (overrides: Partial<CalendarEvent> = {}): CalendarEvent => ({
  id: 'e1',
  title: 'Planning session',
  startDate: '2024-06-10T09:00:00',
  endDate: '2024-06-10T09:45:00',
  allDay: false,
  type: 'meeting',
  priority: 'medium',
  status: 'scheduled',
  color: '#3b82f6',
  createdBy: 'user1',
  createdAt: '2024-06-01T00:00:00.000Z',
  updatedAt: '2024-06-01T00:00:00.000Z',
  ...overrides,
});

describe('CalendarAgendaView', () => {
  const view: CalendarView = { type: 'agenda', date: new Date('2024-06-10') };
  const timedEvent = makeEvent();
  const longEvent = makeEvent({ id: 'e2', title: 'Workshop', startDate: '2024-06-10T09:00:00', endDate: '2024-06-10T10:30:00' });
  const allDayEvent = makeEvent({ id: 'e3', title: 'Holiday', allDay: true });

  const baseProps = {
    view,
    onEventClick: jest.fn(),
    onDateClick: jest.fn(),
    onEventDrop: jest.fn(),
    isToday: jest.fn().mockReturnValue(false),
    isCurrentMonth: jest.fn().mockReturnValue(true),
  };

  beforeEach(() => jest.clearAllMocks());

  it('shows "No events scheduled" when nothing qualifies for any of the first 7 days', () => {
    render(<CalendarAgendaView {...baseProps} events={[]} getEventsForDate={() => []} />);
    expect(screen.getAllByText('No events scheduled').length).toBeGreaterThan(0);
  });

  it('shows the total event count in the header', () => {
    render(<CalendarAgendaView {...baseProps} events={[timedEvent, allDayEvent]} getEventsForDate={() => []} />);
    expect(screen.getByText('2 events in next 30 days')).toBeInTheDocument();
  });

  it('uses singular "event" for exactly one in the header', () => {
    render(<CalendarAgendaView {...baseProps} events={[timedEvent]} getEventsForDate={() => []} />);
    expect(screen.getByText('1 event in next 30 days')).toBeInTheDocument();
  });

  it('groups and renders all-day and timed events for a day with events', () => {
    render(
      <CalendarAgendaView
        {...baseProps}
        events={[timedEvent, allDayEvent]}
        getEventsForDate={(d) => (d.toDateString() === new Date('2024-06-10').toDateString() ? [timedEvent, allDayEvent] : [])}
      />
    );
    expect(screen.getByText('Planning session')).toBeInTheDocument();
    expect(screen.getByText('Holiday')).toBeInTheDocument();
  });

  it('shows a short duration in minutes for a sub-hour event', () => {
    render(
      <CalendarAgendaView
        {...baseProps}
        events={[timedEvent]}
        getEventsForDate={(d) => (d.toDateString() === new Date('2024-06-10').toDateString() ? [timedEvent] : [])}
      />
    );
    expect(screen.getByText('45m')).toBeInTheDocument();
  });

  it('shows an hours-only duration for an exact-hour-multiple event', () => {
    const hourEvent = makeEvent({ startDate: '2024-06-10T09:00:00', endDate: '2024-06-10T11:00:00' });
    render(
      <CalendarAgendaView
        {...baseProps}
        events={[hourEvent]}
        getEventsForDate={(d) => (d.toDateString() === new Date('2024-06-10').toDateString() ? [hourEvent] : [])}
      />
    );
    expect(screen.getByText('2h')).toBeInTheDocument();
  });

  it('shows an hours-and-minutes duration for a mixed-length event', () => {
    render(
      <CalendarAgendaView
        {...baseProps}
        events={[longEvent]}
        getEventsForDate={(d) => (d.toDateString() === new Date('2024-06-10').toDateString() ? [longEvent] : [])}
      />
    );
    expect(screen.getByText('1h 30m')).toBeInTheDocument();
  });

  it('shows no duration label for an all-day event', () => {
    render(
      <CalendarAgendaView
        {...baseProps}
        events={[allDayEvent]}
        getEventsForDate={(d) => (d.toDateString() === new Date('2024-06-10').toDateString() ? [allDayEvent] : [])}
      />
    );
    // "All day" appears both as the agenda's own time-column label and inside
    // CalendarEventCard's own (detailed) time row - just confirm both show up
    // and that no numeric duration ("Xm"/"Xh") is rendered alongside them.
    expect(screen.getAllByText('All day').length).toBe(2);
    expect(screen.queryByText(/^\d+[hm]/)).not.toBeInTheDocument();
  });

  it('calls onDateClick and onEventClick', () => {
    render(
      <CalendarAgendaView
        {...baseProps}
        events={[timedEvent]}
        getEventsForDate={(d) => (d.toDateString() === new Date('2024-06-10').toDateString() ? [timedEvent] : [])}
      />
    );

    fireEvent.click(screen.getByText('Planning session'));
    expect(baseProps.onEventClick).toHaveBeenCalledWith(timedEvent);

    fireEvent.click(screen.getByText('Planning session').closest('div.p-4')!.querySelector('.cursor-pointer.hover\\:text-blue-600')!);
    expect(baseProps.onDateClick).toHaveBeenCalled();
  });

  it('calls onEventClick for an all-day event card', () => {
    render(
      <CalendarAgendaView
        {...baseProps}
        events={[allDayEvent]}
        getEventsForDate={(d) => (d.toDateString() === new Date('2024-06-10').toDateString() ? [allDayEvent] : [])}
      />
    );
    fireEvent.click(screen.getByRole('heading', { name: 'Holiday' }));
    expect(baseProps.onEventClick).toHaveBeenCalledWith(allDayEvent);
  });

  it('marks today with a "Today" badge', () => {
    render(
      <CalendarAgendaView
        {...baseProps}
        events={[]}
        getEventsForDate={() => []}
        isToday={(d) => d.toDateString() === new Date('2024-06-10').toDateString()}
      />
    );
    expect(screen.getByText('Today')).toBeInTheDocument();
  });

  it('shows the year in a day header when it differs from the current year', () => {
    const futureView: CalendarView = { type: 'agenda', date: new Date('2030-01-01') };
    render(<CalendarAgendaView {...baseProps} view={futureView} events={[]} getEventsForDate={() => []} />);
    expect(screen.getAllByText(/2030/).length).toBeGreaterThan(0);
  });
});
