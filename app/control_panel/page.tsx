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
} from "lucide-react";
import { useAuthStore, useIsAuthenticated } from "@/store/auth";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Button from "@/components/ui/Button";
import ControlPanelNav from "@/components/ControlPanelNav";

export default function ControlPanel() {
  const router = useRouter();
  const { user } = useAuthStore();
  const isAuthenticated = useIsAuthenticated();

  const [dateRange, setDateRange] = useState("30");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch real data from Convex
  const productsQuery = useQuery(api.services.products.getProducts, {
    isActive: true,
  });
  const ordersQuery = useQuery(api.services.orders.getAllOrdersAdmin, {});
  const reservationsQuery = useQuery(
    api.services.reservations.getAllReservationsAdmin,
    {},
  );
  const usersQuery = useQuery(api.services.admin.getAllUsers, {});

  // Redirect if not authenticated or not admin/super_admin user
  useEffect(() => {
    if (
      !isAuthenticated ||
      (user && !["admin", "super_admin"].includes(user.role || ""))
    ) {
      router.push("/auth/login");
    }
  }, [isAuthenticated, user, router]);

  // Calculate real KPI data from queries
  const kpiData = useMemo(() => {
    const totalRevenue =
      ordersQuery?.reduce((sum, order) => sum + (order.totalAmount || 0), 0) ||
      0;
    const activeOrders =
      ordersQuery?.filter((order) =>
        ["pending", "confirmed", "processing"].includes(order.status),
      ).length || 0;
    const totalCustomers = usersQuery?.length || 0;
    const totalOrders = ordersQuery?.length || 0;
    const conversionRate =
      totalOrders > 0 && totalCustomers > 0
        ? ((totalOrders / totalCustomers) * 100).toFixed(1)
        : "0.0";

    return [
      {
        title: "Total Revenue",
        value: `₱${totalRevenue.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        change: "+0.0%",
        trend: "up" as const,
        period: "all time",
        icon: DollarSign,
      },
      {
        title: "Active Orders",
        value: activeOrders.toString(),
        change: "+0.0%",
        trend: "up" as const,
        period: "currently active",
        icon: ShoppingCart,
      },
      {
        title: "Total Customers",
        value: totalCustomers.toString(),
        change: "+0.0%",
        trend: "up" as const,
        period: "registered",
        icon: Users,
      },
      {
        title: "Conversion Rate",
        value: `${conversionRate}%`,
        change: "+0.0%",
        trend: "up" as const,
        period: "orders per customer",
        icon: TrendingUp,
      },
    ];
  }, [ordersQuery, usersQuery]);

  // Generate revenue data from orders
  const revenueData = useMemo(() => {
    if (!ordersQuery || ordersQuery.length === 0) {
      return [
        { month: "Jan", revenue: 0, orders: 0 },
        { month: "Feb", revenue: 0, orders: 0 },
        { month: "Mar", revenue: 0, orders: 0 },
        { month: "Apr", revenue: 0, orders: 0 },
        { month: "May", revenue: 0, orders: 0 },
        { month: "Jun", revenue: 0, orders: 0 },
        { month: "Jul", revenue: 0, orders: 0 },
        { month: "Aug", revenue: 0, orders: 0 },
        { month: "Sep", revenue: 0, orders: 0 },
        { month: "Oct", revenue: 0, orders: 0 },
        { month: "Nov", revenue: 0, orders: 0 },
        { month: "Dec", revenue: 0, orders: 0 },
      ];
    }

    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const monthlyData = monthNames.map((month, index) => {
      const monthOrders = ordersQuery.filter((order) => {
        const orderDate = new Date(order.createdAt);
        return orderDate.getMonth() === index;
      });

      const revenue = monthOrders.reduce(
        (sum, order) => sum + (order.totalAmount || 0),
        0,
      );
      return {
        month,
        revenue,
        orders: monthOrders.length,
      };
    });

    return monthlyData;
  }, [ordersQuery]);

  // Generate category data from products
  const categoryData = useMemo(() => {
    if (!productsQuery || productsQuery.length === 0) {
      return [{ name: "No Data", value: 100, count: 0, color: "#6B7280" }];
    }

    const categoryCount = productsQuery.reduce(
      (acc) => {
        const category = "Uncategorized";
        acc[category] = (acc[category] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const total = Object.values(categoryCount).reduce(
      (sum, count) => sum + count,
      0,
    );

    const colors = [
      "#FF6B00",
      "#3B82F6",
      "#10B981",
      "#F59E0B",
      "#8B5CF6",
      "#EF4444",
    ];

    return Object.entries(categoryCount).map(([category, count], index) => ({
      name: category,
      value: Math.round((count / total) * 100),
      count,
      color: colors[index % colors.length],
    }));
  }, [productsQuery]);

  // Generate top products data
  const topProductsData = useMemo(() => {
    if (!productsQuery || productsQuery.length === 0) {
      return [];
    }

    return productsQuery.slice(0, 8).map((product) => ({
      id: product._id,
      name: product.name,
      sales: Math.floor(Math.random() * 500) + 50, // This would need real sales data
      revenue: product.price * (Math.floor(Math.random() * 100) + 10),
      growth: Math.floor(Math.random() * 20) - 5,
      category: "Uncategorized",
      trend: Math.random() > 0.3 ? "up" : ("down" as const),
      margin: Math.floor(Math.random() * 30) + 50,
      stockLevel:
        product.stock > 10 ? "High" : product.stock > 0 ? "Medium" : "Low",
      image: "📦",
    }));
  }, [productsQuery]);

  // Generate daily traffic (placeholder - would need real analytics data)
  // Daily traffic data would require real analytics integration

  // Generate customer growth data
  const customerGrowth = useMemo(() => {
    if (!usersQuery || usersQuery.length === 0) {
      return [
        { week: "W1", newCustomers: 0, returning: 0 },
        { week: "W2", newCustomers: 0, returning: 0 },
        { week: "W3", newCustomers: 0, returning: 0 },
        { week: "W4", newCustomers: 0, returning: 0 },
      ];
    }

    // This is a simplified version - in reality you'd want to group users by signup date
    const weeklyData = [
      {
        week: "W1",
        newCustomers: Math.floor(usersQuery.length * 0.2),
        returning: Math.floor(usersQuery.length * 0.1),
      },
      {
        week: "W2",
        newCustomers: Math.floor(usersQuery.length * 0.3),
        returning: Math.floor(usersQuery.length * 0.15),
      },
      {
        week: "W3",
        newCustomers: Math.floor(usersQuery.length * 0.25),
        returning: Math.floor(usersQuery.length * 0.2),
      },
      {
        week: "W4",
        newCustomers: Math.floor(usersQuery.length * 0.25),
        returning: Math.floor(usersQuery.length * 0.25),
      },
    ];

    return weeklyData;
  }, [usersQuery]);

  // Generate recent activity from real data
  const recentActivity = useMemo(() => {
    const activities: Array<{
      type: string;
      message: string;
      amount: string | null;
      time: string;
      status: string;
    }> = [];

    // Add recent orders
    if (ordersQuery && ordersQuery.length > 0) {
      const recentOrders = ordersQuery.slice(0, 3);
      recentOrders.forEach((order) => {
        activities.push({
          type: "order",
          message: `New order #${order._id.slice(0, 8)} received`,
          amount: `₱${order.totalAmount?.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`,
          time: "Just now",
          status: "success",
        });
      });
    }

    // Add recent reservations
    if (reservationsQuery && reservationsQuery.length > 0) {
      const recentReservations = reservationsQuery.slice(0, 2);
      recentReservations.forEach((reservation) => {
        activities.push({
          type: "reservation",
          message: `New reservation #${reservation.reservationCode}`,
          amount: null,
          time: "Just now",
          status: "info",
        });
      });
    }

    // Add low stock alerts
    if (productsQuery && productsQuery.length > 0) {
      const lowStockProducts = productsQuery
        .filter((p) => p.stock <= 5)
        .slice(0, 2);
      lowStockProducts.forEach((product) => {
        activities.push({
          type: "alert",
          message: `Low stock alert: ${product.name}`,
          amount: `${product.stock} left`,
          time: "Recently",
          status: "warning",
        });
      });
    }

    return activities.slice(0, 5);
  }, [ordersQuery, reservationsQuery, productsQuery]);

  // Loading state
  const isLoading =
    !productsQuery || !ordersQuery || !reservationsQuery || !usersQuery;

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
            {kpiData.map((kpi, index) => (
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
                      Performance overview
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
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
                        {topProductsData.map((product) => (
                          <div
                            key={product.id}
                            className="flex items-center mb-2"
                          >
                            <span className="text-white/70 text-base w-1/4 mr-4 truncate">
                              {product.name}
                            </span>
                            <div className="relative flex-1 h-8 rounded-full bg-neutral-800">
                              <div
                                className="h-full bg-gradient-to-r from-primary to-orange-600 rounded-full"
                                style={{
                                  width: `${(product.revenue / Math.max(...topProductsData.map((p) => p.revenue))) * 100}%`,
                                }}
                              />
                              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-white text-sm font-medium">
                                ₱{product.revenue.toLocaleString()}
                              </span>
                            </div>
                          </div>
                        ))}
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
                    <div className="col-span-5">Product</div>
                    <div className="col-span-2 text-center">Stock</div>
                    <div className="col-span-2 text-center">Revenue</div>
                    <div className="col-span-2 text-center">Margin</div>
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
                        <div className="col-span-5">
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
                            ₱{(product.revenue / 1000).toFixed(0)}K
                          </p>
                        </div>
                        <div className="col-span-2 text-center">
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
                        Total Products: {topProductsData.length}
                      </span>
                      <span className="text-primary font-medium">
                        Avg Margin:{" "}
                        {topProductsData.length > 0
                          ? (
                              topProductsData.reduce(
                                (acc, p) => acc + p.margin,
                                0,
                              ) / topProductsData.length
                            ).toFixed(1)
                          : "0"}
                        %
                      </span>
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
