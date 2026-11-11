import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BarChart3, Calendar, DollarSign, FileSpreadsheet,
  TrendingUp, CreditCard, ShoppingBag, Printer, RefreshCw
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend
} from 'recharts';
import { fetchOrders } from '../services/orderService';
import { useProducts } from '../context/ProductContext';
import { useAuth } from '../context/AuthContext';
import { Order } from '../types';

export const ReportsPage: React.FC = () => {
  const { products } = useProducts();
  const { hasGranularPermission } = useAuth();
  const canExport = hasGranularPermission('reports:export');

  const [dateRange, setDateRange] = useState<'Today' | 'Weekly' | 'Monthly' | 'Yearly'>('Weekly');
  const [activeTab, setActiveTab] = useState<'Overview' | 'Products' | 'Payments' | 'Ledger'>('Overview');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      const list = await fetchOrders({ limit: 500 });
      setOrders(list);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  const filteredOrders = useMemo(() => {
    const now = new Date();
    const todayIso = now.toISOString().slice(0, 10);
    const daysLimit = dateRange === 'Today' ? 0 : dateRange === 'Weekly' ? 7 : dateRange === 'Monthly' ? 30 : 365;
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - daysLimit);
    const cutoffMs = cutoff.getTime();

    return orders.filter((o) => {
      if (dateRange === 'Today') return o.createdAt.startsWith(todayIso);
      return new Date(o.createdAt).getTime() >= cutoffMs;
    });
  }, [orders, dateRange]);

  const validOrders = useMemo(() => filteredOrders.filter((o) => !o.isRefunded), [filteredOrders]);

  const productCostMap = useMemo(
    () => new Map(products.map((p) => [p.id, { costPrice: p.costPrice, category: p.categoryName || 'Menu' }])),
    [products]
  );

  const kpis = useMemo(() => {
    let grossRevenue = 0;
    let totalCogs = 0;
    let totalTax = 0;
    let khqrSales = 0;
    let cashSales = 0;
    let cardSales = 0;
    let otherWalletSales = 0;
    let totalItems = 0;

    for (const o of validOrders) {
      grossRevenue += o.totalAmount;
      totalTax += o.taxAmount || 0;

      for (const item of o.items) {
        totalItems += item.quantity;
        const meta = productCostMap.get(item.productId);
        totalCogs += (meta ? meta.costPrice : item.unitPrice * 0.32) * item.quantity;
      }

      if (o.splitPayments && o.splitPayments.length > 0) {
        for (const sp of o.splitPayments) {
          if (sp.method === 'ABA_KHQR') khqrSales += sp.amount;
          else if (sp.method === 'CASH') cashSales += sp.amount;
          else if (sp.method === 'CREDIT_CARD') cardSales += sp.amount;
          else otherWalletSales += sp.amount;
        }
      } else {
        const m = o.paymentMethod || 'CASH';
        if (m === 'ABA_KHQR') khqrSales += o.totalAmount;
        else if (m === 'CASH') cashSales += o.totalAmount;
        else if (m === 'CREDIT_CARD') cardSales += o.totalAmount;
        else otherWalletSales += o.totalAmount;
      }
    }

    const netProfit = grossRevenue - totalCogs - totalTax;
    const marginPercent = grossRevenue > 0 ? (netProfit / grossRevenue) * 100 : 0;
    const avgTicket = validOrders.length > 0 ? grossRevenue / validOrders.length : 0;
    const avgItems = validOrders.length > 0 ? totalItems / validOrders.length : 0;
    const khqrPercent = grossRevenue > 0 ? (khqrSales / grossRevenue) * 100 : 0;

    return {
      grossRevenue,
      totalCogs,
      totalTax,
      netProfit,
      marginPercent,
      avgTicket,
      avgItems,
      khqrSales,
      cashSales,
      cardSales,
      otherWalletSales,
      khqrPercent,
    };
  }, [validOrders, productCostMap]);

  const salesLedgerLogs = useMemo(
    () =>
      filteredOrders.map((o) => ({
        id: o.orderNumber,
        date: new Date(o.createdAt).toLocaleString([], { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
        cashier: o.cashierName,
        items: o.items.reduce((s, it) => s + it.quantity, 0),
        method: o.paymentMethod ? o.paymentMethod.replace('_', ' ') : 'Cash',
        total: o.totalAmount,
        isRefunded: Boolean(o.isRefunded),
        status: o.isRefunded ? 'Refunded' : o.status,
      })),
    [filteredOrders]
  );

  // Revenue & Profit Trend Data aggregated by date
  const financialTrendData = useMemo(() => {
    const grouped = new Map<string, { period: string; revenue: number; cost: number; profit: number; orders: number }>();
    for (const o of [...validOrders].reverse()) {
      const key = o.createdAt.slice(0, 10);
      const label = new Date(o.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      let entry = grouped.get(key);
      if (!entry) {
        entry = { period: label, revenue: 0, cost: 0, profit: 0, orders: 0 };
        grouped.set(key, entry);
      }
      let orderCost = 0;
      for (const item of o.items) {
        const meta = productCostMap.get(item.productId);
        orderCost += (meta ? meta.costPrice : item.unitPrice * 0.32) * item.quantity;
      }
      entry.revenue = Number((entry.revenue + o.totalAmount).toFixed(2));
      entry.cost = Number((entry.cost + orderCost).toFixed(2));
      entry.profit = Number((entry.revenue - entry.cost).toFixed(2));
      entry.orders += 1;
    }
    return Array.from(grouped.values()).slice(-14);
  }, [validOrders, productCostMap]);

  // Top Product Sales Volume aggregated from real orders
  const productPerformanceData = useMemo(() => {
    const map = new Map<string, { name: string; quantity: number; revenue: number; category: string }>();
    for (const o of validOrders) {
      for (const item of o.items) {
        const meta = productCostMap.get(item.productId);
        const existing = map.get(item.productId);
        if (existing) {
          existing.quantity += item.quantity;
          existing.revenue += item.itemSubtotal;
        } else {
          map.set(item.productId, {
            name: item.name,
            quantity: item.quantity,
            revenue: item.itemSubtotal,
            category: meta?.category || 'Beverage',
          });
        }
      }
    }
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 20);
  }, [validOrders, productCostMap]);

  // Payment Distribution Data
  const paymentDistributionData = useMemo(
    () => [
      { name: 'ABA KHQR', value: Number(kpis.khqrSales.toFixed(2)), color: '#ef4444' },
      { name: 'Cash (USD)', value: Number(kpis.cashSales.toFixed(2)), color: '#10b981' },
      { name: 'Credit Card', value: Number(kpis.cardSales.toFixed(2)), color: '#3b82f6' },
      { name: 'Bakong / Wing', value: Number(kpis.otherWalletSales.toFixed(2)), color: '#f59e0b' },
    ],
    [kpis]
  );

  // Export CSV (neutralize leading formula characters)
  const handleExportCSV = () => {
    const escapeCell = (v: string | number) => {
      const s = String(v);
      const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
      return `"${safe.replace(/"/g, '""')}"`;
    };
    const rows = [
      ['Period', 'Gross Revenue ($)', 'Cost of Goods ($)', 'Net Profit ($)', 'Orders Count'],
      ...financialTrendData.map((e) => [e.period, e.revenue, e.cost, e.profit, e.orders]),
    ];
    const csvString = rows.map((r) => r.map(escapeCell).join(',')).join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Aura_Coffee_Financial_Report_${dateRange}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Export PDF / Print Official Statement
  const handlePrintPDF = () => {
    window.print();
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Top Header Bar & Control Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-stone-900/80 p-4 rounded-3xl border border-stone-800 glass-panel">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-600/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-stone-100">Executive Financial & Sales Intelligence</h2>
            <p className="text-xs text-stone-400">Live SQLite P&L breakdown, sales velocity & transaction audit ledger</p>
          </div>
        </div>

        {/* Date Filter & Export Action Bar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Date Selector */}
          <div className="flex items-center bg-stone-950 p-1 rounded-2xl border border-stone-800">
            <Calendar className="w-3.5 h-3.5 text-amber-400 ml-2 mr-1" />
            {(['Today', 'Weekly', 'Monthly', 'Yearly'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setDateRange(r)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  dateRange === r
                    ? 'bg-amber-600 text-stone-950 shadow-md'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          <button
            onClick={() => void loadReports()}
            disabled={loading}
            className="px-3 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-700 font-bold text-xs flex items-center space-x-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          {canExport && (
            <>
              <button
                onClick={handleExportCSV}
                className="px-3.5 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-200 border border-stone-700 font-bold text-xs flex items-center space-x-1.5 transition-colors"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span>Excel / CSV</span>
              </button>

              <button
                onClick={handlePrintPDF}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs flex items-center space-x-1.5 transition-colors shadow-lg shadow-amber-900/30"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>PDF Statement</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Gross Revenue */}
        <div className="p-5 rounded-3xl bg-stone-900/80 border border-amber-700/30 glass-card shadow-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-400">Gross Sales Revenue</span>
            <div className="w-9 h-9 rounded-2xl bg-amber-600/20 text-amber-400 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <h3 className="text-2xl font-extrabold text-stone-100 font-mono">${kpis.grossRevenue.toFixed(2)}</h3>
            <span className="text-xs font-bold text-emerald-400 flex items-center">
              <TrendingUp className="w-3.5 h-3.5 mr-1" />
              {dateRange}
            </span>
          </div>
          <p className="text-[11px] text-stone-500">{validOrders.length} total orders fulfilled</p>
        </div>

        {/* Operating Profit */}
        <div className="p-5 rounded-3xl bg-stone-900/80 border border-stone-800 glass-card shadow-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-400">Net Operating Profit</span>
            <div className="w-9 h-9 rounded-2xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <h3 className="text-2xl font-extrabold text-emerald-400 font-mono">${kpis.netProfit.toFixed(2)}</h3>
            <span className="text-xs font-bold text-emerald-300">{kpis.marginPercent.toFixed(1)}% Margin</span>
          </div>
          <p className="text-[11px] text-stone-500">Est. COGS: ${kpis.totalCogs.toFixed(2)}</p>
        </div>

        {/* Avg Order Ticket */}
        <div className="p-5 rounded-3xl bg-stone-900/80 border border-stone-800 glass-card shadow-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-400">Average Ticket Size (AOV)</span>
            <div className="w-9 h-9 rounded-2xl bg-blue-600/20 text-blue-400 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <h3 className="text-2xl font-extrabold text-stone-100 font-mono">${kpis.avgTicket.toFixed(2)}</h3>
            <span className="text-xs font-bold text-blue-400">{kpis.avgItems.toFixed(1)} items/order</span>
          </div>
          <p className="text-[11px] text-stone-500">VAT Collected: ${kpis.totalTax.toFixed(2)}</p>
        </div>

        {/* ABA KHQR Ratio */}
        <div className="p-5 rounded-3xl bg-stone-900/80 border border-stone-800 glass-card shadow-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-400">Digital KHQR Ratio</span>
            <div className="w-9 h-9 rounded-2xl bg-red-600/20 text-red-400 flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <h3 className="text-2xl font-extrabold text-red-400 font-mono">{kpis.khqrPercent.toFixed(1)}%</h3>
            <span className="text-xs font-bold text-stone-300">${kpis.khqrSales.toFixed(2)} via KHQR</span>
          </div>
          <p className="text-[11px] text-stone-500">Live payment channel ratio</p>
        </div>
      </div>

      {/* Sub Navigation Tabs */}
      <div className="flex items-center space-x-2 border-b border-stone-800/80 pb-3">
        {(['Overview', 'Products', 'Payments', 'Ledger'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all ${
              activeTab === tab
                ? 'bg-amber-600/20 text-amber-400 border border-amber-500/40 shadow-md'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            {tab === 'Overview' && 'Financial Overview'}
            {tab === 'Products' && 'Product Sales Performance'}
            {tab === 'Payments' && 'Payment Method Share'}
            {tab === 'Ledger' && 'Transaction Sales Ledger'}
          </button>
        ))}
      </div>

      {/* Tab 1: Financial Overview */}
      {activeTab === 'Overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Sales & Profit Bar Chart */}
          <div className="lg:col-span-8 bg-stone-900/80 border border-stone-800 rounded-3xl p-6 glass-panel space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-stone-100">Revenue vs Cost Breakdown</h3>
                <p className="text-xs text-stone-400">{dateRange} financial performance comparative view</p>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/40 px-3 py-1 rounded-full border border-emerald-900/40">
                Profit Margin: {kpis.marginPercent.toFixed(1)}%
              </span>
            </div>

            <div className="h-80 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={financialTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#292524" />
                  <XAxis dataKey="period" stroke="#78716c" fontSize={11} />
                  <YAxis stroke="#78716c" fontSize={11} />
                  <Tooltip contentStyle={{ backgroundColor: '#1c1917', borderColor: '#78716c', borderRadius: '12px', color: '#f5f5f4' }} />
                  <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} />
                  <Bar dataKey="revenue" fill="#C68E17" radius={[6, 6, 0, 0]} name="Gross Revenue ($)" />
                  <Bar dataKey="cost" fill="#ef4444" radius={[6, 6, 0, 0]} name="Cost of Goods ($)" />
                  <Bar dataKey="profit" fill="#10b981" radius={[6, 6, 0, 0]} name="Net Profit ($)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Side Summary Breakdown */}
          <div className="lg:col-span-4 bg-stone-900/80 border border-stone-800 rounded-3xl p-6 glass-panel space-y-4 flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-bold text-stone-100">Profitability Analysis</h3>
              <p className="text-xs text-stone-400">SQLite period KPI summary</p>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div className="p-3 bg-stone-950 rounded-2xl border border-stone-800 flex justify-between">
                <span className="text-stone-400">Total Sales</span>
                <span className="font-bold text-stone-100">${kpis.grossRevenue.toFixed(2)}</span>
              </div>
              <div className="p-3 bg-stone-950 rounded-2xl border border-stone-800 flex justify-between text-red-400">
                <span>COGS Expense</span>
                <span className="font-bold">-${kpis.totalCogs.toFixed(2)}</span>
              </div>
              <div className="p-3 bg-stone-950 rounded-2xl border border-stone-800 flex justify-between text-emerald-400 font-bold text-sm">
                <span>Gross Operating Profit</span>
                <span>${kpis.netProfit.toFixed(2)}</span>
              </div>
              <div className="p-3 bg-stone-950 rounded-2xl border border-stone-800 flex justify-between text-amber-400">
                <span>VAT Tax Collected</span>
                <span>${kpis.totalTax.toFixed(2)}</span>
              </div>
            </div>

            <div className="p-4 bg-amber-950/30 border border-amber-700/40 rounded-2xl text-xs text-amber-300">
              <span className="font-bold">Top Channel:</span> {kpis.khqrPercent >= 50 ? 'ABA KHQR leads digital volume.' : 'Cash & Digital channels balanced.'}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Product Performance */}
      {activeTab === 'Products' && (
        <div className="bg-stone-900/80 border border-stone-800 rounded-3xl p-6 glass-panel space-y-4">
          <h3 className="text-lg font-bold text-stone-100">Top Performing Menu Products</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-950/80 text-stone-400 uppercase font-semibold border-b border-stone-800">
                <tr>
                  <th className="p-4">Rank & Item Name</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Units Sold</th>
                  <th className="p-4">Total Revenue Generated</th>
                  <th className="p-4">Share %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/80">
                {productPerformanceData.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-stone-500">
                      No product sales recorded for {dateRange}.
                    </td>
                  </tr>
                ) : (
                  productPerformanceData.map((prod, idx) => (
                    <tr key={prod.name} className="hover:bg-stone-800/30">
                      <td className="p-4 font-bold text-stone-100 text-sm flex items-center space-x-2">
                        <span className="w-6 h-6 rounded-full bg-amber-600/20 text-amber-400 font-mono text-xs flex items-center justify-center">
                          #{idx + 1}
                        </span>
                        <span>{prod.name}</span>
                      </td>
                      <td className="p-4 text-amber-300 font-medium">{prod.category}</td>
                      <td className="p-4 font-mono font-bold text-stone-200">{prod.quantity} Cups</td>
                      <td className="p-4 font-mono font-bold text-emerald-400">${prod.revenue.toFixed(2)}</td>
                      <td className="p-4 font-mono text-stone-400 font-semibold">
                        {kpis.grossRevenue > 0 ? ((prod.revenue / kpis.grossRevenue) * 100).toFixed(1) : '0.0'}%
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Payment Method Share */}
      {activeTab === 'Payments' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6 bg-stone-900/80 border border-stone-800 rounded-3xl p-6 glass-panel space-y-4">
            <h3 className="text-lg font-bold text-stone-100">Payment Channel Breakdown</h3>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={paymentDistributionData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                    {paymentDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#1c1917', borderColor: '#78716c', borderRadius: '12px', color: '#f5f5f4' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="lg:col-span-6 bg-stone-900/80 border border-stone-800 rounded-3xl p-6 glass-panel space-y-4 flex flex-col justify-center">
            <div className="space-y-3">
              {paymentDistributionData.map((pay) => (
                <div key={pay.name} className="p-4 rounded-2xl bg-stone-950 border border-stone-800 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: pay.color }}></div>
                    <span className="font-bold text-stone-200 text-sm">{pay.name}</span>
                  </div>
                  <div className="text-right font-mono">
                    <span className="text-amber-400 font-bold text-sm block">${pay.value.toFixed(2)}</span>
                    <span className="text-[10px] text-stone-400">
                      {kpis.grossRevenue > 0 ? ((pay.value / kpis.grossRevenue) * 100).toFixed(1) : '0.0'}% of total
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Detailed Sales Ledger */}
      {activeTab === 'Ledger' && (
        <div className="bg-stone-900/80 border border-stone-800 rounded-3xl p-6 glass-panel space-y-4">
          <h3 className="text-lg font-bold text-stone-100">Live Sales Transaction Audit Ledger</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-950/80 text-stone-400 uppercase font-semibold border-b border-stone-800">
                <tr>
                  <th className="p-4">Order ID</th>
                  <th className="p-4">Date & Time</th>
                  <th className="p-4">Cashier</th>
                  <th className="p-4">Items Count</th>
                  <th className="p-4">Payment Method</th>
                  <th className="p-4">Total Amount</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/80">
                {salesLedgerLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-stone-500">
                      No transactions recorded for {dateRange}.
                    </td>
                  </tr>
                ) : (
                  salesLedgerLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-stone-800/30">
                      <td className="p-4 font-mono font-bold text-amber-400">{log.id}</td>
                      <td className="p-4 text-stone-300 font-mono">{log.date}</td>
                      <td className="p-4 font-medium text-stone-200">{log.cashier}</td>
                      <td className="p-4 font-mono text-stone-300">{log.items} Items</td>
                      <td className="p-4 font-semibold text-stone-300">{log.method}</td>
                      <td className="p-4 font-mono font-extrabold text-emerald-400">${log.total.toFixed(2)}</td>
                      <td className="p-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                            log.isRefunded
                              ? 'bg-red-500/20 text-red-400 border-red-500/40'
                              : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                          }`}
                        >
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
