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

type ExpenseCategory = 'travel' | 'food' | 'supplies' | 'utilities' | 'rent' | 'salary' | 'maintenance' | 'marketing' | 'investor_remit' | 'mortality' | 'other';
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
  investor_remit: '💼',
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
  investor_remit: 'investor remit',
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

  // Date range filter (YYYY-MM-DD strings; converted to timestamps below).
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

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
          })} → ${new Date(dateTo + 'T12:00:00').toLocaleDateString('en-PH', {
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
      await deleteCashAdjustment({ id: id as Id<'cashAdjustments'> });
      setAdjConfirmDelete(null);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to delete');
    }
  };

  const handleDeleteExpense = async (id: string) => {
    try {
      await deleteExpense({ id: id as Id<"expenses"> });
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
            <span className="text-xs" style={{ color: 'var(--ink-4)' }}>→</span>
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

      {isLoading ? (
        <div className="text-center py-20">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-white/60">Loading finance data...</p>
        </div>
      ) : summary && (
        <div className="px-4 sm:px-6 py-4 sm:py-6 max-w-7xl mx-auto space-y-6">

          {/* KPI strip — six headline cards */}
          {(() => {
            const investment = summary.cashInjections ?? 0;
            const remittance = summary.operationalByCategory?.investor_remit ?? 0;
            const irNet = investment - remittance;
            const irBalanced = investment === 0 && remittance === 0;
            return (
              <div
                className="grid gap-3"
                style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}
              >
                {/* 1 · Cash on Hand */}
                <div
                  className="rounded-2xl border p-5 relative overflow-hidden"
                  style={{
                    background:
                      'linear-gradient(135deg, color-mix(in oklch, var(--jade) 18%, transparent), color-mix(in oklch, var(--jade) 4%, transparent))',
                    borderColor: 'color-mix(in oklch, var(--jade) 30%, transparent)',
                  }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Wallet className="w-4 h-4" style={{ color: 'var(--jade)' }} />
                      <p
                        className="text-[10px] font-semibold uppercase tracking-wider"
                        style={{ color: 'color-mix(in oklch, var(--jade) 80%, transparent)' }}
                      >
                        {isFiltered ? 'Cash flow · this period' : 'Cash on Hand'}
                      </p>
                    </div>
                    <span
                      className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                      style={{
                        background:
                          summary.cashOnHand >= 0
                            ? 'color-mix(in oklch, var(--jade) 20%, transparent)'
                            : 'color-mix(in oklch, var(--red) 20%, transparent)',
                        color: summary.cashOnHand >= 0 ? 'var(--jade)' : 'var(--red-hi)',
                      }}
                    >
                      {summary.cashOnHand >= 0 ? 'Positive' : 'Negative'}
                    </span>
                  </div>
                  <p className="text-[28px] font-bold dc-mono leading-tight">{fmt(summary.cashOnHand)}</p>
                  {isFiltered && summaryAllTime && (
                    <p className="text-[11px] mt-1.5" style={{ color: 'var(--ink-3)' }}>
                      <span style={{ color: 'var(--ink-4)' }}>Right now: </span>
                      <span className="font-semibold dc-mono">{fmt(summaryAllTime.cashOnHand)}</span>
                    </p>
                  )}
                  <div className="mt-3 pt-2.5 border-t flex flex-wrap gap-x-3 gap-y-1 text-[11px]" style={{ borderColor: 'var(--line-soft)' }}>
                    <span style={{ color: 'var(--ink-4)' }}>
                      Open <span className="font-semibold dc-mono" style={{ color: 'var(--ink-2)' }}>{fmt(summary.openingBalance)}</span>
                    </span>
                    <span style={{ color: 'var(--jade)' }}>
                      +{fmt(summary.cashRevenue)}
                    </span>
                    <span style={{ color: 'var(--red-hi)' }}>
                      −{fmt(summary.cashExpenses)}
                    </span>
                    {(summary.cashInjections ?? 0) > 0 && (
                      <span style={{ color: 'var(--jade)' }}>+{fmt(summary.cashInjections ?? 0)}</span>
                    )}
                    {(summary.cashWithdrawals ?? 0) > 0 && (
                      <span style={{ color: 'var(--red-hi)' }}>−{fmt(summary.cashWithdrawals ?? 0)}</span>
                    )}
                  </div>
                </div>

                {/* 2 · Gross Profit */}
                <div
                  className="rounded-2xl border p-5"
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
                        style={{ color: 'color-mix(in oklch, var(--jade) 80%, transparent)' }}
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
                  <p className="text-[28px] font-bold dc-mono leading-tight">{fmt(summary.grossProfit)}</p>
                  <p className="text-[11px] mt-1.5" style={{ color: 'var(--ink-3)' }}>
                    Revenue {fmt(summary.totalRevenue)} − COGS {fmt(summary.cogs)}
                  </p>
                </div>

                {/* 3 · Net Profit */}
                <div
                  className="rounded-2xl border p-5"
                  style={{
                    background:
                      summary.netProfit >= 0
                        ? 'linear-gradient(135deg, color-mix(in oklch, var(--red) 16%, transparent), color-mix(in oklch, var(--red) 4%, transparent))'
                        : 'linear-gradient(135deg, color-mix(in oklch, var(--red) 22%, transparent), color-mix(in oklch, var(--red) 8%, transparent))',
                    borderColor:
                      summary.netProfit >= 0
                        ? 'color-mix(in oklch, var(--red) 28%, transparent)'
                        : 'color-mix(in oklch, var(--red) 40%, transparent)',
                  }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {summary.netProfit >= 0 ? (
                        <TrendingUp className="w-4 h-4" style={{ color: 'var(--red-hi)' }} />
                      ) : (
                        <TrendingDown className="w-4 h-4" style={{ color: 'var(--red-hi)' }} />
                      )}
                      <p
                        className="text-[10px] font-semibold uppercase tracking-wider"
                        style={{ color: 'color-mix(in oklch, var(--red-hi) 90%, transparent)' }}
                      >
                        {isFiltered ? 'Net profit · this period' : 'Net Profit'}
                      </p>
                    </div>
                    <span
                      className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                      style={{
                        background: 'color-mix(in oklch, var(--red) 20%, transparent)',
                        color: 'var(--red-hi)',
                      }}
                    >
                      {summary.netMargin}% margin
                    </span>
                  </div>
                  <p className="text-[28px] font-bold dc-mono leading-tight">{fmt(summary.netProfit)}</p>
                  {isFiltered && summaryAllTime && (
                    <p className="text-[11px] mt-1.5" style={{ color: 'var(--ink-3)' }}>
                      <span style={{ color: 'var(--ink-4)' }}>Right now: </span>
                      <span className="font-semibold dc-mono">{fmt(summaryAllTime.netProfit)}</span>
                      <span style={{ color: 'var(--ink-4)' }}> · {summaryAllTime.netMargin}%</span>
                    </p>
                  )}
                  <p className="text-[11px] mt-1.5" style={{ color: 'var(--ink-3)' }}>
                    Gross {fmt(summary.grossProfit)} − OpEx {fmt(summary.totalOperationalExpense)}
                  </p>
                </div>

                {/* 4 · Restock Expense */}
                <div
                  className="rounded-2xl border p-5"
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
                      {summary.restockingCount}
                    </span>
                  </div>
                  <p className="text-[28px] font-bold dc-mono leading-tight">{fmt(summary.totalRestockingExpense)}</p>
                  <p className="text-[11px] mt-1.5" style={{ color: 'var(--ink-3)' }}>
                    Paid for incoming batches{isFiltered ? ' · this period' : ' (lifetime)'}
                  </p>
                </div>

                {/* 5 · Operational Expense */}
                <div
                  className="rounded-2xl border p-5"
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
                  <p className="text-[28px] font-bold dc-mono leading-tight">{fmt(summary.totalOperationalExpense)}</p>
                  <p className="text-[11px] mt-1.5" style={{ color: 'var(--ink-3)' }}>
                    Rent, utilities, salary, marketing, etc.
                  </p>
                </div>

                {/* 6 · Investment vs Remittance */}
                <div
                  className="rounded-2xl border p-5"
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
                        Net {irNet >= 0 ? '+' : '−'}
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
                        −{fmt(remittance)}
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
                        {positive ? '+' : '−'}
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
                  {(summary.cashAdjustmentsTotal ?? 0) >= 0 ? '+' : '−'}
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
                  <span className="text-white/70">Cost of Goods Sold</span>
                  <span className="text-error font-semibold">−{fmt(summary.cogs)}</span>
                </div>

                {(summary.totalDiscountsGiven || 0) > 0 && (
                  <>
                    <div className="flex justify-between items-baseline text-sm pt-1">
                      <span className="text-white/70">Discounts Given</span>
                      <span className="text-warning font-medium">−{fmt(summary.totalDiscountsGiven)}</span>
                    </div>
                    {(summary.totalLineDiscounts || 0) > 0 && (
                      <div className="flex justify-between items-baseline text-xs">
                        <span className="text-white/50 pl-3">Line-item</span>
                        <span className="text-white/70">−{fmt(summary.totalLineDiscounts)}</span>
                      </div>
                    )}
                    {(summary.totalOrderDiscounts || 0) > 0 && (
                      <div className="flex justify-between items-baseline text-xs">
                        <span className="text-white/50 pl-3">Order-level</span>
                        <span className="text-white/70">−{fmt(summary.totalOrderDiscounts)}</span>
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
                  <span className="text-error font-semibold">−{fmt(summary.totalOperationalExpense)}</span>
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
              <p className="text-2xl font-bold text-white">{fmt(summary.totalRestockingExpense)}</p>
              <p className="text-[10px] text-white/40 mt-1">{summary.restockingCount} records</p>
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
                      <span>{categoryIcons[cat] || '📝'}</span>
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
                              {e.type === 'restocking' ? '📦 Restock' : `${categoryIcons[e.category || 'other']} ${categoryLabels[e.category || 'other'] || e.category || 'other'}`}
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
                              {e.type === 'restocking' ? '📦 Restock' : `${categoryIcons[e.category || 'other']} ${categoryLabels[e.category || 'other'] || e.category || 'other'}`}
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
                      <span>⚠</span>
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
                    placeholder={adjType === 'correction' ? '+ or − number' : '0.00'}
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
                      placeholder="••••••••"
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
              <p className="text-xs text-white/50 mb-5">Track travel, food, supplies, utilities, etc.</p>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-white/60 mb-1.5">Category</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['travel', 'food', 'supplies', 'utilities', 'rent', 'salary', 'maintenance', 'marketing', 'investor_remit', 'other'] as ExpenseCategory[]).map((cat) => (
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

export default function FinancePage() {
  return (
    <SafeAreaProvider applySafeArea={false}>
      <FinanceContent />
    </SafeAreaProvider>
  );
}
