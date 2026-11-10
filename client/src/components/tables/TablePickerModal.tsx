import React, { useState } from 'react';
import { X, Layers, Users, Check, Ban } from 'lucide-react';
import { DiningTable } from '../../types';
import { getTables } from '../../services/orderService';

interface Props {
  selectedTable: DiningTable | null;
  onSelectTable: (table: DiningTable | null) => void;
  onClose: () => void;
}

export const TablePickerModal: React.FC<Props> = ({ selectedTable, onSelectTable, onClose }) => {
  const [tables] = useState<DiningTable[]>(() => getTables());
  const [activeSection, setActiveSection] = useState<'All' | 'Main Floor' | 'Terrace' | 'VIP Lounge'>('All');

  const filtered = tables.filter((t) => {
    if (activeSection === 'All') return true;
    return t.floorSection === activeSection;
  });

  const getStatusColor = (status: DiningTable['status']) => {
    switch (status) {
      case 'AVAILABLE':
        return 'bg-emerald-950/40 border-emerald-500/50 text-emerald-400 hover:border-emerald-400';
      case 'OCCUPIED':
        return 'bg-amber-950/40 border-amber-500/50 text-amber-300 hover:border-amber-400';
      case 'RESERVED':
        return 'bg-purple-950/40 border-purple-500/50 text-purple-300';
      case 'DIRTY':
        return 'bg-red-950/40 border-red-500/50 text-red-400';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md font-sans">
      <div className="bg-stone-900 border border-amber-700/40 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 glass-panel">
        {/* Header */}
        <div className="px-6 py-4 bg-stone-950 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-600/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-100 flex items-center space-x-2">
                <span>Select Dining Table (ជ្រើសរើសលេខតុ)</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-950/60 text-amber-400 border border-amber-700/40 font-mono">
                  Dine-In
                </span>
              </h2>
              <p className="text-xs text-stone-400">Assign order to table for dine-in service & kitchen delivery</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-stone-800/80 hover:bg-stone-800 text-stone-400 hover:text-stone-100 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Section Tabs */}
        <div className="px-6 py-3 bg-stone-950/60 border-b border-stone-800/60 flex items-center space-x-2 overflow-x-auto">
          {(['All', 'Main Floor', 'Terrace', 'VIP Lounge'] as const).map((sec) => (
            <button
              key={sec}
              onClick={() => setActiveSection(sec)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeSection === sec
                  ? 'bg-amber-600 text-stone-950 shadow-md'
                  : 'bg-stone-800/60 text-stone-400 hover:text-stone-200'
              }`}
            >
              {sec}
            </button>
          ))}
        </div>

        {/* Tables Grid */}
        <div className="p-6 max-h-[50vh] overflow-y-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
          {filtered.map((t) => {
            const isCurrent = selectedTable?.id === t.id;
            return (
              <button
                key={t.id}
                onClick={() => {
                  onSelectTable(t);
                  onClose();
                }}
                className={`p-4 rounded-2xl border text-left flex flex-col justify-between transition-all relative group ${getStatusColor(
                  t.status
                )} ${isCurrent ? 'ring-2 ring-amber-400 shadow-lg scale-102' : ''}`}
              >
                {isCurrent && (
                  <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-amber-500 text-stone-950 flex items-center justify-center">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </span>
                )}
                <div>
                  <span className="text-[10px] font-mono font-bold tracking-wider opacity-75 uppercase block">
                    {t.floorSection}
                  </span>
                  <h4 className="text-base font-black text-stone-100">{t.name}</h4>
                  <span className="text-xs font-mono font-semibold">{t.tableNumber}</span>
                </div>

                <div className="pt-3 border-t border-stone-800/60 flex items-center justify-between text-[11px] mt-2">
                  <span className="flex items-center space-x-1 opacity-80">
                    <Users className="w-3 h-3" />
                    <span>{t.capacity} Seats</span>
                  </span>
                  <span className="text-[10px] font-bold uppercase">{t.status}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-stone-950 border-t border-stone-800 flex items-center justify-between">
          <button
            onClick={() => {
              onSelectTable(null);
              onClose();
            }}
            className="px-4 py-2 rounded-xl bg-stone-800/80 hover:bg-stone-800 text-stone-400 hover:text-red-400 text-xs font-bold transition-colors flex items-center space-x-1.5"
          >
            <Ban className="w-3.5 h-3.5" />
            <span>លុបការជ្រើសរើសតុ (No Table / Quick)</span>
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold transition-colors"
          >
            បិទ (Close)
          </button>
        </div>
      </div>
    </div>
  );
};
