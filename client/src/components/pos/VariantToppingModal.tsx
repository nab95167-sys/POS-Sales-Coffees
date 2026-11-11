import React, { useState } from 'react';
import { X, Plus, Check } from 'lucide-react';
import { Product, ProductVariant, ExtraTopping, CartItem } from '../../types';

interface Props {
  product: Product;
  onClose: () => void;
  onAddToCart: (item: CartItem) => void;
}

export const VariantToppingModal: React.FC<Props> = ({ product, onClose, onAddToCart }) => {
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | undefined>(
    product.variants.find((v) => v.name === 'Medium') || product.variants[0]
  );
  const [selectedToppings, setSelectedToppings] = useState<ExtraTopping[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');

  const variantOffset = selectedVariant ? Number(selectedVariant.priceOffset) : 0;
  const toppingsTotal = selectedToppings.reduce((sum, t) => sum + Number(t.price), 0);
  const unitPrice = Number(product.sellingPrice) + variantOffset + toppingsTotal;
  const itemSubtotal = unitPrice * quantity;

  const toggleTopping = (topping: ExtraTopping) => {
    if (selectedToppings.some((t) => t.id === topping.id)) {
      setSelectedToppings(selectedToppings.filter((t) => t.id !== topping.id));
    } else {
      setSelectedToppings([...selectedToppings, topping]);
    }
  };

  const handleConfirm = () => {
    const item: CartItem = {
      cartItemId: `${product.id}-${selectedVariant?.id || 'base'}-${selectedToppings.map((t) => t.id).join('-')}-${Date.now()}`,
      productId: product.id,
      name: product.name,
      image: product.image,
      selectedVariant,
      selectedToppings,
      unitPrice,
      quantity,
      itemSubtotal,
      notes,
    };
    onAddToCart(item);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md">
      <div className="glass-panel border border-amber-500/35 rounded-2xl w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Header Hero */}
        <div className="relative h-40 sm:h-44 overflow-hidden flex-shrink-0">
          <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0e0f14] via-[#0e0f14]/60 to-transparent" />
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3.5 right-3.5 w-8 h-8 rounded-lg bg-zinc-900/85 text-zinc-300 hover:text-white flex items-center justify-center border border-white/10"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="absolute bottom-3.5 left-5 right-5">
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
              {product.categoryName || 'Beverage'}
            </span>
            <h3 className="text-xl sm:text-2xl font-extrabold text-zinc-100 mt-1 truncate">{product.name}</h3>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 space-y-5 flex-1 overflow-y-auto">
          {product.variants.length > 0 && (
            <div>
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-2.5">
                Choose Size
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                {product.variants.map((variant) => {
                  const isSelected = selectedVariant?.id === variant.id;
                  return (
                    <button
                      key={variant.id}
                      type="button"
                      onClick={() => setSelectedVariant(variant)}
                      className={`p-3 rounded-xl border text-center transition-all ${
                        isSelected
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold shadow-sm'
                          : 'bg-white/[0.03] border-white/10 text-zinc-300 hover:bg-white/[0.06]'
                      }`}
                    >
                      <div className="text-sm font-bold">{variant.name}</div>
                      <div className="text-xs text-zinc-400 mt-0.5 font-mono">
                        {variant.priceOffset >= 0 ? `+$${variant.priceOffset.toFixed(2)}` : `-$${Math.abs(variant.priceOffset).toFixed(2)}`}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {product.toppings.length > 0 && (
            <div>
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-2.5">
                Extra Add-ons & Toppings
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {product.toppings.map((topping) => {
                  const isChecked = selectedToppings.some((t) => t.id === topping.id);
                  return (
                    <button
                      key={topping.id}
                      type="button"
                      onClick={() => toggleTopping(topping)}
                      className={`flex items-center justify-between p-2.5 rounded-xl border text-left transition-all ${
                        isChecked
                          ? 'bg-amber-500/15 border-amber-500/70 text-amber-200 font-semibold'
                          : 'bg-white/[0.03] border-white/10 text-zinc-300 hover:bg-white/[0.06]'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className={`w-4 h-4 rounded flex items-center justify-center border flex-shrink-0 ${
                            isChecked ? 'bg-amber-500 border-amber-400 text-zinc-950' : 'border-zinc-600'
                          }`}
                        >
                          {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <span className="text-xs truncate">{topping.name}</span>
                      </div>
                      <span className="text-xs font-bold text-amber-400 font-mono ml-2">+${topping.price.toFixed(2)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-2">
              Special Instructions
            </label>
            <input
              type="text"
              placeholder="e.g., Less sweet (50% sugar), Less ice, Oat milk..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl glass-input text-sm focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Quantity</span>
            <div className="flex items-center gap-3 bg-zinc-900 p-1 rounded-xl border border-white/10">
              <button
                type="button"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-8 h-8 rounded-lg bg-zinc-800 text-zinc-200 hover:bg-zinc-700 flex items-center justify-center font-bold text-base"
              >
                -
              </button>
              <span className="w-8 text-center font-bold font-mono text-amber-300">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity(quantity + 1)}
                className="w-8 h-8 rounded-lg bg-amber-500 text-zinc-950 hover:bg-amber-400 flex items-center justify-center font-bold text-base"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Sticky Footer */}
        <div className="p-4 sm:p-5 bg-[#0b0c10] border-t border-white/10 flex items-center justify-between flex-shrink-0">
          <div>
            <span className="text-[11px] text-zinc-400 block">Item Total</span>
            <span className="text-2xl font-black text-amber-400 font-mono tabular-nums">${itemSubtotal.toFixed(2)}</span>
          </div>
          <button
            type="button"
            onClick={handleConfirm}
            className="flex items-center gap-2 px-5 py-3 rounded-xl gold-gradient-bg hover:brightness-110 text-zinc-950 font-extrabold text-sm shadow-lg shadow-amber-900/30 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add to Cart</span>
          </button>
        </div>
      </div>
    </div>
  );
};
