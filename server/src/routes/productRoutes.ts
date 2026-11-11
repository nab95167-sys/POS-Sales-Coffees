import { Router } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { getDb } from '../db/database';
import { authenticateToken, AuthRequest, requirePermission } from '../middlewares/auth';
import { recordSecurityAudit } from '../services/auditService';

const router = Router();

interface CategoryRow {
  id: string;
  name: string;
  slug: string;
  icon: string;
  description: string;
  sort_order: number;
}

interface ProductRow {
  id: string;
  name: string;
  description: string;
  sku: string;
  barcode: string;
  category_id: string;
  category_name: string;
  cost_price: number;
  selling_price: number;
  image: string;
  is_available: number;
  variants_json: string;
  toppings_json: string;
  created_at: string;
  updated_at: string;
}

function mapProduct(row: ProductRow) {
  let variants = [];
  let toppings = [];
  try {
    variants = JSON.parse(row.variants_json || '[]');
  } catch {
    variants = [];
  }
  try {
    toppings = JSON.parse(row.toppings_json || '[]');
  } catch {
    toppings = [];
  }

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    sku: row.sku,
    barcode: row.barcode,
    categoryId: row.category_id,
    categoryName: row.category_name,
    costPrice: Number(row.cost_price),
    sellingPrice: Number(row.selling_price),
    image: row.image,
    isAvailable: Boolean(row.is_available),
    variants,
    toppings,
  };
}

const variantSchema = z.object({
  id: z.string().min(1).max(64),
  name: z.enum(['Small', 'Medium', 'Large']),
  priceOffset: z.number().min(-100).max(500),
});

const toppingSchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().min(1).max(100),
  price: z.number().min(0).max(500),
});

const productPayloadSchema = z.object({
  name: z.string().trim().min(1).max(150),
  description: z.string().trim().max(500).default(''),
  sku: z.string().trim().min(1).max(60),
  barcode: z.string().trim().min(1).max(80),
  categoryId: z.string().trim().min(1).max(64),
  costPrice: z.number().min(0).max(10000),
  sellingPrice: z.number().min(0).max(10000),
  image: z.string().trim().min(1).max(500).default(
    'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=600&q=80'
  ),
  isAvailable: z.boolean().default(true),
  variants: z.array(variantSchema).default([]),
  toppings: z.array(toppingSchema).default([]),
});

router.get('/categories', authenticateToken, (_req, res) => {
  const db = getDb();
  const rows = db
    .prepare('SELECT id, name, slug, icon, description, sort_order FROM categories ORDER BY sort_order ASC, name ASC')
    .all<CategoryRow>();
  res.json({
    categories: rows.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      icon: c.icon,
      description: c.description,
    })),
  });
});

router.get('/', authenticateToken, (_req, res) => {
  const db = getDb();
  const catRows = db
    .prepare('SELECT id, name, slug, icon, description, sort_order FROM categories ORDER BY sort_order ASC, name ASC')
    .all<CategoryRow>();
  const prodRows = db
    .prepare('SELECT * FROM products ORDER BY category_id ASC, name ASC')
    .all<ProductRow>();

  res.json({
    categories: catRows.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      icon: c.icon,
      description: c.description,
    })),
    products: prodRows.map(mapProduct),
  });
});

