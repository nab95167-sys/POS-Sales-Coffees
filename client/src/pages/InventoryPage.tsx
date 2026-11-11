import React, { useEffect, useState } from 'react';
import { Package, Plus, ArrowRightLeft, Truck, RefreshCw, Bell, Clock, Trash2, X } from 'lucide-react';
import { Ingredient } from '../types';
import { apiFetch, ApiError } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { showToastNotification } from '../services/telegramBotService';
import { WarehouseModal } from '../components/inventory/WarehouseModal';
import { SupplierOrderModal } from '../components/inventory/SupplierOrderModal';

export const InventoryPage: React.FC = () => {
  const { hasGranularPermission } = useAuth();
  const canEdit = hasGranularPermission('inventory:edit');

  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showWarehouseModal, setShowWarehouseModal] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  const [newName, setNewName] = useState('');
  const [newUnit, setNewUnit] = useState<Ingredient['unit']>('g');
  const [newStock, setNewStock] = useState('1000');
  const [newMinAlert, setNewMinAlert] = useState('200');
  const [newCost, setNewCost] = useState('0.02');

  const loadInventory = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<{ ingredients: Ingredient[] }>('/api/v1/inventory');
      setIngredients(data.ingredients);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadInventory();
  }, []);

  const handleStockAdjust = async (id: string, delta: number) => {
    if (!canEdit) return;
    setBusyId(id);
    setError(null);
    try {
      const data = await apiFetch<{ ingredient: Ingredient }>(`/api/v1/inventory/${id}/adjust`, {
        method: 'PATCH',
        body: { delta },
      });
      setIngredients((prev) => prev.map((ing) => (ing.id === id ? data.ingredient : ing)));
      if (data.ingredient.currentStock <= data.ingredient.minStockAlert) {
        showToastNotification(`Low Stock Alert: ${data.ingredient.name} (${data.ingredient.currentStock} ${data.ingredient.unit})`);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to adjust stock');
    } finally {
      setBusyId(null);
    }
  };

  const handleAddIngredient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit || !newName.trim()) return;
    setError(null);
    try {
      const data = await apiFetch<{ ingredient: Ingredient }>('/api/v1/inventory', {
        method: 'POST',
        body: {
          name: newName.trim(),
          unit: newUnit,
          currentStock: Math.max(0, Number(newStock) || 0),
          minStockAlert: Math.max(0, Number(newMinAlert) || 0),
          costPerUnit: Math.max(0, Number(newCost) || 0),
        },
      });
      setIngredients((prev) => [...prev, data.ingredient].sort((a, b) => a.name.localeCompare(b.name)));
      setNewName('');
      setShowAddModal(false);
      showToastNotification(`Added ${data.ingredient.name} to inventory.`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to add ingredient');
    }
  };

  const handleDeleteIngredient = async (ing: Ingredient) => {
    if (!canEdit) return;
    if (!confirm(`Delete ingredient "${ing.name}" from inventory?`)) return;
    setBusyId(ing.id);
    setError(null);
    try {
      await apiFetch(`/api/v1/inventory/${ing.id}`, { method: 'DELETE' });
      setIngredients((prev) => prev.filter((item) => item.id !== ing.id));
      showToastNotification(`Removed ${ing.name}.`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete ingredient');
    } finally {
      setBusyId(null);
    }
  };

  const handleDispatchAllAlerts = () => {
    const lowStockItems = ingredients.filter((ing) => ing.currentStock <= ing.minStockAlert);
    if (lowStockItems.length === 0) {
      showToastNotification('All raw material stock levels are optimal!');
      return;
    }
    showToastNotification(
      `Low Stock Warning (${lowStockItems.length}): ${lowStockItems.map((i) => i.name).join(', ')}`
    );
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
            <p className="text-xs text-stone-400">Live SQLite stock tracking, automatic recipe deductions & low-stock alerts</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => void loadInventory()}
            disabled={loading}
            className="px-3 py-2 rounded-xl bg-stone-900 border border-stone-700 text-stone-300 hover:bg-stone-800 font-bold text-xs flex items-center space-x-1.5 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          {canEdit && (
            <button
              onClick={() => setShowAddModal(true)}
              className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs flex items-center space-x-1.5 transition-colors shadow-lg shadow-amber-900/30"
            >
              <Plus className="w-4 h-4" />
              <span>Add Ingredient</span>
            </button>
          )}

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
            <span>Low Stock Alert</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-2xl bg-red-950/50 border border-red-700/50 text-red-300 text-xs font-semibold">
          {error}
        </div>
      )}

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
                <th className="p-4">Last Restocked / Depleted</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Quick Restock / Adjust</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800/80 font-sans">
              {loading && ingredients.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-stone-400">
                    Loading inventory...
                  </td>
                </tr>
              ) : ingredients.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-stone-500">
                    No ingredients recorded yet.
                  </td>
                </tr>
              ) : (
                ingredients.map((ing) => {
                  const isLow = ing.currentStock <= ing.minStockAlert;
                  const isBusy = busyId === ing.id;

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
                            <span>{ing.outOfStockDate || 'Low threshold reached'}</span>
                          </span>
                        ) : (
                          <span className="text-stone-500">Restocked: {ing.lastRestocked || 'N/A'}</span>
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
                          {isLow ? 'Depleted / Low' : 'Optimal'}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        {canEdit ? (
                          <div className="flex items-center justify-end space-x-1.5">
                            <button
                              onClick={() => void handleStockAdjust(ing.id, -5)}
                              disabled={isBusy}
                              className="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold disabled:opacity-40"
                              title="Deduct 5 units"
                            >
                              -5
                            </button>
                            <button
                              onClick={() => void handleStockAdjust(ing.id, 10)}
                              disabled={isBusy}
                              className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold disabled:opacity-40"
                              title="Restock +10 units"
                            >
                              +10 Restock
                            </button>
                            <button
                              onClick={() => void handleDeleteIngredient(ing)}
                              disabled={isBusy}
                              className="p-1.5 rounded-lg bg-red-950/60 hover:bg-red-900/70 text-red-400 border border-red-800/40 disabled:opacity-40"
                              title="Delete Ingredient"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-stone-500 italic">View Only</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Ingredient Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-stone-900 border border-stone-700 rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-stone-100">Add New Ingredient</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-xl bg-stone-800 text-stone-400 hover:text-stone-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={(e) => void handleAddIngredient(e)} className="space-y-3 text-xs">
              <div>
                <label className="block text-stone-400 font-semibold mb-1">Ingredient Name *</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Caramel Syrup"
                  className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-700 text-stone-100 focus:outline-none focus:border-amber-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-400 font-semibold mb-1">Unit</label>
                  <select
                    value={newUnit}
                    onChange={(e) => setNewUnit(e.target.value as Ingredient['unit'])}
                    className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-700 text-stone-100 focus:outline-none focus:border-amber-500"
                  >
                    <option value="g">g (Grams)</option>
                    <option value="kg">kg (Kilograms)</option>
                    <option value="ml">ml (Milliliters)</option>
                    <option value="l">l (Liters)</option>
                    <option value="pcs">pcs (Pieces)</option>
                    <option value="shots">shots (Espresso)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-stone-400 font-semibold mb-1">Current Stock</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={newStock}
                    onChange={(e) => setNewStock(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-700 text-stone-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-400 font-semibold mb-1">Min Alert Level</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={newMinAlert}
                    onChange={(e) => setNewMinAlert(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-700 text-stone-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-stone-400 font-semibold mb-1">Cost / Unit ($)</label>
                  <input
                    type="number"
                    step="0.0001"
                    min="0"
                    required
                    value={newCost}
                    onChange={(e) => setNewCost(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-700 text-stone-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-stone-800 text-stone-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold"
                >
                  Save Ingredient
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modals */}
      {showWarehouseModal && <WarehouseModal onClose={() => setShowWarehouseModal(false)} />}
      {showSupplierModal && <SupplierOrderModal onClose={() => setShowSupplierModal(false)} />}
    </div>
  );
};
