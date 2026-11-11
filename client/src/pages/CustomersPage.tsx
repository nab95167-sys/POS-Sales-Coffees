import React, { useEffect, useState } from 'react';
import { Users, Plus, Search, Star, Phone, Wallet, RefreshCw, X } from 'lucide-react';
import { Customer } from '../types';
import { apiFetch, ApiError } from '../services/api';
import { showToastNotification } from '../services/telegramBotService';

export const CustomersPage: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newTier, setNewTier] = useState<Customer['tier']>('Bronze');

  const loadCustomers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<{ customers: Customer[] }>('/api/v1/customers');
      setCustomers(data.customers);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCustomers();
  }, []);

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery) ||
      (c.email && c.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleAdjustPoints = async (customer: Customer) => {
    const ptsStr = prompt(
      `Adjust loyalty points for ${customer.name} (positive to award, negative to redeem):`,
      '100'
    );
    if (!ptsStr) return;
    const delta = parseInt(ptsStr, 10);
    if (isNaN(delta) || delta === 0) return;

    setError(null);
    try {
      const data = await apiFetch<{ customer: Customer }>(`/api/v1/customers/${customer.id}/points`, {
        method: 'PATCH',
        body: { delta: Math.max(-5000, Math.min(5000, delta)) },
      });
      setCustomers((prev) => prev.map((c) => (c.id === customer.id ? data.customer : c)));
      showToastNotification(
        `Updated ${data.customer.name}: ${data.customer.loyaltyPoints} pts (${data.customer.tier})`
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update loyalty points');
    }
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newPhone.trim()) return;
    setError(null);
    try {
      const data = await apiFetch<{ customer: Customer }>('/api/v1/customers', {
        method: 'POST',
        body: {
          name: newName.trim(),
          phone: newPhone.trim(),
          email: newEmail.trim() || undefined,
          tier: newTier,
        },
      });
      setCustomers((prev) => [data.customer, ...prev]);
      setNewName('');
      setNewPhone('');
      setNewEmail('');
      setNewTier('Bronze');
      setShowAddModal(false);
      showToastNotification(`Registered VIP Member: ${data.customer.name}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create customer');
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-stone-900/80 p-4 rounded-3xl border border-stone-800 glass-panel">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-600/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-stone-100">Customer Loyalty & CRM Portal</h2>
            <p className="text-xs text-stone-400">Live VIP members, reward points, tier upgrades & lifetime spend</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-stone-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search member by name or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 rounded-xl glass-input text-stone-100 text-xs w-64 focus:outline-none"
            />
          </div>

          <button
            onClick={() => void loadCustomers()}
            disabled={loading}
            className="px-3 py-2 rounded-xl bg-stone-900 border border-stone-700 text-stone-300 hover:bg-stone-800 font-bold text-xs flex items-center space-x-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs flex items-center space-x-1.5 shadow-lg shadow-amber-900/30 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add VIP Member</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-2xl bg-red-950/50 border border-red-700/50 text-red-300 text-xs font-semibold">
          {error}
        </div>
      )}

      {/* Customer Grid Cards */}
      {loading && customers.length === 0 ? (
        <div className="p-8 text-center text-stone-400 text-xs">Loading VIP customers...</div>
      ) : filteredCustomers.length === 0 ? (
        <div className="p-8 text-center text-stone-500 text-xs">No matching customers found.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCustomers.map((cust) => (
            <div key={cust.id} className="p-5 rounded-3xl bg-stone-900/80 border border-stone-800 glass-card space-y-4 shadow-xl relative group hover:border-amber-600/50 transition-all">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-700 to-yellow-500 flex items-center justify-center font-bold text-stone-950 text-base shadow-md">
                    {cust.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-stone-100 group-hover:text-amber-300 transition-colors">{cust.name}</h4>
                    <div className="flex items-center space-x-2 text-[11px] text-stone-400 mt-0.5">
                      <Phone className="w-3 h-3 text-amber-400" />
                      <span>{cust.phone}</span>
                    </div>
                  </div>
                </div>

                {/* Loyalty Tier Badge */}
                <span
                  className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider border shadow-md ${
                    cust.tier === 'Platinum'
                      ? 'bg-purple-950 text-purple-300 border-purple-500/50'
                      : cust.tier === 'Gold'
                      ? 'bg-amber-950 text-amber-300 border-amber-500/50'
                      : cust.tier === 'Silver'
                      ? 'bg-slate-800 text-slate-300 border-slate-500/50'
                      : 'bg-stone-800 text-stone-400 border-stone-700'
                  }`}
                >
                  {cust.tier} Member
                </span>
              </div>

              {/* Stats Breakdown */}
              <div className="grid grid-cols-2 gap-2 p-3 bg-stone-950 rounded-2xl border border-stone-800 text-xs">
                <div>
                  <span className="text-[10px] text-stone-500 block uppercase font-semibold">Reward Points</span>
                  <span className="text-amber-400 font-bold font-mono text-sm flex items-center space-x-1">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span>{cust.loyaltyPoints} pts</span>
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-stone-500 block uppercase font-semibold">Total Lifetime Spend</span>
                  <span className="text-stone-200 font-bold font-mono text-sm">${cust.totalSpent.toFixed(2)}</span>
                </div>
              </div>

              {/* Action Bar */}
              <div className="flex items-center justify-between pt-2 border-t border-stone-800 text-xs">
                <span className="text-[11px] text-stone-500">Last Visit: {cust.lastVisit || 'N/A'}</span>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => void handleAdjustPoints(cust)}
                    className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-amber-300 font-bold text-[11px] flex items-center space-x-1 border border-amber-600/30"
                  >
                    <Wallet className="w-3 h-3" />
                    <span>Adjust Points</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add VIP Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-stone-900 border border-stone-700 rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-stone-100">Register VIP Member</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-xl bg-stone-800 text-stone-400 hover:text-stone-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={(e) => void handleCreateCustomer(e)} className="space-y-3 text-xs">
              <div>
                <label className="block text-stone-400 font-semibold mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Sokha Chan"
                  className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-700 text-stone-100 focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-stone-400 font-semibold mb-1">Phone Number *</label>
                <input
                  type="text"
                  required
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="+855 12 345 678"
                  className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-700 text-stone-100 focus:outline-none focus:border-amber-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-400 font-semibold mb-1">Email (Optional)</label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="vip@email.com"
                    className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-700 text-stone-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-stone-400 font-semibold mb-1">Starting Tier</label>
                  <select
                    value={newTier}
                    onChange={(e) => setNewTier(e.target.value as Customer['tier'])}
                    className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-700 text-stone-100 focus:outline-none focus:border-amber-500"
                  >
                    <option value="Bronze">Bronze</option>
                    <option value="Silver">Silver</option>
                    <option value="Gold">Gold</option>
                    <option value="Platinum">Platinum</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-stone-800 text-stone-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold"
                >
                  Create Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
