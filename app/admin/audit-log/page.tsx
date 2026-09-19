'use client';

import React, { useEffect, useMemo, useState } from 'react';
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
  RefreshCw,
} from 'lucide-react';
import BottomNavbar from '@/components/common/BottomNavbar';
import SafeAreaProvider from '@/components/provider/SafeAreaProvider';

type Category = 'finance' | 'inventory' | 'sales' | 'users' | 'settings' | 'system';

// Theme tokens (not hardcoded white) so the page reads correctly in the light and dark admin themes.
const CATEGORIES: { id: Category | 'all'; label: string; icon: typeof Coins; color: string }[] = [
  { id: 'all', label: 'All', icon: ScrollText, color: 'var(--ink-2)' },
  { id: 'finance', label: 'Finance', icon: Coins, color: 'var(--jade)' },
  { id: 'inventory', label: 'Inventory', icon: Package, color: 'var(--red-hi)' },
  { id: 'sales', label: 'Sales', icon: ShoppingCart, color: 'var(--gold)' },
  { id: 'users', label: 'Users', icon: Users, color: 'var(--indigo)' },
  { id: 'settings', label: 'Settings', icon: SettingsIcon, color: 'var(--ink-3)' },
  { id: 'system', label: 'System', icon: ShieldAlert, color: 'var(--red)' },
];

const catMeta = (c: string) => CATEGORIES.find((x) => x.id === c) ?? CATEGORIES[0];

const fmtTime = (ts: number) => new Date(ts).toLocaleString('en-PH', { hour: 'numeric', minute: '2-digit', hour12: true });
const fmtDayKey = (ts: number) => new Date(ts).toLocaleDateString('en-CA');
const fmtDayLabel = (ts: number) => new Date(ts).toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

type Entry = {
  _id: string;
  category: string;
  summary: string;
  action: string;
  actorName?: string;
  actorRole?: string;
  createdAt: number;
};

