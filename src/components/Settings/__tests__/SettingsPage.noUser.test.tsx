import { render, screen } from '@testing-library/react';
import { SettingsPage } from '../SettingsPage';

// Isolated from the main SettingsPage.test.tsx: mocks useApp directly so
// currentUser is null on first mount, exercising the `state.currentUser?.x
// || ''` fallbacks. The real AppProvider always seeds a non-null
// currentUser, and localSettings' initial profile values are only computed
// once (on mount) - so this can't be reached through the real provider at
// any point after mount either.
jest.mock('../../../context/AppContext', () => ({
  useApp: () => ({
    state: {
      currentUser: null,
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
    dispatch: jest.fn(),
  }),
}));

describe('SettingsPage with no current user', () => {
  it('falls back to empty strings for all profile fields', () => {
    render(<SettingsPage />);

    expect((screen.getByLabelText('Full Name') as HTMLInputElement).value).toBe('');
    expect((screen.getByLabelText('Email Address') as HTMLInputElement).value).toBe('');
  });
});
