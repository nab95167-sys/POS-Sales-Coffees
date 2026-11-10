import { Order, DiningTable, Ingredient, TableStatus } from '../types';
import { SAMPLE_KDS_ORDERS, INITIAL_TABLES, INITIAL_INGREDIENTS } from './mockData';

const STORAGE_KEY_ORDERS = 'coffee_pos_orders_history';
const STORAGE_KEY_KDS = 'coffee_kds_orders';
const STORAGE_KEY_TABLES = 'coffee_pos_tables';
const STORAGE_KEY_INGREDIENTS = 'coffee_pos_ingredients';

// Seed initial orders if empty
const getInitialOrders = (): Order[] => {
  return [
    ...SAMPLE_KDS_ORDERS,
    {
      id: 'ord-seed-3',
      orderNumber: 'ORD-8820',
      type: 'DINE_IN',
      status: 'COMPLETED',
      tableId: 't-2',
      tableName: 'Table 2',
      cashierName: 'Sophia Chen',
      items: [
        {
          cartItemId: 'item-seed-1',
          productId: 'esp-lat-002',
          name: 'Artisan Iced Caffe Latte',
          image: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=600&q=80',
          selectedVariant: { id: 'v-md', name: 'Medium', priceOffset: 0.50 },
          selectedToppings: [],
          unitPrice: 4.35,
          quantity: 2,
          itemSubtotal: 8.70,
        },
      ],
      subtotal: 8.70,
      discountAmount: 0,
      taxAmount: 0.87,
      serviceCharge: 0,
      totalAmount: 9.57,
      paymentMethod: 'ABA_KHQR',
      amountPaid: 9.57,
      changeAmount: 0,
      createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    },
    {
      id: 'ord-seed-4',
      orderNumber: 'ORD-8819',
      type: 'TAKE_AWAY',
      status: 'COMPLETED',
      cashierName: 'Sophia Chen',
      items: [
        {
          cartItemId: 'item-seed-2',
          productId: 'esp-mac-001',
          name: 'Caramel Macchiato',
          image: 'https://images.unsplash.com/photo-1485808191679-5f86510681a2?auto=format&fit=crop&w=600&q=80',
          selectedVariant: { id: 'v-lg', name: 'Large', priceOffset: 1.00 },
          selectedToppings: [{ id: 't-1', name: 'Extra Shot Espresso', price: 0.75 }],
          unitPrice: 6.00,
          quantity: 1,
          itemSubtotal: 6.00,
        },
      ],
      subtotal: 6.00,
      discountAmount: 1.00,
      couponCode: 'COFFEE20',
      taxAmount: 0.50,
      serviceCharge: 0,
      totalAmount: 5.50,
      paymentMethod: 'CASH',
      amountPaid: 10.00,
      changeAmount: 4.50,
      createdAt: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
    },
  ];
};

export const getOrders = (): Order[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ORDERS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse orders history', e);
  }
  const initial = getInitialOrders();
  localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(initial));
  return initial;
};

export const saveOrder = (order: Order): Order => {
  const currentOrders = getOrders();
  const updatedOrders = [order, ...currentOrders];
  localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(updatedOrders));

  // 1. Sync live to KDS (Kitchen Display System)
  try {
    const currentKdsRaw = localStorage.getItem(STORAGE_KEY_KDS);
    const currentKds: Order[] = currentKdsRaw ? JSON.parse(currentKdsRaw) : SAMPLE_KDS_ORDERS;
    const updatedKds = [order, ...currentKds.filter((k) => k.id !== order.id)];
    localStorage.setItem(STORAGE_KEY_KDS, JSON.stringify(updatedKds));
  } catch (e) {
    console.error('Failed to sync order to KDS', e);
  }

  // 2. If table was assigned on Dine-In, mark table as OCCUPIED
  if (order.type === 'DINE_IN' && order.tableId) {
    updateTableStatus(order.tableId, 'OCCUPIED', order.id);
  }

  // 3. Deduct ingredient stock automatically
  deductInventoryForOrder(order);

  // Notify listeners across app windows/components
  window.dispatchEvent(new CustomEvent('coffee_order_created', { detail: order }));
  return order;
};

