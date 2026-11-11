import { Router } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { getDb, runInTransaction } from '../db/database';
import { authenticateToken, AuthRequest, requirePermission } from '../middlewares/auth';
import { recordSecurityAudit } from '../services/auditService';
import { sendServerLowStockAlert } from '../services/telegramService';

export const tablesRouter = Router();
export const inventoryRouter = Router();
export const customersRouter = Router();
export const promotionsRouter = Router();
export const broadcastsRouter = Router();

/* =========================================================
 * 1. DINING TABLES
 * =======================================================*/
interface TableRow {
  id: string;
  table_number: string;
  name: string;
  capacity: number;
  status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'DIRTY';
  floor_section: string;
  current_order_id: string | null;
}

const mapTable = (t: TableRow) => ({
  id: t.id,
  tableNumber: t.table_number,
  name: t.name,
  capacity: Number(t.capacity),
  status: t.status,
  floorSection: t.floor_section,
  currentOrderId: t.current_order_id || undefined,
});

tablesRouter.get('/', authenticateToken, (_req, res) => {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM dining_tables ORDER BY table_number ASC').all<TableRow>();
  res.json({ tables: rows.map(mapTable) });
});

const createTableSchema = z.object({
  tableNumber: z.string().trim().min(1).max(20),
  name: z.string().trim().min(1).max(60),
  capacity: z.number().int().min(1).max(30),
  floorSection: z.enum(['Main Floor', 'Terrace', 'VIP Lounge']).default('Main Floor'),
});

tablesRouter.post('/', authenticateToken, requirePermission('pos:access'), (req, res) => {
  const parsed = createTableSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid table data' });
    return;
  }

  const db = getDb();
  const dup = db.prepare('SELECT id FROM dining_tables WHERE table_number = ?').get(parsed.data.tableNumber);
  if (dup) {
    res.status(409).json({ error: `Table '${parsed.data.tableNumber}' already exists` });
    return;
  }

  const id = `t-${crypto.randomUUID()}`;
  db.prepare(
    'INSERT INTO dining_tables (id, table_number, name, capacity, status, floor_section, current_order_id) VALUES (?, ?, ?, ?, ?, ?, NULL)'
  ).run(id, parsed.data.tableNumber, parsed.data.name, parsed.data.capacity, 'AVAILABLE', parsed.data.floorSection);

  const created = db.prepare('SELECT * FROM dining_tables WHERE id = ?').get<TableRow>(id)!;
  res.status(201).json({ table: mapTable(created) });
});

tablesRouter.patch('/:id/status', authenticateToken, requirePermission('pos:access'), (req, res) => {
  const parsed = z
    .object({
      status: z.enum(['AVAILABLE', 'OCCUPIED', 'RESERVED', 'DIRTY']),
      currentOrderId: z.string().nullable().optional(),
    })
    .safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid table status update' });
    return;
  }

  const db = getDb();
  const existing = db.prepare('SELECT * FROM dining_tables WHERE id = ?').get<TableRow>(req.params.id);
  if (!existing) {
    res.status(404).json({ error: 'Table not found' });
    return;
  }

  const nextOrderId =
    parsed.data.status === 'AVAILABLE'
      ? null
      : parsed.data.currentOrderId !== undefined
      ? parsed.data.currentOrderId
      : existing.current_order_id;

  db.prepare('UPDATE dining_tables SET status = ?, current_order_id = ? WHERE id = ?').run(
    parsed.data.status,
    nextOrderId,
    existing.id
  );

  const updated = db.prepare('SELECT * FROM dining_tables WHERE id = ?').get<TableRow>(existing.id)!;
  res.json({ table: mapTable(updated) });
});

tablesRouter.post('/transfer', authenticateToken, requirePermission('pos:access'), (req, res) => {
  const parsed = z.object({ fromTableId: z.string().min(1), toTableId: z.string().min(1) }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Source and target table IDs are required' });
    return;
  }

  const { fromTableId, toTableId } = parsed.data;
  if (fromTableId === toTableId) {
    res.status(400).json({ error: 'Cannot transfer to the same table' });
    return;
  }

  const db = getDb();
  const fromRow = db.prepare('SELECT * FROM dining_tables WHERE id = ?').get<TableRow>(fromTableId);
  const toRow = db.prepare('SELECT * FROM dining_tables WHERE id = ?').get<TableRow>(toTableId);
  if (!fromRow || !toRow) {
    res.status(404).json({ error: 'Source or target table not found' });
    return;
  }

  runInTransaction((tx) => {
    tx.prepare('UPDATE dining_tables SET status = ?, current_order_id = ? WHERE id = ?').run(
      'OCCUPIED',
      fromRow.current_order_id,
      toRow.id
    );
    tx.prepare('UPDATE dining_tables SET status = ?, current_order_id = NULL WHERE id = ?').run(
      'AVAILABLE',
      fromRow.id
    );
    if (fromRow.current_order_id) {
      tx.prepare('UPDATE orders SET table_id = ?, table_name = ? WHERE id = ?').run(
        toRow.id,
        toRow.name,
        fromRow.current_order_id
      );
    }
  });

  const rows = db.prepare('SELECT * FROM dining_tables ORDER BY table_number ASC').all<TableRow>();
  res.json({ tables: rows.map(mapTable) });
});

