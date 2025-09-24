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
} from "lucide-react";
import { useAuthStore, useIsAuthenticated } from "@/store/auth";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { getRelativeTime } from "@/lib/utils";
import Button from "@/components/ui/Button";
import ControlPanelNav from "@/components/ControlPanelNav";

export default function ControlPanel() {
  const router = useRouter();
  const { user } = useAuthStore();
  const isAuthenticated = useIsAuthenticated();

  const [dateRange, setDateRange] = useState("30");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [productFilter, setProductFilter] = useState<string>("all");

  // Fetch real data from Convex analytics service
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




  // Generate daily traffic (placeholder - would need real analytics data)
  // Daily traffic data would require real analytics integration



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
                  Analytics Dashboard
                </h1>
                <p className="text-sm text-white/60 mt-1">
                  Monitor your business performance and insights
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
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {formattedKpiData.map((kpi, index) => (
              <div
                key={index}
                className="bg-secondary/40 backdrop-blur-sm rounded-xl p-6 border border-white/10"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-primary/20 rounded-lg">
                    <kpi.icon className="w-5 h-5 text-primary" />
                  </div>
                  <button className="text-white/40 hover:text-white/60">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2">
                  <p className="text-sm text-white/70 font-medium">
                    {kpi.title}
                  </p>
                  <p className="text-2xl font-bold text-white">{kpi.value}</p>
                  <div className="flex items-center gap-2">
                    <div
                      className={`flex items-center gap-1 text-sm ${
                        kpi.trend === "up" ? "text-green-400" : "text-red-400"
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
                <div className="flex items-center gap-2">
                  <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                    <Filter className="w-4 h-4 text-white/60" />
                  </button>
                  <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                    <MoreVertical className="w-4 h-4 text-white/60" />
                  </button>
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
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="month" stroke="#9CA3AF" fontSize={12} />
                    <YAxis stroke="#9CA3AF" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1F2937",
                        border: "1px solid #374151",
                        borderRadius: "8px",
                      }}
                      labelStyle={{ color: "#F3F4F6" }}
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
                        backgroundColor: "#1F2937",
                        border: "1px solid #374151",
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
                  <div className="w-8 h-8 bg-gradient-to-br from-primary to-orange-600 rounded-lg flex items-center justify-center">
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
                  <button className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
                    <Search className="w-4 h-4 text-white/60" />
                  </button>
                  <button className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
                    <MoreVertical className="w-4 h-4 text-white/60" />
                  </button>
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
                              <div className="relative flex-1 h-8 rounded-full bg-neutral-800">
                                <div
                                  className="h-full bg-gradient-to-r from-primary to-orange-600 rounded-full transition-all duration-500"
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
                                ? "text-red-400"
                                : product.stockLevel === "Medium"
                                  ? "text-yellow-400"
                                  : "text-green-400"
                            }`}
                          >
                            {product.stockLevel}
                          </p>
                        </div>
                        <div className="col-span-2 text-center">
                          <p className="text-green-400 font-medium">
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
                                ? "text-green-400"
                                : "text-red-400"
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
                          : categoriesData?.find(cat => cat._id === productFilter)?.name?.toLowerCase() + " products" || "filtered products"}
                      </span>
                      <div className="flex items-center space-x-4">
                        <span className="text-info font-medium">
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
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="week" stroke="#9CA3AF" fontSize={12} />
                    <YAxis stroke="#9CA3AF" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1F2937",
                        border: "1px solid #374151",
                        borderRadius: "8px",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="newCustomers"
                      stroke="#10B981"
                      strokeWidth={3}
                      dot={{ fill: "#10B981", strokeWidth: 2, r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="returning"
                      stroke="#8B5CF6"
                      strokeWidth={3}
                      dot={{ fill: "#8B5CF6", strokeWidth: 2, r: 4 }}
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
                <Button variant="ghost" size="sm" className="text-primary">
                  <Eye className="w-4 h-4 mr-2" />
                  View All
                </Button>
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
                              ? "bg-green-400"
                              : activity.status === "warning"
                                ? "bg-yellow-400"
                                : "bg-blue-400"
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
      </div>
    </div>
  );
}
