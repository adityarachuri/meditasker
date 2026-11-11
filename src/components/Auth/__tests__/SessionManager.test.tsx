import { render, screen, fireEvent } from '@testing-library/react';
import { SessionManager } from '../SessionManager';
import { useSession } from '../../../hooks/useSession';

// Mock useSession hook
jest.mock('../../../hooks/useSession', () => ({
  useSession: jest.fn()
}));

const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;

describe('SessionManager', () => {
  const mockOnLogout = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementation
    mockUseSession.mockReturnValue({
      isActive: true,
      sessionInfo: {
        token: 'test-token',
        user: {
          id: '1',
          name: 'Test User',
          email: 'test@example.com',
          role: 'developer',
          department: 'Engineering',
          joinDate: '2023-01-01',
          isActive: true
        },
        expiresAt: Date.now() + 30 * 60 * 1000
      },
      timeRemaining: 30 * 60 * 1000,
      formattedTimeRemaining: '30:00',
      startSession: jest.fn(),
      endSession: jest.fn(),
      renewSession: jest.fn(),
      user: {
        id: '1',
        name: 'Test User',
        email: 'test@example.com',
        role: 'developer',
        department: 'Engineering',
        joinDate: '2023-01-01',
        isActive: true
      },
      token: 'test-token'
    });
  });

  it('renders session timer when session is active', () => {
    render(<SessionManager onLogout={mockOnLogout} />);
    
    expect(screen.getByText('30:00')).toBeInTheDocument();
  });

  it('does not render when session is inactive', () => {
    mockUseSession.mockReturnValue({
      ...mockUseSession(),
      isActive: false
    });
    
    const { container } = render(<SessionManager onLogout={mockOnLogout} />);
    
    expect(container).toBeEmptyDOMElement();
  });

  it('shows warning modal when session is about to expire', () => {
    mockUseSession.mockReturnValue({
      ...mockUseSession(),
      timeRemaining: 4 * 60 * 1000, // 4 minutes
      formattedTimeRemaining: '04:00'
    });
    
    render(<SessionManager onLogout={mockOnLogout} showWarningAt={5 * 60 * 1000} />);
    
    expect(screen.getByText('Session Expiring Soon')).toBeInTheDocument();
    expect(screen.getByText(/Your session will expire in 04:00/)).toBeInTheDocument();
  });

  it('renews session when "Stay Logged In" is clicked', () => {
    mockUseSession.mockReturnValue({
      ...mockUseSession(),
      timeRemaining: 4 * 60 * 1000, // 4 minutes
      formattedTimeRemaining: '04:00'
    });
    
    const renewSession = jest.fn();
    mockUseSession.mockReturnValue({
      ...mockUseSession(),
      timeRemaining: 4 * 60 * 1000,
      formattedTimeRemaining: '04:00',
      renewSession
    });
    
    render(<SessionManager onLogout={mockOnLogout} showWarningAt={5 * 60 * 1000} />);
    
    fireEvent.click(screen.getByText('Stay Logged In'));
    
    expect(renewSession).toHaveBeenCalled();
  });

  it('logs out when "Logout Now" is clicked', () => {
    mockUseSession.mockReturnValue({
      ...mockUseSession(),
      timeRemaining: 4 * 60 * 1000, // 4 minutes
      formattedTimeRemaining: '04:00'
    });
    
    const endSession = jest.fn();
    mockUseSession.mockReturnValue({
      ...mockUseSession(),
      timeRemaining: 4 * 60 * 1000,
      formattedTimeRemaining: '04:00',
      endSession
    });
    
    render(<SessionManager onLogout={mockOnLogout} showWarningAt={5 * 60 * 1000} />);
    
    fireEvent.click(screen.getByText('Logout Now'));
    
    expect(endSession).toHaveBeenCalled();
    expect(mockOnLogout).toHaveBeenCalled();
  });

  it('changes timer color when session is about to expire', () => {
    mockUseSession.mockReturnValue({
      ...mockUseSession(),
      timeRemaining: 4 * 60 * 1000, // 4 minutes
      formattedTimeRemaining: '04:00'
    });
    
    render(<SessionManager onLogout={mockOnLogout} showWarningAt={5 * 60 * 1000} />);
    
    const timerElement = screen.getByText('04:00');
    expect(timerElement).toHaveClass('text-orange-600');
  });

  it('does not show warning when timeRemaining is above threshold', () => {
    mockUseSession.mockReturnValue({
      ...mockUseSession(),
      timeRemaining: 10 * 60 * 1000, // 10 minutes
      formattedTimeRemaining: '10:00'
    });
    
    render(<SessionManager onLogout={mockOnLogout} showWarningAt={5 * 60 * 1000} />);
    
    expect(screen.queryByText('Session Expiring Soon')).not.toBeInTheDocument();
  });

  it('uses custom warning threshold when provided', () => {
    mockUseSession.mockReturnValue({
      ...mockUseSession(),
      timeRemaining: 2 * 60 * 1000, // 2 minutes
      formattedTimeRemaining: '02:00'
    });
    
    // Set warning threshold to 3 minutes
    render(<SessionManager onLogout={mockOnLogout} showWarningAt={3 * 60 * 1000} />);
    
    expect(screen.getByText('Session Expiring Soon')).toBeInTheDocument();
  });
});