import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Product, Category } from '../types';
import { apiFetch } from '../services/api';
import { useAuth } from './AuthContext';

interface ProductContextType {
  products: Product[];
  categories: Category[];
  isLoading: boolean;
  refreshProducts: () => Promise<void>;
  addProduct: (productData: Partial<Product>) => Promise<void>;
  updateProduct: (id: string, productData: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  resetToCatalog100: () => Promise<void>;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

try {
  localStorage.removeItem('coffee_pos_products_catalog');
} catch {
  // Ignore storage errors
}

export const ProductProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const refreshProducts = useCallback(async () => {
    if (!isAuthenticated) {
      setProducts([]);
      setCategories([]);
      return;
    }
    setIsLoading(true);
    try {
      const data = await apiFetch<{ categories: Category[]; products: Product[] }>('/api/v1/products');
      setCategories(data.categories);
      setProducts(data.products);
    } catch (err) {
      console.error('Failed to load catalog from server:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    void refreshProducts();
  }, [refreshProducts]);

  const addProduct = async (productData: Partial<Product>) => {
    const payload = {
      name: productData.name || 'New Coffee Product',
      description: productData.description || 'Freshly brewed artisan coffee.',
      sku: productData.sku || `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
      barcode: productData.barcode || `88500${Math.floor(10000 + Math.random() * 90000)}`,
      categoryId: productData.categoryId || categories.find((c) => c.id !== 'cat-1')?.id || 'cat-2',
      costPrice: Number(productData.costPrice ?? 1.2),
      sellingPrice: Number(productData.sellingPrice ?? 3.5),
      image:
        productData.image ||
        'https://images.unsplash.com/photo-1541167760496-1628856ab772?w=500&auto=format&fit=crop&q=80',
      isAvailable: productData.isAvailable ?? true,
      variants: productData.variants || [
        { id: 'v-sm', name: 'Small', priceOffset: 0 },
        { id: 'v-md', name: 'Medium', priceOffset: 0.5 },
        { id: 'v-lg', name: 'Large', priceOffset: 1.0 },
      ],
      toppings: productData.toppings || [
        { id: 't-1', name: 'Extra Shot Espresso', price: 0.75 },
        { id: 't-2', name: 'Oat Milk Sub', price: 0.6 },
      ],
    };

    const res = await apiFetch<{ product: Product }>('/api/v1/products', {
      method: 'POST',
      body: payload,
    });
    setProducts((prev) => [res.product, ...prev]);
  };

  const updateProduct = async (id: string, productData: Partial<Product>) => {
    const payload = {
      ...productData,
      costPrice: productData.costPrice !== undefined ? Number(productData.costPrice) : undefined,
      sellingPrice: productData.sellingPrice !== undefined ? Number(productData.sellingPrice) : undefined,
    };
    const res = await apiFetch<{ product: Product }>(`/api/v1/products/${id}`, {
      method: 'PUT',
      body: payload,
    });
    setProducts((prev) => prev.map((p) => (p.id === id ? res.product : p)));
  };

  const deleteProduct = async (id: string) => {
    await apiFetch(`/api/v1/products/${id}`, { method: 'DELETE' });
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  const resetToCatalog100 = async () => {
    await refreshProducts();
  };

  return (
    <ProductContext.Provider
      value={{
        products,
        categories,
        isLoading,
        refreshProducts,
        addProduct,
        updateProduct,
        deleteProduct,
        resetToCatalog100,
      }}
    >
      {children}
    </ProductContext.Provider>
  );
};

export const useProducts = () => {
  const context = useContext(ProductContext);
  if (!context) {
    throw new Error('useProducts must be used within a ProductProvider');
  }
  return context;
};
