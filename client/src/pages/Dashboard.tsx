import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DollarSign, ShoppingBag, AlertTriangle, TrendingUp, PackageCheck, Globe,
  Receipt, Wallet, Sparkles, Megaphone, CheckCircle2, ChevronRight, Target, RefreshCw, Clock, Pencil
} from 'lucide-react';
import { ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar } from 'recharts';
import { fetchExpenses, computeTodayExpenses } from '../services/expenseService';
import { fetchOrders, computeTodayMetricsFromOrders } from '../services/orderService';
import { apiFetch } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Ingredient, Order, StoreSettings } from '../types';
import { StatCard } from '../components/ui/StatCard';
import { ZReportModal } from '../components/pos/ZReportModal';
import { XReportModal } from '../components/pos/XReportModal';
import { PettyCashModal } from '../components/finance/PettyCashModal';
import { PromotionManagerModal } from '../components/promotions/PromotionManagerModal';
import { BroadcastModal } from '../components/ui/BroadcastModal';
import { BroadcastBanner } from '../components/ui/BroadcastBanner';

interface ShiftDTO {
  id: string;
  cashierName: string;
  status: 'OPEN' | 'CLOSED';
  startingFloat: number;
  cashIn: number;
  cashOut: number;
  openedAt: string;
}

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, hasGranularPermission } = useAuth();
  const { t } = useLanguage();

  const [showZReport, setShowZReport] = useState(false);
  const [showXReport, setShowXReport] = useState(false);
  const [showPettyCash, setShowPettyCash] = useState(false);
  const [showPromoManager, setShowPromoManager] = useState(false);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);

  const [orders, setOrders] = useState<Order[]>([]);
  const [pettyExpenses, setPettyExpenses] = useState(0);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [currentShift, setCurrentShift] = useState<ShiftDTO | null>(null);
  const [khrRate, setKhrRate] = useState(4100);
  const [loading, setLoading] = useState(true);

  const [dailyTarget, setDailyTarget] = useState<number>(() => {
    try {
      const saved = Number(localStorage.getItem('coffee_pos_daily_target'));
      return saved > 0 ? saved : 1500;
    } catch {
      return 1500;
    }
  });
  const [editingTarget, setEditingTarget] = useState(false);
  const [targetInput, setTargetInput] = useState(String(dailyTarget));

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const [ordersList, expensesList, shiftRes, settingsRes, invRes] = await Promise.all([
        fetchOrders({ limit: 500 }).catch(() => [] as Order[]),
        fetchExpenses().catch(() => []),
        apiFetch<{ currentShift: ShiftDTO | null }>('/api/v1/finance/shifts/current').catch(() => ({
          currentShift: null,
        })),
        apiFetch<{ settings: StoreSettings }>('/api/v1/settings').catch(() => null),
        hasGranularPermission('inventory:view')
          ? apiFetch<{ ingredients: Ingredient[] }>('/api/v1/inventory').catch(() => ({ ingredients: [] }))
          : Promise.resolve({ ingredients: [] as Ingredient[] }),
      ]);

      const rate = settingsRes?.settings?.khrExchangeRate || 4100;
      setKhrRate(rate);
      setOrders(ordersList);
      setPettyExpenses(computeTodayExpenses(expensesList, rate));
      setCurrentShift(shiftRes.currentShift);
      setIngredients(invRes.ingredients);
    } finally {
      setLoading(false);
    }
  }, [hasGranularPermission]);

  useEffect(() => {
    void loadDashboard();
    const refresh = () => void loadDashboard();
    window.addEventListener('coffee_order_created', refresh);
    window.addEventListener('coffee_order_refunded', refresh);
    window.addEventListener('coffee_shift_updated', refresh);
    return () => {
      window.removeEventListener('coffee_order_created', refresh);
      window.removeEventListener('coffee_order_refunded', refresh);
      window.removeEventListener('coffee_shift_updated', refresh);
    };
  }, [loadDashboard]);

  const metrics = useMemo(() => computeTodayMetricsFromOrders(orders), [orders]);
  const currentSales = metrics.netSales;
  const targetPercent = Math.min(100, Math.round((currentSales / Math.max(1, dailyTarget)) * 100));

  const cashSales = metrics.cashSales;
  const { khqrToday, cardToday } = useMemo(() => {
    let khqr = 0;
    let card = 0;
    for (const o of metrics.todayOrders) {
      if (o.splitPayments && o.splitPayments.length > 0) {
        for (const sp of o.splitPayments) {
          if (sp.method === 'CREDIT_CARD') card += sp.amount;
          else if (sp.method !== 'CASH') khqr += sp.amount;
        }
      } else if (o.paymentMethod === 'CREDIT_CARD') {
        card += o.totalAmount;
      } else if (o.paymentMethod && o.paymentMethod !== 'CASH') {
        khqr += o.totalAmount;
      }
    }
    return { khqrToday: khqr, cardToday: card };
  }, [metrics.todayOrders]);

  const cashlessSales = metrics.cashlessSales;
  const openingFloat = currentShift ? currentShift.startingFloat : 0;
  const netDrawerCash = Math.max(0, openingFloat + cashSales - pettyExpenses);

  const lowStockIngredients = ingredients.filter((i) => i.currentStock <= i.minStockAlert);
  const avgTicket = metrics.orderCount > 0 ? metrics.netSales / metrics.orderCount : 0;
  const totalRefundedToday = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    return orders.filter((o) => o.createdAt.startsWith(todayStr) && o.isRefunded).length;
  }, [orders]);

  const recentOrders = useMemo(() => orders.slice(0, 6), [orders]);

  const dailyChartData = useMemo(() => {
    const days: Array<{ day: string; iso: string; revenue: number; orders: number }> = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });
      days.push({ day: label, iso, revenue: 0, orders: 0 });
    }
    const dayMap = new Map(days.map((item) => [item.iso, item]));
    for (const o of orders) {
      if (o.isRefunded) continue;
      const bucket = dayMap.get(o.createdAt.slice(0, 10));
      if (bucket) {
        bucket.revenue = Number((bucket.revenue + o.totalAmount).toFixed(2));
        bucket.orders += 1;
      }
    }
    return days;
  }, [orders]);

  const saveDailyTarget = () => {
    const next = Math.max(50, Number(targetInput) || 1500);
    setDailyTarget(next);
    setTargetInput(String(next));
    setEditingTarget(false);
    try {
      localStorage.setItem('coffee_pos_daily_target', String(next));
    } catch {
      // Ignore storage error
    }
  };

  return (
    <div className="space-y-5 font-sans">
      <BroadcastBanner onOpenManager={() => setShowBroadcastModal(true)} />

      {/* Hero Command Center */}
      <div className="glass-panel rounded-2xl p-5 sm:p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-full bg-gradient-to-l from-amber-500/10 to-transparent pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[11px] font-bold tracking-wide uppercase">
                Command Center
              </span>
              <span className="text-xs text-zinc-400">SQLite Live Operations</span>
              <button
                type="button"
                onClick={() => void loadDashboard()}
                disabled={loading}
                className="p-1.5 rounded-lg bg-white/[0.04] border border-white/10 text-zinc-400 hover:text-amber-300"
                title={t('refresh')}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-zinc-100 tracking-tight">
              {t('hello')}, {user?.name || 'Owner'}
            </h1>
            <p className="text-xs text-zinc-400 max-w-2xl leading-relaxed">
              {t('dashboardSub')}
            </p>
          </div>

          {/* Daily Target Card */}
          <div className="bg-[#0b0c10] border border-white/10 p-4 rounded-2xl w-full lg:w-80 space-y-2.5 shadow-inner flex-shrink-0">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-zinc-300 font-semibold">
                <Target className="w-4 h-4 text-amber-400" />
                <span>{t('dailyTarget')}</span>
              </span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-bold text-amber-400">{targetPercent}%</span>
                <button
                  type="button"
                  onClick={() => setEditingTarget((prev) => !prev)}
                  className="p-1 rounded hover:bg-white/[0.08] text-zinc-400 hover:text-amber-300"
                  title="Edit daily target"
                >
                  <Pencil className="w-3 h-3" />
                </button>
              </div>
            </div>

            {editingTarget ? (
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={50}
                  step={50}
                  value={targetInput}
                  onChange={(e) => setTargetInput(e.target.value)}
                  className="flex-1 px-2.5 py-1 rounded-lg glass-input text-xs font-mono focus:outline-none"
                />
                <button
                  type="button"
                  onClick={saveDailyTarget}
                  className="px-2.5 py-1 rounded-lg bg-amber-500 text-zinc-950 font-bold text-xs"
                >
                  {t('save')}
                </button>
              </div>
            ) : (
              <div className="w-full bg-zinc-800/90 rounded-full h-2.5 overflow-hidden border border-white/10">
                <div
                  className="gold-gradient-bg h-full rounded-full transition-all duration-500"
                  style={{ width: `${targetPercent}%` }}
                />
              </div>
            )}

            <div className="flex items-baseline justify-between text-[11px] text-zinc-400">
              <span>{t('achieved')}: <strong className="text-zinc-100 font-mono">${currentSales.toFixed(2)}</strong></span>
              <span>{t('target')}: <strong className="text-amber-400 font-mono">${dailyTarget.toFixed(2)}</strong></span>
            </div>
          </div>
        </div>

        {/* Quick Actions Strip */}
        <div className="pt-5 mt-5 border-t border-white/10 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          <button
            type="button"
            onClick={() => navigate('/pos')}
            className="p-3 rounded-xl gold-gradient-bg hover:brightness-110 text-zinc-950 font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/15 transition-all"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>{t('openPos')}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowZReport(true)}
            className="p-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-amber-500/35 text-amber-300 font-bold text-xs flex items-center justify-center gap-2 transition-colors"
          >
            <Receipt className="w-4 h-4 text-amber-400" />
            <span>{t('zReport')}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowPettyCash(true)}
            className="p-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-emerald-500/40 text-zinc-200 hover:text-emerald-300 font-bold text-xs flex items-center justify-center gap-2 transition-colors"
          >
            <Wallet className="w-4 h-4 text-emerald-400" />
            <span>{t('pettyCash')}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowPromoManager(true)}
            className="p-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-purple-500/40 text-zinc-200 hover:text-purple-300 font-bold text-xs flex items-center justify-center gap-2 transition-colors"
          >
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span>{t('promotions')}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowBroadcastModal(true)}
            className="p-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-sky-500/40 text-zinc-200 hover:text-sky-300 font-bold text-xs flex items-center justify-center gap-2 transition-colors col-span-2 sm:col-span-1"
          >
            <Megaphone className="w-4 h-4 text-sky-400" />
            <span>{t('broadcast')}</span>
          </button>
        </div>
      </div>

      {/* Primary Cash & Drawer Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card rounded-2xl p-5 space-y-3 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400">Net Physical Cash in Drawer</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h3 className="text-3xl font-black font-mono tabular-nums gold-gradient-text">${netDrawerCash.toFixed(2)}</h3>
            <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
              ≈ {Math.round(netDrawerCash * khrRate).toLocaleString()} ៛ KHR
            </p>
          </div>
          <div className="pt-2.5 border-t border-white/10 flex items-center justify-between text-[11px] text-zinc-400">
            <span>Float + Cash: <strong className="text-zinc-200 font-mono">${(openingFloat + cashSales).toFixed(2)}</strong></span>
            <span>Expenses: <strong className="text-red-400 font-mono">-${pettyExpenses.toFixed(2)}</strong></span>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5 space-y-3 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400">KHQR & Digital Settlement</span>
            <div className="w-8 h-8 rounded-xl bg-sky-500/15 text-sky-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h3 className="text-3xl font-black text-sky-400 font-mono tabular-nums">${cashlessSales.toFixed(2)}</h3>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              KHQR/Wallet (${khqrToday.toFixed(2)}) + Card (${cardToday.toFixed(2)})
            </p>
          </div>
          <div className="pt-2.5 border-t border-white/10 flex items-center justify-between text-[11px] text-zinc-400">
            <span>Today's Digital Channel</span>
            <span className="text-emerald-400 font-bold">SQLite Verified</span>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5 space-y-3 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400">Shift & Stock Health</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
              <PackageCheck className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h3 className="text-lg font-extrabold text-zinc-100 flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${currentShift ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'}`} />
              <span>{currentShift ? 'Shift Register Open' : 'No Active Shift'}</span>
            </h3>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              {currentShift
                ? `${currentShift.cashierName} • Float $${currentShift.startingFloat.toFixed(2)}`
                : 'Open a drawer shift from POS or X-Report'}
            </p>
          </div>
          <div className="pt-2.5 border-t border-white/10 flex items-center justify-between text-[11px] text-zinc-400">
            <span>Low Stock Alerts: <strong className="text-amber-400">{lowStockIngredients.length}</strong></span>
            <button
              type="button"
              onClick={() => navigate('/inventory')}
              className="text-amber-400 hover:underline flex items-center gap-0.5 font-semibold"
            >
              <span>Inspect</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* KPI Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Net Sales Today"
          value={`$${metrics.netSales.toFixed(2)}`}
          subtext={`Tax: $${metrics.taxCollected.toFixed(2)} • Disc: $${metrics.discounts.toFixed(2)}`}
          badge={
            <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              Live
            </span>
          }
          icon={<DollarSign className="w-4 h-4" />}
          accent="amber"
        />
        <StatCard
          label="Orders Today"
          value={metrics.orderCount}
          subtext={`Avg ticket: $${avgTicket.toFixed(2)}`}
          badge={<span className="text-[11px] font-bold text-sky-400">Voided: {totalRefundedToday}</span>}
          icon={<ShoppingBag className="w-4 h-4" />}
          accent="blue"
        />
        <StatCard
          label="Total Ledger Orders"
          value={orders.length}
          subtext="Persisted in SQLite"
          badge={<span className="text-[11px] font-bold text-purple-400">Synced</span>}
          icon={<Globe className="w-4 h-4" />}
          accent="purple"
        />
        <StatCard
          label="Low Stock Warnings"
          value={lowStockIngredients.length}
          subtext={
            lowStockIngredients.length > 0
              ? lowStockIngredients.map((i) => i.name).join(', ')
              : 'All ingredients above threshold'
          }
          badge={
            <span className={`text-[11px] font-bold ${lowStockIngredients.length > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
              {lowStockIngredients.length > 0 ? 'Action Needed' : 'Optimal'}
            </span>
          }
          icon={<AlertTriangle className="w-4 h-4" />}
          accent={lowStockIngredients.length > 0 ? 'red' : 'emerald'}
        />
      </div>

      {/* Bottom Split: 7-Day Revenue Chart + Live Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-8 glass-panel rounded-2xl p-5 sm:p-6 space-y-4">
          <div className="flex flex-wrap justify-between items-center gap-3">
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-zinc-100 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-amber-400" />
                <span>7-Day Revenue Trend</span>
              </h3>
              <p className="text-xs text-zinc-400">Gross revenue aggregated from completed orders</p>
            </div>
            <button
              type="button"
              onClick={() => setShowXReport(true)}
              className="text-xs font-mono font-bold text-amber-300 bg-amber-500/15 hover:bg-amber-500/25 px-3 py-1.5 rounded-xl border border-amber-500/30 transition-colors"
            >
              Shift X-Report
            </button>
          </div>

          <div className="h-64 sm:h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyChartData}>
                <defs>
                  <linearGradient id="dashAmberBar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="#b45309" stopOpacity={0.75} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="day" stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                  contentStyle={{
                    backgroundColor: '#12131a',
                    borderColor: 'rgba(245,158,11,0.35)',
                    borderRadius: '12px',
                    color: '#f4f4f5',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="revenue" fill="url(#dashAmberBar)" radius={[8, 8, 0, 0]} name="Revenue ($)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Live Recent Activity Feed */}
        <div className="lg:col-span-4 glass-panel rounded-2xl p-5 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <h3 className="text-base font-extrabold text-zinc-100">Recent Tickets</h3>
            </div>
            <button
              type="button"
              onClick={() => navigate('/reports')}
              className="text-[11px] font-bold text-amber-400 hover:underline"
            >
              View All
            </button>
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto max-h-64 pr-0.5">
            {recentOrders.length === 0 ? (
              <div className="py-12 text-center text-xs text-zinc-500">
                No orders recorded yet. Complete a sale on POS to view live activity.
              </div>
            ) : (
              recentOrders.map((ord) => (
                <div
                  key={ord.id}
                  className="p-3 rounded-xl bg-[#0b0c10] border border-white/10 flex items-center justify-between gap-2 text-xs"
                >
                  <div className="min-w-0">
                    <div className="font-mono font-bold text-amber-300 truncate">{ord.orderNumber}</div>
                    <div className="text-[11px] text-zinc-400 truncate">
                      {ord.cashierName} • {ord.items.reduce((s, i) => s + i.quantity, 0)} items
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className={`font-mono font-extrabold ${ord.isRefunded ? 'text-red-400 line-through' : 'text-emerald-400'}`}>
                      ${ord.totalAmount.toFixed(2)}
                    </div>
                    <div className="text-[10px] text-zinc-500">{ord.paymentMethod?.replace('_', ' ') || 'CASH'}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showZReport && <ZReportModal onClose={() => setShowZReport(false)} cashierName={user?.name || 'Store Owner'} />}
      {showXReport && <XReportModal onClose={() => setShowXReport(false)} outgoingCashier={user?.name || 'Store Owner'} />}
      {showPettyCash && <PettyCashModal onClose={() => setShowPettyCash(false)} cashierName={user?.name || 'Store Owner'} />}
      {showPromoManager && <PromotionManagerModal onClose={() => setShowPromoManager(false)} />}
      {showBroadcastModal && <BroadcastModal onClose={() => setShowBroadcastModal(false)} authorName={user?.name || 'Store Owner'} />}
    </div>
  );
};
