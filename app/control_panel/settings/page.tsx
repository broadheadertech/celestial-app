'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import {
  ArrowLeft,
  Settings,
  Save,
  RefreshCw,
  Shield,
  Bell,
  Database,
  Globe,
  Users,
  Mail,
  Lock,
  Eye,
  EyeOff,
  CheckCircle,
  AlertTriangle,
  Info,
  Upload,
  Download,
  Trash2,
  Key,
} from 'lucide-react';
import Button from '@/components/ui/Button';

export default function SettingsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('general');
  const [isSaving, setIsSaving] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  // Fetch system data
  const systemStats = useQuery(api.services.admin.getDashboardStats);

  // Essential settings data - streamlined
  const [settings, setSettings] = useState({
    general: {
      siteName: 'Celestial Drakon Aquatics',
      siteDescription: 'Premium aquarium fish and accessories',
      timezone: 'Asia/Manila',
      currency: 'PHP',
      maintenanceMode: false,
    },
    security: {
      twoFactorAuth: true,
      sessionTimeout: 30,
      loginAttempts: 5,
      encryptionLevel: 'AES-256',
    },
    notifications: {
      emailNotifications: true,
      lowStockAlerts: true,
      orderNotifications: true,
      systemAlerts: true,
    },
    database: {
      backupFrequency: 'daily',
      autoOptimize: true,
      encryptBackups: true,
    },
    api: {
      apiKey: 'cvx_prod_1234567890abcdef',
      rateLimitPerHour: 1000,
      enableCors: true,
    },
  });

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => setIsSaving(false), 1500);
  };

  const tabs = [
    { id: 'general', name: 'General', icon: Settings },
    { id: 'security', name: 'Security', icon: Shield },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'database', name: 'Database', icon: Database },
  ];

  const SettingCard = ({ children, title, description }) => (
    <div className="bg-secondary/40 backdrop-blur-sm rounded-xl p-6 border border-white/10">
      <div className="mb-4">
        <h3 className="text-white font-bold text-lg">{title}</h3>
        {description && <p className="text-white/60 text-sm">{description}</p>}
      </div>
      {children}
    </div>
  );

  const Toggle = ({ enabled, onChange, label, description }) => (
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
                    value={settings.general.siteName}
                    onChange={(e) => setSettings({
                      ...settings,
                      general: { ...settings.general, siteName: e.target.value }
                    })}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:border-primary/50 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-white/70 text-sm font-medium block mb-2">Site Description</label>
                  <textarea
                    value={settings.general.siteDescription}
                    onChange={(e) => setSettings({
                      ...settings,
                      general: { ...settings.general, siteDescription: e.target.value }
                    })}
                    rows={3}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:border-primary/50 focus:outline-none resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-white/70 text-sm font-medium block mb-2">Timezone</label>
                    <select
                      value={settings.general.timezone}
                      onChange={(e) => setSettings({
                        ...settings,
                        general: { ...settings.general, timezone: e.target.value }
                      })}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:border-primary/50 focus:outline-none"
                    >
                      <option value="Asia/Manila">Asia/Manila</option>
                      <option value="UTC">UTC</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-white/70 text-sm font-medium block mb-2">Currency</label>
                    <select
                      value={settings.general.currency}
                      onChange={(e) => setSettings({
                        ...settings,
                        general: { ...settings.general, currency: e.target.value }
                      })}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:border-primary/50 focus:outline-none"
                    >
                      <option value="PHP">Philippine Peso (PHP)</option>
                      <option value="USD">US Dollar (USD)</option>
                    </select>
                  </div>
                </div>

                <Toggle
                  enabled={settings.general.maintenanceMode}
                  onChange={(value) => setSettings({
                    ...settings,
                    general: { ...settings.general, maintenanceMode: value }
                  })}
                  label="Maintenance Mode"
                  description="Temporarily disable public access to the site"
                />
              </div>
            </SettingCard>
          </div>
        );

      case 'security':
        return (
          <div className="space-y-6">
            <SettingCard title="Authentication & Access" description="Security settings and access controls">
              <div className="space-y-4">
                <Toggle
                  enabled={settings.security.twoFactorAuth}
                  onChange={(value) => setSettings({
                    ...settings,
                    security: { ...settings.security, twoFactorAuth: value }
                  })}
                  label="Two-Factor Authentication"
                  description="Require 2FA for admin accounts"
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-white/70 text-sm font-medium block mb-2">Session Timeout (minutes)</label>
                    <input
                      type="number"
                      min="5"
                      max="480"
                      value={settings.security.sessionTimeout}
                      onChange={(e) => setSettings({
                        ...settings,
                        security: { ...settings.security, sessionTimeout: parseInt(e.target.value) }
                      })}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:border-primary/50 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-white/70 text-sm font-medium block mb-2">Max Login Attempts</label>
                    <input
                      type="number"
                      min="3"
                      max="10"
                      value={settings.security.loginAttempts}
                      onChange={(e) => setSettings({
                        ...settings,
                        security: { ...settings.security, loginAttempts: parseInt(e.target.value) }
                      })}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:border-primary/50 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <Info className="w-4 h-4 text-blue-400" />
                    <span className="text-blue-400 text-sm font-medium">Security Status</span>
                  </div>
                  <p className="text-blue-300 text-xs">Your security settings are properly configured</p>
                </div>
              </div>
            </SettingCard>

            <SettingCard title="Encryption Settings" description="Data encryption and security policies">
              <div className="space-y-4">
                <div>
                  <label className="text-white/70 text-sm font-medium block mb-2">Encryption Level</label>
                  <select
                    value={settings.security.encryptionLevel}
                    onChange={(e) => setSettings({
                      ...settings,
                      security: { ...settings.security, encryptionLevel: e.target.value }
                    })}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:border-primary/50 focus:outline-none"
                  >
                    <option value="AES-256">AES-256 (Recommended)</option>
                    <option value="AES-192">AES-192</option>
                    <option value="AES-128">AES-128</option>
                  </select>
                </div>

                <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span className="text-green-400 text-sm font-medium">Encryption Status</span>
                  </div>
                  <p className="text-green-300 text-xs">All data is encrypted using {settings.security.encryptionLevel}</p>
                </div>
              </div>
            </SettingCard>
          </div>
        );

      case 'notifications':
        return (
          <div className="space-y-6">
            <SettingCard title="Notification Preferences" description="Configure how and when you receive notifications">
              <div className="space-y-3">
                <Toggle
                  enabled={settings.notifications.emailNotifications}
                  onChange={(value) => setSettings({
                    ...settings,
                    notifications: { ...settings.notifications, emailNotifications: value }
                  })}
                  label="Email Notifications"
                  description="Receive notifications via email"
                />

                <Toggle
                  enabled={settings.notifications.lowStockAlerts}
                  onChange={(value) => setSettings({
                    ...settings,
                    notifications: { ...settings.notifications, lowStockAlerts: value }
                  })}
                  label="Low Stock Alerts"
                  description="Get notified when products are running low"
                />

                <Toggle
                  enabled={settings.notifications.orderNotifications}
                  onChange={(value) => setSettings({
                    ...settings,
                    notifications: { ...settings.notifications, orderNotifications: value }
                  })}
                  label="Order Notifications"
                  description="New orders and order updates"
                />

                <Toggle
                  enabled={settings.notifications.systemAlerts}
                  onChange={(value) => setSettings({
                    ...settings,
                    notifications: { ...settings.notifications, systemAlerts: value }
                  })}
                  label="System Alerts"
                  description="System health and performance alerts"
                />
              </div>
            </SettingCard>
          </div>
        );

      case 'database':
        return (
          <div className="space-y-6">
            <SettingCard title="Backup Configuration" description="Database backup and recovery settings">
              <div className="space-y-4">
                <div>
                  <label className="text-white/70 text-sm font-medium block mb-2">Backup Frequency</label>
                  <select
                    value={settings.database.backupFrequency}
                    onChange={(e) => setSettings({
                      ...settings,
                      database: { ...settings.database, backupFrequency: e.target.value }
                    })}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:border-primary/50 focus:outline-none"
                  >
                    <option value="hourly">Hourly</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                  </select>
                </div>

                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <Info className="w-4 h-4 text-blue-400" />
                    <span className="text-blue-400 text-sm font-medium">Backup Status</span>
                  </div>
                  <p className="text-blue-300 text-xs">Last backup: Today at 3:00 AM</p>
                </div>

                <div className="space-y-3">
                  <Toggle
                    enabled={settings.database.autoOptimize}
                    onChange={(value) => setSettings({
                      ...settings,
                      database: { ...settings.database, autoOptimize: value }
                    })}
                    label="Auto Optimize"
                    description="Automatically optimize database performance"
                  />

                  <Toggle
                    enabled={settings.database.compression}
                    onChange={(value) => setSettings({
                      ...settings,
                      database: { ...settings.database, compression: value }
                    })}
                    label="Backup Compression"
                    description="Compress backups to save storage space"
                  />

                  <Toggle
                    enabled={settings.database.encryptBackups}
                    onChange={(value) => setSettings({
                      ...settings,
                      database: { ...settings.database, encryptBackups: value }
                    })}
                    label="Encrypt Backups"
                    description="Encrypt backup files for security"
                  />
                </div>

                <div className="flex space-x-3">
                  <Button variant="ghost" className="border border-white/10">
                    <Download className="w-4 h-4 mr-2" />
                    Download Backup
                  </Button>
                  <Button variant="ghost" className="border border-white/10">
                    <Upload className="w-4 h-4 mr-2" />
                    Restore Backup
                  </Button>
                </div>
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
      {/* Header */}
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

            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-primary/90 hover:bg-primary"
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

      <div className="flex">
        {/* Sidebar */}
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

        {/* Content */}
        <div className="flex-1 p-4 lg:p-6">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
}