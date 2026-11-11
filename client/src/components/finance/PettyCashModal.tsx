import React, { useEffect, useState } from 'react';
import { X, Receipt, Plus, Trash2, CheckCircle2, RefreshCw } from 'lucide-react';
import {
  fetchExpenses,
  createExpenseApi,
  deleteExpenseApi,
  computeTodayExpenses,
  Expense,
} from '../../services/expenseService';
import { useAuth } from '../../context/AuthContext';
import { ApiError } from '../../services/api';
import { soundEffects } from '../../services/soundService';

interface Props {
  onClose: () => void;
  cashierName: string;
}

export const PettyCashModal: React.FC<Props> = ({ onClose }) => {
  const { hasGranularPermission } = useAuth();
  const canCreate = hasGranularPermission('pos:shift_manage');
  const canDelete = hasGranularPermission('reports:view');

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // Form states
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<'USD' | 'KHR'>('USD');
  const [category, setCategory] = useState<Expense['category']>('Ice & Water');
  const [description, setDescription] = useState('');
  const [paidTo, setPaidTo] = useState('');

  const loadExpenses = async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await fetchExpenses();
      setExpenses(list);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadExpenses();
  }, []);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canCreate) return;
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      setError('Please enter a valid positive expense amount.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const created = await createExpenseApi({
        category,
        amount: numAmount,
        currency,
        description: description.trim() || category,
        paidTo: paidTo.trim() || 'Store Vendor',
      });
      soundEffects.playBeep();
      setExpenses((prev) => [created, ...prev]);
      setAmount('');
      setDescription('');
      setPaidTo('');
      setShowAddForm(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to record expense');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!canDelete) return;
    if (!confirm('Delete this expense entry?')) return;
    setError(null);
    try {
      await deleteExpenseApi(id);
      setExpenses((prev) => prev.filter((e) => e.id !== id));
      soundEffects.playBeep();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete expense');
    }
  };

  const totalUSD = computeTodayExpenses(expenses);
  const totalKHR = Math.round(totalUSD * 4100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md font-sans">
      <div className="bg-stone-900 border border-amber-700/40 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 glass-panel">
        {/* Header */}
        <div className="px-6 py-4 bg-stone-950 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-600/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-100">Petty Cash & Daily Expenses (ការចំណាយប្រចាំថ្ងៃ)</h3>
              <p className="text-xs text-stone-400">Synced with SQLite register cash-out & shift reconciliation</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => void loadExpenses()}
              disabled={loading}
              className="w-8 h-8 rounded-full bg-stone-800 text-stone-400 hover:text-white flex items-center justify-center"
              title="Refresh"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-stone-800 text-stone-400 hover:text-white flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Summary Card & Add Toggle */}
        <div className="p-6 bg-stone-950/60 border-b border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold text-stone-400 block">Total Petty Cash Paid Out Today:</span>
            <div className="flex items-baseline space-x-2 mt-0.5">
              <span className="text-2xl font-black text-amber-400 font-mono">${totalUSD.toFixed(2)}</span>
              <span className="text-xs text-amber-500/80 font-mono font-bold">(៛ {totalKHR.toLocaleString()} KHR)</span>
            </div>
          </div>

          {canCreate && (
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-4 py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs flex items-center space-x-1.5 shadow-lg shadow-amber-900/30 transition-all self-start sm:self-center"
            >
              <Plus className="w-4 h-4" />
              <span>{showAddForm ? 'Cancel Entry' : 'Record New Expense'}</span>
            </button>
          )}
        </div>

        {error && (
          <div className="mx-6 mt-3 p-2.5 rounded-xl bg-red-950/60 border border-red-700/50 text-red-300 text-xs font-semibold">
            {error}
          </div>
        )}

        {/* Add Form Accordion */}
        {showAddForm && (
          <form onSubmit={(e) => void handleAddExpense(e)} className="p-6 bg-stone-900/90 border-b border-amber-600/30 space-y-4 animate-in slide-in-from-top-4 duration-200">
            <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider">New Out-of-Pocket Expense Entry</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-stone-300 block mb-1">Expense Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as Expense['category'])}
                  className="w-full px-3.5 py-2.5 rounded-xl glass-input text-stone-100 text-xs font-bold focus:outline-none"
                >
                  <option value="Ice & Water" className="bg-stone-900">Ice & Tube Water Delivery</option>
                  <option value="Dairy & Fresh Produce" className="bg-stone-900">Emergency Milk & Dairy Run</option>
                  <option value="Packaging & Cups" className="bg-stone-900">Takeaway Cups, Straws & Bags</option>
                  <option value="Cleaning Supplies" className="bg-stone-900">Cleaning Detergent & Napkins</option>
                  <option value="Maintenance & Repair" className="bg-stone-900">Espresso Machine / Filter Repair</option>
                  <option value="Staff Meal / Misc" className="bg-stone-900">Staff Meal & Miscellaneous</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-300 block mb-1">Paid To (Vendor / Person)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Phnom Penh Ice Delivery"
                  value={paidTo}
                  onChange={(e) => setPaidTo(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl glass-input text-stone-100 text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-300 block mb-1">Amount</label>
                <div className="flex space-x-2">
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="flex-1 px-3.5 py-2.5 rounded-xl glass-input text-stone-100 text-sm font-mono font-bold focus:outline-none"
                  />
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value as 'USD' | 'KHR')}
                    className="px-3 py-2.5 rounded-xl glass-input text-xs font-bold text-amber-400 bg-stone-900"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="KHR">KHR (៛)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-300 block mb-1">Description / Notes</label>
                <input
                  type="text"
                  placeholder="e.g. 3 bags of tube ice for beverage station"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl glass-input text-stone-100 text-xs focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-950 font-bold text-xs flex items-center space-x-1.5 shadow-md"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{submitting ? 'Saving...' : 'Save Expense to Register'}</span>
              </button>
            </div>
          </form>
        )}

        {/* Expenses List */}
        <div className="p-6 max-h-[50vh] overflow-y-auto space-y-3">
          {loading && expenses.length === 0 ? (
            <div className="text-center py-10 text-stone-500 text-xs">Loading expenses...</div>
          ) : expenses.length === 0 ? (
            <div className="text-center py-10 text-stone-500 text-xs">
              No out-of-pocket expenses recorded yet.
            </div>
          ) : (
            expenses.map((exp) => (
              <div
                key={exp.id}
                className="p-3.5 rounded-2xl bg-stone-950/70 border border-stone-800 flex items-center justify-between hover:border-stone-700 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-stone-100">{exp.category}</span>
                    <span className="text-[10px] text-stone-400 font-mono">• {exp.paidTo}</span>
                  </div>
                  <p className="text-[11px] text-stone-400">{exp.description}</p>
                  <div className="text-[10px] text-stone-500 flex items-center space-x-3 pt-0.5">
                    <span>Recorded by: {exp.recordedBy}</span>
                    <span>• {new Date(exp.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <span className="text-base font-bold font-mono text-red-400">
                    -{exp.currency === 'USD' ? `$${exp.amount.toFixed(2)}` : `៛${exp.amount.toLocaleString()}`}
                  </span>
                  {canDelete && (
                    <button
                      onClick={() => void handleDelete(exp.id)}
                      className="p-1.5 rounded-lg bg-stone-900 hover:bg-red-950/60 text-stone-500 hover:text-red-400 border border-stone-800"
                      title="Delete entry"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
