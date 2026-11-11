import { Router } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { getDb, runInTransaction } from '../db/database';
import { authenticateToken, AuthRequest, requirePermission } from '../middlewares/auth';
import { recordSecurityAudit } from '../services/auditService';
import { sendServerLowStockAlert, sendServerSaleAlert } from '../services/telegramService';
import { ExtraTopping, OrderDTO, OrderItemDTO, OrderStatus, OrderType, PaymentMethod, ProductVariant, SplitPayment } from '../types';
import { consumePinOverrideToken } from './securityRoutes';

const router = Router();

const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

interface OrderRow {
  id: string;
  order_number: string;
  type: OrderType;
  status: OrderStatus;
  table_id: string | null;
  table_name: string | null;
  customer_id: string | null;
  customer_name: string | null;
  user_id: string | null;
  cashier_name: string;
  subtotal: number;
  discount_amount: number;
  coupon_code: string | null;
  tax_amount: number;
  service_charge: number;
  total_amount: number;
  payment_method: PaymentMethod | null;
  split_payments_json: string | null;
  amount_paid: number;
  change_amount: number;
  transaction_id: string | null;
  is_refunded: number;
  refund_reason: string | null;
  refunded_by: string | null;
  refunded_at: string | null;
  notes: string | null;
  created_at: string;
}

interface OrderItemRow {
  id: string;
  order_id: string;
  cart_item_id: string;
  product_id: string;
  name: string;
  image: string;
  selected_variant_json: string | null;
  selected_toppings_json: string;
  unit_price: number;
  quantity: number;
  item_subtotal: number;
  notes: string | null;
}

interface ProductPriceRow {
  id: string;
  name: string;
  image: string;
  selling_price: number;
  is_available: number;
  variants_json: string;
  toppings_json: string;
}

interface PromotionRow {
  id: string;
  name: string;
  type: 'PERCENT' | 'FIXED' | 'HAPPY_HOUR' | 'BOGO';
  value: number;
  min_spend: number | null;
  is_active: number;
}

function hydrateOrders(orderRows: OrderRow[]): OrderDTO[] {
  if (orderRows.length === 0) return [];
  const db = getDb();
  const itemRows = db
    .prepare(
      `SELECT * FROM order_items WHERE order_id IN (${orderRows.map(() => '?').join(',')}) ORDER BY rowid ASC`
    )
    .all<OrderItemRow>(...orderRows.map((o) => o.id));

  const itemsByOrder = new Map<string, OrderItemDTO[]>();
  for (const row of itemRows) {
    let selectedVariant: ProductVariant | undefined;
    let selectedToppings: ExtraTopping[] = [];
    try {
      if (row.selected_variant_json) selectedVariant = JSON.parse(row.selected_variant_json);
    } catch {
      selectedVariant = undefined;
    }
    try {
      selectedToppings = JSON.parse(row.selected_toppings_json || '[]');
    } catch {
      selectedToppings = [];
    }

    const dto: OrderItemDTO = {
      cartItemId: row.cart_item_id,
      productId: row.product_id,
      name: row.name,
      image: row.image,
      selectedVariant,
      selectedToppings,
      unitPrice: Number(row.unit_price),
      quantity: Number(row.quantity),
      itemSubtotal: Number(row.item_subtotal),
      notes: row.notes || undefined,
    };

    const list = itemsByOrder.get(row.order_id) || [];
    list.push(dto);
    itemsByOrder.set(row.order_id, list);
  }

  return orderRows.map((row) => {
    let splitPayments: SplitPayment[] | undefined;
    if (row.split_payments_json) {
      try {
        splitPayments = JSON.parse(row.split_payments_json);
      } catch {
        splitPayments = undefined;
      }
    }

    return {
      id: row.id,
      orderNumber: row.order_number,
      type: row.type,
      status: row.status,
      tableId: row.table_id || undefined,
      tableName: row.table_name || undefined,
      customerId: row.customer_id || undefined,
      customerName: row.customer_name || undefined,
      cashierName: row.cashier_name,
      items: itemsByOrder.get(row.id) || [],
      subtotal: Number(row.subtotal),
      discountAmount: Number(row.discount_amount),
      couponCode: row.coupon_code || undefined,
      taxAmount: Number(row.tax_amount),
      serviceCharge: Number(row.service_charge),
      totalAmount: Number(row.total_amount),
      paymentMethod: row.payment_method || undefined,
      splitPayments,
      amountPaid: Number(row.amount_paid || 0),
      changeAmount: Number(row.change_amount || 0),
      transactionId: row.transaction_id || undefined,
      createdAt: row.created_at,
      notes: row.notes || undefined,
      isRefunded: Boolean(row.is_refunded),
      refundReason: row.refund_reason || undefined,
      refundedAt: row.refunded_at || undefined,
      refundedBy: row.refunded_by || undefined,
    };
  });
}

