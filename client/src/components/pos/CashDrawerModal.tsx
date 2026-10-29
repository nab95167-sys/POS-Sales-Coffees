import React, { useState } from 'react';
import { X, DollarSign, Lock, Unlock, ArrowDownRight, ArrowUpRight, CheckCircle2, ShieldCheck } from 'lucide-react';

interface Props {
  onClose: () => void;
}

export const CashDrawerModal: React.FC<Props> = ({ onClose }) => {
  const [shiftStatus, setShiftStatus] = useState<'OPEN' | 'CLOSED'>('OPEN');
  const [startingFloat, setStartingFloat] = useState<number>(100.00);
  const [cashIn, setCashIn] = useState<number>(0);
  const [cashOut, setCashOut] = useState<number>(0);
  const [cashSales] = useState<number>(420.50);
  const [actualCount, setActualCount] = useState<number>(520.50);
  const [reason, setReason] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'Drawer' | 'CashIn' | 'ShiftClose'>('Drawer');

  const expectedTotal = startingFloat + cashSales + cashIn - cashOut;
  const discrepancy = actualCount - expectedTotal;

  const handleCashIn = () => {
    alert(`Added Cash-In of $${cashIn.toFixed(2)}: ${reason}`);
    setReason('');
  };

  const handleCashOut = () => {
    alert(`Performed Cash-Out of $${cashOut.toFixed(2)}: ${reason}`);
    setReason('');
  };

  const handleCloseShift = () => {
    setShiftStatus('CLOSED');
    alert(`Shift closed. Expected: $${expectedTotal.toFixed(2)}, Actual: $${actualCount.toFixed(2)}, Discrepancy: $${discrepancy.toFixed(2)}`);
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
              <p className="text-xs text-stone-400">Shift float balance, cash-in/out & drawer reconciliation</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-800 text-stone-400 hover:text-white flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
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
              {tab === 'CashIn' && 'Cash In / Cash Out'}
              {tab === 'ShiftClose' && 'Close Shift & Balance'}
            </button>
          ))}
        </div>

        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {activeTab === 'Drawer' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 bg-stone-950 rounded-2xl border border-stone-800">
                  <span className="text-xs text-stone-400 block mb-1">Starting Float</span>
                  <span className="text-2xl font-extrabold text-stone-100 font-mono">${startingFloat.toFixed(2)}</span>
                </div>
                <div className="p-4 bg-stone-950 rounded-2xl border border-stone-800">
                  <span className="text-xs text-stone-400 block mb-1">Cash Sales Today</span>
                  <span className="text-2xl font-extrabold text-emerald-400 font-mono">${cashSales.toFixed(2)}</span>
                </div>
              </div>

              <div className="p-4 bg-amber-950/30 border border-amber-600/40 rounded-2xl flex justify-between items-center">
                <div>
                  <span className="text-xs text-amber-300 font-semibold block">Expected Cash Drawer Balance</span>
                  <span className="text-3xl font-extrabold text-amber-400 font-mono">${expectedTotal.toFixed(2)}</span>
                </div>
                <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/40">
                  Shift Active
                </span>
              </div>
            </div>
          )}

          {activeTab === 'CashIn' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-stone-400 block mb-1">Amount ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={cashIn || cashOut}
                  onChange={(e) => setCashIn(Number(e.target.value))}
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
                  placeholder="e.g. Added petty cash float / Paid supplier delivery"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={handleCashIn}
                  className="py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-stone-950 font-bold text-xs flex items-center justify-center space-x-2"
                >
                  <ArrowDownRight className="w-4 h-4" />
                  <span>Perform Cash-In</span>
                </button>
                <button
                  onClick={handleCashOut}
                  className="py-3 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center justify-center space-x-2"
                >
                  <ArrowUpRight className="w-4 h-4" />
                  <span>Perform Cash-Out</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'ShiftClose' && (
            <div className="space-y-4">
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
                  <span className={`font-mono ${discrepancy === 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    ${discrepancy.toFixed(2)}
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
                onClick={handleCloseShift}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-red-600 to-amber-600 text-stone-100 font-bold text-xs flex items-center justify-center space-x-2 shadow-lg"
              >
                <Lock className="w-4 h-4" />
                <span>End Shift & Lock Cash Drawer</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