/* =========================================================
 * 2. INVENTORY / INGREDIENTS
 * =======================================================*/
interface IngredientRow {
  id: string;
  name: string;
  unit: string;
  current_stock: number;
  min_stock_alert: number;
  cost_per_unit: number;
  last_restocked: string;
  out_of_stock_date: string | null;
}

const mapIngredient = (row: IngredientRow) => ({
  id: row.id,
  name: row.name,
  unit: row.unit,
  currentStock: Number(row.current_stock),
  minStockAlert: Number(row.min_stock_alert),
  costPerUnit: Number(row.cost_per_unit),
  lastRestocked: row.last_restocked,
  outOfStockDate: row.out_of_stock_date || undefined,
});

inventoryRouter.get('/', authenticateToken, requirePermission('inventory:view'), (_req, res) => {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM ingredients ORDER BY name ASC').all<IngredientRow>();
  res.json({ ingredients: rows.map(mapIngredient) });
});

const createIngSchema = z.object({
  name: z.string().trim().min(1).max(120),
  unit: z.enum(['g', 'kg', 'ml', 'l', 'pcs', 'shots']),
  currentStock: z.number().min(0),
  minStockAlert: z.number().min(0),
  costPerUnit: z.number().min(0),
});

inventoryRouter.post('/', authenticateToken, requirePermission('inventory:edit'), (req: AuthRequest, res) => {
  const parsed = createIngSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid ingredient data' });
    return;
  }

  const d = parsed.data;
  const db = getDb();
  const id = `ing-${crypto.randomUUID()}`;
  const today = new Date().toISOString().slice(0, 10);

  db.prepare(`
    INSERT INTO ingredients (id, name, unit, current_stock, min_stock_alert, cost_per_unit, last_restocked, out_of_stock_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, d.name, d.unit, d.currentStock, d.minStockAlert, d.costPerUnit, today, d.currentStock <= 0 ? today : null);

  recordSecurityAudit({
    action: 'INVENTORY_ADDED',
    title: 'Inventory Ingredient Created',
    details: `Added ${d.name} (${d.currentStock} ${d.unit})`,
    userId: req.user!.id,
    performedBy: `${req.user!.name} (${req.user!.role})`,
    ipAddress: req.ip,
  });

  const created = db.prepare('SELECT * FROM ingredients WHERE id = ?').get<IngredientRow>(id)!;
  res.status(201).json({ ingredient: mapIngredient(created) });
});

inventoryRouter.patch('/:id/adjust', authenticateToken, requirePermission('inventory:edit'), async (req: AuthRequest, res) => {
  const parsed = z.object({ delta: z.number().finite() }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Adjustment delta is required' });
    return;
  }

  const db = getDb();
  const row = db.prepare('SELECT * FROM ingredients WHERE id = ?').get<IngredientRow>(req.params.id);
  if (!row) {
    res.status(404).json({ error: 'Ingredient not found' });
    return;
  }

  const nextStock = Math.max(0, Number((Number(row.current_stock) + parsed.data.delta).toFixed(3)));
  const today = new Date().toISOString().slice(0, 10);
  const lastRestocked = parsed.data.delta > 0 ? today : row.last_restocked;
  const outOfStockDate = nextStock <= 0 ? row.out_of_stock_date || today : null;

  db.prepare('UPDATE ingredients SET current_stock = ?, last_restocked = ?, out_of_stock_date = ? WHERE id = ?').run(
    nextStock,
    lastRestocked,
    outOfStockDate,
    row.id
  );

  if (nextStock <= Number(row.min_stock_alert)) {
    sendServerLowStockAlert(row.name, nextStock, Number(row.min_stock_alert), row.unit).catch(() => {});
  }

  const updated = db.prepare('SELECT * FROM ingredients WHERE id = ?').get<IngredientRow>(row.id)!;
  res.json({ ingredient: mapIngredient(updated) });
});

inventoryRouter.delete('/:id', authenticateToken, requirePermission('inventory:edit'), (req: AuthRequest, res) => {
  const db = getDb();
  const row = db.prepare('SELECT id, name FROM ingredients WHERE id = ?').get<{ id: string; name: string }>(req.params.id);
  if (!row) {
    res.status(404).json({ error: 'Ingredient not found' });
    return;
  }
  db.prepare('DELETE FROM ingredients WHERE id = ?').run(row.id);
  res.json({ deletedId: row.id });
});

/* =========================================================
 * 3. CUSTOMERS & LOYALTY
 * =======================================================*/
interface CustomerRow {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  loyalty_points: number;
  tier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
  total_spent: number;
  birthday: string | null;
  last_visit: string | null;
}

const mapCustomer = (c: CustomerRow) => ({
  id: c.id,
  name: c.name,
  phone: c.phone,
  email: c.email || undefined,
  loyaltyPoints: Number(c.loyalty_points),
  tier: c.tier,
  totalSpent: Number(c.total_spent),
  birthday: c.birthday || undefined,
  lastVisit: c.last_visit || undefined,
});

customersRouter.get('/', authenticateToken, (_req, res) => {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM customers ORDER BY loyalty_points DESC, name ASC').all<CustomerRow>();
  res.json({ customers: rows.map(mapCustomer) });
});

const createCustomerSchema = z.object({
  name: z.string().trim().min(1).max(120),
  phone: z.string().trim().min(5).max(40),
  email: z.string().trim().email().optional().or(z.literal('')),
  birthday: z.string().trim().max(20).optional(),
  tier: z.enum(['Bronze', 'Silver', 'Gold', 'Platinum']).default('Bronze'),
});

customersRouter.post('/', authenticateToken, (req, res) => {
  const parsed = createCustomerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid customer data' });
    return;
  }

  const db = getDb();
  const dup = db.prepare('SELECT id FROM customers WHERE phone = ?').get(parsed.data.phone);
  if (dup) {
    res.status(409).json({ error: 'A customer with this phone number already exists' });
    return;
  }

  const id = `c-${crypto.randomUUID()}`;
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO customers (id, name, phone, email, loyalty_points, tier, total_spent, birthday, last_visit, created_at)
    VALUES (?, ?, ?, ?, 0, ?, 0, ?, 'Just Joined', ?)
  `).run(id, parsed.data.name, parsed.data.phone, parsed.data.email || null, parsed.data.tier, parsed.data.birthday || null, now);

  const created = db.prepare('SELECT * FROM customers WHERE id = ?').get<CustomerRow>(id)!;
  res.status(201).json({ customer: mapCustomer(created) });
});

