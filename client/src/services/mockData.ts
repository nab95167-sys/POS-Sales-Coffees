import { Category, Product, DiningTable, Customer, Ingredient, StaffMember, Order } from '../types';
import { PRODUCTS_CATALOG_100, CATEGORIES_100, COMMON_TOPPINGS } from './productsCatalog100';

export { COMMON_TOPPINGS };
export const INITIAL_CATEGORIES: Category[] = CATEGORIES_100;
export const INITIAL_PRODUCTS: Product[] = PRODUCTS_CATALOG_100;

export const INITIAL_TABLES: DiningTable[] = [
  { id: 't-1', tableNumber: 'T-01', name: 'Table 1', capacity: 2, status: 'OCCUPIED', floorSection: 'Main Floor', currentOrderId: 'ORD-8821' },
  { id: 't-2', tableNumber: 'T-02', name: 'Table 2', capacity: 4, status: 'AVAILABLE', floorSection: 'Main Floor' },
  { id: 't-3', tableNumber: 'T-03', name: 'Table 3', capacity: 2, status: 'RESERVED', floorSection: 'Main Floor' },
  { id: 't-4', tableNumber: 'T-04', name: 'Table 4', capacity: 6, status: 'AVAILABLE', floorSection: 'Main Floor' },
  { id: 't-5', tableNumber: 'T-05', name: 'Terrace 1', capacity: 4, status: 'AVAILABLE', floorSection: 'Terrace' },
  { id: 't-6', tableNumber: 'T-06', name: 'Terrace 2', capacity: 4, status: 'OCCUPIED', floorSection: 'Terrace', currentOrderId: 'ORD-8824' },
  { id: 't-7', tableNumber: 'T-07', name: 'VIP Room', capacity: 8, status: 'AVAILABLE', floorSection: 'VIP Lounge' },
];

export const INITIAL_CUSTOMERS: Customer[] = [
  { id: 'c-1', name: 'Chantara Dara', phone: '+855 12 345 678', email: 'chantara@example.com', loyaltyPoints: 480, tier: 'Gold', totalSpent: 340.50, birthday: '1995-04-12' },
  { id: 'c-2', name: 'David Miller', phone: '+855 98 765 432', email: 'david@example.com', loyaltyPoints: 120, tier: 'Silver', totalSpent: 98.00 },
  { id: 'c-3', name: 'Sophea Pich', phone: '+855 77 112 233', email: 'sophea@example.com', loyaltyPoints: 1250, tier: 'Platinum', totalSpent: 890.00, birthday: '1992-11-20' },
  { id: 'c-4', name: 'Elena Rostova', phone: '+855 92 888 999', email: 'elena@example.com', loyaltyPoints: 40, tier: 'Bronze', totalSpent: 28.50 },
];

export const INITIAL_INGREDIENTS: Ingredient[] = [
  { id: 'ing-1', name: 'Ethiopia Yirgacheffe Beans', unit: 'kg', currentStock: 14.5, minStockAlert: 5.0, costPerUnit: 18.00, lastRestocked: '2026-08-01' },
  { id: 'ing-2', name: 'Fresh Whole Milk', unit: 'ml', currentStock: 25000, minStockAlert: 8000, costPerUnit: 0.002, lastRestocked: '2026-08-04' },
  { id: 'ing-3', name: 'Oat Milk Barista Edition', unit: 'ml', currentStock: 4500, minStockAlert: 5000, costPerUnit: 0.0035, lastRestocked: '2026-08-02' },
  { id: 'ing-4', name: 'Monin Vanilla Syrup', unit: 'ml', currentStock: 3200, minStockAlert: 1000, costPerUnit: 0.012, lastRestocked: '2026-07-28' },
  { id: 'ing-5', name: 'Artisan Sourdough Loaves', unit: 'pcs', currentStock: 8, minStockAlert: 10, costPerUnit: 1.20, lastRestocked: '2026-08-04' },
];

