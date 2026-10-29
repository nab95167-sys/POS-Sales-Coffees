import React, { useState } from 'react';
import { X, QrCode, Smartphone, Sparkles, CheckCircle2, ShoppingBag, ArrowRight } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface Props {
  onClose: () => void;
}

export const QrSelfOrderModal: React.FC<Props> = ({ onClose }) => {
  const [selectedTable, setSelectedTable] = useState('Table 4 (Main Floor)');

  const selfOrderUrl = `https://auracoffee.app/order?branch=001&table=${encodeURIComponent(selectedTable)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md font-sans">
      <div className="bg-stone-900 border border-amber-700/40 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 bg-stone-950 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-600 to-yellow-500 flex items-center justify-center text-stone-950 font-bold">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-stone-100">Customer QR Self-Ordering Kiosk</h3>
              <p className="text-xs text-stone-400">Scan QR Code for Table Self-Service Ordering</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-800 text-stone-400 hover:text-white flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 text-center space-y-5">
          {/* Table Selector */}
          <div>
            <label className="text-xs font-semibold text-stone-400 uppercase tracking-wider block mb-2">
              Select Table Location for QR Stand
            </label>
            <select
              value={selectedTable}
              onChange={(e) => setSelectedTable(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl glass-input text-stone-100 text-xs font-bold focus:outline-none"
            >
              <option value="Table 1 (Main Floor)" className="bg-stone-900">Table 1 (Main Floor)</option>
              <option value="Table 2 (Main Floor)" className="bg-stone-900">Table 2 (Main Floor)</option>
              <option value="Table 3 (Main Floor)" className="bg-stone-900">Table 3 (Main Floor)</option>
              <option value="Table 4 (Main Floor)" className="bg-stone-900">Table 4 (Main Floor)</option>
              <option value="Terrace 1 (Outdoor)" className="bg-stone-900">Terrace 1 (Outdoor)</option>
              <option value="VIP Lounge" className="bg-stone-900">VIP Lounge</option>
            </select>
          </div>

          {/* QR Renderer */}
          <div className="inline-block p-4 bg-white rounded-3xl shadow-2xl border border-amber-500/40 my-2">
            <QRCodeSVG value={selfOrderUrl} size={180} level="H" />
          </div>

          <div className="space-y-1">
            <span className="text-xs font-bold text-amber-400 block">Scan to View Menu & Order on Phone</span>
            <p className="text-[11px] text-stone-400">
              Orders placed by customers automatically route directly into the Kitchen KDS & POS Register.
            </p>
          </div>

          <div className="pt-2 border-t border-stone-800 flex items-center justify-between text-xs text-stone-400">
            <span className="flex items-center space-x-1">
              <Smartphone className="w-4 h-4 text-emerald-400" />
              <span>Mobile Web App Ready</span>
            </span>
            <span className="text-emerald-400 font-bold">Auto KDS Sync Active</span>
          </div>
        </div>
      </div>
    </div>
  );
};
