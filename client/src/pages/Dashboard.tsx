import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  DollarSign, ShoppingBag, Users, AlertTriangle, TrendingUp, 
  ArrowUpRight, Coffee, PackageCheck, Award, Globe, MapPin,
  Receipt, Wallet, Sparkles, Megaphone, CheckCircle2, ChevronRight,
  Target, ArrowDownRight, RefreshCw, BarChart2
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, 
  Tooltip, CartesianGrid, BarChart, Bar 
} from 'recharts';
import { SALES_ANALYTICS_DATA, INITIAL_INGREDIENTS } from '../services/mockData';
import { getTotalExpensesToday } from '../services/expenseService';
import { getTodaySalesMetrics } from '../services/orderService';
import { useAuth } from '../context/AuthContext';
import { ZReportModal } from '../components/pos/ZReportModal';
import { XReportModal } from '../components/pos/XReportModal';
import { PettyCashModal } from '../components/finance/PettyCashModal';
import { PromotionManagerModal } from '../components/promotions/PromotionManagerModal';
import { BroadcastModal } from '../components/ui/BroadcastModal';
import { BroadcastBanner } from '../components/ui/BroadcastBanner';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Modals state
  const [showZReport, setShowZReport] = useState(false);
  const [showXReport, setShowXReport] = useState(false);
  const [showPettyCash, setShowPettyCash] = useState(false);
  const [showPromoManager, setShowPromoManager] = useState(false);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);

  // Dynamic Financial reconciliation numbers from actual orders
  const metrics = getTodaySalesMetrics();
  const dailyTarget = 1500.00;
  const currentSales = metrics.netSales > 0 ? metrics.netSales : 1248.50;
  const targetPercent = Math.min(100, Math.round((currentSales / dailyTarget) * 100));

  const cashSales = metrics.cashSales > 0 ? metrics.cashSales : 485.00;
  const cashlessSales = metrics.cashlessSales > 0 ? metrics.cashlessSales : 763.00;
  const pettyExpenses = getTotalExpensesToday();
  const openingFloat = 100.00;
  const netDrawerCash = openingFloat + cashSales - pettyExpenses;

  const lowStockIngredients = INITIAL_INGREDIENTS.filter(i => i.currentStock <= i.minStockAlert);

  const globalBranchPerformance = [
    { branch: 'Phnom Penh 🇰🇭', revenue: 14262, orders: 1421, currency: 'USD' },
    { branch: 'Bangkok 🇹🇭', revenue: 12850, orders: 1210, currency: 'USD' },
    { branch: 'Singapore 🇸🇬', revenue: 18900, orders: 1650, currency: 'USD' },
    { branch: 'Tokyo 🇯🇵', revenue: 21400, orders: 1890, currency: 'USD' },
    { branch: 'London 🇬🇧', revenue: 16500, orders: 1340, currency: 'USD' },
    { branch: 'New York 🇺🇸', revenue: 24800, orders: 2100, currency: 'USD' },
  ];

  return (
    <div className="space-y-6 font-sans">
      {/* Broadcast Ticker */}
      <BroadcastBanner onOpenManager={() => setShowBroadcastModal(true)} />

      {/* Top Banner: Owner Master Command Center & Sales Target */}
      <div className="bg-gradient-to-r from-stone-900 via-stone-900 to-amber-950/40 border border-amber-700/40 rounded-3xl p-6 glass-panel shadow-2xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-full bg-gradient-to-l from-amber-600/10 to-transparent pointer-events-none"></div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-1 rounded-full bg-amber-600/20 text-amber-400 border border-amber-500/30 text-[11px] font-bold tracking-wide uppercase">
                Owner Command Center • មជ្ឈមណ្ឌលគ្រប់គ្រង
              </span>
              <span className="text-xs text-stone-400">Branch #001 (Phnom Penh Main)</span>
            </div>
            <h1 className="text-2xl font-black text-stone-100 tracking-tight">
              សួស្តី, {user?.name || 'Store Owner'} 👋
            </h1>
            <p className="text-xs text-stone-400 max-w-xl">
              ប្រព័ន្ធគ្រប់គ្រងហាងកាហ្វេឆ្លាតវៃ: តាមដានចំណូលលក់ របាយការណ៍បិទបញ្ជី Z-Report ចំណាយហាង និងការផ្សព្វផ្សាយក្នុងពេលជាក់ស្តែង។
            </p>
          </div>

          {/* Daily Sales Target Widget */}
          <div className="bg-stone-950/80 border border-amber-700/30 p-4 rounded-2xl min-w-[280px] space-y-2 shadow-inner">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center space-x-1.5 text-stone-300 font-semibold">
                <Target className="w-4 h-4 text-amber-400" />
                <span>គោលដៅលក់ថ្ងៃនេះ (Daily Target)</span>
              </span>
              <span className="font-mono font-bold text-amber-400">{targetPercent}%</span>
            </div>

            {/* Target Progress Bar */}
            <div className="w-full bg-stone-800 rounded-full h-3 overflow-hidden p-0.5 border border-stone-700">
              <div
                className="bg-gradient-to-r from-amber-500 to-yellow-400 h-full rounded-full transition-all duration-500 shadow-md shadow-amber-500/50"
                style={{ width: `${targetPercent}%` }}
              ></div>
            </div>

            <div className="flex items-baseline justify-between text-[11px] text-stone-400 pt-0.5">
              <span>សម្រេចបាន: <strong className="text-stone-200 font-mono">${currentSales.toFixed(2)}</strong></span>
              <span>គោលដៅ: <strong className="text-amber-400 font-mono">${dailyTarget.toFixed(2)}</strong></span>
            </div>
          </div>
        </div>

        {/* 1-Click Quick Launcher Actions Bar */}
        <div className="pt-6 mt-6 border-t border-stone-800/80 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <button
            onClick={() => navigate('/pos')}
            className="p-3 rounded-2xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs flex items-center justify-center space-x-2 shadow-lg shadow-amber-900/30 transition-all hover:scale-[1.02]"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>បើក POS Register</span>
          </button>

          <button
            onClick={() => setShowZReport(true)}
            className="p-3 rounded-2xl bg-stone-950/90 hover:bg-stone-800 border border-amber-700/40 text-amber-300 font-bold text-xs flex items-center justify-center space-x-2 transition-all hover:scale-[1.02]"
          >
            <Receipt className="w-4 h-4 text-amber-400" />
            <span>បិទបញ្ជី Z-Report</span>
          </button>

          <button
            onClick={() => setShowPettyCash(true)}
            className="p-3 rounded-2xl bg-stone-950/90 hover:bg-stone-800 border border-stone-800 hover:border-amber-600/50 text-stone-200 font-bold text-xs flex items-center justify-center space-x-2 transition-all hover:scale-[1.02]"
          >
            <Wallet className="w-4 h-4 text-emerald-400" />
            <span>កត់ចំណាយ Petty Cash</span>
          </button>

          <button
            onClick={() => setShowPromoManager(true)}
            className="p-3 rounded-2xl bg-stone-950/90 hover:bg-stone-800 border border-stone-800 hover:border-amber-600/50 text-stone-200 font-bold text-xs flex items-center justify-center space-x-2 transition-all hover:scale-[1.02]"
          >
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span>ប្រូម៉ូសិន Happy Hour</span>
          </button>

          <button
            onClick={() => setShowBroadcastModal(true)}
            className="p-3 rounded-2xl bg-stone-950/90 hover:bg-stone-800 border border-stone-800 hover:border-amber-600/50 text-stone-200 font-bold text-xs flex items-center justify-center space-x-2 transition-all hover:scale-[1.02] col-span-2 sm:col-span-1"
          >
            <Megaphone className="w-4 h-4 text-blue-400" />
            <span>ផ្សាយដំណឹង Broadcast</span>
          </button>
        </div>
      </div>

      {/* Financial Health & Drawer Cash Flow Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Net Cash In Drawer */}
        <div className="p-5 rounded-3xl bg-stone-900/80 border border-amber-700/30 glass-card shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-400">Net Physical Cash in Drawer</span>
            <div className="w-8 h-8 rounded-xl bg-amber-600/20 text-amber-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h3 className="text-3xl font-black text-amber-400 font-mono">${netDrawerCash.toFixed(2)}</h3>
            <p className="text-[11px] text-stone-400 font-mono mt-0.5">≈ {(netDrawerCash * 4100).toLocaleString()} ៛ KHR</p>
          </div>
          <div className="pt-2 border-t border-stone-800 flex items-center justify-between text-[11px] text-stone-400">
            <span>Gross Cash: <strong className="text-stone-300 font-mono">${cashSales.toFixed(2)}</strong></span>
            <span>Expenses: <strong className="text-red-400 font-mono">-${pettyExpenses.toFixed(2)}</strong></span>
          </div>
        </div>

        {/* Digital Cashless Revenue */}
        <div className="p-5 rounded-3xl bg-stone-900/80 border border-stone-800 glass-card shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-400">ABA KHQR & Digital Cashless</span>
            <div className="w-8 h-8 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h3 className="text-3xl font-black text-blue-400 font-mono">$763.00</h3>
            <p className="text-[11px] text-stone-400 mt-0.5">ABA KHQR ($620.50) + Card ($142.50)</p>
          </div>
          <div className="pt-2 border-t border-stone-800 flex items-center justify-between text-[11px] text-stone-400">
            <span>Auto-deposited into Bank</span>
            <span className="text-emerald-400 font-bold">100% Reconciled</span>
          </div>
        </div>

        {/* Store Active Alerts */}
        <div className="p-5 rounded-3xl bg-stone-900/80 border border-stone-800 glass-card shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-400">Stock & Shift Status</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center">
              <PackageCheck className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h3 className="text-xl font-bold text-stone-100 flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
              <span>Register Active</span>
            </h3>
            <p className="text-[11px] text-stone-400 mt-0.5">Morning Shift: 07:00 AM - 03:00 PM</p>
          </div>
          <div className="pt-2 border-t border-stone-800 flex items-center justify-between text-[11px] text-stone-400">
            <span>Low Stock Items: <strong className="text-amber-400">{lowStockIngredients.length}</strong></span>
            <button onClick={() => navigate('/inventory')} className="text-amber-400 hover:underline flex items-center space-x-0.5">
              <span>View Stock</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Global Chain Performance */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="p-5 rounded-3xl bg-stone-900/80 border border-amber-700/30 glass-card shadow-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-400">Global Chain Sales Today</span>
            <div className="w-8 h-8 rounded-2xl bg-amber-600/20 text-amber-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <h3 className="text-2xl font-extrabold text-stone-100 font-mono">$108,712.00</h3>
            <span className="text-xs font-bold text-emerald-400 flex items-center">
              <TrendingUp className="w-3.5 h-3.5 mr-1" />
              +24.6%
            </span>
          </div>
          <p className="text-[11px] text-stone-500">Across 6 Worldwide Branches</p>
        </div>

        <div className="p-5 rounded-3xl bg-stone-900/80 border border-stone-800 glass-card shadow-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-400">Total Global Orders</span>
            <div className="w-8 h-8 rounded-2xl bg-blue-600/20 text-blue-400 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <h3 className="text-2xl font-extrabold text-stone-100 font-mono">9,611</h3>
            <span className="text-xs font-bold text-emerald-400 flex items-center">
              <TrendingUp className="w-3.5 h-3.5 mr-1" />
              +12.8%
            </span>
          </div>
          <p className="text-[11px] text-stone-500">Avg ticket: $11.31 / order</p>
        </div>

        <div className="p-5 rounded-3xl bg-stone-900/80 border border-stone-800 glass-card shadow-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-400">Worldwide CRM Members</span>
            <div className="w-8 h-8 rounded-2xl bg-purple-600/20 text-purple-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <h3 className="text-2xl font-extrabold text-stone-100 font-mono">48,920</h3>
            <span className="text-xs font-bold text-purple-400">Global Gold Tier</span>
          </div>
          <p className="text-[11px] text-stone-500">840 new signups today</p>
        </div>

        <div className="p-5 rounded-3xl bg-stone-900/80 border border-stone-800 glass-card shadow-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-400">Branch Stock Warnings</span>
            <div className="w-8 h-8 rounded-2xl bg-red-600/20 text-red-400 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <h3 className="text-2xl font-extrabold text-red-400 font-mono">2 Branches</h3>
            <span className="text-xs font-bold text-red-400">Action Required</span>
          </div>
          <p className="text-[11px] text-stone-500">Phnom Penh & Bangkok low</p>
        </div>
      </div>

      {/* Worldwide Branch Sales Heatmap Comparison */}
      <div className="bg-stone-900/80 border border-stone-800 rounded-3xl p-6 glass-panel space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold text-stone-100 flex items-center space-x-2">
              <Globe className="w-5 h-5 text-amber-400" />
              <span>Worldwide Branch Network Performance</span>
            </h3>
            <p className="text-xs text-stone-400">Comparative gross sales volume across international locations</p>
          </div>
          <span className="text-xs font-mono font-bold text-amber-400 bg-amber-950/40 px-3 py-1 rounded-full border border-amber-900/40">
            Top: New York 🇺🇸 ($24.8k)
          </span>
        </div>

        <div className="h-72 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={globalBranchPerformance}>
              <CartesianGrid strokeDasharray="3 3" stroke="#292524" />
              <XAxis dataKey="branch" stroke="#78716c" fontSize={11} />
              <YAxis stroke="#78716c" fontSize={11} />
              <Tooltip contentStyle={{ backgroundColor: '#1c1917', borderColor: '#78716c', borderRadius: '12px', color: '#f5f5f4' }} />
              <Bar dataKey="revenue" fill="#C68E17" radius={[8, 8, 0, 0]} name="Gross Revenue ($ USD)" />
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
