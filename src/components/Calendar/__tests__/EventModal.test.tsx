import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EventModal } from '../EventModal';
import { databaseService } from '../../../services/databaseService';
import { CalendarEvent } from '../../../types/calendar';

jest.mock('../../../services/databaseService', () => ({
  databaseService: {
    getUsers: jest.fn(),
  },
}));

const mockGetUsers = databaseService.getUsers as jest.Mock;

const makeEvent = (overrides: Partial<CalendarEvent> = {}): CalendarEvent => ({
  id: 'e1',
  title: 'Existing event',
  description: 'Some notes',
  startDate: '2024-06-10T14:00:00.000Z',
  endDate: '2024-06-10T15:00:00.000Z',
  allDay: false,
  type: 'meeting',
  priority: 'medium',
  status: 'scheduled',
  location: 'Room 1',
  attendees: ['u1'],
  color: '#3b82f6',
  recurrence: { type: 'weekly', interval: 1, endDate: '2024-12-31T00:00:00.000Z' },
  createdBy: 'user1',
  createdAt: '2024-06-01T00:00:00.000Z',
  updatedAt: '2024-06-01T00:00:00.000Z',
  ...overrides,
});

describe('EventModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUsers.mockResolvedValue({
      data: [
        { id: 'u1', name: 'Alice', email: 'alice@meditasker.com', role: 'developer', department: 'Eng', joinDate: '2024-01-01', isActive: true },
        { id: 'u2', name: 'Bob', email: 'bob@meditasker.com', role: 'manager', department: 'Eng', joinDate: '2024-01-01', isActive: true },
      ],
      total: 2,
      hasMore: false,
    });
  });

  it('renders "Create Event" with empty fields when no event is given', async () => {
    render(<EventModal onSave={jest.fn()} onClose={jest.fn()} />);
    expect(screen.getByRole('heading', { name: 'Create Event' })).toBeInTheDocument();
    await waitFor(() => expect(mockGetUsers).toHaveBeenCalled());
  });

  it('pre-fills the form from an existing (timed) event', async () => {
    render(<EventModal event={makeEvent()} onSave={jest.fn()} onClose={jest.fn()} />);

    expect(screen.getByRole('heading', { name: 'Edit Event' })).toBeInTheDocument();
    expect(screen.getByDisplayValue('Existing event')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Some notes')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Room 1')).toBeInTheDocument();
    await waitFor(() => expect(mockGetUsers).toHaveBeenCalled());
  });

  it('pre-fills an event lacking optional fields with empty defaults', () => {
    const minimalEvent = makeEvent({
      description: undefined,
      location: undefined,
      attendees: undefined,
      recurrence: undefined,
    });
    render(<EventModal event={minimalEvent} onSave={jest.fn()} onClose={jest.fn()} />);

    expect(screen.getByLabelText('Description')).toHaveValue('');
    expect(screen.getByLabelText('Location')).toHaveValue('');
    expect(screen.getByLabelText('Repeat')).toHaveValue('none');
  });

  it('pre-fills a recurring event that has no recurrence end date', () => {
    const recurringEvent = makeEvent({
      recurrence: { type: 'daily', interval: 2 },
    });
    render(<EventModal event={recurringEvent} onSave={jest.fn()} onClose={jest.fn()} />);

    expect(screen.getByLabelText('Repeat')).toHaveValue('daily');
  });

  it('pre-fills an all-day event without a time value', () => {
    render(<EventModal event={makeEvent({ allDay: true })} onSave={jest.fn()} onClose={jest.fn()} />);
    // All-day events hide the time inputs entirely.
    expect(screen.queryByLabelText('Start Time *')).not.toBeInTheDocument();
  });

  it('pre-fills from defaultDate when creating a new event', () => {
    render(<EventModal defaultDate={new Date('2024-07-04T09:00:00')} onSave={jest.fn()} onClose={jest.fn()} />);
    expect(screen.getByLabelText('Start Date *')).toHaveValue('2024-07-04');
  });

  it('calls onClose from the header close button and the Cancel button', async () => {
    const onClose = jest.fn();
    const user = userEvent.setup();
    render(<EventModal onSave={jest.fn()} onClose={onClose} />);

    await user.click(screen.getByLabelText('Close'));
    expect(onClose).toHaveBeenCalledTimes(1);

    await user.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('rejects submission with no title', async () => {
    const onSave = jest.fn();
    render(<EventModal onSave={onSave} onClose={jest.fn()} />);

    fireEvent.click(screen.getByText('Create'));

    expect(await screen.findByText('Title is required')).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('rejects submission with a title but no start date', async () => {
    const onSave = jest.fn();
    const user = userEvent.setup();
    render(<EventModal onSave={onSave} onClose={jest.fn()} />);

    await user.type(screen.getByLabelText('Title *'), 'New event');
    fireEvent.click(screen.getByText('Create'));

    expect(await screen.findByText('Start date is required')).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('rejects a timed event missing start/end time', async () => {
    const onSave = jest.fn();
    const user = userEvent.setup();
    render(<EventModal onSave={onSave} onClose={jest.fn()} />);

    await user.type(screen.getByLabelText('Title *'), 'New event');
    fireEvent.change(screen.getByLabelText('Start Date *'), { target: { value: '2024-07-01' } });
    fireEvent.change(screen.getByLabelText('End Date *'), { target: { value: '2024-07-01' } });
    fireEvent.click(screen.getByText('Create'));

    expect(await screen.findByText('Start and end times are required for timed events')).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('rejects an end time at or before the start time', async () => {
    const onSave = jest.fn();
    const user = userEvent.setup();
    render(<EventModal onSave={onSave} onClose={jest.fn()} />);

    await user.type(screen.getByLabelText('Title *'), 'New event');
    fireEvent.change(screen.getByLabelText('Start Date *'), { target: { value: '2024-07-01' } });
    fireEvent.change(screen.getByLabelText('End Date *'), { target: { value: '2024-07-01' } });
    fireEvent.change(screen.getByLabelText('Start Time *'), { target: { value: '10:00' } });
    fireEvent.change(screen.getByLabelText('End Time *'), { target: { value: '09:00' } });
    fireEvent.click(screen.getByText('Create'));

    expect(await screen.findByText('End time must be after start time')).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('creates a timed event with valid data', async () => {
    const onSave = jest.fn().mockResolvedValue({ id: 'new' });
    const user = userEvent.setup();
    render(<EventModal onSave={onSave} onClose={jest.fn()} />);

    await user.type(screen.getByLabelText('Title *'), 'New event');
    fireEvent.change(screen.getByLabelText('Start Date *'), { target: { value: '2024-07-01' } });
    fireEvent.change(screen.getByLabelText('End Date *'), { target: { value: '2024-07-01' } });
    fireEvent.change(screen.getByLabelText('Start Time *'), { target: { value: '09:00' } });
    fireEvent.change(screen.getByLabelText('End Time *'), { target: { value: '10:00' } });
    fireEvent.click(screen.getByText('Create'));

    await waitFor(() => expect(onSave).toHaveBeenCalled());
    const [eventData] = onSave.mock.calls[0];
    expect(eventData.title).toBe('New event');
    expect(eventData.recurrence).toBeUndefined();
  });

  it('creates an all-day event using the allDay time branch', async () => {
    const onSave = jest.fn().mockResolvedValue({ id: 'new' });
    const user = userEvent.setup();
    render(<EventModal onSave={onSave} onClose={jest.fn()} />);

    await user.type(screen.getByLabelText('Title *'), 'All day event');
    fireEvent.click(screen.getByLabelText('All day event'));
    fireEvent.change(screen.getByLabelText('Start Date *'), { target: { value: '2024-07-01' } });
    fireEvent.change(screen.getByLabelText('End Date *'), { target: { value: '2024-07-01' } });
    fireEvent.click(screen.getByText('Create'));

    await waitFor(() => expect(onSave).toHaveBeenCalled());
    const [eventData] = onSave.mock.calls[0];
    expect(eventData.allDay).toBe(true);
  });

  it('includes a recurrence object with an end date when a repeat type is selected', async () => {
    const onSave = jest.fn().mockResolvedValue({ id: 'new' });
    const user = userEvent.setup();
    render(<EventModal onSave={onSave} onClose={jest.fn()} />);

    await user.type(screen.getByLabelText('Title *'), 'Recurring event');
    fireEvent.change(screen.getByLabelText('Start Date *'), { target: { value: '2024-07-01' } });
    fireEvent.change(screen.getByLabelText('End Date *'), { target: { value: '2024-07-01' } });
    fireEvent.change(screen.getByLabelText('Start Time *'), { target: { value: '09:00' } });
    fireEvent.change(screen.getByLabelText('End Time *'), { target: { value: '10:00' } });
    fireEvent.change(screen.getByLabelText('Repeat'), { target: { value: 'weekly' } });
    fireEvent.click(screen.getByText('Create'));

    await waitFor(() => expect(onSave).toHaveBeenCalled());
    const [eventData] = onSave.mock.calls[0];
    expect(eventData.recurrence).toEqual({ type: 'weekly', interval: 1, endDate: undefined });
  });

  it('updates an existing event, calling onSave with its id and the new data', async () => {
    const onSave = jest.fn().mockResolvedValue({ id: 'e1' });
    const user = userEvent.setup();
    render(<EventModal event={makeEvent()} onSave={onSave} onClose={jest.fn()} />);

    await user.clear(screen.getByLabelText('Title *'));
    await user.type(screen.getByLabelText('Title *'), 'Updated title');
    fireEvent.click(screen.getByText('Update'));

    await waitFor(() => expect(onSave).toHaveBeenCalledWith('e1', expect.objectContaining({ title: 'Updated title' })));
  });

  it('shows a generic error message when onSave rejects with a non-Error value', async () => {
    const onSave = jest.fn().mockRejectedValue('nope');
    const user = userEvent.setup();
    render(<EventModal onSave={onSave} onClose={jest.fn()} />);

    await user.type(screen.getByLabelText('Title *'), 'New event');
    fireEvent.change(screen.getByLabelText('Start Date *'), { target: { value: '2024-07-01' } });
    fireEvent.change(screen.getByLabelText('End Date *'), { target: { value: '2024-07-01' } });
    fireEvent.change(screen.getByLabelText('Start Time *'), { target: { value: '09:00' } });
    fireEvent.change(screen.getByLabelText('End Time *'), { target: { value: '10:00' } });
    fireEvent.click(screen.getByText('Create'));

    expect(await screen.findByText('Failed to save event')).toBeInTheDocument();
  });

  it('deletes an event when the user confirms the prompt', async () => {
    const onDelete = jest.fn().mockResolvedValue(true);
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
    const user = userEvent.setup();
    render(<EventModal event={makeEvent()} onSave={jest.fn()} onDelete={onDelete} onClose={jest.fn()} />);

    await user.click(screen.getByText('Delete'));

    await waitFor(() => expect(onDelete).toHaveBeenCalledWith('e1'));
    confirmSpy.mockRestore();
  });

  it('does not delete when the user cancels the confirm prompt', async () => {
    const onDelete = jest.fn();
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);
    const user = userEvent.setup();
    render(<EventModal event={makeEvent()} onSave={jest.fn()} onDelete={onDelete} onClose={jest.fn()} />);

    await user.click(screen.getByText('Delete'));

    expect(onDelete).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it('shows a generic error message when onDelete rejects with a non-Error value', async () => {
    const onDelete = jest.fn().mockRejectedValue('nope');
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
    const user = userEvent.setup();
    render(<EventModal event={makeEvent()} onSave={jest.fn()} onDelete={onDelete} onClose={jest.fn()} />);

    await user.click(screen.getByText('Delete'));

    expect(await screen.findByText('Failed to delete event')).toBeInTheDocument();
    confirmSpy.mockRestore();
  });

  it('shows the real error message when onDelete rejects with an Error', async () => {
    const onDelete = jest.fn().mockRejectedValue(new Error('Delete boom'));
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
    const user = userEvent.setup();
    render(<EventModal event={makeEvent()} onSave={jest.fn()} onDelete={onDelete} onClose={jest.fn()} />);

    await user.click(screen.getByText('Delete'));

    expect(await screen.findByText('Delete boom')).toBeInTheDocument();
    confirmSpy.mockRestore();
  });

  it('does not render a Delete button without both an event and onDelete', () => {
    render(<EventModal event={makeEvent()} onSave={jest.fn()} onClose={jest.fn()} />);
    expect(screen.queryByText('Delete')).not.toBeInTheDocument();
  });

  it('updates description, type, priority, status, location, and color fields', () => {
    render(<EventModal onSave={jest.fn()} onClose={jest.fn()} />);

    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Notes' } });
    expect(screen.getByLabelText('Description')).toHaveValue('Notes');

    fireEvent.change(screen.getByLabelText('Type'), { target: { value: 'task' } });
    expect(screen.getByLabelText('Type')).toHaveValue('task');

    fireEvent.change(screen.getByLabelText('Priority'), { target: { value: 'high' } });
    expect(screen.getByLabelText('Priority')).toHaveValue('high');

    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'completed' } });
    expect(screen.getByLabelText('Status')).toHaveValue('completed');

    fireEvent.change(screen.getByLabelText('Location'), { target: { value: 'Room 9' } });
    expect(screen.getByLabelText('Location')).toHaveValue('Room 9');

    fireEvent.change(screen.getByLabelText('Color'), { target: { value: '#ff0000' } });
    expect(screen.getByLabelText('Color')).toHaveValue('#ff0000');
  });

  it('toggles an attendee checkbox on and off', async () => {
    const user = userEvent.setup();
    render(<EventModal onSave={jest.fn()} onClose={jest.fn()} />);

    await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument());
    const aliceCheckbox = screen.getByText('Alice').closest('label')!.querySelector('input')!;

    await user.click(aliceCheckbox); // add
    expect(aliceCheckbox).toBeChecked();

    await user.click(aliceCheckbox); // remove
    expect(aliceCheckbox).not.toBeChecked();
  });
});
