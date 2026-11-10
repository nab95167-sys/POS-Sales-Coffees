import React from 'react';
import { X, Printer, Coffee, Tag, CheckCircle2 } from 'lucide-react';
import { Order } from '../../types';
import { soundEffects } from '../../services/soundService';

interface Props {
  order: Order;
  onClose: () => void;
}

export const CupLabelModal: React.FC<Props> = ({ order, onClose }) => {
  // Expand items by quantity so every single physical cup gets its own sticker
  const stickerItems: {
    itemIndex: number;
    totalCups: number;
    name: string;
    variantName?: string;
    toppings: string[];
    notes?: string;
  }[] = [];

  let totalCupsCount = 0;
  order.items.forEach((item) => {
    totalCupsCount += item.quantity;
  });

  let runningCupIndex = 1;
  order.items.forEach((item) => {
    for (let i = 0; i < item.quantity; i++) {
      stickerItems.push({
        itemIndex: runningCupIndex,
        totalCups: totalCupsCount,
        name: item.name,
        variantName: item.selectedVariant?.name,
        toppings: item.selectedToppings.map((t) => t.name),
        notes: item.notes,
      });
      runningCupIndex++;
    }
  });

  const handlePrint = () => {
    soundEffects.playBeep();
    window.print();
  };

  const orderTimeStr = new Date(order.createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md font-sans">
      <div className="bg-stone-900 border border-amber-700/40 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 glass-panel">
        {/* Header */}
        <div className="px-6 py-4 bg-stone-950 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-600/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-100 flex items-center space-x-2">
                <span>Cup Sticker Label Printer</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-950/60 text-amber-400 border border-amber-700/40 font-mono">
                  40x30mm
                </span>
              </h2>
              <p className="text-xs text-stone-400">
                Order #{order.orderNumber} • {stickerItems.length} Cup Sticker Labels
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-stone-800/80 hover:bg-stone-800 text-stone-400 hover:text-stone-100 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sticker Preview Area */}
        <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4 bg-stone-950/40">
          <div className="text-xs text-stone-400 flex items-center justify-between">
            <span>Sticker Preview (Standard 40x30mm / 50x30mm thermal adhesive label roll)</span>
            <span className="font-mono text-amber-400 font-bold">{stickerItems.length} labels generated</span>
          </div>

          <div id="cup-sticker-labels" className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {stickerItems.map((stk, idx) => (
              <div
                key={`stk-${idx}`}
                className="bg-white text-black p-3 rounded-xl border border-stone-300 shadow-md flex flex-col justify-between font-mono text-[11px] leading-tight select-none relative cup-label-print-unit"
                style={{ minHeight: '125px' }}
              >
                {/* Sticker Header */}
                <div className="border-b border-black pb-1 mb-1 flex items-center justify-between">
                  <div className="flex items-center space-x-1">
                    <span className="font-black text-xs uppercase tracking-tighter">☕ AURA COFFEE</span>
                  </div>
                  <span className="font-bold text-[10px] bg-black text-white px-1.5 py-0.2 rounded">
                    {stk.itemIndex}/{stk.totalCups}
                  </span>
                </div>

                {/* Drink & Size */}
                <div className="space-y-0.5">
                  <div className="font-black text-xs leading-none">
                    {stk.name} {stk.variantName && `(${stk.variantName.charAt(0)})`}
                  </div>

                  {stk.toppings.length > 0 && (
                    <div className="text-[10px] font-semibold text-stone-700">
                      + {stk.toppings.join(', ')}
                    </div>
                  )}

                  {stk.notes && (
                    <div className="text-[9px] font-bold text-red-600 italic">
                      * {stk.notes}
                    </div>
                  )}
                </div>

                {/* Sticker Footer */}
                <div className="border-t border-dashed border-black pt-1 mt-1 flex items-center justify-between text-[9px] font-bold">
                  <span>{order.orderNumber}</span>
                  <span>{order.tableName || order.type.replace('_', ' ')}</span>
                  <span>{orderTimeStr}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-stone-950 border-t border-stone-800 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold transition-colors"
          >
            បិទ (Close)
          </button>

          <button
            onClick={handlePrint}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-stone-950 font-bold text-xs flex items-center space-x-2 shadow-lg shadow-amber-900/40 transition-all hover:scale-[1.02]"
          >
            <Printer className="w-4 h-4" />
            <span>ព្រីន Sticker ទាំងអស់ (Print {stickerItems.length} Labels)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
