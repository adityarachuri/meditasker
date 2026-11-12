import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TeamList } from '../TeamList';
import { AppProvider, useApp } from '../../../context/AppContext';
import { User } from '../../../types';

const makeUser = (overrides: Partial<User> = {}): User => ({
  id: `u-${Math.random()}`,
  name: 'Jane Doe',
  email: 'jane@meditasker.com',
  role: 'developer',
  department: 'Engineering',
  joinDate: '2024-01-01',
  isActive: true,
  avatar: 'https://example.com/avatar.jpg',
  ...overrides,
});

// AppContext has no action to replace the whole user list or add a new one,
// only UPDATE_USER (replace-by-id). To get a fully controlled fixture, we
// overwrite every seeded user's id with one of our fixture users' data.
const SeedUsers = ({ users }: { users: User[] }) => {
  const { state, dispatch } = useApp();
  return (
    <button
      data-testid="seed"
      onClick={() => {
        state.users.forEach((seeded, i) => {
          if (users[i]) {
            dispatch({ type: 'UPDATE_USER', payload: { ...users[i], id: seeded.id } });
          }
        });
      }}
    >
      seed
    </button>
  );
};

const renderWithUsers = (users: User[]) => {
  const utils = render(
    <AppProvider>
      <SeedUsers users={users} />
      <TeamList />
    </AppProvider>
  );
  act(() => {
    utils.getByTestId('seed').click();
  });
  return utils;
};

describe('TeamList', () => {
  it('renders team stats and member cards', () => {
    render(
      <AppProvider>
        <TeamList />
      </AppProvider>
    );

    expect(screen.getByText('Total Members')).toBeInTheDocument();
    expect(screen.getByText('Active Members')).toBeInTheDocument();
    expect(screen.getByText('Departments')).toBeInTheDocument();
  });

  // Mounting AppProvider plus several dispatch cycles and a real
  // userEvent interaction can run close to Jest's default 5s timeout under
  // load; give it more headroom to avoid environment-driven flakiness.
  it('filters by role', async () => {
    const user = userEvent.setup();
    renderWithUsers([
      makeUser({ name: 'Admin Person', role: 'admin' }),
      makeUser({ name: 'Dev Person', role: 'developer' }),
    ]);

    await user.selectOptions(screen.getByRole('combobox'), 'admin');

    expect(screen.getByText('Admin Person')).toBeInTheDocument();
    expect(screen.queryByText('Dev Person')).not.toBeInTheDocument();
  }, 15000);

  it('filters by search query across name, email, and department', async () => {
    const user = userEvent.setup();
    renderWithUsers([
      makeUser({ name: 'Findable Person', email: 'findable@meditasker.com', department: 'Engineering' }),
      makeUser({ name: 'Other Person', email: 'other@meditasker.com', department: 'Sales' }),
    ]);

    await user.type(screen.getByPlaceholderText('Search team members...'), 'findable');

    expect(screen.getByText('Findable Person')).toBeInTheDocument();
    expect(screen.queryByText('Other Person')).not.toBeInTheDocument();
  }, 15000);

  it('shows the empty state when no member matches the filters', async () => {
    const user = userEvent.setup();
    render(
      <AppProvider>
        <TeamList />
      </AppProvider>
    );

    await user.type(screen.getByPlaceholderText('Search team members...'), 'zzz-nobody-matches-zzz');

    expect(screen.getByText('No team members found matching your criteria.')).toBeInTheDocument();
  });
});
