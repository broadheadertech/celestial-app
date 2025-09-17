'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Globe,
  Server,
  Database,
  Shield,
  Zap,
  Users,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Settings,
  Monitor,
  Smartphone,
  Wifi,
  HardDrive,
  Cpu,
  MemoryStick,
  RefreshCw,
  Play,
  Pause,
  Square,
  RotateCcw,
} from 'lucide-react';
import Button from '@/components/ui/Button';

export default function OverviewPage() {
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1500);
  };

  // Mock system data
  const systemData = {
    services: [
      { name: 'Web Server', status: 'online', uptime: '99.9%', lastCheck: '1 min ago', response: '120ms' },
      { name: 'Database', status: 'online', uptime: '99.8%', lastCheck: '1 min ago', response: '45ms' },
      { name: 'API Gateway', status: 'online', uptime: '99.9%', lastCheck: '1 min ago', response: '80ms' },
      { name: 'Payment System', status: 'warning', uptime: '98.5%', lastCheck: '3 min ago', response: '250ms' },
      { name: 'File Storage', status: 'online', uptime: '100%', lastCheck: '1 min ago', response: '95ms' },
      { name: 'Email Service', status: 'online', uptime: '99.7%', lastCheck: '2 min ago', response: '180ms' },
    ],
    resources: {
      cpu: { usage: 45, status: 'normal' },
      memory: { usage: 67, status: 'normal' },
      storage: { usage: 78, status: 'warning' },
      network: { usage: 23, status: 'normal' },
    },
    traffic: {
      current: 1250,
      peak: 2800,
      average: 950,
      growth: 12.5,
    },
    errors: [
      { type: 'warning', message: 'High storage usage detected', time: '5 min ago' },
      { type: 'info', message: 'Database backup completed', time: '1 hour ago' },
      { type: 'error', message: 'Payment timeout (resolved)', time: '2 hours ago' },
    ],
    deployments: [
      { version: 'v2.1.3', status: 'active', deployedAt: '2 days ago', rollback: false },
      { version: 'v2.1.2', status: 'rollback-available', deployedAt: '1 week ago', rollback: true },
      { version: 'v2.1.1', status: 'archived', deployedAt: '2 weeks ago', rollback: false },
    ]
  };

  const StatusIndicator = ({ status }) => {
    const statusConfig = {
      online: { color: 'bg-green-400', text: 'Online', textColor: 'text-green-400' },
      warning: { color: 'bg-yellow-400', text: 'Warning', textColor: 'text-yellow-400' },
      error: { color: 'bg-red-400', text: 'Error', textColor: 'text-red-400' },
      offline: { color: 'bg-gray-400', text: 'Offline', textColor: 'text-gray-400' },
    };

    const config = statusConfig[status] || statusConfig.offline;

    return (
      <div className="flex items-center space-x-2">
        <div className={`w-2 h-2 rounded-full ${config.color} ${status === 'online' ? 'animate-pulse' : ''}`} />
        <span className={`text-xs font-medium uppercase ${config.textColor}`}>{config.text}</span>
      </div>
    );
  };

  const ResourceCard = ({ icon: Icon, label, usage, status }) => {
    const getStatusColor = (status, usage) => {
      if (status === 'warning' || usage > 80) return 'text-yellow-400 bg-yellow-400/20';
      if (status === 'error' || usage > 90) return 'text-red-400 bg-red-400/20';
      return 'text-green-400 bg-green-400/20';
    };

    const getBarColor = (status, usage) => {
      if (status === 'warning' || usage > 80) return 'from-yellow-500 to-amber-600';
      if (status === 'error' || usage > 90) return 'from-red-500 to-red-600';
      return 'from-green-500 to-emerald-600';
    };

    return (
      <div className="bg-secondary/40 backdrop-blur-sm rounded-xl p-4 border border-white/10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <div className={`p-2 rounded-lg ${getStatusColor(status, usage)}`}>
              <Icon className="w-4 h-4" />
            </div>
            <span className="text-white text-sm font-medium">{label}</span>
          </div>
          <span className="text-white text-lg font-bold">{usage}%</span>
        </div>

        <div className="w-full bg-white/10 rounded-full h-2">
          <div
            className={`h-2 rounded-full bg-gradient-to-r ${getBarColor(status, usage)}`}
            style={{ width: `${usage}%` }}
          />
        </div>
      </div>
    );
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
                  <Globe className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">System Overview</h1>
                  <p className="text-sm text-white/60">Monitor and control system health</p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="border border-white/10"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>

              <Button size="sm" className="bg-primary/90 hover:bg-primary">
                <Settings className="w-4 h-4 mr-2" />
                Configure
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 lg:p-6 space-y-6">
        {/* System Health Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Services Status */}
          <div className="lg:col-span-2 bg-secondary/40 backdrop-blur-sm rounded-xl p-6 border border-white/10">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white">System Services</h3>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span className="text-green-400 text-sm font-medium">5/6 Online</span>
              </div>
            </div>

            <div className="space-y-3">
              {systemData.services.map((service, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-3">
                      <Server className="w-5 h-5 text-primary" />
                      <div>
                        <p className="text-white text-sm font-medium">{service.name}</p>
                        <p className="text-white/60 text-xs">Uptime: {service.uptime}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-white/70 text-xs">{service.response}</p>
                      <p className="text-white/50 text-xs">{service.lastCheck}</p>
                    </div>
                    <StatusIndicator status={service.status} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Traffic Overview */}
          <div className="bg-secondary/40 backdrop-blur-sm rounded-xl p-6 border border-white/10">
            <h3 className="text-lg font-bold text-white mb-6">Live Traffic</h3>

            <div className="space-y-6">
              <div className="text-center">
                <div className="w-24 h-24 mx-auto bg-gradient-to-br from-primary/20 to-orange-600/20 rounded-full flex items-center justify-center border-4 border-primary/30">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-white">{systemData.traffic.current}</p>
                    <p className="text-xs text-white/60">active</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-white/70 text-sm">Peak Today</span>
                  <span className="text-white font-medium">{systemData.traffic.peak}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/70 text-sm">Average</span>
                  <span className="text-white font-medium">{systemData.traffic.average}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/70 text-sm">Growth</span>
                  <span className="text-green-400 font-medium">+{systemData.traffic.growth}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Resource Usage */}
        <div className="bg-secondary/40 backdrop-blur-sm rounded-xl p-6 border border-white/10">
          <h3 className="text-lg font-bold text-white mb-6">Resource Usage</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <ResourceCard
              icon={Cpu}
              label="CPU Usage"
              usage={systemData.resources.cpu.usage}
              status={systemData.resources.cpu.status}
            />
            <ResourceCard
              icon={MemoryStick}
              label="Memory"
              usage={systemData.resources.memory.usage}
              status={systemData.resources.memory.status}
            />
            <ResourceCard
              icon={HardDrive}
              label="Storage"
              usage={systemData.resources.storage.usage}
              status={systemData.resources.storage.status}
            />
            <ResourceCard
              icon={Wifi}
              label="Network"
              usage={systemData.resources.network.usage}
              status={systemData.resources.network.status}
            />
          </div>
        </div>

        {/* Recent Activity and Deployments */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Recent Alerts */}
          <div className="bg-secondary/40 backdrop-blur-sm rounded-xl p-6 border border-white/10">
            <h3 className="text-lg font-bold text-white mb-6">Recent Alerts</h3>

            <div className="space-y-3">
              {systemData.errors.map((error, index) => {
                const iconMap = {
                  error: AlertTriangle,
                  warning: AlertTriangle,
                  info: Activity,
                };
                const colorMap = {
                  error: 'text-red-400 bg-red-400/20',
                  warning: 'text-yellow-400 bg-yellow-400/20',
                  info: 'text-blue-400 bg-blue-400/20',
                };

                const Icon = iconMap[error.type];

                return (
                  <div key={index} className="flex items-center space-x-3 p-3 bg-white/5 rounded-lg">
                    <div className={`p-2 rounded-lg ${colorMap[error.type]}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <p className="text-white text-sm">{error.message}</p>
                      <div className="flex items-center text-white/60 text-xs mt-1">
                        <Clock className="w-3 h-3 mr-1" />
                        {error.time}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Deployment History */}
          <div className="bg-secondary/40 backdrop-blur-sm rounded-xl p-6 border border-white/10">
            <h3 className="text-lg font-bold text-white mb-6">Deployment History</h3>

            <div className="space-y-3">
              {systemData.deployments.map((deployment, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      deployment.status === 'active' ? 'bg-green-400/20 text-green-400' :
                      deployment.status === 'rollback-available' ? 'bg-yellow-400/20 text-yellow-400' :
                      'bg-gray-400/20 text-gray-400'
                    }`}>
                      {deployment.status === 'active' && <CheckCircle className="w-4 h-4" />}
                      {deployment.status === 'rollback-available' && <RotateCcw className="w-4 h-4" />}
                      {deployment.status === 'archived' && <Clock className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">{deployment.version}</p>
                      <p className="text-white/60 text-xs">{deployment.deployedAt}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {deployment.status === 'active' && (
                      <span className="text-green-400 text-xs font-medium uppercase">Active</span>
                    )}
                    {deployment.rollback && (
                      <Button variant="ghost" size="sm" className="text-yellow-400 hover:text-yellow-300">
                        <RotateCcw className="w-3 h-3 mr-1" />
                        Rollback
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-secondary/40 backdrop-blur-sm rounded-xl p-6 border border-white/10">
          <h3 className="text-lg font-bold text-white mb-6">Quick Actions</h3>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {[
              { icon: Play, label: 'Start Service', color: 'from-green-500/20 to-emerald-600/20 text-green-400' },
              { icon: Pause, label: 'Pause Service', color: 'from-yellow-500/20 to-amber-600/20 text-yellow-400' },
              { icon: Square, label: 'Stop Service', color: 'from-red-500/20 to-red-600/20 text-red-400' },
              { icon: RotateCcw, label: 'Restart', color: 'from-blue-500/20 to-cyan-600/20 text-blue-400' },
              { icon: Database, label: 'Backup DB', color: 'from-purple-500/20 to-violet-600/20 text-purple-400' },
              { icon: Shield, label: 'Security Scan', color: 'from-primary/20 to-orange-600/20 text-primary' },
            ].map((action, index) => (
              <button
                key={index}
                className="group p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-all duration-300 border border-white/5 hover:border-white/20"
              >
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${action.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform mx-auto`}>
                  <action.icon className="w-5 h-5" />
                </div>
                <p className="text-white text-xs font-medium text-center">{action.label}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}