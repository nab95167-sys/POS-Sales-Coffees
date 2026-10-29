import React, { useState } from 'react';
import { Users, Plus, Search, Award, Star, Phone, Mail, DollarSign, Wallet, History, Gift } from 'lucide-react';
import { Customer } from '../types';
import { INITIAL_CUSTOMERS } from '../services/mockData';

export const CustomersPage: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>(INITIAL_CUSTOMERS);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery) ||
      (c.email && c.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleTopUpWallet = (customer: Customer) => {
    const amountStr = prompt(`Enter E-Wallet top-up amount for ${customer.name} ($):`, '25.00');
    if (!amountStr) return;
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) return;

    setCustomers((prev) =>
      prev.map((c) => (c.id === customer.id ? { ...c, totalSpent: c.totalSpent + amount, loyaltyPoints: c.loyaltyPoints + Math.floor(amount * 10) } : c))
    );
    alert(`Successfully added $${amount.toFixed(2)} wallet credit to ${customer.name}! Earned ${Math.floor(amount * 10)} bonus points.`);
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
            <p className="text-xs text-stone-400">Manage VIP members, reward points, e-wallet & purchase history</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="relative">
            <Search className="w-4 h-4 text-stone-500 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search member by name or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 rounded-xl glass-input text-stone-100 text-xs w-64 focus:outline-none"
            />
          </div>

          <button
            onClick={() => {
              const name = prompt('Customer Full Name:');
              const phone = prompt('Phone Number:');
              if (name && phone) {
                const newC: Customer = {
                  id: `cust-${Date.now()}`,
                  name,
                  phone,
                  loyaltyPoints: 50,
                  tier: 'Bronze',
                  totalSpent: 0,
                  lastVisit: 'Just now',
                };
                setCustomers([newC, ...customers]);
              }
            }}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs flex items-center space-x-1.5 shadow-lg shadow-amber-900/30 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add VIP Member</span>
          </button>
        </div>
      </div>

      {/* Customer Grid Cards */}
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
              <span className="text-[11px] text-stone-500">Last Visit: {cust.lastVisit}</span>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleTopUpWallet(cust)}
                  className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-amber-300 font-bold text-[11px] flex items-center space-x-1 border border-amber-600/30"
                >
                  <Wallet className="w-3 h-3" />
                  <span>Wallet Top-Up</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
