import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Header } from '../Header';
import { AppProvider, useApp } from '../../../context/AppContext';
import { Notification } from '../../../types';

// EnterpriseMonitoring and GlobalSearch are owned by another test batch and
// aren't the thing under test here; stub them so Header's own logic (title,
// search slots, add-new button, notification badge, session-manager slot) is
// what's actually exercised.
jest.mock('../../Advanced/EnterpriseMonitoring', () => ({
  EnterpriseMonitoring: () => <div data-testid="enterprise-monitoring-stub" />,
}));
jest.mock('../../Advanced/GlobalSearch', () => ({
  GlobalSearch: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="global-search-stub">
      <button onClick={onClose}>close global search</button>
    </div>
  ),
}));

const makeNotification = (overrides: Partial<Notification> = {}): Notification => ({
  id: `n-${Math.random()}`,
  type: 'system',
  title: 'A notification',
  message: 'Something happened',
  userId: 'u1',
  createdAt: new Date().toISOString(),
  read: false,
  ...overrides,
});

const SeedNotifications = ({ notifications }: { notifications: Notification[] }) => {
  const { state, dispatch } = useApp();
  return (
    <button
      data-testid="seed"
      onClick={() => {
        // Clear the seeded mock unread notifications first so the badge
        // count reflects only what this test adds.
        state.notifications
          .filter(n => !n.read)
          .forEach(n => dispatch({ type: 'MARK_NOTIFICATION_READ', payload: n.id }));
        notifications.forEach(n => dispatch({ type: 'ADD_NOTIFICATION', payload: n }));
      }}
    >
      seed
    </button>
  );
};

describe('Header', () => {
  it('renders the page title', () => {
    render(
      <AppProvider>
        <Header title="Dashboard" />
      </AppProvider>
    );

    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
  });

  it('toggles the global search overlay and hides the plain search input while it is open', async () => {
    const user = userEvent.setup();
    render(
      <AppProvider>
        <Header title="Projects" onSearch={jest.fn()} />
      </AppProvider>
    );

    expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
    expect(screen.queryByTestId('global-search-stub')).not.toBeInTheDocument();

    await user.click(screen.getByTitle('Global Search (1M+ records)'));

    expect(screen.getByTestId('global-search-stub')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Search...')).not.toBeInTheDocument();

    await user.click(screen.getByText('close global search'));

    expect(screen.queryByTestId('global-search-stub')).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
  });

  it('calls onSearch as the plain search input changes', async () => {
    const user = userEvent.setup();
    const onSearch = jest.fn();
    render(
      <AppProvider>
        <Header title="Projects" onSearch={onSearch} />
      </AppProvider>
    );

    await user.type(screen.getByPlaceholderText('Search...'), 'x');

    expect(onSearch).toHaveBeenCalledWith('x');
  });

  it('does not render the plain search input when onSearch is not provided', () => {
    render(
      <AppProvider>
        <Header title="Projects" />
      </AppProvider>
    );

    expect(screen.queryByPlaceholderText('Search...')).not.toBeInTheDocument();
  });

  it('renders the Add New button only when showAddButton and onAddNew are both set', async () => {
    const user = userEvent.setup();
    const onAddNew = jest.fn();
    const { rerender } = render(
      <AppProvider>
        <Header title="Projects" showAddButton onAddNew={undefined} />
      </AppProvider>
    );
    expect(screen.queryByText('Add New')).not.toBeInTheDocument();

    rerender(
      <AppProvider>
        <Header title="Projects" showAddButton onAddNew={onAddNew} />
      </AppProvider>
    );
    await user.click(screen.getByText('Add New'));

    expect(onAddNew).toHaveBeenCalled();
  });

  it('renders the session manager slot when provided', () => {
    render(
      <AppProvider>
        <Header title="Projects" sessionManager={<div data-testid="session-manager-slot" />} />
      </AppProvider>
    );

    expect(screen.getByTestId('session-manager-slot')).toBeInTheDocument();
  });

  it('shows the unread notification count badge', () => {
    const utils = render(
      <AppProvider>
        <SeedNotifications notifications={[makeNotification({ read: false })]} />
        <Header title="Projects" />
      </AppProvider>
    );
    act(() => {
      utils.getByTestId('seed').click();
    });

    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('shows no badge when there are no unread notifications', () => {
    const utils = render(
      <AppProvider>
        <SeedNotifications notifications={[]} />
        <Header title="Projects" />
      </AppProvider>
    );
    act(() => {
      utils.getByTestId('seed').click();
    });

    expect(screen.queryByText('1')).not.toBeInTheDocument();
    expect(screen.queryByText('2')).not.toBeInTheDocument();
  });
});
