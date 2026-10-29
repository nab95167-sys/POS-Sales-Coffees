import React, { useState } from 'react';
import { X, ArrowRightLeft, Layers, CheckCircle } from 'lucide-react';
import { DiningTable } from '../../types';

interface Props {
  sourceTable: DiningTable;
  allTables: DiningTable[];
  onClose: () => void;
  onConfirmMove: (targetTableId: string) => void;
}

export const MoveTableModal: React.FC<Props> = ({
  sourceTable,
  allTables,
  onClose,
  onConfirmMove,
}) => {
  const availableTargetTables = allTables.filter(
    (t) => t.id !== sourceTable.id && t.status === 'AVAILABLE'
  );

  const [selectedTargetId, setSelectedTargetId] = useState<string>(
    availableTargetTables[0]?.id || ''
  );

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
              <h3 className="text-lg font-bold text-stone-100">Move / Merge Table</h3>
              <p className="text-xs text-stone-400">Transfer active order from {sourceTable.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-800 text-stone-400 hover:text-white flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Source vs Target Display */}
        <div className="grid grid-cols-2 gap-3 p-4 bg-stone-950 rounded-2xl border border-stone-800 text-center">
          <div className="space-y-1">
            <span className="text-[10px] text-stone-400 uppercase font-semibold">From Table</span>
            <div className="text-lg font-bold text-amber-400">{sourceTable.name}</div>
            <span className="text-[10px] text-stone-500 font-mono">{sourceTable.currentOrderId || 'Active Order'}</span>
          </div>

          <div className="space-y-1 border-l border-stone-800 pl-3">
            <span className="text-[10px] text-stone-400 uppercase font-semibold">To Destination</span>
            <div className="text-lg font-bold text-emerald-400">
              {allTables.find((t) => t.id === selectedTargetId)?.name || 'Select Table'}
            </div>
            <span className="text-[10px] text-emerald-300 font-semibold">Available</span>
          </div>
        </div>

        {/* Select Target Table Dropdown */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-stone-400 uppercase tracking-wider block">
            Select Available Target Table
          </label>
          <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
            {availableTargetTables.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedTargetId(t.id)}
                className={`p-3 rounded-xl border text-left font-bold text-xs transition-all ${
                  selectedTargetId === t.id
                    ? 'bg-amber-600 border-amber-500 text-stone-950 shadow-md'
                    : 'bg-stone-800/40 border-stone-700/60 text-stone-300 hover:bg-stone-800'
                }`}
              >
                <div>{t.name}</div>
                <div className="text-[10px] text-stone-400 font-normal">{t.floorSection} • Cap {t.capacity}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Confirm Action */}
        <button
          disabled={!selectedTargetId}
          onClick={() => onConfirmMove(selectedTargetId)}
          className={`w-full py-3.5 rounded-2xl font-bold text-xs flex items-center justify-center space-x-2 transition-all ${
            !selectedTargetId
              ? 'bg-stone-800 text-stone-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-stone-950 shadow-lg shadow-amber-900/30'
          }`}
        >
          <CheckCircle className="w-4 h-4" />
          <span>Confirm Move Order</span>
        </button>
      </div>
    </div>
  );
};
