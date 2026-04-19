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

type ExpenseCategory = 'travel' | 'food' | 'supplies' | 'utilities' | 'rent' | 'salary' | 'maintenance' | 'marketing' | 'other';
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
  other: '📝',
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

  const summary = useQuery(api.services.finance.getFinancialSummary, {});
  const expenses = useQuery(api.services.finance.getExpenses, { limit: 100 });
  const createExpense = useMutation(api.services.finance.createExpense);
  const deleteExpense = useMutation(api.services.finance.deleteExpense);

  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [expenseFilter, setExpenseFilter] = useState<'all' | 'restocking' | 'operational'>('all');

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
                <p className="text-xs text-white/50 hidden sm:block">P&L, cash flow & expenses</p>
              </div>
            </div>
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

      {isLoading ? (
        <div className="text-center py-20">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-white/60">Loading finance data...</p>
        </div>
      ) : summary && (
        <div className="px-4 sm:px-6 py-4 sm:py-6 max-w-7xl mx-auto space-y-6">

          {/* Hero Cards — Cash on Hand + Net Profit */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Cash on Hand */}
            <div className="bg-gradient-to-br from-success/20 to-success/5 rounded-2xl p-5 border border-success/30 relative overflow-hidden">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Wallet className="w-4 h-4 text-success" />
                    <p className="text-[11px] font-semibold text-success/80 uppercase tracking-wider">Cash on Hand</p>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                  summary.cashOnHand >= 0 ? 'bg-success/20 text-success' : 'bg-error/20 text-error'
                }`}>
                  {summary.cashOnHand >= 0 ? 'Positive' : 'Negative'}
                </span>
              </div>
              <p className="text-4xl font-bold text-white mb-2">{fmt(summary.cashOnHand)}</p>
              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-white/10 text-xs">
                <div>
                  <p className="text-white/40">Opening</p>
                  <p className="text-white font-medium">{fmt(summary.openingBalance)}</p>
                </div>
                <div>
                  <p className="text-success/70">+ Cash in</p>
                  <p className="text-success font-medium">{fmt(summary.cashRevenue)}</p>
                </div>
                <div>
                  <p className="text-error/70">− Cash out</p>
                  <p className="text-error font-medium">{fmt(summary.cashExpenses)}</p>
                </div>
              </div>
            </div>

            {/* Net Profit */}
            <div className={`bg-gradient-to-br rounded-2xl p-5 border relative overflow-hidden ${
              summary.netProfit >= 0
                ? 'from-primary/20 to-primary/5 border-primary/30'
                : 'from-error/20 to-error/5 border-error/30'
            }`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {summary.netProfit >= 0 ? (
                      <TrendingUp className="w-4 h-4 text-primary" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-error" />
                    )}
                    <p className={`text-[11px] font-semibold uppercase tracking-wider ${
                      summary.netProfit >= 0 ? 'text-primary/80' : 'text-error/80'
                    }`}>Net Profit</p>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                  summary.netProfit >= 0 ? 'bg-primary/20 text-primary' : 'bg-error/20 text-error'
                }`}>
                  {summary.netMargin}% margin
                </span>
              </div>
              <p className="text-4xl font-bold text-white mb-2">{fmt(summary.netProfit)}</p>
              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-white/10 text-xs">
                <div>
                  <p className="text-white/40">Revenue</p>
                  <p className="text-white font-medium">{fmt(summary.totalRevenue)}</p>
                </div>
                <div>
                  <p className="text-white/40">COGS</p>
                  <p className="text-white font-medium">{fmt(summary.cogs)}</p>
                </div>
                <div>
                  <p className="text-white/40">OpEx</p>
                  <p className="text-white font-medium">{fmt(summary.totalOperationalExpense)}</p>
                </div>
              </div>
            </div>
          </div>

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
                      <span>{cat}</span>
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
                              {e.type === 'restocking' ? '📦 Restock' : `${categoryIcons[e.category || 'other']} ${e.category || 'other'}`}
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
                              {e.type === 'restocking' ? '📦 Restock' : `${categoryIcons[e.category || 'other']} ${e.category || 'other'}`}
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
                    {(['travel', 'food', 'supplies', 'utilities', 'rent', 'salary', 'maintenance', 'marketing', 'other'] as ExpenseCategory[]).map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setFormCategory(cat)}
                        className={`px-2 py-2 rounded-lg text-xs font-medium border transition-all capitalize ${
                          formCategory === cat
                            ? 'bg-primary border-primary text-white'
                            : 'bg-background/60 border-white/10 text-white/70'
                        }`}
                      >
                        {categoryIcons[cat]} {cat}
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
