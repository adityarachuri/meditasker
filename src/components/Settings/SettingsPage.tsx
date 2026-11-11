import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { User as UserType } from '../../types';
import {
  User,
  Bell,
  Shield,
  Palette,
  Database,
  Download,
  Trash2,
  Save,
  Eye,
  EyeOff,
  Smartphone,
  Monitor,
  Moon,
  Sun,
  Lock,
  RefreshCw,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';

interface SettingsState {
  profile: {
    name: string;
    email: string;
    avatar: string;
    department: string;
    role: string;
    timezone: string;
    language: string;
    phoneNumber: string;
    bio: string;
  };
  notifications: {
    emailNotifications: boolean;
    pushNotifications: boolean;
    taskAssignments: boolean;
    projectUpdates: boolean;
    deadlineReminders: boolean;
    weeklyReports: boolean;
    systemMaintenance: boolean;
    soundEnabled: boolean;
    desktopNotifications: boolean;
  };
  appearance: {
    theme: 'light' | 'dark' | 'system';
    colorScheme: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'pink' | 'indigo' | 'teal' | 'cyan' | 'amber' | 'lime' | 'emerald';
    fontSize: 'small' | 'medium' | 'large';
    compactMode: boolean;
    sidebarCollapsed: boolean;
    showAvatars: boolean;
    animationsEnabled: boolean;
  };
  security: {
    twoFactorEnabled: boolean;
    sessionTimeout: number;
    passwordChangeRequired: boolean;
    loginNotifications: boolean;
    deviceTrust: boolean;
    ipWhitelist: string[];
    apiKeyAccess: boolean;
  };
  privacy: {
    profileVisibility: 'public' | 'team' | 'private';
    activityTracking: boolean;
    dataCollection: boolean;
    thirdPartyIntegrations: boolean;
    analyticsOptOut: boolean;
  };
  system: {
    autoSave: boolean;
    autoSaveInterval: number;
    backupFrequency: 'daily' | 'weekly' | 'monthly';
    dataRetention: number;
    exportFormat: 'json' | 'csv' | 'pdf';
    defaultProjectView: 'list' | 'grid' | 'kanban';
    taskSortOrder: 'priority' | 'dueDate' | 'created' | 'alphabetical';
    dateFormat: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';
    timeFormat: '12h' | '24h';
  };
}

export function SettingsPage() {
  const { state, dispatch } = useApp();
  const [activeTab, setActiveTab] = useState('profile');
  const [showPassword, setShowPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const [localSettings, setLocalSettings] = useState<SettingsState>({
    profile: {
      name: state.currentUser?.name || '',
      email: state.currentUser?.email || '',
      avatar: state.currentUser?.avatar || '',
      department: state.currentUser?.department || '',
      role: state.currentUser?.role || '',
      timezone: 'America/New_York',
      language: 'en-US',
      phoneNumber: '',
      bio: '',
    },
    notifications: {
      emailNotifications: true,
      pushNotifications: true,
      taskAssignments: true,
      projectUpdates: true,
      deadlineReminders: true,
      weeklyReports: false,
      systemMaintenance: true,
      soundEnabled: true,
      desktopNotifications: true,
    },
    appearance: {
      theme: state.settings.theme,
      colorScheme: state.settings.colorScheme,
      fontSize: state.settings.fontSize,
      compactMode: state.settings.compactMode,
      sidebarCollapsed: state.settings.sidebarCollapsed,
      showAvatars: state.settings.showAvatars,
      animationsEnabled: state.settings.animationsEnabled,
    },
    security: {
      twoFactorEnabled: false,
      sessionTimeout: 480, // 8 hours in minutes
      passwordChangeRequired: false,
      loginNotifications: true,
      deviceTrust: true,
      ipWhitelist: [],
      apiKeyAccess: false,
    },
    privacy: {
      profileVisibility: 'team',
      activityTracking: true,
      dataCollection: true,
      thirdPartyIntegrations: true,
      analyticsOptOut: false,
    },
    system: {
      autoSave: true,
      autoSaveInterval: 5,
      backupFrequency: 'daily',
      dataRetention: 365,
      exportFormat: 'pdf',
      defaultProjectView: 'grid',
      taskSortOrder: 'priority',
      dateFormat: 'MM/DD/YYYY',
      timeFormat: '12h',
    },
  });

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'privacy', label: 'Privacy', icon: Lock },
    { id: 'system', label: 'System', icon: Database },
  ];

  const handleSave = async () => {
    setSaveStatus('saving');
    
    try {
      // Update user in context
      if (state.currentUser) {
        dispatch({
          type: 'SET_CURRENT_USER',
          payload: {
            ...state.currentUser,
            name: localSettings.profile.name,
            email: localSettings.profile.email,
            avatar: localSettings.profile.avatar,
            department: localSettings.profile.department,
            role: localSettings.profile.role as UserType['role'],
          },
        });
      }

      // Update appearance settings in context
      dispatch({
        type: 'UPDATE_SETTINGS',
        payload: localSettings.appearance,
      });

      // Apply theme changes immediately
      applyThemeChanges(localSettings.appearance);
      
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }
  };

  const applyThemeChanges = (appearance: SettingsState['appearance']) => {
    const root = document.documentElement;
    
    // Apply theme
    if (appearance.theme === 'dark') {
      root.classList.add('dark');
    } else if (appearance.theme === 'light') {
      root.classList.remove('dark');
    } else {
      // System theme
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }

    // Apply color scheme
    root.setAttribute('data-color-scheme', appearance.colorScheme);

    // Apply font size
    root.setAttribute('data-font-size', appearance.fontSize);

    // Apply compact mode
    if (appearance.compactMode) {
      root.classList.add('compact-mode');
    } else {
      root.classList.remove('compact-mode');
    }

    // Apply animations
    if (!appearance.animationsEnabled) {
      root.classList.add('no-animations');
    } else {
      root.classList.remove('no-animations');
    }

    // Force a repaint to ensure styles are applied
    root.style.display = 'none';
    void root.offsetHeight; // Trigger reflow
    root.style.display = '';
  };

  const handlePasswordChange = () => {
    if (newPassword !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      alert('Password must be at least 8 characters long');
      return;
    }
    
    // Simulate password change
    alert('Password changed successfully');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleExportData = () => {
    const exportData = {
      profile: localSettings.profile,
      projects: state.projects,
      tasks: state.tasks,
      exportedAt: new Date().toISOString(),
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `softique-health-insure-data-export-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDeleteAccount = () => {
    if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      alert('Account deletion requested. You will receive an email with further instructions.');
    }
  };

  const renderProfileSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Profile Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
            <input
              type="text"
              value={localSettings.profile.name}
              onChange={(e) => setLocalSettings({
                ...localSettings,
                profile: { ...localSettings.profile, name: e.target.value }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
            <input
              type="email"
              value={localSettings.profile.email}
              onChange={(e) => setLocalSettings({
                ...localSettings,
                profile: { ...localSettings.profile, email: e.target.value }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
            <select
              value={localSettings.profile.department}
              onChange={(e) => setLocalSettings({
                ...localSettings,
                profile: { ...localSettings.profile, department: e.target.value }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="Product Engineering">Product Engineering</option>
              <option value="Quality Assurance">Quality Assurance</option>
              <option value="Administration">Administration</option>
              <option value="Design">Design</option>
              <option value="DevOps">DevOps</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
            <input
              type="tel"
              value={localSettings.profile.phoneNumber}
              onChange={(e) => setLocalSettings({
                ...localSettings,
                profile: { ...localSettings.profile, phoneNumber: e.target.value }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Timezone</label>
            <select
              value={localSettings.profile.timezone}
              onChange={(e) => setLocalSettings({
                ...localSettings,
                profile: { ...localSettings.profile, timezone: e.target.value }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="America/New_York">Eastern Time (ET)</option>
              <option value="America/Chicago">Central Time (CT)</option>
              <option value="America/Denver">Mountain Time (MT)</option>
              <option value="America/Los_Angeles">Pacific Time (PT)</option>
              <option value="UTC">UTC</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
            <select
              value={localSettings.profile.language}
              onChange={(e) => setLocalSettings({
                ...localSettings,
                profile: { ...localSettings.profile, language: e.target.value }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="en-US">English (US)</option>
              <option value="en-GB">English (UK)</option>
              <option value="es-ES">Spanish</option>
              <option value="fr-FR">French</option>
              <option value="de-DE">German</option>
            </select>
          </div>
        </div>
        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Bio</label>
          <textarea
            value={localSettings.profile.bio}
            onChange={(e) => setLocalSettings({
              ...localSettings,
              profile: { ...localSettings.profile, bio: e.target.value }
            })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Tell us about yourself..."
          />
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Change Password</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Current Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password</label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
        <button
          onClick={handlePasswordChange}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Change Password
        </button>
      </div>
    </div>
  );

  const renderNotificationSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Email Notifications</h3>
        <div className="space-y-4">
          {[
            { key: 'emailNotifications', label: 'Enable email notifications', description: 'Receive notifications via email' },
            { key: 'taskAssignments', label: 'Task assignments', description: 'When you are assigned to a new task' },
            { key: 'projectUpdates', label: 'Project updates', description: 'When projects you are involved in are updated' },
            { key: 'deadlineReminders', label: 'Deadline reminders', description: 'Reminders for upcoming task deadlines' },
            { key: 'weeklyReports', label: 'Weekly reports', description: 'Weekly summary of your projects and tasks' },
            { key: 'systemMaintenance', label: 'System maintenance', description: 'Notifications about system updates and maintenance' },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h4 className="text-sm font-medium text-gray-900">{item.label}</h4>
                <p className="text-sm text-gray-600">{item.description}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={localSettings.notifications[item.key as keyof typeof localSettings.notifications] as boolean}
                  onChange={(e) => setLocalSettings({
                    ...localSettings,
                    notifications: {
                      ...localSettings.notifications,
                      [item.key]: e.target.checked
                    }
                  })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Push Notifications</h3>
        <div className="space-y-4">
          {[
            { key: 'pushNotifications', label: 'Enable push notifications', description: 'Receive notifications on your device' },
            { key: 'desktopNotifications', label: 'Desktop notifications', description: 'Show notifications on your desktop' },
            { key: 'soundEnabled', label: 'Sound notifications', description: 'Play sound for notifications' },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h4 className="text-sm font-medium text-gray-900">{item.label}</h4>
                <p className="text-sm text-gray-600">{item.description}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={localSettings.notifications[item.key as keyof typeof localSettings.notifications] as boolean}
                  onChange={(e) => setLocalSettings({
                    ...localSettings,
                    notifications: {
                      ...localSettings.notifications,
                      [item.key]: e.target.checked
                    }
                  })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderAppearanceSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Theme</h3>
        <div className="grid grid-cols-3 gap-4">
          {[
            { value: 'light', label: 'Light', icon: Sun },
            { value: 'dark', label: 'Dark', icon: Moon },
            { value: 'system', label: 'System', icon: Monitor },
          ].map((theme) => {
            const Icon = theme.icon;
            return (
              <button
                key={theme.value}
                onClick={() => {
                  const newSettings = {
                    ...localSettings,
                    appearance: { ...localSettings.appearance, theme: theme.value as SettingsState['appearance']['theme'] }
                  };
                  setLocalSettings(newSettings);
                  // Apply theme immediately for preview
                  applyThemeChanges(newSettings.appearance);
                }}
                className={`p-4 border-2 rounded-lg flex flex-col items-center space-y-2 transition-colors ${
                  localSettings.appearance.theme === theme.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Icon className="w-6 h-6" />
                <span className="text-sm font-medium">{theme.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Color Scheme</h3>
        <div className="grid grid-cols-4 gap-4">
          {[
            { value: 'blue', label: 'Blue', color: 'bg-blue-500' },
            { value: 'green', label: 'Green', color: 'bg-green-500' },
            { value: 'purple', label: 'Purple', color: 'bg-purple-500' },
            { value: 'orange', label: 'Orange', color: 'bg-orange-500' },
            { value: 'red', label: 'Red', color: 'bg-red-500' },
            { value: 'pink', label: 'Pink', color: 'bg-pink-500' },
            { value: 'indigo', label: 'Indigo', color: 'bg-indigo-500' },
            { value: 'teal', label: 'Teal', color: 'bg-teal-500' },
            { value: 'cyan', label: 'Cyan', color: 'bg-cyan-500' },
            { value: 'amber', label: 'Amber', color: 'bg-amber-500' },
            { value: 'lime', label: 'Lime', color: 'bg-lime-500' },
            { value: 'emerald', label: 'Emerald', color: 'bg-emerald-500' },
          ].map((color) => (
            <button
              key={color.value}
              onClick={() => {
                const newSettings = {
                  ...localSettings,
                  appearance: { ...localSettings.appearance, colorScheme: color.value as SettingsState['appearance']['colorScheme'] }
                };
                setLocalSettings(newSettings);
                // Apply color scheme immediately for preview
                applyThemeChanges(newSettings.appearance);
              }}
              className={`p-4 border-2 rounded-lg flex flex-col items-center space-y-2 transition-colors ${
                localSettings.appearance.colorScheme === color.value
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className={`w-6 h-6 rounded-full ${color.color}`} />
              <span className="text-sm font-medium">{color.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Display Options</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Font Size</label>
            <select
              value={localSettings.appearance.fontSize}
              onChange={(e) => {
                const newSettings = {
                  ...localSettings,
                  appearance: { ...localSettings.appearance, fontSize: e.target.value as SettingsState['appearance']['fontSize'] }
                };
                setLocalSettings(newSettings);
                // Apply font size immediately for preview
                applyThemeChanges(newSettings.appearance);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
            </select>
          </div>
          
          {[
            { key: 'compactMode', label: 'Compact mode', description: 'Reduce spacing and padding for more content' },
            { key: 'sidebarCollapsed', label: 'Collapse sidebar by default', description: 'Start with sidebar collapsed' },
            { key: 'showAvatars', label: 'Show user avatars', description: 'Display user profile pictures' },
            { key: 'animationsEnabled', label: 'Enable animations', description: 'Show smooth transitions and animations' },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h4 className="text-sm font-medium text-gray-900">{item.label}</h4>
                <p className="text-sm text-gray-600">{item.description}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={localSettings.appearance[item.key as keyof typeof localSettings.appearance] as boolean}
                  onChange={(e) => {
                    const newSettings = {
                      ...localSettings,
                      appearance: {
                        ...localSettings.appearance,
                        [item.key]: e.target.checked
                      }
                    };
                    setLocalSettings(newSettings);
                    // Apply changes immediately for preview
                    applyThemeChanges(newSettings.appearance);
                  }}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderSecuritySettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Authentication</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h4 className="text-sm font-medium text-gray-900">Two-Factor Authentication</h4>
              <p className="text-sm text-gray-600">Add an extra layer of security to your account</p>
            </div>
            <div className="flex items-center space-x-3">
              <span className={`text-sm ${localSettings.security.twoFactorEnabled ? 'text-green-600' : 'text-gray-500'}`}>
                {localSettings.security.twoFactorEnabled ? 'Enabled' : 'Disabled'}
              </span>
              <button
                onClick={() => setLocalSettings({
                  ...localSettings,
                  security: { ...localSettings.security, twoFactorEnabled: !localSettings.security.twoFactorEnabled }
                })}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  localSettings.security.twoFactorEnabled
                    ? 'bg-red-100 text-red-700 hover:bg-red-200'
                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                }`}
              >
                {localSettings.security.twoFactorEnabled ? 'Disable' : 'Enable'}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Session Timeout (minutes)</label>
            <select
              value={localSettings.security.sessionTimeout}
              onChange={(e) => setLocalSettings({
                ...localSettings,
                security: { ...localSettings.security, sessionTimeout: parseInt(e.target.value) }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value={30}>30 minutes</option>
              <option value={60}>1 hour</option>
              <option value={240}>4 hours</option>
              <option value={480}>8 hours</option>
              <option value={1440}>24 hours</option>
            </select>
          </div>

          {[
            { key: 'loginNotifications', label: 'Login notifications', description: 'Get notified when someone logs into your account' },
            { key: 'deviceTrust', label: 'Device trust', description: 'Remember trusted devices for faster login' },
            { key: 'apiKeyAccess', label: 'API key access', description: 'Allow API access with generated keys' },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h4 className="text-sm font-medium text-gray-900">{item.label}</h4>
                <p className="text-sm text-gray-600">{item.description}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={localSettings.security[item.key as keyof typeof localSettings.security] as boolean}
                  onChange={(e) => setLocalSettings({
                    ...localSettings,
                    security: {
                      ...localSettings.security,
                      [item.key]: e.target.checked
                    }
                  })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Active Sessions</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3">
              <Monitor className="w-5 h-5 text-gray-400" />
              <div>
                <h4 className="text-sm font-medium text-gray-900">Current Session</h4>
                <p className="text-sm text-gray-600">Chrome on Windows • New York, NY</p>
              </div>
            </div>
            <span className="text-sm text-green-600 font-medium">Active</span>
          </div>
          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3">
              <Smartphone className="w-5 h-5 text-gray-400" />
              <div>
                <h4 className="text-sm font-medium text-gray-900">Mobile App</h4>
                <p className="text-sm text-gray-600">iPhone • Last active 2 hours ago</p>
              </div>
            </div>
            <button className="text-sm text-red-600 hover:text-red-700">Revoke</button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderPrivacySettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Profile Privacy</h3>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Profile Visibility</label>
          <select
            value={localSettings.privacy.profileVisibility}
            onChange={(e) => setLocalSettings({
              ...localSettings,
              privacy: { ...localSettings.privacy, profileVisibility: e.target.value as SettingsState['privacy']['profileVisibility'] }
            })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="public">Public - Visible to everyone</option>
            <option value="team">Team - Visible to team members only</option>
            <option value="private">Private - Only visible to you</option>
          </select>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Data & Analytics</h3>
        <div className="space-y-4">
          {[
            { key: 'activityTracking', label: 'Activity tracking', description: 'Track your activity for productivity insights' },
            { key: 'dataCollection', label: 'Data collection', description: 'Allow collection of usage data to improve the service' },
            { key: 'thirdPartyIntegrations', label: 'Third-party integrations', description: 'Allow data sharing with integrated services' },
            { key: 'analyticsOptOut', label: 'Opt out of analytics', description: 'Exclude your data from analytics and reporting' },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h4 className="text-sm font-medium text-gray-900">{item.label}</h4>
                <p className="text-sm text-gray-600">{item.description}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={localSettings.privacy[item.key as keyof typeof localSettings.privacy] as boolean}
                  onChange={(e) => setLocalSettings({
                    ...localSettings,
                    privacy: {
                      ...localSettings.privacy,
                      [item.key]: e.target.checked
                    }
                  })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Management</h3>
        <div className="space-y-4">
          <button
            onClick={handleExportData}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Download className="w-4 h-4 mr-2" />
            Export My Data
          </button>
          <button
            onClick={handleDeleteAccount}
            className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Account
          </button>
        </div>
      </div>
    </div>
  );

  const renderSystemSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Auto-Save & Backup</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h4 className="text-sm font-medium text-gray-900">Auto-save</h4>
              <p className="text-sm text-gray-600">Automatically save changes as you work</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={localSettings.system.autoSave}
                onChange={(e) => setLocalSettings({
                  ...localSettings,
                  system: { ...localSettings.system, autoSave: e.target.checked }
                })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Auto-save Interval (minutes)</label>
            <select
              value={localSettings.system.autoSaveInterval}
              onChange={(e) => setLocalSettings({
                ...localSettings,
                system: { ...localSettings.system, autoSaveInterval: parseInt(e.target.value) }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={!localSettings.system.autoSave}
            >
              <option value={1}>1 minute</option>
              <option value={5}>5 minutes</option>
              <option value={10}>10 minutes</option>
              <option value={15}>15 minutes</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Backup Frequency</label>
            <select
              value={localSettings.system.backupFrequency}
              onChange={(e) => setLocalSettings({
                ...localSettings,
                system: { ...localSettings.system, backupFrequency: e.target.value as SettingsState['system']['backupFrequency'] }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Default Views</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Default Project View</label>
            <select
              value={localSettings.system.defaultProjectView}
              onChange={(e) => setLocalSettings({
                ...localSettings,
                system: { ...localSettings.system, defaultProjectView: e.target.value as SettingsState['system']['defaultProjectView'] }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="list">List View</option>
              <option value="grid">Grid View</option>
              <option value="kanban">Kanban Board</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Task Sort Order</label>
            <select
              value={localSettings.system.taskSortOrder}
              onChange={(e) => setLocalSettings({
                ...localSettings,
                system: { ...localSettings.system, taskSortOrder: e.target.value as SettingsState['system']['taskSortOrder'] }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="priority">Priority</option>
              <option value="dueDate">Due Date</option>
              <option value="created">Date Created</option>
              <option value="alphabetical">Alphabetical</option>
            </select>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Date & Time Format</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date Format</label>
            <select
              value={localSettings.system.dateFormat}
              onChange={(e) => setLocalSettings({
                ...localSettings,
                system: { ...localSettings.system, dateFormat: e.target.value as SettingsState['system']['dateFormat'] }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Time Format</label>
            <select
              value={localSettings.system.timeFormat}
              onChange={(e) => setLocalSettings({
                ...localSettings,
                system: { ...localSettings.system, timeFormat: e.target.value as SettingsState['system']['timeFormat'] }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="12h">12-hour (AM/PM)</option>
              <option value="24h">24-hour</option>
            </select>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Management</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Data Retention (days)</label>
            <select
              value={localSettings.system.dataRetention}
              onChange={(e) => setLocalSettings({
                ...localSettings,
                system: { ...localSettings.system, dataRetention: parseInt(e.target.value) }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value={90}>90 days</option>
              <option value={180}>180 days</option>
              <option value={365}>1 year</option>
              <option value={730}>2 years</option>
              <option value={-1}>Forever</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Export Format</label>
            <select
              value={localSettings.system.exportFormat}
              onChange={(e) => setLocalSettings({
                ...localSettings,
                system: { ...localSettings.system, exportFormat: e.target.value as SettingsState['system']['exportFormat'] }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="pdf">PDF</option>
              <option value="json">JSON</option>
              <option value="csv">CSV</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'profile':
        return renderProfileSettings();
      case 'notifications':
        return renderNotificationSettings();
      case 'appearance':
        return renderAppearanceSettings();
      case 'security':
        return renderSecuritySettings();
      case 'privacy':
        return renderPrivacySettings();
      case 'system':
        return renderSystemSettings();
      default:
        return renderProfileSettings();
    }
  };

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex-shrink-0">
        <div className="p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Settings</h2>
          <nav className="space-y-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          <div className="max-w-4xl mx-auto">
            {renderContent()}
            
            {/* Save Button */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {saveStatus === 'saving' && (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                      <span className="text-sm text-blue-600">Saving...</span>
                    </>
                  )}
                  {saveStatus === 'saved' && (
                    <>
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-sm text-green-600">Settings saved successfully</span>
                    </>
                  )}
                  {saveStatus === 'error' && (
                    <>
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                      <span className="text-sm text-red-600">Error saving settings</span>
                    </>
                  )}
                </div>
                <button
                  onClick={handleSave}
                  disabled={saveStatus === 'saving'}
                  className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
    </div>
  );
}