import React, { useState } from 'react';
import { Plus, Search, Coffee, Edit, Trash2, BookOpen, Layers, X } from 'lucide-react';
import { Product } from '../types';
import { useProducts } from '../context/ProductContext';
import { useLanguage } from '../context/LanguageContext';
import { showToastNotification } from '../services/telegramBotService';
import { PageHeader } from '../components/ui/PageHeader';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { ProductFormModal } from '../components/products/ProductFormModal';
import { RecipeModal } from '../components/products/RecipeModal';

export const ProductsPage: React.FC = () => {
  const { products, categories, addProduct, updateProduct, deleteProduct, resetToCatalog100 } = useProducts();
  const { t } = useLanguage();

  const [selectedCategory, setSelectedCategory] = useState<string>('cat-1');
  const [availabilityFilter, setAvailabilityFilter] = useState<'ALL' | 'IN_STOCK' | 'OUT'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [recipeProduct, setRecipeProduct] = useState<Product | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Product | null>(null);

  const filteredProducts = products.filter((p) => {
    const matchesCat = selectedCategory === 'cat-1' || p.categoryId === selectedCategory;
    const matchesAvail =
      availabilityFilter === 'ALL'
        ? true
        : availabilityFilter === 'IN_STOCK'
        ? p.isAvailable
        : !p.isAvailable;
    const q = searchQuery.toLowerCase();
    const matchesSearch = p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
    return matchesCat && matchesAvail && matchesSearch;
  });

  const handleSaveProduct = async (productData: Partial<Product>) => {
    try {
      if (editingProduct) {
        await updateProduct(editingProduct.id, productData);
        setEditingProduct(null);
        showToastNotification(`Updated "${productData.name}" cleanly.`, 'success');
      } else {
        await addProduct(productData);
        setShowAddModal(false);
        showToastNotification(`Added "${productData.name}" & synced to POS.`, 'success');
      }
    } catch (err) {
      showToastNotification(err instanceof Error ? err.message : 'Failed to save product.', 'error');
    }
  };

  const handleConfirmDelete = async () => {
    if (!confirmDelete) return;
    try {
      await deleteProduct(confirmDelete.id);
      showToastNotification(`Removed "${confirmDelete.name}" from catalog.`, 'info');
      setConfirmDelete(null);
    } catch (err) {
      showToastNotification(err instanceof Error ? err.message : 'Failed to delete product.', 'error');
    }
  };

  return (
    <div className="space-y-5 font-sans">
      <PageHeader
        icon={<Coffee className="w-5 h-5" />}
        title={t('products')}
        subtitle={t('productsSub')}
        badge={`${products.length} Items`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={async () => {
                await resetToCatalog100();
                showToastNotification('Synced live catalog from database.', 'success');
              }}
              className="px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-amber-500/35 text-amber-300 font-bold text-xs flex items-center gap-1.5"
            >
              <Layers className="w-4 h-4 text-amber-400" />
              <span>Sync Catalog</span>
            </button>

            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 rounded-xl gold-gradient-bg hover:brightness-110 text-zinc-950 font-extrabold text-xs flex items-center gap-1.5 shadow-lg shadow-amber-900/25"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>{t('addProduct')}</span>
            </button>
          </div>
        }
      />

      {/* Search + Stock Status + Category Tabs */}
      <div className="glass-panel rounded-2xl p-3.5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search item name or SKU..."
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
            {(['ALL', 'IN_STOCK', 'OUT'] as const).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setAvailabilityFilter(status)}
                className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                  availabilityFilter === status
                    ? 'bg-amber-500 text-zinc-950'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {status === 'ALL' ? 'All Items' : status === 'IN_STOCK' ? 'In Stock' : 'Out of Stock'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  isSelected
                    ? 'gold-gradient-bg text-zinc-950 shadow-sm'
                    : 'bg-white/[0.04] border border-white/10 text-zinc-300 hover:text-white'
                }`}
              >
                {cat.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Product Cards Grid */}
      {filteredProducts.length === 0 ? (
        <div className="py-16 text-center glass-card rounded-2xl text-xs text-zinc-400">
          No catalog items match your search or filter criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              className="glass-card glass-card-hover rounded-2xl p-3.5 flex flex-col justify-between group"
            >
              <div>
                <div className="relative h-40 rounded-xl overflow-hidden mb-3 bg-zinc-950">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-2 right-2 px-2.5 py-0.5 rounded-lg gold-gradient-bg text-xs font-black text-zinc-950 font-mono shadow-md">
                    ${product.sellingPrice.toFixed(2)}
                  </div>
                  {!product.isAvailable && (
                    <div className="absolute inset-0 bg-black/65 flex items-center justify-center">
                      <span className="px-3 py-1 rounded-lg bg-red-600 text-white text-[10px] font-bold">
                        OUT OF STOCK
                      </span>
                    </div>
                  )}
                </div>

                <h4 className="text-sm font-extrabold text-zinc-100 line-clamp-1">{product.name}</h4>
                <p className="text-xs text-zinc-400 line-clamp-2 mt-1 leading-snug">{product.description}</p>
                <div className="mt-2 text-[10px] font-mono text-zinc-500">SKU: {product.sku}</div>
              </div>

              <div className="pt-3 mt-3 border-t border-white/10 flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => setRecipeProduct(product)}
                  className="text-amber-400 hover:underline flex items-center gap-1 font-semibold"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Recipe</span>
                </button>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setEditingProduct(product)}
                    className="p-2 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-zinc-200 border border-white/10"
                    title="Edit Product"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(product)}
                    className="p-2 rounded-lg bg-red-950/60 hover:bg-red-900/60 text-red-400 border border-red-500/30"
                    title="Delete Product"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

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

      {recipeProduct && <RecipeModal product={recipeProduct} onClose={() => setRecipeProduct(null)} />}

      <ConfirmDialog
        isOpen={Boolean(confirmDelete)}
        title="Remove Menu Item"
        message={`Are you sure you want to delete "${confirmDelete?.name || ''}" from the catalog?`}
        confirmLabel="Delete Product"
        onConfirm={() => void handleConfirmDelete()}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
};
