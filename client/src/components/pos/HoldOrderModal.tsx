import React, { useState } from 'react';
import { X, PauseCircle, PlayCircle, Trash2, Clock, Coffee, User } from 'lucide-react';
import { CartItem, OrderType } from '../../types';

export interface HeldOrder {
  id: string;
  holdName: string;
  cart: CartItem[];
  orderType: OrderType;
  totalAmount: number;
  heldAt: string;
}

interface Props {
  activeCart: CartItem[];
  heldOrders: HeldOrder[];
  onClose: () => void;
  onHoldCurrentCart: (holdName: string) => void;
  onResumeOrder: (heldOrder: HeldOrder) => void;
  onDeleteHeldOrder: (id: string) => void;
}

export const HoldOrderModal: React.FC<Props> = ({
  activeCart,
  heldOrders,
  onClose,
  onHoldCurrentCart,
  onResumeOrder,
  onDeleteHeldOrder,
}) => {
  const [holdName, setHoldName] = useState('');

  const activeSubtotal = activeCart.reduce((sum, item) => sum + item.itemSubtotal, 0);

  const handleHold = () => {
    if (activeCart.length === 0) return;
    onHoldCurrentCart(holdName || `Customer #${Math.floor(100 + Math.random() * 900)}`);
    setHoldName('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-stone-900 border border-amber-700/40 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 bg-stone-950 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-amber-600/20 border border-amber-500/40 flex items-center justify-center">
              <PauseCircle className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-stone-100">Hold & Resume Orders</h3>
              <p className="text-xs text-stone-400">Save active order draft or resume previously held tickets</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-800 text-stone-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Left: Hold Active Cart Form */}
          <div className="md:col-span-5 space-y-4 border-b md:border-b-0 md:border-r border-stone-800 pb-4 md:pb-0 md:pr-4">
            <h4 className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
              Hold Current Active Cart
            </h4>

            {activeCart.length > 0 ? (
              <div className="space-y-3">
                <div className="p-3 bg-stone-950 rounded-2xl border border-stone-800 text-xs space-y-1">
                  <div className="flex justify-between font-bold text-stone-200">
                    <span>Items in Cart:</span>
                    <span>{activeCart.length} Items</span>
                  </div>
                  <div className="flex justify-between text-amber-400 font-mono font-bold">
                    <span>Subtotal:</span>
                    <span>${activeSubtotal.toFixed(2)}</span>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-stone-400 block mb-1">Customer / Reference Name</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-stone-500 absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder="e.g. Table 4 / John Doe"
                      value={holdName}
                      onChange={(e) => setHoldName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-xl glass-input text-xs text-stone-100 focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  onClick={handleHold}
                  className="w-full py-3 rounded-2xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs flex items-center justify-center space-x-2 transition-all shadow-lg shadow-amber-900/30"
                >
                  <PauseCircle className="w-4 h-4" />
                  <span>Put Current Cart on Hold</span>
                </button>
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-stone-500 border border-dashed border-stone-800 rounded-2xl">
                Cart is currently empty. Add items to put an order on hold.
              </div>
            )}
          </div>

          {/* Right: List of Held Orders */}
          <div className="md:col-span-7 space-y-3">
            <div className="flex justify-between items-center">
              <h4 className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
                Saved Draft Queue ({heldOrders.length})
              </h4>
            </div>

            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {heldOrders.length === 0 ? (
                <div className="text-center py-10 space-y-2">
                  <Coffee className="w-8 h-8 text-stone-600 mx-auto" />
                  <p className="text-xs text-stone-500">No orders on hold</p>
                </div>
              ) : (
                heldOrders.map((held) => (
                  <div
                    key={held.id}
                    className="p-3.5 rounded-2xl bg-stone-950 border border-stone-800 flex items-center justify-between hover:border-amber-600/50 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-stone-100">{held.holdName}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-stone-800 text-stone-300 font-mono">
                          {held.cart.length} items
                        </span>
                      </div>
                      <div className="flex items-center space-x-3 text-[10px] text-stone-400">
                        <span className="flex items-center space-x-1">
                          <Clock className="w-3 h-3 text-stone-500" />
                          <span>{new Date(held.heldAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </span>
                        <span className="text-amber-400 font-mono font-bold">${held.totalAmount.toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => onResumeOrder(held)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-stone-950 font-bold text-xs flex items-center space-x-1 transition-colors"
                      >
                        <PlayCircle className="w-3.5 h-3.5" />
                        <span>Resume</span>
                      </button>
                      <button
                        onClick={() => onDeleteHeldOrder(held.id)}
                        className="p-1.5 rounded-xl bg-stone-800 hover:bg-red-950 text-stone-400 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
