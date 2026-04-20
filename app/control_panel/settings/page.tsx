'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import {
  ArrowLeft,
  Settings,
  Save,
  RefreshCw,
  Bell,
  Info,
  CheckCircle,
} from 'lucide-react';
import Button from '@/components/ui/Button';

type SettingsForm = {
  siteName: string;
  siteDescription: string;
  timezone: string;
  currency: string;
  maintenanceMode: boolean;
  notifyLowStock: boolean;
  notifyNewOrders: boolean;
  notifyNewUsers: boolean;
  lowStockThreshold: number;
};

const INITIAL: SettingsForm = {
  siteName: '',
  siteDescription: '',
  timezone: 'Asia/Manila',
  currency: 'PHP',
  maintenanceMode: false,
  notifyLowStock: true,
  notifyNewOrders: true,
  notifyNewUsers: false,
  lowStockThreshold: 10,
};

export default function SettingsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'general' | 'notifications'>('general');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [form, setForm] = useState<SettingsForm>(INITIAL);
  const [dirty, setDirty] = useState(false);

  const remote = useQuery(api.services.settings.getAppSettings);
  const updateSettings = useMutation(api.services.settings.updateAppSettings);

  useEffect(() => {
    if (remote && !dirty) {
      setForm({
        siteName: remote.siteName,
        siteDescription: remote.siteDescription ?? '',
        timezone: remote.timezone,
        currency: remote.currency,
        maintenanceMode: remote.maintenanceMode,
        notifyLowStock: remote.notifyLowStock,
        notifyNewOrders: remote.notifyNewOrders,
        notifyNewUsers: remote.notifyNewUsers,
        lowStockThreshold: remote.lowStockThreshold,
      });
    }
  }, [remote, dirty]);

  const patch = <K extends keyof SettingsForm>(key: K, value: SettingsForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
    setSaveStatus('idle');
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateSettings({
        siteName: form.siteName,
        siteDescription: form.siteDescription,
        timezone: form.timezone,
        currency: form.currency,
        maintenanceMode: form.maintenanceMode,
        notifyLowStock: form.notifyLowStock,
        notifyNewOrders: form.notifyNewOrders,
        notifyNewUsers: form.notifyNewUsers,
        lowStockThreshold: form.lowStockThreshold,
      });
      setDirty(false);
      setSaveStatus('success');
    } catch (e) {
      console.error('Failed to save settings', e);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  const isLoading = remote === undefined;

  const tabs = [
    { id: 'general' as const, name: 'General', icon: Settings },
    { id: 'notifications' as const, name: 'Notifications', icon: Bell },
  ];

  const SettingCard = ({ children, title, description }: { children: React.ReactNode; title: string; description?: string }) => (
    <div className="bg-secondary/40 backdrop-blur-sm rounded-xl p-6 border border-white/10">
      <div className="mb-4">
        <h3 className="text-white font-bold text-lg">{title}</h3>
        {description && <p className="text-white/60 text-sm">{description}</p>}
      </div>
      {children}
    </div>
  );

  const Toggle = ({ enabled, onChange, label, description }: { enabled: boolean; onChange: (v: boolean) => void; label: string; description?: string }) => (
    <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
      <div>
        <p className="text-white text-sm font-medium">{label}</p>
        {description && <p className="text-white/60 text-xs">{description}</p>}
      </div>
      <button
        onClick={() => onChange(!enabled)}
        className={`relative w-12 h-6 rounded-full transition-colors ${
          enabled ? 'bg-primary' : 'bg-white/20'
        }`}
      >
        <div
          className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
            enabled ? 'translate-x-7' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );

  const renderTabContent = () => {
    if (isLoading) {
      return (
        <div className="bg-secondary/40 backdrop-blur-sm rounded-xl p-8 border border-white/10 flex items-center justify-center">
          <RefreshCw className="w-6 h-6 text-primary animate-spin mr-3" />
          <span className="text-white/70">Loading settings...</span>
        </div>
      );
    }

    switch (activeTab) {
      case 'general':
        return (
          <div className="space-y-6">
            <SettingCard title="Site Configuration" description="Basic site settings and preferences">
              <div className="space-y-4">
                <div>
                  <label className="text-white/70 text-sm font-medium block mb-2">Site Name</label>
                  <input
                    type="text"
                    value={form.siteName}
                    onChange={(e) => patch('siteName', e.target.value)}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:border-primary/50 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-white/70 text-sm font-medium block mb-2">Site Description</label>
                  <textarea
                    value={form.siteDescription}
                    onChange={(e) => patch('siteDescription', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:border-primary/50 focus:outline-none resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-white/70 text-sm font-medium block mb-2">Timezone</label>
                    <select
                      value={form.timezone}
                      onChange={(e) => patch('timezone', e.target.value)}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:border-primary/50 focus:outline-none"
                    >
                      <option value="Asia/Manila">Asia/Manila</option>
                      <option value="UTC">UTC</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-white/70 text-sm font-medium block mb-2">Currency</label>
                    <select
                      value={form.currency}
                      onChange={(e) => patch('currency', e.target.value)}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:border-primary/50 focus:outline-none"
                    >
                      <option value="PHP">Philippine Peso (PHP)</option>
                      <option value="USD">US Dollar (USD)</option>
                    </select>
                  </div>
                </div>

                <Toggle
                  enabled={form.maintenanceMode}
                  onChange={(v) => patch('maintenanceMode', v)}
                  label="Maintenance Mode"
                  description="Temporarily disable public access to the site"
                />
              </div>
            </SettingCard>
          </div>
        );

      case 'notifications':
        return (
          <div className="space-y-6">
            <SettingCard title="Notification Preferences" description="Control which events create notifications">
              <div className="space-y-3">
                <Toggle
                  enabled={form.notifyLowStock}
                  onChange={(v) => patch('notifyLowStock', v)}
                  label="Low Stock Alerts"
                  description="Notify when a product drops below the threshold below"
                />

                <div>
                  <label className="text-white/70 text-sm font-medium block mb-2">Low Stock Threshold</label>
                  <input
                    type="number"
                    min="0"
                    max="1000"
                    value={form.lowStockThreshold}
                    onChange={(e) => patch('lowStockThreshold', Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:border-primary/50 focus:outline-none"
                  />
                </div>

                <Toggle
                  enabled={form.notifyNewOrders}
                  onChange={(v) => patch('notifyNewOrders', v)}
                  label="New Order Notifications"
                  description="Notify admins when a new order or reservation is created"
                />

                <Toggle
                  enabled={form.notifyNewUsers}
                  onChange={(v) => patch('notifyNewUsers', v)}
                  label="New User Notifications"
                  description="Notify admins when a new customer registers"
                />
              </div>
            </SettingCard>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-white/10">
        <div className="px-4 lg:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.back()}
                className="text-white/60 hover:text-white"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>

              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-primary to-orange-600 rounded-xl flex items-center justify-center">
                  <Settings className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">System Settings</h1>
                  <p className="text-sm text-white/60">Configure system preferences and controls</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {saveStatus === 'success' && !dirty && (
                <div className="flex items-center gap-1.5 text-green-400 text-sm">
                  <CheckCircle className="w-4 h-4" />
                  <span>Saved</span>
                </div>
              )}
              {saveStatus === 'error' && (
                <div className="flex items-center gap-1.5 text-red-400 text-sm">
                  <Info className="w-4 h-4" />
                  <span>Save failed</span>
                </div>
              )}
              <Button
                onClick={handleSave}
                disabled={isSaving || !dirty || isLoading}
                className="bg-primary/90 hover:bg-primary disabled:opacity-50"
              >
                {isSaving ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex">
        <div className="w-64 bg-secondary/40 backdrop-blur-sm border-r border-white/10 min-h-screen p-4">
          <div className="space-y-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-all ${
                  activeTab === tab.id
                    ? 'bg-primary text-white'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                <span className="font-medium">{tab.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 p-4 lg:p-6">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
}
