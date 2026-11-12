import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SettingsPage } from '../SettingsPage';
import { mockUsers } from '../../../data/mockData';

// Isolated from the main SettingsPage.test.tsx: mocks useApp directly so
// dispatch throws, exercising handleSave's catch branch (real AppContext
// actions never throw, so this path can't be reached through the real
// provider).
jest.mock('../../../context/AppContext', () => ({
  useApp: () => ({
    state: {
      currentUser: mockUsers[0],
      settings: {
        theme: 'light',
        colorScheme: 'blue',
        fontSize: 'medium',
        compactMode: false,
        sidebarCollapsed: false,
        showAvatars: true,
        animationsEnabled: true,
      },
      projects: [],
      tasks: [],
    },
    dispatch: () => {
      throw new Error('dispatch failed');
    },
  }),
}));

describe('SettingsPage save error handling', () => {
  it('shows an error message when saving fails, then clears it after a timeout', async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ delay: null });
    render(<SettingsPage />);

    await user.click(screen.getByText('Save Changes'));

    expect(screen.getByText('Error saving settings')).toBeInTheDocument();

    await act(async () => {
      await jest.advanceTimersByTimeAsync(2000);
    });

    expect(screen.queryByText('Error saving settings')).not.toBeInTheDocument();
    jest.useRealTimers();
  });
});
