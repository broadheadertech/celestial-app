'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import {
  ArrowLeft,
  Search,
  X,
  Package,
  TrendingUp,
  Trophy,
  Coins,
  Gauge,
  AlertTriangle,
  Banknote,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import BottomNavbar from '@/components/common/BottomNavbar';
import SafeAreaProvider from '@/components/provider/SafeAreaProvider';

const fmt = (n: number) =>
  `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtCompact = (n: number) =>
  `₱${n.toLocaleString('en-PH', { maximumFractionDigits: 0 })}`;
const num = (n: number) => n.toLocaleString('en-PH', { maximumFractionDigits: 0 });

type Lens = 'top' | 'profit' | 'velocity' | 'risk';

const LENSES: { id: Lens; label: string; short: string; icon: typeof Trophy; hint: string }[] = [
  { id: 'top', label: 'Best sellers', short: 'Sellers', icon: Trophy, hint: 'Ranked by revenue' },
  { id: 'profit', label: 'Most profitable', short: 'Profit', icon: Coins, hint: 'Ranked by gross profit (FIFO)' },
  { id: 'velocity', label: 'Fastest movers', short: 'Velocity', icon: Gauge, hint: 'Units sold per day in window' },
  { id: 'risk', label: 'At-risk / slow', short: 'At risk', icon: AlertTriangle, hint: 'Unlikely to sell — holding stock' },
];

const WINDOWS = [7, 30, 90, 180];

const riskTheme = (score: number) => {
  if (score >= 60) return { text: 'text-error', bar: 'bg-error', chip: 'bg-error/10 text-error border-error/30', label: 'At risk' };
  if (score >= 30) return { text: 'text-warning', bar: 'bg-warning', chip: 'bg-warning/10 text-warning border-warning/30', label: 'Watch' };
  return { text: 'text-success', bar: 'bg-success', chip: 'bg-success/10 text-success border-success/30', label: 'Healthy' };
};

function ProductPerformanceContent() {
  const router = useRouter();
  const [lens, setLens] = useState<Lens>('top');
  const [windowDays, setWindowDays] = useState(90);
  const [search, setSearch] = useState('');

  const data = useQuery(api.services.analytics.getProductPerformance, { velocityWindowDays: windowDays });
  const isLoading = data === undefined;

  const rows = useMemo(() => {
    if (!data) return [];
    let list = [...data.rows];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((r) => r.name.toLowerCase().includes(q) || r.category.toLowerCase().includes(q));
    }
    switch (lens) {
      case 'top':
        list.sort((a, b) => b.revenue - a.revenue);
        break;
      case 'profit':
        list.sort((a, b) => b.grossProfit - a.grossProfit);
        break;
      case 'velocity':
        list.sort((a, b) => b.velocity - a.velocity);
        break;
      case 'risk':
        list = list.filter((r) => r.currentStock > 0);
        list.sort((a, b) => b.riskScore - a.riskScore);
        break;
    }
    return list;
  }, [data, lens, search]);

  const activeLens = LENSES.find((l) => l.id === lens)!;

  return (
    <div className="min-h-screen bg-background text-foreground pb-24 sm:pb-6">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-white/10 safe-area-top">
        <div className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-lg bg-secondary/60 border border-white/10 hover:bg-white/10 active:scale-95 transition-all flex-shrink-0"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="text-base sm:text-xl lg:text-2xl font-bold text-white truncate">Product Performance</h1>
              <p className="text-[11px] sm:text-xs text-white/50 truncate">
                What sells, what profits, and what&apos;s stuck — {activeLens.hint.toLowerCase()}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-3 sm:px-4 lg:px-6 py-3 sm:py-5 lg:py-6 max-w-7xl mx-auto space-y-3 sm:space-y-5">
        {/* Summary KPIs */}
        {data && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
            <KpiCard icon={TrendingUp} accent="text-primary" bg="bg-primary/10" label="Revenue" value={fmtCompact(data.summary.totalRevenue)} sub={`${data.summary.productCount} products`} />
            <KpiCard icon={Coins} accent="text-success" bg="bg-success/10" label="Gross profit" value={fmtCompact(data.summary.totalProfit)} sub={`${data.summary.avgMargin.toFixed(1)}% avg margin`} />
            <KpiCard icon={AlertTriangle} accent="text-error" bg="bg-error/10" label="At-risk items" value={num(data.summary.atRiskCount)} sub="risk score ≥ 60" />
            <KpiCard icon={Banknote} accent="text-warning" bg="bg-warning/10" label="Capital at risk" value={fmtCompact(data.summary.deadCapital)} sub="stuck in slow stock" />
          </div>
        )}

        {/* Lens toggle */}
        <div className="flex gap-1.5 sm:gap-2 overflow-x-auto scrollbar-hide pb-1">
          {LENSES.map((l) => {
            const Icon = l.icon;
            const active = lens === l.id;
            return (
              <button
                key={l.id}
                onClick={() => setLens(l.id)}
                className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium border transition-all ${
                  active
                    ? 'bg-primary border-primary text-white shadow-md shadow-primary/20'
                    : 'bg-secondary/40 border-white/10 text-white/70 hover:text-white hover:border-white/20'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{l.label}</span>
                <span className="sm:hidden">{l.short}</span>
              </button>
            );
          })}
        </div>

        {/* Window + search */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:items-center">
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="text-[11px] text-white/40 uppercase tracking-wider">Window</span>
            <div className="inline-flex p-[3px] rounded-lg border border-white/10 bg-secondary/40">
              {WINDOWS.map((w) => (
                <button
                  key={w}
                  onClick={() => setWindowDays(w)}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                    windowDays === w ? 'bg-primary text-white' : 'text-white/60 hover:text-white'
                  }`}
                >
                  {w}d
                </button>
              ))}
            </div>
          </div>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
            <input
              type="text"
              placeholder="Search product or category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 bg-secondary/40 border border-white/10 rounded-xl text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-white/10">
                <X className="w-3.5 h-3.5 text-white/60" />
              </button>
            )}
          </div>
        </div>

        {/* Results */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm text-white/60">Crunching product performance...</p>
          </div>
        ) : rows.length === 0 ? (
          <Card variant="modern" padding="lg" className="text-center border border-white/10">
            <Package className="w-12 h-12 sm:w-16 sm:h-16 text-white/20 mx-auto mb-3 sm:mb-4" />
            <h3 className="text-base sm:text-xl font-bold text-white mb-2">No products in view</h3>
            <p className="text-xs sm:text-sm text-white/60">
              {lens === 'risk' ? 'Nothing slow-moving with stock on hand right now.' : 'Try a different search term.'}
            </p>
          </Card>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block">
              <div className="bg-secondary/30 border border-white/10 rounded-xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs lg:text-sm">
                    <thead>
                      <tr className="border-b border-white/10 bg-secondary/60 text-[10px] font-semibold text-white/40 uppercase tracking-wider">
                        <th className="text-left px-3 lg:px-5 py-3">Product</th>
                        <th className="text-right px-2 lg:px-3 py-3">Sold</th>
                        <th className="text-right px-2 lg:px-3 py-3">Revenue</th>
                        <th className="text-right px-2 lg:px-3 py-3">Profit</th>
                        <th className="text-right px-2 lg:px-3 py-3 hidden lg:table-cell">Margin</th>
                        <th className="text-right px-2 lg:px-3 py-3">Velocity</th>
                        <th className="text-right px-2 lg:px-3 py-3 hidden lg:table-cell">Sell-thru</th>
                        <th className="text-right px-2 lg:px-3 py-3">Stock</th>
                        <th className="text-right px-3 lg:px-5 py-3">Risk</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {rows.map((r, i) => {
                        const rt = riskTheme(r.riskScore);
                        return (
                          <tr
                            key={r.id}
                            className="hover:bg-white/[0.03] transition-colors cursor-pointer"
                            onClick={() => router.push(`/admin/inventory/activity_log?productId=${r.id}&productName=${encodeURIComponent(r.name)}`)}
                          >
                            <td className="px-3 lg:px-5 py-3">
                              <div className="flex items-center gap-2 lg:gap-3">
                                <span className="text-white/30 text-[11px] tabular-nums w-4 flex-shrink-0">{i + 1}</span>
                                <div className="w-9 h-9 rounded-lg overflow-hidden bg-secondary border border-white/10 flex-shrink-0 flex items-center justify-center">
                                  {r.image ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={r.image} alt={r.name} className="w-full h-full object-cover" />
                                  ) : (
                                    <Package className="w-4 h-4 text-white/30" />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-medium text-white truncate max-w-[160px] lg:max-w-[220px]">{r.name}</p>
                                  <p className="text-[10px] text-white/40 truncate">{r.category}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-2 lg:px-3 py-3 text-right text-white font-semibold tabular-nums">{num(r.unitsSold)}</td>
                            <td className="px-2 lg:px-3 py-3 text-right text-white/90 tabular-nums whitespace-nowrap">{fmtCompact(r.revenue)}</td>
                            <td className={`px-2 lg:px-3 py-3 text-right font-semibold tabular-nums whitespace-nowrap ${r.grossProfit >= 0 ? 'text-success' : 'text-error'}`}>{fmtCompact(r.grossProfit)}</td>
                            <td className="px-2 lg:px-3 py-3 text-right text-white/70 tabular-nums hidden lg:table-cell">{r.revenue > 0 ? `${r.margin.toFixed(0)}%` : '—'}</td>
                            <td className="px-2 lg:px-3 py-3 text-right text-white/70 tabular-nums whitespace-nowrap">{r.velocity > 0 ? `${r.velocity.toFixed(2)}/d` : '—'}</td>
                            <td className="px-2 lg:px-3 py-3 text-right text-white/70 tabular-nums hidden lg:table-cell">{r.unitsReceived > 0 ? `${(r.sellThrough * 100).toFixed(0)}%` : '—'}</td>
                            <td className="px-2 lg:px-3 py-3 text-right text-white/70 tabular-nums">{num(r.currentStock)}</td>
                            <td className="px-3 lg:px-5 py-3 text-right">
                              {r.currentStock > 0 ? (
                                <div className="flex items-center justify-end gap-2">
                                  <div className="w-10 h-1.5 rounded-full bg-white/5 overflow-hidden hidden lg:block">
                                    <div className={`h-full ${rt.bar}`} style={{ width: `${r.riskScore}%` }} />
                                  </div>
                                  <span className={`text-xs font-bold tabular-nums ${rt.text}`}>{r.riskScore}</span>
                                </div>
                              ) : (
                                <span className="text-white/30 text-[11px]">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
              {rows.map((r, i) => {
                const rt = riskTheme(r.riskScore);
                return (
                  <Card key={r.id} variant="modern" padding="none" className="border border-white/10 overflow-hidden">
                    <button
                      onClick={() => router.push(`/admin/inventory/activity_log?productId=${r.id}&productName=${encodeURIComponent(r.name)}`)}
                      className="w-full p-3 text-left active:scale-[0.99] transition-transform"
                    >
                      <div className="flex gap-3">
                        <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-secondary border border-white/10 flex items-center justify-center flex-shrink-0">
                          {r.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={r.image} alt={r.name} className="w-full h-full object-cover" />
                          ) : (
                            <Package className="w-5 h-5 text-white/30" />
                          )}
                          <span className="absolute -top-1 -left-1 w-4 h-4 rounded-full bg-secondary border border-white/10 text-[9px] font-bold text-white/60 flex items-center justify-center">{i + 1}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <p className="font-bold text-white text-sm truncate">{r.name}</p>
                            {r.currentStock > 0 && (
                              <span className={`flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase border ${rt.chip}`}>
                                {rt.label} {r.riskScore}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-white/50 truncate mb-2">{r.category}</p>
                          <div className="grid grid-cols-3 gap-2">
                            <Metric label="Sold" value={num(r.unitsSold)} />
                            <Metric label="Revenue" value={fmtCompact(r.revenue)} />
                            <Metric label="Profit" value={fmtCompact(r.grossProfit)} valueClass={r.grossProfit >= 0 ? 'text-success' : 'text-error'} />
                            <Metric label="Margin" value={r.revenue > 0 ? `${r.margin.toFixed(0)}%` : '—'} />
                            <Metric label="Velocity" value={r.velocity > 0 ? `${r.velocity.toFixed(2)}/d` : '—'} />
                            <Metric label="Stock" value={num(r.currentStock)} />
                          </div>
                        </div>
                      </div>
                    </button>
                  </Card>
                );
              })}
            </div>

            <p className="text-[11px] text-white/40 text-center pt-1">
              {rows.length} {rows.length === 1 ? 'product' : 'products'} · profit & margin use FIFO batch cost ·
              velocity over last {windowDays} days
            </p>
          </>
        )}
      </div>

      <BottomNavbar />

      <style jsx global>{`
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}

function KpiCard({ icon: Icon, accent, bg, label, value, sub }: { icon: typeof TrendingUp; accent: string; bg: string; label: string; value: string; sub: string }) {
  return (
    <div className="bg-gradient-to-br from-secondary/60 to-secondary/30 rounded-xl p-3 sm:p-4 border border-white/10">
      <div className="flex items-center justify-between mb-2">
        <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg ${bg} flex items-center justify-center`}>
          <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${accent}`} />
        </div>
        <span className="text-[9px] sm:text-[10px] font-medium text-white/40 uppercase tracking-wider truncate">{label}</span>
      </div>
      <p className="text-base sm:text-xl lg:text-2xl font-bold text-white tabular-nums truncate">{value}</p>
      <p className="text-[11px] sm:text-xs text-white/50 mt-0.5 truncate">{sub}</p>
    </div>
  );
}

function Metric({ label, value, valueClass = 'text-white' }: { label: string; value: string; valueClass?: string }) {
  return (
    <div>
      <p className="text-[10px] text-white/40">{label}</p>
      <p className={`text-sm font-semibold tabular-nums truncate ${valueClass}`}>{value}</p>
    </div>
  );
}

export default function ProductPerformancePage() {
  return (
    <SafeAreaProvider applySafeArea={false}>
      <ProductPerformanceContent />
    </SafeAreaProvider>
  );
}
