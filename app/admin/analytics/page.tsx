'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import BottomNavbar from '@/components/common/BottomNavbar';
import SafeAreaProvider from '@/components/provider/SafeAreaProvider';
import {
  ArrowLeft,
  BarChart3,
  TrendingUp,
  DollarSign,
  Users,
  Package,
  ShoppingBag,
  Target,
  RefreshCw,
  Sparkles,
  Brain,
  AlertTriangle,
  CheckCircle,
  ArrowUpRight,
  ArrowDownRight,
  Lightbulb,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts';
import Button from '@/components/ui/Button';

type Tab = 'descriptive' | 'diagnostic' | 'predictive' | 'prescriptive';

function AdminAnalyticsContent() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('descriptive');

  const fmt = (amount: number) => `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

  // Fetch data
  const kpis = useQuery(api.services.analytics.getDashboardKPIs);
  const revenueData = useQuery(api.services.analytics.getRevenueData);
  const topProducts = useQuery(api.services.analytics.getTopProducts, { limit: 5 });
  const categoryData = useQuery(api.services.analytics.getCategoryData);
  const customerGrowth = useQuery(api.services.analytics.getCustomerGrowth);
  const stockSummary = useQuery(api.services.stock.getStockSummary);
  const insightsData = useQuery(api.services.aiInsights.generateInsights, {});

  const dataReady = kpis && revenueData && topProducts;

  const tabs: { id: Tab; label: string; shortLabel: string; color: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'descriptive', label: 'Descriptive', shortLabel: 'Describe', color: 'text-blue-400', icon: BarChart3 },
    { id: 'diagnostic', label: 'Diagnostic', shortLabel: 'Diagnose', color: 'text-yellow-400', icon: Brain },
    { id: 'predictive', label: 'Predictive', shortLabel: 'Predict', color: 'text-purple-400', icon: TrendingUp },
    { id: 'prescriptive', label: 'Prescriptive', shortLabel: 'Prescribe', color: 'text-green-400', icon: Sparkles },
  ];

  const tabColors: Record<Tab, string> = {
    descriptive: 'bg-blue-500',
    diagnostic: 'bg-yellow-500',
    predictive: 'bg-purple-500',
    prescriptive: 'bg-green-500',
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-20 sm:pb-6">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-white/10 safe-area-top">
        <div className="px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => router.back()}
                className="p-1.5 rounded-lg bg-secondary border border-white/10 hover:bg-white/10 transition-colors"
              >
                <ArrowLeft className="w-4 h-4 text-white" />
              </button>
              <div>
                <h1 className="text-lg font-bold text-white">Analytics</h1>
                <p className="text-xs text-white/60">DDPP Business Intelligence</p>
              </div>
            </div>
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
              size="sm"
              className="text-sm px-3 py-1.5"
            >
              <RefreshCw className="w-3 h-3 mr-1.5" />
              Refresh
            </Button>
          </div>

          {/* DDPP Tabs */}
          <div className="flex gap-1 bg-secondary/40 rounded-lg p-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-md text-xs font-medium transition-all ${
                    activeTab === tab.id
                      ? `${tabColors[tab.id]} text-white shadow-sm`
                      : 'text-white/40 hover:text-white/70'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.shortLabel}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {!dataReady ? (
        <div className="text-center py-20">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-white/60">Loading analytics...</p>
        </div>
      ) : (
        <div className="px-4 sm:px-6 py-4">

          {/* ==================== DESCRIPTIVE: What happened? ==================== */}
          {activeTab === 'descriptive' && (
            <div className="space-y-4">
              <div className="mb-2">
                <h2 className="text-base font-bold text-blue-400">What happened?</h2>
                <p className="text-xs text-white/50">Current state of your business — raw facts and figures</p>
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { title: 'Total Revenue', value: fmt(kpis.totalRevenue), change: kpis.changes.revenue, icon: DollarSign, color: 'text-primary' },
                  { title: 'Total Orders', value: kpis.totalOrders.toString(), change: kpis.changes.orders, icon: ShoppingBag, color: 'text-info' },
                  { title: 'Customers', value: kpis.totalCustomers.toString(), change: kpis.changes.customers, icon: Users, color: 'text-success' },
                  { title: 'Conversion', value: `${kpis.conversionRate}%`, change: kpis.changes.conversion, icon: Target, color: 'text-warning' },
                ].map((stat) => {
                  const Icon = stat.icon;
                  const isPositive = stat.change.includes('+');
                  return (
                    <div key={stat.title} className="bg-secondary/40 rounded-xl p-3 border border-white/10">
                      <div className="flex items-center justify-between mb-2">
                        <Icon className={`w-4 h-4 ${stat.color}`} />
                        <span className={`text-xs font-medium flex items-center gap-0.5 ${isPositive ? 'text-success' : 'text-error'}`}>
                          {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                          {stat.change}
                        </span>
                      </div>
                      <p className="text-lg font-bold text-white">{stat.value}</p>
                      <p className="text-xs text-white/60">{stat.title}</p>
                    </div>
                  );
                })}
              </div>

              {/* Stock Summary */}
              {stockSummary && (
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-secondary/40 rounded-xl p-3 border border-white/10">
                    <p className="text-xs text-white/60">Stock Value</p>
                    <p className="text-sm font-bold text-primary">{fmt(stockSummary.totalValue)}</p>
                  </div>
                  <div className="bg-secondary/40 rounded-xl p-3 border border-white/10">
                    <p className="text-xs text-white/60">Units Sold</p>
                    <p className="text-sm font-bold text-success">{stockSummary.totalSoldQty}</p>
                  </div>
                  <div className="bg-secondary/40 rounded-xl p-3 border border-white/10">
                    <p className="text-xs text-white/60">Mortality</p>
                    <p className="text-sm font-bold text-error">{stockSummary.totalDamagedQty}</p>
                  </div>
                </div>
              )}

              {/* Revenue Chart */}
              <div className="bg-secondary/40 rounded-xl p-4 border border-white/10">
                <h3 className="text-sm font-bold text-white mb-3">Monthly Revenue</h3>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={revenueData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="month" stroke="#9CA3AF" fontSize={10} />
                      <YAxis stroke="#9CA3AF" fontSize={10} />
                      <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }} labelStyle={{ color: '#F3F4F6' }} formatter={(value: number) => [fmt(value), 'Revenue']} />
                      <Bar dataKey="revenue" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Insights bullets */}
              {insightsData && insightsData.insights.descriptive.length > 0 && (
                <div className="bg-blue-500/5 rounded-xl p-4 border border-blue-500/20">
                  <h3 className="text-xs font-bold text-blue-400 mb-2 uppercase tracking-wider">Key Facts</h3>
                  <div className="space-y-1.5">
                    {insightsData.insights.descriptive.map((item: string, i: number) => (
                      <p key={i} className="text-xs sm:text-sm text-white/80 flex gap-2">
                        <span className="text-blue-400 flex-shrink-0">•</span>
                        <span>{item}</span>
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ==================== DIAGNOSTIC: Why did it happen? ==================== */}
          {activeTab === 'diagnostic' && (
            <div className="space-y-4">
              <div className="mb-2">
                <h2 className="text-base font-bold text-yellow-400">Why did it happen?</h2>
                <p className="text-xs text-white/50">Root causes, trend analysis, and correlations</p>
              </div>

              {/* Data Quality */}
              {insightsData && insightsData.insights.dataQuality.length > 0 && (
                <div className="bg-warning/5 rounded-xl p-4 border border-warning/20">
                  <h3 className="text-sm font-bold text-warning mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Data Gaps Affecting Analysis
                  </h3>
                  <div className="space-y-1.5">
                    {insightsData.insights.dataQuality.map((item: string, i: number) => (
                      <p key={i} className="text-xs sm:text-sm text-warning/80 flex gap-2">
                        <span className="text-warning flex-shrink-0">!</span>
                        <span>{item}</span>
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Category Performance */}
              {categoryData && categoryData.length > 0 && (
                <div className="bg-secondary/40 rounded-xl p-4 border border-white/10">
                  <h3 className="text-sm font-bold text-white mb-3">Category Performance</h3>
                  <div className="h-48 flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={categoryData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" label={({ name, value }) => `${name} ${value}%`} labelLine={false}>
                          {categoryData.map((entry: any, index: number) => (
                            <Cell key={index} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }} formatter={(value: number, name: string) => [`${value}%`, name]} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {categoryData.map((cat: any, i: number) => (
                      <div key={i} className="flex items-center gap-1.5 text-xs text-white/70">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                        {cat.name} ({cat.count})
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Top vs Bottom Products */}
              <div className="bg-secondary/40 rounded-xl p-4 border border-white/10">
                <h3 className="text-sm font-bold text-white mb-3">Product Revenue Comparison</h3>
                <div className="space-y-2">
                  {topProducts.map((product: any, i: number) => {
                    const maxRev = Math.max(...topProducts.map((p: any) => p.revenue));
                    const pct = maxRev > 0 ? (product.revenue / maxRev) * 100 : 0;
                    return (
                      <div key={product.id} className="flex items-center gap-2">
                        <span className="text-xs text-white/50 w-5">{i + 1}</span>
                        <span className="text-xs text-white/80 w-28 truncate">{product.name}</span>
                        <div className="flex-1 h-4 rounded-full bg-neutral-800 overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs font-medium text-white w-16 text-right">{fmt(product.revenue)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Diagnostic insights */}
              {insightsData && insightsData.insights.diagnostic.length > 0 && (
                <div className="bg-yellow-500/5 rounded-xl p-4 border border-yellow-500/20">
                  <h3 className="text-xs font-bold text-yellow-400 mb-2 uppercase tracking-wider">Root Cause Analysis</h3>
                  <div className="space-y-1.5">
                    {insightsData.insights.diagnostic.map((item: string, i: number) => (
                      <p key={i} className="text-xs sm:text-sm text-white/80 flex gap-2">
                        <span className="text-yellow-400 flex-shrink-0">•</span>
                        <span>{item}</span>
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ==================== PREDICTIVE: What will happen? ==================== */}
          {activeTab === 'predictive' && (
            <div className="space-y-4">
              <div className="mb-2">
                <h2 className="text-base font-bold text-purple-400">What will happen?</h2>
                <p className="text-xs text-white/50">Forecasts and projections based on current trends</p>
              </div>

              {/* Customer Growth Trend */}
              {customerGrowth && (
                <div className="bg-secondary/40 rounded-xl p-4 border border-white/10">
                  <h3 className="text-sm font-bold text-white mb-3">Customer Growth Trend</h3>
                  <p className="text-xs text-white/50 mb-3">New signups over last 4 weeks — extrapolate forward</p>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={customerGrowth}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="week" stroke="#9CA3AF" fontSize={10} />
                        <YAxis stroke="#9CA3AF" fontSize={10} />
                        <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }} />
                        <Area type="monotone" dataKey="newCustomers" stroke="#A855F7" fill="#A855F730" name="New Customers" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Revenue Projection */}
              <div className="bg-secondary/40 rounded-xl p-4 border border-white/10">
                <h3 className="text-sm font-bold text-white mb-3">Revenue Trajectory</h3>
                <p className="text-xs text-white/50 mb-3">Monthly revenue pattern — identify seasonal trends</p>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={revenueData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="month" stroke="#9CA3AF" fontSize={10} />
                      <YAxis stroke="#9CA3AF" fontSize={10} />
                      <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }} labelStyle={{ color: '#F3F4F6' }} formatter={(value: number) => [fmt(value), 'Revenue']} />
                      <Area type="monotone" dataKey="revenue" stroke="#A855F7" fill="#A855F720" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Predictive insights */}
              {insightsData && insightsData.insights.predictive.length > 0 && (
                <div className="bg-purple-500/5 rounded-xl p-4 border border-purple-500/20">
                  <h3 className="text-xs font-bold text-purple-400 mb-2 uppercase tracking-wider">Forecasts & Projections</h3>
                  <div className="space-y-1.5">
                    {insightsData.insights.predictive.map((item: string, i: number) => (
                      <p key={i} className="text-xs sm:text-sm text-white/80 flex gap-2">
                        <span className="text-purple-400 flex-shrink-0">•</span>
                        <span>{item}</span>
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ==================== PRESCRIPTIVE: What should we do? ==================== */}
          {activeTab === 'prescriptive' && (
            <div className="space-y-4">
              <div className="mb-2">
                <h2 className="text-base font-bold text-green-400">What should we do?</h2>
                <p className="text-xs text-white/50">Actionable recommendations to improve performance</p>
              </div>

              {/* Priority Actions */}
              {insightsData && insightsData.insights.prescriptive.length > 0 && (
                <div className="space-y-2">
                  {insightsData.insights.prescriptive.map((item: string, i: number) => {
                    const isUrgent = item.toLowerCase().includes('immediately') || item.toLowerCase().includes('restock') || item.toLowerCase().includes('out of stock');
                    const isData = item.toLowerCase().includes('cost price') || item.toLowerCase().includes('sales associate') || item.toLowerCase().includes('assign');
                    const isGrowth = item.toLowerCase().includes('promote') || item.toLowerCase().includes('bundle') || item.toLowerCase().includes('pricing');

                    const borderColor = isUrgent ? 'border-error/30 bg-error/5' : isData ? 'border-warning/30 bg-warning/5' : isGrowth ? 'border-success/30 bg-success/5' : 'border-white/10 bg-secondary/40';
                    const tagColor = isUrgent ? 'bg-error/20 text-error' : isData ? 'bg-warning/20 text-warning' : isGrowth ? 'bg-success/20 text-success' : 'bg-primary/20 text-primary';
                    const tag = isUrgent ? 'Urgent' : isData ? 'Data Fix' : isGrowth ? 'Growth' : 'Action';
                    const Icon = isUrgent ? AlertTriangle : isData ? Brain : isGrowth ? TrendingUp : Lightbulb;

                    return (
                      <div key={i} className={`rounded-xl p-4 border ${borderColor}`}>
                        <div className="flex items-start gap-3">
                          <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isUrgent ? 'text-error' : isData ? 'text-warning' : isGrowth ? 'text-success' : 'text-primary'}`} />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${tagColor}`}>{tag}</span>
                              <span className="text-[10px] text-white/30">#{i + 1}</span>
                            </div>
                            <p className="text-xs sm:text-sm text-white/90">{item}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Data Quality Fixes */}
              {insightsData && insightsData.insights.dataQuality.length > 0 && (
                <div className="bg-warning/5 rounded-xl p-4 border border-warning/20">
                  <h3 className="text-sm font-bold text-warning mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Data Completeness Checklist
                  </h3>
                  <div className="space-y-2">
                    {insightsData.insights.dataQuality.map((item: string, i: number) => (
                      <div key={i} className="flex items-start gap-2">
                        <div className="w-4 h-4 rounded border border-warning/40 flex-shrink-0 mt-0.5" />
                        <p className="text-xs sm:text-sm text-warning/80">{item}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Wins Summary */}
              <div className="bg-green-500/5 rounded-xl p-4 border border-green-500/20">
                <h3 className="text-sm font-bold text-green-400 mb-2 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Summary
                </h3>
                <p className="text-xs sm:text-sm text-white/70">
                  {insightsData ? `${insightsData.insights.prescriptive.length} action items identified. ${insightsData.insights.dataQuality.length > 0 ? `Fix ${insightsData.insights.dataQuality.length} data gap${insightsData.insights.dataQuality.length > 1 ? 's' : ''} first for more accurate insights.` : 'Your data is complete — focus on the growth actions above.'}` : 'Loading recommendations...'}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      <BottomNavbar />

      <style jsx global>{`
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        @media (min-width: 480px) { .xs\\:inline { display: inline; } }
      `}</style>
    </div>
  );
}

export default function AdminAnalyticsPage() {
  return (
    <SafeAreaProvider applySafeArea={false}>
      <AdminAnalyticsContent />
    </SafeAreaProvider>
  );
}
