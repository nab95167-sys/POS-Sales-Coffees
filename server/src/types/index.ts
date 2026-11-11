export type Role = 'ADMIN' | 'MANAGER' | 'CASHIER' | 'BARISTA';

export const ALL_PERMISSIONS = [
  'pos:access',
  'pos:discount',
  'pos:void',
  'pos:shift_manage',
  'inventory:view',
  'inventory:edit',
  'reports:view',
  'reports:export',
  'staff:manage',
  'settings:edit',
] as const;

export type PermissionId = (typeof ALL_PERMISSIONS)[number];

export const DEFAULT_ROLE_NOTES: Record<Role, string> = {
  ADMIN: 'Full root access to all system modules, finances, settings, and staff HR.',
  MANAGER: 'Authorizes voids, petty cash, discounts, shift handover, inventory restocking and reports.',
  CASHIER: 'Front counter operations: Ringing up sales, taking cash & ABA KHQR payments, and customer care.',
  BARISTA: 'Kitchen Display System (KDS) order fulfillment, drink brewing, and recipe stock checks.',
};

export const DEFAULT_ROLE_PERMS: Record<Role, PermissionId[]> = {
  ADMIN: [...ALL_PERMISSIONS],
  MANAGER: [
    'pos:access',
    'pos:discount',
    'pos:void',
    'pos:shift_manage',
    'inventory:view',
    'inventory:edit',
    'reports:view',
    'reports:export',
  ],
  CASHIER: ['pos:access', 'pos:shift_manage', 'inventory:view'],
  BARISTA: ['pos:access', 'inventory:view'],
};

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  phone?: string;
  shift?: 'Morning' | 'Afternoon' | 'Evening';
  status?: 'Active' | 'On Leave' | 'Inactive';
  avatar?: string;
  permissions: PermissionId[];
  salesCount?: number;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon?: string;
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

export type OrderType = 'DINE_IN' | 'TAKE_AWAY' | 'DELIVERY' | 'DRIVE_THROUGH';
export type OrderStatus = 'PENDING' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED';
export type PaymentMethod = 'CASH' | 'CREDIT_CARD' | 'ABA_KHQR' | 'BAKONG' | 'WING' | 'ACLEDA' | 'MIXED';
export type TableStatus = 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'DIRTY';

export interface SplitPayment {
  method: PaymentMethod;
  amount: number;
}

export interface OrderItemDTO {
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

export interface OrderDTO {
  id: string;
  orderNumber: string;
  type: OrderType;
  status: OrderStatus;
  tableId?: string;
  tableName?: string;
  customerId?: string;
  customerName?: string;
  cashierName: string;
  items: OrderItemDTO[];
  subtotal: number;
  discountAmount: number;
  couponCode?: string;
  taxAmount: number;
  serviceCharge: number;
  totalAmount: number;
  paymentMethod?: PaymentMethod;
  splitPayments?: SplitPayment[];
  amountPaid?: number;
  changeAmount?: number;
  transactionId?: string;
  createdAt: string;
  notes?: string;
  isRefunded?: boolean;
  refundReason?: string;
  refundedAt?: string;
  refundedBy?: string;
}
