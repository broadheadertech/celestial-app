'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import {
  ArrowLeft,
  Wallet,
  TrendingUp,
  TrendingDown,
  DollarSign,
  CreditCard,
  Smartphone,
  Banknote,
  Building2,
  Plus,
  Trash2,
  Calendar,
  Package,
  Receipt,
  PieChart as PieChartIcon,
  ArrowUpRight,
  ArrowDownRight,
  Edit2,
  ChevronRight,
  X,
} from 'lucide-react';
import BottomNavbar from '@/components/common/BottomNavbar';
import SafeAreaProvider from '@/components/provider/SafeAreaProvider';
import { useAuthStore } from '@/store/auth';

const fmt = (amount: number) =>
  `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtDate = (ts: number) =>
  new Date(ts).toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

// Local YYYY-MM-DD (en-CA gives ISO-like format in the viewer's timezone, no UTC drift).
const localDateStr = (d: Date) => d.toLocaleDateString('en-CA');
// Month-to-date range: 1st of the current month â†’ today. Used as the default date filter.
const monthToDate = () => {
  const now = new Date();
  return {
    from: localDateStr(new Date(now.getFullYear(), now.getMonth(), 1)),
    to: localDateStr(now),
  };
};

type ExpenseCategory = 'travel' | 'food' | 'supplies' | 'utilities' | 'rent' | 'salary' | 'maintenance' | 'marketing' | 'commissions' | 'mortality' | 'other';
type PaymentMethod = 'cash' | 'gcash' | 'bank_transfer' | 'card';

const categoryIcons: Record<string, string> = {
  travel: '✈️',
  food: '🍽️',
  supplies: '📦',
  utilities: '⚡',
  rent: '🏠',
  salary: '👥',
  maintenance: '🔧',
  marketing: '📣',
  commissions: '💸',
  mortality: '💀',
  other: '📝',
};

const categoryLabels: Record<string, string> = {
  travel: 'travel',
  food: 'food',
  supplies: 'supplies',
  utilities: 'utilities',
  rent: 'rent',
  salary: 'salary',
  maintenance: 'maintenance',
  marketing: 'marketing',
  commissions: 'commissions',
  mortality: 'mortality',
  other: 'other',
};

const paymentIcons: Record<string, React.ReactNode> = {
  cash: <Banknote className="w-3.5 h-3.5" />,
  gcash: <Smartphone className="w-3.5 h-3.5" />,
  bank_transfer: <Building2 className="w-3.5 h-3.5" />,
  card: <CreditCard className="w-3.5 h-3.5" />,
  reservation: <Receipt className="w-3.5 h-3.5" />,
};

function FinanceContent() {
  const router = useRouter();
  const { user } = useAuthStore();

  // Top-level view: P&L overview · per-day General Report · per-day Cash Flow (investor/remittance).
  const [activeTab, setActiveTab] = useState<'pnl' | 'daily' | 'cashflow' | 'stockflow'>('pnl');

  // Date range filter (YYYY-MM-DD strings; converted to timestamps below).
  // Defaults to month-to-date; Clear resets to all-time.
  const [dateFrom, setDateFrom] = useState<string>(() => monthToDate().from);
  const [dateTo, setDateTo] = useState<string>(() => monthToDate().to);

  const startTs = dateFrom ? new Date(dateFrom + 'T00:00:00').getTime() : undefined;
  const endTs = dateTo ? new Date(dateTo + 'T23:59:59.999').getTime() : undefined;
  const validStart = startTs && !isNaN(startTs) ? startTs : undefined;
  const validEnd = endTs && !isNaN(endTs) ? endTs : undefined;

  const summary = useQuery(api.services.finance.getFinancialSummary, {
    startDate: validStart,
    endDate: validEnd,
  });
  // Always-unfiltered snapshot so we can show "Right now" (actual till + lifetime net) next to "For this period".
  const summaryAllTime = useQuery(api.services.finance.getFinancialSummary, {});
  const expenses = useQuery(api.services.finance.getExpenses, {
    limit: 200,
    startDate: validStart,
    endDate: validEnd,
  });
  const createExpense = useMutation(api.services.finance.createExpense);
  const deleteExpense = useMutation(api.services.finance.deleteExpense);

  // Cash adjustments
  const cashAdjustments = useQuery(api.services.cashAdjustments.getCashAdjustments, {
    startDate: validStart,
    endDate: validEnd,
    limit: 50,
  });
  const createCashAdjustment = useMutation(api.services.cashAdjustments.createCashAdjustment);
  const deleteCashAdjustment = useMutation(api.services.cashAdjustments.deleteCashAdjustment);
  const [showAdjustForm, setShowAdjustForm] = useState(false);
  const [adjType, setAdjType] = useState<'deposit' | 'remit' | 'correction'>('deposit');
  const [adjAmount, setAdjAmount] = useState('');
  const [adjReason, setAdjReason] = useState('');
  const [adjNotes, setAdjNotes] = useState('');
  const [adjPassword, setAdjPassword] = useState('');
  const [adjError, setAdjError] = useState<string | null>(null);
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [adjConfirmDelete, setAdjConfirmDelete] = useState<string | null>(null);

  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [expenseFilter, setExpenseFilter] = useState<'all' | 'restocking' | 'operational'>('all');

  // Date range presets — set both ends in local time.
  const applyPreset = (preset: 'today' | 'last7' | 'last30' | 'month') => {
    const today = new Date();
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    const todayStr = fmt(today);
    if (preset === 'today') {
      setDateFrom(todayStr);
      setDateTo(todayStr);
      return;
    }
    if (preset === 'last7') {
      const past = new Date();
      past.setDate(today.getDate() - 6);
      setDateFrom(fmt(past));
      setDateTo(todayStr);
      return;
    }
    if (preset === 'last30') {
      const past = new Date();
      past.setDate(today.getDate() - 29);
      setDateFrom(fmt(past));
      setDateTo(todayStr);
      return;
    }
    if (preset === 'month') {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      setDateFrom(fmt(start));
      setDateTo(todayStr);
      return;
    }
  };

  const isFiltered = !!dateFrom || !!dateTo;
  const filterLabel = isFiltered
    ? dateFrom && dateTo
      ? dateFrom === dateTo
        ? new Date(dateFrom + 'T12:00:00').toLocaleDateString('en-PH', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })
        : `${new Date(dateFrom + 'T12:00:00').toLocaleDateString('en-PH', {
            month: 'short',
            day: 'numeric',
          })} â†’ ${new Date(dateTo + 'T12:00:00').toLocaleDateString('en-PH', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}`
      : dateFrom
      ? `Since ${dateFrom}`
      : `Until ${dateTo}`
    : 'All time';

  // Form state
  const [formCategory, setFormCategory] = useState<ExpenseCategory>('supplies');
  const [formAmount, setFormAmount] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPaymentMethod, setFormPaymentMethod] = useState<PaymentMethod>('cash');
  const [formNotes, setFormNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const handleAddExpense = async () => {
    if (!formAmount || !formDescription.trim()) return;
    const amount = parseFloat(formAmount);
    if (isNaN(amount) || amount <= 0) return;

    setIsSubmitting(true);
    try {
      await createExpense({
        type: 'operational',
        category: formCategory,
        amount,
        description: formDescription,
        paymentMethod: formPaymentMethod,
        notes: formNotes || undefined,
        userId: user?._id as Id<"users"> | undefined,
      });
      setShowExpenseForm(false);
      setFormCategory('supplies');
      setFormAmount('');
      setFormDescription('');
      setFormPaymentMethod('cash');
      setFormNotes('');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to add expense');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddAdjustment = async () => {
    setAdjError(null);
    if (!adjReason.trim()) return;
    const num = parseFloat(adjAmount);
    if (isNaN(num) || num === 0) return;
    if (adjType === 'correction' && !adjPassword.trim()) {
      setAdjError('Password required to confirm a correction');
      return;
    }
    setIsAdjusting(true);
    try {
      await createCashAdjustment({
        type: adjType,
        amount: num,
        reason: adjReason.trim(),
        notes: adjNotes.trim() || undefined,
        userId: user?._id as Id<'users'> | undefined,
        password: adjType === 'correction' ? adjPassword : undefined,
      });
      setShowAdjustForm(false);
      setAdjType('deposit');
      setAdjAmount('');
      setAdjReason('');
      setAdjNotes('');
      setAdjPassword('');
    } catch (e) {
      setAdjError(e instanceof Error ? e.message : 'Failed to record cash adjustment');
    } finally {
      setIsAdjusting(false);
    }
  };

  const handleDeleteAdjustment = async (id: string) => {
    try {
      await deleteCashAdjustment({ id: id as Id<'cashAdjustments'>, userId: user?._id as Id<'users'> | undefined });
      setAdjConfirmDelete(null);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to delete');
    }
  };

  const handleDeleteExpense = async (id: string) => {
    try {
      await deleteExpense({ id: id as Id<"expenses">, userId: user?._id as Id<'users'> | undefined });
      setConfirmDelete(null);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to delete');
    }
  };

  const filteredExpenses = expenses?.filter(e =>
    expenseFilter === 'all' ? true : e.type === expenseFilter
  ) || [];

  const isLoading = summary === undefined || expenses === undefined;

  return (
    <div className="min-h-screen bg-background text-foreground pb-20 sm:pb-6">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-white/10 safe-area-top">
        <div className="px-4 sm:px-6 py-3 sm:py-4 max-w-7xl mx-auto">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <button
                onClick={() => router.back()}
                className="p-2 rounded-lg bg-secondary/60 border border-white/10 hover:bg-white/10 active:scale-95 transition-all flex-shrink-0"
              >
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </button>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-2xl font-bold text-white truncate">Finance</h1>
                <p className="text-xs text-white/50 hidden sm:block">P&amp;L, cash flow &amp; expenses · <span style={{ color: isFiltered ? 'var(--red-hi)' : 'var(--ink-3)' }}>{filterLabel}</span></p>
              </div>
            </div>
            <button
              onClick={() => setShowAdjustForm(true)}
              className="px-3 sm:px-4 py-2 rounded-lg border text-sm font-semibold transition-all flex items-center gap-2"
              style={{
                background: 'var(--surface-2)',
                borderColor: 'var(--line)',
                color: 'var(--ink)',
              }}
              title="Add to or remove from Cash on Hand"
            >
              <Wallet className="w-4 h-4" />
              <span className="hidden sm:inline">Adjust cash</span>
            </button>
            <button
              onClick={() => setShowExpenseForm(true)}
              className="px-3 sm:px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 active:scale-95 transition-all flex items-center gap-2 shadow-lg shadow-primary/20"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden xs:inline">Add Expense</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 sm:px-6 pt-4 max-w-7xl mx-auto">
        <div className="inline-flex p-1 rounded-xl border border-white/10 bg-secondary/40">
          {([
            { id: 'pnl', label: 'P&L Overview' },
            { id: 'daily', label: 'General Report' },
            { id: 'cashflow', label: 'Cash Flow' },
            { id: 'stockflow', label: 'Stock Flow' },
          ] as const).map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                activeTab === t.id ? 'bg-primary text-white shadow-md shadow-primary/20' : 'text-white/60 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="px-4 sm:px-6 pt-4 sm:pt-5 max-w-7xl mx-auto">
        <div
          className="rounded-[14px] border p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-3"
          style={{ background: 'var(--surface)', borderColor: 'var(--line)', boxShadow: 'var(--shadow-card)' }}
        >
          <div className="flex items-center gap-2 flex-shrink-0">
            <Calendar className="w-4 h-4" style={{ color: 'var(--red-hi)' }} />
            <span className="label-eyebrow" style={{ color: 'var(--ink-3)' }}>Date range</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap flex-1">
            <input
              type="date"
              value={dateFrom}
              max={dateTo || undefined}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-3 py-2 rounded-md border text-xs sm:text-sm outline-none [color-scheme:dark] dc-mono"
              style={{ background: 'var(--bg-2)', borderColor: 'var(--line)', color: 'var(--ink)' }}
            />
            <span className="text-xs" style={{ color: 'var(--ink-4)' }}>â†’</span>
            <input
              type="date"
              value={dateTo}
              min={dateFrom || undefined}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-3 py-2 rounded-md border text-xs sm:text-sm outline-none [color-scheme:dark] dc-mono"
              style={{ background: 'var(--bg-2)', borderColor: 'var(--line)', color: 'var(--ink)' }}
            />
            <div className="flex gap-1.5 flex-wrap ml-1">
              {[
                { key: 'today', label: 'Today' },
                { key: 'last7', label: 'Last 7d' },
                { key: 'last30', label: 'Last 30d' },
                { key: 'month', label: 'This month' },
              ].map((p) => (
                <button
                  key={p.key}
                  onClick={() => applyPreset(p.key as 'today' | 'last7' | 'last30' | 'month')}
                  className="px-2.5 py-1.5 rounded-md border text-[11px] font-semibold"
                  style={{
                    background: 'var(--bg-2)',
                    borderColor: 'var(--line)',
                    color: 'var(--ink-2)',
                  }}
                >
                  {p.label}
                </button>
              ))}
              {isFiltered && (
                <button
                  onClick={() => {
                    setDateFrom('');
                    setDateTo('');
                  }}
                  className="px-2.5 py-1.5 rounded-md text-[11px] font-bold"
                  style={{ color: 'var(--red-hi)' }}
                >
                  Clear
                </button>
              )}
            </div>
          </div>
          <span
            className="dc-mono text-[11px] font-bold ml-auto px-2 py-1 rounded-md"
            style={{
              background: isFiltered ? 'var(--red-wash)' : 'var(--surface-hi)',
              color: isFiltered ? 'var(--red-hi)' : 'var(--ink-3)',
            }}
          >
            {filterLabel}
          </span>
        </div>
      </div>

      {activeTab === 'pnl' && (isLoading ? (
        <div className="text-center py-20">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-white/60">Loading finance data...</p>
        </div>
      ) : summary && (
        <div className="px-4 sm:px-6 py-4 sm:py-6 max-w-7xl mx-auto space-y-6">

          {/* KPI strip — six headline cards */}
          {(() => {
            const investment = summary.cashInjections ?? 0;
            const remittance = summary.cashWithdrawals ?? 0;
            const irNet = investment - remittance;
            const irBalanced = investment === 0 && remittance === 0;
            return (
              <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {/* 1 · Cash on Hand — accent is jade if positive, red if negative (mirrors Net Profit) */}
                {(() => {
                  const isPositive = summary.cashOnHand >= 0;
                  const accent = isPositive ? 'var(--jade)' : 'var(--red-hi)';
                  const accentMix = isPositive ? 'var(--jade)' : 'var(--red)';
                  return (
                <div
                  className="rounded-2xl border p-5 flex flex-col min-h-[182px] relative overflow-hidden"
                  style={{
                    background: `linear-gradient(135deg, color-mix(in oklch, ${accentMix} 18%, transparent), color-mix(in oklch, ${accentMix} 4%, transparent))`,
                    borderColor: `color-mix(in oklch, ${accentMix} 30%, transparent)`,
                  }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Wallet className="w-4 h-4" style={{ color: accent }} />
                      <p
                        className="text-[10px] font-semibold uppercase tracking-wider"
                        style={{ color: `color-mix(in oklch, ${accent} 90%, transparent)` }}
                      >
                        {isFiltered ? 'Cash flow · this period' : 'Cash on Hand'}
                      </p>
                    </div>
                    <span
                      className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                      style={{
                        background: `color-mix(in oklch, ${accentMix} 20%, transparent)`,
                        color: accent,
                      }}
                    >
                      {isPositive ? 'Positive' : 'Negative'}
                    </span>
                  </div>
                  <p
                    className="text-[28px] font-bold dc-mono leading-tight"
                    style={{ color: accent }}
                  >
                    {fmt(summary.cashOnHand)}
                  </p>
                  {isFiltered && summaryAllTime && (
                    <p className="text-[11px] mt-1.5" style={{ color: 'var(--ink-3)' }}>
                      <span style={{ color: 'var(--ink-4)' }}>Right now: </span>
                      <span className="font-semibold dc-mono">{fmt(summaryAllTime.cashOnHand)}</span>
                    </p>
                  )}
                  <div className="mt-auto pt-2.5 border-t flex flex-wrap gap-x-3 gap-y-1 text-[11px]" style={{ borderColor: 'var(--line-soft)' }}>
                    <span style={{ color: 'var(--ink-4)' }}>
                      Open <span className="font-semibold dc-mono" style={{ color: 'var(--ink-2)' }}>{fmt(summary.openingBalance)}</span>
                    </span>
                    <span style={{ color: 'var(--jade)' }}>
                      +{fmt(summary.cashRevenue)}
                    </span>
                    <span style={{ color: 'var(--red-hi)' }}>
                      âˆ’{fmt(summary.cashExpenses)}
                    </span>
                    {/* Investor deposits (injections) are capital — audited in the Cash Flow tab,
                        not added to the operating till — so they're intentionally not shown here. */}
                    {(summary.cashWithdrawals ?? 0) > 0 && (
                      <span style={{ color: 'var(--red-hi)' }}>âˆ’{fmt(summary.cashWithdrawals ?? 0)}</span>
                    )}
                  </div>
                </div>
                  );
                })()}

                {/* 2 · Gross Profit */}
                <div
                  className="rounded-2xl border p-5 flex flex-col min-h-[182px]"
                  style={{
                    background:
                      'linear-gradient(135deg, color-mix(in oklch, var(--jade) 14%, transparent), color-mix(in oklch, var(--jade) 3%, transparent))',
                    borderColor: 'color-mix(in oklch, var(--jade) 24%, transparent)',
                  }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4" style={{ color: 'var(--jade)' }} />
                      <p
                        className="text-[10px] font-semibold uppercase tracking-wider"
                        style={{ color: 'color-mix(in oklch, var(--jade) 90%, transparent)' }}
                      >
                        Gross Profit
                      </p>
                    </div>
                    <span
                      className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                      style={{
                        background: 'color-mix(in oklch, var(--jade) 18%, transparent)',
                        color: 'var(--jade)',
                      }}
                    >
                      {summary.grossMargin}% margin
                    </span>
                  </div>
                  <p
                    className="text-[28px] font-bold dc-mono leading-tight"
                    style={{ color: summary.grossProfit >= 0 ? 'var(--jade)' : 'var(--red-hi)' }}
                  >
                    {fmt(summary.grossProfit)}
                  </p>
                  <p className="text-[11px] mt-auto pt-2" style={{ color: 'var(--ink-3)' }}>
                    Revenue {fmt(summary.totalRevenue)} âˆ’ COGS {fmt(summary.cogs)}
                  </p>
                </div>

                {/* 3 · Net Profit — color tracks sign (jade if profit, red if loss) */}
                {(() => {
                  const isProfit = summary.netProfit >= 0;
                  const accent = isProfit ? 'var(--jade)' : 'var(--red-hi)';
                  const accentMix = isProfit ? 'var(--jade)' : 'var(--red)';
                  return (
                <div
                  className="rounded-2xl border p-5 flex flex-col min-h-[182px]"
                  style={{
                    background: `linear-gradient(135deg, color-mix(in oklch, ${accentMix} 18%, transparent), color-mix(in oklch, ${accentMix} 4%, transparent))`,
                    borderColor: `color-mix(in oklch, ${accentMix} 30%, transparent)`,
                  }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {isProfit ? (
                        <TrendingUp className="w-4 h-4" style={{ color: accent }} />
                      ) : (
                        <TrendingDown className="w-4 h-4" style={{ color: accent }} />
                      )}
                      <p
                        className="text-[10px] font-semibold uppercase tracking-wider"
                        style={{ color: `color-mix(in oklch, ${accent} 90%, transparent)` }}
                      >
                        {isFiltered ? 'Net profit · this period' : 'Net Profit'}
                      </p>
                    </div>
                    <span
                      className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                      style={{
                        background: `color-mix(in oklch, ${accentMix} 20%, transparent)`,
                        color: accent,
                      }}
                    >
                      {summary.netMargin}% margin
                    </span>
                  </div>
                  <p
                    className="text-[28px] font-bold dc-mono leading-tight"
                    style={{ color: accent }}
                  >
                    {fmt(summary.netProfit)}
                  </p>
                  {isFiltered && summaryAllTime && (
                    <p className="text-[11px] mt-1.5" style={{ color: 'var(--ink-3)' }}>
                      <span style={{ color: 'var(--ink-4)' }}>Right now: </span>
                      <span className="font-semibold dc-mono">{fmt(summaryAllTime.netProfit)}</span>
                      <span style={{ color: 'var(--ink-4)' }}> · {summaryAllTime.netMargin}%</span>
                    </p>
                  )}
                  <p className="text-[11px] mt-auto pt-2" style={{ color: 'var(--ink-3)' }}>
                    Gross {fmt(summary.grossProfit)} âˆ’ OpEx {fmt(summary.totalOperationalExpense)}
                  </p>
                </div>
                  );
                })()}

                {/* 4 · Restock Expense */}
                <div
                  className="rounded-2xl border p-5 flex flex-col min-h-[182px]"
                  style={{
                    background:
                      'linear-gradient(135deg, color-mix(in oklch, var(--gold) 14%, transparent), color-mix(in oklch, var(--gold) 3%, transparent))',
                    borderColor: 'color-mix(in oklch, var(--gold) 24%, transparent)',
                  }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4" style={{ color: 'var(--gold-deep)' }} />
                      <p
                        className="text-[10px] font-semibold uppercase tracking-wider"
                        style={{ color: 'color-mix(in oklch, var(--gold-deep) 90%, transparent)' }}
                      >
                        Restock Expense
                      </p>
                    </div>
                    <span
                      className="px-2 py-0.5 rounded-full text-[10px] font-semibold dc-mono"
                      style={{
                        background: 'color-mix(in oklch, var(--gold) 18%, transparent)',
                        color: 'var(--gold-deep)',
                      }}
                    >
                      {summary.restockCount ?? 0}
                    </span>
                  </div>
                  <p
                    className="text-[28px] font-bold dc-mono leading-tight"
                    style={{ color: 'var(--gold-deep)' }}
                  >
                    {fmt(summary.totalRestockCost ?? 0)}
                  </p>
                  <p className="text-[11px] mt-auto pt-2 dc-mono" style={{ color: 'var(--ink-3)' }}>
                    Till {fmt(summary.restockFromCOH ?? 0)} · Investment {fmt(summary.restockFromInvestment ?? 0)}
                  </p>
                  <p className="text-[10px]" style={{ color: 'var(--ink-4)' }}>
                    Till reduces COH · Investment is declaration-only · neither hits Net Profit
                  </p>
                </div>

                {/* 5 · Operational Expense */}
                <div
                  className="rounded-2xl border p-5 flex flex-col min-h-[182px]"
                  style={{
                    background:
                      'linear-gradient(135deg, color-mix(in oklch, var(--indigo) 16%, transparent), color-mix(in oklch, var(--indigo) 4%, transparent))',
                    borderColor: 'color-mix(in oklch, var(--indigo) 26%, transparent)',
                  }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <PieChartIcon className="w-4 h-4" style={{ color: 'var(--indigo)' }} />
                      <p
                        className="text-[10px] font-semibold uppercase tracking-wider"
                        style={{ color: 'color-mix(in oklch, var(--indigo) 90%, transparent)' }}
                      >
                        Operational Expense
                      </p>
                    </div>
                    <span
                      className="px-2 py-0.5 rounded-full text-[10px] font-semibold dc-mono"
                      style={{
                        background: 'color-mix(in oklch, var(--indigo) 18%, transparent)',
                        color: 'var(--indigo)',
                      }}
                    >
                      {summary.operationalCount}
                    </span>
                  </div>
                  <p
                    className="text-[28px] font-bold dc-mono leading-tight"
                    style={{ color: 'var(--indigo)' }}
                  >
                    {fmt(summary.totalOperationalExpense)}
                  </p>
                  <p className="text-[11px] mt-auto pt-2" style={{ color: 'var(--ink-3)' }}>
                    Rent, utilities, salary, marketing, etc.
                  </p>
                </div>

                {/* 6 · Investment vs Remittance */}
                <div
                  className="rounded-2xl border p-5 flex flex-col min-h-[182px]"
                  style={{
                    background:
                      'linear-gradient(135deg, var(--surface-2), var(--surface))',
                    borderColor: 'var(--line)',
                  }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <ArrowUpRight className="w-4 h-4" style={{ color: 'var(--ink-2)' }} />
                      <p
                        className="text-[10px] font-semibold uppercase tracking-wider"
                        style={{ color: 'var(--ink-3)' }}
                      >
                        Investment vs Remittance
                      </p>
                    </div>
                    {!irBalanced && (
                      <span
                        className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                        style={{
                          background:
                            irNet >= 0
                              ? 'color-mix(in oklch, var(--jade) 18%, transparent)'
                              : 'color-mix(in oklch, var(--red) 20%, transparent)',
                          color: irNet >= 0 ? 'var(--jade)' : 'var(--red-hi)',
                        }}
                      >
                        Net {irNet >= 0 ? '+' : 'âˆ’'}
                        {fmt(Math.abs(irNet))}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-1">
                    <div>
                      <p
                        className="text-[10px] font-semibold uppercase tracking-wider mb-1"
                        style={{ color: 'var(--ink-4)' }}
                      >
                        Investment in
                      </p>
                      <p
                        className="text-[20px] font-bold dc-mono leading-tight"
                        style={{ color: 'var(--jade)' }}
                      >
                        +{fmt(investment)}
                      </p>
                      <p className="text-[10px] mt-0.5" style={{ color: 'var(--ink-4)' }}>
                        Owner / float adds
                      </p>
                    </div>
                    <div>
                      <p
                        className="text-[10px] font-semibold uppercase tracking-wider mb-1"
                        style={{ color: 'var(--ink-4)' }}
                      >
                        Remitted out
                      </p>
                      <p
                        className="text-[20px] font-bold dc-mono leading-tight"
                        style={{ color: 'var(--red-hi)' }}
                      >
                        âˆ’{fmt(remittance)}
                      </p>
                      <p className="text-[10px] mt-0.5" style={{ color: 'var(--ink-4)' }}>
                        Investor remit category
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Cash Adjustments History */}
          {cashAdjustments && cashAdjustments.length > 0 && (
            <div
              className="rounded-xl border p-5"
              style={{ background: 'var(--surface)', borderColor: 'var(--line)' }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Wallet className="w-4 h-4" style={{ color: 'var(--jade)' }} />
                  Cash adjustments
                  <span className="text-[10px] font-mono-tabular ml-1.5" style={{ color: 'var(--ink-4)' }}>
                    {cashAdjustments.length}
                  </span>
                </h3>
                <button
                  onClick={() => setShowAdjustForm(true)}
                  className="text-[11px] font-bold inline-flex items-center gap-1"
                  style={{ color: 'var(--red-hi)' }}
                >
                  + Record
                </button>
              </div>
              <div className="flex flex-col">
                {cashAdjustments.map((a, i) => {
                  const positive = a.amount > 0;
                  return (
                    <div
                      key={a._id}
                      className="grid items-center gap-3 py-2.5 px-1"
                      style={{
                        gridTemplateColumns: 'auto minmax(0, 1fr) auto auto',
                        borderBottom:
                          i === cashAdjustments.length - 1 ? 'none' : '1px solid var(--line-soft)',
                      }}
                    >
                      <span
                        className="text-[11px] font-mono-tabular whitespace-nowrap min-w-[60px]"
                        style={{ color: 'var(--ink-4)' }}
                      >
                        {new Date(a.date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
                      </span>
                      <div className="min-w-0">
                        <div className="text-[13px] font-semibold truncate">{a.reason}</div>
                        <div className="placard mt-0.5">
                          {a.type}
                          {a.notes ? ` · ${a.notes}` : ''}
                        </div>
                      </div>
                      <span
                        className="text-[13px] font-mono-tabular font-bold text-right whitespace-nowrap"
                        style={{ color: positive ? 'var(--jade)' : 'var(--red-hi)' }}
                      >
                        {positive ? '+' : 'âˆ’'}
                        {fmt(Math.abs(a.amount))}
                      </span>
                      <button
                        onClick={() => setAdjConfirmDelete(a._id)}
                        className="p-1 rounded hover:bg-error/20 transition-colors"
                        aria-label="Remove"
                        title="Remove this adjustment"
                      >
                        <Trash2 className="w-3.5 h-3.5" style={{ color: 'var(--ink-4)' }} />
                      </button>
                    </div>
                  );
                })}
              </div>
              <div
                className="mt-3 pt-3 border-t flex justify-between text-[12px]"
                style={{ borderColor: 'var(--line-soft)' }}
              >
                <span style={{ color: 'var(--ink-3)' }}>
                  Net adjustments {isFiltered ? '· this period' : ''}
                </span>
                <span
                  className="font-mono-tabular font-bold"
                  style={{
                    color:
                      (summary.cashAdjustmentsTotal ?? 0) >= 0 ? 'var(--jade)' : 'var(--red-hi)',
                  }}
                >
                  {(summary.cashAdjustmentsTotal ?? 0) >= 0 ? '+' : 'âˆ’'}
                  {fmt(Math.abs(summary.cashAdjustmentsTotal ?? 0))}
                </span>
              </div>
            </div>
          )}

          {/* P&L Statement + Payment Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* P&L Table */}
            <div className="bg-secondary/30 rounded-xl border border-white/10 p-5">
              <div className="mb-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-success" />
                  Profit & Loss Statement
                </h3>
                <p className="text-[10px] text-white/40 mt-0.5">Revenue = actually collected (paid + partial)</p>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-baseline pb-2 border-b border-white/10">
                  <span className="text-white/70">Revenue (Collected)</span>
                  <span className="text-white font-semibold">{fmt(summary.totalRevenue)}</span>
                </div>
                <div className="flex justify-between items-baseline text-xs">
                  <span className="text-white/50 pl-3">Orders</span>
                  <span className="text-white/70">{fmt(summary.orderRevenue)}</span>
                </div>
                <div className="flex justify-between items-baseline text-xs">
                  <span className="text-white/50 pl-3">Reservations</span>
                  <span className="text-white/70">{fmt(summary.reservationRevenue)}</span>
                </div>

                <div className="flex justify-between items-baseline pb-2 border-b border-white/10 pt-2">
                  <span className="text-white/70">
                    Cost of Goods Sold
                    <span className="ml-1.5 text-[10px] uppercase tracking-wider text-white/40 border border-white/15 rounded px-1 py-0.5">FIFO</span>
                  </span>
                  <span className="text-error font-semibold">âˆ’{fmt(summary.cogs)}</span>
                </div>

                {(summary.totalDiscountsGiven || 0) > 0 && (
                  <>
                    <div className="flex justify-between items-baseline text-sm pt-1">
                      <span className="text-white/70">Discounts Given</span>
                      <span className="text-warning font-medium">âˆ’{fmt(summary.totalDiscountsGiven)}</span>
                    </div>
                    {(summary.totalLineDiscounts || 0) > 0 && (
                      <div className="flex justify-between items-baseline text-xs">
                        <span className="text-white/50 pl-3">Line-item</span>
                        <span className="text-white/70">âˆ’{fmt(summary.totalLineDiscounts)}</span>
                      </div>
                    )}
                    {(summary.totalOrderDiscounts || 0) > 0 && (
                      <div className="flex justify-between items-baseline text-xs">
                        <span className="text-white/50 pl-3">Order-level</span>
                        <span className="text-white/70">âˆ’{fmt(summary.totalOrderDiscounts)}</span>
                      </div>
                    )}
                    <p className="text-[10px] text-white/30 pl-3">(already reflected in Revenue)</p>
                  </>
                )}

                <div className="flex justify-between items-baseline py-2 border-b border-white/10">
                  <div>
                    <span className="text-white font-semibold">Gross Profit</span>
                    <span className="ml-2 text-[10px] text-white/40">({summary.grossMargin}%)</span>
                  </div>
                  <span className="text-primary font-bold">{fmt(summary.grossProfit)}</span>
                </div>

                <div className="flex justify-between items-baseline text-sm">
                  <span className="text-white/70">Operational Expenses</span>
                  <span className="text-error font-semibold">âˆ’{fmt(summary.totalOperationalExpense)}</span>
                </div>

                <div className="flex justify-between items-baseline py-2 border-t-2 border-white/20 mt-2">
                  <div>
                    <span className="text-white font-bold text-base">Net Profit</span>
                    <span className="ml-2 text-[10px] text-white/40">({summary.netMargin}%)</span>
                  </div>
                  <span className={`font-bold text-base ${
                    summary.netProfit >= 0 ? 'text-success' : 'text-error'
                  }`}>
                    {fmt(summary.netProfit)}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment Method Breakdown */}
            <div className="bg-secondary/30 rounded-xl border border-white/10 p-5">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <PieChartIcon className="w-4 h-4 text-info" />
                Revenue by Payment
              </h3>
              {Object.keys(summary.revenueByPayment).length === 0 ? (
                <p className="text-xs text-white/40 text-center py-8">No revenue yet</p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(summary.revenueByPayment).map(([method, amount]) => {
                    const percentage = summary.totalRevenue > 0 ? (amount / summary.totalRevenue) * 100 : 0;
                    const colorMap: Record<string, string> = {
                      cash: 'bg-success',
                      gcash: 'bg-info',
                      bank_transfer: 'bg-purple-500',
                      card: 'bg-primary',
                      reservation: 'bg-warning',
                      unknown: 'bg-white/30',
                    };
                    return (
                      <div key={method}>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2 text-xs">
                            {paymentIcons[method] || <DollarSign className="w-3.5 h-3.5" />}
                            <span className="text-white/80 capitalize">{method.replace('_', ' ')}</span>
                          </div>
                          <div className="flex items-baseline gap-2">
                            <span className="text-white font-semibold text-sm">{fmt(amount)}</span>
                            <span className="text-white/40 text-[10px]">{percentage.toFixed(1)}%</span>
                          </div>
                        </div>
                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${colorMap[method] || 'bg-white/30'} rounded-full transition-all`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Outstanding Balance Alert (unpaid orders/reservations) */}
          {summary.totalOutstanding > 0 && (
            <div className="bg-gradient-to-r from-warning/10 to-warning/5 rounded-xl border border-warning/30 p-5">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-warning/20 flex items-center justify-center flex-shrink-0">
                  <Receipt className="w-5 h-5 text-warning" />
                </div>
                <div className="flex-1">
                  <div className="flex items-baseline gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-warning">Outstanding Payments</h3>
                    <span className="text-[10px] text-warning/70">
                      {summary.unpaidCount} unpaid · {summary.partialCount} partial
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-warning">{fmt(summary.totalOutstanding)}</p>
                  <p className="text-xs text-warning/70 mt-1">
                    Not yet collected. Tracked separately from revenue.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Expense Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="bg-secondary/30 rounded-xl border border-white/10 p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-white/50 uppercase tracking-wider font-semibold">Restocking</span>
                <Package className="w-4 h-4 text-info" />
              </div>
              <p className="text-2xl font-bold text-white">{fmt(summary.totalRestockCost)}</p>
              <p className="text-[10px] text-white/40 mt-1">{summary.restockCount} batches</p>
            </div>

            <div className="bg-secondary/30 rounded-xl border border-white/10 p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-white/50 uppercase tracking-wider font-semibold">Operational</span>
                <Receipt className="w-4 h-4 text-warning" />
              </div>
              <p className="text-2xl font-bold text-white">{fmt(summary.totalOperationalExpense)}</p>
              <p className="text-[10px] text-white/40 mt-1">{summary.operationalCount} records</p>
            </div>

            <div className="bg-secondary/30 rounded-xl border border-white/10 p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-white/50 uppercase tracking-wider font-semibold">Total Expenses</span>
                <DollarSign className="w-4 h-4 text-error" />
              </div>
              <p className="text-2xl font-bold text-error">{fmt(summary.totalExpenses)}</p>
              <p className="text-[10px] text-white/40 mt-1">All time</p>
            </div>
          </div>

          {/* Operational expense by category */}
          {Object.keys(summary.operationalByCategory).length > 0 && (
            <div className="bg-secondary/30 rounded-xl border border-white/10 p-5">
              <h3 className="text-sm font-bold text-white mb-4">Operational Expenses by Category</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {Object.entries(summary.operationalByCategory).map(([cat, amount]) => (
                  <div key={cat} className="bg-background/40 rounded-lg p-3 border border-white/5">
                    <div className="flex items-center gap-1.5 text-[10px] text-white/50 uppercase tracking-wider mb-1">
                      <span>{categoryIcons[cat] || 'ðŸ“'}</span>
                      <span>{categoryLabels[cat] || cat}</span>
                    </div>
                    <p className="text-sm font-bold text-white">{fmt(amount)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Expense List */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white">Expenses</h2>
                <p className="text-xs text-white/50 mt-0.5">{filteredExpenses.length} records</p>
              </div>
              <div className="flex gap-1.5 bg-secondary/40 rounded-lg p-1">
                {(['all', 'restocking', 'operational'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setExpenseFilter(filter)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all capitalize ${
                      expenseFilter === filter
                        ? 'bg-primary text-white'
                        : 'text-white/60 hover:text-white/90'
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>

            {filteredExpenses.length === 0 ? (
              <div className="bg-secondary/30 rounded-xl border border-white/10 p-8 text-center">
                <Receipt className="w-10 h-10 text-white/20 mx-auto mb-3" />
                <p className="text-sm text-white/60">No expenses recorded yet</p>
                <button
                  onClick={() => setShowExpenseForm(true)}
                  className="mt-3 text-xs text-primary hover:text-primary/80"
                >
                  Add your first expense
                </button>
              </div>
            ) : (
              <div className="bg-secondary/30 rounded-xl border border-white/10 overflow-hidden">
                {/* Desktop table */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10 bg-secondary/40">
                        <th className="text-left px-4 py-3 text-[10px] font-semibold text-white/40 uppercase tracking-wider">Date</th>
                        <th className="text-left px-4 py-3 text-[10px] font-semibold text-white/40 uppercase tracking-wider">Type</th>
                        <th className="text-left px-4 py-3 text-[10px] font-semibold text-white/40 uppercase tracking-wider">Description</th>
                        <th className="text-left px-4 py-3 text-[10px] font-semibold text-white/40 uppercase tracking-wider">Payment</th>
                        <th className="text-right px-4 py-3 text-[10px] font-semibold text-white/40 uppercase tracking-wider">Amount</th>
                        <th className="w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredExpenses.map((e) => (
                        <tr key={e._id} className="hover:bg-white/[0.03]">
                          <td className="px-4 py-3 text-white/70 text-xs whitespace-nowrap">{fmtDate(e.date)}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium border ${
                              e.type === 'restocking'
                                ? 'bg-info/10 text-info border-info/30'
                                : 'bg-warning/10 text-warning border-warning/30'
                            }`}>
                              {e.type === 'restocking' ? 'ðŸ“¦ Restock' : `${categoryIcons[e.category || 'other']} ${categoryLabels[e.category || 'other'] || e.category || 'other'}`}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-white max-w-xs truncate">{e.description}</td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1 text-xs text-white/70 capitalize">
                              {paymentIcons[e.paymentMethod] || <DollarSign className="w-3.5 h-3.5" />}
                              {e.paymentMethod.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-white font-semibold">{fmt(e.amount)}</td>
                          <td className="px-4 py-3">
                            {e.type === 'operational' && (
                              <button
                                onClick={() => setConfirmDelete(e._id)}
                                className="p-1 rounded hover:bg-error/20 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-error/70 hover:text-error" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="sm:hidden divide-y divide-white/5">
                  {filteredExpenses.map((e) => (
                    <div key={e._id} className="p-3">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${
                              e.type === 'restocking' ? 'bg-info/10 text-info' : 'bg-warning/10 text-warning'
                            }`}>
                              {e.type === 'restocking' ? 'ðŸ“¦ Restock' : `${categoryIcons[e.category || 'other']} ${categoryLabels[e.category || 'other'] || e.category || 'other'}`}
                            </span>
                            <span className="text-[10px] text-white/40">{fmtDate(e.date)}</span>
                          </div>
                          <p className="text-sm text-white truncate">{e.description}</p>
                          <div className="flex items-center gap-1 text-xs text-white/50 mt-1">
                            {paymentIcons[e.paymentMethod]}
                            <span className="capitalize">{e.paymentMethod.replace('_', ' ')}</span>
                          </div>
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <p className="text-sm font-bold text-white">{fmt(e.amount)}</p>
                          {e.type === 'operational' && (
                            <button
                              onClick={() => setConfirmDelete(e._id)}
                              className="text-[10px] text-error hover:text-error/80 mt-1"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ))}

      {activeTab === 'daily' && (
        <DailyReportTab startDate={validStart} endDate={validEnd} />
      )}

      {activeTab === 'cashflow' && (
        <CashFlowTab startDate={validStart} endDate={validEnd} />
      )}

      {activeTab === 'stockflow' && (
        <StockFlowTab startDate={validStart} endDate={validEnd} />
      )}

      <BottomNavbar />

      {/* Cash Adjustment Modal */}
      {showAdjustForm && (
        <>
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998]"
            onClick={() => !isAdjusting && setShowAdjustForm(false)}
          />
          <div className="fixed bottom-0 left-0 right-0 sm:inset-0 sm:flex sm:items-center sm:justify-center z-[9999]">
            <div
              className="rounded-t-3xl sm:rounded-2xl shadow-2xl p-5 sm:p-6 sm:w-full sm:max-w-md sm:mx-4 max-h-[85vh] overflow-y-auto"
              style={{
                background: 'var(--secondary)',
                border: '1px solid var(--line)',
              }}
            >
              <div className="flex items-start gap-3 mb-4">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: 'var(--jade-wash)', color: 'var(--jade)' }}
                >
                  <Wallet className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-white">Adjust cash on hand</h3>
                  <p className="text-xs text-white/60 mt-0.5">
                    Records a signed movement so COH and the audit trail stay in sync.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-xs text-white/60 mb-1.5">Type</p>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { v: 'deposit' as const, label: 'Deposit', sub: 'Owner / float' },
                      { v: 'remit' as const, label: 'Remit', sub: 'Investor / draw' },
                      { v: 'correction' as const, label: 'Adjust', sub: 'Reconcile · pw' },
                    ]).map((opt) => {
                      const active = adjType === opt.v;
                      return (
                        <button
                          key={opt.v}
                          type="button"
                          onClick={() => {
                            setAdjType(opt.v);
                            setAdjError(null);
                          }}
                          className="p-2.5 rounded-lg text-xs font-semibold border transition-all"
                          style={{
                            background: active ? 'var(--red-wash)' : 'var(--bg-2)',
                            borderColor: active ? 'var(--red)' : 'var(--line)',
                            color: active ? 'var(--red-hi)' : 'var(--ink-2)',
                          }}
                        >
                          <div>{opt.label}</div>
                          <div className="text-[10px] mt-0.5 font-normal" style={{ color: 'var(--ink-4)' }}>
                            {opt.sub}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  {adjType === 'correction' && (
                    <div
                      className="mt-2 p-2.5 rounded-lg text-[11px] flex items-start gap-2"
                      style={{
                        background: 'var(--gold-wash)',
                        border: '1px solid color-mix(in oklch, var(--gold) 30%, transparent)',
                        color: 'var(--gold-deep)',
                      }}
                    >
                      <span>âš </span>
                      <span>
                        Adjustments edit COH outside normal sales/expense flow. Requires your
                        password + at least 10 characters of reason. Use a negative amount if the
                        till is short.
                      </span>
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-xs text-white/60 mb-1.5">Amount (₱)</p>
                  <input
                    type="number"
                    step="0.01"
                    value={adjAmount}
                    onChange={(e) => setAdjAmount(e.target.value)}
                    placeholder={adjType === 'correction' ? '+ or âˆ’ number' : '0.00'}
                    className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none"
                    style={{
                      background: 'var(--bg-2)',
                      borderColor: 'var(--line)',
                      color: 'var(--ink)',
                    }}
                  />
                </div>

                <div>
                  <p className="text-xs text-white/60 mb-1.5">
                    Reason{' '}
                    {adjType === 'correction' && (
                      <span className="text-[10px]" style={{ color: 'var(--gold-deep)' }}>
                        (min 10 chars)
                      </span>
                    )}
                  </p>
                  <input
                    type="text"
                    value={adjReason}
                    onChange={(e) => setAdjReason(e.target.value)}
                    placeholder={
                      adjType === 'deposit'
                        ? 'e.g. Owner capital injection · Float top-up'
                        : adjType === 'remit'
                        ? 'e.g. Investor remittance · Owner draw'
                        : 'e.g. Cash count over by ₱200 after morning recount'
                    }
                    className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none"
                    style={{
                      background: 'var(--bg-2)',
                      borderColor: 'var(--line)',
                      color: 'var(--ink)',
                    }}
                  />
                </div>

                {adjType === 'correction' && (
                  <div>
                    <p className="text-xs text-white/60 mb-1.5">
                      Your password{' '}
                      <span className="text-[10px]" style={{ color: 'var(--ink-4)' }}>
                        (confirm it&apos;s really you)
                      </span>
                    </p>
                    <input
                      type="password"
                      value={adjPassword}
                      onChange={(e) => setAdjPassword(e.target.value)}
                      placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
                      autoComplete="current-password"
                      className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none"
                      style={{
                        background: 'var(--bg-2)',
                        borderColor: 'var(--line)',
                        color: 'var(--ink)',
                      }}
                    />
                  </div>
                )}

                {adjError && (
                  <div
                    className="px-3 py-2 rounded-lg text-xs"
                    style={{
                      background: 'var(--red-wash)',
                      border: '1px solid var(--red)',
                      color: 'var(--red-hi)',
                    }}
                  >
                    {adjError}
                  </div>
                )}

                <div>
                  <p className="text-xs text-white/60 mb-1.5">Notes (optional)</p>
                  <textarea
                    rows={2}
                    value={adjNotes}
                    onChange={(e) => setAdjNotes(e.target.value)}
                    placeholder="Anything for the audit trail"
                    className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none resize-none"
                    style={{
                      background: 'var(--bg-2)',
                      borderColor: 'var(--line)',
                      color: 'var(--ink)',
                    }}
                  />
                </div>

                <div className="flex gap-3 pt-1">
                  <button
                    onClick={() => setShowAdjustForm(false)}
                    disabled={isAdjusting}
                    className="flex-1 px-4 py-3 rounded-xl font-medium border"
                    style={{
                      background: 'transparent',
                      borderColor: 'var(--line)',
                      color: 'var(--ink-2)',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddAdjustment}
                    disabled={!adjAmount || !adjReason.trim() || isAdjusting || parseFloat(adjAmount) === 0}
                    className="flex-1 px-4 py-3 rounded-xl font-bold border"
                    style={{
                      background: 'var(--red)',
                      borderColor: 'var(--red-deep)',
                      color: 'oklch(0.99 0 0)',
                    }}
                  >
                    {isAdjusting ? 'Recording…' : 'Record adjustment'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Cash Adjustment Delete Confirm */}
      {adjConfirmDelete && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setAdjConfirmDelete(null)}
          />
          <div
            className="relative max-w-sm w-full rounded-2xl p-6"
            style={{ background: 'var(--secondary)', border: '1px solid var(--line)' }}
          >
            <h3 className="text-lg font-bold text-white mb-2">Remove adjustment?</h3>
            <p className="text-sm text-white/70 mb-5">
              This deletes the row entirely — COH will recompute without it. No history is kept.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setAdjConfirmDelete(null)}
                className="flex-1 px-4 py-2.5 rounded-lg border text-sm font-semibold"
                style={{ background: 'transparent', borderColor: 'var(--line)', color: 'var(--ink-2)' }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteAdjustment(adjConfirmDelete)}
                className="flex-1 px-4 py-2.5 rounded-lg text-sm font-bold border"
                style={{ background: 'var(--red)', borderColor: 'var(--red-deep)', color: 'oklch(0.99 0 0)' }}
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Expense Modal */}
      {showExpenseForm && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998]" onClick={() => !isSubmitting && setShowExpenseForm(false)} />
          <div className="fixed bottom-0 left-0 right-0 sm:inset-0 sm:flex sm:items-center sm:justify-center z-[9999]">
            <div className="bg-secondary border-t sm:border border-white/10 rounded-t-3xl sm:rounded-2xl shadow-2xl p-5 sm:p-6 sm:w-full sm:max-w-md sm:mx-4 max-h-[85vh] overflow-y-auto">
              <div className="flex justify-center pt-2 pb-3 sm:hidden">
                <div className="w-12 h-1.5 bg-white/20 rounded-full" />
              </div>
              <h3 className="text-lg font-bold text-white mb-1">Add Operational Expense</h3>
              <p className="text-xs text-white/50 mb-5">Track travel, food, supplies, utilities, salary, commissions, etc.</p>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-white/60 mb-1.5">Category</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['travel', 'food', 'supplies', 'utilities', 'rent', 'salary', 'maintenance', 'marketing', 'commissions', 'other'] as ExpenseCategory[]).map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setFormCategory(cat)}
                        className={`px-2 py-2 rounded-lg text-xs font-medium border transition-all capitalize ${
                          formCategory === cat
                            ? 'bg-primary border-primary text-white'
                            : 'bg-background/60 border-white/10 text-white/70'
                        }`}
                      >
                        {categoryIcons[cat]} {categoryLabels[cat]}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-white/60 mb-1.5">Amount (₱)</label>
                  <input
                    type="number"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2.5 bg-background/60 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs text-white/60 mb-1.5">Description</label>
                  <input
                    type="text"
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="e.g. Grab to supplier, fish food, etc."
                    className="w-full px-3 py-2.5 bg-background/60 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs text-white/60 mb-1.5">Payment Method</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['cash', 'gcash', 'bank_transfer', 'card'] as PaymentMethod[]).map((m) => (
                      <button
                        key={m}
                        onClick={() => setFormPaymentMethod(m)}
                        className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all capitalize flex items-center justify-center gap-1.5 ${
                          formPaymentMethod === m
                            ? 'bg-primary border-primary text-white'
                            : 'bg-background/60 border-white/10 text-white/70'
                        }`}
                      >
                        {paymentIcons[m]}
                        {m.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-white/60 mb-1.5">Notes (optional)</label>
                  <textarea
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    placeholder="Additional details..."
                    rows={2}
                    className="w-full px-3 py-2.5 bg-background/60 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary resize-none text-sm"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowExpenseForm(false)}
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-3 bg-secondary border border-white/10 text-white rounded-xl font-medium hover:bg-white/10 active:scale-95 transition-all disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddExpense}
                    disabled={!formAmount || !formDescription.trim() || isSubmitting}
                    className="flex-1 px-4 py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-50"
                  >
                    {isSubmitting ? 'Adding...' : 'Add Expense'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Delete Confirmation */}
      {confirmDelete && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998]" onClick={() => setConfirmDelete(null)} />
          <div className="fixed inset-0 flex items-center justify-center z-[9999] p-4">
            <div className="bg-secondary border border-white/10 rounded-2xl shadow-2xl p-6 w-full max-w-sm">
              <h3 className="text-lg font-bold text-white mb-2">Delete Expense</h3>
              <p className="text-sm text-white/70 mb-6">Are you sure? This cannot be undone.</p>
              <div className="flex gap-3">
                <button onClick={() => setConfirmDelete(null)} className="flex-1 px-4 py-3 bg-secondary border border-white/10 text-white rounded-xl font-medium">
                  No
                </button>
                <button onClick={() => handleDeleteExpense(confirmDelete)} className="flex-1 px-4 py-3 bg-error text-white rounded-xl font-medium">
                  Yes, Delete
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ GENERAL (DAILY) REPORT TAB â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

const dayLabel = (key: string) =>
  new Date(key + 'T12:00:00').toLocaleDateString('en-PH', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

type OpenDay = { dateKey: string; startMs: number; endMs: number };

function DailyReportTab({ startDate, endDate }: { startDate?: number; endDate?: number }) {
  // Bucket days by the viewer's local timezone (Philippine time in practice).
  const tzOffsetMinutes = new Date().getTimezoneOffset();
  const report = useQuery(api.services.finance.getDailySalesReport, {
    tzOffsetMinutes,
    startDate,
    endDate,
  });
  const [openDay, setOpenDay] = useState<OpenDay | null>(null);
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('asc');

  const loading = report === undefined;

  // Backend returns rows newest-first; flip for ascending without mutating the source.
  const sortedRows = report
    ? sortDir === 'desc'
      ? report.rows
      : [...report.rows].sort((a, b) => a.startMs - b.startMs)
    : [];

  return (
    <div className="px-4 sm:px-6 py-4 sm:py-6 max-w-7xl mx-auto space-y-5">
      {loading ? (
        <div className="text-center py-20">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-white/60">Building daily report...</p>
        </div>
      ) : (
        <>
          {/* Period summary */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <DailyKpi label="Total Sales" value={fmt(report.summary.totalSales)} accent="text-success" bg="bg-success/10" Icon={Banknote} />
            <DailyKpi label="Total Expense" value={fmt(report.summary.totalExpense)} accent="text-error" bg="bg-error/10" Icon={Receipt} />
            <DailyKpi
              label="Net Total"
              value={fmt(report.summary.netTotal)}
              accent={report.summary.netTotal >= 0 ? 'text-success' : 'text-error'}
              bg={report.summary.netTotal >= 0 ? 'bg-success/10' : 'bg-error/10'}
              Icon={report.summary.netTotal >= 0 ? TrendingUp : TrendingDown}
            />
          </div>

          {/* Sort order */}
          {report.rows.length > 0 && (
            <div className="flex items-center justify-end gap-2">
              <span className="text-[11px] text-white/40 uppercase tracking-wider">Order by date</span>
              <div className="inline-flex p-[3px] rounded-lg border border-white/10 bg-secondary/40">
                {([
                  { id: 'desc', label: 'Newest first' },
                  { id: 'asc', label: 'Oldest first' },
                ] as const).map((o) => (
                  <button
                    key={o.id}
                    onClick={() => setSortDir(o.id)}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                      sortDir === o.id ? 'bg-primary text-white' : 'text-white/60 hover:text-white'
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {report.rows.length === 0 ? (
            <div className="text-center py-16 rounded-2xl border border-white/10 bg-secondary/30">
              <Calendar className="w-12 h-12 text-white/20 mx-auto mb-3" />
              <h3 className="text-base font-bold text-white mb-1">No sales recorded</h3>
              <p className="text-xs text-white/60">No paid sales or expenses fall in this period.</p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block">
                <div className="bg-secondary/30 border border-white/10 rounded-xl overflow-hidden shadow-xl">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10 bg-secondary/60 text-[10px] font-semibold text-white/40 uppercase tracking-wider">
                        <th className="text-left px-5 py-3">Date</th>
                        <th className="text-right px-3 py-3">Total Sales</th>
                        <th className="text-right px-3 py-3">Total Expense</th>
                        <th className="text-right px-3 py-3">Total Daily</th>
                        <th className="text-right px-3 py-3">EOD COH</th>
                        <th className="text-right px-5 py-3">Activity</th>
                        <th className="w-8" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {sortedRows.map((r) => (
                        <tr
                          key={r.dateKey}
                          onClick={() => setOpenDay({ dateKey: r.dateKey, startMs: r.startMs, endMs: r.endMs })}
                          className="hover:bg-white/[0.03] transition-colors cursor-pointer"
                        >
                          <td className="px-5 py-3 font-medium text-white whitespace-nowrap">{dayLabel(r.dateKey)}</td>
                          <td className="px-3 py-3 text-right text-success font-semibold tabular-nums whitespace-nowrap">{fmt(r.totalSales)}</td>
                          <td className="px-3 py-3 text-right text-error tabular-nums whitespace-nowrap">{fmt(r.totalExpense)}</td>
                          <td className={`px-3 py-3 text-right font-bold tabular-nums whitespace-nowrap ${r.netDaily >= 0 ? 'text-success' : 'text-error'}`}>{fmt(r.netDaily)}</td>
                          <td className={`px-3 py-3 text-right font-semibold tabular-nums whitespace-nowrap ${r.eodCOH >= 0 ? 'text-white' : 'text-error'}`}>{fmt(r.eodCOH)}</td>
                          <td className="px-5 py-3 text-right text-white/50 text-xs tabular-nums whitespace-nowrap">
                            {r.transactions} {r.transactions === 1 ? 'sale' : 'sales'} · {r.itemsSold} items
                          </td>
                          <td className="pr-3 text-right"><ChevronRight className="w-4 h-4 text-white/30 inline" /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden space-y-2.5">
                {sortedRows.map((r) => (
                  <button
                    key={r.dateKey}
                    onClick={() => setOpenDay({ dateKey: r.dateKey, startMs: r.startMs, endMs: r.endMs })}
                    className="w-full text-left rounded-xl border border-white/10 bg-secondary/40 p-3 active:scale-[0.99] transition-transform"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-bold text-white text-sm">{dayLabel(r.dateKey)}</p>
                      <ChevronRight className="w-4 h-4 text-white/30" />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <p className="text-[10px] text-white/40 uppercase tracking-wider">Sales</p>
                        <p className="text-sm font-semibold text-success tabular-nums">{fmt(r.totalSales)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-white/40 uppercase tracking-wider">Expense</p>
                        <p className="text-sm font-semibold text-error tabular-nums">{fmt(r.totalExpense)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-white/40 uppercase tracking-wider">Daily</p>
                        <p className={`text-sm font-bold tabular-nums ${r.netDaily >= 0 ? 'text-success' : 'text-error'}`}>{fmt(r.netDaily)}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
                      <p className="text-[11px] text-white/40">{r.transactions} {r.transactions === 1 ? 'sale' : 'sales'} · {r.itemsSold} items</p>
                      <p className="text-[11px] text-white/50">EOD COH <span className={`font-bold tabular-nums ${r.eodCOH >= 0 ? 'text-white' : 'text-error'}`}>{fmt(r.eodCOH)}</span></p>
                    </div>
                  </button>
                ))}
              </div>

              <p className="text-[11px] text-white/40 text-center pt-1">
                {report.rows.length} {report.rows.length === 1 ? 'day' : 'days'} · tap a date to see the items sold ·
                sales = amount collected, expense = all expenses dated that day · EOD COH = running cash on hand at day&apos;s close
              </p>
            </>
          )}
        </>
      )}

      {openDay && <DailyDetailModal day={openDay} onClose={() => setOpenDay(null)} />}
    </div>
  );
}

function DailyKpi({ label, value, accent, bg, Icon }: { label: string; value: string; accent: string; bg: string; Icon: typeof Banknote }) {
  return (
    <div className="bg-gradient-to-br from-secondary/60 to-secondary/30 rounded-xl p-3 sm:p-4 border border-white/10">
      <div className="flex items-center justify-between mb-2">
        <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg ${bg} flex items-center justify-center`}>
          <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${accent}`} />
        </div>
        <span className="text-[9px] sm:text-[10px] font-medium text-white/40 uppercase tracking-wider truncate">{label}</span>
      </div>
      <p className={`text-base sm:text-xl lg:text-2xl font-bold tabular-nums truncate ${accent}`}>{value}</p>
    </div>
  );
}

function DailyDetailModal({ day, onClose }: { day: OpenDay; onClose: () => void }) {
  const detail = useQuery(api.services.finance.getDailyReportDetail, {
    startDate: day.startMs,
    endDate: day.endMs,
  });
  const loading = detail === undefined;

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998]" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 sm:inset-0 sm:flex sm:items-center sm:justify-center z-[9999]">
        <div
          className="rounded-t-3xl sm:rounded-2xl shadow-2xl sm:w-full sm:max-w-lg sm:mx-4 max-h-[88vh] overflow-y-auto"
          style={{ background: 'var(--secondary)', border: '1px solid var(--line)' }}
        >
          {/* Header */}
          <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b border-white/10 bg-secondary/95 backdrop-blur-sm">
            <div className="min-w-0">
              <p className="text-[11px] text-white/50 uppercase tracking-wider">Daily Report</p>
              <h3 className="text-base sm:text-lg font-bold text-white truncate">{dayLabel(day.dateKey)}</h3>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 flex-shrink-0">
              <X className="w-5 h-5 text-white/70" />
            </button>
          </div>

          {loading ? (
            <div className="text-center py-16">
              <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-white/60">Loading items sold...</p>
            </div>
          ) : detail && (
            <div className="p-5 space-y-5">
              {/* Totals */}
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-lg bg-success/10 border border-success/20 p-2.5">
                  <p className="text-[10px] text-white/50 uppercase tracking-wider">Sales</p>
                  <p className="text-sm font-bold text-success tabular-nums">{fmt(detail.totals.totalSales)}</p>
                </div>
                <div className="rounded-lg bg-error/10 border border-error/20 p-2.5">
                  <p className="text-[10px] text-white/50 uppercase tracking-wider">Expense</p>
                  <p className="text-sm font-bold text-error tabular-nums">{fmt(detail.totals.totalExpense)}</p>
                </div>
                <div className={`rounded-lg border p-2.5 ${detail.totals.netDaily >= 0 ? 'bg-success/10 border-success/20' : 'bg-error/10 border-error/20'}`}>
                  <p className="text-[10px] text-white/50 uppercase tracking-wider">Daily</p>
                  <p className={`text-sm font-bold tabular-nums ${detail.totals.netDaily >= 0 ? 'text-success' : 'text-error'}`}>{fmt(detail.totals.netDaily)}</p>
                </div>
              </div>

              {/* Items sold */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Package className="w-4 h-4 text-primary" />
                  <h4 className="text-sm font-semibold text-white">Items Sold</h4>
                  <span className="text-xs text-white/40">· {detail.totals.unitsSold} units · profit {fmt(detail.totals.grossProfit)}</span>
                </div>
                {detail.items.length === 0 ? (
                  <p className="text-xs text-white/50 py-3 text-center">No items sold this day.</p>
                ) : (
                  <div className="rounded-xl border border-white/10 overflow-hidden divide-y divide-white/5">
                    {detail.items.map((it) => (
                      <div key={it.id} className="flex items-center gap-3 p-2.5 bg-secondary/30">
                        <div className="w-9 h-9 rounded-lg overflow-hidden bg-secondary border border-white/10 flex items-center justify-center flex-shrink-0">
                          {it.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={it.image} alt={it.name} className="w-full h-full object-cover" />
                          ) : (
                            <Package className="w-4 h-4 text-white/30" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-white truncate">{it.name}</p>
                          <p className="text-[11px] text-white/40 truncate">{it.category} · {it.unitsSold} sold</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-semibold text-white tabular-nums">{fmt(it.revenue)}</p>
                          <p className={`text-[11px] tabular-nums ${it.grossProfit >= 0 ? 'text-success' : 'text-error'}`}>{fmt(it.grossProfit)} profit</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Expenses */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Receipt className="w-4 h-4 text-error" />
                  <h4 className="text-sm font-semibold text-white">Expenses</h4>
                </div>
                {detail.expenses.length === 0 ? (
                  <p className="text-xs text-white/50 py-3 text-center">No expenses recorded this day.</p>
                ) : (
                  <div className="rounded-xl border border-white/10 overflow-hidden divide-y divide-white/5">
                    {detail.expenses.map((e) => (
                      <div key={e.id} className="flex items-center gap-3 p-2.5 bg-secondary/30">
                        <span className="text-lg flex-shrink-0">{e.category ? (categoryIcons[e.category] || 'ðŸ“') : (e.type === 'restocking' ? 'ðŸ“¦' : 'ðŸ“')}</span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-white truncate">{e.description}</p>
                          <p className="text-[11px] text-white/40 truncate capitalize">{e.type} · {e.paymentMethod.replace('_', ' ')}</p>
                        </div>
                        <p className="text-sm font-semibold text-error tabular-nums flex-shrink-0">{fmt(e.amount)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ CASH FLOW (INVESTOR / REMITTANCE) TAB â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

function CashFlowTab({ startDate, endDate }: { startDate?: number; endDate?: number }) {
  const tzOffsetMinutes = new Date().getTimezoneOffset();
  const report = useQuery(api.services.cashAdjustments.getCashAdjustmentReport, {
    tzOffsetMinutes,
    startDate,
    endDate,
  });
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('asc');
  const [openDay, setOpenDay] = useState<OpenDay | null>(null);

  const loading = report === undefined;
  const sortedRows = report
    ? sortDir === 'desc'
      ? report.rows
      : [...report.rows].sort((a, b) => a.startMs - b.startMs)
    : [];

  return (
    <div className="px-4 sm:px-6 py-4 sm:py-6 max-w-7xl mx-auto space-y-5">
      {loading ? (
        <div className="text-center py-20">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-white/60">Building cash flow report...</p>
        </div>
      ) : (
        <>
          {/* Period summary */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <DailyKpi label="Investor In" value={fmt(report.summary.investorIn)} accent="text-success" bg="bg-success/10" Icon={ArrowUpRight} />
            <DailyKpi label="Remittance Out" value={fmt(report.summary.remittanceOut)} accent="text-error" bg="bg-error/10" Icon={ArrowDownRight} />
            <DailyKpi
              label="Net Cash Moved"
              value={fmt(report.summary.net)}
              accent={report.summary.net >= 0 ? 'text-success' : 'text-error'}
              bg={report.summary.net >= 0 ? 'bg-success/10' : 'bg-error/10'}
              Icon={report.summary.net >= 0 ? TrendingUp : TrendingDown}
            />
          </div>

          {/* Sort order */}
          {report.rows.length > 0 && (
            <div className="flex items-center justify-end gap-2">
              <span className="text-[11px] text-white/40 uppercase tracking-wider">Order by date</span>
              <div className="inline-flex p-[3px] rounded-lg border border-white/10 bg-secondary/40">
                {([
                  { id: 'desc', label: 'Newest first' },
                  { id: 'asc', label: 'Oldest first' },
                ] as const).map((o) => (
                  <button
                    key={o.id}
                    onClick={() => setSortDir(o.id)}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                      sortDir === o.id ? 'bg-primary text-white' : 'text-white/60 hover:text-white'
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {report.rows.length === 0 ? (
            <div className="text-center py-16 rounded-2xl border border-white/10 bg-secondary/30">
              <Wallet className="w-12 h-12 text-white/20 mx-auto mb-3" />
              <h3 className="text-base font-bold text-white mb-1">No cash movements</h3>
              <p className="text-xs text-white/60">No investor injections or remittances fall in this period.</p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block">
                <div className="bg-secondary/30 border border-white/10 rounded-xl overflow-hidden shadow-xl">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10 bg-secondary/60 text-[10px] font-semibold text-white/40 uppercase tracking-wider">
                        <th className="text-left px-5 py-3">Date</th>
                        <th className="text-right px-3 py-3">Investor In</th>
                        <th className="text-right px-3 py-3">Remittance Out</th>
                        <th className="text-right px-3 py-3">Net</th>
                        <th className="text-right px-5 py-3">Entries</th>
                        <th className="w-8" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {sortedRows.map((r) => (
                        <tr
                          key={r.dateKey}
                          onClick={() => setOpenDay({ dateKey: r.dateKey, startMs: r.startMs, endMs: r.endMs })}
                          className="hover:bg-white/[0.03] transition-colors cursor-pointer"
                        >
                          <td className="px-5 py-3 font-medium text-white whitespace-nowrap">{dayLabel(r.dateKey)}</td>
                          <td className="px-3 py-3 text-right text-success font-semibold tabular-nums whitespace-nowrap">{r.investorIn > 0 ? fmt(r.investorIn) : '—'}</td>
                          <td className="px-3 py-3 text-right text-error tabular-nums whitespace-nowrap">{r.remittanceOut > 0 ? fmt(r.remittanceOut) : '—'}</td>
                          <td className={`px-3 py-3 text-right font-bold tabular-nums whitespace-nowrap ${r.net >= 0 ? 'text-success' : 'text-error'}`}>{fmt(r.net)}</td>
                          <td className="px-5 py-3 text-right text-white/50 text-xs tabular-nums whitespace-nowrap">{r.count} {r.count === 1 ? 'entry' : 'entries'}</td>
                          <td className="pr-3 text-right"><ChevronRight className="w-4 h-4 text-white/30 inline" /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden space-y-2.5">
                {sortedRows.map((r) => (
                  <button
                    key={r.dateKey}
                    onClick={() => setOpenDay({ dateKey: r.dateKey, startMs: r.startMs, endMs: r.endMs })}
                    className="w-full text-left rounded-xl border border-white/10 bg-secondary/40 p-3 active:scale-[0.99] transition-transform"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-bold text-white text-sm">{dayLabel(r.dateKey)}</p>
                      <ChevronRight className="w-4 h-4 text-white/30" />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <p className="text-[10px] text-white/40 uppercase tracking-wider">Investor In</p>
                        <p className="text-sm font-semibold text-success tabular-nums">{r.investorIn > 0 ? fmt(r.investorIn) : '—'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-white/40 uppercase tracking-wider">Remit Out</p>
                        <p className="text-sm font-semibold text-error tabular-nums">{r.remittanceOut > 0 ? fmt(r.remittanceOut) : '—'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-white/40 uppercase tracking-wider">Net</p>
                        <p className={`text-sm font-bold tabular-nums ${r.net >= 0 ? 'text-success' : 'text-error'}`}>{fmt(r.net)}</p>
                      </div>
                    </div>
                    <p className="text-[11px] text-white/40 mt-2">{r.count} {r.count === 1 ? 'entry' : 'entries'}</p>
                  </button>
                ))}
              </div>

              <p className="text-[11px] text-white/40 text-center pt-1">
                {report.rows.length} {report.rows.length === 1 ? 'day' : 'days'} · tap a date to see each injection / remittance ·
                investor in = capital added, remittance out = released to partners
              </p>
            </>
          )}
        </>
      )}

      {openDay && <CashDayModal day={openDay} onClose={() => setOpenDay(null)} />}
    </div>
  );
}

function CashDayModal({ day, onClose }: { day: OpenDay; onClose: () => void }) {
  const entries = useQuery(api.services.cashAdjustments.getCashAdjustments, {
    startDate: day.startMs,
    endDate: day.endMs,
    limit: 200,
  });
  const loading = entries === undefined;

  const meta: Record<string, { label: string; cls: string; sign: string }> = {
    injection: { label: 'Investor In', cls: 'text-success', sign: '+' },
    withdrawal: { label: 'Remittance', cls: 'text-error', sign: '' },
    correction: { label: 'Correction', cls: 'text-warning', sign: '' },
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998]" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 sm:inset-0 sm:flex sm:items-center sm:justify-center z-[9999]">
        <div
          className="rounded-t-3xl sm:rounded-2xl shadow-2xl sm:w-full sm:max-w-lg sm:mx-4 max-h-[88vh] overflow-y-auto"
          style={{ background: 'var(--secondary)', border: '1px solid var(--line)' }}
        >
          <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b border-white/10 bg-secondary/95 backdrop-blur-sm">
            <div className="min-w-0">
              <p className="text-[11px] text-white/50 uppercase tracking-wider">Cash Flow</p>
              <h3 className="text-base sm:text-lg font-bold text-white truncate">{dayLabel(day.dateKey)}</h3>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 flex-shrink-0">
              <X className="w-5 h-5 text-white/70" />
            </button>
          </div>

          {loading ? (
            <div className="text-center py-16">
              <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-white/60">Loading entries...</p>
            </div>
          ) : (
            <div className="p-5">
              {!entries || entries.length === 0 ? (
                <p className="text-xs text-white/50 py-8 text-center">No cash adjustments recorded this day.</p>
              ) : (
                <div className="rounded-xl border border-white/10 overflow-hidden divide-y divide-white/5">
                  {entries.map((e) => {
                    const m = meta[e.type] || meta.correction;
                    return (
                      <div key={e._id} className="flex items-start gap-3 p-3 bg-secondary/30">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${m.cls}`}>{m.label}</span>
                          </div>
                          <p className="text-sm font-medium text-white truncate mt-0.5">{e.reason}</p>
                          {e.notes && <p className="text-[11px] text-white/40 truncate">{e.notes}</p>}
                        </div>
                        <p className={`text-sm font-bold tabular-nums flex-shrink-0 ${m.cls}`}>
                          {m.sign}{fmt(Math.abs(e.amount))}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/* ───────────────────────── STOCK FLOW TAB ───────────────────────── */

function StockFlowTab({ startDate, endDate }: { startDate?: number; endDate?: number }) {
  const tzOffsetMinutes = new Date().getTimezoneOffset();
  const report = useQuery(api.services.finance.getStockFlowReport, {
    tzOffsetMinutes,
    startDate,
    endDate,
  });
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('asc');
  const [openDay, setOpenDay] = useState<OpenDay | null>(null);

  const loading = report === undefined;
  const sortedRows = report
    ? sortDir === 'desc'
      ? report.rows
      : [...report.rows].sort((a, b) => a.startMs - b.startMs)
    : [];

  return (
    <div className="px-4 sm:px-6 py-4 sm:py-6 max-w-7xl mx-auto space-y-5">
      {loading ? (
        <div className="text-center py-20">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-white/60">Building stock flow report...</p>
        </div>
      ) : (
        <>
          {/* Period summary */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <DailyKpi label="Via COH" value={fmt(report.summary.viaCOH)} accent="text-warning" bg="bg-warning/10" Icon={Wallet} />
            <DailyKpi label="Via Investment" value={fmt(report.summary.viaInvestment)} accent="text-info" bg="bg-info/10" Icon={Building2} />
            <DailyKpi label="Total Stocked" value={fmt(report.summary.total)} accent="text-primary" bg="bg-primary/10" Icon={Package} />
          </div>

          <p className="text-[11px] text-white/40 text-center -mt-1">
            Declared via the Restock / Reroll expense. COH-funded reduces Cash on Hand; investment-funded is declaration-only.
          </p>

          {/* Sort order */}
          {report.rows.length > 0 && (
            <div className="flex items-center justify-end gap-2">
              <span className="text-[11px] text-white/40 uppercase tracking-wider">Order by date</span>
              <div className="inline-flex p-[3px] rounded-lg border border-white/10 bg-secondary/40">
                {([
                  { id: 'desc', label: 'Newest first' },
                  { id: 'asc', label: 'Oldest first' },
                ] as const).map((o) => (
                  <button
                    key={o.id}
                    onClick={() => setSortDir(o.id)}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                      sortDir === o.id ? 'bg-primary text-white' : 'text-white/60 hover:text-white'
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {report.rows.length === 0 ? (
            <div className="text-center py-16 rounded-2xl border border-white/10 bg-secondary/30">
              <Package className="w-12 h-12 text-white/20 mx-auto mb-3" />
              <h3 className="text-base font-bold text-white mb-1">No stock declared</h3>
              <p className="text-xs text-white/60">Restock / Reroll expenses (Till or Investment) will appear here.</p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block">
                <div className="bg-secondary/30 border border-white/10 rounded-xl overflow-hidden shadow-xl">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10 bg-secondary/60 text-[10px] font-semibold text-white/40 uppercase tracking-wider">
                        <th className="text-left px-5 py-3">Date</th>
                        <th className="text-right px-3 py-3">Via COH</th>
                        <th className="text-right px-3 py-3">Via Investment</th>
                        <th className="text-right px-3 py-3">Total</th>
                        <th className="text-right px-5 py-3">Entries</th>
                        <th className="w-8" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {sortedRows.map((r) => (
                        <tr
                          key={r.dateKey}
                          onClick={() => setOpenDay({ dateKey: r.dateKey, startMs: r.startMs, endMs: r.endMs })}
                          className="hover:bg-white/[0.03] transition-colors cursor-pointer"
                        >
                          <td className="px-5 py-3 font-medium text-white whitespace-nowrap">{dayLabel(r.dateKey)}</td>
                          <td className="px-3 py-3 text-right text-warning tabular-nums whitespace-nowrap">{r.viaCOH > 0 ? fmt(r.viaCOH) : '—'}</td>
                          <td className="px-3 py-3 text-right text-info tabular-nums whitespace-nowrap">{r.viaInvestment > 0 ? fmt(r.viaInvestment) : '—'}</td>
                          <td className="px-3 py-3 text-right text-white font-bold tabular-nums whitespace-nowrap">{r.total > 0 ? fmt(r.total) : '—'}</td>
                          <td className="px-5 py-3 text-right text-white/50 text-xs tabular-nums whitespace-nowrap">{r.count} {r.count === 1 ? 'entry' : 'entries'}</td>
                          <td className="pr-3 text-right"><ChevronRight className="w-4 h-4 text-white/30 inline" /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden space-y-2.5">
                {sortedRows.map((r) => (
                  <button
                    key={r.dateKey}
                    onClick={() => setOpenDay({ dateKey: r.dateKey, startMs: r.startMs, endMs: r.endMs })}
                    className="w-full text-left rounded-xl border border-white/10 bg-secondary/40 p-3 active:scale-[0.99] transition-transform"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-bold text-white text-sm">{dayLabel(r.dateKey)}</p>
                      <ChevronRight className="w-4 h-4 text-white/30" />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <p className="text-[10px] text-white/40 uppercase tracking-wider">COH</p>
                        <p className="text-sm font-semibold text-warning tabular-nums">{r.viaCOH > 0 ? fmt(r.viaCOH) : '—'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-white/40 uppercase tracking-wider">Investment</p>
                        <p className="text-sm font-semibold text-info tabular-nums">{r.viaInvestment > 0 ? fmt(r.viaInvestment) : '—'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-white/40 uppercase tracking-wider">Total</p>
                        <p className="text-sm font-bold text-white tabular-nums">{r.total > 0 ? fmt(r.total) : '—'}</p>
                      </div>
                    </div>
                    <p className="text-[11px] text-white/40 mt-2">{r.count} {r.count === 1 ? 'entry' : 'entries'}</p>
                  </button>
                ))}
              </div>

              <p className="text-[11px] text-white/40 text-center pt-1">
                {report.rows.length} {report.rows.length === 1 ? 'day' : 'days'} · tap a date to see each declaration
              </p>
            </>
          )}
        </>
      )}

      {openDay && <StockDayModal day={openDay} onClose={() => setOpenDay(null)} />}
    </div>
  );
}

function StockDayModal({ day, onClose }: { day: OpenDay; onClose: () => void }) {
  const detail = useQuery(api.services.finance.getStockFlowDetail, {
    startDate: day.startMs,
    endDate: day.endMs,
  });
  const loading = detail === undefined;

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998]" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 sm:inset-0 sm:flex sm:items-center sm:justify-center z-[9999]">
        <div
          className="rounded-t-3xl sm:rounded-2xl shadow-2xl sm:w-full sm:max-w-lg sm:mx-4 max-h-[88vh] overflow-y-auto"
          style={{ background: 'var(--secondary)', border: '1px solid var(--line)' }}
        >
          <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b border-white/10 bg-secondary/95 backdrop-blur-sm">
            <div className="min-w-0">
              <p className="text-[11px] text-white/50 uppercase tracking-wider">Stock Flow</p>
              <h3 className="text-base sm:text-lg font-bold text-white truncate">{dayLabel(day.dateKey)}</h3>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 flex-shrink-0">
              <X className="w-5 h-5 text-white/70" />
            </button>
          </div>

          {loading ? (
            <div className="text-center py-16">
              <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-white/60">Loading declarations...</p>
            </div>
          ) : detail && (
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-lg bg-warning/10 border border-warning/20 p-2.5">
                  <p className="text-[10px] text-white/50 uppercase tracking-wider">Via COH</p>
                  <p className="text-sm font-bold text-warning tabular-nums">{fmt(detail.totals.viaCOH)}</p>
                </div>
                <div className="rounded-lg bg-info/10 border border-info/20 p-2.5">
                  <p className="text-[10px] text-white/50 uppercase tracking-wider">Via Investment</p>
                  <p className="text-sm font-bold text-info tabular-nums">{fmt(detail.totals.viaInvestment)}</p>
                </div>
                <div className="rounded-lg bg-primary/10 border border-primary/20 p-2.5">
                  <p className="text-[10px] text-white/50 uppercase tracking-wider">Total</p>
                  <p className="text-sm font-bold text-primary tabular-nums">{fmt(detail.totals.total)}</p>
                </div>
              </div>

              {detail.items.length === 0 ? (
                <p className="text-xs text-white/50 py-8 text-center">No declarations this day.</p>
              ) : (
                <div className="rounded-xl border border-white/10 overflow-hidden divide-y divide-white/5">
                  {detail.items.map((it) => (
                    <div key={it.id} className="flex items-center gap-3 p-2.5 bg-secondary/30">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${it.source === 'coh' ? 'bg-warning/10' : 'bg-info/10'}`}>
                        <Package className={`w-4 h-4 ${it.source === 'coh' ? 'text-warning' : 'text-info'}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-white truncate">{it.productName}</p>
                        <p className="text-[11px] text-white/40 truncate">
                          {it.quantity} × {fmt(it.unitCost)}
                          {it.supplier ? <span className="text-white/60"> · {it.supplier}</span> : null}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-semibold text-white tabular-nums">{fmt(it.amount)}</p>
                        <span className={`text-[10px] font-semibold uppercase ${it.source === 'coh' ? 'text-warning' : 'text-info'}`}>
                          {it.source === 'coh' ? 'Till' : 'Investment'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default function FinancePage() {
  return (
    <SafeAreaProvider applySafeArea={false}>
      <FinanceContent />
    </SafeAreaProvider>
  );
}
