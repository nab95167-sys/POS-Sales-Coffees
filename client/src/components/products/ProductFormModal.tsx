import React, { useState } from 'react';
import { X, Save, Plus, Trash2 } from 'lucide-react';
import { Product, Category, ProductVariant, ExtraTopping } from '../../types';

interface Props {
  product?: Product;
  categories: Category[];
  onClose: () => void;
  onSave: (data: Partial<Product>) => void;
}

export const ProductFormModal: React.FC<Props> = ({ product, categories, onClose, onSave }) => {
  const [name, setName] = useState(product?.name || '');
  const [description, setDescription] = useState(product?.description || '');
  const [sku, setSku] = useState(product?.sku || `SKU-${Math.floor(1000 + Math.random() * 9000)}`);
  const [barcode, setBarcode] = useState(product?.barcode || `88500${Math.floor(10000 + Math.random() * 90000)}`);
  const [categoryId, setCategoryId] = useState(product?.categoryId || categories[0]?.id || 'cat-1');
  const [costPrice, setCostPrice] = useState(product?.costPrice || 1.20);
  const [sellingPrice, setSellingPrice] = useState(product?.sellingPrice || 3.50);
  const [image, setImage] = useState(product?.image || 'https://images.unsplash.com/photo-1541167760496-1628856ab772?w=500&auto=format&fit=crop&q=80');
  const [isAvailable, setIsAvailable] = useState(product?.isAvailable ?? true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Please enter a product name.');
      return;
    }

    onSave({
      name,
      description,
      sku,
      barcode,
      categoryId,
      costPrice: Number(costPrice),
      sellingPrice: Number(sellingPrice),
      image,
      isAvailable,
      variants: product?.variants || [
        { id: 'v-sm', name: 'Small', priceOffset: 0 },
        { id: 'v-md', name: 'Medium', priceOffset: 0.50 },
        { id: 'v-lg', name: 'Large', priceOffset: 1.00 },
      ],
      toppings: product?.toppings || [
        { id: 't-1', name: 'Extra Shot Espresso', price: 0.75 },
        { id: 't-2', name: 'Oat Milk Sub', price: 0.60 },
      ],
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md font-sans">
      <div className="bg-stone-900 border border-amber-700/40 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 bg-stone-950 border-b border-stone-800 flex items-center justify-between">
          <h3 className="text-lg font-bold text-stone-100">
            {product ? 'Edit Product & Pricing' : 'Add New Beverage / Food Product'}
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-800 text-stone-400 hover:text-white flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="text-xs font-semibold text-stone-400 block mb-1">Product Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl glass-input text-stone-100 text-sm focus:outline-none"
              placeholder="e.g. Iced Vanilla Latte"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-stone-400 block mb-1">Category</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl glass-input text-stone-100 text-xs font-bold focus:outline-none"
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id} className="bg-stone-900">
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-stone-400 block mb-1">Selling Price ($)</label>
              <input
                type="number"
                step="0.01"
                required
                value={sellingPrice}
                onChange={(e) => setSellingPrice(Number(e.target.value))}
                className="w-full px-4 py-2.5 rounded-xl glass-input text-stone-100 text-sm font-mono font-bold focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-stone-400 block mb-1">Cost Price ($)</label>
              <input
                type="number"
                step="0.01"
                required
                value={costPrice}
                onChange={(e) => setCostPrice(Number(e.target.value))}
                className="w-full px-4 py-2.5 rounded-xl glass-input text-stone-100 text-sm font-mono focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-stone-400 block mb-1">Product Description</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl glass-input text-stone-100 text-xs focus:outline-none"
              placeholder="Short description of taste notes and ingredients..."
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-stone-400 block mb-1">Image URL</label>
            <input
              type="text"
              value={image}
              onChange={(e) => setImage(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl glass-input text-stone-100 text-xs focus:outline-none"
            />
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <input
              type="checkbox"
              id="isAvailable"
              checked={isAvailable}
              onChange={(e) => setIsAvailable(e.target.checked)}
              className="rounded border-stone-700 text-amber-600 focus:ring-amber-500"
            />
            <label htmlFor="isAvailable" className="text-xs font-bold text-stone-200">
              Product is Available for POS Register Sale
            </label>
          </div>

          <div className="pt-4 border-t border-stone-800 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs flex items-center space-x-1.5 shadow-lg shadow-amber-900/30"
            >
              <Save className="w-4 h-4" />
              <span>Save & Add to Menu</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
