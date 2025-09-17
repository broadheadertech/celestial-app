'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Mail,
  Send,
  Users,
  Edit,
  Copy,
  Trash2,
  Plus,
  FileText,
  BarChart3,
  Eye,
  Calendar,
  Target,
  Filter,
  Search,
  MoreVertical,
  Download
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';

// Mock email templates data
const mockEmailTemplates = [
  {
    id: '1',
    name: 'Welcome Email',
    subject: 'Welcome to Celestial Drakon Aquatics!',
    type: 'welcome',
    status: 'active',
    opens: 890,
    clicks: 234,
    created: '2024-01-15',
    lastSent: '2024-01-20',
    preview: 'Welcome to our aquatic community! Discover premium fish and tanks...'
  },
  {
    id: '2',
    name: 'Order Confirmation',
    subject: 'Your order has been confirmed - Order #{{order_id}}',
    type: 'transactional',
    status: 'active',
    opens: 1456,
    clicks: 567,
    created: '2024-01-10',
    lastSent: '2024-01-20',
    preview: 'Thank you for your order! Here are the details of your purchase...'
  },
  {
    id: '3',
    name: 'Weekly Newsletter',
    subject: 'New Arrivals & Aquarium Tips',
    type: 'newsletter',
    status: 'draft',
    opens: 0,
    clicks: 0,
    created: '2024-01-18',
    lastSent: null,
    preview: 'Check out our latest fish arrivals and expert care tips...'
  },
  {
    id: '4',
    name: 'Abandoned Cart',
    subject: "Don't forget your aquatic friends!",
    type: 'marketing',
    status: 'active',
    opens: 456,
    clicks: 89,
    created: '2024-01-12',
    lastSent: '2024-01-19',
    preview: 'You left some amazing fish in your cart. Complete your order...'
  },
  {
    id: '5',
    name: 'Product Promotion',
    subject: '🐠 30% OFF Premium Bettas - Limited Time!',
    type: 'promotional',
    status: 'scheduled',
    opens: 0,
    clicks: 0,
    created: '2024-01-19',
    lastSent: null,
    preview: 'Special discount on our premium Betta collection...'
  }
];

const templateTypes = [
  { value: 'all', label: 'All Templates' },
  { value: 'welcome', label: 'Welcome' },
  { value: 'transactional', label: 'Transactional' },
  { value: 'newsletter', label: 'Newsletter' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'promotional', label: 'Promotional' }
];

const statusColors = {
  active: 'bg-green-500/20 text-green-400',
  draft: 'bg-yellow-500/20 text-yellow-400',
  scheduled: 'bg-blue-500/20 text-blue-400',
  paused: 'bg-gray-500/20 text-gray-400'
};

