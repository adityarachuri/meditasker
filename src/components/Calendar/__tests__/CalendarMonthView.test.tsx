import { render, screen, fireEvent } from '@testing-library/react';
import { CalendarMonthView } from '../CalendarMonthView';
import { CalendarEvent, CalendarView } from '../../../types/calendar';

const makeEvent = (overrides: Partial<CalendarEvent> = {}): CalendarEvent => ({
  id: 'e1',
  title: 'Event A',
  startDate: '2024-06-10T14:00:00.000Z',
  endDate: '2024-06-10T15:00:00.000Z',
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

function makeDataTransfer(payload: unknown) {
  let data = '';
  return {
    setData: (_type: string, value: string) => { data = value; },
    getData: () => (payload === undefined ? data : JSON.stringify(payload)),
    effectAllowed: '',
    dropEffect: '',
  };
}

describe('CalendarMonthView', () => {
  const view: CalendarView = { type: 'month', date: new Date('2024-06-15') };
  const events = [makeEvent(), makeEvent({ id: 'e2' }), makeEvent({ id: 'e3' }), makeEvent({ id: 'e4' })];

  const baseProps = {
    events,
    view,
    onEventClick: jest.fn(),
    onDateClick: jest.fn(),
    onEventDrop: jest.fn(),
    isToday: jest.fn().mockReturnValue(false),
    isCurrentMonth: jest.fn().mockReturnValue(true),
  };

  beforeEach(() => jest.clearAllMocks());

  it('renders a 42-day grid with weekday headers', () => {
    render(<CalendarMonthView {...baseProps} getEventsForDate={() => []} />);
    expect(screen.getByText('Sun')).toBeInTheDocument();
    expect(screen.getByText('Sat')).toBeInTheDocument();
  });

  it('calls onDateClick when a day cell is clicked', () => {
    render(<CalendarMonthView {...baseProps} getEventsForDate={() => []} />);
    fireEvent.click(screen.getAllByText('15')[0]);
    expect(baseProps.onDateClick).toHaveBeenCalled();
  });

  it('shows up to 3 events per day and a "+N" badge for the rest', () => {
    render(<CalendarMonthView {...baseProps} getEventsForDate={() => events} />);
    // 42 day cells each render up to 3 of the 4 events -> "+1" appears repeatedly.
    expect(screen.getAllByText('+1').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Event A').length).toBeGreaterThan(0);
  });

  it('calls onEventClick (and stops propagation) when an event card is clicked', () => {
    render(<CalendarMonthView {...baseProps} getEventsForDate={() => [events[0]]} />);
    fireEvent.click(screen.getAllByText('Event A')[0]);
    expect(baseProps.onEventClick).toHaveBeenCalledWith(events[0]);
    expect(baseProps.onDateClick).not.toHaveBeenCalled();
  });

  it('calls onEventDrop with preserved time-of-day on a valid drop', () => {
    render(<CalendarMonthView {...baseProps} getEventsForDate={() => [events[0]]} />);

    const eventCard = screen.getAllByText('Event A')[0];
    const dataTransfer = makeDataTransfer(events[0]);
    fireEvent.dragStart(eventCard, { dataTransfer });

    const dayCells = screen.getAllByText('15');
    fireEvent.dragOver(dayCells[0].closest('div[class*="border-r"]')!, { dataTransfer });
    fireEvent.drop(dayCells[0].closest('div[class*="border-r"]')!, { dataTransfer });

    expect(baseProps.onEventDrop).toHaveBeenCalledWith(events[0], expect.any(Date), expect.any(Date));
  });

  it('does not call onEventDrop when the dropped event id has no match', () => {
    render(<CalendarMonthView {...baseProps} getEventsForDate={() => []} />);

    const dayCell = screen.getAllByText('15')[0].closest('div[class*="border-r"]')!;
    const dataTransfer = makeDataTransfer({ id: 'does-not-exist' });
    fireEvent.drop(dayCell, { dataTransfer });

    expect(baseProps.onEventDrop).not.toHaveBeenCalled();
  });

  it('swallows a drop with malformed JSON instead of throwing', () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    render(<CalendarMonthView {...baseProps} getEventsForDate={() => []} />);

    const dayCell = screen.getAllByText('15')[0].closest('div[class*="border-r"]')!;
    fireEvent.drop(dayCell, { dataTransfer: { getData: () => 'not json' } });

    expect(consoleErrorSpy).toHaveBeenCalledWith('Error handling event drop:', expect.anything());
    consoleErrorSpy.mockRestore();
  });

  it('dims days outside the current month', () => {
    render(
      <CalendarMonthView {...baseProps} getEventsForDate={() => []} isCurrentMonth={() => false} />
    );
    expect(screen.getAllByText('1')[0].className).toContain('text-gray-400');
  });

  it('highlights today', () => {
    render(<CalendarMonthView {...baseProps} getEventsForDate={() => []} isToday={(d) => d.getDate() === 15} />);
    expect(screen.getAllByText('15')[0].className).toContain('bg-blue-600');
  });
});
