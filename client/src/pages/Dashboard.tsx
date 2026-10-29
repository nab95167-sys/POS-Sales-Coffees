import React from 'react';
import { 
  DollarSign, ShoppingBag, Users, AlertTriangle, TrendingUp, 
  ArrowUpRight, Coffee, PackageCheck, Award, Globe, MapPin
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, 
  Tooltip, CartesianGrid, BarChart, Bar 
} from 'recharts';
import { SALES_ANALYTICS_DATA, INITIAL_PRODUCTS, INITIAL_INGREDIENTS } from '../services/mockData';
import { WORLDWIDE_BRANCHES } from '../services/worldwideBranches';

export const Dashboard: React.FC = () => {
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
      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Today's Sales */}
        <div className="p-5 rounded-3xl bg-stone-900/80 border border-amber-700/30 glass-card shadow-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-400">Global Chain Sales Today</span>
            <div className="w-9 h-9 rounded-2xl bg-amber-600/20 text-amber-400 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
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

        {/* Total Orders */}
        <div className="p-5 rounded-3xl bg-stone-900/80 border border-stone-800 glass-card shadow-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-400">Total Global Orders</span>
            <div className="w-9 h-9 rounded-2xl bg-blue-600/20 text-blue-400 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5" />
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

        {/* Active Customers */}
        <div className="p-5 rounded-3xl bg-stone-900/80 border border-stone-800 glass-card shadow-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-400">Worldwide CRM Members</span>
            <div className="w-9 h-9 rounded-2xl bg-purple-600/20 text-purple-400 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <h3 className="text-2xl font-extrabold text-stone-100 font-mono">48,920</h3>
            <span className="text-xs font-bold text-purple-400">Global Gold Tier</span>
          </div>
          <p className="text-[11px] text-stone-500">840 new signups today</p>
        </div>

        {/* Low Stock Alerts */}
        <div className="p-5 rounded-3xl bg-stone-900/80 border border-stone-800 glass-card shadow-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-400">Branch Stock Warnings</span>
            <div className="w-9 h-9 rounded-2xl bg-red-600/20 text-red-400 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
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
    </div>
  );
};
