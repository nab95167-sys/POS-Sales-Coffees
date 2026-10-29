import React, { useState } from 'react';
import { Layers, Users, Coffee, Check, ArrowRightLeft, Calendar, Sparkles } from 'lucide-react';
import { DiningTable, TableStatus } from '../../types';
import { INITIAL_TABLES } from '../../services/mockData';
import { MoveTableModal } from './MoveTableModal';

export const FloorPlan: React.FC = () => {
  const [tables, setTables] = useState<DiningTable[]>(INITIAL_TABLES);
  const [selectedSection, setSelectedSection] = useState<'All' | 'Main Floor' | 'Terrace' | 'VIP Lounge'>('All');
  const [selectedTable, setSelectedTable] = useState<DiningTable | null>(null);
  const [movingTable, setMovingTable] = useState<DiningTable | null>(null);

  const filteredTables = tables.filter((t) => {
    if (selectedSection === 'All') return true;
    return t.floorSection === selectedSection;
  });

  const getStatusBadge = (status: TableStatus) => {
    switch (status) {
      case 'AVAILABLE':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
      case 'OCCUPIED':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'RESERVED':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
      case 'DIRTY':
        return 'bg-red-500/20 text-red-400 border-red-500/40';
    }
  };

  const updateTableStatus = (tableId: string, status: TableStatus) => {
    setTables((prev) => prev.map((t) => (t.id === tableId ? { ...t, status } : t)));
    if (selectedTable && selectedTable.id === tableId) {
      setSelectedTable({ ...selectedTable, status });
    }
  };

  const handleConfirmTableMove = (targetTableId: string) => {
    if (!movingTable) return;
    setTables((prev) =>
      prev.map((t) => {
        if (t.id === movingTable.id) {
          return { ...t, status: 'AVAILABLE', currentOrderId: undefined };
        }
        if (t.id === targetTableId) {
          return { ...t, status: 'OCCUPIED', currentOrderId: movingTable.currentOrderId || 'ORD-TRANSFERRED' };
        }
        return t;
      })
    );
    setMovingTable(null);
    setSelectedTable(null);
    alert(`Order transferred successfully from ${movingTable.name} to target table.`);
  };

  return (
    <div className="space-y-6">
      {/* Floor Plan Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-stone-900/80 p-4 rounded-3xl border border-stone-800 glass-panel">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-600/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-stone-100">Café Table Management</h2>
            <p className="text-xs text-stone-400">Visual floor plan, reservations & dining status</p>
          </div>
        </div>

        {/* Section Tabs */}
        <div className="flex items-center space-x-2">
          {(['All', 'Main Floor', 'Terrace', 'VIP Lounge'] as const).map((sec) => (
            <button
              key={sec}
              onClick={() => setSelectedSection(sec)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                selectedSection === sec
                  ? 'bg-amber-600 text-stone-950 shadow-lg shadow-amber-900/30'
                  : 'bg-stone-800/60 text-stone-300 hover:bg-stone-800'
              }`}
            >
              {sec}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Tables */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {filteredTables.map((table) => (
          <button
            key={table.id}
            onClick={() => setSelectedTable(table)}
            className={`p-6 rounded-3xl border text-left flex flex-col justify-between transition-all duration-200 hover:scale-[1.02] shadow-xl ${
              table.status === 'OCCUPIED'
                ? 'bg-gradient-to-br from-stone-900 to-amber-950/30 border-amber-600/60'
                : table.status === 'RESERVED'
                ? 'bg-gradient-to-br from-stone-900 to-purple-950/30 border-purple-600/60'
                : 'bg-stone-900/80 border-stone-800 hover:border-amber-700/50'
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs text-stone-400 font-medium block">{table.floorSection}</span>
                <h3 className="text-2xl font-extrabold text-stone-100 font-sans">{table.name}</h3>
              </div>
              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${getStatusBadge(table.status)}`}>
                {table.status}
              </span>
            </div>

            <div className="mt-6 flex items-center justify-between pt-4 border-t border-stone-800/80 text-xs text-stone-400">
              <div className="flex items-center space-x-1.5">
                <Users className="w-4 h-4 text-stone-500" />
                <span>Cap: {table.capacity} Persons</span>
              </div>
              {table.currentOrderId && (
                <span className="text-amber-400 font-mono font-bold">{table.currentOrderId}</span>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Table Details Modal */}
      {selectedTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-stone-900 border border-amber-700/40 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-6 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs text-amber-400 font-semibold">{selectedTable.floorSection}</span>
                <h3 className="text-2xl font-extrabold text-stone-100">{selectedTable.name}</h3>
                <p className="text-xs text-stone-400">Capacity: {selectedTable.capacity} Persons</p>
              </div>
              <button
                onClick={() => setSelectedTable(null)}
                className="w-8 h-8 rounded-full bg-stone-800 text-stone-400 hover:text-white flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            {/* Change Status */}
            <div>
              <label className="text-xs font-semibold text-stone-400 uppercase tracking-wider block mb-3">
                Update Status
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                {(['AVAILABLE', 'OCCUPIED', 'RESERVED', 'DIRTY'] as TableStatus[]).map((st) => (
                  <button
                    key={st}
                    onClick={() => updateTableStatus(selectedTable.id, st)}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${
                      selectedTable.status === st
                        ? 'bg-amber-600 border-amber-500 text-stone-950 shadow-md'
                        : 'bg-stone-800/40 border-stone-700/60 text-stone-300 hover:bg-stone-800'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-stone-800 space-y-2">
              {selectedTable.status === 'OCCUPIED' && (
                <button
                  onClick={() => setMovingTable(selectedTable)}
                  className="w-full py-3 rounded-2xl bg-amber-950/60 border border-amber-600/60 text-amber-300 hover:bg-amber-900/60 font-bold text-xs flex items-center justify-center space-x-2 transition-colors"
                >
                  <ArrowRightLeft className="w-4 h-4" />
                  <span>Move / Merge Order to Another Table</span>
                </button>
              )}

              <button
                onClick={() => {
                  setSelectedTable(null);
                  window.location.href = '/pos';
                }}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-500 text-stone-950 font-bold text-xs flex items-center justify-center space-x-2"
              >
                <Coffee className="w-4 h-4" />
                <span>Create New Order for {selectedTable.name}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Move Table Modal */}
      {movingTable && (
        <MoveTableModal
          sourceTable={movingTable}
          allTables={tables}
          onClose={() => setMovingTable(null)}
          onConfirmMove={handleConfirmTableMove}
        />
      )}
    </div>
  );
};
