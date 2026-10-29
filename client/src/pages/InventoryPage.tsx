import React, { useState } from 'react';
import { Package, AlertTriangle, Plus, ArrowRightLeft, Truck, RefreshCw, Send, Bell, Clock } from 'lucide-react';
import { Ingredient } from '../types';
import { INITIAL_INGREDIENTS } from '../services/mockData';
import { sendTelegramLowStockAlert } from '../services/telegramBotService';
import { WarehouseModal } from '../components/inventory/WarehouseModal';
import { SupplierOrderModal } from '../components/inventory/SupplierOrderModal';

export const InventoryPage: React.FC = () => {
  const [ingredients, setIngredients] = useState<Ingredient[]>(INITIAL_INGREDIENTS);
  const [showWarehouseModal, setShowWarehouseModal] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);

  const handleStockAdjust = (id: string, delta: number) => {
    setIngredients((prev) =>
      prev.map((ing) => {
        if (ing.id === id) {
          const newStock = Math.max(0, ing.currentStock + delta);
          const nowStr = new Date().toLocaleString('km-KH');
          const updatedIng: Ingredient = {
            ...ing,
            currentStock: newStock,
            outOfStockDate: newStock <= ing.minStockAlert ? nowStr : undefined,
          };

          if (newStock <= ing.minStockAlert) {
            sendTelegramLowStockAlert(updatedIng);
          }

          return updatedIng;
        }
        return ing;
      })
    );
  };

  const handleDispatchAllAlerts = () => {
    const lowStockItems = ingredients.filter((ing) => ing.currentStock <= ing.minStockAlert);
    if (lowStockItems.length === 0) {
      alert('All raw material stock levels are optimal!');
      return;
    }
    lowStockItems.forEach((ing) => sendTelegramLowStockAlert(ing));
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-stone-900/80 p-4 rounded-3xl border border-stone-800 glass-panel">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-600/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-stone-100">Raw Ingredients, Warehouse & Vendor Supply</h2>
            <p className="text-xs text-stone-400">Stock tracking, automatic recipe deductions, branch transfers & PO management</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowWarehouseModal(true)}
            className="px-3.5 py-2 rounded-xl bg-stone-900 border border-amber-600/40 text-amber-300 hover:bg-stone-800 font-bold text-xs flex items-center space-x-1.5 transition-colors"
          >
            <ArrowRightLeft className="w-4 h-4 text-amber-400" />
            <span>Branch Transfer</span>
          </button>

          <button
            onClick={() => setShowSupplierModal(true)}
            className="px-3.5 py-2 rounded-xl bg-blue-950/60 border border-blue-600/40 text-blue-300 hover:bg-blue-900/60 font-bold text-xs flex items-center space-x-1.5 transition-colors"
          >
            <Truck className="w-4 h-4 text-blue-400" />
            <span>Supplier PO</span>
          </button>

          <button
            onClick={handleDispatchAllAlerts}
            className="px-3.5 py-2 rounded-xl bg-amber-950/60 border border-amber-600/60 text-amber-300 hover:bg-amber-900/60 font-bold text-xs flex items-center space-x-1.5 transition-colors"
          >
            <Bell className="w-4 h-4 text-amber-400" />
            <span>Telegram Alert</span>
          </button>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-stone-900/80 border border-stone-800 rounded-3xl overflow-hidden glass-panel">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-950/80 text-stone-400 uppercase font-semibold border-b border-stone-800">
              <tr>
                <th className="p-4">Ingredient Name</th>
                <th className="p-4">Current Level</th>
                <th className="p-4">Min Alert Threshold</th>
                <th className="p-4">Cost / Unit</th>
                <th className="p-4">Out of Stock Date & Time</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Quick Restock / Adjust</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800/80 font-sans">
              {ingredients.map((ing) => {
                const isLow = ing.currentStock <= ing.minStockAlert;

                return (
                  <tr key={ing.id} className="hover:bg-stone-800/30 transition-colors">
                    <td className="p-4 font-bold text-stone-100 text-sm">{ing.name}</td>
                    <td className="p-4 font-mono text-amber-300 font-bold">
                      {ing.currentStock} {ing.unit}
                    </td>
                    <td className="p-4 font-mono text-stone-400">
                      {ing.minStockAlert} {ing.unit}
                    </td>
                    <td className="p-4 font-mono text-stone-300">${ing.costPerUnit.toFixed(4)}</td>
                    <td className="p-4 font-mono text-xs">
                      {isLow ? (
                        <span className="text-red-400 font-bold flex items-center space-x-1">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{ing.outOfStockDate || new Date().toLocaleString('km-KH')}</span>
                        </span>
                      ) : (
                        <span className="text-stone-500">In Stock</span>
                      )}
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                          isLow
                            ? 'bg-red-500/20 text-red-400 border-red-500/40 animate-pulse'
                            : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                        }`}
                      >
                        {isLow ? '⚠️ Depleted' : 'Optimal'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          onClick={() => handleStockAdjust(ing.id, -5)}
                          className="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold"
                          title="Deduct 5 units"
                        >
                          -5
                        </button>
                        <button
                          onClick={() => handleStockAdjust(ing.id, 10)}
                          className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold"
                          title="Restock +10 units"
                        >
                          +10 Restock
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {showWarehouseModal && <WarehouseModal onClose={() => setShowWarehouseModal(false)} />}
      {showSupplierModal && <SupplierOrderModal onClose={() => setShowSupplierModal(false)} />}
    </div>
  );
};
