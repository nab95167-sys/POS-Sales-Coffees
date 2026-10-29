import React, { useState } from 'react';
import { Plus, Search, Coffee, Edit, Trash2, BookOpen, Layers, CheckCircle2 } from 'lucide-react';
import { Product } from '../types';
import { useProducts } from '../context/ProductContext';
import { ProductFormModal } from '../components/products/ProductFormModal';
import { RecipeModal } from '../components/products/RecipeModal';

export const ProductsPage: React.FC = () => {
  const { products, categories, addProduct, updateProduct, deleteProduct } = useProducts();
  const [selectedCategory, setSelectedCategory] = useState<string>('cat-1');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [recipeProduct, setRecipeProduct] = useState<Product | null>(null);

  const filteredProducts = products.filter((p) => {
    const matchesCat = selectedCategory === 'cat-1' || p.categoryId === selectedCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.sku.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const handleSaveProduct = (productData: Partial<Product>) => {
    if (editingProduct) {
      updateProduct(editingProduct.id, productData);
      setEditingProduct(null);
      alert(`Product "${productData.name}" updated successfully!`);
    } else {
      addProduct(productData);
      setShowAddModal(false);
      alert(`New product "${productData.name}" added & synced live to POS Register!`);
    }
  };

  const handleDeleteProduct = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}" from product catalog?`)) {
      deleteProduct(id);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-stone-900/80 p-4 rounded-3xl border border-stone-800 glass-panel">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-600/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <Coffee className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-stone-100">Product & Drink Catalog</h2>
            <p className="text-xs text-stone-400">Manage coffee beverages, bakery items, pricing, variants & live POS synchronization</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="relative">
            <Search className="w-4 h-4 text-stone-500 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search product name or SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 rounded-xl glass-input text-stone-100 text-xs w-64 focus:outline-none"
            />
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs flex items-center space-x-1.5 shadow-lg shadow-amber-900/30 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Product</span>
          </button>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none">
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all ${
                isSelected
                  ? 'bg-amber-600 text-stone-950 shadow-lg border border-amber-500'
                  : 'bg-stone-900/80 border border-stone-800 text-stone-400 hover:text-stone-200'
              }`}
            >
              {cat.name}
            </button>
          );
        })}
      </div>

      {/* Product Cards Touch Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {filteredProducts.map((product) => (
          <div
            key={product.id}
            className="bg-stone-900/80 border border-stone-800 rounded-3xl p-4 flex flex-col justify-between glass-card shadow-xl group hover:border-amber-600/50 transition-all"
          >
            <div>
              <div className="relative h-40 rounded-2xl overflow-hidden mb-3">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute top-2 right-2 px-2.5 py-1 rounded-full bg-stone-950/80 backdrop-blur-sm border border-stone-700 text-xs font-bold text-amber-300 font-mono">
                  ${product.sellingPrice.toFixed(2)}
                </div>
                {!product.isAvailable && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <span className="px-3 py-1 rounded-full bg-red-600 text-white text-[10px] font-bold">OUT OF STOCK</span>
                  </div>
                )}
              </div>

              <h4 className="text-sm font-bold text-stone-100 line-clamp-1">{product.name}</h4>
              <p className="text-xs text-stone-400 line-clamp-2 mt-1 leading-snug">{product.description}</p>
              <div className="mt-2 text-[10px] font-mono text-stone-500">SKU: {product.sku}</div>
            </div>

            <div className="pt-3 mt-3 border-t border-stone-800 flex items-center justify-between text-xs">
              <button
                onClick={() => setRecipeProduct(product)}
                className="text-amber-400 hover:underline flex items-center space-x-1 font-semibold"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Recipe</span>
              </button>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setEditingProduct(product)}
                  className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300"
                  title="Edit Product"
                >
                  <Edit className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDeleteProduct(product.id, product.name)}
                  className="p-1.5 rounded-lg bg-red-950/60 hover:bg-red-900/60 text-red-400 border border-red-800/40"
                  title="Delete Product"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modals */}
      {(showAddModal || editingProduct) && (
        <ProductFormModal
          product={editingProduct || undefined}
          categories={categories}
          onClose={() => {
            setShowAddModal(false);
            setEditingProduct(null);
          }}
          onSave={handleSaveProduct}
        />
      )}

      {recipeProduct && (
        <RecipeModal product={recipeProduct} onClose={() => setRecipeProduct(null)} />
      )}
    </div>
  );
};
