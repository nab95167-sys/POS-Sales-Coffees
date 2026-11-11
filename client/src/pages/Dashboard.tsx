import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DollarSign, ShoppingBag, AlertTriangle, TrendingUp, PackageCheck, Globe,
  Receipt, Wallet, Sparkles, Megaphone, CheckCircle2, ChevronRight, Target, RefreshCw
} from 'lucide-react';
import { ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar } from 'recharts';
import { fetchExpenses, computeTodayExpenses } from '../services/expenseService';
import { fetchOrders, computeTodayMetricsFromOrders } from '../services/orderService';
import { apiFetch } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Ingredient, Order, StoreSettings } from '../types';
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

  // Modals state
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

  // Dynamic Financial reconciliation numbers from SQLite orders
  const metrics = useMemo(() => computeTodayMetricsFromOrders(orders), [orders]);
  const dailyTarget = 1500.0;
  const currentSales = metrics.netSales;
  const targetPercent = Math.min(100, Math.round((currentSales / dailyTarget) * 100));

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

  // Live 7-day sales trend chart from SQLite orders
  const dailyChartData = useMemo(() => {
    const days: Array<{ day: string; iso: string; revenue: number; orders: number }> = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
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

  return (
    <div className="space-y-6 font-sans">
      {/* Broadcast Ticker */}
      <BroadcastBanner onOpenManager={() => setShowBroadcastModal(true)} />

      {/* Top Banner: Owner Master Command Center & Sales Target */}
      <div className="bg-gradient-to-r from-[#121217] via-[#16161f] to-[#121217] border border-zinc-800/80 rounded-3xl p-6 glass-panel shadow-2xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-full bg-gradient-to-l from-amber-500/10 to-transparent pointer-events-none"></div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[11px] font-bold tracking-wide uppercase">
                Owner Command Center • មជ្ឈមណ្ឌលគ្រប់គ្រង
              </span>
              <span className="text-xs text-zinc-400">Branch #001 (Phnom Penh Main)</span>
              <button
                onClick={() => void loadDashboard()}
                disabled={loading}
                className="p-1 rounded-lg bg-zinc-800/80 text-zinc-400 hover:text-amber-300"
                title="Refresh Dashboard"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
            <h1 className="text-2xl font-black text-zinc-100 tracking-tight">
              សួស្តី, {user?.name || 'Store Owner'}
            </h1>
            <p className="text-xs text-zinc-400 max-w-xl">
              ប្រព័ន្ធគ្រប់គ្រងហាងកាហ្វេឆ្លាតវៃ: តាមដានចំណូលលក់ របាយការណ៍បិទបញ្ជី Z-Report ចំណាយហាង និងការផ្សព្វផ្សាយក្នុងពេលជាក់ស្តែង។
            </p>
          </div>

          {/* Daily Sales Target Widget */}
          <div className="bg-[#0c0c10]/90 border border-zinc-800 p-4 rounded-2xl min-w-[280px] space-y-2 shadow-inner">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center space-x-1.5 text-zinc-300 font-semibold">
                <Target className="w-4 h-4 text-amber-400" />
                <span>គោលដៅលក់ថ្ងៃនេះ (Daily Target)</span>
              </span>
              <span className="font-mono font-bold text-amber-400">{targetPercent}%</span>
            </div>

            {/* Target Progress Bar */}
            <div className="w-full bg-zinc-800 rounded-full h-3 overflow-hidden p-0.5 border border-zinc-700">
              <div
                className="bg-gradient-to-r from-amber-500 to-yellow-400 h-full rounded-full transition-all duration-500 shadow-md shadow-amber-500/50"
                style={{ width: `${targetPercent}%` }}
              ></div>
            </div>

            <div className="flex items-baseline justify-between text-[11px] text-zinc-400 pt-0.5">
              <span>សម្រេចបាន: <strong className="text-zinc-200 font-mono">${currentSales.toFixed(2)}</strong></span>
              <span>គោលដៅ: <strong className="text-amber-400 font-mono">${dailyTarget.toFixed(2)}</strong></span>
            </div>
          </div>
        </div>

        {/* 1-Click Quick Launcher Actions Bar */}
        <div className="pt-6 mt-6 border-t border-zinc-800/80 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <button
            onClick={() => navigate('/pos')}
            className="p-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:brightness-110 text-zinc-950 font-black text-xs flex items-center justify-center space-x-2 shadow-lg shadow-amber-500/20 transition-all hover:scale-[1.02]"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>បើក POS Register</span>
          </button>

          <button
            onClick={() => setShowZReport(true)}
            className="p-3 rounded-2xl bg-[#0e0e13] hover:bg-zinc-800 border border-amber-500/40 text-amber-300 font-bold text-xs flex items-center justify-center space-x-2 transition-all hover:scale-[1.02]"
          >
            <Receipt className="w-4 h-4 text-amber-400" />
            <span>បិទបញ្ជី Z-Report</span>
          </button>

          <button
            onClick={() => setShowPettyCash(true)}
            className="p-3 rounded-2xl bg-[#0e0e13] hover:bg-zinc-800 border border-zinc-800 hover:border-emerald-500/50 text-zinc-200 hover:text-emerald-300 font-bold text-xs flex items-center justify-center space-x-2 transition-all hover:scale-[1.02]"
          >
            <Wallet className="w-4 h-4 text-emerald-400" />
            <span>កត់ចំណាយ Petty Cash</span>
          </button>

          <button
            onClick={() => setShowPromoManager(true)}
            className="p-3 rounded-2xl bg-[#0e0e13] hover:bg-zinc-800 border border-zinc-800 hover:border-purple-500/50 text-zinc-200 hover:text-purple-300 font-bold text-xs flex items-center justify-center space-x-2 transition-all hover:scale-[1.02]"
          >
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span>ប្រូម៉ូសិន Happy Hour</span>
          </button>

          <button
            onClick={() => setShowBroadcastModal(true)}
            className="p-3 rounded-2xl bg-[#0e0e13] hover:bg-zinc-800 border border-zinc-800 hover:border-blue-500/50 text-zinc-200 hover:text-blue-300 font-bold text-xs flex items-center justify-center space-x-2 transition-all hover:scale-[1.02] col-span-2 sm:col-span-1"
          >
            <Megaphone className="w-4 h-4 text-blue-400" />
            <span>ផ្សាយដំណឹង Broadcast</span>
          </button>
        </div>
      </div>

      {/* Financial Health & Drawer Cash Flow Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Net Cash In Drawer */}
        <div className="p-5 rounded-3xl bg-[#121217] border border-zinc-800/80 glass-card shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400">Net Physical Cash in Drawer</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h3 className="text-3xl font-black text-amber-400 font-mono gold-gradient-text">${netDrawerCash.toFixed(2)}</h3>
            <p className="text-[11px] text-zinc-400 font-mono mt-0.5">≈ {Math.round(netDrawerCash * khrRate).toLocaleString()} ៛ KHR</p>
          </div>
          <div className="pt-2 border-t border-zinc-800 flex items-center justify-between text-[11px] text-zinc-400">
            <span>Float + Cash: <strong className="text-zinc-200 font-mono">${(openingFloat + cashSales).toFixed(2)}</strong></span>
            <span>Expenses: <strong className="text-red-400 font-mono">-${pettyExpenses.toFixed(2)}</strong></span>
          </div>
        </div>

        {/* Digital Cashless Revenue */}
        <div className="p-5 rounded-3xl bg-[#121217] border border-zinc-800/80 glass-card shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400">ABA KHQR & Digital Cashless</span>
            <div className="w-8 h-8 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h3 className="text-3xl font-black text-blue-400 font-mono">${cashlessSales.toFixed(2)}</h3>
            <p className="text-[11px] text-zinc-400 mt-0.5">KHQR/Wallet (${khqrToday.toFixed(2)}) + Card (${cardToday.toFixed(2)})</p>
          </div>
          <div className="pt-2 border-t border-zinc-800 flex items-center justify-between text-[11px] text-zinc-400">
            <span>Today's Digital Settlement</span>
            <span className="text-emerald-400 font-bold">SQLite Verified</span>
          </div>
        </div>

        {/* Store Active Alerts */}
        <div className="p-5 rounded-3xl bg-[#121217] border border-zinc-800/80 glass-card shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400">Stock & Shift Status</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center">
              <PackageCheck className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h3 className="text-xl font-bold text-zinc-100 flex items-center space-x-2">
              <span className={`w-2.5 h-2.5 rounded-full ${currentShift ? 'bg-emerald-400' : 'bg-stone-500'}`}></span>
              <span>{currentShift ? 'Shift Register Open' : 'No Active Shift'}</span>
            </h3>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              {currentShift
                ? `${currentShift.cashierName} • Float $${currentShift.startingFloat.toFixed(2)}`
                : 'Open a shift from POS Cash Drawer'}
            </p>
          </div>
          <div className="pt-2 border-t border-zinc-800 flex items-center justify-between text-[11px] text-zinc-400">
            <span>Low Stock Items: <strong className="text-amber-400">{lowStockIngredients.length}</strong></span>
            <button onClick={() => navigate('/inventory')} className="text-amber-400 hover:underline flex items-center space-x-0.5">
              <span>View Stock</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Live Store Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="p-5 rounded-3xl bg-stone-900/80 border border-amber-700/30 glass-card shadow-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-400">Net Sales Today</span>
            <div className="w-8 h-8 rounded-2xl bg-amber-600/20 text-amber-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <h3 className="text-2xl font-extrabold text-stone-100 font-mono">${metrics.netSales.toFixed(2)}</h3>
            <span className="text-xs font-bold text-emerald-400 flex items-center">
              <TrendingUp className="w-3.5 h-3.5 mr-1" />
              Live
            </span>
          </div>
          <p className="text-[11px] text-stone-500">Tax: ${metrics.taxCollected.toFixed(2)} • Disc: ${metrics.discounts.toFixed(2)}</p>
        </div>

        <div className="p-5 rounded-3xl bg-stone-900/80 border border-stone-800 glass-card shadow-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-400">Completed Orders Today</span>
            <div className="w-8 h-8 rounded-2xl bg-blue-600/20 text-blue-400 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <h3 className="text-2xl font-extrabold text-stone-100 font-mono">{metrics.orderCount}</h3>
            <span className="text-xs font-bold text-blue-400">Voided: {totalRefundedToday}</span>
          </div>
          <p className="text-[11px] text-stone-500">Avg ticket: ${avgTicket.toFixed(2)} / order</p>
        </div>

        <div className="p-5 rounded-3xl bg-stone-900/80 border border-stone-800 glass-card shadow-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-400">Total Ledger Orders</span>
            <div className="w-8 h-8 rounded-2xl bg-purple-600/20 text-purple-400 flex items-center justify-center">
              <Globe className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <h3 className="text-2xl font-extrabold text-stone-100 font-mono">{orders.length}</h3>
            <span className="text-xs font-bold text-purple-400">Branch #001</span>
          </div>
          <p className="text-[11px] text-stone-500">Stored in SQLite persistence</p>
        </div>

        <div className="p-5 rounded-3xl bg-stone-900/80 border border-stone-800 glass-card shadow-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-400">Low Stock Warnings</span>
            <div className="w-8 h-8 rounded-2xl bg-red-600/20 text-red-400 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <h3 className={`text-2xl font-extrabold font-mono ${lowStockIngredients.length > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
              {lowStockIngredients.length} Items
            </h3>
            <span className={`text-xs font-bold ${lowStockIngredients.length > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
              {lowStockIngredients.length > 0 ? 'Action Required' : 'Optimal'}
            </span>
          </div>
          <p className="text-[11px] text-stone-500 truncate">
            {lowStockIngredients.length > 0 ? lowStockIngredients.map((i) => i.name).join(', ') : 'All ingredients above threshold'}
          </p>
        </div>
      </div>

      {/* Live 7-Day Store Revenue Chart */}
      <div className="bg-stone-900/80 border border-stone-800 rounded-3xl p-6 glass-panel space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold text-stone-100 flex items-center space-x-2">
              <Globe className="w-5 h-5 text-amber-400" />
              <span>7-Day Store Sales Performance (Branch #001)</span>
            </h3>
            <p className="text-xs text-stone-400">Real-time gross revenue aggregated directly from SQLite orders</p>
          </div>
          <button
            onClick={() => setShowXReport(true)}
            className="text-xs font-mono font-bold text-amber-400 bg-amber-950/40 hover:bg-amber-900/40 px-3 py-1.5 rounded-full border border-amber-900/40"
          >
            Open Shift X-Report
          </button>
        </div>

        <div className="h-72 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dailyChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#292524" />
              <XAxis dataKey="day" stroke="#78716c" fontSize={11} />
              <YAxis stroke="#78716c" fontSize={11} />
              <Tooltip contentStyle={{ backgroundColor: '#1c1917', borderColor: '#78716c', borderRadius: '12px', color: '#f5f5f4' }} />
              <Bar dataKey="revenue" fill="#C68E17" radius={[8, 8, 0, 0]} name="Net Revenue ($ USD)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Modals */}
      {showZReport && (
        <ZReportModal
          onClose={() => setShowZReport(false)}
          cashierName={user?.name || 'Store Owner'}
        />
      )}

      {showXReport && (
        <XReportModal
          onClose={() => setShowXReport(false)}
          outgoingCashier={user?.name || 'Store Owner'}
        />
      )}

      {showPettyCash && (
        <PettyCashModal
          onClose={() => setShowPettyCash(false)}
          cashierName={user?.name || 'Store Owner'}
        />
      )}

      {showPromoManager && (
        <PromotionManagerModal
          onClose={() => setShowPromoManager(false)}
        />
      )}

      {showBroadcastModal && (
        <BroadcastModal
          onClose={() => setShowBroadcastModal(false)}
          authorName={user?.name || 'Store Owner'}
        />
      )}
    </div>
  );
};
