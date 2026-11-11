import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Calendar,
  CreditCard,
  DollarSign,
  Download,
  FileSpreadsheet,
  Layers,
  Printer,
  QrCode,
  RefreshCw,
  ShoppingBag,
  TrendingUp,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Order } from '../types';
import { fetchOrders } from '../services/orderService';
import { useProducts } from '../context/ProductContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { showToastNotification } from '../services/telegramBotService';
import { PageHeader } from '../components/ui/PageHeader';
import { StatCard } from '../components/ui/StatCard';

type DateRangeOption = 'Today' | 'Weekly' | 'Monthly' | 'Yearly';
type ReportTab = 'Overview' | 'Products' | 'Payments' | 'Ledger';

const PAYMENT_COLORS = ['#f59e0b', '#10b981', '#38bdf8', '#a855f7', '#fb7185', '#14b8a6'];

function escapeCsvCell(value: unknown): string {
  const raw = String(value ?? '');
  const safe = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replace(/"/g, '""')}"`;
}

function formatPaymentLabel(method?: string): string {
  switch (method) {
    case 'ABA_KHQR':
      return 'ABA KHQR';
    case 'CREDIT_CARD':
      return 'Card Terminal';
    case 'BAKONG':
      return 'Bakong';
    case 'ACLEDA':
      return 'ACLEDA';
    case 'WING':
      return 'Wing';
    case 'MIXED':
      return 'Split Payment';
    case 'CASH':
    default:
      return 'Cash USD/KHR';
  }
}

export const ReportsPage: React.FC = () => {
  const { products } = useProducts();
  const { hasGranularPermission } = useAuth();
  const { t } = useLanguage();
  const canExport = hasGranularPermission('reports:export');

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dateRange, setDateRange] = useState<DateRangeOption>('Weekly');
  const [activeTab, setActiveTab] = useState<ReportTab>('Overview');

  const loadReports = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const data = await fetchOrders({ limit: 500 });
      setOrders(data);
    } catch {
      showToastNotification('Failed to fetch order ledger for reports.', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  const productCostMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of products) {
      map.set(p.id, p.costPrice);
    }
    return map;
  }, [products]);

  const filteredOrders = useMemo(() => {
    const now = new Date();
    let cutoff: number;

    if (dateRange === 'Today') {
      cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    } else if (dateRange === 'Weekly') {
      cutoff = now.getTime() - 7 * 24 * 60 * 60 * 1000;
    } else if (dateRange === 'Monthly') {
      cutoff = now.getTime() - 30 * 24 * 60 * 60 * 1000;
    } else {
      cutoff = now.getTime() - 365 * 24 * 60 * 60 * 1000;
    }

    return orders.filter((o) => {
      const ts = new Date(o.createdAt).getTime();
      return Number.isFinite(ts) && ts >= cutoff;
    });
  }, [orders, dateRange]);

  const kpis = useMemo(() => {
    const valid = filteredOrders.filter((o) => o.status !== 'CANCELLED' && !o.isRefunded);
    const refunded = filteredOrders.filter((o) => o.isRefunded || o.status === 'CANCELLED');

    let grossRevenue = 0;
    let totalTax = 0;
    let totalDiscounts = 0;
    let totalCogs = 0;
    let digitalTotal = 0;

    for (const order of valid) {
      grossRevenue += order.totalAmount || 0;
      totalTax += order.taxAmount || 0;
      totalDiscounts += order.discountAmount || 0;

      if (
        order.paymentMethod === 'ABA_KHQR' ||
        order.paymentMethod === 'BAKONG' ||
        order.paymentMethod === 'ACLEDA' ||
        order.paymentMethod === 'WING'
      ) {
        digitalTotal += order.totalAmount || 0;
      }

      for (const item of order.items || []) {
        const unitCost = productCostMap.get(item.productId) ?? item.unitPrice * 0.35;
        totalCogs += unitCost * (item.quantity || 1);
      }
    }

    const grossProfit = Math.max(0, grossRevenue - totalTax - totalCogs);
    const marginPct = grossRevenue > 0 ? (grossProfit / grossRevenue) * 100 : 0;
    const avgTicket = valid.length > 0 ? grossRevenue / valid.length : 0;
    const digitalShare = grossRevenue > 0 ? (digitalTotal / grossRevenue) * 100 : 0;
    const refundedAmount = refunded.reduce((acc, o) => acc + (o.totalAmount || 0), 0);

    return {
      orderCount: valid.length,
      grossRevenue,
      totalTax,
      totalDiscounts,
      totalCogs,
      grossProfit,
      marginPct,
      avgTicket,
      digitalShare,
      refundedCount: refunded.length,
      refundedAmount,
    };
  }, [filteredOrders, productCostMap]);

  const financialTrendData = useMemo(() => {
    const valid = filteredOrders.filter((o) => o.status !== 'CANCELLED' && !o.isRefunded);
    const buckets = new Map<string, { label: string; sortKey: number; revenue: number; profit: number; orders: number }>();

    for (const order of valid) {
      const dt = new Date(order.createdAt);
      let key: string;
      let label: string;
      let sortKey: number;

      if (dateRange === 'Today') {
        const hr = dt.getHours();
        key = `${hr}`;
        label = `${String(hr).padStart(2, '0')}:00`;
        sortKey = hr;
      } else if (dateRange === 'Yearly') {
        const y = dt.getFullYear();
        const m = dt.getMonth();
        key = `${y}-${m}`;
        label = dt.toLocaleDateString('en-US', { month: 'short' });
        sortKey = y * 100 + m;
      } else {
        const y = dt.getFullYear();
        const m = dt.getMonth();
        const d = dt.getDate();
        key = `${y}-${m}-${d}`;
        label = dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        sortKey = new Date(y, m, d).getTime();
      }

      let orderCost = 0;
      for (const item of order.items || []) {
        const unitCost = productCostMap.get(item.productId) ?? item.unitPrice * 0.35;
        orderCost += unitCost * (item.quantity || 1);
      }
      const orderProfit = Math.max(0, (order.totalAmount || 0) - (order.taxAmount || 0) - orderCost);

      const existing = buckets.get(key) || { label, sortKey, revenue: 0, profit: 0, orders: 0 };
      existing.revenue += order.totalAmount || 0;
      existing.profit += orderProfit;
      existing.orders += 1;
      buckets.set(key, existing);
    }

    return Array.from(buckets.values())
      .sort((a, b) => a.sortKey - b.sortKey)
      .map((row) => ({
        ...row,
        revenue: Number(row.revenue.toFixed(2)),
        profit: Number(row.profit.toFixed(2)),
      }));
  }, [filteredOrders, dateRange, productCostMap]);

  const productPerformanceData = useMemo(() => {
    const valid = filteredOrders.filter((o) => o.status !== 'CANCELLED' && !o.isRefunded);
    const map = new Map<
      string,
      { productId: string; name: string; qty: number; revenue: number; cogs: number }
    >();

    for (const order of valid) {
      for (const item of order.items || []) {
        const existing = map.get(item.productId) || {
          productId: item.productId,
          name: item.name,
          qty: 0,
          revenue: 0,
          cogs: 0,
        };
        const unitCost = productCostMap.get(item.productId) ?? item.unitPrice * 0.35;
        existing.qty += item.quantity || 1;
        existing.revenue += item.itemSubtotal || item.unitPrice * item.quantity;
        existing.cogs += unitCost * (item.quantity || 1);
        map.set(item.productId, existing);
      }
    }

    return Array.from(map.values())
      .map((row) => {
        const profit = Math.max(0, row.revenue - row.cogs);
        const marginPct = row.revenue > 0 ? (profit / row.revenue) * 100 : 0;
        return { ...row, profit, marginPct };
      })
      .sort((a, b) => b.revenue - a.revenue);
  }, [filteredOrders, productCostMap]);

  const paymentDistributionData = useMemo(() => {
    const valid = filteredOrders.filter((o) => o.status !== 'CANCELLED' && !o.isRefunded);
    const map = new Map<string, { method: string; label: string; value: number; count: number }>();

    for (const order of valid) {
      const m = order.paymentMethod || 'CASH';
      const existing = map.get(m) || {
        method: m,
        label: formatPaymentLabel(m),
        value: 0,
        count: 0,
      };
      existing.value += order.totalAmount || 0;
      existing.count += 1;
      map.set(m, existing);
    }

    return Array.from(map.values())
      .map((entry) => ({ ...entry, value: Number(entry.value.toFixed(2)) }))
      .sort((a, b) => b.value - a.value);
  }, [filteredOrders]);

  const salesLedgerLogs = useMemo(() => {
    return [...filteredOrders].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [filteredOrders]);

  const handleExportCSV = () => {
    if (!canExport) {
      showToastNotification('Export permission is required.', 'warning');
      return;
    }

    const headers = [
      'Order Number',
      'Date',
      'Type',
      'Status',
      'Cashier',
      'Payment Method',
      'Subtotal',
      'Discount',
      'Tax',
      'Total USD',
      'Refunded',
    ];

    const rows = salesLedgerLogs.map((o) => [
      escapeCsvCell(o.orderNumber),
      escapeCsvCell(new Date(o.createdAt).toLocaleString()),
      escapeCsvCell(o.type),
      escapeCsvCell(o.status),
      escapeCsvCell(o.cashierName),
      escapeCsvCell(formatPaymentLabel(o.paymentMethod)),
      escapeCsvCell((o.subtotal || 0).toFixed(2)),
      escapeCsvCell((o.discountAmount || 0).toFixed(2)),
      escapeCsvCell((o.taxAmount || 0).toFixed(2)),
      escapeCsvCell((o.totalAmount || 0).toFixed(2)),
      escapeCsvCell(o.isRefunded ? `YES (${o.refundReason || 'Refunded'})` : 'NO'),
    ]);

    const csv = '\uFEFF' + [headers.map(escapeCsvCell).join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `aura-pos-report-${dateRange.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    showToastNotification(`Exported ${salesLedgerLogs.length} orders to CSV.`, 'success');
  };

  const handlePrintPDF = () => {
    if (!canExport) {
      showToastNotification('Export permission is required.', 'warning');
      return;
    }
    window.print();
  };

  return (
    <div className="space-y-6 pb-20 lg:pb-8">
      <PageHeader
        icon={<BarChart3 className="w-6 h-6" />}
        title={t('reports')}
        subtitle={t('reportsSub')}
        badge="P&L Analytics"
        actions={
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <button
              type="button"
              onClick={() => void loadReports(true)}
              disabled={refreshing}
              className="px-3.5 py-2.5 rounded-xl bg-zinc-900/70 hover:bg-zinc-800 border border-white/10 text-zinc-200 text-xs font-semibold flex items-center gap-2 transition-all disabled:opacity-60"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-amber-400' : ''}`} />
              <span className="hidden sm:inline">{t('refresh')}</span>
            </button>

            {canExport && (
              <>
                <button
                  type="button"
                  onClick={handlePrintPDF}
                  className="px-3.5 py-2.5 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 border border-white/10 text-zinc-200 text-xs font-bold flex items-center gap-2 transition-all"
                >
                  <Printer className="w-4 h-4 text-amber-400" />
                  Print PDF
                </button>
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="px-4 py-2.5 rounded-xl gold-gradient-bg text-zinc-950 text-xs font-black flex items-center gap-2 shadow-lg shadow-amber-500/20 hover:brightness-110 transition-all"
                >
                  <Download className="w-4 h-4" />
                  Export CSV
                </button>
              </>
            )}
          </div>
        }
      />

      {/* Period Filter & Sub-Tabs */}
      <div className="glass-card p-3 sm:p-4 rounded-2xl flex flex-col lg:flex-row gap-3 lg:items-center justify-between print:hidden">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
          {(['Overview', 'Products', 'Payments', 'Ledger'] as ReportTab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                activeTab === tab
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                  : 'bg-zinc-900/60 text-zinc-400 border-white/10 hover:text-zinc-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto">
          <Calendar className="w-4 h-4 text-zinc-500 mr-1 flex-shrink-0" />
          {(['Today', 'Weekly', 'Monthly', 'Yearly'] as DateRangeOption[]).map((range) => (
            <button
              key={range}
              type="button"
              onClick={() => setDateRange(range)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border ${
                dateRange === range
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                  : 'bg-zinc-900/60 text-zinc-400 border-white/10 hover:text-zinc-200'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label="Gross Revenue"
          value={`$${kpis.grossRevenue.toFixed(2)}`}
          subtext={`${kpis.orderCount} paid orders`}
          icon={<DollarSign className="w-5 h-5" />}
          accent="amber"
        />
        <StatCard
          label="Estimated Profit"
          value={`$${kpis.grossProfit.toFixed(2)}`}
          subtext={`${kpis.marginPct.toFixed(1)}% net margin`}
          icon={<TrendingUp className="w-5 h-5" />}
          accent="emerald"
        />
        <StatCard
          label="Avg Ticket"
          value={`$${kpis.avgTicket.toFixed(2)}`}
          subtext={`Tax: $${kpis.totalTax.toFixed(2)}`}
          icon={<ShoppingBag className="w-5 h-5" />}
          accent="blue"
        />
        <StatCard
          label="KHQR & Digital"
          value={`${kpis.digitalShare.toFixed(1)}%`}
          subtext={
            kpis.refundedCount > 0
              ? `${kpis.refundedCount} refunded ($${kpis.refundedAmount.toFixed(2)})`
              : `Discounts: $${kpis.totalDiscounts.toFixed(2)}`
          }
          icon={<QrCode className="w-5 h-5" />}
          accent="purple"
        />
      </div>

      {loading ? (
        <div className="glass-card rounded-2xl p-12 text-center text-zinc-400 text-sm">
          Calculating financial intelligence...
        </div>
      ) : (
        <>
          {/* Overview Tab */}
          {activeTab === 'Overview' && (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
              <div className="xl:col-span-8 glass-card p-5 rounded-2xl space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-base font-bold text-white">Revenue vs Gross Profit</h3>
                    <p className="text-xs text-zinc-400">
                      Period breakdown for <span className="text-amber-300 font-semibold">{dateRange}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="flex items-center gap-1.5 text-zinc-300">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> Revenue
                    </span>
                    <span className="flex items-center gap-1.5 text-zinc-300">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" /> Profit
                    </span>
                  </div>
                </div>

                {financialTrendData.length === 0 ? (
                  <div className="h-72 flex items-center justify-center text-zinc-500 text-sm">
                    No completed orders in this timeframe.
                  </div>
                ) : (
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={financialTrendData} margin={{ top: 10, right: 10, left: -12, bottom: 0 }}>
                        <defs>
                          <linearGradient id="reportRevGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.95} />
                            <stop offset="100%" stopColor="#d97706" stopOpacity={0.4} />
                          </linearGradient>
                          <linearGradient id="reportProfitGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#34d399" stopOpacity={0.9} />
                            <stop offset="100%" stopColor="#059669" stopOpacity={0.35} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                        <XAxis dataKey="label" stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} />
                        <YAxis stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                        <Tooltip
                          cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                          contentStyle={{
                            backgroundColor: '#12131a',
                            borderColor: 'rgba(255,255,255,0.12)',
                            borderRadius: '14px',
                            fontSize: '12px',
                            color: '#fff',
                          }}
                        />
                        <Bar dataKey="revenue" name="Revenue ($)" fill="url(#reportRevGrad)" radius={[6, 6, 0, 0]} maxBarSize={36} />
                        <Bar dataKey="profit" name="Est. Profit ($)" fill="url(#reportProfitGrad)" radius={[6, 6, 0, 0]} maxBarSize={36} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              <div className="xl:col-span-4 glass-card p-5 rounded-2xl space-y-4">
                <div>
                  <h3 className="text-base font-bold text-white">P&L Summary</h3>
                  <p className="text-xs text-zinc-400">Unit economics snapshot</p>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between py-2 border-b border-white/[0.06]">
                    <span className="text-zinc-400">Collected Revenue</span>
                    <span className="font-bold text-white tabular-nums">${kpis.grossRevenue.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-white/[0.06]">
                    <span className="text-zinc-400">Discounts Granted</span>
                    <span className="font-semibold text-amber-300 tabular-nums">-${kpis.totalDiscounts.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-white/[0.06]">
                    <span className="text-zinc-400">VAT / Sales Tax</span>
                    <span className="font-semibold text-zinc-300 tabular-nums">-${kpis.totalTax.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-white/[0.06]">
                    <span className="text-zinc-400">Estimated COGS</span>
                    <span className="font-semibold text-rose-300 tabular-nums">-${kpis.totalCogs.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <span className="font-bold text-emerald-300">Net Est. Profit</span>
                    <span className="text-lg font-black text-emerald-400 tabular-nums">
                      ${kpis.grossProfit.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Products Performance Tab */}
          {activeTab === 'Products' && (
            <div className="space-y-4">
              {productPerformanceData.length === 0 ? (
                <div className="glass-card rounded-2xl p-12 text-center text-zinc-500 text-sm">
                  No product sales recorded in this period.
                </div>
              ) : (
                <>
                  {/* Mobile Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:hidden">
                    {productPerformanceData.map((row, idx) => (
                      <div key={row.productId} className="glass-card p-4 rounded-2xl space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 font-black text-xs flex items-center justify-center flex-shrink-0">
                              #{idx + 1}
                            </span>
                            <h4 className="font-bold text-sm text-white truncate">{row.name}</h4>
                          </div>
                          <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold tabular-nums">
                            {row.marginPct.toFixed(0)}% margin
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/10 text-xs">
                          <div>
                            <span className="text-zinc-500 block">Sold</span>
                            <span className="font-bold text-white tabular-nums">{row.qty}</span>
                          </div>
                          <div>
                            <span className="text-zinc-500 block">Revenue</span>
                            <span className="font-bold text-amber-300 tabular-nums">${row.revenue.toFixed(2)}</span>
                          </div>
                          <div>
                            <span className="text-zinc-500 block">Profit</span>
                            <span className="font-bold text-emerald-400 tabular-nums">${row.profit.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop Table */}
                  <div className="hidden lg:block glass-card rounded-2xl overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-white/10 text-[11px] uppercase tracking-wider text-zinc-400 font-bold">
                          <th className="py-3.5 px-5">Rank</th>
                          <th className="py-3.5 px-4">Product Name</th>
                          <th className="py-3.5 px-4 text-right">Units Sold</th>
                          <th className="py-3.5 px-4 text-right">Revenue</th>
                          <th className="py-3.5 px-4 text-right">Est. COGS</th>
                          <th className="py-3.5 px-4 text-right">Est. Profit</th>
                          <th className="py-3.5 px-5 text-right">Margin</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.06] text-sm">
                        {productPerformanceData.map((row, idx) => (
                          <tr key={row.productId} className="hover:bg-white/[0.03] transition-colors">
                            <td className="py-3.5 px-5 font-black text-amber-400 tabular-nums">#{idx + 1}</td>
                            <td className="py-3.5 px-4 font-bold text-white">{row.name}</td>
                            <td className="py-3.5 px-4 text-right text-zinc-200 font-semibold tabular-nums">{row.qty}</td>
                            <td className="py-3.5 px-4 text-right font-bold text-amber-300 tabular-nums">
                              ${row.revenue.toFixed(2)}
                            </td>
                            <td className="py-3.5 px-4 text-right text-zinc-400 tabular-nums">
                              ${row.cogs.toFixed(2)}
                            </td>
                            <td className="py-3.5 px-4 text-right font-bold text-emerald-400 tabular-nums">
                              ${row.profit.toFixed(2)}
                            </td>
                            <td className="py-3.5 px-5 text-right">
                              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold tabular-nums">
                                {row.marginPct.toFixed(1)}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Payments Share Tab */}
          {activeTab === 'Payments' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              <div className="lg:col-span-6 glass-card p-5 rounded-2xl">
                <div className="flex items-center gap-2 mb-4">
                  <CreditCard className="w-5 h-5 text-amber-400" />
                  <h3 className="text-base font-bold text-white">Payment Tender Distribution</h3>
                </div>
                {paymentDistributionData.length === 0 ? (
                  <div className="h-72 flex items-center justify-center text-zinc-500 text-sm">
                    No payment data in selected timeframe.
                  </div>
                ) : (
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={paymentDistributionData}
                          dataKey="value"
                          nameKey="label"
                          cx="50%"
                          cy="50%"
                          innerRadius={62}
                          outerRadius={95}
                          paddingAngle={3}
                        >
                          {paymentDistributionData.map((entry, idx) => (
                            <Cell key={entry.method} fill={PAYMENT_COLORS[idx % PAYMENT_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(val: number) => [`$${Number(val).toFixed(2)}`, 'Collected']}
                          contentStyle={{
                            backgroundColor: '#12131a',
                            borderColor: 'rgba(255,255,255,0.12)',
                            borderRadius: '12px',
                            color: '#fff',
                            fontSize: '12px',
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: '12px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              <div className="lg:col-span-6 glass-card p-5 rounded-2xl space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <Layers className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-base font-bold text-white">Channel Breakdown</h3>
                </div>
                {paymentDistributionData.map((item, idx) => {
                  const pct = kpis.grossRevenue > 0 ? (item.value / kpis.grossRevenue) * 100 : 0;
                  return (
                    <div key={item.method} className="p-3.5 rounded-xl bg-zinc-900/60 border border-white/10 space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-bold text-white flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: PAYMENT_COLORS[idx % PAYMENT_COLORS.length] }}
                          />
                          {item.label}
                        </span>
                        <span className="font-black text-amber-300 tabular-nums">${item.value.toFixed(2)}</span>
                      </div>
                      <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.min(100, pct)}%`,
                            backgroundColor: PAYMENT_COLORS[idx % PAYMENT_COLORS.length],
                          }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-zinc-400">
                        <span>{item.count} transactions</span>
                        <span className="tabular-nums">{pct.toFixed(1)}% share</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Sales Ledger Tab */}
          {activeTab === 'Ledger' && (
            <div className="space-y-4">
              {salesLedgerLogs.length === 0 ? (
                <div className="glass-card rounded-2xl p-12 text-center space-y-2">
                  <FileSpreadsheet className="w-10 h-10 text-zinc-600 mx-auto" />
                  <p className="text-zinc-300 font-semibold">No ledger transactions found</p>
                </div>
              ) : (
                <>
                  {/* Mobile Ledger Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:hidden">
                    {salesLedgerLogs.map((order) => (
                      <div key={order.id} className="glass-card p-4 rounded-2xl space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="font-mono font-bold text-sm text-amber-300">
                              {order.orderNumber}
                            </span>
                            <p className="text-[11px] text-zinc-500">
                              {new Date(order.createdAt).toLocaleString()}
                            </p>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                              order.isRefunded || order.status === 'CANCELLED'
                                ? 'bg-red-500/15 text-red-300 border-red-500/30'
                                : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                            }`}
                          >
                            {order.isRefunded ? 'REFUNDED' : order.status}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs text-zinc-400 pt-2 border-t border-white/10">
                          <span>{formatPaymentLabel(order.paymentMethod)}</span>
                          <span className="text-base font-black text-white tabular-nums">
                            ${(order.totalAmount || 0).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop Ledger Table */}
                  <div className="hidden lg:block glass-card rounded-2xl overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-white/10 text-[11px] uppercase tracking-wider text-zinc-400 font-bold">
                          <th className="py-3.5 px-5">Ticket #</th>
                          <th className="py-3.5 px-4">Timestamp</th>
                          <th className="py-3.5 px-4">Cashier</th>
                          <th className="py-3.5 px-4">Method</th>
                          <th className="py-3.5 px-4">Status</th>
                          <th className="py-3.5 px-5 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.06] text-sm">
                        {salesLedgerLogs.map((order) => (
                          <tr key={order.id} className="hover:bg-white/[0.03] transition-colors">
                            <td className="py-3.5 px-5 font-mono font-bold text-amber-300">
                              {order.orderNumber}
                            </td>
                            <td className="py-3.5 px-4 text-xs text-zinc-400">
                              {new Date(order.createdAt).toLocaleString()}
                            </td>
                            <td className="py-3.5 px-4 text-zinc-200">{order.cashierName}</td>
                            <td className="py-3.5 px-4 text-xs text-zinc-300">
                              {formatPaymentLabel(order.paymentMethod)}
                            </td>
                            <td className="py-3.5 px-4">
                              <span
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${
                                  order.isRefunded || order.status === 'CANCELLED'
                                    ? 'bg-red-500/15 text-red-300 border-red-500/30'
                                    : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                                }`}
                              >
                                {order.isRefunded ? 'REFUNDED' : order.status}
                              </span>
                            </td>
                            <td className="py-3.5 px-5 text-right font-black text-white tabular-nums">
                              ${(order.totalAmount || 0).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};