customersRouter.patch('/:id/points', authenticateToken, (req, res) => {
  const parsed = z.object({ delta: z.number().int().min(-5000).max(5000) }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid loyalty point adjustment' });
    return;
  }

  const db = getDb();
  const row = db.prepare('SELECT * FROM customers WHERE id = ?').get<CustomerRow>(req.params.id);
  if (!row) {
    res.status(404).json({ error: 'Customer not found' });
    return;
  }

  const newPoints = Math.max(0, Number(row.loyalty_points) + parsed.data.delta);
  const newTier =
    newPoints >= 1000 ? 'Platinum' : newPoints >= 400 ? 'Gold' : newPoints >= 100 ? 'Silver' : 'Bronze';

  db.prepare('UPDATE customers SET loyalty_points = ?, tier = ? WHERE id = ?').run(newPoints, newTier, row.id);
  const updated = db.prepare('SELECT * FROM customers WHERE id = ?').get<CustomerRow>(row.id)!;
  res.json({ customer: mapCustomer(updated) });
});

/* =========================================================
 * 4. PROMOTIONS
 * =======================================================*/
interface PromoRow {
  id: string;
  name: string;
  name_kh: string;
  type: 'PERCENT' | 'FIXED' | 'HAPPY_HOUR' | 'BOGO';
  value: number;
  category_ids_json: string | null;
  start_hour: number | null;
  end_hour: number | null;
  days_of_week_json: string | null;
  min_spend: number | null;
  is_active: number;
  description: string;
  description_kh: string;
  badge: string;
}

const mapPromo = (p: PromoRow) => ({
  id: p.id,
  name: p.name,
  nameKh: p.name_kh,
  type: p.type,
  value: Number(p.value),
  categoryIds: p.category_ids_json ? JSON.parse(p.category_ids_json) : undefined,
  startHour: p.start_hour ?? undefined,
  endHour: p.end_hour ?? undefined,
  daysOfWeek: p.days_of_week_json ? JSON.parse(p.days_of_week_json) : undefined,
  minSpend: p.min_spend !== null ? Number(p.min_spend) : undefined,
  isActive: Boolean(p.is_active),
  description: p.description,
  descriptionKh: p.description_kh,
  badge: p.badge,
});

promotionsRouter.get('/', authenticateToken, (_req, res) => {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM promotions ORDER BY rowid ASC').all<PromoRow>();
  res.json({ promotions: rows.map(mapPromo) });
});

