import { Order, OrderStatus, DiningTable, TableStatus, SplitPayment, PaymentMethod } from '../types';
import { apiFetch } from './api';

export interface CreateOrderPayload {
  type: Order['type'];
  tableId?: string;
  customerId?: string;
  items: Array<{
    cartItemId: string;
    productId: string;
    variantId?: string;
    selectedToppingIds: string[];
    quantity: number;
    notes?: string;
  }>;
  couponCode?: string;
  promotionId?: string;
  discountPercent?: number;
  overrideToken?: string;
  paymentMethod: PaymentMethod;
  splitPayments?: SplitPayment[];
  amountPaid?: number;
  transactionId?: string;
  notes?: string;
}

export async function fetchOrders(opts?: { limit?: number; kdsOnly?: boolean }): Promise<Order[]> {
  const params = new URLSearchParams();
  if (opts?.limit) params.set('limit', String(opts.limit));
  if (opts?.kdsOnly) params.set('kdsOnly', 'true');
  const qs = params.toString() ? `?${params.toString()}` : '';
  const res = await apiFetch<{ orders: Order[] }>(`/api/v1/orders${qs}`);
  return res.orders;
}

export async function createOrderApi(payload: CreateOrderPayload): Promise<Order> {
  const res = await apiFetch<{ order: Order }>('/api/v1/orders', {
    method: 'POST',
    body: payload,
  });
  window.dispatchEvent(new CustomEvent('coffee_order_created', { detail: res.order }));
  return res.order;
}

export async function updateOrderStatusApi(orderId: string, status: OrderStatus): Promise<Order> {
  const res = await apiFetch<{ order: Order }>(`/api/v1/orders/${orderId}/status`, {
    method: 'PATCH',
    body: { status },
  });
  window.dispatchEvent(new Event('coffee_order_created'));
  return res.order;
}

export async function refundOrderApi(
  orderId: string,
  reason: string,
  overrideToken?: string
): Promise<Order> {
  const res = await apiFetch<{ order: Order }>(`/api/v1/orders/${orderId}/refund`, {
    method: 'POST',
    body: { reason, overrideToken },
  });
  window.dispatchEvent(new CustomEvent('coffee_order_refunded', { detail: { orderId, reason } }));
  return res.order;
}

export async function fetchTables(): Promise<DiningTable[]> {
  const res = await apiFetch<{ tables: DiningTable[] }>('/api/v1/tables');
  return res.tables;
}

export async function updateTableStatusApi(
  tableId: string,
  status: TableStatus,
  currentOrderId?: string | null
): Promise<DiningTable> {
  const res = await apiFetch<{ table: DiningTable }>(`/api/v1/tables/${tableId}/status`, {
    method: 'PATCH',
    body: { status, currentOrderId },
  });
  window.dispatchEvent(new Event('coffee_tables_updated'));
  return res.table;
}

export async function transferTableApi(fromTableId: string, toTableId: string): Promise<DiningTable[]> {
  const res = await apiFetch<{ tables: DiningTable[] }>('/api/v1/tables/transfer', {
    method: 'POST',
    body: { fromTableId, toTableId },
  });
  window.dispatchEvent(new Event('coffee_tables_updated'));
  return res.tables;
}

export function computeTodayMetricsFromOrders(orders: Order[]) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayOrders = orders.filter((o) => o.createdAt.startsWith(todayStr) && !o.isRefunded);

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
}
