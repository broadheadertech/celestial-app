'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import {
  ArrowLeft,
  Search,
  X,
  Users,
  Trophy,
  Coins,
  ShoppingBag,
  AlertTriangle,
  Medal,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import BottomNavbar from '@/components/common/BottomNavbar';
import SafeAreaProvider from '@/components/provider/SafeAreaProvider';

const fmt = (n: number) =>
  `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtCompact = (n: number) => `₱${n.toLocaleString('en-PH', { maximumFractionDigits: 0 })}`;
const num = (n: number) => n.toLocaleString('en-PH', { maximumFractionDigits: 0 });
const formatDate = (ts: number) =>
  ts > 0 ? new Date(ts).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

// 0 = all time
const WINDOWS = [0, 7, 30, 90, 180];
const winLabel = (w: number) => (w === 0 ? 'All' : `${w}d`);

const rankBadge = (i: number) => {
  if (i === 0) return 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30';
  if (i === 1) return 'bg-white/10 text-white/80 border-white/20';
  if (i === 2) return 'bg-orange-600/15 text-orange-400 border-orange-600/30';
  return 'bg-white/5 text-white/40 border-white/10';
};

function AssociatePerformanceContent() {
  const router = useRouter();
  const [windowDays, setWindowDays] = useState(0);
  const [search, setSearch] = useState('');

  const data = useQuery(api.services.analytics.getAssociatePerformance, { windowDays });
  const isLoading = data === undefined;

  const rows = useMemo(() => {
    if (!data) return [];
    let list = [...data.rows];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((r) => r.name.toLowerCase().includes(q) || (r.email || '').toLowerCase().includes(q));
    }
    return list;
  }, [data, search]);

  // Attributed sellers (exclude the Unattributed bucket) get the medal ranking
  const rankIndex = useMemo(() => {
    const m = new Map<string, number>();
    let i = 0;
    for (const r of rows) {
      if (r.isUnattributed || r.orders === 0) continue;
      m.set(r.id, i++);
    }
    return m;
  }, [rows]);

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
              <h1 className="text-base sm:text-xl lg:text-2xl font-bold text-white truncate">Associate Performance</h1>
              <p className="text-[11px] sm:text-xs text-white/50 truncate">Who&apos;s selling — revenue, orders & FIFO profit per associate</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-3 sm:px-4 lg:px-6 py-3 sm:py-5 lg:py-6 max-w-7xl mx-auto space-y-3 sm:space-y-5">
        {/* Summary KPIs */}
        {data && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
            <KpiCard icon={Users} accent="text-primary" bg="bg-primary/10" label="Associates" value={num(data.summary.registeredCount)} sub={`${data.summary.sellingCount} with sales`} />
            <KpiCard icon={Coins} accent="text-success" bg="bg-success/10" label="Attributed revenue" value={fmtCompact(data.summary.attributedRevenue)} sub={`${fmtCompact(data.summary.totalProfit)} gross profit`} />
            <KpiCard icon={Trophy} accent="text-yellow-400" bg="bg-yellow-500/10" label="Top seller" value={data.rows.find((r) => !r.isUnattributed && r.orders > 0)?.name?.split(' ')[0] || '—'} sub={data.rows.find((r) => !r.isUnattributed && r.orders > 0) ? fmtCompact(data.rows.find((r) => !r.isUnattributed && r.orders > 0)!.revenue) : 'No sales yet'} />
            <KpiCard icon={AlertTriangle} accent="text-warning" bg="bg-warning/10" label="Unattributed" value={fmtCompact(data.summary.unattributedRevenue)} sub="no associate tagged" />
          </div>
        )}

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
                  {winLabel(w)}
                </button>
              ))}
            </div>
          </div>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
            <input
              type="text"
              placeholder="Search associate..."
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
            <p className="text-sm text-white/60">Tallying associate sales...</p>
          </div>
        ) : rows.length === 0 ? (
          <Card variant="modern" padding="lg" className="text-center border border-white/10">
            <Users className="w-12 h-12 sm:w-16 sm:h-16 text-white/20 mx-auto mb-3 sm:mb-4" />
            <h3 className="text-base sm:text-xl font-bold text-white mb-2">No associates yet</h3>
            <p className="text-xs sm:text-sm text-white/60">Tag staff as sales associates, then assign them on POS sales.</p>
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
                        <th className="text-left px-3 lg:px-5 py-3">Associate</th>
                        <th className="text-right px-2 lg:px-3 py-3">Orders</th>
                        <th className="text-right px-2 lg:px-3 py-3">Units</th>
                        <th className="text-right px-2 lg:px-3 py-3">Revenue</th>
                        <th className="text-right px-2 lg:px-3 py-3">Profit</th>
                        <th className="text-right px-2 lg:px-3 py-3 hidden lg:table-cell">Margin</th>
                        <th className="text-right px-2 lg:px-3 py-3">Commission</th>
                        <th className="text-right px-2 lg:px-3 py-3 hidden lg:table-cell">Avg order</th>
                        <th className="text-right px-3 lg:px-5 py-3 hidden lg:table-cell">Last sale</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {rows.map((r) => {
                        const rank = rankIndex.get(r.id);
                        return (
                          <tr key={r.id} className={`transition-colors ${r.isUnattributed ? 'bg-warning/[0.04]' : 'hover:bg-white/[0.03]'}`}>
                            <td className="px-3 lg:px-5 py-3">
                              <div className="flex items-center gap-2 lg:gap-3">
                                <span className={`w-6 h-6 rounded-md border flex items-center justify-center text-[11px] font-bold tabular-nums flex-shrink-0 ${rank !== undefined ? rankBadge(rank) : 'bg-white/5 text-white/30 border-white/10'}`}>
                                  {rank !== undefined ? rank + 1 : '—'}
                                </span>
                                <div className="min-w-0">
                                  <p className="font-medium text-white truncate max-w-[180px] lg:max-w-[260px] flex items-center gap-1.5">
                                    {r.name}
                                    {rank === 0 && <Medal className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />}
                                  </p>
                                  <p className="text-[10px] text-white/40 truncate">
                                    {r.isUnattributed
                                      ? 'Sales with no associate assigned'
                                      : r.registered
                                      ? (r.email || 'Sales associate')
                                      : r.isStaff
                                      ? 'No longer tagged as associate'
                                      : 'Former associate (account removed)'}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-2 lg:px-3 py-3 text-right text-white font-semibold tabular-nums">{num(r.orders)}</td>
                            <td className="px-2 lg:px-3 py-3 text-right text-white/80 tabular-nums">{num(r.units)}</td>
                            <td className="px-2 lg:px-3 py-3 text-right text-white/90 tabular-nums whitespace-nowrap">{fmtCompact(r.revenue)}</td>
                            <td className={`px-2 lg:px-3 py-3 text-right font-semibold tabular-nums whitespace-nowrap ${r.grossProfit >= 0 ? 'text-success' : 'text-error'}`}>{fmtCompact(r.grossProfit)}</td>
                            <td className="px-2 lg:px-3 py-3 text-right text-white/70 tabular-nums hidden lg:table-cell">{r.revenue > 0 ? `${r.margin.toFixed(0)}%` : '—'}</td>
                            <td className="px-2 lg:px-3 py-3 text-right tabular-nums whitespace-nowrap">
                              {r.commissionRate !== null ? (
                                <>
                                  <div className="text-warning font-semibold text-xs lg:text-sm">{fmtCompact(r.commissionEarned)}</div>
                                  <div className="text-[10px] text-white/40">{r.commissionRate}% of {r.commissionBasis}</div>
                                </>
                              ) : (
                                <span className="text-white/30 text-[11px]">—</span>
                              )}
                            </td>
                            <td className="px-2 lg:px-3 py-3 text-right text-white/70 tabular-nums hidden lg:table-cell whitespace-nowrap">{r.orders > 0 ? fmtCompact(r.avgOrderValue) : '—'}</td>
                            <td className="px-3 lg:px-5 py-3 text-right text-white/60 text-[11px] tabular-nums hidden lg:table-cell whitespace-nowrap">{formatDate(r.lastSale)}</td>
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
              {rows.map((r) => {
                const rank = rankIndex.get(r.id);
                return (
                  <Card key={r.id} variant="modern" padding="none" className={`border overflow-hidden ${r.isUnattributed ? 'border-warning/20' : 'border-white/10'}`}>
                    <div className="p-3">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`w-8 h-8 rounded-lg border flex items-center justify-center text-xs font-bold tabular-nums flex-shrink-0 ${rank !== undefined ? rankBadge(rank) : 'bg-white/5 text-white/30 border-white/10'}`}>
                          {rank !== undefined ? rank + 1 : '—'}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-white text-sm truncate flex items-center gap-1.5">
                            {r.name}
                            {rank === 0 && <Medal className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />}
                          </p>
                          <p className="text-[11px] text-white/40 truncate">
                            {r.isUnattributed ? 'No associate assigned' : r.registered ? 'Sales associate' : 'No longer tagged'}
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        <Metric label="Orders" value={num(r.orders)} />
                        <Metric label="Revenue" value={fmtCompact(r.revenue)} />
                        <Metric label="Profit" value={fmtCompact(r.grossProfit)} valueClass={r.grossProfit >= 0 ? 'text-success' : 'text-error'} />
                        <Metric label="Margin" value={r.revenue > 0 ? `${r.margin.toFixed(0)}%` : '—'} />
                      </div>
                      {r.commissionRate !== null && (
                        <div className="mt-2 px-2 py-1.5 rounded-md bg-warning/10 border border-warning/20 flex items-center justify-between">
                          <span className="text-[10px] text-warning/80 uppercase tracking-wider">Commission ({r.commissionRate}% of {r.commissionBasis})</span>
                          <span className="text-sm font-bold text-warning tabular-nums">{fmtCompact(r.commissionEarned)}</span>
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>

            <p className="text-[11px] text-white/40 text-center pt-1">
              {rows.length} {rows.length === 1 ? 'associate' : 'associates'} · revenue &amp; profit use recognized sales (paid/partial) + FIFO cost
              {windowDays > 0 ? ` · last ${windowDays} days` : ' · all time'}
              {data && data.summary.totalCommissions > 0 && <> · <span className="text-warning">total commission {fmt(data.summary.totalCommissions)}</span></>}
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

function KpiCard({ icon: Icon, accent, bg, label, value, sub }: { icon: typeof Users; accent: string; bg: string; label: string; value: string; sub: string }) {
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

export default function AssociatePerformancePage() {
  return (
    <SafeAreaProvider applySafeArea={false}>
      <AssociatePerformanceContent />
    </SafeAreaProvider>
  );
}
