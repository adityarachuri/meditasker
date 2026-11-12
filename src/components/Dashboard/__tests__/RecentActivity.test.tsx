import { render, screen, act } from '@testing-library/react';
import { RecentActivity } from '../RecentActivity';
import { AppProvider, useApp } from '../../../context/AppContext';
import { Activity } from '../../../types';

const makeActivity = (overrides: Partial<Activity> = {}): Activity => ({
  id: `a-${Math.random()}`,
  type: 'task_created',
  title: 'Something happened',
  description: 'A thing happened',
  userId: 'u1',
  createdAt: new Date().toISOString(),
  ...overrides,
});

const SeedActivities = ({ activities }: { activities: Activity[] }) => {
  const { dispatch } = useApp();
  return (
    <button
      data-testid="seed"
      onClick={() => activities.forEach(a => dispatch({ type: 'ADD_ACTIVITY', payload: a }))}
    >
      seed
    </button>
  );
};

const renderWithActivities = (activities: Activity[]) => {
  const utils = render(
    <AppProvider>
      <SeedActivities activities={activities} />
      <RecentActivity />
    </AppProvider>
  );
  act(() => {
    utils.getByTestId('seed').click();
  });
  return utils;
};

describe('RecentActivity', () => {
  it('renders an activity description', () => {
    renderWithActivities([makeActivity({ description: 'Alice created a task' })]);

    expect(screen.getByText('Alice created a task')).toBeInTheDocument();
  });

  it.each([
    ['task_created', '📝'],
    ['task_updated', '📋'],
    ['task_completed', '✅'],
    ['project_created', '📁'],
    ['user_joined', '👋'],
  ] as const)('shows the %s icon', (type, icon) => {
    renderWithActivities([makeActivity({ type, description: `evt-${type}` })]);

    const row = screen.getByText(`evt-${type}`).closest('div')?.parentElement;
    expect(row?.textContent).toContain(icon);
  });

  it('falls back to the default icon for an unrecognized activity type', () => {
    renderWithActivities([
      makeActivity({ type: 'unknown_type' as Activity['type'], description: 'evt-unknown' }),
    ]);

    const row = screen.getByText('evt-unknown').closest('div')?.parentElement;
    expect(row?.textContent).toContain('📌');
  });

  it('only shows the 5 most recent activities', () => {
    const activities = Array.from({ length: 7 }, (_, i) => makeActivity({ description: `activity-${i}` }));
    renderWithActivities(activities);

    // AppContext prepends new activities (and these were dispatched in order,
    // so the most recent — highest index — ends up first), and the component
    // slices to the first 5.
    expect(screen.getByText('activity-6')).toBeInTheDocument();
    expect(screen.getByText('activity-2')).toBeInTheDocument();
    expect(screen.queryByText('activity-1')).not.toBeInTheDocument();
    expect(screen.queryByText('activity-0')).not.toBeInTheDocument();
  });
});
