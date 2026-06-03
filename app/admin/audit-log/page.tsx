'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePaginatedQuery, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import {
  ArrowLeft,
  Search,
  X,
  Coins,
  Package,
  ShoppingCart,
  Users,
  Settings as SettingsIcon,
  ShieldAlert,
  ScrollText,
  User as UserIcon,
} from 'lucide-react';
import BottomNavbar from '@/components/common/BottomNavbar';
import SafeAreaProvider from '@/components/provider/SafeAreaProvider';

type Category = 'finance' | 'inventory' | 'sales' | 'users' | 'settings' | 'system';

const CATEGORIES: { id: Category | 'all'; label: string; icon: typeof Coins; cls: string; chip: string }[] = [
  { id: 'all', label: 'All', icon: ScrollText, cls: 'text-white', chip: 'bg-white/10 text-white border-white/20' },
  { id: 'finance', label: 'Finance', icon: Coins, cls: 'text-success', chip: 'bg-success/10 text-success border-success/30' },
  { id: 'inventory', label: 'Inventory', icon: Package, cls: 'text-primary', chip: 'bg-primary/10 text-primary border-primary/30' },
  { id: 'sales', label: 'Sales', icon: ShoppingCart, cls: 'text-warning', chip: 'bg-warning/10 text-warning border-warning/30' },
  { id: 'users', label: 'Users', icon: Users, cls: 'text-violet-400', chip: 'bg-violet-500/10 text-violet-400 border-violet-500/30' },
  { id: 'settings', label: 'Settings', icon: SettingsIcon, cls: 'text-white/70', chip: 'bg-white/10 text-white/70 border-white/20' },
  { id: 'system', label: 'System', icon: ShieldAlert, cls: 'text-error', chip: 'bg-error/10 text-error border-error/30' },
];

const catMeta = (c: string) => CATEGORIES.find((x) => x.id === c) ?? CATEGORIES[0];

const fmtTime = (ts: number) =>
  new Date(ts).toLocaleString('en-PH', { hour: 'numeric', minute: '2-digit', hour12: true });
const fmtDayKey = (ts: number) => new Date(ts).toLocaleDateString('en-CA');
const fmtDayLabel = (ts: number) =>
  new Date(ts).toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

function AuditLogContent() {
  const router = useRouter();
  const [category, setCategory] = useState<Category | 'all'>('all');
  const [search, setSearch] = useState('');

  const summary = useQuery(api.services.audit.getAuditSummary, {});

  const { results, status, loadMore, isLoading } = usePaginatedQuery(
    api.services.audit.getAuditLogs,
    category === 'all' ? {} : { category },
    { initialNumItems: 50 },
  );

  // Client-side text search over the loaded pages.
  const filtered = useMemo(() => {
    if (!search.trim()) return results;
    const q = search.toLowerCase();
    return results.filter(
      (r) =>
        r.summary.toLowerCase().includes(q) ||
        (r.actorName ?? '').toLowerCase().includes(q) ||
        r.action.toLowerCase().includes(q),
    );
  }, [results, search]);

  // Group by calendar day for readable day headers.
  const groups = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    for (const r of filtered) {
      const key = fmtDayKey(r.createdAt);
      const arr = map.get(key) ?? [];
      arr.push(r);
      map.set(key, arr);
    }
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <div className="min-h-screen bg-background text-foreground pb-24 sm:pb-6">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-white/10 safe-area-top">
        <div className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 max-w-5xl mx-auto">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-lg bg-secondary/60 border border-white/10 hover:bg-white/10 active:scale-95 transition-all flex-shrink-0"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="text-base sm:text-xl lg:text-2xl font-bold text-white truncate">Audit Log</h1>
              <p className="text-[11px] sm:text-xs text-white/50 truncate">
                Every admin action — who did what, and when
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-3 sm:px-4 lg:px-6 py-3 sm:py-5 max-w-5xl mx-auto space-y-3 sm:space-y-4">
        {/* Category filter chips (with counts) */}
        <div className="flex gap-1.5 sm:gap-2 overflow-x-auto scrollbar-hide pb-1">
          {CATEGORIES.map((c) => {
            const Icon = c.icon;
            const active = category === c.id;
            const count = c.id === 'all' ? summary?.total : summary?.byCategory?.[c.id];
            return (
              <button
                key={c.id}
                onClick={() => setCategory(c.id)}
                className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium border transition-all ${
                  active ? 'bg-primary border-primary text-white shadow-md shadow-primary/20' : 'bg-secondary/40 border-white/10 text-white/70 hover:text-white hover:border-white/20'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{c.label}</span>
                {count !== undefined && count > 0 && (
                  <span className={`text-[10px] tabular-nums px-1.5 py-0.5 rounded-full ${active ? 'bg-white/20' : 'bg-white/10'}`}>{count}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
          <input
            type="text"
            placeholder="Search action, summary, or admin..."
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

        {/* Log */}
        {isLoading && results.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm text-white/60">Loading audit log...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 rounded-2xl border border-white/10 bg-secondary/30">
            <ScrollText className="w-12 h-12 text-white/20 mx-auto mb-3" />
            <h3 className="text-base font-bold text-white mb-1">No activity yet</h3>
            <p className="text-xs text-white/60">
              {search ? 'No entries match your search.' : 'Admin actions will appear here as they happen.'}
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {groups.map(([dayKey, entries]) => (
              <div key={dayKey}>
                <p className="text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-2 px-1">
                  {fmtDayLabel(entries[0].createdAt)}
                </p>
                <div className="rounded-xl border border-white/10 overflow-hidden divide-y divide-white/5 bg-secondary/30">
                  {entries.map((e) => {
                    const m = catMeta(e.category);
                    const Icon = m.icon;
                    return (
                      <div key={e._id} className="flex items-start gap-3 p-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${m.chip} border`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-white leading-snug">{e.summary}</p>
                          <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 mt-1 text-[11px] text-white/40">
                            <span className={`inline-flex items-center gap-1 ${m.cls}`}>
                              <span className="capitalize">{e.category}</span>
                            </span>
                            <span>·</span>
                            <span className="inline-flex items-center gap-1">
                              <UserIcon className="w-3 h-3" />
                              {e.actorName ?? 'System / unknown'}
                              {e.actorRole ? ` (${e.actorRole.replace('_', ' ')})` : ''}
                            </span>
                            <span>·</span>
                            <span className="tabular-nums">{fmtTime(e.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Load more */}
            {status === 'CanLoadMore' && (
              <div className="text-center pt-2">
                <button
                  onClick={() => loadMore(50)}
                  className="px-4 py-2 rounded-lg bg-secondary/60 border border-white/10 text-sm text-white hover:bg-white/10 active:scale-95 transition-all"
                >
                  Load more
                </button>
              </div>
            )}
            {status === 'LoadingMore' && (
              <div className="text-center py-3">
                <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
              </div>
            )}
            {status === 'Exhausted' && filtered.length > 0 && (
              <p className="text-[11px] text-white/30 text-center pt-1">— end of log —</p>
            )}
          </div>
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

export default function AuditLogPage() {
  return (
    <SafeAreaProvider applySafeArea={false}>
      <AuditLogContent />
    </SafeAreaProvider>
  );
}
