import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NotificationList } from '../NotificationList';
import { AppProvider, useApp } from '../../../context/AppContext';
import { Notification } from '../../../types';

// Forwards to the real hook by default; one test below overrides it to force
// an empty notifications list, which the real seeded mock data has no
// dispatch action to produce.
jest.mock('../../../context/AppContext', () => {
  const actual = jest.requireActual('../../../context/AppContext');
  return { ...actual, useApp: jest.fn(actual.useApp) };
});
const mockUseApp = useApp as jest.Mock;
const actualUseApp = jest.requireActual('../../../context/AppContext').useApp;

const makeNotification = (overrides: Partial<Notification> = {}): Notification => ({
  id: `notif-${Math.random()}`,
  type: 'system',
  title: 'A notification',
  message: 'Something happened',
  userId: 'u1',
  createdAt: new Date().toISOString(),
  read: false,
  ...overrides,
});

// Seeds extra notifications via the real context so both NotificationList's
// plain and virtualized render paths can be exercised with the same provider.
const SeedNotifications = ({ count }: { count: number }) => {
  const { dispatch } = useApp();
  return (
    <button
      data-testid="seed"
      onClick={() => {
        for (let i = 0; i < count; i++) {
          dispatch({ type: 'ADD_NOTIFICATION', payload: makeNotification({ id: `seed-${i}` }) });
        }
      }}
    >
      seed
    </button>
  );
};

describe('NotificationList', () => {
  beforeEach(() => {
    mockUseApp.mockImplementation(actualUseApp);
  });

  it('renders the seeded notifications as a plain list', () => {
    render(
      <AppProvider>
        <NotificationList />
      </AppProvider>
    );

    expect(screen.getByText('New Task Assigned')).toBeInTheDocument();
  });

  it('shows an empty state when there are no notifications', () => {
    mockUseApp.mockReturnValue({ state: { notifications: [] }, dispatch: jest.fn() });

    render(<NotificationList />);

    expect(screen.getByText('No notifications yet')).toBeInTheDocument();
  });

  it('marks a notification as read when clicked', async () => {
    const user = userEvent.setup();
    render(
      <AppProvider>
        <NotificationList />
      </AppProvider>
    );

    expect(screen.getByText('You have 2 unread notifications')).toBeInTheDocument();

    await user.click(screen.getByText('New Task Assigned'));

    expect(screen.getByText('You have 1 unread notification')).toBeInTheDocument();
  });

  it('marks all notifications as read', async () => {
    const user = userEvent.setup();
    render(
      <AppProvider>
        <NotificationList />
      </AppProvider>
    );

    await user.click(screen.getByText('Mark all as read'));

    expect(screen.queryByText(/unread notification/)).not.toBeInTheDocument();
  });

  it('switches to the virtualized list once notifications exceed the threshold', async () => {
    // jsdom performs no real layout, so offsetHeight/offsetWidth are always
    // 0, and @tanstack/react-virtual reads exactly those (not
    // getBoundingClientRect) synchronously on mount to size its viewport -
    // it would otherwise compute zero visible rows.
    const heightSpy = jest.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(600);
    const widthSpy = jest.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(500);

    const user = userEvent.setup();
    render(
      <AppProvider>
        <SeedNotifications count={20} />
        <NotificationList />
      </AppProvider>
    );

    await act(async () => {
      await user.click(screen.getByTestId('seed'));
    });

    // The virtualized list renders inside a scrollable container; its presence
    // (rather than the plain `space-y-3` wrapper) confirms the switch happened.
    expect(document.querySelector('.virtualized-list')).toBeInTheDocument();
    // The virtualizer actually renders row content (via renderItem), not just the container.
    expect(screen.getAllByText('A notification').length).toBeGreaterThan(0);

    heightSpy.mockRestore();
    widthSpy.mockRestore();
  });
});

describe('NotificationList notification type coverage', () => {
  const SeedSpecificNotifications = () => {
    const { dispatch } = useApp();
    return (
      <button
        data-testid="seed-types"
        onClick={() => {
          dispatch({ type: 'ADD_NOTIFICATION', payload: makeNotification({ id: 'n-project', type: 'project_updated', title: 'Project Updated' }) });
          dispatch({ type: 'ADD_NOTIFICATION', payload: makeNotification({ id: 'n-system', type: 'system', title: 'System Notice' }) });
          // @ts-expect-error intentionally exercising the default-case fallback for an unrecognized type
          dispatch({ type: 'ADD_NOTIFICATION', payload: makeNotification({ id: 'n-unknown', type: 'unknown_type', title: 'Unknown Type' }) });
        }}
      >
        seed types
      </button>
    );
  };

  it('falls through to the default icon/color for project_updated, system, and unrecognized types', async () => {
    const user = userEvent.setup();
    render(
      <AppProvider>
        <SeedSpecificNotifications />
        <NotificationList />
      </AppProvider>
    );

    await user.click(screen.getByTestId('seed-types'));

    expect(screen.getByText('Project Updated')).toBeInTheDocument();
    expect(screen.getByText('System Notice')).toBeInTheDocument();
    expect(screen.getByText('Unknown Type')).toBeInTheDocument();
  });
});
