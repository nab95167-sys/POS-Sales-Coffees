import React, { useEffect, useState } from 'react';
import { Users, Plus, Search, Star, Phone, Wallet, RefreshCw, X, Award, DollarSign } from 'lucide-react';
import { Customer } from '../types';
import { apiFetch, ApiError } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { showToastNotification } from '../services/telegramBotService';
import { PageHeader } from '../components/ui/PageHeader';
import { StatCard } from '../components/ui/StatCard';

export const CustomersPage: React.FC = () => {
  const { t } = useLanguage();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState<'ALL' | Customer['tier']>('ALL');

  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newTier, setNewTier] = useState<Customer['tier']>('Bronze');

  // Replace browser prompt() with clean modal
  const [pointsTarget, setPointsTarget] = useState<Customer | null>(null);
  const [pointsDelta, setPointsDelta] = useState<string>('100');
  const [pointsBusy, setPointsBusy] = useState(false);

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

  const filteredCustomers = customers.filter((c) => {
    const matchesTier = tierFilter === 'ALL' || c.tier === tierFilter;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      c.name.toLowerCase().includes(q) ||
      c.phone.includes(searchQuery) ||
      (c.email && c.email.toLowerCase().includes(q));
    return matchesTier && matchesSearch;
  });

  const handleSubmitPoints = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pointsTarget) return;
    const delta = parseInt(pointsDelta, 10);
    if (isNaN(delta) || delta === 0) return;

    setPointsBusy(true);
    setError(null);
    try {
      const data = await apiFetch<{ customer: Customer }>(`/api/v1/customers/${pointsTarget.id}/points`, {
        method: 'PATCH',
        body: { delta: Math.max(-5000, Math.min(5000, delta)) },
      });
      setCustomers((prev) => prev.map((c) => (c.id === pointsTarget.id ? data.customer : c)));
      showToastNotification(
        `Updated ${data.customer.name}: ${data.customer.loyaltyPoints} pts (${data.customer.tier})`,
        'success'
      );
      setPointsTarget(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update loyalty points');
    } finally {
      setPointsBusy(false);
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
      showToastNotification(`Registered VIP Member: ${data.customer.name}`, 'success');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create customer');
    }
  };

  const vipTopCount = customers.filter((c) => c.tier === 'Platinum' || c.tier === 'Gold').length;
  const totalPoints = customers.reduce((sum, c) => sum + c.loyaltyPoints, 0);
  const totalSpend = customers.reduce((sum, c) => sum + c.totalSpent, 0);

  return (
    <div className="space-y-5 font-sans">
      <PageHeader
        icon={<Users className="w-5 h-5" />}
        title={t('customers')}
        subtitle={t('customersSub')}
        badge={`${customers.length} Members`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void loadCustomers()}
              disabled={loading}
              className="px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-zinc-200 font-bold text-xs flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>{t('refresh')}</span>
            </button>
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 rounded-xl gold-gradient-bg hover:brightness-110 text-zinc-950 font-extrabold text-xs flex items-center gap-1.5 shadow-lg shadow-amber-900/25"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>{t('addMember')}</span>
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <StatCard label="Total Members" value={customers.length} subtext="CRM profiles" icon={<Users className="w-4 h-4" />} accent="amber" />
        <StatCard label="Gold & Platinum" value={vipTopCount} subtext="High-value regulars" icon={<Award className="w-4 h-4" />} accent="purple" />
        <StatCard label="Active Points" value={totalPoints.toLocaleString()} subtext="Redeemable rewards" icon={<Star className="w-4 h-4" />} accent="emerald" />
        <StatCard label="Lifetime Spend" value={`$${totalSpend.toFixed(2)}`} subtext="Total member revenue" icon={<DollarSign className="w-4 h-4" />} accent="blue" />
      </div>

      {/* Filter Toolbar */}
      <div className="glass-panel rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search member by name, email or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2 rounded-xl glass-input text-xs focus:outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2 text-zinc-400 hover:text-zinc-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto bg-[#0b0c10] p-1 rounded-xl border border-white/10">
          {(['ALL', 'Platinum', 'Gold', 'Silver', 'Bronze'] as const).map((tier) => (
            <button
              key={tier}
              type="button"
              onClick={() => setTierFilter(tier)}
              className={`px-3 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-colors ${
                tierFilter === tier ? 'bg-amber-500 text-zinc-950' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {tier === 'ALL' ? 'All Tiers' : tier}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/45 text-red-200 text-xs font-semibold">
          {error}
        </div>
      )}

      {loading && customers.length === 0 ? (
        <div className="p-10 text-center glass-card rounded-2xl text-zinc-400 text-xs">Loading VIP customers...</div>
      ) : filteredCustomers.length === 0 ? (
        <div className="p-10 text-center glass-card rounded-2xl text-zinc-500 text-xs">No matching customers found.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredCustomers.map((cust) => (
            <div key={cust.id} className="glass-card glass-card-hover rounded-2xl p-5 space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-xl gold-gradient-bg flex items-center justify-center font-black text-zinc-950 text-base flex-shrink-0 shadow-md">
                    {cust.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-extrabold text-zinc-100 truncate">{cust.name}</h4>
                    <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 mt-0.5">
                      <Phone className="w-3 h-3 text-amber-400" />
                      <span className="truncate">{cust.phone}</span>
                    </div>
                  </div>
                </div>

                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border flex-shrink-0 ${
                    cust.tier === 'Platinum'
                      ? 'bg-purple-500/15 text-purple-300 border-purple-500/40'
                      : cust.tier === 'Gold'
                      ? 'bg-amber-500/15 text-amber-300 border-amber-500/40'
                      : cust.tier === 'Silver'
                      ? 'bg-slate-500/15 text-slate-300 border-slate-500/40'
                      : 'bg-zinc-800 text-zinc-400 border-white/10'
                  }`}
                >
                  {cust.tier}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5 p-3 bg-[#0b0c10] rounded-xl border border-white/10 text-xs">
                <div>
                  <span className="text-[10px] text-zinc-500 block uppercase font-bold">Reward Points</span>
                  <span className="text-amber-400 font-bold font-mono text-sm flex items-center gap-1 mt-0.5">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span>{cust.loyaltyPoints} pts</span>
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 block uppercase font-bold">Lifetime Spend</span>
                  <span className="text-zinc-100 font-bold font-mono text-sm block mt-0.5">${cust.totalSpent.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2.5 border-t border-white/10 text-xs">
                <span className="text-[11px] text-zinc-500">Last Visit: {cust.lastVisit || 'N/A'}</span>
                <button
                  type="button"
                  onClick={() => {
                    setPointsTarget(cust);
                    setPointsDelta('100');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-amber-500 hover:text-zinc-950 text-amber-300 font-bold text-[11px] flex items-center gap-1.5 border border-amber-500/30 transition-colors"
                >
                  <Wallet className="w-3 h-3" />
                  <span>Adjust Points</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Adjust Points Modal (replaces prompt) */}
      {pointsTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
          onClick={() => setPointsTarget(null)}
        >
          <div
            className="w-full max-w-md glass-panel border border-amber-500/35 rounded-2xl p-6 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-zinc-100">Adjust Loyalty Points</h3>
                <p className="text-xs text-zinc-400">
                  {pointsTarget.name} • Current balance: <strong className="text-amber-300 font-mono">{pointsTarget.loyaltyPoints} pts</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPointsTarget(null)}
                className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={(e) => void handleSubmitPoints(e)} className="space-y-4 text-xs">
              <div className="grid grid-cols-4 gap-2">
                {[-50, 50, 100, 250].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setPointsDelta(String(preset))}
                    className={`py-2 rounded-xl border font-mono font-bold transition-colors ${
                      pointsDelta === String(preset)
                        ? 'bg-amber-500 text-zinc-950 border-amber-400'
                        : 'bg-white/[0.04] border-white/10 text-zinc-200 hover:bg-white/[0.08]'
                    }`}
                  >
                    {preset > 0 ? `+${preset}` : preset}
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-zinc-400 font-semibold mb-1">Custom Delta (+/-)</label>
                <input
                  type="number"
                  required
                  value={pointsDelta}
                  onChange={(e) => setPointsDelta(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl glass-input text-sm font-mono focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPointsTarget(null)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 font-bold"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={pointsBusy}
                  className="px-4 py-2 rounded-xl gold-gradient-bg text-zinc-950 font-extrabold disabled:opacity-50"
                >
                  {pointsBusy ? 'Updating...' : 'Apply Points'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add VIP Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-md glass-panel border border-white/15 rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-zinc-100">Register VIP Member</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-zinc-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={(e) => void handleCreateCustomer(e)} className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-400 font-semibold mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Sokha Chan"
                  className="w-full px-3 py-2 rounded-xl glass-input focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-zinc-400 font-semibold mb-1">Phone Number *</label>
                <input
                  type="text"
                  required
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="+855 12 345 678"
                  className="w-full px-3 py-2 rounded-xl glass-input focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Email (Optional)</label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="vip@email.com"
                    className="w-full px-3 py-2 rounded-xl glass-input focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Starting Tier</label>
                  <select
                    value={newTier}
                    onChange={(e) => setNewTier(e.target.value as Customer['tier'])}
                    className="w-full px-3 py-2 rounded-xl glass-input focus:outline-none"
                  >
                    <option value="Bronze" className="bg-zinc-900">Bronze</option>
                    <option value="Silver" className="bg-zinc-900">Silver</option>
                    <option value="Gold" className="bg-zinc-900">Gold</option>
                    <option value="Platinum" className="bg-zinc-900">Platinum</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 font-bold"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl gold-gradient-bg text-zinc-950 font-extrabold"
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
