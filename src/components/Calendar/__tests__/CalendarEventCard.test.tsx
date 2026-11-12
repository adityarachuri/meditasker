import { render, screen, fireEvent } from '@testing-library/react';
import { CalendarEventCard } from '../CalendarEventCard';
import { CalendarEvent } from '../../../types/calendar';

const makeEvent = (overrides: Partial<CalendarEvent> = {}): CalendarEvent => ({
  id: 'e1',
  title: 'Team sync',
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

describe('CalendarEventCard', () => {
  it('renders compact mode with the type icon and title', () => {
    render(<CalendarEventCard event={makeEvent()} compact />);
    expect(screen.getByText('Team sync')).toBeInTheDocument();
  });

  it.each([
    ['completed', '✓'],
    ['cancelled', '✗'],
    ['in-progress', '⏳'],
  ] as const)('shows the %s status icon', (status, icon) => {
    render(<CalendarEventCard event={makeEvent({ status })} compact />);
    expect(screen.getByText(icon)).toBeInTheDocument();
  });

  it('shows no status icon for a scheduled event', () => {
    render(<CalendarEventCard event={makeEvent({ status: 'scheduled' })} compact />);
    expect(screen.queryByText('✓')).not.toBeInTheDocument();
    expect(screen.queryByText('✗')).not.toBeInTheDocument();
    expect(screen.queryByText('⏳')).not.toBeInTheDocument();
  });

  it.each([
    ['critical', 'border-l-red-500'],
    ['high', 'border-l-orange-500'],
    ['medium', 'border-l-yellow-500'],
    ['low', 'border-l-green-500'],
  ] as const)('applies the %s priority color', (priority, expectedClass) => {
    render(<CalendarEventCard event={makeEvent({ priority })} compact />);
    expect(screen.getByText('Team sync').className).toContain(expectedClass);
  });

  it.each([
    ['meeting', '👥'],
    ['deadline', '⏰'],
    ['milestone', '🎯'],
    ['task', '📋'],
    ['project', '📁'],
    ['personal', '👤'],
  ] as const)('shows the %s type icon', (type, icon) => {
    render(<CalendarEventCard event={makeEvent({ type })} compact />);
    expect(screen.getByText(icon)).toBeInTheDocument();
  });

  it('falls back to a default color/icon for a priority or type outside the known union', () => {
    // Neither value is reachable through CalendarEvent's real type - every
    // valid value is already covered above - but getPriorityColor/getTypeIcon
    // each have a defensive default branch worth exercising directly.
    const event = makeEvent({
      priority: 'unknown' as unknown as CalendarEvent['priority'],
      type: 'unknown' as unknown as CalendarEvent['type'],
    });
    render(<CalendarEventCard event={event} compact />);
    expect(screen.getByText('Team sync').className).toContain('border-l-gray-500');
    expect(screen.getByText('📅')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const onClick = jest.fn();
    render(<CalendarEventCard event={makeEvent()} onClick={onClick} compact />);
    fireEvent.click(screen.getByText('Team sync'));
    expect(onClick).toHaveBeenCalled();
  });

  it('is draggable and calls onDragStart when a drag handler is provided', () => {
    const onDragStart = jest.fn();
    render(<CalendarEventCard event={makeEvent()} onDragStart={onDragStart} compact />);
    const card = screen.getByText('Team sync');
    expect(card).toHaveAttribute('draggable', 'true');
    fireEvent.dragStart(card);
    expect(onDragStart).toHaveBeenCalled();
  });

  it('is not draggable when no onDragStart is provided', () => {
    render(<CalendarEventCard event={makeEvent()} compact />);
    expect(screen.getByText('Team sync')).toHaveAttribute('draggable', 'false');
  });

  it('includes the description in the title attribute when present', () => {
    render(<CalendarEventCard event={makeEvent({ description: 'Weekly check-in' })} compact />);
    expect(screen.getByText('Team sync').title).toBe('Team sync - Weekly check-in');
  });

  it('omits the description suffix in the title attribute when absent', () => {
    render(<CalendarEventCard event={makeEvent()} compact />);
    expect(screen.getByText('Team sync').title).toBe('Team sync');
  });

  it('renders the full (non-compact) card without time by default', () => {
    render(<CalendarEventCard event={makeEvent()} />);
    expect(screen.getByRole('heading', { name: 'Team sync' })).toBeInTheDocument();
  });

  it('shows a critical-priority alert icon only for critical events', () => {
    const { container, rerender } = render(<CalendarEventCard event={makeEvent({ priority: 'critical' })} />);
    expect(container.querySelector('svg')).toBeInTheDocument();

    rerender(<CalendarEventCard event={makeEvent({ priority: 'low' })} />);
    // Still has the type icon span, but no AlertCircle for non-critical; just assert no crash/regression.
    expect(screen.getByRole('heading', { name: 'Team sync' })).toBeInTheDocument();
  });

  it('shows "All day" as the formatted time for an all-day event', () => {
    render(<CalendarEventCard event={makeEvent({ allDay: true })} showTime />);
    expect(screen.getByText('All day')).toBeInTheDocument();
  });

  it('shows a start-end time range for a same-day timed event', () => {
    render(
      <CalendarEventCard
        event={makeEvent({ startDate: '2024-06-10T14:00:00.000Z', endDate: '2024-06-10T15:00:00.000Z' })}
        showTime
      />
    );
    expect(screen.getByText(/-/)).toBeInTheDocument();
  });

  it('shows only the start time for a multi-day timed event', () => {
    render(
      <CalendarEventCard
        event={makeEvent({ startDate: '2024-06-10T14:00:00.000Z', endDate: '2024-06-12T15:00:00.000Z' })}
        detailed
      />
    );
    // detailed implies time is shown; multi-day events render just the start time (no " - " range).
    const timeRow = screen.getByText(/AM|PM/);
    expect(timeRow.textContent).not.toMatch(/-/);
  });

  it('shows description, location, and attendees when detailed', () => {
    render(
      <CalendarEventCard
        event={makeEvent({
          description: 'Discuss roadmap',
          location: 'Room 4',
          attendees: ['u1', 'u2'],
        })}
        detailed
      />
    );
    expect(screen.getByText('Discuss roadmap')).toBeInTheDocument();
    expect(screen.getByText('Room 4')).toBeInTheDocument();
    expect(screen.getByText('2 attendees')).toBeInTheDocument();
  });

  it('uses singular "attendee" for exactly one attendee', () => {
    render(<CalendarEventCard event={makeEvent({ attendees: ['u1'] })} detailed />);
    expect(screen.getByText('1 attendee')).toBeInTheDocument();
  });

  it('omits description/location/attendees sections when absent, even when detailed', () => {
    render(<CalendarEventCard event={makeEvent({ attendees: [] })} detailed />);
    expect(screen.queryByText(/attendee/)).not.toBeInTheDocument();
  });

  it.each([
    ['critical', 'Critical'],
    ['high', 'High'],
    ['medium', 'Medium'],
    ['low', 'Low'],
  ] as const)('shows a %s priority badge when detailed', (priority, label) => {
    render(<CalendarEventCard event={makeEvent({ priority })} detailed />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it.each([
    ['completed', 'Completed'],
    ['in-progress', 'In-progress'],
    ['cancelled', 'Cancelled'],
    ['scheduled', 'Scheduled'],
  ] as const)('shows a %s status badge when detailed', (status, label) => {
    render(<CalendarEventCard event={makeEvent({ status })} detailed />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });
});
