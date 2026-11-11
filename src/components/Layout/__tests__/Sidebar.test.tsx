import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Sidebar } from '../Sidebar';
import { AppProvider } from '../../../context/AppContext';
import { AuthProvider } from '../../../context/AuthContext';

jest.mock('../../../services/sessionService', () => ({
  sessionService: {
    getSessionInfo: jest.fn(() => null),
    startSession: jest.fn(),
    endSession: jest.fn(),
    configure: jest.fn(),
    getSessionTimeRemaining: jest.fn(() => 0),
  },
}));

const renderSidebar = () =>
  render(
    <AppProvider>
      <AuthProvider>
        <Sidebar activeTab="dashboard" onTabChange={jest.fn()} />
      </AuthProvider>
    </AppProvider>
  );

describe('Sidebar', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('renders expanded by default with labels visible', () => {
    renderSidebar();

    expect(screen.getByText('MediTasker')).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('collapses and expands, persisting the choice via app settings', async () => {
    const user = userEvent.setup();
    renderSidebar();

    await user.click(screen.getByTitle('Collapse sidebar'));

    expect(screen.queryByText('MediTasker')).not.toBeInTheDocument();
    expect(JSON.parse(window.localStorage.getItem('app-settings') || '{}').sidebarCollapsed).toBe(true);

    await user.click(screen.getByTitle('Expand sidebar'));

    expect(screen.getByText('MediTasker')).toBeInTheDocument();
  });
});
