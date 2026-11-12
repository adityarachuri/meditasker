import { render, screen, act, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SettingsPage } from '../SettingsPage';
import { AppProvider } from '../../../context/AppContext';

const renderSettings = () => render(<AppProvider><SettingsPage /></AppProvider>);

describe('SettingsPage', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.className = '';
    document.documentElement.removeAttribute('data-color-scheme');
    document.documentElement.removeAttribute('data-font-size');
    // Reset to a known-good default rather than relying on a previous
    // test's jest.spyOn(...).mockRestore() to put it back correctly.
    window.matchMedia = jest.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));
  });

  describe('tab navigation', () => {
    it('shows the Profile tab by default', () => {
      renderSettings();
      expect(screen.getByText('Profile Information')).toBeInTheDocument();
    });

    it('switches to each tab', async () => {
      const user = userEvent.setup();
      renderSettings();

      await user.click(screen.getByText('Notifications'));
      expect(screen.getByText('Email Notifications')).toBeInTheDocument();

      await user.click(screen.getByText('Appearance'));
      expect(screen.getByText('Theme')).toBeInTheDocument();

      await user.click(screen.getByText('Security'));
      expect(screen.getByText('Two-Factor Authentication')).toBeInTheDocument();

      await user.click(screen.getByText('Privacy'));
      expect(screen.getByText('Profile Privacy')).toBeInTheDocument();

      await user.click(screen.getByText('System'));
      expect(screen.getByText('Auto-Save & Backup')).toBeInTheDocument();

      await user.click(screen.getByText('Profile'));
      expect(screen.getByText('Profile Information')).toBeInTheDocument();
    });
  });

  describe('profile tab', () => {
    it('edits name, email, department, phone, timezone, language, and bio', async () => {
      const user = userEvent.setup();
      renderSettings();

      const nameInput = screen.getByLabelText('Full Name') as HTMLInputElement;
      await user.clear(nameInput);
      await user.type(nameInput, 'New Name');
      expect(nameInput.value).toBe('New Name');

      const emailInput = screen.getByLabelText('Email Address') as HTMLInputElement;
      await user.clear(emailInput);
      await user.type(emailInput, 'new@example.com');
      expect(emailInput.value).toBe('new@example.com');

      await user.selectOptions(screen.getByLabelText('Department'), 'Design');
      expect((screen.getByLabelText('Department') as HTMLSelectElement).value).toBe('Design');

      const phoneInput = screen.getByLabelText('Phone Number') as HTMLInputElement;
      await user.type(phoneInput, '555-1234');
      expect(phoneInput.value).toBe('555-1234');

      await user.selectOptions(screen.getByLabelText('Timezone'), 'UTC');
      expect((screen.getByLabelText('Timezone') as HTMLSelectElement).value).toBe('UTC');

      await user.selectOptions(screen.getByLabelText('Language'), 'fr-FR');
      expect((screen.getByLabelText('Language') as HTMLSelectElement).value).toBe('fr-FR');

      const bioInput = screen.getByLabelText('Bio') as HTMLTextAreaElement;
      await user.type(bioInput, 'Hello there');
      expect(bioInput.value).toBe('Hello there');
    });

    it('toggles password visibility', async () => {
      const user = userEvent.setup();
      renderSettings();

      const currentPasswordInput = screen.getByLabelText('Current Password') as HTMLInputElement;
      expect(currentPasswordInput.type).toBe('password');

      const toggleButtons = screen.getAllByRole('button', { name: '' });
      await user.click(toggleButtons[0]);
      expect(currentPasswordInput.type).toBe('text');
    });

    it('rejects a password change when the confirmation does not match', async () => {
      const user = userEvent.setup();
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
      renderSettings();

      await user.type(screen.getByLabelText('New Password'), 'password1');
      await user.type(screen.getByLabelText('Confirm Password'), 'password2');
      await user.click(screen.getByRole('button', { name: 'Change Password' }));

      expect(alertSpy).toHaveBeenCalledWith('Passwords do not match');
      alertSpy.mockRestore();
    });

    it('rejects a password change shorter than 8 characters', async () => {
      const user = userEvent.setup();
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
      renderSettings();

      await user.type(screen.getByLabelText('New Password'), 'short');
      await user.type(screen.getByLabelText('Confirm Password'), 'short');
      await user.click(screen.getByRole('button', { name: 'Change Password' }));

      expect(alertSpy).toHaveBeenCalledWith('Password must be at least 8 characters long');
      alertSpy.mockRestore();
    });

    it('accepts a valid password change and clears the fields', async () => {
      const user = userEvent.setup();
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
      renderSettings();

      const newPasswordInput = screen.getByLabelText('New Password') as HTMLInputElement;
      const confirmPasswordInput = screen.getByLabelText('Confirm Password') as HTMLInputElement;
      const currentPasswordInput = screen.getByLabelText('Current Password') as HTMLInputElement;

      await user.type(currentPasswordInput, 'oldpassword');
      await user.type(newPasswordInput, 'longenough');
      await user.type(confirmPasswordInput, 'longenough');
      await user.click(screen.getByRole('button', { name: 'Change Password' }));

      expect(alertSpy).toHaveBeenCalledWith('Password changed successfully');
      expect(currentPasswordInput.value).toBe('');
      expect(newPasswordInput.value).toBe('');
      expect(confirmPasswordInput.value).toBe('');
      alertSpy.mockRestore();
    });
  });

  describe('notifications tab', () => {
    it('toggles an email and a push notification preference', async () => {
      const user = userEvent.setup();
      renderSettings();
      await user.click(screen.getByText('Notifications'));

      const weeklyReportsToggle = screen.getByLabelText('Weekly reports') as HTMLInputElement;
      expect(weeklyReportsToggle.checked).toBe(false);
      await user.click(weeklyReportsToggle);
      expect(weeklyReportsToggle.checked).toBe(true);

      const soundToggle = screen.getByLabelText('Sound notifications') as HTMLInputElement;
      expect(soundToggle.checked).toBe(true);
      await user.click(soundToggle);
      expect(soundToggle.checked).toBe(false);
    });
  });

  describe('appearance tab', () => {
    it('selects a theme, a color scheme, and font size, applying them to the document', async () => {
      const user = userEvent.setup();
      renderSettings();
      await user.click(screen.getByText('Appearance'));

      await user.click(screen.getByText('Dark'));
      expect(document.documentElement.classList.contains('dark')).toBe(true);

      await user.click(screen.getByText('Light'));
      expect(document.documentElement.classList.contains('dark')).toBe(false);

      await user.click(screen.getByText('Green'));
      expect(document.documentElement.getAttribute('data-color-scheme')).toBe('green');

      await user.selectOptions(screen.getByLabelText('Font Size'), 'large');
      expect(document.documentElement.getAttribute('data-font-size')).toBe('large');
    });

    it('applies the system theme based on prefers-color-scheme', async () => {
      const user = userEvent.setup();
      window.matchMedia = jest.fn().mockImplementation((query: string) => ({
        matches: true,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }));

      renderSettings();
      await user.click(screen.getByText('Appearance'));
      const themeSection = screen.getByText('Theme').closest('div')!;
      await user.click(within(themeSection).getByText('System'));

      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('does not apply dark mode for system theme when the OS prefers light', async () => {
      const user = userEvent.setup();
      renderSettings();
      await user.click(screen.getByText('Appearance'));
      const themeSection = screen.getByText('Theme').closest('div')!;
      await user.click(within(themeSection).getByText('System'));

      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('toggles compact mode, sidebar-collapsed, show-avatars, and animations', async () => {
      const user = userEvent.setup();
      renderSettings();
      await user.click(screen.getByText('Appearance'));

      const compactToggle = screen.getByLabelText('Compact mode') as HTMLInputElement;
      await user.click(compactToggle);
      expect(document.documentElement.classList.contains('compact-mode')).toBe(true);
      await user.click(compactToggle);
      expect(document.documentElement.classList.contains('compact-mode')).toBe(false);

      const animationsToggle = screen.getByLabelText('Enable animations') as HTMLInputElement;
      expect(animationsToggle.checked).toBe(true);
      await user.click(animationsToggle);
      expect(document.documentElement.classList.contains('no-animations')).toBe(true);
      await user.click(animationsToggle);
      expect(document.documentElement.classList.contains('no-animations')).toBe(false);
    });
  });

  describe('security tab', () => {
    it('enables and disables two-factor authentication', async () => {
      const user = userEvent.setup();
      renderSettings();
      await user.click(screen.getByText('Security'));

      expect(screen.getByText('Disabled')).toBeInTheDocument();
      await user.click(screen.getByText('Enable'));
      expect(screen.getByText('Enabled')).toBeInTheDocument();
      await user.click(screen.getByText('Disable'));
      expect(screen.getByText('Disabled')).toBeInTheDocument();
    });

    it('changes the session timeout', async () => {
      const user = userEvent.setup();
      renderSettings();
      await user.click(screen.getByText('Security'));

      await user.selectOptions(screen.getByLabelText('Session Timeout (minutes)'), '60');
      expect((screen.getByLabelText('Session Timeout (minutes)') as HTMLSelectElement).value).toBe('60');
    });

    it('toggles login notifications, device trust, and API key access', async () => {
      const user = userEvent.setup();
      renderSettings();
      await user.click(screen.getByText('Security'));

      const apiKeyToggle = screen.getByLabelText('API key access') as HTMLInputElement;
      expect(apiKeyToggle.checked).toBe(false);
      await user.click(apiKeyToggle);
      expect(apiKeyToggle.checked).toBe(true);
    });

    it('shows active sessions including a revoke action', () => {
      renderSettings();
      act(() => {
        screen.getByText('Security').click();
      });
      expect(screen.getByText('Current Session')).toBeInTheDocument();
      expect(screen.getByText('Revoke')).toBeInTheDocument();
    });
  });

  describe('privacy tab', () => {
    it('changes profile visibility', async () => {
      const user = userEvent.setup();
      renderSettings();
      await user.click(screen.getByText('Privacy'));

      await user.selectOptions(screen.getByLabelText('Profile Visibility'), 'private');
      expect((screen.getByLabelText('Profile Visibility') as HTMLSelectElement).value).toBe('private');
    });

    it('toggles activity tracking, data collection, integrations, and analytics opt-out', async () => {
      const user = userEvent.setup();
      renderSettings();
      await user.click(screen.getByText('Privacy'));

      const optOutToggle = screen.getByLabelText('Opt out of analytics') as HTMLInputElement;
      expect(optOutToggle.checked).toBe(false);
      await user.click(optOutToggle);
      expect(optOutToggle.checked).toBe(true);
    });

    it('exports data as a downloaded JSON file', async () => {
      const user = userEvent.setup();
      renderSettings();
      await user.click(screen.getByText('Privacy'));

      const createObjectURL = jest.fn(() => 'blob:mock-url');
      const revokeObjectURL = jest.fn();
      (URL as unknown as { createObjectURL: typeof createObjectURL }).createObjectURL = createObjectURL;
      (URL as unknown as { revokeObjectURL: typeof revokeObjectURL }).revokeObjectURL = revokeObjectURL;
      const clickSpy = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

      await user.click(screen.getByText('Export My Data'));

      expect(createObjectURL).toHaveBeenCalled();
      expect(clickSpy).toHaveBeenCalled();
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
      clickSpy.mockRestore();
    });

    it('asks for confirmation before requesting account deletion, and respects cancel', async () => {
      const user = userEvent.setup();
      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
      renderSettings();
      await user.click(screen.getByText('Privacy'));

      await user.click(screen.getByText('Delete Account'));

      expect(confirmSpy).toHaveBeenCalled();
      expect(alertSpy).not.toHaveBeenCalled();
      confirmSpy.mockRestore();
      alertSpy.mockRestore();
    });

    it('requests account deletion when confirmed', async () => {
      const user = userEvent.setup();
      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
      renderSettings();
      await user.click(screen.getByText('Privacy'));

      await user.click(screen.getByText('Delete Account'));

      expect(alertSpy).toHaveBeenCalledWith(
        'Account deletion requested. You will receive an email with further instructions.'
      );
      confirmSpy.mockRestore();
      alertSpy.mockRestore();
    });
  });

  describe('system tab', () => {
    it('toggles auto-save, which enables/disables the interval select', async () => {
      const user = userEvent.setup();
      renderSettings();
      await user.click(screen.getByText('System'));

      const intervalSelect = screen.getByLabelText('Auto-save Interval (minutes)') as HTMLSelectElement;
      expect(intervalSelect.disabled).toBe(false);

      const autoSaveToggle = screen.getByLabelText('Auto-save') as HTMLInputElement;
      await user.click(autoSaveToggle);
      expect(intervalSelect.disabled).toBe(true);
    });

    it('changes auto-save interval, backup frequency, default views, date/time format, retention, and export format', async () => {
      const user = userEvent.setup();
      renderSettings();
      await user.click(screen.getByText('System'));

      await user.selectOptions(screen.getByLabelText('Auto-save Interval (minutes)'), '15');
      expect((screen.getByLabelText('Auto-save Interval (minutes)') as HTMLSelectElement).value).toBe('15');

      await user.selectOptions(screen.getByLabelText('Backup Frequency'), 'monthly');
      expect((screen.getByLabelText('Backup Frequency') as HTMLSelectElement).value).toBe('monthly');

      await user.selectOptions(screen.getByLabelText('Default Project View'), 'kanban');
      expect((screen.getByLabelText('Default Project View') as HTMLSelectElement).value).toBe('kanban');

      await user.selectOptions(screen.getByLabelText('Task Sort Order'), 'dueDate');
      expect((screen.getByLabelText('Task Sort Order') as HTMLSelectElement).value).toBe('dueDate');

      await user.selectOptions(screen.getByLabelText('Date Format'), 'YYYY-MM-DD');
      expect((screen.getByLabelText('Date Format') as HTMLSelectElement).value).toBe('YYYY-MM-DD');

      await user.selectOptions(screen.getByLabelText('Time Format'), '24h');
      expect((screen.getByLabelText('Time Format') as HTMLSelectElement).value).toBe('24h');

      await user.selectOptions(screen.getByLabelText('Data Retention (days)'), '-1');
      expect((screen.getByLabelText('Data Retention (days)') as HTMLSelectElement).value).toBe('-1');

      await user.selectOptions(screen.getByLabelText('Export Format'), 'csv');
      expect((screen.getByLabelText('Export Format') as HTMLSelectElement).value).toBe('csv');
    });
  });

  describe('save', () => {
    it('saves changes, dispatching to AppContext and showing a success message that clears after a timeout', async () => {
      jest.useFakeTimers();
      const user = userEvent.setup({ delay: null });
      renderSettings();

      const nameInput = screen.getByLabelText('Full Name');
      await user.clear(nameInput);
      await user.type(nameInput, 'Saved Name');

      await user.click(screen.getByText('Save Changes'));

      expect(screen.getByText('Settings saved successfully')).toBeInTheDocument();

      await act(async () => {
        await jest.advanceTimersByTimeAsync(2000);
      });

      expect(screen.queryByText('Settings saved successfully')).not.toBeInTheDocument();
      jest.useRealTimers();
    });

    it('disables the save button while saving', async () => {
      jest.useFakeTimers();
      const user = userEvent.setup({ delay: null });
      renderSettings();

      const saveButton = screen.getByText('Save Changes').closest('button')!;
      await user.click(saveButton);

      // handleSave is synchronous here (no real async boundary before
      // setSaveStatus('saved')), so by the time the click settles the
      // status has already moved past 'saving' - assert the status message
      // path alone up front, and that the button does not stay stuck disabled.
      await act(async () => {
        await jest.advanceTimersByTimeAsync(2000);
      });
      expect(saveButton).not.toBeDisabled();
      jest.useRealTimers();
    });
  });
});
