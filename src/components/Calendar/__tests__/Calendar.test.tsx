import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Calendar } from '../Calendar';
import { calendarService } from '../../../services/calendarService';
import { databaseService } from '../../../services/databaseService';
import { CalendarEvent } from '../../../types/calendar';

// Mock services
jest.mock('../../../services/calendarService');
jest.mock('../../../services/databaseService');

const mockCalendarService = calendarService as jest.Mocked<typeof calendarService>;
const mockDatabaseService = databaseService as jest.Mocked<typeof databaseService>;

describe('Calendar Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock calendar service
    mockCalendarService.initialize.mockResolvedValue();
    mockCalendarService.getEventsInRange.mockReturnValue([]);
    mockCalendarService.getEventsForDate.mockReturnValue([]);
    mockCalendarService.getStatistics.mockReturnValue({
      totalEvents: 0,
      eventsByType: {},
      eventsByStatus: {},
      upcomingEvents: 0,
      overdueEvents: 0
    });

    // Mock database service
    mockDatabaseService.getUsers.mockResolvedValue({
      data: [],
      total: 0,
      hasMore: false
    });
  });

  it('renders calendar component', async () => {
    render(<Calendar />);
    
    await waitFor(() => {
      expect(screen.getByText('Calendar')).toBeInTheDocument();
    });
  });

  it('shows loading state initially', () => {
    render(<Calendar />);
    
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('initializes calendar service on mount', async () => {
    render(<Calendar />);
    
    await waitFor(() => {
      expect(mockCalendarService.initialize).toHaveBeenCalled();
    });
  });

  it('displays month view by default', async () => {
    render(<Calendar />);
    
    await waitFor(() => {
      expect(screen.getByText('Month')).toHaveClass('bg-white');
    });
  });

  it('switches between view types', async () => {
    render(<Calendar />);
    
    await waitFor(() => {
      expect(screen.getByText('Week')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Week'));
    
    expect(screen.getByText('Week')).toHaveClass('bg-white');
  });

  it('navigates to previous/next periods', async () => {
    render(<Calendar />);
    
    await waitFor(() => {
      expect(screen.getByLabelText('Previous')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText('Previous'));
    fireEvent.click(screen.getByLabelText('Next'));
    
    // Navigation should work without errors
    expect(screen.getByLabelText('Previous')).toBeInTheDocument();
  });

  it('opens event modal when create button is clicked', async () => {
    render(<Calendar />);
    
    await waitFor(() => {
      expect(screen.getByText('Create Event')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Create Event'));

    expect(screen.getByRole('heading', { name: 'Create Event' })).toBeInTheDocument();

  });

  it('handles date clicks', async () => {
    mockCalendarService.getEventsForDate.mockReturnValue([]);
    
    render(<Calendar />);

    await waitFor(() => {
      expect(screen.getAllByText('1')[0]).toBeInTheDocument();
    });
    fireEvent.click(screen.getAllByText('1')[0]);

    // Should open event modal for the clicked date
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Create Event' })).toBeInTheDocument();
    });

  });

  it('displays error state when initialization fails', async () => {
    mockCalendarService.initialize.mockRejectedValue(new Error('Failed to initialize'));

    render(<Calendar />);

    await waitFor(() => {
      expect(screen.getByText('Error loading calendar')).toBeInTheDocument();
    });
  });

  it('filters events correctly', async () => {
    const mockEvents: CalendarEvent[] = [
      {
        id: '1',
        title: 'Test Event',
        startDate: new Date().toISOString(),
        endDate: new Date().toISOString(),
        allDay: false,
        type: 'meeting',
        priority: 'high',
        status: 'scheduled',
        color: '#3b82f6',
        createdBy: 'test-user',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    mockCalendarService.getEventsInRange.mockReturnValue(mockEvents);
    
    render(<Calendar />);
    
    await waitFor(() => {
      // Filter functionality should be available
      expect(screen.getByText('Filters')).toBeInTheDocument();
    });
  });

  it('handles search functionality', async () => {
    mockCalendarService.searchEvents.mockReturnValue([]);

    render(<Calendar />);

    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText('Search events...');
      fireEvent.change(searchInput, { target: { value: 'test' } });
    });

    expect(mockCalendarService.searchEvents).toHaveBeenCalledWith('test', expect.any(Object));
  });

  it('switches to the day and agenda views', async () => {
    render(<Calendar />);

    await waitFor(() => expect(screen.getByText('Week')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Day'));
    await waitFor(() => expect(screen.getByText(/event/)).toBeInTheDocument());

    fireEvent.click(screen.getByText('Agenda'));
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Agenda' })).toBeInTheDocument());
  });

  it('collapses and expands the sidebar', async () => {
    render(<Calendar />);

    await waitFor(() => expect(screen.getByText('Overview')).toBeInTheDocument());

    fireEvent.click(screen.getByLabelText('Collapse sidebar'));
    expect(screen.queryByText('Overview')).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Expand sidebar'));
    expect(screen.getByText('Overview')).toBeInTheDocument();
  });

  it('closes the event modal via Cancel without saving', async () => {
    render(<Calendar />);

    await waitFor(() => expect(screen.getByText('Create Event')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Create Event'));

    expect(screen.getByRole('heading', { name: 'Create Event' })).toBeInTheDocument();
    fireEvent.click(screen.getByText('Cancel'));

    expect(screen.queryByRole('heading', { name: 'Create Event' })).not.toBeInTheDocument();
  });

  it('creates an event from a date click and closes the modal on success', async () => {
    mockCalendarService.createEvent.mockReturnValue({
      id: 'new-1',
      title: 'New event',
      startDate: new Date().toISOString(),
      endDate: new Date().toISOString(),
      allDay: false,
      type: 'meeting',
      priority: 'medium',
      status: 'scheduled',
      color: '#3b82f6',
      createdBy: 'user1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    render(<Calendar />);

    await waitFor(() => expect(screen.getAllByText('1')[0]).toBeInTheDocument());
    fireEvent.click(screen.getAllByText('1')[0]);

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Create Event' })).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText('Title *'), { target: { value: 'New event' } });
    fireEvent.change(screen.getByLabelText('Start Time *'), { target: { value: '09:00' } });
    fireEvent.change(screen.getByLabelText('End Time *'), { target: { value: '10:00' } });
    fireEvent.click(screen.getByText('Create'));

    await waitFor(() => expect(mockCalendarService.createEvent).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Create Event' })).not.toBeInTheDocument());
  });

  it('opens the edit modal for an existing event and updates it', async () => {
    const existingEvent: CalendarEvent = {
      id: 'e1',
      title: 'Existing event',
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 3600_000).toISOString(),
      allDay: false,
      type: 'meeting',
      priority: 'medium',
      status: 'scheduled',
      color: '#3b82f6',
      createdBy: 'user1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    mockCalendarService.getEventsInRange.mockReturnValue([existingEvent]);
    mockCalendarService.getEventsForDate.mockReturnValue([existingEvent]);
    mockCalendarService.updateEvent.mockReturnValue({ ...existingEvent, title: 'Updated event' });

    render(<Calendar />);

    await waitFor(() => expect(screen.getAllByText('Existing event').length).toBeGreaterThan(0));
    fireEvent.click(screen.getAllByText('Existing event')[0]);

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Edit Event' })).toBeInTheDocument());

    fireEvent.click(screen.getByText('Update'));

    await waitFor(() => expect(mockCalendarService.updateEvent).toHaveBeenCalledWith('e1', expect.anything()));
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Edit Event' })).not.toBeInTheDocument());
  });

  it('deletes an existing event from the modal', async () => {
    const existingEvent: CalendarEvent = {
      id: 'e1',
      title: 'Existing event',
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 3600_000).toISOString(),
      allDay: false,
      type: 'meeting',
      priority: 'medium',
      status: 'scheduled',
      color: '#3b82f6',
      createdBy: 'user1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    mockCalendarService.getEventsInRange.mockReturnValue([existingEvent]);
    mockCalendarService.getEventsForDate.mockReturnValue([existingEvent]);
    mockCalendarService.deleteEvent.mockReturnValue(true);
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);

    render(<Calendar />);

    await waitFor(() => expect(screen.getAllByText('Existing event').length).toBeGreaterThan(0));
    fireEvent.click(screen.getAllByText('Existing event')[0]);

    await waitFor(() => expect(screen.getByText('Delete')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Delete'));

    await waitFor(() => expect(mockCalendarService.deleteEvent).toHaveBeenCalledWith('e1'));
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Edit Event' })).not.toBeInTheDocument());

    confirmSpy.mockRestore();
  });

  it('drags and drops an event onto a new date', async () => {
    const existingEvent: CalendarEvent = {
      id: 'e1',
      title: 'Existing event',
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 3600_000).toISOString(),
      allDay: false,
      type: 'meeting',
      priority: 'medium',
      status: 'scheduled',
      color: '#3b82f6',
      createdBy: 'user1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    mockCalendarService.getEventsInRange.mockReturnValue([existingEvent]);
    mockCalendarService.getEventsForDate.mockReturnValue([existingEvent]);
    mockCalendarService.updateEvent.mockReturnValue(existingEvent);

    render(<Calendar />);

    await waitFor(() => expect(screen.getAllByText('Existing event').length).toBeGreaterThan(0));

    const eventCard = screen.getAllByText('Existing event')[0];
    const dataTransfer = { getData: () => JSON.stringify(existingEvent), setData: jest.fn(), effectAllowed: '', dropEffect: '' };
    fireEvent.dragStart(eventCard, { dataTransfer });

    const dayCell = screen.getAllByText('15')[0].closest('div[class*="border-r"]')!;
    fireEvent.dragOver(dayCell, { dataTransfer });
    fireEvent.drop(dayCell, { dataTransfer });

    await waitFor(() => expect(mockCalendarService.updateEvent).toHaveBeenCalledWith('e1', expect.objectContaining({
      startDate: expect.any(String),
      endDate: expect.any(String)
    })));
  });
});