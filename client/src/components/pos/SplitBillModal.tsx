import React, { useState } from 'react';
import { X, ArrowRightLeft, Users, DollarSign, CheckCircle } from 'lucide-react';
import { Order } from '../../types';

interface Props {
  order: Order;
  onClose: () => void;
  onConfirmSplit: (partsCount: number, perPartAmount: number) => void;
}

export const SplitBillModal: React.FC<Props> = ({ order, onClose, onConfirmSplit }) => {
  const [splitCount, setSplitCount] = useState<number>(2);

  const perPersonAmount = order.totalAmount / splitCount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-stone-900 border border-amber-700/40 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-600/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-stone-100">Split Bill / Multi-Payment</h3>
              <p className="text-xs text-stone-400">Order Total: ${order.totalAmount.toFixed(2)}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-800 text-stone-400 hover:text-white flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Split Guest Count Selector */}
        <div className="space-y-3">
          <label className="text-xs font-semibold text-stone-400 uppercase tracking-wider block">
            Split Equally By Number of Guests
          </label>
          <div className="grid grid-cols-4 gap-2">
            {[2, 3, 4, 5].map((cnt) => (
              <button
                key={cnt}
                onClick={() => setSplitCount(cnt)}
                className={`py-3 rounded-2xl border text-center font-bold text-sm transition-all ${
                  splitCount === cnt
                    ? 'bg-amber-600 border-amber-500 text-stone-950 shadow-lg shadow-amber-900/30'
                    : 'bg-stone-800/40 border-stone-700/60 text-stone-300 hover:bg-stone-800'
                }`}
              >
                {cnt} Guests
              </button>
            ))}
          </div>
        </div>

        {/* Calculation Result */}
        <div className="p-4 bg-stone-950 rounded-2xl border border-stone-800 text-center space-y-1">
          <span className="text-xs text-stone-400">Amount Per Guest ({splitCount} Shares)</span>
          <div className="text-3xl font-extrabold text-amber-400 font-mono">
            ${perPersonAmount.toFixed(2)}
          </div>
          <span className="text-[10px] text-stone-500">Each guest pays ${perPersonAmount.toFixed(2)}</span>
        </div>

        {/* Confirm Action */}
        <button
          onClick={() => onConfirmSplit(splitCount, perPersonAmount)}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-stone-950 font-bold text-xs flex items-center justify-center space-x-2 transition-all"
        >
          <CheckCircle className="w-4 h-4" />
          <span>Confirm Split Checkout</span>
        </button>
      </div>
    </div>
  );
};