const createPromoSchema = z.object({
  name: z.string().trim().min(1).max(120),
  nameKh: z.string().trim().min(1).max(120).optional(),
  type: z.enum(['PERCENT', 'FIXED', 'HAPPY_HOUR', 'BOGO']),
  value: z.number().min(0).max(1000),
  categoryIds: z.array(z.string()).optional(),
  startHour: z.number().int().min(0).max(23).optional(),
  endHour: z.number().int().min(0).max(23).optional(),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
  minSpend: z.number().min(0).optional(),
  description: z.string().trim().max(300).default(''),
  descriptionKh: z.string().trim().max(300).default(''),
  badge: z.string().trim().max(40).default('🎁 Special Offer'),
});

promotionsRouter.post('/', authenticateToken, requirePermission('pos:discount'), (req, res) => {
  const parsed = createPromoSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid promotion payload' });
    return;
  }

  const d = parsed.data;
  const db = getDb();
  const id = `promo-${crypto.randomUUID()}`;
  db.prepare(`
    INSERT INTO promotions (
      id, name, name_kh, type, value, category_ids_json, start_hour, end_hour,
      days_of_week_json, min_spend, is_active, description, description_kh, badge
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
  `).run(
    id,
    d.name,
    d.nameKh || d.name,
    d.type,
    d.value,
    d.categoryIds ? JSON.stringify(d.categoryIds) : null,
    d.startHour ?? null,
    d.endHour ?? null,
    d.daysOfWeek ? JSON.stringify(d.daysOfWeek) : null,
    d.minSpend ?? null,
    d.description,
    d.descriptionKh || d.description,
    d.badge
  );

  const created = db.prepare('SELECT * FROM promotions WHERE id = ?').get<PromoRow>(id)!;
  res.status(201).json({ promotion: mapPromo(created) });
});

promotionsRouter.patch('/:id/toggle', authenticateToken, requirePermission('pos:discount'), (req, res) => {
  const db = getDb();
  const row = db.prepare('SELECT * FROM promotions WHERE id = ?').get<PromoRow>(req.params.id);
  if (!row) {
    res.status(404).json({ error: 'Promotion not found' });
    return;
  }
  const nextActive = row.is_active ? 0 : 1;
  db.prepare('UPDATE promotions SET is_active = ? WHERE id = ?').run(nextActive, row.id);
  const updated = db.prepare('SELECT * FROM promotions WHERE id = ?').get<PromoRow>(row.id)!;
  res.json({ promotion: mapPromo(updated) });
});

/* =========================================================
 * 5. KITCHEN / BARISTA BROADCASTS
 * =======================================================*/
interface BroadcastRow {
  id: string;
  message_kh: string;
  message_en: string;
  priority: 'NORMAL' | 'URGENT';
  author: string;
  created_at: string;
  is_active: number;
}

const mapBroadcast = (b: BroadcastRow) => ({
  id: b.id,
  messageKh: b.message_kh,
  messageEn: b.message_en,
  priority: b.priority,
  author: b.author,
  createdAt: b.created_at,
  isActive: Boolean(b.is_active),
});

broadcastsRouter.get('/', authenticateToken, (_req, res) => {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM broadcasts ORDER BY created_at DESC LIMIT 30').all<BroadcastRow>();
  res.json({ broadcasts: rows.map(mapBroadcast) });
});

broadcastsRouter.post('/', authenticateToken, requirePermission('pos:access'), (req: AuthRequest, res) => {
  const parsed = z
    .object({
      messageKh: z.string().trim().min(1).max(300),
      messageEn: z.string().trim().min(1).max(300),
      priority: z.enum(['NORMAL', 'URGENT']).default('NORMAL'),
    })
    .safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Broadcast message text is required' });
    return;
  }

  const db = getDb();
  const id = `bc-${crypto.randomUUID()}`;
  const now = new Date().toISOString();

  runInTransaction((tx) => {
    tx.prepare('UPDATE broadcasts SET is_active = 0').run();
    tx.prepare(`
      INSERT INTO broadcasts (id, message_kh, message_en, priority, author, created_at, is_active)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `).run(id, parsed.data.messageKh, parsed.data.messageEn, parsed.data.priority, req.user!.name, now);
  });

  const created = db.prepare('SELECT * FROM broadcasts WHERE id = ?').get<BroadcastRow>(id)!;
  res.status(201).json({ broadcast: mapBroadcast(created) });
});

broadcastsRouter.delete('/active', authenticateToken, requirePermission('pos:access'), (_req, res) => {
  const db = getDb();
  db.prepare('UPDATE broadcasts SET is_active = 0').run();
  res.json({ ok: true });
});