router.get('/', authenticateToken, (req, res) => {
  const db = getDb();
  const limitRaw = Number(req.query.limit || 200);
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(1, limitRaw), 1000) : 200;
  const kdsOnly = req.query.kdsOnly === 'true';

  const rows = kdsOnly
    ? db
        .prepare(
          `SELECT * FROM orders
           WHERE is_refunded = 0 AND status IN ('PENDING', 'PREPARING', 'READY')
           ORDER BY created_at DESC LIMIT ?`
        )
        .all<OrderRow>(limit)
    : db.prepare('SELECT * FROM orders ORDER BY created_at DESC LIMIT ?').all<OrderRow>(limit);

  res.json({ orders: hydrateOrders(rows) });
});

const orderItemInputSchema = z.object({
  cartItemId: z.string().max(120).optional(),
  productId: z.string().min(1).max(100),
  variantId: z.string().max(64).optional(),
  selectedVariant: z.object({ id: z.string().min(1).max(64) }).optional(),
  selectedToppingIds: z.array(z.string().max(64)).optional(),
  selectedToppings: z.array(z.object({ id: z.string().min(1).max(64) })).optional(),
  quantity: z.number().int().min(1).max(200),
  notes: z.string().max(300).optional(),
});

const createOrderSchema = z.object({
  type: z.enum(['DINE_IN', 'TAKE_AWAY', 'DELIVERY', 'DRIVE_THROUGH']),
  tableId: z.string().max(64).optional(),
  customerId: z.string().max(64).optional(),
  items: z.array(orderItemInputSchema).min(1, 'Order must contain at least one item'),
  couponCode: z.string().trim().max(40).optional(),
  promotionId: z.string().trim().max(64).optional(),
  discountPercent: z.number().min(0).max(100).default(0),
  overrideToken: z.string().optional(),
  paymentMethod: z.enum(['CASH', 'CREDIT_CARD', 'ABA_KHQR', 'BAKONG', 'WING', 'ACLEDA', 'MIXED']),
  splitPayments: z
    .array(
      z.object({
        method: z.enum(['CASH', 'CREDIT_CARD', 'ABA_KHQR', 'BAKONG', 'WING', 'ACLEDA', 'MIXED']),
        amount: z.number().min(0),
      })
    )
    .optional(),
  amountPaid: z.number().min(0).optional(),
  transactionId: z.string().max(120).optional(),
  notes: z.string().max(500).optional(),
});

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

