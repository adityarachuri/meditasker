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
});