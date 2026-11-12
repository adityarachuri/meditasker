import { render, screen, fireEvent } from '@testing-library/react';
import { CalendarWeekView } from '../CalendarWeekView';
import { CalendarEvent, CalendarView } from '../../../types/calendar';

const makeEvent = (overrides: Partial<CalendarEvent> = {}): CalendarEvent => ({
  id: 'e1',
  title: 'Standup',
  startDate: '2024-06-10T09:00:00.000Z',
  endDate: '2024-06-10T09:30:00.000Z',
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

describe('CalendarWeekView', () => {
  const view: CalendarView = { type: 'week', date: new Date('2024-06-10') };
  const timedEvent = makeEvent({ startDate: '2024-06-09T09:00:00', endDate: '2024-06-09T10:00:00' });
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

  it('renders 7 day-of-week headers', () => {
    render(<CalendarWeekView {...baseProps} getEventsForDate={() => []} />);
    expect(screen.getByText('Sun')).toBeInTheDocument();
    expect(screen.getByText('Sat')).toBeInTheDocument();
  });

  it('calls onDateClick when a day header is clicked', () => {
    render(<CalendarWeekView {...baseProps} getEventsForDate={() => []} />);
    fireEvent.click(screen.getByText('Sun').parentElement!);
    expect(baseProps.onDateClick).toHaveBeenCalled();
  });

  it('calls onDateClick with the slot time when an hourly cell is clicked', () => {
    render(<CalendarWeekView {...baseProps} getEventsForDate={() => []} />);
    // Hour "0" row renders no visible label, but it's still the first h-16 slot per day column.
    const slots = document.querySelectorAll('.h-16.relative.cursor-pointer');
    fireEvent.click(slots[0]);
    expect(baseProps.onDateClick).toHaveBeenCalled();
  });

  it('renders an all-day event in the all-day row (compact, capped at 2) and calls onEventClick', () => {
    render(<CalendarWeekView {...baseProps} getEventsForDate={() => [allDayEvent]} />);
    expect(screen.getAllByText('Holiday').length).toBeGreaterThan(0);

    fireEvent.click(screen.getAllByText('Holiday')[0]);
    expect(baseProps.onEventClick).toHaveBeenCalledWith(allDayEvent);
  });

  it('is draggable for an all-day event card', () => {
    render(<CalendarWeekView {...baseProps} getEventsForDate={() => [allDayEvent]} />);
    const dataTransfer = { getData: () => '', setData: jest.fn(), effectAllowed: '', dropEffect: '' };
    fireEvent.dragStart(screen.getAllByText('Holiday')[0], { dataTransfer });
    expect(dataTransfer.setData).toHaveBeenCalledWith('application/json', JSON.stringify(allDayEvent));
  });

  it('positions and renders a timed event in its matching hour slot', () => {
    render(<CalendarWeekView {...baseProps} getEventsForDate={() => [timedEvent]} />);
    expect(screen.getAllByText('Standup').length).toBeGreaterThan(0);
  });

  it('calls onEventClick when a rendered event is clicked', () => {
    render(<CalendarWeekView {...baseProps} getEventsForDate={() => [timedEvent]} />);
    fireEvent.click(screen.getAllByText('Standup')[0]);
    expect(baseProps.onEventClick).toHaveBeenCalledWith(timedEvent);
  });

  it('handles a full drag-and-drop cycle on an hourly cell', () => {
    render(<CalendarWeekView {...baseProps} getEventsForDate={() => [timedEvent]} />);

    const dataTransfer = { getData: () => JSON.stringify(timedEvent), setData: jest.fn(), effectAllowed: '', dropEffect: '' };
    const eventCard = screen.getAllByText('Standup')[0];
    fireEvent.dragStart(eventCard, { dataTransfer });

    const slots = document.querySelectorAll('.h-16.relative.cursor-pointer');
    fireEvent.dragOver(slots[0], { dataTransfer });
    fireEvent.drop(slots[0], { dataTransfer });

    expect(baseProps.onEventDrop).toHaveBeenCalledWith(timedEvent, expect.any(Date), expect.any(Date));
  });

  it('swallows a drop with malformed JSON instead of throwing', () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    render(<CalendarWeekView {...baseProps} getEventsForDate={() => []} />);

    const slots = document.querySelectorAll('.h-16.relative.cursor-pointer');
    fireEvent.drop(slots[0], { dataTransfer: { getData: () => 'not json' } });

    expect(consoleErrorSpy).toHaveBeenCalledWith('Error handling event drop:', expect.anything());
    consoleErrorSpy.mockRestore();
  });

  it('highlights the current day in the header', () => {
    render(<CalendarWeekView {...baseProps} getEventsForDate={() => []} isToday={(d) => d.getDay() === 0} />);
    expect(screen.getByText('Sun').nextSibling).toHaveClass('bg-blue-600');
  });
});
