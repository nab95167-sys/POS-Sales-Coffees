import React, { useEffect, useState } from 'react';
import {
  Package, Plus, ArrowRightLeft, Truck, RefreshCw, Bell, Clock, Trash2, X, Search, AlertTriangle, CheckCircle2, DollarSign
} from 'lucide-react';
import { Ingredient } from '../types';
import { apiFetch, ApiError } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { showToastNotification } from '../services/telegramBotService';
import { PageHeader } from '../components/ui/PageHeader';
import { StatCard } from '../components/ui/StatCard';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { WarehouseModal } from '../components/inventory/WarehouseModal';
import { SupplierOrderModal } from '../components/inventory/SupplierOrderModal';

export const InventoryPage: React.FC = () => {
  const { hasGranularPermission } = useAuth();
  const { t } = useLanguage();
  const canEdit = hasGranularPermission('inventory:edit');

  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [stockFilter, setStockFilter] = useState<'ALL' | 'OPTIMAL' | 'LOW'>('ALL');

  const [showWarehouseModal, setShowWarehouseModal] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<Ingredient | null>(null);

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
        showToastNotification(
          `Low Stock Alert: ${data.ingredient.name} (${data.ingredient.currentStock} ${data.ingredient.unit})`,
          'warning'
        );
      } else {
        showToastNotification(`Updated ${data.ingredient.name} stock.`, 'success');
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
      showToastNotification(`Added ${data.ingredient.name} to inventory.`, 'success');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to add ingredient');
    }
  };

  const handleConfirmDelete = async () => {
    if (!canEdit || !confirmTarget) return;
    setBusyId(confirmTarget.id);
    setError(null);
    try {
      await apiFetch(`/api/v1/inventory/${confirmTarget.id}`, { method: 'DELETE' });
      setIngredients((prev) => prev.filter((item) => item.id !== confirmTarget.id));
      showToastNotification(`Removed ${confirmTarget.name}.`, 'info');
      setConfirmTarget(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete ingredient');
    } finally {
      setBusyId(null);
    }
  };

  const handleDispatchAllAlerts = () => {
    const lowItems = ingredients.filter((ing) => ing.currentStock <= ing.minStockAlert);
    if (lowItems.length === 0) {
      showToastNotification('All raw material stock levels are optimal!', 'success');
      return;
    }
    showToastNotification(
      `Low Stock Warning (${lowItems.length}): ${lowItems.map((i) => i.name).join(', ')}`,
      'warning'
    );
  };

  const lowCount = ingredients.filter((i) => i.currentStock <= i.minStockAlert).length;
  const optimalCount = ingredients.length - lowCount;
  const totalValue = ingredients.reduce((sum, i) => sum + i.currentStock * i.costPerUnit, 0);

  const filteredIngredients = ingredients.filter((ing) => {
    const matchesSearch = ing.name.toLowerCase().includes(searchQuery.toLowerCase());
    const isLow = ing.currentStock <= ing.minStockAlert;
    const matchesFilter =
      stockFilter === 'ALL' ? true : stockFilter === 'LOW' ? isLow : !isLow;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-5 font-sans">
      <PageHeader
        icon={<Package className="w-5 h-5" />}
        title={t('inventory')}
        subtitle={t('inventorySub')}
        badge={`${ingredients.length} SKUs`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void loadInventory()}
              disabled={loading}
              className="px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-zinc-200 font-bold text-xs flex items-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>{t('refresh')}</span>
            </button>

            {canEdit && (
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="px-3.5 py-2 rounded-xl gold-gradient-bg hover:brightness-110 text-zinc-950 font-extrabold text-xs flex items-center gap-1.5 shadow-lg shadow-amber-900/25"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>{t('addIngredient')}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowWarehouseModal(true)}
              className="px-3 py-2 rounded-xl bg-white/[0.04] border border-amber-500/35 text-amber-300 hover:bg-white/[0.08] font-bold text-xs flex items-center gap-1.5"
            >
              <ArrowRightLeft className="w-3.5 h-3.5 text-amber-400" />
              <span>Transfer</span>
            </button>

            <button
              type="button"
              onClick={() => setShowSupplierModal(true)}
              className="px-3 py-2 rounded-xl bg-sky-950/50 border border-sky-500/35 text-sky-300 hover:bg-sky-900/50 font-bold text-xs flex items-center gap-1.5"
            >
              <Truck className="w-3.5 h-3.5 text-sky-400" />
              <span>Supplier PO</span>
            </button>

            <button
              type="button"
              onClick={handleDispatchAllAlerts}
              className="px-3 py-2 rounded-xl bg-amber-950/50 border border-amber-500/40 text-amber-300 hover:bg-amber-900/50 font-bold text-xs flex items-center gap-1.5"
            >
              <Bell className="w-3.5 h-3.5 text-amber-400" />
              <span>Alerts</span>
            </button>
          </div>
        }
      />

      {/* Summary KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <StatCard label="Total Ingredients" value={ingredients.length} subtext="Tracked raw items" icon={<Package className="w-4 h-4" />} accent="amber" />
        <StatCard label="Optimal Stock" value={optimalCount} subtext="Above min threshold" icon={<CheckCircle2 className="w-4 h-4" />} accent="emerald" />
        <StatCard label="Low / Depleted" value={lowCount} subtext="Restock recommended" icon={<AlertTriangle className="w-4 h-4" />} accent={lowCount > 0 ? 'red' : 'emerald'} />
        <StatCard label="Stock Valuation" value={`$${totalValue.toFixed(2)}`} subtext="Cost basis in vault" icon={<DollarSign className="w-4 h-4" />} accent="blue" />
      </div>

      {/* Filter Bar */}
      <div className="glass-panel rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search ingredient name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2 rounded-xl glass-input text-xs focus:outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2 text-zinc-400 hover:text-zinc-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 bg-[#0b0c10] p-1 rounded-xl border border-white/10 self-start sm:self-auto">
          {(['ALL', 'OPTIMAL', 'LOW'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setStockFilter(f)}
              className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                stockFilter === f ? 'bg-amber-500 text-zinc-950' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {f === 'ALL' ? 'All Items' : f === 'LOW' ? `Low Stock (${lowCount})` : 'Optimal'}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/45 text-red-200 text-xs font-semibold">
          {error}
        </div>
      )}

      {/* Mobile Cards (< md) */}
      <div className="md:hidden space-y-3">
        {loading && ingredients.length === 0 ? (
          <div className="glass-card rounded-2xl p-8 text-center text-xs text-zinc-400">Loading inventory...</div>
        ) : filteredIngredients.length === 0 ? (
          <div className="glass-card rounded-2xl p-8 text-center text-xs text-zinc-500">No ingredients match your filters.</div>
        ) : (
          filteredIngredients.map((ing) => {
            const isLow = ing.currentStock <= ing.minStockAlert;
            const isBusy = busyId === ing.id;
            return (
              <div key={ing.id} className="glass-card rounded-2xl p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-extrabold text-zinc-100">{ing.name}</h4>
                    <span className="text-[11px] font-mono text-zinc-400">
                      Min: {ing.minStockAlert} {ing.unit} • ${ing.costPerUnit.toFixed(4)}/{ing.unit}
                    </span>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                      isLow ? 'bg-red-500/15 text-red-300 border-red-500/35' : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35'
                    }`}
                  >
                    {isLow ? 'Low Stock' : 'Optimal'}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/10">
                  <span className="text-base font-black font-mono text-amber-300">
                    {ing.currentStock} {ing.unit}
                  </span>

                  {canEdit ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => void handleStockAdjust(ing.id, -5)}
                        disabled={isBusy}
                        className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold disabled:opacity-40"
                      >
                        -5
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleStockAdjust(ing.id, 10)}
                        disabled={isBusy}
                        className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-extrabold disabled:opacity-40"
                      >
                        +10
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmTarget(ing)}
                        disabled={isBusy}
                        className="p-1.5 rounded-lg bg-red-950/60 text-red-400 border border-red-500/30"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <span className="text-[11px] text-zinc-500 italic">View Only</span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Desktop Table (md+) */}
      <div className="hidden md:block glass-panel rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0b0c10] text-zinc-400 uppercase font-bold border-b border-white/10">
              <tr>
                <th className="p-4">Ingredient Name</th>
                <th className="p-4">Current Level</th>
                <th className="p-4">Min Alert</th>
                <th className="p-4">Cost / Unit</th>
                <th className="p-4">Updated</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Adjustments</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading && ingredients.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-zinc-400">Loading inventory...</td>
                </tr>
              ) : filteredIngredients.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-zinc-500">No ingredients match your criteria.</td>
                </tr>
              ) : (
                filteredIngredients.map((ing) => {
                  const isLow = ing.currentStock <= ing.minStockAlert;
                  const isBusy = busyId === ing.id;
                  return (
                    <tr key={ing.id} className="hover:bg-white/[0.025] transition-colors">
                      <td className="p-4 font-bold text-zinc-100 text-sm">{ing.name}</td>
                      <td className="p-4 font-mono text-amber-300 font-bold">
                        {ing.currentStock} {ing.unit}
                      </td>
                      <td className="p-4 font-mono text-zinc-400">
                        {ing.minStockAlert} {ing.unit}
                      </td>
                      <td className="p-4 font-mono text-zinc-300">${ing.costPerUnit.toFixed(4)}</td>
                      <td className="p-4 font-mono text-xs">
                        {isLow ? (
                          <span className="text-red-400 font-bold flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            <span>{ing.outOfStockDate || 'Threshold reached'}</span>
                          </span>
                        ) : (
                          <span className="text-zinc-500">{ing.lastRestocked || 'Active'}</span>
                        )}
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                            isLow
                              ? 'bg-red-500/15 text-red-300 border-red-500/35'
                              : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35'
                          }`}
                        >
                          {isLow ? 'Low Stock' : 'Optimal'}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        {canEdit ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => void handleStockAdjust(ing.id, -5)}
                              disabled={isBusy}
                              className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold disabled:opacity-40"
                            >
                              -5
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleStockAdjust(ing.id, 10)}
                              disabled={isBusy}
                              className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-extrabold disabled:opacity-40"
                            >
                              +10 Restock
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmTarget(ing)}
                              disabled={isBusy}
                              className="p-1.5 rounded-lg bg-red-950/60 hover:bg-red-900/70 text-red-400 border border-red-500/30 disabled:opacity-40"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-zinc-500 italic">View Only</span>
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
          <div className="w-full max-w-md glass-panel border border-white/15 rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-zinc-100">Add New Ingredient</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-zinc-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={(e) => void handleAddIngredient(e)} className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-400 font-semibold mb-1">Ingredient Name *</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Caramel Syrup"
                  className="w-full px-3 py-2 rounded-xl glass-input focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Unit</label>
                  <select
                    value={newUnit}
                    onChange={(e) => setNewUnit(e.target.value as Ingredient['unit'])}
                    className="w-full px-3 py-2 rounded-xl glass-input focus:outline-none"
                  >
                    <option value="g" className="bg-zinc-900">g (Grams)</option>
                    <option value="kg" className="bg-zinc-900">kg (Kilograms)</option>
                    <option value="ml" className="bg-zinc-900">ml (Milliliters)</option>
                    <option value="l" className="bg-zinc-900">l (Liters)</option>
                    <option value="pcs" className="bg-zinc-900">pcs (Pieces)</option>
                    <option value="shots" className="bg-zinc-900">shots (Espresso)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Current Stock</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={newStock}
                    onChange={(e) => setNewStock(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl glass-input focus:outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Min Alert Level</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={newMinAlert}
                    onChange={(e) => setNewMinAlert(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl glass-input focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Cost / Unit ($)</label>
                  <input
                    type="number"
                    step="0.0001"
                    min="0"
                    required
                    value={newCost}
                    onChange={(e) => setNewCost(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl glass-input focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 font-bold"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl gold-gradient-bg text-zinc-950 font-extrabold"
                >
                  Save Ingredient
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showWarehouseModal && <WarehouseModal onClose={() => setShowWarehouseModal(false)} />}
      {showSupplierModal && <SupplierOrderModal onClose={() => setShowSupplierModal(false)} />}

      <ConfirmDialog
        isOpen={Boolean(confirmTarget)}
        title="Delete Ingredient"
        message={`Remove "${confirmTarget?.name || ''}" permanently from raw material inventory?`}
        confirmLabel="Delete"
        busy={Boolean(confirmTarget && busyId === confirmTarget.id)}
        onConfirm={() => void handleConfirmDelete()}
        onCancel={() => setConfirmTarget(null)}
      />
    </div>
  );
};
