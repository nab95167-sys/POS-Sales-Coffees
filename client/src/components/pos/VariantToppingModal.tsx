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
      cartItemId: `${product.id}-${selectedVariant?.id || 'base'}-${selectedToppings.map(t => t.id).join('-')}-${Date.now()}`,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <div className="bg-stone-900 border border-amber-700/40 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="relative h-44 overflow-hidden">
          <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-stone-900 via-stone-900/60 to-transparent"></div>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-stone-900/80 text-stone-300 hover:text-white flex items-center justify-center backdrop-blur-sm transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="absolute bottom-4 left-6 right-6">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
              {product.categoryName || 'Beverage'}
            </span>
            <h3 className="text-2xl font-bold text-stone-100 mt-1">{product.name}</h3>
          </div>
        </div>

        <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
          {/* Select Size / Variant */}
          {product.variants.length > 0 && (
            <div>
              <label className="text-xs font-semibold text-stone-400 uppercase tracking-wider block mb-3">
                Choose Size
              </label>
              <div className="grid grid-cols-3 gap-3">
                {product.variants.map((variant) => {
                  const isSelected = selectedVariant?.id === variant.id;
                  return (
                    <button
                      key={variant.id}
                      onClick={() => setSelectedVariant(variant)}
                      className={`p-3 rounded-2xl border text-center transition-all ${
                        isSelected
                          ? 'bg-amber-600/20 border-amber-500 text-amber-300 font-bold shadow-md shadow-amber-900/30'
                          : 'bg-stone-800/40 border-stone-700/60 text-stone-300 hover:bg-stone-800'
                      }`}
                    >
                      <div className="text-sm font-semibold">{variant.name}</div>
                      <div className="text-xs text-stone-400 mt-0.5">
                        {variant.priceOffset >= 0 ? `+$${variant.priceOffset.toFixed(2)}` : `-$${Math.abs(variant.priceOffset).toFixed(2)}`}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Select Extra Toppings */}
          {product.toppings.length > 0 && (
            <div>
              <label className="text-xs font-semibold text-stone-400 uppercase tracking-wider block mb-3">
                Extra Add-ons & Toppings
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                {product.toppings.map((topping) => {
                  const isChecked = selectedToppings.some((t) => t.id === topping.id);
                  return (
                    <button
                      key={topping.id}
                      onClick={() => toggleTopping(topping)}
                      className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                        isChecked
                          ? 'bg-amber-950/40 border-amber-500/80 text-amber-200 font-medium'
                          : 'bg-stone-800/30 border-stone-700/50 text-stone-300 hover:bg-stone-800/60'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <div
                          className={`w-4 h-4 rounded flex items-center justify-center border ${
                            isChecked ? 'bg-amber-600 border-amber-500 text-stone-950' : 'border-stone-600'
                          }`}
                        >
                          {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <span className="text-xs font-medium">{topping.name}</span>
                      </div>
                      <span className="text-xs font-semibold text-amber-400">+${topping.price.toFixed(2)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Special Preparation Instructions */}
          <div>
            <label className="text-xs font-semibold text-stone-400 uppercase tracking-wider block mb-2">
              Special Instructions
            </label>
            <input
              type="text"
              placeholder="e.g., Less sweet (50% sugar), Extra hot, Oat milk..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl glass-input text-stone-100 text-sm focus:outline-none"
            />
          </div>

          {/* Quantity Selector */}
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Quantity</span>
            <div className="flex items-center space-x-3 bg-stone-800/60 p-1.5 rounded-2xl border border-stone-700">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-8 h-8 rounded-xl bg-stone-700 text-stone-200 hover:bg-stone-600 flex items-center justify-center font-bold text-lg"
              >
                -
              </button>
              <span className="w-8 text-center font-bold text-amber-300">{quantity}</span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="w-8 h-8 rounded-xl bg-amber-600 text-stone-950 hover:bg-amber-500 flex items-center justify-center font-bold text-lg"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 bg-stone-950/80 border-t border-stone-800/80 flex items-center justify-between">
          <div>
            <span className="text-xs text-stone-400 block">Total Price</span>
            <span className="text-2xl font-extrabold text-amber-400 font-mono">${itemSubtotal.toFixed(2)}</span>
          </div>
          <button
            onClick={handleConfirm}
            className="flex items-center space-x-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-stone-950 font-bold text-sm shadow-lg shadow-amber-900/30 transition-all transform active:scale-95"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
            <span>Add to Cart</span>
          </button>
        </div>
      </div>
    </div>
  );
};
