'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi } from '@/lib/api';
import {
  Settings,
  Clock,
  Shield,
  Bell,
  Database,
  Save,
  Loader2,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';

interface SystemSetting {
  key: string;
  value: any;
  description?: string;
  category?: string;
}

const SETTING_CATEGORIES = {
  batch: { label: 'Batch Processing', icon: Clock },
  security: { label: 'Security', icon: Shield },
  notifications: { label: 'Notifications', icon: Bell },
  general: { label: 'General', icon: Settings },
};

export default function SystemSettingsPage() {
  const queryClient = useQueryClient();
  const [activeCategory, setActiveCategory] = useState<string>('batch');
  const [localSettings, setLocalSettings] = useState<Record<string, any>>({});
  const [saveSuccess, setSaveSuccess] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['system-settings'],
    queryFn: () => settingsApi.get(),
  });

  const settings = data?.data || [];

  const saveMutation = useMutation({
    mutationFn: (updates: Record<string, any>) => settingsApi.update(updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
      setLocalSettings({});
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    },
  });

  const getSetting = (key: string, defaultValue: any = '') => {
    if (key in localSettings) {
      return localSettings[key];
    }
    const setting = settings.find((s: SystemSetting) => s.key === key);
    return setting?.value ?? defaultValue;
  };

  const updateSetting = (key: string, value: any) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value }));
  };

  const hasChanges = Object.keys(localSettings).length > 0;

  const handleSave = () => {
    saveMutation.mutate(localSettings);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
          <p className="text-gray-500 mt-1">
            Configure batch windows, security, and global settings
          </p>
        </div>
        <div className="flex items-center gap-3">
          {saveSuccess && (
            <span className="inline-flex items-center gap-1 text-green-600 text-sm">
              <CheckCircle className="h-4 w-4" />
              Saved successfully
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={!hasChanges || saveMutation.isPending}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save Changes
          </button>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Category Sidebar */}
        <div className="w-64 flex-shrink-0">
          <nav className="space-y-1">
            {Object.entries(SETTING_CATEGORIES).map(([key, { label, icon: Icon }]) => (
              <button
                key={key}
                onClick={() => setActiveCategory(key)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                  activeCategory === key
                    ? 'bg-primary/10 text-primary'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="font-medium">{label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Settings Content */}
        <div className="flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* Batch Processing Settings */}
              {activeCategory === 'batch' && (
                <div className="bg-white rounded-lg shadow-sm border">
                  <div className="px-6 py-4 border-b">
                    <h2 className="text-lg font-semibold text-gray-900">Batch Processing</h2>
                    <p className="text-sm text-gray-500 mt-1">
                      Configure batch windows and processing schedules
                    </p>
                  </div>
                  <div className="p-6 space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        ACH Batch Cutoff Time (PT)
                      </label>
                      <select
                        value={getSetting('ach_cutoff_time', '14:00')}
                        onChange={(e) => updateSetting('ach_cutoff_time', e.target.value)}
                        className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      >
                        <option value="10:00">10:00 AM</option>
                        <option value="11:00">11:00 AM</option>
                        <option value="12:00">12:00 PM</option>
                        <option value="13:00">1:00 PM</option>
                        <option value="14:00">2:00 PM</option>
                        <option value="15:00">3:00 PM</option>
                        <option value="16:00">4:00 PM</option>
                      </select>
                      <p className="text-sm text-gray-500 mt-1">
                        ACH payments must be submitted by this time for same-day processing
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Wire Transfer Cutoff Time (PT)
                      </label>
                      <select
                        value={getSetting('wire_cutoff_time', '15:00')}
                        onChange={(e) => updateSetting('wire_cutoff_time', e.target.value)}
                        className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      >
                        <option value="12:00">12:00 PM</option>
                        <option value="13:00">1:00 PM</option>
                        <option value="14:00">2:00 PM</option>
                        <option value="15:00">3:00 PM</option>
                        <option value="16:00">4:00 PM</option>
                        <option value="17:00">5:00 PM</option>
                      </select>
                      <p className="text-sm text-gray-500 mt-1">
                        Wire transfers must be submitted by this time for same-day processing
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Default Processing Days
                      </label>
                      <div className="flex gap-2 mt-2">
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((day, index) => {
                          const days = getSetting('processing_days', [1, 2, 3, 4, 5]) as number[];
                          const isSelected = days.includes(index + 1);
                          return (
                            <button
                              key={day}
                              onClick={() => {
                                const newDays = isSelected
                                  ? days.filter((d: number) => d !== index + 1)
                                  : [...days, index + 1].sort();
                                updateSetting('processing_days', newDays);
                              }}
                              className={`px-4 py-2 rounded-lg border transition-colors ${
                                isSelected
                                  ? 'bg-primary text-white border-primary'
                                  : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                              }`}
                            >
                              {day}
                            </button>
                          );
                        })}
                      </div>
                      <p className="text-sm text-gray-500 mt-2">
                        Payments will only be processed on selected days (bank holidays excluded)
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Security Settings */}
              {activeCategory === 'security' && (
                <div className="bg-white rounded-lg shadow-sm border">
                  <div className="px-6 py-4 border-b">
                    <h2 className="text-lg font-semibold text-gray-900">Security Settings</h2>
                    <p className="text-sm text-gray-500 mt-1">
                      Configure security and access control settings
                    </p>
                  </div>
                  <div className="p-6 space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Session Timeout (minutes)
                      </label>
                      <input
                        type="number"
                        min={5}
                        max={120}
                        value={getSetting('session_timeout_minutes', 30)}
                        onChange={(e) => updateSetting('session_timeout_minutes', parseInt(e.target.value))}
                        className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                      <p className="text-sm text-gray-500 mt-1">
                        Users will be logged out after this period of inactivity
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Approval Escalation Time (hours)
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={168}
                        value={getSetting('escalation_hours', 24)}
                        onChange={(e) => updateSetting('escalation_hours', parseInt(e.target.value))}
                        className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                      <p className="text-sm text-gray-500 mt-1">
                        Pending approvals will be escalated after this time (default for new rules)
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Manager Approval Link Expiry (hours)
                      </label>
                      <input
                        type="number"
                        min={24}
                        max={168}
                        value={getSetting('access_token_expiry_hours', 72)}
                        onChange={(e) => updateSetting('access_token_expiry_hours', parseInt(e.target.value))}
                        className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                      <p className="text-sm text-gray-500 mt-1">
                        User provisioning approval links expire after this time
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        IP Allowlist
                      </label>
                      <textarea
                        value={getSetting('ip_allowlist', '10.0.0.0/8\n172.16.0.0/12\n192.168.0.0/16')}
                        onChange={(e) => updateSetting('ip_allowlist', e.target.value)}
                        rows={4}
                        placeholder="Enter CIDR ranges, one per line..."
                        className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent font-mono text-sm"
                      />
                      <p className="text-sm text-gray-500 mt-1">
                        Only allow access from these IP ranges (CIDR notation)
                      </p>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">Require MFA for All Users</p>
                        <p className="text-sm text-gray-500">
                          Enforced via Okta SSO integration
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={getSetting('require_mfa', true)}
                          onChange={(e) => updateSetting('require_mfa', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/25 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Notification Settings */}
              {activeCategory === 'notifications' && (
                <div className="bg-white rounded-lg shadow-sm border">
                  <div className="px-6 py-4 border-b">
                    <h2 className="text-lg font-semibold text-gray-900">Notification Settings</h2>
                    <p className="text-sm text-gray-500 mt-1">
                      Configure email and Slack notification preferences
                    </p>
                  </div>
                  <div className="p-6 space-y-6">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">Email Notifications</p>
                        <p className="text-sm text-gray-500">
                          Send approval notifications via email
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={getSetting('email_notifications_enabled', true)}
                          onChange={(e) => updateSetting('email_notifications_enabled', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/25 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">Slack Notifications</p>
                        <p className="text-sm text-gray-500">
                          Send notifications to Treasury Slack channel
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={getSetting('slack_notifications_enabled', false)}
                          onChange={(e) => updateSetting('slack_notifications_enabled', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/25 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Treasury Slack Channel
                      </label>
                      <input
                        type="text"
                        value={getSetting('slack_channel', '#treasury-payments')}
                        onChange={(e) => updateSetting('slack_channel', e.target.value)}
                        placeholder="#channel-name"
                        className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">Daily Summary Email</p>
                        <p className="text-sm text-gray-500">
                          Send daily payment summary to CFO
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={getSetting('daily_summary_enabled', true)}
                          onChange={(e) => updateSetting('daily_summary_enabled', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/25 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* General Settings */}
              {activeCategory === 'general' && (
                <div className="bg-white rounded-lg shadow-sm border">
                  <div className="px-6 py-4 border-b">
                    <h2 className="text-lg font-semibold text-gray-900">General Settings</h2>
                    <p className="text-sm text-gray-500 mt-1">
                      Configure general application settings
                    </p>
                  </div>
                  <div className="p-6 space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Duplicate Detection Window (days)
                      </label>
                      <input
                        type="number"
                        min={7}
                        max={365}
                        value={getSetting('duplicate_window_days', 90)}
                        onChange={(e) => updateSetting('duplicate_window_days', parseInt(e.target.value))}
                        className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                      <p className="text-sm text-gray-500 mt-1">
                        Flag potential duplicates within this time period
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Audit Log Retention (years)
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={getSetting('audit_retention_years', 7)}
                        onChange={(e) => updateSetting('audit_retention_years', parseInt(e.target.value))}
                        className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                      <p className="text-sm text-gray-500 mt-1">
                        Keep audit logs for this many years (SOX requirement: 7 years)
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Default Currency
                      </label>
                      <select
                        value={getSetting('default_currency', 'USD')}
                        onChange={(e) => updateSetting('default_currency', e.target.value)}
                        className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      >
                        <option value="USD">USD - US Dollar</option>
                        <option value="EUR">EUR - Euro</option>
                        <option value="GBP">GBP - British Pound</option>
                        <option value="CAD">CAD - Canadian Dollar</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Timezone
                      </label>
                      <select
                        value={getSetting('timezone', 'America/Los_Angeles')}
                        onChange={(e) => updateSetting('timezone', e.target.value)}
                        className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      >
                        <option value="America/Los_Angeles">Pacific Time (PT)</option>
                        <option value="America/Denver">Mountain Time (MT)</option>
                        <option value="America/Chicago">Central Time (CT)</option>
                        <option value="America/New_York">Eastern Time (ET)</option>
                        <option value="UTC">UTC</option>
                      </select>
                    </div>

                    <div className="border-t pt-6">
                      <h3 className="font-medium text-gray-900 mb-4">System Information</h3>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <p className="text-gray-500">Version</p>
                          <p className="font-mono font-medium">1.0.0</p>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <p className="text-gray-500">Environment</p>
                          <p className="font-mono font-medium">Development</p>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <p className="text-gray-500">Database</p>
                          <p className="font-mono font-medium">SQLite (Local)</p>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <p className="text-gray-500">Sessions</p>
                          <p className="font-mono font-medium">In-Memory</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Unsaved Changes Warning */}
      {hasChanges && (
        <div className="fixed bottom-6 right-6 bg-amber-50 border border-amber-200 rounded-lg p-4 shadow-lg flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          <span className="text-amber-800">You have unsaved changes</span>
          <button
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="ml-2 px-3 py-1 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm"
          >
            Save Now
          </button>
        </div>
      )}
    </div>
  );
}
