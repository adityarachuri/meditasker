import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NotificationList } from '../NotificationList';
import { AppProvider, useApp } from '../../../context/AppContext';
import { Notification } from '../../../types';

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
  it('renders the seeded notifications as a plain list', () => {
    render(
      <AppProvider>
        <NotificationList />
      </AppProvider>
    );

    expect(screen.getByText('New Task Assigned')).toBeInTheDocument();
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
  });
});
