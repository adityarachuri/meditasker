import { render, screen, fireEvent } from '@testing-library/react';
import { CalendarDayView } from '../CalendarDayView';
import { CalendarEvent, CalendarView } from '../../../types/calendar';

const makeEvent = (overrides: Partial<CalendarEvent> = {}): CalendarEvent => ({
  id: 'e1',
  title: 'Daily sync',
  startDate: '2024-06-10T09:00:00',
  endDate: '2024-06-10T09:30:00',
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

describe('CalendarDayView', () => {
  const view: CalendarView = { type: 'day', date: new Date('2024-06-10') };
  const timedEvent = makeEvent();
  const allDayEvent = makeEvent({ id: 'e2', title: 'Holiday', allDay: true });

  const baseProps = {
    events: [timedEvent, allDayEvent],
    view,
    onEventClick: jest.fn(),
    onDateClick: jest.fn(),
    onEventDrop: jest.fn(),
    isToday: jest.fn().mockReturnValue(false),
    isCurrentMonth: jest.fn().mockReturnValue(true),
  };

  beforeEach(() => jest.clearAllMocks());

  it('shows the formatted date and an event count', () => {
    render(<CalendarDayView {...baseProps} getEventsForDate={() => [timedEvent, allDayEvent]} />);
    expect(screen.getByText('2 events')).toBeInTheDocument();
  });

  it('uses singular "event" for exactly one', () => {
    render(<CalendarDayView {...baseProps} getEventsForDate={() => [timedEvent]} />);
    expect(screen.getByText('1 event')).toBeInTheDocument();
  });

  it('does not render an All Day section when there are no all-day events', () => {
    render(<CalendarDayView {...baseProps} getEventsForDate={() => [timedEvent]} />);
    expect(screen.queryByText('All Day')).not.toBeInTheDocument();
  });

  it('renders all-day events in their own section and wires up click/drag', () => {
    render(<CalendarDayView {...baseProps} getEventsForDate={() => [allDayEvent]} />);
    expect(screen.getByText('All Day')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Holiday' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('heading', { name: 'Holiday' }));
    expect(baseProps.onEventClick).toHaveBeenCalledWith(allDayEvent);

    const dataTransfer = { getData: () => '', setData: jest.fn(), effectAllowed: '', dropEffect: '' };
    fireEvent.dragStart(screen.getByRole('heading', { name: 'Holiday' }), { dataTransfer });
    expect(dataTransfer.setData).toHaveBeenCalledWith('application/json', JSON.stringify(allDayEvent));
  });

  it('positions and renders a timed event, calling onEventClick when clicked', () => {
    render(<CalendarDayView {...baseProps} getEventsForDate={() => [timedEvent]} />);
    fireEvent.click(screen.getByText('Daily sync'));
    expect(baseProps.onEventClick).toHaveBeenCalledWith(timedEvent);
  });

  it('calls onDateClick with the slot time when a half-hour slot is clicked', () => {
    render(<CalendarDayView {...baseProps} getEventsForDate={() => []} />);
    const slots = document.querySelectorAll('.col-span-10 > .h-8');
    fireEvent.click(slots[0]);
    expect(baseProps.onDateClick).toHaveBeenCalled();
  });

  it('shows the current-time indicator on today\'s nearest slot', () => {
    jest.useFakeTimers().setSystemTime(new Date('2024-06-10T09:05:00'));
    render(<CalendarDayView {...baseProps} getEventsForDate={() => []} isToday={() => true} />);
    expect(document.querySelector('.bg-red-500')).toBeInTheDocument();
    jest.useRealTimers();
  });

  it('omits the current-time indicator on a day that is not today', () => {
    render(<CalendarDayView {...baseProps} getEventsForDate={() => []} isToday={() => false} />);
    expect(document.querySelector('.bg-red-500')).not.toBeInTheDocument();
  });

  it('handles a full drag-and-drop cycle on a half-hour slot', () => {
    render(<CalendarDayView {...baseProps} getEventsForDate={() => [timedEvent]} />);

    const dataTransfer = { getData: () => JSON.stringify(timedEvent), setData: jest.fn(), effectAllowed: '', dropEffect: '' };
    fireEvent.dragStart(screen.getByText('Daily sync'), { dataTransfer });

    const slots = document.querySelectorAll('.col-span-10 > .h-8');
    fireEvent.dragOver(slots[0], { dataTransfer });
    fireEvent.drop(slots[0], { dataTransfer });

    expect(baseProps.onEventDrop).toHaveBeenCalledWith(timedEvent, expect.any(Date), expect.any(Date));
  });

  it('swallows a drop with malformed JSON instead of throwing', () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    render(<CalendarDayView {...baseProps} getEventsForDate={() => []} />);

    const slots = document.querySelectorAll('.col-span-10 > .h-8');
    fireEvent.drop(slots[0], { dataTransfer: { getData: () => 'not json' } });

    expect(consoleErrorSpy).toHaveBeenCalledWith('Error handling event drop:', expect.anything());
    consoleErrorSpy.mockRestore();
  });

  it('does not call onEventDrop when the dropped event id has no match', () => {
    render(<CalendarDayView {...baseProps} getEventsForDate={() => []} />);
    const slots = document.querySelectorAll('.col-span-10 > .h-8');
    fireEvent.drop(slots[0], { dataTransfer: { getData: () => JSON.stringify({ id: 'missing' }) } });
    expect(baseProps.onEventDrop).not.toHaveBeenCalled();
  });
});