export const INITIAL_STAFF: StaffMember[] = [
  { id: 's-1', name: 'Sophia Chen', email: 'admin@coffeepos.com', role: 'ADMIN', phone: '+855 12 000 111', status: 'Active', shift: 'Morning', salesCount: 142 },
  { id: 's-2', name: 'Alexander Wright', email: 'manager@coffeepos.com', role: 'MANAGER', phone: '+855 12 000 222', status: 'Active', shift: 'Morning', salesCount: 89 },
  { id: 's-3', name: 'Sokha Ly', email: 'cashier@coffeepos.com', role: 'CASHIER', phone: '+855 12 000 333', status: 'Active', shift: 'Afternoon', salesCount: 310 },
  { id: 's-4', name: 'Devin Vance', email: 'barista@coffeepos.com', role: 'BARISTA', phone: '+855 12 000 444', status: 'Active', shift: 'Morning', salesCount: 0 },
];

export const SAMPLE_KDS_ORDERS: Order[] = [
  {
    id: 'ord-kds-1',
    orderNumber: 'ORD-8821',
    type: 'DINE_IN',
    status: 'PREPARING',
    tableId: 't-1',
    tableName: 'Table 1',
    cashierName: 'Sokha Ly',
    items: [
      {
        cartItemId: 'item-1',
        productId: 'prod-1',
        name: 'Caramel Macchiato',
        image: 'https://images.unsplash.com/photo-1485808191679-5f86510681a2?auto=format&fit=crop&w=600&q=80',
        selectedVariant: { id: 'v-3', name: 'Large', priceOffset: 0.75 },
        selectedToppings: [{ id: 'top-2', name: 'Oat Milk Substitute', price: 0.60 }],
        unitPrice: 5.60,
        quantity: 2,
        itemSubtotal: 11.20,
        notes: 'Less sweet, extra hot',
      },
      {
        cartItemId: 'item-2',
        productId: 'prod-6',
        name: 'Butter Croissant',
        image: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=600&q=80',
        selectedToppings: [],
        unitPrice: 2.75,
        quantity: 1,
        itemSubtotal: 2.75,
      }
    ],
    subtotal: 13.95,
    discountAmount: 0,
    taxAmount: 1.39,
    serviceCharge: 0,
    totalAmount: 15.34,
    createdAt: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
  },
  {
    id: 'ord-kds-2',
    orderNumber: 'ORD-8824',
    type: 'TAKE_AWAY',
    status: 'PENDING',
    tableName: 'Take Away',
    cashierName: 'Sokha Ly',
    items: [
      {
        cartItemId: 'item-3',
        productId: 'prod-3',
        name: 'Nitro Cold Brew',
        image: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?auto=format&fit=crop&w=600&q=80',
        selectedVariant: { id: 'v-8', name: 'Medium', priceOffset: 0.00 },
        selectedToppings: [{ id: 'top-6', name: 'Sweet Cold Foam', price: 0.85 }],
        unitPrice: 5.80,
        quantity: 1,
        itemSubtotal: 5.80,
      }
    ],
    subtotal: 5.80,
    discountAmount: 0,
    taxAmount: 0.58,
    serviceCharge: 0,
    totalAmount: 6.38,
    createdAt: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
  }
];

export const SALES_ANALYTICS_DATA = [
  { hour: '07:00', sales: 120, orders: 18 },
  { hour: '08:00', sales: 340, orders: 42 },
  { hour: '09:00', sales: 510, orders: 65 },
  { hour: '10:00', sales: 480, orders: 58 },
  { hour: '11:00', sales: 290, orders: 35 },
  { hour: '12:00', sales: 430, orders: 50 },
  { hour: '13:00', sales: 390, orders: 44 },
  { hour: '14:00', sales: 460, orders: 52 },
  { hour: '15:00', sales: 580, orders: 68 },
  { hour: '16:00', sales: 410, orders: 49 },
  { hour: '17:00', sales: 310, orders: 36 },
];
