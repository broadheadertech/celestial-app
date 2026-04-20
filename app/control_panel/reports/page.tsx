"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  TrendingUp,
  Download,
  Calendar,
  RefreshCw,
  ArrowLeft,
  Printer,
  Package,
  Users,
  ShoppingCart,
  DollarSign,
  Fish,
  Box,
  BarChart3,
  PieChart as PieChartIcon,
} from "lucide-react";
import ControlPanelNav from "@/components/ControlPanelNav";
import Button from "@/components/ui/Button";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

interface ReportData {
  totalRevenue: number;
  totalOrders: number;
  totalReservations: number;
  totalCustomers: number;
  totalProducts: number;
  activeProducts: number;
  totalLineDiscounts: number;
  totalOrderDiscounts: number;
  topProducts: Array<{
    _id: string;
    name: string;
    category: string;
    revenue: number;
    sales: number;
  }>;
  categoryStats: Array<{
    name: string;
    productCount: number;
    totalRevenue: number;
    percentage: number;
  }>;
  monthlyStats: Array<{
    month: string;
    revenue: number;
    orders: number;
    reservations: number;
  }>;
}

export default function ReportsPage() {
  const router = useRouter();
  const [selectedYear, setSelectedYear] = useState("2025");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "overview" | "products" | "financial"
  >("overview");

  // Fetch real data from Convex
  const productsQuery = useQuery(api.services.admin.getAllProductsAdmin, {});
  const ordersQuery = useQuery(api.services.orders.getAllOrdersAdmin, {});
  const reservationsQuery = useQuery(
    api.services.reservations.getAllReservationsAdmin,
    {},
  );
  const usersQuery = useQuery(api.services.admin.getAllUsers, {});
  const categoriesQuery = useQuery(api.services.categories.getCategories, {});

  // Generate report data from real queries
  const reportData: ReportData = useMemo(() => {
    if (
      !productsQuery ||
      !ordersQuery ||
      !reservationsQuery ||
      !usersQuery ||
      !categoriesQuery
    ) {
      return {
        totalRevenue: 0,
        totalOrders: 0,
        totalReservations: 0,
        totalCustomers: 0,
        totalProducts: 0,
        activeProducts: 0,
        totalLineDiscounts: 0,
        totalOrderDiscounts: 0,
        topProducts: [],
        categoryStats: [],
        monthlyStats: [],
      };
    }

    // Filter data by selected year
    const yearNum = parseInt(selectedYear);
    const yearStart = new Date(yearNum, 0, 1).getTime();
    const yearEnd = new Date(yearNum + 1, 0, 1).getTime();

    const yearOrders = ordersQuery.filter(
      (order) => order.createdAt >= yearStart && order.createdAt < yearEnd
    );

    const yearReservations = reservationsQuery.filter(
      (reservation) =>
        reservation.createdAt >= yearStart && reservation.createdAt < yearEnd
    );

    // Calculate total revenue from completed orders and reservations (filtered by year)
    const completedOrders = yearOrders.filter(
      (order) => order.status === "delivered",
    );
    const completedReservations = yearReservations.filter(
      (reservation) => reservation.status === "completed",
    );

    let totalRevenue = completedOrders.reduce(
      (sum, order) => sum + order.totalAmount,
      0,
    );

    // Add reservation revenue
    for (const reservation of completedReservations) {
      if (reservation.totalAmount) {
        totalRevenue += reservation.totalAmount;
      } else if (reservation.items && reservation.items.length > 0) {
        totalRevenue += reservation.items.reduce(
          (sum, item) => sum + item.reservedPrice * item.quantity,
          0,
        );
      } else if (reservation.productId && reservation.quantity) {
        // Fallback for legacy single-item reservations
        const product = productsQuery.find(
          (p) => p._id === reservation.productId,
        );
        if (product) {
          totalRevenue += product.price * reservation.quantity;
        }
      }
    }

    // Calculate product statistics
    const activeProducts = productsQuery.filter((p) => p.isActive);

    // Calculate top products by revenue
    const productRevenue = new Map<
      string,
      { revenue: number; sales: number; name: string; category: string }
    >();

    // Calculate revenue from orders
    for (const order of completedOrders) {
      for (const item of order.items) {
        const product = productsQuery.find((p) => p._id === item.productId);
        if (product) {
          const current = productRevenue.get(item.productId) || {
            revenue: 0,
            sales: 0,
            name: product.name,
            category: "",
          };
          productRevenue.set(item.productId, {
            revenue: current.revenue + item.price * item.quantity,
            sales: current.sales + item.quantity,
            name: product.name,
            category:
              categoriesQuery.find((c) => c._id === product.categoryId)?.name ||
              "Unknown",
          });
        }
      }
    }

    // Calculate revenue from reservations
    for (const reservation of completedReservations) {
      if (reservation.items && reservation.items.length > 0) {
        for (const item of reservation.items) {
          const product = productsQuery.find((p) => p._id === item.productId);
          if (product) {
            const current = productRevenue.get(item.productId) || {
              revenue: 0,
              sales: 0,
              name: product.name,
              category: "",
            };
            productRevenue.set(item.productId, {
              revenue: current.revenue + item.reservedPrice * item.quantity,
              sales: current.sales + item.quantity,
              name: product.name,
              category:
                categoriesQuery.find((c) => c._id === product.categoryId)
                  ?.name || "Unknown",
            });
          }
        }
      } else if (reservation.productId && reservation.quantity) {
        const product = productsQuery.find(
          (p) => p._id === reservation.productId,
        );
        if (product) {
          const current = productRevenue.get(reservation.productId) || {
            revenue: 0,
            sales: 0,
            name: product.name,
            category: "",
          };
          productRevenue.set(reservation.productId, {
            revenue: current.revenue + product.price * reservation.quantity,
            sales: current.sales + reservation.quantity,
            name: product.name,
            category:
              categoriesQuery.find((c) => c._id === product.categoryId)?.name ||
              "Unknown",
          });
        }
      }
    }

    const topProducts = Array.from(productRevenue.entries())
      .map(([id, data]) => ({ _id: id, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Calculate category statistics
    const categoryStats = categoriesQuery
      .map((category) => {
        const categoryProducts = productsQuery.filter(
          (p) => p.categoryId === category._id,
        );
        const categoryRevenue = categoryProducts.reduce((sum, product) => {
          const productData = productRevenue.get(product._id);
          return sum + (productData?.revenue || 0);
        }, 0);

        return {
          name: category.name,
          productCount: categoryProducts.length,
          totalRevenue: categoryRevenue,
          percentage:
            totalRevenue > 0 ? (categoryRevenue / totalRevenue) * 100 : 0,
        };
      })
      .filter((cat) => cat.productCount > 0);

    // Generate monthly stats for selected year
    const monthlyStats = Array.from({ length: 12 }, (_, i) => {
      const month = new Date(yearNum, i, 1);
      const monthStart = month.getTime();
      const monthEnd = new Date(yearNum, i + 1, 1).getTime();

      const monthOrders = yearOrders.filter(
        (order) => order.createdAt >= monthStart && order.createdAt < monthEnd,
      );

      const monthReservations = yearReservations.filter(
        (reservation) =>
          reservation.createdAt >= monthStart &&
          reservation.createdAt < monthEnd,
      );

      const monthRevenue =
        monthOrders.reduce((sum, order) => sum + order.totalAmount, 0) +
        monthReservations.reduce((sum, reservation) => {
          if (reservation.totalAmount) return sum + reservation.totalAmount;
          if (reservation.items && reservation.items.length > 0) {
            return (
              sum +
              reservation.items.reduce(
                (itemSum, item) => itemSum + item.reservedPrice * item.quantity,
                0,
              )
            );
          }
          return 0;
        }, 0);

      return {
        month: month.toLocaleDateString("en-US", { month: "short" }),
        revenue: monthRevenue,
        orders: monthOrders.length,
        reservations: monthReservations.length,
      };
    });

    // Aggregate discount totals across completed orders and reservations
    let totalLineDiscounts = 0;
    let totalOrderDiscounts = 0;
    for (const order of completedOrders) {
      for (const item of order.items || []) {
        if (item.discount && item.discount > 0) {
          totalLineDiscounts += item.discount * item.quantity;
        }
      }
      if (order.orderDiscount && order.orderDiscount > 0) {
        totalOrderDiscounts += order.orderDiscount;
      }
    }
    for (const reservation of completedReservations) {
      for (const item of reservation.items || []) {
        if (item.discount && item.discount > 0) {
          totalLineDiscounts += item.discount * item.quantity;
        }
      }
      if (reservation.orderDiscount && reservation.orderDiscount > 0) {
        totalOrderDiscounts += reservation.orderDiscount;
      }
    }

    return {
      totalRevenue,
      totalOrders: yearOrders.length,
      totalReservations: yearReservations.length,
      totalCustomers: usersQuery.length,
      totalProducts: productsQuery.length,
      activeProducts: activeProducts.length,
      totalLineDiscounts,
      totalOrderDiscounts,
      topProducts,
      categoryStats,
      monthlyStats,
    };
  }, [
    productsQuery,
    ordersQuery,
    reservationsQuery,
    usersQuery,
    categoriesQuery,
    selectedYear, // Add selectedYear as dependency
  ]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const handleExport = () => {
    if (typeof window === "undefined") return;

    const sections: string[] = [];

    sections.push(`Celestial Drakon Aquatics — ${selectedYear} Report`);
    sections.push(`Generated: ${new Date().toLocaleString("en-PH")}`);
    sections.push("");

    sections.push("Summary");
    sections.push("Metric,Value");
    sections.push(`Total Revenue,${reportData.totalRevenue.toFixed(2)}`);
    sections.push(`Total Orders,${reportData.totalOrders}`);
    sections.push(`Total Reservations,${reportData.totalReservations}`);
    sections.push(`Total Customers,${reportData.totalCustomers}`);
    sections.push(`Active Products,${reportData.activeProducts}`);
    sections.push(`Line-item Discounts,${reportData.totalLineDiscounts.toFixed(2)}`);
    sections.push(`Order-level Discounts,${reportData.totalOrderDiscounts.toFixed(2)}`);
    sections.push("");

    sections.push("Top Products by Revenue");
    sections.push("Rank,Product,Category,Units Sold,Revenue");
    reportData.topProducts.forEach((p, i) => {
      const safeName = p.name.includes(",") ? `"${p.name}"` : p.name;
      const safeCat = p.category.includes(",") ? `"${p.category}"` : p.category;
      sections.push(`${i + 1},${safeName},${safeCat},${p.sales},${p.revenue.toFixed(2)}`);
    });
    sections.push("");

    sections.push("Revenue by Category");
    sections.push("Category,Products,Revenue,Share (%)");
    reportData.categoryStats.forEach((c) => {
      const safeName = c.name.includes(",") ? `"${c.name}"` : c.name;
      sections.push(
        `${safeName},${c.productCount},${c.totalRevenue.toFixed(2)},${c.percentage.toFixed(1)}`,
      );
    });
    sections.push("");

    sections.push("Monthly Trends");
    sections.push("Month,Revenue,Orders,Reservations");
    reportData.monthlyStats.forEach((m) => {
      sections.push(
        `${m.month},${m.revenue.toFixed(2)},${m.orders},${m.reservations}`,
      );
    });

    const csv = sections.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cda-report-${selectedYear}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Check if there's any data for the selected year
  const hasData = reportData.totalOrders > 0 || reportData.totalReservations > 0 || reportData.totalRevenue > 0;

  const formatCurrency = (amount: number) => {
    return `₱${amount.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString("en-PH");
  };

  // Filter top fish and tank products
  const topFishProducts = reportData.topProducts.filter(
    (product) =>
      product.category.toLowerCase().includes("fish") ||
      product.category.toLowerCase().includes("tropical") ||
      product.category.toLowerCase().includes("marine"),
  );

  const topTankProducts = reportData.topProducts.filter(
    (product) =>
      product.category.toLowerCase().includes("tank") ||
      product.category.toLowerCase().includes("aquarium"),
  );

  return (
    <div className="min-h-screen bg-background">
      <ControlPanelNav />

      {/* Main Content */}
      <div className="ml-64 flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-white/10">
          <div className="px-6 py-3">
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
                  <div className="w-9 h-9 bg-gradient-to-br from-primary to-orange-600 rounded-lg flex items-center justify-center">
                    <FileText className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h1 className="text-lg font-bold text-white">
                      Business Reports
                    </h1>
                    <p className="text-xs text-white/60">
                      Real-time analytics and insights
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="bg-secondary/60 border border-white/10 rounded-md px-3 py-1.5 text-white text-sm focus:border-primary/50 focus:outline-none"
                >
                  <option value="2025">2025</option>
                  <option value="2026">2026</option>
                  <option value="2027">2027</option>
                  <option value="2028">2028</option>
                  <option value="2029">2029</option>
                  <option value="2030">2030</option>
                </select>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="border border-white/10 px-3"
                >
                  <RefreshCw
                    className={`w-4 h-4 mr-1.5 ${isRefreshing ? "animate-spin" : ""}`}
                  />
                  Refresh
                </Button>

                <Button
                  size="sm"
                  onClick={handleExport}
                  disabled={!hasData}
                  className="bg-primary/90 hover:bg-primary px-3 disabled:opacity-50"
                >
                  <Download className="w-4 h-4 mr-1.5" />
                  Export
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 p-6">
          {/* Tabs */}
          <div className="flex space-x-1 mb-6">
            <button
              onClick={() => setActiveTab("overview")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === "overview"
                  ? "bg-primary text-white"
                  : "bg-secondary/60 text-white/70 hover:text-white hover:bg-white/10"
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab("products")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === "products"
                  ? "bg-primary text-white"
                  : "bg-secondary/60 text-white/70 hover:text-white hover:bg-white/10"
              }`}
            >
              Products
            </button>
            <button
              onClick={() => setActiveTab("financial")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === "financial"
                  ? "bg-primary text-white"
                  : "bg-secondary/60 text-white/70 hover:text-white hover:bg-white/10"
              }`}
            >
              Financial
            </button>
          </div>

          {/* No Data Message */}
          {!hasData && (
            <div className="bg-secondary/40 backdrop-blur-sm rounded-xl border border-white/10 p-12 text-center">
              <div className="flex flex-col items-center justify-center space-y-4">
                <div className="w-20 h-20 bg-warning/10 rounded-full flex items-center justify-center">
                  <FileText className="w-10 h-10 text-warning" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">
                    No Data Available for {selectedYear}
                  </h3>
                  <p className="text-white/60 max-w-md">
                    There are no orders, reservations, or revenue recorded for the year {selectedYear}.
                    Try selecting a different year or check back later.
                  </p>
                </div>
                <div className="flex items-center gap-3 mt-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRefresh}
                    className="border border-white/10"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh Data
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setSelectedYear(new Date().getFullYear().toString())}
                    className="bg-primary/90 hover:bg-primary"
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    View Current Year
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Overview Tab */}
          {hasData && activeTab === "overview" && (
            <div className="space-y-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-secondary/40 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <DollarSign className="w-5 h-5 text-success" />
                    <span className="text-xs text-white/50">{selectedYear}</span>
                  </div>
                  <p className="text-2xl font-bold text-white">
                    {formatCurrency(reportData.totalRevenue)}
                  </p>
                  <p className="text-xs text-white/60">Total Revenue</p>
                </div>
                <div className="bg-secondary/40 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <ShoppingCart className="w-5 h-5 text-primary" />
                    <span className="text-xs text-white/50">{selectedYear}</span>
                  </div>
                  <p className="text-2xl font-bold text-white">
                    {formatNumber(
                      reportData.totalOrders + reportData.totalReservations,
                    )}
                  </p>
                  <p className="text-xs text-white/60">
                    {reportData.totalOrders} orders, {reportData.totalReservations} reservations
                  </p>
                </div>
                <div className="bg-secondary/40 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <Users className="w-5 h-5 text-info" />
                    <span className="text-xs text-white/50">Lifetime</span>
                  </div>
                  <p className="text-2xl font-bold text-white">
                    {formatNumber(reportData.totalCustomers)}
                  </p>
                  <p className="text-xs text-white/60">Customers</p>
                </div>
                <div className="bg-secondary/40 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <Package className="w-5 h-5 text-warning" />
                    <span className="text-xs text-white/50">Now</span>
                  </div>
                  <p className="text-2xl font-bold text-white">
                    {formatNumber(reportData.activeProducts)}
                  </p>
                  <p className="text-xs text-white/60">Active Products</p>
                </div>
              </div>

              {/* Discounts Given */}
              {(reportData.totalLineDiscounts + reportData.totalOrderDiscounts) > 0 && (
                <div className="bg-secondary/40 backdrop-blur-sm rounded-xl p-6 border border-white/10">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-bold text-white">Discounts Given</h3>
                    <span className="text-xs text-white/50">
                      Already reflected in revenue
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white/5 rounded-lg p-3">
                      <p className="text-xs text-white/60">Line-item discounts</p>
                      <p className="text-lg font-bold text-green-400">
                        −{formatCurrency(reportData.totalLineDiscounts)}
                      </p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-3">
                      <p className="text-xs text-white/60">Order-level discounts</p>
                      <p className="text-lg font-bold text-green-400">
                        −{formatCurrency(reportData.totalOrderDiscounts)}
                      </p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-3">
                      <p className="text-xs text-white/60">Total given</p>
                      <p className="text-lg font-bold text-green-400">
                        −{formatCurrency(
                          reportData.totalLineDiscounts + reportData.totalOrderDiscounts,
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Category Breakdown */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-secondary/40 backdrop-blur-sm rounded-xl border border-white/10 p-6">
                  <h3 className="text-lg font-bold text-white mb-4">
                    Revenue by Category
                  </h3>
                  <div className="space-y-3">
                    {reportData.categoryStats.map((category, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center space-x-3">
                          <div
                            className={`w-3 h-3 rounded-full ${
                              index === 0
                                ? "bg-primary"
                                : index === 1
                                  ? "bg-info"
                                  : index === 2
                                    ? "bg-success"
                                    : "bg-warning"
                            }`}
                          />
                          <span className="text-white/80">{category.name}</span>
                        </div>
                        <div className="text-right">
                          <p className="text-white font-medium">
                            {formatCurrency(category.totalRevenue)}
                          </p>
                          <p className="text-xs text-white/60">
                            {category.percentage.toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-secondary/40 backdrop-blur-sm rounded-xl border border-white/10 p-6">
                  <h3 className="text-lg font-bold text-white mb-4">
                    Top Products
                  </h3>
                  <div className="space-y-3">
                    {reportData.topProducts
                      .slice(0, 5)
                      .map((product, index) => (
                        <div
                          key={product._id}
                          className="flex items-center justify-between"
                        >
                          <div className="flex items-center space-x-3">
                            <span className="text-white/60 w-6">
                              #{index + 1}
                            </span>
                            <div>
                              <p className="text-white font-medium">
                                {product.name}
                              </p>
                              <p className="text-xs text-white/60">
                                {product.category}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-white font-medium">
                              {formatCurrency(product.revenue)}
                            </p>
                            <p className="text-xs text-white/60">
                              {product.sales} sold
                            </p>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Products Tab */}
          {hasData && activeTab === "products" && (
            <div className="space-y-6">
              {/* Fish Products */}
              <div className="bg-secondary/40 backdrop-blur-sm rounded-xl border border-white/10 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-white flex items-center">
                    <Fish className="w-5 h-5 mr-2 text-info" />
                    Top Fish Products
                  </h3>
                  <span className="text-sm text-white/60">
                    {topFishProducts.length} products
                  </span>
                </div>
                {topFishProducts.length > 0 ? (
                  <div className="space-y-3">
                    {topFishProducts.map((product, index) => (
                      <div
                        key={product._id}
                        className="flex items-center justify-between p-3 bg-secondary/60 rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          <span className="text-white/60 w-6">
                            #{index + 1}
                          </span>
                          <div>
                            <p className="text-white font-medium">
                              {product.name}
                            </p>
                            <p className="text-xs text-white/60">
                              {product.category}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-white font-medium">
                            {formatCurrency(product.revenue)}
                          </p>
                          <p className="text-xs text-white/60">
                            {product.sales} sold
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-white/60 py-8">
                    No fish products found
                  </p>
                )}
              </div>

              {/* Tank Products */}
              <div className="bg-secondary/40 backdrop-blur-sm rounded-xl border border-white/10 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-white flex items-center">
                    <Box className="w-5 h-5 mr-2 text-warning" />
                    Top Tank Products
                  </h3>
                  <span className="text-sm text-white/60">
                    {topTankProducts.length} products
                  </span>
                </div>
                {topTankProducts.length > 0 ? (
                  <div className="space-y-3">
                    {topTankProducts.map((product, index) => (
                      <div
                        key={product._id}
                        className="flex items-center justify-between p-3 bg-secondary/60 rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          <span className="text-white/60 w-6">
                            #{index + 1}
                          </span>
                          <div>
                            <p className="text-white font-medium">
                              {product.name}
                            </p>
                            <p className="text-xs text-white/60">
                              {product.category}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-white font-medium">
                            {formatCurrency(product.revenue)}
                          </p>
                          <p className="text-xs text-white/60">
                            {product.sales} sold
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-white/60 py-8">
                    No tank products found
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Financial Tab */}
          {hasData && activeTab === "financial" && (
            <div className="space-y-6">
              <div className="bg-secondary/40 backdrop-blur-sm rounded-xl border border-white/10 p-6">
                <h3 className="text-lg font-bold text-white mb-4">
                  Monthly Performance
                </h3>
                <div className="space-y-4">
                  {reportData.monthlyStats.map((month, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-secondary/60 rounded-lg"
                    >
                      <div className="flex items-center space-x-4">
                        <span className="text-white font-medium w-12">
                          {month.month}
                        </span>
                        <div className="flex items-center space-x-6">
                          <div>
                            <p className="text-xs text-white/60">Revenue</p>
                            <p className="text-white font-medium">
                              {formatCurrency(month.revenue)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-white/60">Orders</p>
                            <p className="text-white font-medium">
                              {month.orders}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-white/60">
                              Reservations
                            </p>
                            <p className="text-white font-medium">
                              {month.reservations}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
