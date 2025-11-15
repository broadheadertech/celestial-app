"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  BarChart,
  Bar,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from "recharts";
import {
  TrendingUp,
  Users,
  ShoppingCart,
  Package,
  DollarSign,
  Calendar,
  Download,
  RefreshCw,
  MoreVertical,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  Filter,
  Search,
  Fish,
  Box,
  ChevronDown,
  Activity,
  Target,
  Zap,
  Lightbulb,
  Clock,
  AlertTriangle,
  TrendingDown,
  Percent,
  Tag,
  Mail,
  Gift,
} from "lucide-react";
import { useAuthStore, useIsAuthenticated } from "@/store/auth";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { getRelativeTime } from "@/lib/utils";
import Button from "@/components/ui/Button";
import ControlPanelNav from "@/components/ControlPanelNav";

type AnalyticsTab = "descriptive" | "diagnostic" | "predictive" | "prescriptive";

export default function ControlPanel() {
  const router = useRouter();
  const { user } = useAuthStore();
  const isAuthenticated = useIsAuthenticated();

  const [dateRange, setDateRange] = useState("30");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [productFilter, setProductFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<AnalyticsTab>("descriptive");
  const [selectedMetric, setSelectedMetric] = useState<"revenue" | "orders" | "customers">("revenue");

  // Fetch real data from Convex analytics service - DESCRIPTIVE
  const kpiData = useQuery(api.services.analytics.getDashboardKPIs, {});
  const categoriesData = useQuery(api.services.categories.getCategories, {});
  const topProductsData = useQuery(api.services.analytics.getTopProducts, {
    limit: 8,
    categoryId: productFilter !== "all" ? productFilter as any : undefined
  });
  const revenueData = useQuery(api.services.analytics.getRevenueData, {});
  const categoryData = useQuery(api.services.analytics.getCategoryData, {});
  const customerGrowth = useQuery(api.services.analytics.getCustomerGrowth, {});
  const recentActivity = useQuery(api.services.analytics.getRecentActivity, { limit: 5 });

  // DIAGNOSTIC Analytics
  const peakHoursData = useQuery(api.services.advancedAnalytics.getPeakHoursAnalysis, {});
  const productCorrelations = useQuery(api.services.advancedAnalytics.getProductCorrelationAnalysis, {});
  const customerRetention = useQuery(api.services.advancedAnalytics.getCustomerRetentionAnalysis, {});
  const salesDiagnostics = useQuery(api.services.advancedAnalytics.getSalesPerformanceDiagnostics, {});

  // PREDICTIVE Analytics
  const revenueForecast = useQuery(api.services.advancedAnalytics.getRevenueForecast, { months: 3 });
  const restockPredictions = useQuery(api.services.advancedAnalytics.getPredictedRestockNeeds, {});
  const churnPredictions = useQuery(api.services.advancedAnalytics.getPredictedCustomerChurn, {});

  // PRESCRIPTIVE Analytics
  const businessRecommendations = useQuery(api.services.advancedAnalytics.getBusinessRecommendations, {});
  const pricingRecommendations = useQuery(api.services.advancedAnalytics.getPricingRecommendations, {});
  const marketingRecommendations = useQuery(api.services.advancedAnalytics.getMarketingRecommendations, {});

  // Redirect if not authenticated or not admin/super_admin user
  useEffect(() => {
    if (
      !isAuthenticated ||
      (user && !["admin", "super_admin"].includes(user.role || ""))
    ) {
      router.push("/auth/login");
    }
  }, [isAuthenticated, user, router]);

  // Format KPI data from analytics service
  const formattedKpiData = useMemo(() => {
    if (!kpiData) return [];

    return [
      {
        title: "Total Revenue",
        value: `₱${kpiData.totalRevenue.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        change: kpiData.changes.revenue,
        trend: kpiData.changes.revenue.startsWith("+") ? "up" as const : "down" as const,
        period: "vs last month",
        icon: DollarSign,
      },
      {
        title: "Active Orders",
        value: kpiData.activeOrders.toString(),
        change: kpiData.changes.orders,
        trend: kpiData.changes.orders.startsWith("+") ? "up" as const : "down" as const,
        period: "vs last month",
        icon: ShoppingCart,
      },
      {
        title: "Total Customers",
        value: kpiData.totalCustomers.toString(),
        change: kpiData.changes.customers,
        trend: kpiData.changes.customers.startsWith("+") ? "up" as const : "down" as const,
        period: "vs last month",
        icon: Users,
      },
      {
        title: "Conversion Rate",
        value: `${kpiData.conversionRate}%`,
        change: kpiData.changes.conversion,
        trend: kpiData.changes.conversion.startsWith("+") ? "up" as const : "down" as const,
        period: "orders per customer",
        icon: TrendingUp,
      },
    ];
  }, [kpiData]);

  // Loading state
  const isLoading = !kpiData || !topProductsData || !revenueData || !categoryData || !customerGrowth || !recentActivity || !categoriesData;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex">
        <ControlPanelNav />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 text-primary animate-spin mx-auto mb-4" />
            <p className="text-white/60">Loading dashboard data...</p>
          </div>
        </div>
      </div>
    );
  }

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1500);
  };

  const tabs = [
    { id: "descriptive" as AnalyticsTab, label: "Descriptive", icon: Activity, description: "What happened?" },
    { id: "diagnostic" as AnalyticsTab, label: "Diagnostic", icon: Target, description: "Why did it happen?" },
    { id: "predictive" as AnalyticsTab, label: "Predictive", icon: Zap, description: "What will happen?" },
    { id: "prescriptive" as AnalyticsTab, label: "Prescriptive", icon: Lightbulb, description: "What should we do?" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Sidebar */}
      <ControlPanelNav />

      {/* Main Content */}
      <div className="ml-64 flex flex-col">
        {/* Header */}
        <div className="border-b border-white/10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-white">
                  Analytics & Reports
                </h1>
                <p className="text-sm text-white/60 mt-1">
                  Comprehensive business intelligence across all analytics types
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-white/60" />
                  <select
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value)}
                    className="bg-secondary/60 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-primary/50 focus:outline-none"
                  >
                    <option value="7">Last 7 days</option>
                    <option value="30">Last 30 days</option>
                    <option value="90">Last 90 days</option>
                    <option value="365">Last year</option>
                  </select>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="border border-white/10"
                >
                  <RefreshCw
                    className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
                  />
                  Refresh
                </Button>

                <Button size="sm" className="bg-primary hover:bg-primary/90">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-2 mt-4">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all ${
                      isActive
                        ? "bg-white/10 text-white border border-white/20"
                        : "text-white/60 hover:text-white/80 hover:bg-white/5"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <div className="text-left">
                      <div className="text-sm font-medium">{tab.label}</div>
                      <div className="text-xs opacity-70">{tab.description}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === "descriptive" && (
            <DescriptiveAnalytics
              kpiData={formattedKpiData}
              revenueData={revenueData}
              categoryData={categoryData}
              topProductsData={topProductsData}
              customerGrowth={customerGrowth}
              recentActivity={recentActivity}
              categoriesData={categoriesData}
              productFilter={productFilter}
              setProductFilter={setProductFilter}
            />
          )}

          {activeTab === "diagnostic" && (
            <DiagnosticAnalytics
              peakHoursData={peakHoursData}
              productCorrelations={productCorrelations}
              customerRetention={customerRetention}
              salesDiagnostics={salesDiagnostics}
            />
          )}

          {activeTab === "predictive" && (
            <PredictiveAnalytics
              revenueForecast={revenueForecast}
              restockPredictions={restockPredictions}
              churnPredictions={churnPredictions}
            />
          )}

          {activeTab === "prescriptive" && (
            <PrescriptiveAnalytics
              businessRecommendations={businessRecommendations}
              pricingRecommendations={pricingRecommendations}
              marketingRecommendations={marketingRecommendations}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// DESCRIPTIVE ANALYTICS COMPONENT
// ============================================
function DescriptiveAnalytics({
  kpiData,
  revenueData,
  categoryData,
  topProductsData,
  customerGrowth,
  recentActivity,
  categoriesData,
  productFilter,
  setProductFilter,
}: any) {
  const [selectedKpi, setSelectedKpi] = useState<number | null>(null);

  // Calculate additional insights
  const totalRevenue = kpiData.find((k: any) => k.title === "Total Revenue");
  const revenueValue = totalRevenue ? parseFloat(totalRevenue.value.replace(/[₱,]/g, '')) : 0;
  const avgOrderValue = kpiData.find((k: any) => k.title === "Active Orders")?.value 
    ? revenueValue / parseInt(kpiData.find((k: any) => k.title === "Active Orders").value) 
    : 0;

  return (
    <div className="space-y-6">
      {/* Enhanced KPI Cards with Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {kpiData.map((kpi: any, index: number) => (
          <div
            key={index}
            className={`bg-secondary/40 backdrop-blur-sm rounded-xl p-6 border transition-all cursor-pointer ${
              selectedKpi === index 
                ? "border-primary shadow-lg shadow-primary/20" 
                : "border-white/10 hover:border-white/20"
            }`}
            onClick={() => setSelectedKpi(selectedKpi === index ? null : index)}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-primary/20 rounded-lg">
                <kpi.icon className="w-5 h-5 text-primary" />
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  kpi.trend === "up" ? "bg-[#27AE60] animate-pulse" : "bg-[#E74C3C]"
                }`} />
                <button className="text-white/40 hover:text-white/60">
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-white/70 font-medium">
                {kpi.title}
              </p>
              <p className="text-2xl font-bold text-white">{kpi.value}</p>
              <div className="flex items-center gap-2">
                <div
                  className={`flex items-center gap-1 text-sm ${
                    kpi.trend === "up" ? "text-[#27AE60]" : "text-[#E74C3C]"
                  }`}
                >
                  {kpi.trend === "up" ? (
                    <ArrowUpRight className="w-4 h-4" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4" />
                  )}
                  <span className="font-medium">{kpi.change}</span>
                </div>
                <span className="text-xs text-white/50">{kpi.period}</span>
              </div>
              
              {/* Insight bar */}
              {selectedKpi === index && (
                <div className="mt-4 pt-4 border-t border-white/10 animate-fade-in">
                  <p className="text-xs text-white/60">
                    {index === 0 && `Avg Order Value: ₱${avgOrderValue.toFixed(2)}`}
                    {index === 1 && `Order Velocity: ${(parseInt(kpi.value) / 30).toFixed(1)} per day`}
                    {index === 2 && `Growth Rate: ${kpi.change}`}
                    {index === 3 && `Target: 15% conversion`}
                  </p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <div className="xl:col-span-2 bg-secondary/40 backdrop-blur-sm rounded-xl p-6 border border-white/10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-white">
                Revenue Trends
              </h3>
              <p className="text-sm text-white/60">
                Monthly revenue and order patterns
              </p>
            </div>
          </div>

          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient
                    id="revenueGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor="#FF6B00"
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="95%"
                      stopColor="#FF6B00"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                <XAxis dataKey="month" stroke="rgba(255, 255, 255, 0.6)" fontSize={12} />
                <YAxis stroke="rgba(255, 255, 255, 0.6)" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1A1A1A",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: "8px",
                  }}
                  labelStyle={{ color: "#FFFFFF" }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#FF6B00"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#revenueGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Distribution */}
        <div className="bg-secondary/40 backdrop-blur-sm rounded-xl p-6 border border-white/10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-white">
                Products by Category
              </h3>
              <p className="text-sm text-white/60">
                Product category breakdown
              </p>
            </div>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1A1A1A",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: "8px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-2 mt-4">
            {categoryData.map((category, index) => (
              <div
                key={index}
                className="flex items-center justify-between text-sm"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: category.color }}
                  />
                  <span className="text-white/80">{category.name}</span>
                </div>
                <div className="text-right">
                  <span className="text-white font-medium">
                    {category.value}%
                  </span>
                  <span className="text-white/50 ml-2">
                    ({category.count})
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Products Analytics */}
      {topProductsData.length > 0 && (
        <div className="bg-secondary/40 backdrop-blur-sm rounded-xl p-4 border border-white/10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-[#F39C12] rounded-lg flex items-center justify-center">
                <Package className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">
                  Top Products
                </h3>
                <p className="text-xs text-white/60">
                  Real-time performance data
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Category Filter Dropdown */}
              <div className="relative">
                <select
                  value={productFilter}
                  onChange={(e) => setProductFilter(e.target.value)}
                  className="bg-secondary/60 border border-white/10 rounded-lg px-3 py-2 pr-8 text-white text-sm focus:border-primary/50 focus:outline-none appearance-none"
                >
                  <option value="all">All Products</option>
                  {categoriesData?.map((category) => {
                    // Add category icons based on name
                    const getCategoryIcon = (name: string) => {
                      const lowerName = name.toLowerCase();
                      if (lowerName.includes('saltwater') || lowerName.includes('marine')) return '🐠';
                      if (lowerName.includes('freshwater')) return '🔵';
                      if (lowerName.includes('tank') || lowerName.includes('aquarium')) return '🟢';
                      return '📦';
                    };

                    return (
                      <option key={category._id} value={category._id}>
                        {getCategoryIcon(category.name)} {category.name}
                      </option>
                    );
                  })}
                </select>
                <ChevronDown className="w-4 h-4 text-white/60 absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Chart Column */}
            <div className="space-y-3">
              <div className="rounded-lg p-3">
                <h4 className="text-white font-medium text-sm mb-3">
                  Revenue Performance
                </h4>
                <div className="h-64">
                  <div className="space-y-2">
                    {topProductsData.map((product, index) => {
                      const maxRevenue = Math.max(
                        ...topProductsData.map((p) => p.revenue),
                      );
                      const revenuePercentage =
                        maxRevenue > 0
                          ? (product.revenue / maxRevenue) * 100
                          : 0;

                      return (
                        <div
                          key={product.id}
                          className="flex items-center mb-2"
                        >
                          <div className="flex items-center space-x-2 w-1/3 mr-4">
                            <span className="text-lg">{product.image}</span>
                            <div>
                              <p className="text-white text-sm font-medium leading-tight line-clamp-1">
                                {product.name}
                              </p>
                              <p className="text-white/60 text-xs">
                                #{index + 1} • {product.sales} sold
                              </p>
                            </div>
                          </div>
                          <div className="relative flex-1 h-8 rounded-full bg-[#0A0A0A]">
                            <div
                              className="h-full bg-gradient-to-r from-primary to-[#F39C12] rounded-full transition-all duration-500"
                              style={{
                                width: `${revenuePercentage}%`,
                              }}
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-white text-sm font-medium">
                              ₱{product.revenue.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Table Column */}
            <div className="bg-white/5 rounded-lg border border-white/10 overflow-hidden">
              <div className="p-3 border-b border-white/10">
                <h4 className="text-white font-medium text-sm">
                  Product Details
                </h4>
              </div>

              <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-white/5 text-xs text-white/60 font-medium border-b border-white/10">
                <div className="col-span-1">#</div>
                <div className="col-span-4">Product</div>
                <div className="col-span-2 text-center">Sales</div>
                <div className="col-span-2 text-center">Stock</div>
                <div className="col-span-2 text-center">Revenue</div>
                <div className="col-span-1 text-center">Margin</div>
              </div>

              <div className="max-h-64 overflow-y-auto">
                {topProductsData.map((product, index) => (
                  <div
                    key={product.id}
                    className="grid grid-cols-12 gap-2 px-3 py-3 text-xs hover:bg-white/5 transition-colors border-b border-white/5 last:border-b-0"
                  >
                    <div className="col-span-1 text-primary font-bold">
                      {index + 1}
                    </div>
                    <div className="col-span-4">
                      <div className="flex items-center space-x-2">
                        <span className="text-base">{product.image}</span>
                        <div>
                          <p className="text-white font-medium text-xs leading-tight line-clamp-1">
                            {product.name}
                          </p>
                          <p className="text-white/60 text-xs">
                            {product.category}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="col-span-2 text-center">
                      <p className="text-white font-medium">
                        {product.sales}
                      </p>
                      <p className="text-white/50 text-xs">
                        {product.reservations} reservations
                      </p>
                    </div>
                    <div className="col-span-2 text-center">
                      <p
                        className={`text-white font-medium ${
                          product.stockLevel === "Low"
                            ? "text-[#E74C3C]"
                            : product.stockLevel === "Medium"
                              ? "text-[#F39C12]"
                              : "text-[#27AE60]"
                        }`}
                      >
                        {product.stockLevel}
                      </p>
                    </div>
                    <div className="col-span-2 text-center">
                      <p className="text-[#27AE60] font-medium">
                        ₱
                        {product.revenue >= 1000
                          ? `${(product.revenue / 1000).toFixed(1)}K`
                          : product.revenue.toLocaleString()}
                      </p>
                    </div>
                    <div className="col-span-1 text-center">
                      <div
                        className={`flex items-center justify-center space-x-1 ${
                          product.trend === "up"
                            ? "text-[#27AE60]"
                            : "text-[#E74C3C]"
                        }`}
                      >
                        {product.trend === "up" ? (
                          <ArrowUpRight className="w-3 h-3" />
                        ) : (
                          <ArrowDownRight className="w-3 h-3" />
                        )}
                        <span className="font-medium">
                          {product.margin}%
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="px-3 py-2 bg-white/5 border-t border-white/10">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/60">
                    Showing: {topProductsData.length}{" "}
                    {productFilter === "all"
                      ? "products"
                      : (categoriesData?.find(cat => cat._id === productFilter)?.name?.toLowerCase() || "filtered") + " products"}
                  </span>
                  <div className="flex items-center space-x-4">
                    <span className="text-[#3498DB] font-medium">
                      Total Sales:{" "}
                      {topProductsData.reduce((acc, p) => acc + p.sales, 0)}
                    </span>
                    <span className="text-primary font-medium">
                      Total Revenue: ₱
                      {topProductsData
                        .reduce((acc, p) => acc + p.revenue, 0)
                        .toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Customer Growth */}
        <div className="bg-secondary/40 backdrop-blur-sm rounded-xl p-6 border border-white/10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-white">
                Customer Growth
              </h3>
              <p className="text-sm text-white/60">
                New vs returning customers
              </p>
            </div>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={customerGrowth}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                <XAxis dataKey="week" stroke="rgba(255, 255, 255, 0.6)" fontSize={12} />
                <YAxis stroke="rgba(255, 255, 255, 0.6)" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1A1A1A",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: "8px",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="newCustomers"
                  stroke="#27AE60"
                  strokeWidth={3}
                  dot={{ fill: "#27AE60", strokeWidth: 2, r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="returning"
                  stroke="#3498DB"
                  strokeWidth={3}
                  dot={{ fill: "#3498DB", strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-secondary/40 backdrop-blur-sm rounded-xl p-6 border border-white/10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-white">
                Recent Activity
              </h3>
              <p className="text-sm text-white/60">
                Latest system events and transactions
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {recentActivity.length > 0 ? (
              recentActivity.map((activity, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        activity.status === "success"
                          ? "bg-[#27AE60]"
                          : activity.status === "warning"
                            ? "bg-[#F39C12]"
                            : "bg-[#3498DB]"
                      }`}
                    />
                    <div>
                      <p className="text-white text-sm">
                        {activity.message}
                      </p>
                      <p className="text-white/50 text-xs">
                        {activity.time}
                      </p>
                    </div>
                  </div>
                  {activity.amount && (
                    <span className="text-white font-medium text-sm">
                      {activity.amount}
                    </span>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-white/60">No recent activity</p>
                <p className="text-white/40 text-sm mt-2">
                  Orders, reservations, and stock alerts will appear here
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// DIAGNOSTIC ANALYTICS COMPONENT
// ============================================
function DiagnosticAnalytics({ peakHoursData, productCorrelations, customerRetention, salesDiagnostics }: any) {
  if (!peakHoursData || !productCorrelations || !customerRetention || !salesDiagnostics) {
    return <div className="text-center py-12 text-white/60">Loading diagnostic analytics...</div>;
  }

  // Calculate diagnostic insights
  const performanceGrade = salesDiagnostics.trend === 'up' && Math.abs(parseFloat(salesDiagnostics.revenueChange)) > 10 
    ? 'Excellent' 
    : salesDiagnostics.trend === 'up' 
      ? 'Good' 
      : Math.abs(parseFloat(salesDiagnostics.revenueChange)) < 5 
        ? 'Fair' 
        : 'Needs Attention';

  const gradeColor = performanceGrade === 'Excellent' ? 'text-[#27AE60]' :
                     performanceGrade === 'Good' ? 'text-[#3498DB]' :
                     performanceGrade === 'Fair' ? 'text-[#F39C12]' : 'text-[#E74C3C]';

  return (
    <div className="space-y-6">
      {/* Diagnostic Summary Banner */}
      <div className="bg-gradient-to-r from-primary/20 to-[#F39C12]/20 backdrop-blur-sm rounded-xl p-6 border border-primary/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-primary/20 rounded-xl">
              <Target className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white mb-1">
                Root Cause Analysis Complete
              </h3>
              <p className="text-white/60">
                {salesDiagnostics.factors.length} key factors identified affecting performance
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-white/60">Performance Grade</p>
            <p className={`text-3xl font-bold ${gradeColor}`}>{performanceGrade}</p>
            <p className={`text-sm font-medium ${salesDiagnostics.trend === 'up' ? 'text-[#27AE60]' : 'text-[#E74C3C]'}`}>
              {salesDiagnostics.revenueChange}% vs last week
            </p>
          </div>
        </div>
      </div>

      {/* Enhanced Metric Cards with Context */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Peak Hour Card */}
        <div className="bg-secondary/40 backdrop-blur-sm rounded-xl p-6 border border-white/10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full -mr-16 -mt-16" />
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <Clock className="w-5 h-5 text-primary" />
              <span className="text-xs text-white/50 bg-primary/20 px-2 py-1 rounded">Peak Time</span>
            </div>
            <div>
              <p className="text-4xl font-bold text-white mb-1">{peakHoursData.peakHour}</p>
              <p className="text-sm text-white/60 mt-1">Peak Sales Hour</p>
              <div className="mt-3 pt-3 border-t border-white/10">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/50">Volume</span>
                  <span className="text-primary font-bold">{peakHoursData.peakVolume} sales</span>
                </div>
                <div className="mt-2 text-xs text-white/40">
                  💡 Schedule staff during peak hours
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Best Combo Card */}
        <div className="bg-secondary/40 backdrop-blur-sm rounded-xl p-6 border border-white/10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#3498DB]/10 rounded-full -mr-16 -mt-16" />
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <Package className="w-5 h-5 text-[#3498DB]" />
              <span className="text-xs text-white/50 bg-[#3498DB]/20 px-2 py-1 rounded">Cross-Sell</span>
            </div>
            <div>
              <p className="text-4xl font-bold text-white mb-1">{peakHoursData.bestCombo.frequency || 0}x</p>
              <p className="text-sm text-white/60 mt-1">Best Product Combo</p>
              <div className="mt-3 pt-3 border-t border-white/10">
                <div className="text-xs text-white/70 line-clamp-2">
                  {peakHoursData.bestCombo.products?.slice(0, 2).join(' + ') || 'No combo data'}
                </div>
                <div className="mt-2 text-xs text-white/40">
                  💡 Create bundle discount for this combo
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Retention Rate Card */}
        <div className="bg-secondary/40 backdrop-blur-sm rounded-xl p-6 border border-white/10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#27AE60]/10 rounded-full -mr-16 -mt-16" />
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <Users className="w-5 h-5 text-[#27AE60]" />
              <span className="text-xs text-white/50 bg-[#27AE60]/20 px-2 py-1 rounded">Loyalty</span>
            </div>
            <div>
              <p className="text-4xl font-bold text-white mb-1">{peakHoursData.retentionRate}%</p>
              <p className="text-sm text-white/60 mt-1">Retention Rate</p>
              <div className="mt-3 pt-3 border-t border-white/10">
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-[#27AE60] to-primary"
                    style={{ width: `${peakHoursData.retentionRate}%` }}
                  />
                </div>
                <div className="mt-2 text-xs text-white/40">
                  💡 {peakHoursData.retentionRate > 60 ? 'Great loyalty!' : 'Focus on retention campaigns'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Peak Hours Analysis */}
        <div className="bg-secondary/40 backdrop-blur-sm rounded-xl p-6 border border-white/10">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-white">Peak Hours Analysis</h3>
            <p className="text-sm text-white/60">Sales distribution throughout the day</p>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={peakHoursData.hourlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                <XAxis dataKey="hour" stroke="rgba(255, 255, 255, 0.6)" fontSize={11} />
                <YAxis stroke="rgba(255, 255, 255, 0.6)" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1A1A1A",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: "8px",
                  }}
                />
                <Bar dataKey="volume" fill="#FF6B00" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Customer Retention */}
        <div className="bg-secondary/40 backdrop-blur-sm rounded-xl p-6 border border-white/10">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-white">Customer Retention</h3>
            <p className="text-sm text-white/60">Customer segmentation by visit frequency</p>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={customerRetention.segments}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={120}
                  paddingAngle={2}
                  dataKey="value"
                  label={(entry) => `${entry.name}: ${entry.value}`}
                >
                  {customerRetention.segments.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Product Correlations */}
      {productCorrelations.correlations.length > 0 && (
        <div className="bg-secondary/40 backdrop-blur-sm rounded-xl p-6 border border-white/10">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-white">Product Correlation Analysis</h3>
            <p className="text-sm text-white/60">Frequently purchased together items</p>
          </div>
          <div className="space-y-3">
            {productCorrelations.correlations.slice(0, 5).map((combo: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
                    <span className="text-primary font-bold text-sm">#{index + 1}</span>
                  </div>
                  <div>
                    <p className="text-white font-medium">{combo.products.join(' + ')}</p>
                    <p className="text-white/50 text-sm">{combo.frequency} times purchased together</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[#27AE60] font-medium">₱{combo.revenue.toLocaleString()}</p>
                  <p className="text-white/50 text-xs">Total revenue</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sales Performance Diagnostics */}
      {salesDiagnostics && (
        <div className="bg-secondary/40 backdrop-blur-sm rounded-xl p-6 border border-white/10">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-white">Sales Performance Diagnostics</h3>
            <p className="text-sm text-white/60">Why sales increased or decreased</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-white/5 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                {salesDiagnostics.trend === 'up' ? (
                  <TrendingUp className="w-5 h-5 text-[#27AE60]" />
                ) : (
                  <TrendingDown className="w-5 h-5 text-[#E74C3C]" />
                )}
                <span className={`text-2xl font-bold ${salesDiagnostics.trend === 'up' ? 'text-[#27AE60]' : 'text-[#E74C3C]'}`}>
                  {salesDiagnostics.revenueChange}%
                </span>
              </div>
              <p className="text-white/60 text-sm">Revenue change (7 days)</p>
            </div>

            <div className="space-y-2">
              {salesDiagnostics.factors.map((factor: any, index: number) => (
                <div key={index} className={`p-3 rounded-lg border ${
                  factor.impact === 'positive' ? 'bg-[#27AE60]/10 border-[#27AE60]/20' : 'bg-[#E74C3C]/10 border-[#E74C3C]/20'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-white font-medium text-sm">{factor.factor}</span>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      factor.severity === 'high' ? 'bg-[#E74C3C]/20 text-[#E74C3C]' :
                      factor.severity === 'medium' ? 'bg-[#F39C12]/20 text-[#F39C12]' :
                      'bg-[#3498DB]/20 text-[#3498DB]'
                    }`}>{factor.severity}</span>
                  </div>
                  <p className="text-white/50 text-xs mt-1">{factor.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// PREDICTIVE ANALYTICS COMPONENT
// ============================================
function PredictiveAnalytics({ revenueForecast, restockPredictions, churnPredictions }: any) {
  if (!revenueForecast || !restockPredictions || !churnPredictions) {
    return <div className="text-center py-12 text-white/60">Loading predictive analytics...</div>;
  }

  const confidenceScore = revenueForecast.confidence === 'high' ? 85 : 
                          revenueForecast.confidence === 'medium' ? 65 : 45;
  const growthRate = parseFloat(revenueForecast.growthRate);
  const totalForecastRevenue = revenueForecast.forecast.reduce((sum: number, f: any) => sum + f.revenue, 0);

  return (
    <div className="space-y-6">
      {/* Forecast Summary Banner */}
      <div className="bg-gradient-to-r from-[#27AE60]/20 to-primary/20 backdrop-blur-sm rounded-xl p-6 border border-[#27AE60]/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-[#27AE60]/20 rounded-xl">
              <Zap className="w-8 h-8 text-[#27AE60]" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white mb-1">
                AI-Powered Forecast Model
              </h3>
              <p className="text-white/60">
                Based on {revenueForecast.historical.length} months of historical data
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-white/5 rounded-lg">
              <p className="text-xs text-white/60">Confidence</p>
              <p className="text-2xl font-bold text-[#27AE60]">{confidenceScore}%</p>
            </div>
            <div className="text-center p-3 bg-white/5 rounded-lg">
              <p className="text-xs text-white/60">Growth Rate</p>
              <p className={`text-2xl font-bold ${growthRate >= 0 ? 'text-[#27AE60]' : 'text-[#E74C3C]'}`}>
                {revenueForecast.growthRate}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Revenue Forecast with Enhanced Visualization */}
      <div className="bg-secondary/40 backdrop-blur-sm rounded-xl p-6 border border-white/10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              Revenue Forecast
              <span className="text-xs bg-[#27AE60]/20 text-[#27AE60] px-2 py-1 rounded">
                Next 3 Months
              </span>
            </h3>
            <p className="text-sm text-white/60">Projected revenue with confidence intervals</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-white/60">Total Forecast</p>
            <p className="text-2xl font-bold text-[#27AE60]">
              ₱{totalForecastRevenue.toLocaleString()}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <div className="flex items-center gap-1">
                <div className="w-3 h-0.5 bg-[#3498DB]" />
                <span className="text-xs text-white/50">Historical</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-0.5 bg-[#27AE60] opacity-50" style={{ borderTop: '2px dashed' }} />
                <span className="text-xs text-white/50">Forecast</span>
              </div>
            </div>
          </div>
        </div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={[...revenueForecast.historical, ...revenueForecast.forecast]}>
              <defs>
                <linearGradient id="historicalGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3498DB" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3498DB" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="forecastGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#27AE60" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#27AE60" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
              <XAxis dataKey="month" stroke="rgba(255, 255, 255, 0.6)" fontSize={12} />
              <YAxis stroke="rgba(255, 255, 255, 0.6)" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1A1A1A",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: "8px",
                }}
                formatter={(value: any, name: string) => [
                  `₱${value.toLocaleString()}`,
                  name === 'revenue' ? 'Revenue' : name
                ]}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#3498DB"
                fill="url(#historicalGradient)"
                strokeWidth={3}
                dot={false}
                data={revenueForecast.historical}
              />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#27AE60"
                strokeWidth={3}
                strokeDasharray="8 8"
                dot={{ fill: "#27AE60", strokeWidth: 2, r: 5 }}
                data={revenueForecast.forecast}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 p-4 bg-[#3498DB]/10 rounded-lg border border-[#3498DB]/20">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-[#3498DB] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-white font-medium">Forecast Accuracy</p>
              <p className="text-xs text-white/60 mt-1">
                {revenueForecast.confidence === 'high' && 'High confidence: Data shows consistent growth patterns'}
                {revenueForecast.confidence === 'medium' && 'Medium confidence: Some variance in historical data'}
                {revenueForecast.confidence === 'low' && 'Low confidence: Limited historical data or high variance'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Predicted Restock Needs */}
      {restockPredictions.length > 0 && (
        <div className="bg-secondary/40 backdrop-blur-sm rounded-xl p-6 border border-white/10">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-white">Predicted Restock Needs</h3>
            <p className="text-sm text-white/60">Products likely to need restocking soon</p>
          </div>
          <div className="space-y-3">
            {restockPredictions.map((prediction: any, index: number) => (
              <div key={index} className={`p-4 rounded-lg border ${
                prediction.urgency === 'high' ? 'bg-[#E74C3C]/10 border-[#E74C3C]/30' :
                prediction.urgency === 'medium' ? 'bg-[#F39C12]/10 border-[#F39C12]/30' :
                'bg-[#3498DB]/10 border-[#3498DB]/30'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-white font-medium">{prediction.productName}</p>
                    <div className="flex items-center gap-4 mt-2 text-sm">
                      <span className="text-white/60">Stock: {prediction.currentStock}</span>
                      <span className="text-white/60">Avg Daily Sales: {prediction.avgDailySales}</span>
                      <span className={`font-medium ${
                        prediction.urgency === 'high' ? 'text-[#E74C3C]' :
                        prediction.urgency === 'medium' ? 'text-[#F39C12]' : 'text-[#3498DB]'
                      }`}>
                        {prediction.daysUntilStockout} days until stockout
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-white/50 text-xs">Recommended order</p>
                    <p className="text-primary font-bold text-lg">{prediction.recommendedOrderQty} units</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Customer Churn Predictions */}
      {churnPredictions.length > 0 && (
        <div className="bg-secondary/40 backdrop-blur-sm rounded-xl p-6 border border-white/10">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-white">Customer Churn Risk</h3>
            <p className="text-sm text-white/60">Customers at risk of leaving</p>
          </div>
          <div className="space-y-3">
            {churnPredictions.slice(0, 10).map((customer: any, index: number) => (
              <div key={index} className="p-4 bg-white/5 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">{customer.name}</p>
                    <p className="text-white/50 text-sm">{customer.email}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-white/60 text-xs">Risk Score</p>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${
                              customer.riskLevel === 'high' ? 'bg-[#E74C3C]' :
                              customer.riskLevel === 'medium' ? 'bg-[#F39C12]' : 'bg-[#3498DB]'
                            }`}
                            style={{ width: `${customer.riskScore}%` }}
                          />
                        </div>
                        <span className={`font-bold text-sm ${
                          customer.riskLevel === 'high' ? 'text-[#E74C3C]' :
                          customer.riskLevel === 'medium' ? 'text-[#F39C12]' : 'text-[#3498DB]'
                        }`}>{customer.riskScore}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-white/60 text-xs">Last active</p>
                      <p className="text-white font-medium text-sm">{customer.daysSinceLastActivity} days ago</p>
                    </div>
                    <div className="px-3 py-1 rounded-lg bg-primary/20 text-primary text-xs font-medium">
                      {customer.recommendedAction}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// PRESCRIPTIVE ANALYTICS COMPONENT
// ============================================
function PrescriptiveAnalytics({ businessRecommendations, pricingRecommendations, marketingRecommendations }: any) {
  if (!businessRecommendations || !pricingRecommendations || !marketingRecommendations) {
    return <div className="text-center py-12 text-white/60">Loading prescriptive analytics...</div>;
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'inventory': return Package;
      case 'pricing': return Tag;
      case 'marketing': return Mail;
      case 'operations': return Activity;
      default: return Lightbulb;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-[#E74C3C]/20 border-[#E74C3C]/30 text-[#E74C3C]';
      case 'medium': return 'bg-[#F39C12]/20 border-[#F39C12]/30 text-[#F39C12]';
      case 'low': return 'bg-[#3498DB]/20 border-[#3498DB]/30 text-[#3498DB]';
      default: return 'bg-white/10 border-white/20 text-white';
    }
  };

  // Calculate total potential impact
  const totalPotentialRevenue = businessRecommendations.reduce((sum: number, rec: any) => 
    sum + (rec.estimatedRevenue || 0), 0
  );
  
  const highPriorityCount = businessRecommendations.filter((r: any) => r.priority === 'high').length;

  return (
    <div className="space-y-6">
      {/* Action Dashboard Summary */}
      <div className="bg-gradient-to-r from-primary/20 to-[#F39C12]/20 backdrop-blur-sm rounded-xl p-6 border border-primary/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-primary/20 rounded-xl">
              <Lightbulb className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white mb-1">
                Action Plan Ready
              </h3>
              <p className="text-white/60">
                {businessRecommendations.length} recommendations • {highPriorityCount} high priority
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-white/60">Potential Impact</p>
            <p className="text-3xl font-bold text-[#27AE60]">
              +₱{totalPotentialRevenue.toLocaleString()}
            </p>
            <p className="text-xs text-white/50 mt-1">If all actions implemented</p>
          </div>
        </div>
      </div>

      {/* Business Recommendations */}
      <div className="bg-secondary/40 backdrop-blur-sm rounded-xl p-6 border border-white/10">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            Business Recommendations
            <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded">
              AI-Generated
            </span>
          </h3>
          <p className="text-sm text-white/60">Prioritized actionable insights to improve performance</p>
        </div>
        <div className="space-y-4">
          {businessRecommendations.map((rec: any, index: number) => {
            const Icon = getCategoryIcon(rec.category);
            return (
              <div key={index} className={`p-5 rounded-lg border ${getPriorityColor(rec.priority)}`}>
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-white/10 rounded-lg">
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-white font-bold text-lg">{rec.title}</h4>
                      <span className="text-xs px-3 py-1 rounded-full bg-white/10 uppercase font-bold">
                        {rec.priority} priority
                      </span>
                    </div>
                    <p className="text-white/80 mb-3">{rec.description}</p>
                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div>
                        <p className="text-white/50 text-xs mb-1">Recommended Action</p>
                        <p className="text-white font-medium text-sm">{rec.action}</p>
                      </div>
                      <div>
                        <p className="text-white/50 text-xs mb-1">Expected Impact</p>
                        <p className="text-[#27AE60] font-medium text-sm">{rec.impact}</p>
                      </div>
                    </div>
                    {rec.estimatedRevenue && (
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/10">
                        <DollarSign className="w-4 h-4 text-[#27AE60]" />
                        <span className="text-[#27AE60] font-bold">
                          Estimated Revenue: ₱{rec.estimatedRevenue.toLocaleString()}
                        </span>
                      </div>
                    )}
                    {rec.products && (
                      <div className="mt-3">
                        <p className="text-white/50 text-xs mb-2">Affected Products:</p>
                        <div className="flex flex-wrap gap-2">
                          {rec.products.map((product: string, i: number) => (
                            <span key={i} className="px-2 py-1 bg-white/10 rounded text-xs text-white/80">
                              {product}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pricing Recommendations */}
      {pricingRecommendations.length > 0 && (
        <div className="bg-secondary/40 backdrop-blur-sm rounded-xl p-6 border border-white/10">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-white">Pricing Recommendations</h3>
            <p className="text-sm text-white/60">Optimal pricing based on demand and competition</p>
          </div>
          <div className="space-y-3">
            {pricingRecommendations.map((rec: any, index: number) => (
              <div key={index} className="p-4 bg-white/5 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-white font-medium">{rec.productName}</p>
                    <p className="text-white/50 text-sm mt-1">{rec.reason}</p>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <p className="text-white/50 text-xs">Current</p>
                      <p className="text-white font-medium">₱{rec.currentPrice.toLocaleString()}</p>
                    </div>
                    <ArrowUpRight className="w-5 h-5 text-primary" />
                    <div className="text-center">
                      <p className="text-white/50 text-xs">Suggested</p>
                      <p className="text-primary font-bold">₱{rec.suggestedPrice.toLocaleString()}</p>
                    </div>
                    <div className="text-center min-w-32">
                      <p className="text-white/50 text-xs">Expected Impact</p>
                      <p className="text-[#27AE60] font-medium text-sm">{rec.expectedImpact}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Marketing Campaigns */}
      {marketingRecommendations.length > 0 && (
        <div className="bg-secondary/40 backdrop-blur-sm rounded-xl p-6 border border-white/10">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-white">Marketing Campaign Recommendations</h3>
            <p className="text-sm text-white/60">Suggested campaigns to boost sales</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {marketingRecommendations.map((campaign: any, index: number) => (
              <div key={index} className="p-5 bg-gradient-to-br from-primary/10 to-[#F39C12]/10 rounded-lg border border-primary/20">
                <div className="flex items-start gap-3 mb-3">
                  <div className="p-2 bg-primary/20 rounded-lg">
                    <Gift className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-white font-bold">{campaign.title}</h4>
                    <span className="text-xs px-2 py-1 rounded-full bg-primary/20 text-primary mt-1 inline-block">
                      {campaign.type}
                    </span>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${getPriorityColor(campaign.priority)}`}>
                    {campaign.priority}
                  </span>
                </div>
                <p className="text-white/80 text-sm mb-3">{campaign.description}</p>
                <div className="space-y-2 mb-3">
                  {campaign.offer && (
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4 text-primary" />
                      <span className="text-white/80 text-sm">Offer: {campaign.offer}</span>
                    </div>
                  )}
                  {campaign.discount && (
                    <div className="flex items-center gap-2">
                      <Percent className="w-4 h-4 text-[#27AE60]" />
                      <span className="text-white/80 text-sm">Discount: {campaign.discount}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#3498DB]" />
                    <span className="text-white/80 text-sm">Target: {campaign.targetAudience}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary" />
                    <span className="text-white/80 text-sm">Duration: {campaign.duration}</span>
                  </div>
                </div>
                {campaign.estimatedRevenue && (
                  <div className="pt-3 border-t border-white/10">
                    <div className="flex items-center justify-between">
                      <span className="text-white/50 text-xs">Estimated Revenue</span>
                      <span className="text-[#27AE60] font-bold">₱{campaign.estimatedRevenue.toLocaleString()}</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}