export const refundOrder = (
  orderId: string,
  reason: string,
  managerName: string
): boolean => {
  const currentOrders = getOrders();
  const target = currentOrders.find((o) => o.id === orderId);
  if (!target) return false;

  const nowIso = new Date().toISOString();
  const updatedOrders = currentOrders.map((o) => {
    if (o.id === orderId) {
      return {
        ...o,
        status: 'CANCELLED' as const,
        isRefunded: true,
        refundReason: reason,
        refundedAt: nowIso,
        refundedBy: managerName,
      };
    }
    return o;
  });

  localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(updatedOrders));

  // Remove or mark cancelled in KDS
  try {
    const kdsRaw = localStorage.getItem(STORAGE_KEY_KDS);
    if (kdsRaw) {
      const kdsList: Order[] = JSON.parse(kdsRaw);
      const updatedKds = kdsList.filter((k) => k.id !== orderId);
      localStorage.setItem(STORAGE_KEY_KDS, JSON.stringify(updatedKds));
    }
  } catch (e) {
    console.error('Failed to update KDS on refund', e);
  }

  // Free table if dine-in
  if (target.tableId) {
    updateTableStatus(target.tableId, 'AVAILABLE', undefined);
  }

  // Notify listeners
  window.dispatchEvent(new CustomEvent('coffee_order_refunded', { detail: { orderId, reason } }));
  return true;
};

// Dining Tables Management
export const getTables = (): DiningTable[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TABLES);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse tables', e);
  }
  localStorage.setItem(STORAGE_KEY_TABLES, JSON.stringify(INITIAL_TABLES));
  return INITIAL_TABLES;
};

export const updateTableStatus = (
  tableId: string,
  status: TableStatus,
  currentOrderId?: string
): void => {
  const tables = getTables();
  const updated = tables.map((t) =>
    t.id === tableId ? { ...t, status, currentOrderId: currentOrderId ?? (status === 'AVAILABLE' ? undefined : t.currentOrderId) } : t
  );
  localStorage.setItem(STORAGE_KEY_TABLES, JSON.stringify(updated));
  window.dispatchEvent(new Event('coffee_tables_updated'));
};

// Automatic Recipe Inventory Deduction
const deductInventoryForOrder = (order: Order): void => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_INGREDIENTS);
    let ingredients: Ingredient[] = raw ? JSON.parse(raw) : INITIAL_INGREDIENTS;

    let totalDrinks = 0;
    order.items.forEach((item) => {
      totalDrinks += item.quantity;
    });

    // Approximate deduction per drink: 18g coffee beans, 200ml milk, 1 cup
    ingredients = ingredients.map((ing) => {
      if (ing.name.toLowerCase().includes('bean')) {
        const deducted = Math.max(0, ing.currentStock - (0.018 * totalDrinks));
        return { ...ing, currentStock: parseFloat(deducted.toFixed(3)) };
      }
      if (ing.name.toLowerCase().includes('whole milk')) {
        const deducted = Math.max(0, ing.currentStock - (180 * totalDrinks));
        return { ...ing, currentStock: Math.round(deducted) };
      }
      return ing;
    });

    localStorage.setItem(STORAGE_KEY_INGREDIENTS, JSON.stringify(ingredients));
  } catch (e) {
    console.error('Failed to auto-deduct inventory', e);
  }
};

// Dynamic Sales Metrics for Dashboard & Reports
export const getTodaySalesMetrics = () => {
  const orders = getOrders();
  const todayStr = new Date().toISOString().slice(0, 10);

  const todayOrders = orders.filter((o) => {
    return o.createdAt.startsWith(todayStr) && !o.isRefunded;
  });

  const grossSales = todayOrders.reduce((sum, o) => sum + o.subtotal, 0);
  const discounts = todayOrders.reduce((sum, o) => sum + (o.discountAmount || 0), 0);
  const taxCollected = todayOrders.reduce((sum, o) => sum + (o.taxAmount || 0), 0);
  const netSales = todayOrders.reduce((sum, o) => sum + o.totalAmount, 0);

  let cashSales = 0;
  let cashlessSales = 0;

  todayOrders.forEach((o) => {
    if (o.splitPayments && o.splitPayments.length > 0) {
      o.splitPayments.forEach((p) => {
        if (p.method === 'CASH') cashSales += p.amount;
        else cashlessSales += p.amount;
      });
    } else if (o.paymentMethod === 'CASH') {
      cashSales += o.totalAmount;
    } else {
      cashlessSales += o.totalAmount;
    }
  });

  return {
    orderCount: todayOrders.length,
    grossSales,
    discounts,
    taxCollected,
    netSales,
    cashSales,
    cashlessSales,
    todayOrders,
  };
};
