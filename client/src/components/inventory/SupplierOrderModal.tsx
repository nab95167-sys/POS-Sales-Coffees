import React, { useState } from 'react';
import { X, Truck, FileText, CheckCircle2, DollarSign } from 'lucide-react';

interface Props {
  onClose: () => void;
}

export const SupplierOrderModal: React.FC<Props> = ({ onClose }) => {
  const [supplier, setSupplier] = useState('Mondulkiri Organic Coffee Farmers (Cambodia)');
  const [poNumber, setPoNumber] = useState(`PO-2026-${Math.floor(1000 + Math.random() * 9000)}`);
  const [itemName, setItemName] = useState('Raw Green Coffee Beans (Grade A)');
  const [totalCost, setTotalCost] = useState(1250.00);

  const handleCreatePO = (e: React.FormEvent) => {
    e.preventDefault();
    alert(`Purchase Order #${poNumber} issued to supplier [${supplier}] for $${totalCost.toFixed(2)}! Pending delivery tracking.`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md font-sans">
      <div className="bg-stone-900 border border-amber-700/40 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 bg-stone-950 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 font-bold">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-stone-100">Supplier Purchase Order (PO)</h3>
              <p className="text-xs text-stone-400">Issue PO, manage vendors & accounts payable</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-800 text-stone-400 hover:text-white flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleCreatePO} className="p-6 space-y-4">
          <div>
            <label className="text-xs font-semibold text-stone-400 block mb-1">Select Registered Supplier / Vendor</label>
            <select
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl glass-input text-stone-100 text-xs font-bold focus:outline-none"
            >
              <option value="Mondulkiri Organic Coffee Farmers (Cambodia)" className="bg-stone-900">Mondulkiri Organic Coffee Farmers (Cambodia 🇰🇭)</option>
              <option value="Chiang Rai Arabica Estate (Thailand)" className="bg-stone-900">Chiang Rai Arabica Estate (Thailand 🇹🇭)</option>
              <option value="Oatly Dairy Asia Pacific (Singapore)" className="bg-stone-900">Oatly Dairy Asia Pacific (Singapore 🇸🇬)</option>
              <option value="Monin Syrup Distributors Ltd" className="bg-stone-900">Monin Syrup Distributors Ltd</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-stone-400 block mb-1">Purchase Order (PO) Number</label>
            <input
              type="text"
              readOnly
              value={poNumber}
              className="w-full px-4 py-2.5 rounded-xl glass-input text-stone-300 text-xs font-mono font-bold"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-stone-400 block mb-1">Raw Material Item Description</label>
            <input
              type="text"
              required
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl glass-input text-stone-100 text-xs focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-stone-400 block mb-1">Total PO Invoice Cost ($)</label>
            <input
              type="number"
              step="0.01"
              required
              value={totalCost}
              onChange={(e) => setTotalCost(Number(e.target.value))}
              className="w-full px-4 py-2.5 rounded-xl glass-input text-stone-100 text-sm font-mono font-bold focus:outline-none"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-amber-600 hover:from-blue-500 hover:to-amber-500 text-stone-950 font-bold text-xs flex items-center justify-center space-x-2 shadow-lg"
            >
              <FileText className="w-4 h-4" />
              <span>Issue Official Purchase Order</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