export default function EmailMarketingPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  const filteredTemplates = mockEmailTemplates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.subject.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === 'all' || template.type === selectedType;
    return matchesSearch && matchesType;
  });

  const calculateOpenRate = (opens: number) => {
    // Mock calculation - in real app this would be based on actual sends
    const sends = opens * 1.2; // Assuming 80% open rate
    return Math.round((opens / sends) * 100);
  };

  const calculateClickRate = (clicks: number, opens: number) => {
    return opens > 0 ? Math.round((clicks / opens) * 100) : 0;
  };

  const handleTemplateAction = (action: string, templateId: string) => {
    switch (action) {
      case 'edit':
        router.push(`/admin/marketing/templates/${templateId}/edit`);
        break;
      case 'duplicate':
        alert(`Duplicate template ${templateId}`);
        break;
      case 'delete':
        if (confirm('Are you sure you want to delete this template?')) {
          alert(`Delete template ${templateId}`);
        }
        break;
      case 'send':
        router.push(`/admin/marketing/templates/${templateId}/send`);
        break;
      default:
        break;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-white/10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.back()}
                className="p-2 rounded-full bg-secondary border border-white/10 hover:bg-white/10 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-white" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-white">Email Marketing</h1>
                <p className="text-sm text-muted">Manage email templates and campaigns</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Button
                onClick={() => router.push('/admin/marketing/analytics')}
                variant="outline"
                size="sm"
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                Analytics
              </Button>
              <Button
                onClick={() => router.push('/admin/marketing/templates/new')}
                size="sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Template
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 py-6">
        {/* Email Marketing Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-primary/20 rounded-xl">
                <Mail className="w-6 h-6 text-primary" />
              </div>
            </div>
            <div>
              <p className="text-2xl font-bold text-white mb-1">2,847</p>
              <p className="text-sm text-muted">Total Emails Sent</p>
              <p className="text-xs text-success mt-1">+12.5% vs last month</p>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-success/20 rounded-xl">
                <Eye className="w-6 h-6 text-success" />
              </div>
            </div>
            <div>
              <p className="text-2xl font-bold text-white mb-1">68.4%</p>
              <p className="text-sm text-muted">Open Rate</p>
              <p className="text-xs text-success mt-1">+5.2% vs last month</p>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-info/20 rounded-xl">
                <Target className="w-6 h-6 text-info" />
              </div>
            </div>
            <div>
              <p className="text-2xl font-bold text-white mb-1">24.7%</p>
              <p className="text-sm text-muted">Click Rate</p>
              <p className="text-xs text-success mt-1">+8.1% vs last month</p>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-warning/20 rounded-xl">
                <Users className="w-6 h-6 text-warning" />
              </div>
            </div>
            <div>
              <p className="text-2xl font-bold text-white mb-1">1,234</p>
              <p className="text-sm text-muted">Subscribers</p>
              <p className="text-xs text-success mt-1">+23 new this week</p>
            </div>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card className="p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div className="flex-1 lg:max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted w-4 h-4" />
                <Input
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder="Search templates..."
                  className="pl-10"
                />
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-muted" />
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="bg-secondary border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {templateTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </Card>

        {/* Email Templates List */}
        <Card className="overflow-hidden mb-20">
          <div className="p-6 border-b border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">Email Templates</h3>
                <p className="text-sm text-muted">Manage your email marketing templates</p>
              </div>
              <span className="px-3 py-1 bg-primary/20 text-primary rounded-full text-sm font-medium">
                {filteredTemplates.length} templates
              </span>
            </div>
          </div>

          <div className="divide-y divide-white/10">
            {filteredTemplates.map((template) => (
              <div key={template.id} className="p-6 hover:bg-white/5 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="font-semibold text-white">{template.name}</h4>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${statusColors[template.status as keyof typeof statusColors]}`}>
                        {template.status}
                      </span>
                      <span className="px-2 py-1 bg-secondary rounded text-xs text-muted capitalize">
                        {template.type}
                      </span>
                    </div>

                    <p className="text-sm font-medium text-white mb-1">{template.subject}</p>
                    <p className="text-sm text-muted mb-4">{template.preview}</p>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-muted">Opens:</span>
                        <span className="ml-2 font-medium text-white">{template.opens.toLocaleString()}</span>
                        <span className="ml-1 text-success">({calculateOpenRate(template.opens)}%)</span>
                      </div>
                      <div>
                        <span className="text-muted">Clicks:</span>
                        <span className="ml-2 font-medium text-white">{template.clicks.toLocaleString()}</span>
                        <span className="ml-1 text-info">({calculateClickRate(template.clicks, template.opens)}%)</span>
                      </div>
                      <div>
                        <span className="text-muted">Created:</span>
                        <span className="ml-2 font-medium text-white">{template.created}</span>
                      </div>
                      <div>
                        <span className="text-muted">Last Sent:</span>
                        <span className="ml-2 font-medium text-white">{template.lastSent || 'Never'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    {template.status === 'active' && (
                      <Button
                        onClick={() => handleTemplateAction('send', template.id)}
                        size="sm"
                        variant="outline"
                      >
                        <Send className="w-4 h-4 mr-2" />
                        Send
                      </Button>
                    )}

                    <Button
                      onClick={() => handleTemplateAction('edit', template.id)}
                      size="sm"
                      variant="outline"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </Button>

                    <div className="relative">
                      <button
                        onClick={() => setSelectedTemplate(selectedTemplate === template.id ? null : template.id)}
                        className="p-2 rounded-lg bg-secondary border border-white/10 hover:bg-white/10 transition-colors"
                      >
                        <MoreVertical className="w-4 h-4 text-white" />
                      </button>

                      {selectedTemplate === template.id && (
                        <div className="absolute right-0 top-12 bg-secondary border border-white/10 rounded-lg shadow-lg z-10 min-w-[160px]">
                          <button
                            onClick={() => handleTemplateAction('duplicate', template.id)}
                            className="w-full flex items-center px-4 py-2 text-sm text-white hover:bg-white/10 transition-colors"
                          >
                            <Copy className="w-4 h-4 mr-2" />
                            Duplicate
                          </button>
                          <button
                            onClick={() => router.push(`/admin/marketing/templates/${template.id}`)}
                            className="w-full flex items-center px-4 py-2 text-sm text-white hover:bg-white/10 transition-colors"
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            Preview
                          </button>
                          <div className="border-t border-white/10"></div>
                          <button
                            onClick={() => handleTemplateAction('delete', template.id)}
                            className="w-full flex items-center px-4 py-2 text-sm text-error hover:bg-error/10 transition-colors"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredTemplates.length === 0 && (
            <div className="p-12 text-center">
              <Mail className="w-12 h-12 text-muted mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No templates found</h3>
              <p className="text-muted mb-4">
                {searchQuery || selectedType !== 'all'
                  ? 'Try adjusting your search or filter criteria'
                  : 'Create your first email template to get started'
                }
              </p>
              <Button onClick={() => router.push('/admin/marketing/templates/new')}>
                <Plus className="w-4 h-4 mr-2" />
                Create Template
              </Button>
            </div>
          )}
        </Card>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-white/10">
        <div className="grid grid-cols-4 py-2">
          <button
            onClick={() => router.push('/admin/dashboard')}
            className="flex flex-col items-center py-2 px-3 text-muted hover:text-white transition-colors"
          >
            <BarChart3 className="w-5 h-5 mb-1" />
            <span className="text-xs">Dashboard</span>
          </button>
          <button
            onClick={() => router.push('/admin/products')}
            className="flex flex-col items-center py-2 px-3 text-muted hover:text-white transition-colors"
          >
            <FileText className="w-5 h-5 mb-1" />
            <span className="text-xs">Products</span>
          </button>
          <button
            onClick={() => router.push('/admin/orders')}
            className="flex flex-col items-center py-2 px-3 text-muted hover:text-white transition-colors"
          >
            <Users className="w-5 h-5 mb-1" />
            <span className="text-xs">Orders</span>
          </button>
          <button
            onClick={() => router.push('/admin/settings')}
            className="flex flex-col items-center py-2 px-3 text-muted hover:text-white transition-colors"
          >
            <Mail className="w-5 h-5 mb-1" />
            <span className="text-xs">Settings</span>
          </button>
        </div>
      </div>

      <div className="h-16" />
    </div>
  );
}