import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layers, Users, Coffee, ArrowRightLeft, RefreshCw, X } from 'lucide-react';
import { DiningTable, TableStatus } from '../../types';
import { fetchTables, updateTableStatusApi, transferTableApi } from '../../services/orderService';
import { showToastNotification } from '../../services/telegramBotService';
import { useLanguage } from '../../context/LanguageContext';
import { PageHeader } from '../ui/PageHeader';
import { MoveTableModal } from './MoveTableModal';

export const FloorPlan: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [tables, setTables] = useState<DiningTable[]>([]);
  const [selectedSection, setSelectedSection] = useState<'All' | 'Main Floor' | 'Terrace' | 'VIP Lounge'>('All');
  const [selectedTable, setSelectedTable] = useState<DiningTable | null>(null);
  const [movingTable, setMovingTable] = useState<DiningTable | null>(null);
  const [loading, setLoading] = useState(true);

  const loadTables = useCallback(async () => {
    try {
      const data = await fetchTables();
      setTables(data);
    } catch (err) {
      console.error('Failed to load tables:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTables();
    const onUpdate = () => { void loadTables(); };
    window.addEventListener('coffee_tables_updated', onUpdate);
    window.addEventListener('coffee_order_created', onUpdate);
    return () => {
      window.removeEventListener('coffee_tables_updated', onUpdate);
      window.removeEventListener('coffee_order_created', onUpdate);
    };
  }, [loadTables]);

  const filteredTables = tables.filter((tb) => {
    if (selectedSection === 'All') return true;
    return tb.floorSection === selectedSection;
  });

  const getStatusBadge = (status: TableStatus) => {
    switch (status) {
      case 'AVAILABLE':
        return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35';
      case 'OCCUPIED':
        return 'bg-amber-500/15 text-amber-300 border-amber-500/35';
      case 'RESERVED':
        return 'bg-purple-500/15 text-purple-300 border-purple-500/35';
      case 'DIRTY':
        return 'bg-red-500/15 text-red-300 border-red-500/35';
    }
  };

  const updateTableStatus = async (tableId: string, status: TableStatus) => {
    try {
      const updated = await updateTableStatusApi(tableId, status);
      setTables((prev) => prev.map((tb) => (tb.id === tableId ? updated : tb)));
      if (selectedTable && selectedTable.id === tableId) {
        setSelectedTable(updated);
      }
      showToastNotification(`${updated.name} status updated to ${status}`, 'success');
    } catch (err) {
      showToastNotification(err instanceof Error ? err.message : 'Failed to update table status', 'error');
    }
  };

  const handleConfirmTableMove = async (targetTableId: string) => {
    if (!movingTable) return;
    try {
      const updatedTables = await transferTableApi(movingTable.id, targetTableId);
      setTables(updatedTables);
      const fromName = movingTable.name;
      setMovingTable(null);
      setSelectedTable(null);
      showToastNotification(`Order transferred successfully from ${fromName}.`, 'success');
    } catch (err) {
      showToastNotification(err instanceof Error ? err.message : 'Failed to transfer table', 'error');
    }
  };

  const availCount = tables.filter((tb) => tb.status === 'AVAILABLE').length;
  const occupiedCount = tables.filter((tb) => tb.status === 'OCCUPIED').length;

  return (
    <div className="space-y-5 font-sans">
      <PageHeader
        icon={<Layers className="w-5 h-5" />}
        title={t('tablesTitle')}
        subtitle={t('tablesSub')}
        badge={`${availCount} Free • ${occupiedCount} Occupied`}
        actions={
          <button
            type="button"
            onClick={() => void loadTables()}
            className="px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-zinc-200 text-xs font-bold flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{t('refresh')}</span>
          </button>
        }
      />

      {/* Section Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {(['All', 'Main Floor', 'Terrace', 'VIP Lounge'] as const).map((sec) => (
          <button
            key={sec}
            type="button"
            onClick={() => setSelectedSection(sec)}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              selectedSection === sec
                ? 'gold-gradient-bg text-zinc-950 shadow-md'
                : 'bg-white/[0.04] border border-white/10 text-zinc-300 hover:bg-white/[0.08]'
            }`}
          >
            {sec}
          </button>
        ))}
      </div>

      {/* Tables Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
        {filteredTables.map((table) => (
          <button
            key={table.id}
            type="button"
            onClick={() => setSelectedTable(table)}
            className={`p-5 rounded-2xl border text-left flex flex-col justify-between transition-all duration-150 glass-card-hover shadow-xl ${
              table.status === 'OCCUPIED'
                ? 'bg-gradient-to-br from-[#16171e] to-amber-950/25 border-amber-500/45'
                : table.status === 'RESERVED'
                ? 'bg-gradient-to-br from-[#16171e] to-purple-950/25 border-purple-500/45'
                : 'glass-card'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-[11px] text-zinc-400 font-semibold block">{table.floorSection}</span>
                <h3 className="text-xl sm:text-2xl font-black text-zinc-100 mt-0.5">{table.name}</h3>
              </div>
              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${getStatusBadge(table.status)}`}>
                {table.status}
              </span>
            </div>

            <div className="mt-5 flex items-center justify-between pt-3.5 border-t border-white/10 text-xs text-zinc-400">
              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-zinc-500" />
                <span>{table.capacity} Seats</span>
              </div>
              {table.currentOrderId && (
                <span className="text-amber-400 font-mono font-bold truncate max-w-[110px]">#{table.currentOrderId}</span>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Table Detail Modal */}
      {selectedTable && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          onClick={() => setSelectedTable(null)}
        >
          <div
            className="glass-panel border border-amber-500/35 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs text-amber-400 font-semibold">{selectedTable.floorSection}</span>
                <h3 className="text-2xl font-black text-zinc-100">{selectedTable.name}</h3>
                <p className="text-xs text-zinc-400">Capacity: {selectedTable.capacity} Seats</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTable(null)}
                className="w-8 h-8 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-2.5">
                Update Table Status
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(['AVAILABLE', 'OCCUPIED', 'RESERVED', 'DIRTY'] as TableStatus[]).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => void updateTableStatus(selectedTable.id, st)}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${
                      selectedTable.status === st
                        ? 'bg-amber-500 border-amber-400 text-zinc-950 shadow-sm'
                        : 'bg-white/[0.03] border-white/10 text-zinc-300 hover:bg-white/[0.07]'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-white/10 space-y-2">
              {selectedTable.status === 'OCCUPIED' && (
                <button
                  type="button"
                  onClick={() => setMovingTable(selectedTable)}
                  className="w-full py-3 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 hover:bg-amber-500/25 font-bold text-xs flex items-center justify-center gap-2 transition-colors"
                >
                  <ArrowRightLeft className="w-4 h-4" />
                  <span>Move / Merge Order to Another Table</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  const chosen = selectedTable;
                  setSelectedTable(null);
                  navigate('/pos', { state: { selectedTable: chosen } });
                }}
                className="w-full py-3 rounded-xl gold-gradient-bg hover:brightness-110 text-zinc-950 font-extrabold text-xs flex items-center justify-center gap-2"
              >
                <Coffee className="w-4 h-4" />
                <span>Open POS Ticket for {selectedTable.name}</span>
              </button>
            </div>
          </div>
        </div>
      )}

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
