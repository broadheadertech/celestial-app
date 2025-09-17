'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  FileText,
  Download,
  Calendar,
  Filter,
  Search,
  BarChart3,
  PieChart,
  TrendingUp,
  Users,
  ShoppingCart,
  Package,
  DollarSign,
  Clock,
  Eye,
  Share,
  Settings,
  RefreshCw,
} from 'lucide-react';
import Button from '@/components/ui/Button';

export default function ReportsPage() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedPeriod, setSelectedPeriod] = useState('30d');
  const [searchQuery, setSearchQuery] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateReport = (reportId) => {
    setIsGenerating(true);
    setTimeout(() => setIsGenerating(false), 2000);
  };

  // Mock reports data
  const reportsData = {
    categories: [
      { id: 'all', name: 'All Reports', count: 24 },
      { id: 'sales', name: 'Sales', count: 8 },
      { id: 'customers', name: 'Customers', count: 6 },
      { id: 'products', name: 'Products', count: 5 },
      { id: 'financial', name: 'Financial', count: 3 },
      { id: 'system', name: 'System', count: 2 },
    ],
    reports: [
      {
        id: 1,
        title: 'Sales Performance Report',
        description: 'Comprehensive sales analysis with trends and forecasting',
        category: 'sales',
        lastGenerated: '2 hours ago',
        size: '2.3 MB',
        type: 'PDF',
        frequency: 'Daily',
        icon: BarChart3,
        color: 'from-green-500/20 to-emerald-600/20 text-green-400',
      },
      {
        id: 2,
        title: 'Customer Analytics Report',
        description: 'Customer behavior, demographics, and retention analysis',
        category: 'customers',
        lastGenerated: '1 day ago',
        size: '1.8 MB',
        type: 'PDF',
        frequency: 'Weekly',
        icon: Users,
        color: 'from-purple-500/20 to-violet-600/20 text-purple-400',
      },
      {
        id: 3,
        title: 'Product Performance Dashboard',
        description: 'Top-selling products, inventory levels, and product analytics',
        category: 'products',
        lastGenerated: '3 hours ago',
        size: '1.5 MB',
        type: 'PDF',
        frequency: 'Daily',
        icon: Package,
        color: 'from-blue-500/20 to-cyan-600/20 text-blue-400',
      },
      {
        id: 4,
        title: 'Financial Summary',
        description: 'Revenue, expenses, profit margins, and financial KPIs',
        category: 'financial',
        lastGenerated: '12 hours ago',
        size: '900 KB',
        type: 'Excel',
        frequency: 'Weekly',
        icon: DollarSign,
        color: 'from-primary/20 to-orange-600/20 text-primary',
      },
      {
        id: 5,
        title: 'Order Fulfillment Report',
        description: 'Order processing times, delivery status, and fulfillment metrics',
        category: 'sales',
        lastGenerated: '6 hours ago',
        size: '1.2 MB',
        type: 'PDF',
        frequency: 'Daily',
        icon: ShoppingCart,
        color: 'from-cyan-500/20 to-blue-600/20 text-cyan-400',
      },
      {
        id: 6,
        title: 'System Performance Report',
        description: 'Server performance, uptime, and system health metrics',
        category: 'system',
        lastGenerated: '1 hour ago',
        size: '600 KB',
        type: 'PDF',
        frequency: 'Daily',
        icon: TrendingUp,
        color: 'from-red-500/20 to-pink-600/20 text-red-400',
      },
    ],
    quickStats: [
      { label: 'Total Reports', value: 24, growth: 8 },
      { label: 'Generated Today', value: 12, growth: 15 },
      { label: 'Scheduled Reports', value: 18, growth: 5 },
      { label: 'Data Sources', value: 6, growth: 0 },
    ]
  };

  const filteredReports = reportsData.reports.filter(report => {
    const matchesCategory = selectedCategory === 'all' || report.category === selectedCategory;
    const matchesSearch = report.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         report.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const ReportCard = ({ report }) => (
    <div className="bg-secondary/40 backdrop-blur-sm rounded-xl p-6 border border-white/10 hover:border-primary/30 transition-all duration-300 group">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-lg bg-gradient-to-br ${report.color}`}>
          <report.icon className="w-6 h-6" />
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" className="text-white/60 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity">
            <Share className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" className="text-white/60 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity">
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <h3 className="text-white font-bold text-lg mb-1">{report.title}</h3>
          <p className="text-white/70 text-sm">{report.description}</p>
        </div>

        <div className="flex items-center justify-between text-xs text-white/60">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <Clock className="w-3 h-3" />
              <span>{report.lastGenerated}</span>
            </div>
            <span>{report.size}</span>
            <span className="px-2 py-1 bg-white/10 rounded-full">{report.type}</span>
          </div>
          <span className="text-primary font-medium">{report.frequency}</span>
        </div>

        <div className="flex items-center space-x-2 pt-2">
          <Button
            size="sm"
            onClick={() => handleGenerateReport(report.id)}
            disabled={isGenerating}
            className="flex-1 bg-primary/90 hover:bg-primary"
          >
            {isGenerating ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            {isGenerating ? 'Generating...' : 'Download'}
          </Button>
          <Button variant="ghost" size="sm" className="border border-white/10">
            <Eye className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );

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
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">Reports Center</h1>
                  <p className="text-sm text-white/60">Generate and manage business reports</p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="bg-secondary/60 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-primary/50 focus:outline-none"
              >
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="90d">Last 90 Days</option>
                <option value="1y">Last Year</option>
              </select>

              <Button size="sm" className="bg-primary/90 hover:bg-primary">
                <Download className="w-4 h-4 mr-2" />
                Bulk Export
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 lg:p-6 space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-6">
          {reportsData.quickStats.map((stat, index) => (
            <div key={index} className="bg-secondary/40 backdrop-blur-sm rounded-xl p-6 border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white/70 text-sm font-medium">{stat.label}</span>
                {stat.growth > 0 && (
                  <span className="text-green-400 text-xs font-medium">+{stat.growth}%</span>
                )}
              </div>
              <span className="text-2xl font-bold text-white">{stat.value}</span>
            </div>
          ))}
        </div>

        {/* Filters and Search */}
        <div className="bg-secondary/40 backdrop-blur-sm rounded-xl p-6 border border-white/10">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between space-y-4 lg:space-y-0">
            {/* Categories */}
            <div className="flex items-center space-x-2 overflow-x-auto">
              {reportsData.categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                    selectedCategory === category.id
                      ? 'bg-primary text-white'
                      : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
                  }`}
                >
                  {category.name}
                  <span className="ml-2 text-xs opacity-70">({category.count})</span>
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative lg:w-80">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/50" />
              <input
                type="text"
                placeholder="Search reports..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:border-primary/50 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Reports Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredReports.map((report) => (
            <ReportCard key={report.id} report={report} />
          ))}
        </div>

        {/* Empty State */}
        {filteredReports.length === 0 && (
          <div className="bg-secondary/40 backdrop-blur-sm rounded-xl p-12 border border-white/10 text-center">
            <FileText className="w-16 h-16 text-white/40 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No Reports Found</h3>
            <p className="text-white/60 mb-6">
              {searchQuery ? 'Try adjusting your search query' : 'No reports match the selected category'}
            </p>
            <Button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
              }}
              className="bg-primary/90 hover:bg-primary"
            >
              Reset Filters
            </Button>
          </div>
        )}

        {/* Report Templates */}
        <div className="bg-secondary/40 backdrop-blur-sm rounded-xl p-6 border border-white/10">
          <h3 className="text-lg font-bold text-white mb-6">Custom Report Templates</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[
              { name: 'Sales Analysis', description: 'Custom sales performance analysis', icon: BarChart3 },
              { name: 'Customer Segmentation', description: 'Detailed customer behavior segmentation', icon: PieChart },
              { name: 'Inventory Report', description: 'Stock levels and inventory analytics', icon: Package },
            ].map((template, index) => (
              <div key={index} className="p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors border border-white/5 hover:border-white/20">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="p-2 bg-primary/20 rounded-lg">
                    <template.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="text-white font-medium text-sm">{template.name}</h4>
                    <p className="text-white/60 text-xs">{template.description}</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="w-full border border-white/10">
                  Create Report
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Scheduled Reports */}
        <div className="bg-secondary/40 backdrop-blur-sm rounded-xl p-6 border border-white/10">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-white">Scheduled Reports</h3>
            <Button variant="ghost" size="sm" className="text-primary">
              <Calendar className="w-4 h-4 mr-2" />
              Manage Schedule
            </Button>
          </div>

          <div className="space-y-3">
            {[
              { name: 'Daily Sales Report', nextRun: 'Tomorrow at 9:00 AM', frequency: 'Daily' },
              { name: 'Weekly Analytics', nextRun: 'Sunday at 6:00 AM', frequency: 'Weekly' },
              { name: 'Monthly Financial Summary', nextRun: 'Next month on 1st', frequency: 'Monthly' },
            ].map((scheduled, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <div>
                  <p className="text-white text-sm font-medium">{scheduled.name}</p>
                  <p className="text-white/60 text-xs">Next run: {scheduled.nextRun}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-primary text-xs font-medium px-2 py-1 bg-primary/20 rounded-full">
                    {scheduled.frequency}
                  </span>
                  <Button variant="ghost" size="sm" className="text-white/60">
                    <Settings className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}