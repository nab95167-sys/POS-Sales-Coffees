export type Role = 'ADMIN' | 'MANAGER' | 'CASHIER' | 'BARISTA';

export type Currency = 'USD' | 'KHR' | 'EUR' | 'GBP' | 'THB' | 'CNY' | 'JPY' | 'SGD';

export interface GlobalBranch {
  id: string;
  code: string;
  name: string;
  country: string;
  flag: string;
  currency: Currency;
  exchangeRateToUSD: number;
  timezone: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  avatar?: string;
  phone?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  image?: string;
  description?: string;
}

export interface ProductVariant {
  id: string;
  name: 'Small' | 'Medium' | 'Large';
  priceOffset: number;
}

export interface ExtraTopping {
  id: string;
  name: string;
  price: number;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  sku: string;
  barcode: string;
  categoryId: string;
  categoryName?: string;
  costPrice: number;
  sellingPrice: number;
  image: string;
  isAvailable: boolean;
  variants: ProductVariant[];
  toppings: ExtraTopping[];
}

export interface CartItem {
  cartItemId: string;
  productId: string;
  name: string;
  image: string;
  selectedVariant?: ProductVariant;
  selectedToppings: ExtraTopping[];
  unitPrice: number;
  quantity: number;
  itemSubtotal: number;
  notes?: string;
}

export type OrderType = 'DINE_IN' | 'TAKE_AWAY' | 'DELIVERY' | 'DRIVE_THROUGH';
export type OrderStatus = 'PENDING' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED';
export type PaymentMethod = 'CASH' | 'CREDIT_CARD' | 'ABA_KHQR' | 'BAKONG' | 'WING' | 'ACLEDA' | 'MIXED';

export interface Order {
  id: string;
  orderNumber: string;
  type: OrderType;
  status: OrderStatus;
  tableId?: string;
  tableName?: string;
  customerId?: string;
  customerName?: string;
  cashierName: string;
  items: CartItem[];
  subtotal: number;
  discountAmount: number;
  couponCode?: string;
  taxAmount: number;
  serviceCharge: number;
  totalAmount: number;
  paymentMethod?: PaymentMethod;
  amountPaid?: number;
  changeAmount?: number;
  createdAt: string;
  notes?: string;
}

export type TableStatus = 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'DIRTY';

export interface DiningTable {
  id: string;
  tableNumber: string;
  name: string;
  capacity: number;
  status: TableStatus;
  floorSection: 'Main Floor' | 'Terrace' | 'VIP Lounge';
  currentOrderId?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  loyaltyPoints: number;
  tier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
  totalSpent: number;
  birthday?: string;
  lastVisit?: string;
}

export interface Ingredient {
  id: string;
  name: string;
  unit: 'g' | 'ml' | 'pcs' | 'kg';
  currentStock: number;
  minStockAlert: number;
  costPerUnit: number;
  lastRestocked: string;
  outOfStockDate?: string;
}

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: Role;
  phone: string;
  status: 'Active' | 'On Leave' | 'Inactive';
  shift: 'Morning' | 'Afternoon' | 'Evening';
  salesCount: number;
}
