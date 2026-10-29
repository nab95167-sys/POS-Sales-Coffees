import React, { useState } from 'react';
import { X, ArrowRightLeft, Building, Package, CheckCircle2 } from 'lucide-react';
import { WORLDWIDE_BRANCHES } from '../../services/worldwideBranches';

interface Props {
  onClose: () => void;
}

export const WarehouseModal: React.FC<Props> = ({ onClose }) => {
  const [sourceWarehouse, setSourceWarehouse] = useState('Central Phnom Penh Warehouse');
  const [destinationBranch, setDestinationBranch] = useState(WORLDWIDE_BRANCHES[1].name);
  const [ingredientName, setIngredientName] = useState('Arabica Dark Roast Beans');
  const [transferQty, setTransferQty] = useState(50);

  const handleTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    alert(`Stock Transfer Initiated! Successfully transferred ${transferQty}kg of ${ingredientName} from [${sourceWarehouse}] to [${destinationBranch}].`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md font-sans">
      <div className="bg-stone-900 border border-amber-700/40 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 bg-stone-950 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-amber-600/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-bold">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-stone-100">Warehouse & Branch Stock Transfer</h3>
              <p className="text-xs text-stone-400">Inter-branch raw material inventory transfer</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-800 text-stone-400 hover:text-white flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleTransfer} className="p-6 space-y-4">
          <div>
            <label className="text-xs font-semibold text-stone-400 block mb-1">Source Warehouse</label>
            <select
              value={sourceWarehouse}
              onChange={(e) => setSourceWarehouse(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl glass-input text-stone-100 text-xs font-bold focus:outline-none"
            >
              <option value="Central Phnom Penh Warehouse" className="bg-stone-900">Central Phnom Penh Warehouse (#WH-01)</option>
              <option value="Bangkok Regional Hub" className="bg-stone-900">Bangkok Regional Hub (#WH-02)</option>
              <option value="Singapore Cold Chain Depot" className="bg-stone-900">Singapore Cold Chain Depot (#WH-03)</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-stone-400 block mb-1">Destination Branch</label>
            <select
              value={destinationBranch}
              onChange={(e) => setDestinationBranch(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl glass-input text-stone-100 text-xs font-bold focus:outline-none"
            >
              {WORLDWIDE_BRANCHES.map((b) => (
                <option key={b.id} value={b.name} className="bg-stone-900">
                  {b.flag} {b.name} ({b.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-stone-400 block mb-1">Raw Material Ingredient</label>
            <select
              value={ingredientName}
              onChange={(e) => setIngredientName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl glass-input text-stone-100 text-xs font-bold focus:outline-none"
            >
              <option value="Arabica Dark Roast Beans" className="bg-stone-900">Arabica Dark Roast Beans (kg)</option>
              <option value="Oat Milk Barista Edition" className="bg-stone-900">Oat Milk Barista Edition (L)</option>
              <option value="Monin Caramel Syrup" className="bg-stone-900">Monin Caramel Syrup (Btl)</option>
              <option value="Matcha Uji Powder" className="bg-stone-900">Matcha Uji Powder (kg)</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-stone-400 block mb-1">Transfer Quantity</label>
            <input
              type="number"
              required
              min={1}
              value={transferQty}
              onChange={(e) => setTransferQty(Number(e.target.value))}
              className="w-full px-4 py-2.5 rounded-xl glass-input text-stone-100 text-sm font-mono font-bold focus:outline-none"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3 rounded-2xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs flex items-center justify-center space-x-2 shadow-lg"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Confirm Stock Transfer dispatch</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
