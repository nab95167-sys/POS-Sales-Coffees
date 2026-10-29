import React from 'react';
import { X, Coffee, Layers, DollarSign, CheckCircle, Package } from 'lucide-react';
import { Product } from '../../types';

interface Props {
  product: Product;
  onClose: () => void;
}

export const RecipeModal: React.FC<Props> = ({ product, onClose }) => {
  const recipeIngredients = [
    { ingredient: 'Ethiopia Yirgacheffe Beans', quantity: '18 grams', cost: 0.32 },
    { ingredient: 'Whole Fresh Milk', quantity: '220 ml', cost: 0.44 },
    { ingredient: 'Monin Vanilla Syrup', quantity: '15 ml', cost: 0.18 },
    { ingredient: 'Caramel Drizzle', quantity: '10 ml', cost: 0.12 },
  ];

  const totalRecipeCost = recipeIngredients.reduce((sum, item) => sum + item.cost, 0);
  const sellingPrice = Number(product.sellingPrice);
  const profitMargin = ((sellingPrice - totalRecipeCost) / sellingPrice) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md font-sans">
      <div className="bg-stone-900 border border-amber-700/40 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 bg-stone-950 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-amber-600/20 border border-amber-500/40 flex items-center justify-center">
              <Coffee className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-stone-100">{product.name} Recipe</h3>
              <p className="text-xs text-stone-400">Ingredient Mapping & Automatic Stock Deduction</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-800 text-stone-400 hover:text-white flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-stone-950 rounded-2xl border border-stone-800 text-center">
              <span className="text-[10px] text-stone-400 block">Selling Price</span>
              <span className="text-sm font-bold text-amber-400 font-mono">${sellingPrice.toFixed(2)}</span>
            </div>
            <div className="p-3 bg-stone-950 rounded-2xl border border-stone-800 text-center">
              <span className="text-[10px] text-stone-400 block">Recipe Cost</span>
              <span className="text-sm font-bold text-stone-200 font-mono">${totalRecipeCost.toFixed(2)}</span>
            </div>
            <div className="p-3 bg-stone-950 rounded-2xl border border-stone-800 text-center">
              <span className="text-[10px] text-stone-400 block">Margin %</span>
              <span className="text-sm font-bold text-emerald-400 font-mono">{profitMargin.toFixed(1)}%</span>
            </div>
          </div>

          {/* Ingredient List */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
              Mapped Raw Ingredients (Deducted per Sale)
            </h4>

            <div className="space-y-2">
              {recipeIngredients.map((item, idx) => (
                <div key={idx} className="p-3 bg-stone-950 rounded-xl border border-stone-800 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2.5">
                    <Package className="w-4 h-4 text-amber-400" />
                    <div>
                      <span className="font-bold text-stone-200 block">{item.ingredient}</span>
                      <span className="text-[10px] text-stone-400">Qty: {item.quantity}</span>
                    </div>
                  </div>
                  <span className="font-mono text-stone-400 font-bold">${item.cost.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
