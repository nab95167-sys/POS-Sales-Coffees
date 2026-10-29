import React, { useState } from 'react';
import { 
  BarChart3, Download, Calendar, DollarSign, FileSpreadsheet, FileText, 
  TrendingUp, TrendingDown, PieChart as PieIcon, CreditCard, ShoppingBag, 
  Printer, ArrowUpRight, Coffee, Award, Filter
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell, 
  XAxis, YAxis, Tooltip, CartesianGrid, Legend 
} from 'recharts';

export const ReportsPage: React.FC = () => {
  const [dateRange, setDateRange] = useState<'Today' | 'Weekly' | 'Monthly' | 'Yearly'>('Weekly');
  const [activeTab, setActiveTab] = useState<'Overview' | 'Products' | 'Payments' | 'Ledger'>('Overview');

  // Revenue & Profit Trend Data
  const financialTrendData = [
    { period: 'Mon', revenue: 1420, cost: 480, profit: 940, orders: 142 },
    { period: 'Tue', revenue: 1610, cost: 510, profit: 1100, orders: 158 },
    { period: 'Wed', revenue: 1842, cost: 590, profit: 1252, orders: 184 },
    { period: 'Thu', revenue: 1750, cost: 560, profit: 1190, orders: 170 },
    { period: 'Fri', revenue: 2100, cost: 670, profit: 1430, orders: 215 },
    { period: 'Sat', revenue: 2890, cost: 920, profit: 1970, orders: 290 },
    { period: 'Sun', revenue: 2650, cost: 840, profit: 1810, orders: 262 },
  ];

  // Top Product Sales Volume
  const productPerformanceData = [
    { name: 'Caramel Macchiato', quantity: 245, revenue: 1041.25, category: 'Espresso' },
    { name: 'Artisan Iced Latte', quantity: 310, revenue: 1193.50, category: 'Espresso' },
    { name: 'Nitro Cold Brew', quantity: 180, revenue: 891.00, category: 'Cold Brew' },
    { name: 'Uji Matcha Latte', quantity: 140, revenue: 665.00, category: 'Tea' },
    { name: 'Butter Croissant', quantity: 210, revenue: 577.50, category: 'Bakery' },
  ];

  // Payment Distribution Data
  const paymentDistributionData = [
    { name: 'ABA KHQR', value: 6850, color: '#ef4444' },
    { name: 'Cash (USD)', value: 4210, color: '#10b981' },
    { name: 'Credit Card', value: 2140, color: '#3b82f6' },
    { name: 'Bakong / Wing', value: 1062, color: '#f59e0b' },
  ];

  // Sales Ledger Logs
  const salesLedgerLogs = [
    { id: 'ORD-8824', date: '2026-08-05 14:32', cashier: 'Sokha Ly', items: 3, method: 'ABA KHQR', total: 15.34, status: 'Completed' },
    { id: 'ORD-8823', date: '2026-08-05 14:15', cashier: 'Sokha Ly', items: 1, method: 'Cash', total: 4.25, status: 'Completed' },
    { id: 'ORD-8822', date: '2026-08-05 13:58', cashier: 'Alex Wright', items: 4, method: 'Credit Card', total: 22.80, status: 'Completed' },
    { id: 'ORD-8821', date: '2026-08-05 13:40', cashier: 'Sokha Ly', items: 2, method: 'Bakong', total: 9.75, status: 'Completed' },
    { id: 'ORD-8820', date: '2026-08-05 13:12', cashier: 'Alex Wright', items: 5, method: 'ABA KHQR', total: 28.50, status: 'Completed' },
  ];

  // Export CSV
  const handleExportCSV = () => {
    const csvContent =
      "data:text/csv;charset=utf-8,Period,Gross Revenue ($),Cost of Goods ($),Net Profit ($),Orders Count\n" +
      financialTrendData.map((e) => `${e.period},${e.revenue},${e.cost},${e.profit},${e.orders}`).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Aura_Coffee_Financial_Report_${dateRange}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
            <p className="text-xs text-stone-400">Profit & loss breakdown, sales velocity & audit ledger</p>
          </div>
        </div>

        {/* Date Filter & Export Action Bar */}
        <div className="flex items-center space-x-2">
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
            <h3 className="text-2xl font-extrabold text-stone-100 font-mono">$14,262.00</h3>
            <span className="text-xs font-bold text-emerald-400 flex items-center">
              <TrendingUp className="w-3.5 h-3.5 mr-1" />
              +18.4%
            </span>
          </div>
          <p className="text-[11px] text-stone-500">1,421 total orders fulfilled</p>
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
            <h3 className="text-2xl font-extrabold text-emerald-400 font-mono">$9,692.00</h3>
            <span className="text-xs font-bold text-emerald-300">67.9% Margin</span>
          </div>
          <p className="text-[11px] text-stone-500">COGS: $4,570.00</p>
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
            <h3 className="text-2xl font-extrabold text-stone-100 font-mono">$10.04</h3>
            <span className="text-xs font-bold text-blue-400">+2.1 items/order</span>
          </div>
          <p className="text-[11px] text-stone-500">VAT Collected: $1,296.50</p>
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
            <h3 className="text-2xl font-extrabold text-red-400 font-mono">48.0%</h3>
            <span className="text-xs font-bold text-stone-300">$6,850 via KHQR</span>
          </div>
          <p className="text-[11px] text-stone-500">Highest cashless conversion rate</p>
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
                <p className="text-xs text-stone-400">Weekly financial performance comparative view</p>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/40 px-3 py-1 rounded-full border border-emerald-900/40">
                Profit Margin: 67.9%
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
              <p className="text-xs text-stone-400">Key performance indicators summary</p>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div className="p-3 bg-stone-950 rounded-2xl border border-stone-800 flex justify-between">
                <span className="text-stone-400">Total Sales</span>
                <span className="font-bold text-stone-100">$14,262.00</span>
              </div>
              <div className="p-3 bg-stone-950 rounded-2xl border border-stone-800 flex justify-between text-red-400">
                <span>COGS Expense</span>
                <span className="font-bold">-$4,570.00</span>
              </div>
              <div className="p-3 bg-stone-950 rounded-2xl border border-stone-800 flex justify-between text-emerald-400 font-bold text-sm">
                <span>Gross Operating Profit</span>
                <span>$9,692.00</span>
              </div>
              <div className="p-3 bg-stone-950 rounded-2xl border border-stone-800 flex justify-between text-amber-400">
                <span>Estimated VAT Tax (10%)</span>
                <span>$1,296.50</span>
              </div>
            </div>

            <div className="p-4 bg-amber-950/30 border border-amber-700/40 rounded-2xl text-xs text-amber-300">
              💡 <span className="font-bold">Insight:</span> Weekend sales generated 40% of total revenue. Recommended to schedule extra barista shifts on Sat/Sun.
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
                {productPerformanceData.map((prod, idx) => (
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
                      {((prod.revenue / 14262) * 100).toFixed(1)}%
                    </td>
                  </tr>
                ))}
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
                      {((pay.value / 14262) * 100).toFixed(1)}% of total
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
                {salesLedgerLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-stone-800/30">
                    <td className="p-4 font-mono font-bold text-amber-400">{log.id}</td>
                    <td className="p-4 text-stone-300 font-mono">{log.date}</td>
                    <td className="p-4 font-medium text-stone-200">{log.cashier}</td>
                    <td className="p-4 font-mono text-stone-300">{log.items} Items</td>
                    <td className="p-4 font-semibold text-stone-300">{log.method}</td>
                    <td className="p-4 font-mono font-extrabold text-emerald-400">${log.total.toFixed(2)}</td>
                    <td className="p-4">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