router.post('/', authenticateToken, requirePermission('inventory:edit'), (req: AuthRequest, res) => {
  const parsed = productPayloadSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid product payload' });
    return;
  }

  const data = parsed.data;
  const db = getDb();

  const category = db
    .prepare('SELECT id, name FROM categories WHERE id = ?')
    .get<{ id: string; name: string }>(data.categoryId);
  if (!category) {
    res.status(400).json({ error: 'Selected category does not exist' });
    return;
  }

  const dupSku = db.prepare('SELECT id FROM products WHERE sku = ?').get(data.sku);
  if (dupSku) {
    res.status(409).json({ error: `SKU '${data.sku}' is already in use` });
    return;
  }

  const id = `prod-${crypto.randomUUID()}`;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO products (
      id, name, description, sku, barcode, category_id, category_name,
      cost_price, selling_price, image, is_available, variants_json, toppings_json,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    data.name,
    data.description,
    data.sku,
    data.barcode,
    category.id,
    category.name,
    data.costPrice,
    data.sellingPrice,
    data.image,
    data.isAvailable ? 1 : 0,
    JSON.stringify(data.variants),
    JSON.stringify(data.toppings),
    now,
    now
  );

  recordSecurityAudit({
    action: 'PRODUCT_CREATED',
    title: 'Catalog Product Created',
    details: `Created '${data.name}' (SKU: ${data.sku}) at $${data.sellingPrice.toFixed(2)}`,
    userId: req.user!.id,
    performedBy: `${req.user!.name} (${req.user!.role})`,
    ipAddress: req.ip,
    severity: 'INFO',
  });

  const created = db.prepare('SELECT * FROM products WHERE id = ?').get<ProductRow>(id)!;
  res.status(201).json({ product: mapProduct(created) });
});

router.put('/:id', authenticateToken, requirePermission('inventory:edit'), (req: AuthRequest, res) => {
  const parsed = productPayloadSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid product update payload' });
    return;
  }

  const db = getDb();
  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get<ProductRow>(req.params.id);
  if (!existing) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }

  const updates = parsed.data;
  let categoryId = existing.category_id;
  let categoryName = existing.category_name;
  if (updates.categoryId && updates.categoryId !== existing.category_id) {
    const category = db
      .prepare('SELECT id, name FROM categories WHERE id = ?')
      .get<{ id: string; name: string }>(updates.categoryId);
    if (!category) {
      res.status(400).json({ error: 'Selected category does not exist' });
      return;
    }
    categoryId = category.id;
    categoryName = category.name;
  }

  if (updates.sku && updates.sku !== existing.sku) {
    const dupSku = db.prepare('SELECT id FROM products WHERE sku = ? AND id != ?').get(updates.sku, existing.id);
    if (dupSku) {
      res.status(409).json({ error: `SKU '${updates.sku}' is already in use` });
      return;
    }
  }

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE products SET
      name = ?, description = ?, sku = ?, barcode = ?,
      category_id = ?, category_name = ?, cost_price = ?, selling_price = ?,
      image = ?, is_available = ?, variants_json = ?, toppings_json = ?,
      updated_at = ?
    WHERE id = ?
  `).run(
    updates.name ?? existing.name,
    updates.description ?? existing.description,
    updates.sku ?? existing.sku,
    updates.barcode ?? existing.barcode,
    categoryId,
    categoryName,
    updates.costPrice ?? existing.cost_price,
    updates.sellingPrice ?? existing.selling_price,
    updates.image ?? existing.image,
    updates.isAvailable !== undefined ? (updates.isAvailable ? 1 : 0) : existing.is_available,
    updates.variants !== undefined ? JSON.stringify(updates.variants) : existing.variants_json,
    updates.toppings !== undefined ? JSON.stringify(updates.toppings) : existing.toppings_json,
    now,
    existing.id
  );

  const updated = db.prepare('SELECT * FROM products WHERE id = ?').get<ProductRow>(existing.id)!;
  res.json({ product: mapProduct(updated) });
});

router.delete('/:id', authenticateToken, requirePermission('inventory:edit'), (req: AuthRequest, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT id, name, sku FROM products WHERE id = ?').get<{ id: string; name: string; sku: string }>(req.params.id);
  if (!existing) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }

  db.prepare('DELETE FROM products WHERE id = ?').run(existing.id);

  recordSecurityAudit({
    action: 'PRODUCT_DELETED',
    title: 'Catalog Product Deleted',
    details: `Removed '${existing.name}' (SKU: ${existing.sku}) from catalog`,
    userId: req.user!.id,
    performedBy: `${req.user!.name} (${req.user!.role})`,
    ipAddress: req.ip,
    severity: 'WARNING',
  });

  res.json({ deletedId: existing.id });
});

export default router;