router.post('/', authenticateToken, requirePermission('pos:access'), async (req: AuthRequest, res) => {
  const parsed = createOrderSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid order payload' });
    return;
  }

  const input = parsed.data;
  const caller = req.user!;

  let createdOrder: OrderDTO;
  const lowStockAlerts: Array<{ name: string; currentStock: number; minAlert: number; unit: string }> = [];
  let overrideAuthorizer: string | undefined;

  try {
    createdOrder = runInTransaction((tx) => {
      // 1. Validate discount authorization if manual discount > 0 and no coupon/promo overrides it
      const normalizedCoupon = input.couponCode?.trim().toUpperCase() || '';
      const hasKnownCoupon = normalizedCoupon === 'COFFEE20' || normalizedCoupon === 'VIP10' || normalizedCoupon === 'COFFEE5';
      const activePromo = input.promotionId
        ? tx
            .prepare('SELECT id, name, type, value, min_spend, is_active FROM promotions WHERE id = ? AND is_active = 1')
            .get<PromotionRow>(input.promotionId)
        : undefined;

      if (input.discountPercent > 0 && !hasKnownCoupon && !activePromo) {
        const canDiscount = caller.role === 'ADMIN' || caller.permissions.includes('pos:discount');
        if (!canDiscount) {
          const override = consumePinOverrideToken(input.overrideToken);
          if (!override.valid) {
            throw new HttpError(403, 'Manual discount requires pos:discount permission or valid Manager PIN override');
          }
          overrideAuthorizer = `${override.authorizerName} (${override.authorizerRole})`;
        }
      }

      // 2. Resolve authoritative product prices from database
      const computedItems: Array<OrderItemDTO & { itemId: string }> = [];
      let totalDrinks = 0;

      for (const item of input.items) {
        const product = tx
          .prepare('SELECT id, name, image, selling_price, is_available, variants_json, toppings_json FROM products WHERE id = ?')
          .get<ProductPriceRow>(item.productId);

        if (!product) {
          throw new HttpError(400, `Product '${item.productId}' does not exist`);
        }
        if (!product.is_available) {
          throw new HttpError(400, `Product '${product.name}' is currently marked unavailable`);
        }

        const catalogVariants: ProductVariant[] = JSON.parse(product.variants_json || '[]');
        const catalogToppings: ExtraTopping[] = JSON.parse(product.toppings_json || '[]');

        const requestedVariantId = item.variantId || item.selectedVariant?.id;
        let resolvedVariant: ProductVariant | undefined;
        if (requestedVariantId) {
          resolvedVariant = catalogVariants.find((v) => v.id === requestedVariantId);
          if (!resolvedVariant) {
            throw new HttpError(400, `Invalid variant for '${product.name}'`);
          }
        }

        const requestedToppingIds =
          item.selectedToppingIds ||
          (item.selectedToppings ? item.selectedToppings.map((t) => t.id) : []);
        const resolvedToppings: ExtraTopping[] = [];
        for (const tid of requestedToppingIds) {
          const found = catalogToppings.find((t) => t.id === tid);
          if (!found) {
            throw new HttpError(400, `Invalid topping '${tid}' for '${product.name}'`);
          }
          resolvedToppings.push(found);
        }

        const toppingSum = resolvedToppings.reduce((acc, t) => acc + Number(t.price), 0);
        const unitPrice = round2(
          Number(product.selling_price) + (resolvedVariant ? Number(resolvedVariant.priceOffset) : 0) + toppingSum
        );
        const itemSubtotal = round2(unitPrice * item.quantity);

        totalDrinks += item.quantity;
        computedItems.push({
          itemId: `oi-${crypto.randomUUID()}`,
          cartItemId: item.cartItemId || `ci-${crypto.randomUUID()}`,
          productId: product.id,
          name: product.name,
          image: product.image,
          selectedVariant: resolvedVariant,
          selectedToppings: resolvedToppings,
          unitPrice,
          quantity: item.quantity,
          itemSubtotal,
          notes: item.notes,
        });
      }

      const subtotal = round2(computedItems.reduce((sum, item) => sum + item.itemSubtotal, 0));

      // 3. Authoritative discount calculation
      let discountAmount = 0;
      let appliedCoupon: string | null = null;

      if (normalizedCoupon === 'COFFEE20') {
        discountAmount = round2(subtotal * 0.2);
        appliedCoupon = 'COFFEE20';
      } else if (normalizedCoupon === 'VIP10') {
        discountAmount = round2(subtotal * 0.1);
        appliedCoupon = 'VIP10';
      } else if (normalizedCoupon === 'COFFEE5') {
        discountAmount = round2(Math.min(5, subtotal));
        appliedCoupon = 'COFFEE5';
      } else if (activePromo) {
        if (activePromo.min_spend && subtotal < Number(activePromo.min_spend)) {
          throw new HttpError(400, `Promotion requires minimum spend of $${Number(activePromo.min_spend).toFixed(2)}`);
        }
        if (activePromo.type === 'FIXED') {
          discountAmount = round2(Math.min(Number(activePromo.value), subtotal));
        } else {
          discountAmount = round2(subtotal * (Math.min(100, Number(activePromo.value)) / 100));
        }
        appliedCoupon = input.couponCode || activePromo.name;
      } else if (input.discountPercent > 0) {
        discountAmount = round2(subtotal * (input.discountPercent / 100));
        appliedCoupon = `MANUAL-${input.discountPercent}%`;
      }

      discountAmount = Math.min(subtotal, discountAmount);

      // 4. Authoritative tax rate from store_settings
      const settingsRow = tx
        .prepare('SELECT tax_rate FROM store_settings WHERE id = 1')
        .get<{ tax_rate: number }>();
      const taxRate = settingsRow ? Number(settingsRow.tax_rate) : 10;

      const taxableSubtotal = round2(Math.max(0, subtotal - discountAmount));
      const taxAmount = round2(taxableSubtotal * (taxRate / 100));
      const totalAmount = round2(taxableSubtotal + taxAmount);

      // 5. Payment validation
      let amountPaid = totalAmount;
      let changeAmount = 0;

      if (input.paymentMethod === 'MIXED') {
        const splitSum = round2((input.splitPayments || []).reduce((s, p) => s + Number(p.amount), 0));
        if (splitSum < totalAmount - 0.01) {
          throw new HttpError(400, `Split payment total ($${splitSum.toFixed(2)}) is less than order total ($${totalAmount.toFixed(2)})`);
        }
        amountPaid = splitSum;
        changeAmount = round2(Math.max(0, splitSum - totalAmount));
      } else if (input.paymentMethod === 'CASH') {
        amountPaid = input.amountPaid !== undefined ? round2(input.amountPaid) : totalAmount;
        if (amountPaid < totalAmount - 0.01) {
          throw new HttpError(400, `Cash tendered ($${amountPaid.toFixed(2)}) is less than total ($${totalAmount.toFixed(2)})`);
        }
        changeAmount = round2(Math.max(0, amountPaid - totalAmount));
      }

      // 6. Optional Dining Table & Customer lookups
      let tableName: string | null = null;
      if (input.type === 'DINE_IN' && input.tableId) {
        const tableRow = tx
          .prepare('SELECT id, name FROM dining_tables WHERE id = ?')
          .get<{ id: string; name: string }>(input.tableId);
        if (!tableRow) {
          throw new HttpError(400, 'Selected dining table does not exist');
        }
        tableName = tableRow.name;
      }

      let customerName: string | null = null;
      if (input.customerId) {
        const custRow = tx
          .prepare('SELECT id, name, loyalty_points, total_spent FROM customers WHERE id = ?')
          .get<{ id: string; name: string; loyalty_points: number; total_spent: number }>(input.customerId);
        if (!custRow) {
          throw new HttpError(400, 'Selected customer does not exist');
        }
        customerName = custRow.name;

        const earnedPoints = Math.max(1, Math.floor(totalAmount * 10));
        const newPoints = Number(custRow.loyalty_points) + earnedPoints;
        const newSpent = round2(Number(custRow.total_spent) + totalAmount);
        const newTier =
          newPoints >= 1000 ? 'Platinum' : newPoints >= 400 ? 'Gold' : newPoints >= 100 ? 'Silver' : 'Bronze';

        tx.prepare(
          'UPDATE customers SET loyalty_points = ?, total_spent = ?, tier = ?, last_visit = ? WHERE id = ?'
        ).run(newPoints, newSpent, newTier, 'Today', custRow.id);
      }

      // 7. Insert Order + Items
      const orderId = `ord-${crypto.randomUUID()}`;
      const orderNumber = `ORD-${String(Date.now()).slice(-6)}`;
      const now = new Date().toISOString();

      tx.prepare(`
        INSERT INTO orders (
          id, order_number, type, status, table_id, table_name,
          customer_id, customer_name, user_id, cashier_name,
          subtotal, discount_amount, coupon_code, tax_amount, service_charge, total_amount,
          payment_method, split_payments_json, amount_paid, change_amount, transaction_id,
          is_refunded, notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, 0, ?, ?)
      `).run(
        orderId,
        orderNumber,
        input.type,
        'PREPARING',
        input.type === 'DINE_IN' ? input.tableId || null : null,
        tableName,
        input.customerId || null,
        customerName,
        caller.id,
        caller.name,
        subtotal,
        discountAmount,
        appliedCoupon,
        taxAmount,
        totalAmount,
        input.paymentMethod,
        input.splitPayments ? JSON.stringify(input.splitPayments) : null,
        amountPaid,
        changeAmount,
        input.transactionId || null,
        input.notes || null,
        now
      );

      const insertItemStmt = tx.prepare(`
        INSERT INTO order_items (
          id, order_id, cart_item_id, product_id, name, image,
          selected_variant_json, selected_toppings_json, unit_price, quantity, item_subtotal, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const ci of computedItems) {
        insertItemStmt.run(
          ci.itemId,
          orderId,
          ci.cartItemId,
          ci.productId,
          ci.name,
          ci.image,
          ci.selectedVariant ? JSON.stringify(ci.selectedVariant) : null,
          JSON.stringify(ci.selectedToppings),
          ci.unitPrice,
          ci.quantity,
          ci.itemSubtotal,
          ci.notes || null
        );
      }

      // 8. Occupy table if dine-in
      if (input.type === 'DINE_IN' && input.tableId) {
        tx.prepare('UPDATE dining_tables SET status = ?, current_order_id = ? WHERE id = ?').run(
          'OCCUPIED',
          orderId,
          input.tableId
        );
      }

      // 9. Update cashier sales count
      tx.prepare('UPDATE users SET sales_count = sales_count + 1 WHERE id = ?').run(caller.id);

      // 10. Auto-deduct primary coffee bean & whole milk inventory
      const ingredients = tx
        .prepare('SELECT id, name, unit, current_stock, min_stock_alert FROM ingredients')
        .all<{ id: string; name: string; unit: string; current_stock: number; min_stock_alert: number }>();

      for (const ing of ingredients) {
        const lower = ing.name.toLowerCase();
        let nextStock = Number(ing.current_stock);
        let changed = false;

        if (lower.includes('bean')) {
          nextStock = Math.max(0, Number((nextStock - 0.018 * totalDrinks).toFixed(3)));
          changed = true;
        } else if (lower.includes('whole milk')) {
          nextStock = Math.max(0, Math.round(nextStock - 180 * totalDrinks));
          changed = true;
        }

        if (changed) {
          const outDate = nextStock <= 0 ? now.slice(0, 10) : null;
          tx.prepare('UPDATE ingredients SET current_stock = ?, out_of_stock_date = COALESCE(?, out_of_stock_date) WHERE id = ?').run(
            nextStock,
            outDate,
            ing.id
          );
          if (nextStock <= Number(ing.min_stock_alert)) {
            lowStockAlerts.push({
              name: ing.name,
              currentStock: nextStock,
              minAlert: Number(ing.min_stock_alert),
              unit: ing.unit,
            });
          }
        }
      }

      // 11. Update open shift cash_in if cash payment received
      let cashReceived = 0;
      if (input.paymentMethod === 'CASH') {
        cashReceived = totalAmount;
      } else if (input.paymentMethod === 'MIXED' && input.splitPayments) {
        cashReceived = input.splitPayments
          .filter((p) => p.method === 'CASH')
          .reduce((s, p) => s + Number(p.amount), 0);
      }
      if (cashReceived > 0) {
        const openShift = tx
          .prepare(`SELECT id FROM shifts WHERE status = 'OPEN' ORDER BY opened_at DESC LIMIT 1`)
          .get<{ id: string }>();
        if (openShift) {
          tx.prepare('UPDATE shifts SET cash_in = cash_in + ? WHERE id = ?').run(round2(cashReceived), openShift.id);
        }
      }

      return {
        id: orderId,
        orderNumber,
        type: input.type,
        status: 'PREPARING',
        tableId: input.type === 'DINE_IN' ? input.tableId : undefined,
        tableName: tableName || undefined,
        customerId: input.customerId,
        customerName: customerName || undefined,
        cashierName: caller.name,
        items: computedItems.map(({ itemId: _omit, ...rest }) => rest),
        subtotal,
        discountAmount,
        couponCode: appliedCoupon || undefined,
        taxAmount,
        serviceCharge: 0,
        totalAmount,
        paymentMethod: input.paymentMethod,
        splitPayments: input.splitPayments,
        amountPaid,
        changeAmount,
        transactionId: input.transactionId,
        createdAt: now,
        notes: input.notes,
        isRefunded: false,
      };
    });
  } catch (err) {
    if (err instanceof HttpError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    throw err;
  }

  if (createdOrder.discountAmount > 0 || overrideAuthorizer) {
    recordSecurityAudit({
      action: 'ORDER_DISCOUNT',
      title: `Discount Applied on ${createdOrder.orderNumber}`,
      details: `Subtotal $${createdOrder.subtotal.toFixed(2)}, Discount -$${createdOrder.discountAmount.toFixed(2)} (${createdOrder.couponCode || 'Manual'}), Total $${createdOrder.totalAmount.toFixed(2)}`,
      userId: caller.id,
      performedBy: `${caller.name} (${caller.role})`,
      authorizedBy: overrideAuthorizer,
      ipAddress: req.ip,
      severity: 'INFO',
    });
  }

  // Dispatch Telegram notifications asynchronously
  sendServerSaleAlert(createdOrder).catch(() => {});
  for (const alertItem of lowStockAlerts) {
    sendServerLowStockAlert(alertItem.name, alertItem.currentStock, alertItem.minAlert, alertItem.unit).catch(() => {});
  }

  res.status(201).json({ order: createdOrder });
});

const statusSchema = z.object({
  status: z.enum(['PENDING', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED']),
});

router.patch('/:id/status', authenticateToken, requirePermission('pos:access'), (req, res) => {
  const parsed = statusSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid order status' });
    return;
  }

  const db = getDb();
  const row = db.prepare('SELECT * FROM orders WHERE id = ?').get<OrderRow>(req.params.id);
  if (!row) {
    res.status(404).json({ error: 'Order not found' });
    return;
  }

  runInTransaction((tx) => {
    tx.prepare('UPDATE orders SET status = ? WHERE id = ?').run(parsed.data.status, row.id);
    if ((parsed.data.status === 'COMPLETED' || parsed.data.status === 'CANCELLED') && row.table_id) {
      tx.prepare(
        `UPDATE dining_tables SET status = 'DIRTY', current_order_id = NULL WHERE id = ? AND current_order_id = ?`
      ).run(row.table_id, row.id);
    }
  });

  const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get<OrderRow>(row.id)!;
  res.json({ order: hydrateOrders([updated])[0] });
});

const refundSchema = z.object({
  reason: z.string().trim().min(2, 'Refund reason is required').max(300),
  overrideToken: z.string().optional(),
});

router.post('/:id/refund', authenticateToken, (req: AuthRequest, res) => {
  const parsed = refundSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid refund request' });
    return;
  }

  const caller = req.user!;
  const hasVoidPerm = caller.role === 'ADMIN' || caller.permissions.includes('pos:void');
  let authorizedBy = `${caller.name} (${caller.role})`;

  if (!hasVoidPerm) {
    const override = consumePinOverrideToken(parsed.data.overrideToken);
    if (!override.valid) {
      res.status(403).json({ error: 'Void/Refund requires pos:void permission or valid Manager PIN override' });
      return;
    }
    authorizedBy = `${override.authorizerName} (${override.authorizerRole})`;
  }

  const db = getDb();
  const orderRow = db.prepare('SELECT * FROM orders WHERE id = ?').get<OrderRow>(req.params.id);
  if (!orderRow) {
    res.status(404).json({ error: 'Order not found' });
    return;
  }
  if (orderRow.is_refunded) {
    res.status(409).json({ error: 'Order has already been refunded' });
    return;
  }

  const now = new Date().toISOString();

  runInTransaction((tx) => {
    tx.prepare(
      `UPDATE orders SET status = 'CANCELLED', is_refunded = 1, refund_reason = ?, refunded_by = ?, refunded_at = ? WHERE id = ?`
    ).run(parsed.data.reason, authorizedBy, now, orderRow.id);

    if (orderRow.table_id) {
      tx.prepare(
        `UPDATE dining_tables SET status = 'AVAILABLE', current_order_id = NULL WHERE id = ?`
      ).run(orderRow.table_id);
    }
  });

  recordSecurityAudit({
    action: 'ORDER_REFUNDED',
    title: `Order Refunded (${orderRow.order_number})`,
    details: `Amount: $${Number(orderRow.total_amount).toFixed(2)} — Reason: ${parsed.data.reason}`,
    userId: caller.id,
    performedBy: `${caller.name} (${caller.role})`,
    authorizedBy,
    ipAddress: req.ip,
    severity: 'WARNING',
  });

  const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get<OrderRow>(orderRow.id)!;
  res.json({ order: hydrateOrders([updated])[0] });
});

export default router;
