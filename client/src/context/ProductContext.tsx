import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product, Category } from '../types';
import { INITIAL_PRODUCTS, INITIAL_CATEGORIES } from '../services/mockData';

interface ProductContextType {
  products: Product[];
  categories: Category[];
  addProduct: (productData: Partial<Product>) => void;
  updateProduct: (id: string, productData: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

export const ProductProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [categories] = useState<Category[]>(INITIAL_CATEGORIES);
  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('coffee_pos_products_catalog');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return INITIAL_PRODUCTS;
      }
    }
    return INITIAL_PRODUCTS;
  });

  useEffect(() => {
    localStorage.setItem('coffee_pos_products_catalog', JSON.stringify(products));
  }, [products]);

  const addProduct = (productData: Partial<Product>) => {
    const newProduct: Product = {
      id: `prod-${Date.now()}`,
      name: productData.name || 'New Coffee Product',
      description: productData.description || 'Freshly brewed artisan coffee.',
      sku: productData.sku || `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
      barcode: productData.barcode || `88500${Math.floor(10000 + Math.random() * 90000)}`,
      categoryId: productData.categoryId || categories[0]?.id || 'cat-1',
      categoryName: categories.find((c) => c.id === productData.categoryId)?.name || 'Beverages',
      costPrice: Number(productData.costPrice) || 1.20,
      sellingPrice: Number(productData.sellingPrice) || 3.50,
      image: productData.image || 'https://images.unsplash.com/photo-1541167760496-1628856ab772?w=500&auto=format&fit=crop&q=80',
      isAvailable: productData.isAvailable ?? true,
      variants: productData.variants || [
        { id: 'v-sm', name: 'Small', priceOffset: 0 },
        { id: 'v-md', name: 'Medium', priceOffset: 0.50 },
        { id: 'v-lg', name: 'Large', priceOffset: 1.00 },
      ],
      toppings: productData.toppings || [
        { id: 't-1', name: 'Extra Shot Espresso', price: 0.75 },
        { id: 't-2', name: 'Oat Milk Sub', price: 0.60 },
      ],
    };

    setProducts((prev) => [newProduct, ...prev]);
  };

  const updateProduct = (id: string, productData: Partial<Product>) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? ({ ...p, ...productData } as Product) : p))
    );
  };

  const deleteProduct = (id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <ProductContext.Provider value={{ products, categories, addProduct, updateProduct, deleteProduct }}>
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
