import React, { useEffect, useState } from 'react';
import { X, DollarSign, Lock, Unlock, ArrowUpRight, RefreshCw } from 'lucide-react';
import { apiFetch, ApiError } from '../../services/api';
import { createExpenseApi } from '../../services/expenseService';
import { useAuth } from '../../context/AuthContext';
import { soundEffects } from '../../services/soundService';
import { showToastNotification } from '../../services/telegramBotService';

interface ShiftDTO {
  id: string;
  cashierName: string;
  status: 'OPEN' | 'CLOSED';
  startingFloat: number;
  cashIn: number;
  cashOut: number;
  expectedCash?: number;
  actualCash?: number;
  discrepancy?: number;
  openedAt: string;
  closedAt?: string;
}

interface Props {
  onClose: () => void;
}

export const CashDrawerModal: React.FC<Props> = ({ onClose }) => {
  const { hasGranularPermission } = useAuth();
  const canManageShift = hasGranularPermission('pos:shift_manage');

  const [currentShift, setCurrentShift] = useState<ShiftDTO | null>(null);
  const [recentShifts, setRecentShifts] = useState<ShiftDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [openingFloatInput, setOpeningFloatInput] = useState<number>(100);
  const [cashOutAmount, setCashOutAmount] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [actualCount, setActualCount] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'Drawer' | 'CashIn' | 'ShiftClose'>('Drawer');

  const loadShiftData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<{ currentShift: ShiftDTO | null; recentShifts: ShiftDTO[] }>(
        '/api/v1/finance/shifts/current'
      );
      setCurrentShift(data.currentShift);
      setRecentShifts(data.recentShifts || []);
      if (data.currentShift) {
        const exp =
          data.currentShift.startingFloat +
          data.currentShift.cashIn -
          data.currentShift.cashOut;
        setActualCount(Number(exp.toFixed(2)));
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load register shift state');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadShiftData();
  }, []);

  const startingFloat = currentShift?.startingFloat ?? 0;
  const cashInSales = currentShift?.cashIn ?? 0;
  const cashOutTotal = currentShift?.cashOut ?? 0;
  const expectedTotal = Math.max(0, Number((startingFloat + cashInSales - cashOutTotal).toFixed(2)));
  const discrepancy = Number((actualCount - expectedTotal).toFixed(2));

  const handleOpenShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageShift) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await apiFetch<{ shift: ShiftDTO }>('/api/v1/finance/shifts/open', {
        method: 'POST',
        body: { startingFloat: Math.max(0, Number(openingFloatInput) || 0) },
      });
      setCurrentShift(res.shift);
      setActualCount(res.shift.startingFloat);
      window.dispatchEvent(new Event('coffee_shift_updated'));
      soundEffects.playSuccess();
      showToastNotification(`Opened shift with $${res.shift.startingFloat.toFixed(2)} float.`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to open shift');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCashOutExpense = async () => {
    if (!canManageShift) return;
    const amt = parseFloat(cashOutAmount);
    if (!amt || amt <= 0) {
      setError('Enter a valid positive Cash-Out amount');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await createExpenseApi({
        category: 'Staff Meal / Misc',
        amount: amt,
        currency: 'USD',
        description: reason.trim() || 'Drawer Petty Cash-Out',
        paidTo: 'Cash Drawer Payout',
      });
      setCashOutAmount('');
      setReason('');
      await loadShiftData();
      window.dispatchEvent(new Event('coffee_shift_updated'));
      soundEffects.playBeep();
      showToastNotification(`Recorded $${amt.toFixed(2)} Cash-Out from register.`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to record drawer cash-out');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseShift = async () => {
    if (!canManageShift || !currentShift) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await apiFetch<{ shift: ShiftDTO }>('/api/v1/finance/shifts/close', {
        method: 'POST',
        body: { actualCash: Math.max(0, Number(actualCount) || 0) },
      });
      setCurrentShift(null);
      setRecentShifts((prev) => [res.shift, ...prev]);
      window.dispatchEvent(new Event('coffee_shift_updated'));
      soundEffects.playSuccess();
      showToastNotification(
        `Shift closed. Discrepancy: ${(res.shift.discrepancy ?? 0) >= 0 ? '+' : ''}$${(res.shift.discrepancy ?? 0).toFixed(2)}`
      );
      setActiveTab('Drawer');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to close shift');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md font-sans">
      <div className="bg-stone-900 border border-amber-700/40 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 bg-stone-950 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-amber-600/20 border border-amber-500/40 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-stone-100">Shift Register & Cash Drawer</h3>
              <p className="text-xs text-stone-400">SQLite shift float balance, cash-out & drawer reconciliation</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => void loadShiftData()}
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

        {/* Tab Selection */}
        <div className="p-4 bg-stone-950/60 border-b border-stone-800 flex space-x-2">
          {(['Drawer', 'CashIn', 'ShiftClose'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === tab
                  ? 'bg-amber-600 text-stone-950 shadow-md'
                  : 'bg-stone-800/40 text-stone-300 hover:bg-stone-800'
              }`}
            >
              {tab === 'Drawer' && 'Drawer Status'}
              {tab === 'CashIn' && 'Petty Cash-Out'}
              {tab === 'ShiftClose' && 'Close Shift & Balance'}
            </button>
          ))}
        </div>

        {error && (
          <div className="mx-6 mt-3 p-2.5 rounded-xl bg-red-950/60 border border-red-700/50 text-red-300 text-xs font-semibold">
            {error}
          </div>
        )}

        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {activeTab === 'Drawer' && (
            <div className="space-y-4">
              {currentShift ? (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-4 bg-stone-950 rounded-2xl border border-stone-800">
                      <span className="text-[11px] text-stone-400 block mb-1">Starting Float</span>
                      <span className="text-xl font-extrabold text-stone-100 font-mono">${startingFloat.toFixed(2)}</span>
                    </div>
                    <div className="p-4 bg-stone-950 rounded-2xl border border-stone-800">
                      <span className="text-[11px] text-stone-400 block mb-1">Cash In (Sales)</span>
                      <span className="text-xl font-extrabold text-emerald-400 font-mono">${cashInSales.toFixed(2)}</span>
                    </div>
                    <div className="p-4 bg-stone-950 rounded-2xl border border-stone-800">
                      <span className="text-[11px] text-stone-400 block mb-1">Cash Out</span>
                      <span className="text-xl font-extrabold text-red-400 font-mono">-${cashOutTotal.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="p-4 bg-amber-950/30 border border-amber-600/40 rounded-2xl flex justify-between items-center">
                    <div>
                      <span className="text-xs text-amber-300 font-semibold block">Expected Cash Drawer Balance</span>
                      <span className="text-3xl font-extrabold text-amber-400 font-mono">${expectedTotal.toFixed(2)}</span>
                      <span className="text-[10px] text-stone-400 block mt-1">
                        Opened by {currentShift.cashierName} • {new Date(currentShift.openedAt).toLocaleString()}
                      </span>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/40">
                      Shift Active
                    </span>
                  </div>
                </>
              ) : (
                <div className="p-5 bg-stone-950/80 border border-stone-800 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-stone-100">No Open Register Shift</h4>
                      <p className="text-xs text-stone-400">Open a new register shift with your starting drawer float</p>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-stone-800 text-stone-400 text-xs font-bold">
                      Closed
                    </span>
                  </div>

                  {canManageShift && (
                    <form onSubmit={(e) => void handleOpenShift(e)} className="flex items-end space-x-3">
                      <div className="flex-1">
                        <label className="text-xs font-semibold text-stone-400 block mb-1">Starting Cash Float ($)</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={openingFloatInput}
                          onChange={(e) => setOpeningFloatInput(Number(e.target.value))}
                          className="w-full px-4 py-2.5 rounded-xl glass-input text-stone-100 text-base font-mono font-bold"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={submitting}
                        className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-stone-950 font-bold text-xs flex items-center space-x-1.5"
                      >
                        <Unlock className="w-4 h-4" />
                        <span>{submitting ? 'Opening...' : 'Open Shift'}</span>
                      </button>
                    </form>
                  )}
                </div>
              )}

              {recentShifts.filter((s) => s.status === 'CLOSED').slice(0, 3).length > 0 && (
                <div className="space-y-2">
                  <div className="text-[11px] font-bold text-stone-500 uppercase">Recent Closed Shifts</div>
                  {recentShifts
                    .filter((s) => s.status === 'CLOSED')
                    .slice(0, 3)
                    .map((s) => (
                      <div key={s.id} className="p-3 rounded-xl bg-stone-950/60 border border-stone-800/80 flex justify-between text-xs">
                        <span className="text-stone-300">
                          {s.cashierName} • {s.closedAt ? new Date(s.closedAt).toLocaleDateString() : ''}
                        </span>
                        <span className="font-mono text-amber-400">
                          Counted ${(s.actualCash ?? 0).toFixed(2)} (Diff {(s.discrepancy ?? 0) >= 0 ? '+' : ''}${(s.discrepancy ?? 0).toFixed(2)})
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'CashIn' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-stone-400 block mb-1">Petty Cash Payout Amount ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={cashOutAmount}
                  onChange={(e) => setCashOutAmount(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-stone-100 text-lg font-mono font-bold"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-400 block mb-1">Reason / Note</label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-stone-100 text-sm"
                  placeholder="e.g. Paid ice delivery / emergency store supplies"
                />
              </div>

              <button
                type="button"
                disabled={!canManageShift || submitting}
                onClick={() => void handleCashOutExpense()}
                className="w-full py-3 rounded-2xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center space-x-2"
              >
                <ArrowUpRight className="w-4 h-4" />
                <span>{submitting ? 'Recording...' : 'Record Drawer Cash-Out Expense'}</span>
              </button>
            </div>
          )}

          {activeTab === 'ShiftClose' && (
            <div className="space-y-4">
              {!currentShift ? (
                <div className="p-6 text-center text-xs text-stone-400">
                  No open shift to close. Switch to Drawer Status to open a shift.
                </div>
              ) : (
                <>
                  <div className="p-4 bg-stone-950 rounded-2xl border border-stone-800 space-y-2">
                    <div className="flex justify-between text-xs text-stone-400">
                      <span>Expected Drawer Cash:</span>
                      <span className="font-mono font-bold text-stone-200">${expectedTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-stone-400">
                      <span>Actual Cash Count:</span>
                      <span className="font-mono font-bold text-amber-400">${actualCount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xs font-bold pt-2 border-t border-stone-800">
                      <span>Discrepancy (Variance):</span>
                      <span className={`font-mono ${Math.abs(discrepancy) < 0.05 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {discrepancy >= 0 ? `+$${discrepancy.toFixed(2)}` : `-$${Math.abs(discrepancy).toFixed(2)}`}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-stone-400 block mb-1">Enter Physical Cash Count ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={actualCount}
                      onChange={(e) => setActualCount(Number(e.target.value))}
                      className="w-full px-4 py-3 rounded-xl glass-input text-stone-100 text-2xl font-mono font-bold"
                    />
                  </div>

                  <button
                    type="button"
                    disabled={!canManageShift || submitting}
                    onClick={() => void handleCloseShift()}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-red-600 to-amber-600 disabled:opacity-50 text-stone-100 font-bold text-xs flex items-center justify-center space-x-2 shadow-lg"
                  >
                    <Lock className="w-4 h-4" />
                    <span>{submitting ? 'Closing Shift...' : 'End Shift & Lock Cash Drawer'}</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