function AuditLogContent() {
  const router = useRouter();
  const [category, setCategory] = useState<Category | 'all'>('all');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  // Search runs on the server over the whole log; wait for a pause in typing.
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const summary = useQuery(api.services.audit.getAuditSummary, {});
  const categoryArg = category === 'all' ? {} : { category };
  const { results, status, loadMore, isLoading } = usePaginatedQuery(
    api.services.audit.getAuditLogs,
    search ? 'skip' : categoryArg,
    { initialNumItems: 50 },
  );
  const searched = useQuery(api.services.audit.searchAuditLogs, search ? { search, ...categoryArg } : 'skip');

  const entries: Entry[] | undefined = search ? searched?.rows : isLoading && results.length === 0 ? undefined : results;

  const groups = useMemo(() => {
    const map = new Map<string, Entry[]>();
    for (const r of entries ?? []) {
      const key = fmtDayKey(r.createdAt);
      map.set(key, [...(map.get(key) ?? []), r]);
    }
    return Array.from(map.entries());
  }, [entries]);

  return (
    <div className="min-h-screen pb-24 sm:pb-6" style={{ background: 'var(--bg)', color: 'var(--ink)' }}>
      {/* Header */}
      <div className="sticky top-0 z-50 backdrop-blur-sm border-b safe-area-top" style={{ background: 'color-mix(in oklch, var(--bg) 88%, transparent)', borderColor: 'var(--line)' }}>
        <div className="px-3 sm:px-6 py-3 sm:py-4 max-w-5xl mx-auto flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 rounded-lg border hover:opacity-90 flex-shrink-0" style={{ background: 'var(--surface-2)', borderColor: 'var(--line)' }} aria-label="Go back">
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: 'var(--ink)' }} />
          </button>
          <div className="min-w-0 flex-1">
            <p className="label-eyebrow truncate">Every admin action — who did what, and when</p>
            <h1 className="display text-lg sm:text-2xl truncate">Audit Log</h1>
          </div>
        </div>
      </div>

      <div className="px-3 sm:px-6 py-4 sm:py-5 max-w-5xl mx-auto space-y-3 sm:space-y-4">
        {/* Category chips */}
        <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {CATEGORIES.map((c) => {
            const Icon = c.icon;
            const active = category === c.id;
            const count = c.id === 'all' ? summary?.total : summary?.byCategory?.[c.id];
            return (
              <button
                key={c.id}
                onClick={() => setCategory(c.id)}
                aria-pressed={active}
                className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium border transition-all"
                style={active ? { background: 'var(--red)', borderColor: 'var(--red-deep)', color: 'oklch(0.99 0 0)' } : { background: 'var(--surface)', borderColor: 'var(--line)', color: 'var(--ink-2)' }}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{c.label}</span>
                {count !== undefined && count > 0 && (
                  <span className="text-[10px] font-mono-tabular px-1.5 py-0.5 rounded-full" style={{ background: active ? 'oklch(1 0 0 / 0.2)' : 'var(--surface-hi)' }}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--ink-4)' }} />
          <input
            type="text"
            placeholder="Search action, summary or person…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="input w-full pl-10 pr-10 py-2.5 rounded-xl border text-sm focus:outline-none focus:border-[var(--red)]"
            style={{ background: 'var(--surface)', borderColor: 'var(--line)', color: 'var(--ink)' }}
          />
          {searchInput && (
            <button onClick={() => setSearchInput('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded hover:opacity-80" aria-label="Clear search">
              <X className="w-3.5 h-3.5" style={{ color: 'var(--ink-3)' }} />
            </button>
          )}
        </div>
        {search && searched && (
          <p className="text-xs" style={{ color: 'var(--ink-3)' }}>
            {searched.rows.length === 0 ? 'No matches' : `${searched.rows.length}${searched.limited ? '+' : ''} match${searched.rows.length === 1 ? '' : 'es'}`} in the latest{' '}
            {searched.scanned.toLocaleString()} {category === 'all' ? '' : `${catMeta(category).label.toLowerCase()} `}entries
            {searched.limited ? ' — showing the newest 200; add more words to narrow it down' : ''}.
          </p>
        )}

        {/* Log */}
        {entries === undefined ? (
          <div className="text-center py-16 text-sm" style={{ color: 'var(--ink-4)' }}>
            <RefreshCw className="w-6 h-6 mx-auto mb-3 animate-spin" />
            {search ? 'Searching…' : 'Loading audit log…'}
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-16 rounded-2xl border" style={{ background: 'var(--surface)', borderColor: 'var(--line)' }}>
            <ScrollText className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--ink-4)' }} />
            <h3 className="text-base font-bold mb-1">{search ? 'No matches' : 'Nothing here yet'}</h3>
            <p className="text-xs" style={{ color: 'var(--ink-3)' }}>
              {search
                ? 'No entries match your search. Try fewer or different words.'
                : category === 'all'
                  ? 'Admin actions will appear here as they happen.'
                  : `No ${catMeta(category).label.toLowerCase()} actions recorded yet.`}
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {groups.map(([dayKey, dayEntries]) => (
              <div key={dayKey}>
                <p className="text-[11px] font-semibold uppercase tracking-wider mb-2 px-1" style={{ color: 'var(--ink-4)' }}>
                  {fmtDayLabel(dayEntries[0].createdAt)}
                </p>
                <div className="rounded-xl border overflow-hidden divide-y" style={{ background: 'var(--surface)', borderColor: 'var(--line)' }}>
                  {dayEntries.map((e) => {
                    const m = catMeta(e.category);
                    const Icon = m.icon;
                    return (
                      <div key={e._id} className="flex items-start gap-3 p-3" style={{ borderColor: 'var(--line-soft)' }}>
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border" style={{ color: m.color, borderColor: 'var(--line)', background: 'var(--surface-2)' }}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm leading-snug break-words" style={{ color: 'var(--ink)' }}>{e.summary}</p>
                          <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 mt-1 text-[11px]" style={{ color: 'var(--ink-3)' }}>
                            <span className="capitalize font-medium" style={{ color: m.color }}>{e.category}</span>
                            <span>·</span>
                            <span className="inline-flex items-center gap-1">
                              <UserIcon className="w-3 h-3" />
                              {e.actorName ?? 'System / unknown'}
                              {e.actorRole ? ` (${e.actorRole.replace('_', ' ')})` : ''}
                            </span>
                            <span>·</span>
                            <span className="font-mono-tabular">{fmtTime(e.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {!search && status === 'CanLoadMore' && (
              <div className="text-center pt-2">
                <button onClick={() => loadMore(50)} className="px-4 py-2 rounded-lg border text-sm font-semibold active:scale-95 transition-all" style={{ background: 'var(--surface-2)', borderColor: 'var(--line)', color: 'var(--ink-2)' }}>
                  Load more
                </button>
              </div>
            )}
            {!search && status === 'LoadingMore' && (
              <div className="text-center py-3">
                <RefreshCw className="w-5 h-5 mx-auto animate-spin" style={{ color: 'var(--ink-4)' }} />
              </div>
            )}
            {!search && status === 'Exhausted' && (
              <p className="text-[11px] text-center pt-1" style={{ color: 'var(--ink-4)' }}>— end of log —</p>
            )}
          </div>
        )}
      </div>

      <BottomNavbar />
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
