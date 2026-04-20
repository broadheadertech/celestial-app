"use client";

import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  ArrowLeft,
  Globe,
  Package,
  Users,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Settings,
  ShoppingBag,
  DollarSign,
  TrendingUp,
  Archive,
  RefreshCw,
} from "lucide-react";
import Button from "@/components/ui/Button";

const formatCurrency = (amount: number) =>
  `₱${amount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;

export default function OverviewPage() {
  const router = useRouter();

  const kpis = useQuery(api.services.analytics.getDashboardKPIs);
  const stats = useQuery(api.services.admin.getDashboardStats);
  const activity = useQuery(api.services.analytics.getRecentActivity, { limit: 8 });
  const products = useQuery(api.services.admin.getAllProductsAdmin, {});
  const settings = useQuery(api.services.settings.getAppSettings);

  const isLoading = kpis === undefined || stats === undefined || products === undefined;

  const threshold = settings?.lowStockThreshold ?? 10;
  const lowStockProducts = (products ?? [])
    .filter((p) => p.isActive && p.stock > 0 && p.stock <= threshold)
    .sort((a, b) => a.stock - b.stock)
    .slice(0, 6);
  const outOfStockCount = (products ?? []).filter((p) => p.isActive && p.stock === 0).length;

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
                  <Globe className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">Business Overview</h1>
                  <p className="text-sm text-white/60">Live business snapshot across orders, reservations & inventory</p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Button
                size="sm"
                onClick={() => router.push("/control_panel/settings")}
                className="bg-primary/90 hover:bg-primary"
              >
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="p-10 flex items-center justify-center">
          <RefreshCw className="w-6 h-6 text-primary animate-spin mr-3" />
          <span className="text-white/70">Loading business data...</span>
        </div>
      ) : (
        <div className="p-4 lg:p-6 space-y-6">
          {/* KPI Tiles */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <KpiTile
              icon={DollarSign}
              label="Total Revenue"
              value={formatCurrency(kpis?.totalRevenue ?? 0)}
              sub={`${kpis?.changes.revenue ?? '0%'} vs prior 30d`}
              tone="success"
            />
            <KpiTile
              icon={ShoppingBag}
              label="Active Orders"
              value={String(kpis?.activeOrders ?? 0)}
              sub={`${stats?.pendingReservations ?? 0} pending reservations`}
              tone="info"
            />
            <KpiTile
              icon={Users}
              label="Total Customers"
              value={String(kpis?.totalCustomers ?? 0)}
              sub={`${kpis?.changes.customers ?? '0%'} vs prior 30d`}
              tone="primary"
            />
            <KpiTile
              icon={TrendingUp}
              label="Gross Profit"
              value={formatCurrency(stats?.grossProfit ?? 0)}
              sub={`${formatCurrency(stats?.totalCost ?? 0)} cost`}
              tone="warning"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Activity */}
            <div className="lg:col-span-2 bg-secondary/40 backdrop-blur-sm rounded-xl p-6 border border-white/10">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-white">Recent Activity</h3>
                <Activity className="w-5 h-5 text-primary" />
              </div>

              <div className="space-y-3">
                {(activity ?? []).length === 0 ? (
                  <p className="text-white/50 text-sm text-center py-6">No recent activity.</p>
                ) : (
                  (activity ?? []).map((item, index) => {
                    const iconMap: Record<string, typeof ShoppingBag> = {
                      order: ShoppingBag,
                      reservation: Clock,
                      alert: AlertTriangle,
                    };
                    const colorMap: Record<string, string> = {
                      success: "text-green-400 bg-green-400/20",
                      info: "text-blue-400 bg-blue-400/20",
                      warning: "text-yellow-400 bg-yellow-400/20",
                    };
                    const Icon = iconMap[item.type] ?? Activity;
                    const color = colorMap[item.status] ?? "text-gray-400 bg-gray-400/20";

                    return (
                      <div
                        key={index}
                        className="flex items-center space-x-3 p-3 bg-white/5 rounded-lg"
                      >
                        <div className={`p-2 rounded-lg ${color}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <p className="text-white text-sm">{item.message}</p>
                          <div className="flex items-center text-white/60 text-xs mt-1">
                            <Clock className="w-3 h-3 mr-1" />
                            {item.time}
                          </div>
                        </div>
                        {item.amount && (
                          <span className="text-white/80 text-sm font-medium">{item.amount}</span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Inventory Health */}
            <div className="bg-secondary/40 backdrop-blur-sm rounded-xl p-6 border border-white/10">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-white">Inventory Health</h3>
                <Package className="w-5 h-5 text-primary" />
              </div>

              <div className="space-y-3 mb-4">
                <StatRow
                  icon={CheckCircle}
                  label="Active Products"
                  value={stats?.activeProducts ?? 0}
                  tone="success"
                />
                <StatRow
                  icon={Archive}
                  label="Out of Stock"
                  value={outOfStockCount}
                  tone={outOfStockCount > 0 ? "error" : "muted"}
                />
                <StatRow
                  icon={AlertTriangle}
                  label={`Low Stock (≤${threshold})`}
                  value={lowStockProducts.length}
                  tone={lowStockProducts.length > 0 ? "warning" : "muted"}
                />
              </div>

              <div className="pt-4 border-t border-white/10">
                <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">
                  Top Low-Stock Items
                </p>
                <div className="space-y-2">
                  {lowStockProducts.length === 0 ? (
                    <p className="text-white/50 text-xs">All stock levels are healthy.</p>
                  ) : (
                    lowStockProducts.map((p) => (
                      <div
                        key={p._id}
                        className="flex items-center justify-between text-sm bg-white/5 rounded-lg px-3 py-2"
                      >
                        <span className="text-white/80 truncate mr-2">{p.name}</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                          p.stock <= 3
                            ? 'bg-red-400/20 text-red-400'
                            : 'bg-yellow-400/20 text-yellow-400'
                        }`}>
                          {p.stock} left
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Maintenance banner */}
          {settings?.maintenanceMode && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0" />
              <div>
                <p className="text-yellow-300 font-semibold text-sm">Maintenance mode is ON</p>
                <p className="text-yellow-200/70 text-xs">Public access to the storefront is temporarily disabled. Disable it in Settings.</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

type Tone = "success" | "warning" | "error" | "info" | "primary" | "muted";

const toneClass = (tone: Tone) =>
  ({
    success: "text-green-400 bg-green-400/20",
    warning: "text-yellow-400 bg-yellow-400/20",
    error: "text-red-400 bg-red-400/20",
    info: "text-blue-400 bg-blue-400/20",
    primary: "text-primary bg-primary/20",
    muted: "text-white/60 bg-white/10",
  })[tone];

function KpiTile({
  icon: Icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub?: string;
  tone: Tone;
}) {
  return (
    <div className="bg-secondary/40 backdrop-blur-sm rounded-xl p-4 border border-white/10">
      <div className="flex items-center justify-between mb-3">
        <div className={`p-2 rounded-lg ${toneClass(tone)}`}>
          <Icon className="w-4 h-4" />
        </div>
        <span className="text-xs font-bold uppercase text-white/50">{label}</span>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      {sub && <p className="text-xs text-white/60 mt-1">{sub}</p>}
    </div>
  );
}

function StatRow({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  tone: Tone;
}) {
  return (
    <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
      <div className="flex items-center space-x-3">
        <div className={`p-1.5 rounded-lg ${toneClass(tone)}`}>
          <Icon className="w-4 h-4" />
        </div>
        <span className="text-sm text-white/80">{label}</span>
      </div>
      <span className="text-lg font-bold text-white">{value}</span>
    </div>
  );
}
