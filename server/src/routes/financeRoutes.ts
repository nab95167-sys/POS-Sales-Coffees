import { Router } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { getDb } from '../db/database';
import { authenticateToken, AuthRequest, requirePermission } from '../middlewares/auth';
import { recordSecurityAudit } from '../services/auditService';

const router = Router();

interface ExpenseRow {
  id: string;
  timestamp: string;
  category: string;
  amount: number;
  currency: 'USD' | 'KHR';
  description: string;
  paid_to: string;
  recorded_by: string;
}

interface ShiftRow {
  id: string;
  user_id: string | null;
  cashier_name: string;
  status: 'OPEN' | 'CLOSED';
  starting_float: number;
  cash_in: number;
  cash_out: number;
  expected_cash: number | null;
  actual_cash: number | null;
  discrepancy: number | null;
  opened_at: string;
  closed_at: string | null;
}

const mapExpense = (e: ExpenseRow) => ({
  id: e.id,
  timestamp: e.timestamp,
  category: e.category,
  amount: Number(e.amount),
  currency: e.currency,
  description: e.description,
  paidTo: e.paid_to,
  recordedBy: e.recorded_by,
});

const mapShift = (s: ShiftRow) => ({
  id: s.id,
  userId: s.user_id || undefined,
  cashierName: s.cashier_name,
  status: s.status,
  startingFloat: Number(s.starting_float),
  cashIn: Number(s.cash_in),
  cashOut: Number(s.cash_out),
  expectedCash: s.expected_cash !== null ? Number(s.expected_cash) : undefined,
  actualCash: s.actual_cash !== null ? Number(s.actual_cash) : undefined,
  discrepancy: s.discrepancy !== null ? Number(s.discrepancy) : undefined,
  openedAt: s.opened_at,
  closedAt: s.closed_at || undefined,
});

/* =========================================================
 * EXPENSES
 * =======================================================*/
router.get('/expenses', authenticateToken, (_req, res) => {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM expenses ORDER BY timestamp DESC LIMIT 200').all<ExpenseRow>();
  res.json({ expenses: rows.map(mapExpense) });
});

const createExpenseSchema = z.object({
  category: z.enum([
    'Ice & Water',
    'Dairy & Fresh Produce',
    'Packaging & Cups',
    'Cleaning Supplies',
    'Maintenance & Repair',
    'Staff Meal / Misc',
  ]),
  amount: z.number().positive('Expense amount must be positive').max(100000000),
  currency: z.enum(['USD', 'KHR']).default('USD'),
  description: z.string().trim().min(1).max(300),
  paidTo: z.string().trim().min(1).max(120),
});

router.post('/expenses', authenticateToken, requirePermission('pos:shift_manage'), (req: AuthRequest, res) => {
  const parsed = createExpenseSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid expense payload' });
    return;
  }

  const d = parsed.data;
  const db = getDb();
  const id = `exp-${crypto.randomUUID()}`;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO expenses (id, timestamp, category, amount, currency, description, paid_to, recorded_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, now, d.category, d.amount, d.currency, d.description, d.paidTo, req.user!.name);

  // Reflect USD equivalent in current open shift cash_out
  const usdEquivalent = d.currency === 'KHR' ? d.amount / 4100 : d.amount;
  const openShift = db.prepare(`SELECT id FROM shifts WHERE status = 'OPEN' ORDER BY opened_at DESC LIMIT 1`).get<{ id: string }>();
  if (openShift) {
    db.prepare('UPDATE shifts SET cash_out = cash_out + ? WHERE id = ?').run(
      Math.round(usdEquivalent * 100) / 100,
      openShift.id
    );
  }

  recordSecurityAudit({
    action: 'PETTY_CASH_EXPENSE',
    title: 'Petty Cash Expense Recorded',
    details: `${d.category}: ${d.currency === 'KHR' ? `៛${d.amount}` : `$${d.amount.toFixed(2)}`} paid to ${d.paidTo} (${d.description})`,
    userId: req.user!.id,
    performedBy: `${req.user!.name} (${req.user!.role})`,
    ipAddress: req.ip,
    severity: 'INFO',
  });

  const created = db.prepare('SELECT * FROM expenses WHERE id = ?').get<ExpenseRow>(id)!;
  res.status(201).json({ expense: mapExpense(created) });
});

router.delete('/expenses/:id', authenticateToken, requirePermission('reports:view'), (req: AuthRequest, res) => {
  const db = getDb();
  const row = db.prepare('SELECT * FROM expenses WHERE id = ?').get<ExpenseRow>(req.params.id);
  if (!row) {
    res.status(404).json({ error: 'Expense not found' });
    return;
  }
  db.prepare('DELETE FROM expenses WHERE id = ?').run(row.id);

  recordSecurityAudit({
    action: 'EXPENSE_DELETED',
    title: 'Expense Entry Deleted',
    details: `Deleted ${row.category} ($${row.amount} ${row.currency})`,
    userId: req.user!.id,
    performedBy: `${req.user!.name} (${req.user!.role})`,
    ipAddress: req.ip,
    severity: 'WARNING',
  });

  res.json({ deletedId: row.id });
});

/* =========================================================
 * SHIFTS & X/Z REPORTS
 * =======================================================*/
router.get('/shifts/current', authenticateToken, (_req, res) => {
  const db = getDb();
  const current = db.prepare(`SELECT * FROM shifts WHERE status = 'OPEN' ORDER BY opened_at DESC LIMIT 1`).get<ShiftRow>();
  const history = db.prepare(`SELECT * FROM shifts ORDER BY opened_at DESC LIMIT 20`).all<ShiftRow>();
  res.json({
    currentShift: current ? mapShift(current) : null,
    recentShifts: history.map(mapShift),
  });
});

router.post('/shifts/open', authenticateToken, requirePermission('pos:shift_manage'), (req: AuthRequest, res) => {
  const parsed = z.object({ startingFloat: z.number().min(0).max(50000) }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Valid starting cash float is required' });
    return;
  }

  const db = getDb();
  const existingOpen = db.prepare(`SELECT id FROM shifts WHERE status = 'OPEN'`).get<{ id: string }>();
  if (existingOpen) {
    res.status(409).json({ error: 'A register shift is already open. Close it before opening a new one.' });
    return;
  }

  const id = `shift-${crypto.randomUUID()}`;
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO shifts (id, user_id, cashier_name, status, starting_float, cash_in, cash_out, opened_at)
    VALUES (?, ?, ?, 'OPEN', ?, 0, 0, ?)
  `).run(id, req.user!.id, req.user!.name, parsed.data.startingFloat, now);

  const created = db.prepare('SELECT * FROM shifts WHERE id = ?').get<ShiftRow>(id)!;
  res.status(201).json({ shift: mapShift(created) });
});

router.post('/shifts/close', authenticateToken, requirePermission('pos:shift_manage'), (req: AuthRequest, res) => {
  const parsed = z.object({ actualCash: z.number().min(0).max(100000) }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Valid counted actual cash amount is required' });
    return;
  }

  const db = getDb();
  const openShift = db.prepare(`SELECT * FROM shifts WHERE status = 'OPEN' ORDER BY opened_at DESC LIMIT 1`).get<ShiftRow>();
  if (!openShift) {
    res.status(404).json({ error: 'No open shift found to close' });
    return;
  }

  const expectedCash = Math.round((Number(openShift.starting_float) + Number(openShift.cash_in) - Number(openShift.cash_out)) * 100) / 100;
  const actualCash = Math.round(parsed.data.actualCash * 100) / 100;
  const discrepancy = Math.round((actualCash - expectedCash) * 100) / 100;
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE shifts SET
      status = 'CLOSED',
      expected_cash = ?,
      actual_cash = ?,
      discrepancy = ?,
      closed_at = ?
    WHERE id = ?
  `).run(expectedCash, actualCash, discrepancy, now, openShift.id);

  recordSecurityAudit({
    action: 'SHIFT_CLOSED_Z_REPORT',
    title: 'Register Shift Closed (Z-Report)',
    details: `Expected $${expectedCash.toFixed(2)}, Actual $${actualCash.toFixed(2)}, Discrepancy $${discrepancy.toFixed(2)}`,
    userId: req.user!.id,
    performedBy: `${req.user!.name} (${req.user!.role})`,
    ipAddress: req.ip,
    severity: Math.abs(discrepancy) > 5 ? 'WARNING' : 'INFO',
  });

  const closed = db.prepare('SELECT * FROM shifts WHERE id = ?').get<ShiftRow>(openShift.id)!;
  res.json({ shift: mapShift(closed) });
});

/* =========================================================
 * REPORTS SUMMARY (Live DB aggregation)
 * =======================================================*/
router.get('/reports/summary', authenticateToken, requirePermission('reports:view'), (_req, res) => {
  const db = getDb();
  const todayStr = new Date().toISOString().slice(0, 10);

  const orders = db
    .prepare(
      `SELECT subtotal, discount_amount, tax_amount, total_amount, payment_method, split_payments_json, is_refunded, created_at
       FROM orders ORDER BY created_at DESC LIMIT 2000`
    )
    .all<{
      subtotal: number;
      discount_amount: number;
      tax_amount: number;
      total_amount: number;
      payment_method: string | null;
      split_payments_json: string | null;
      is_refunded: number;
      created_at: string;
    }>();

  const validOrders = orders.filter((o) => !o.is_refunded);
  const todayOrders = validOrders.filter((o) => o.created_at.startsWith(todayStr));

  let cashSales = 0;
  let cashlessSales = 0;
  for (const o of validOrders) {
    if (o.split_payments_json) {
      try {
        const splits = JSON.parse(o.split_payments_json) as Array<{ method: string; amount: number }>;
        for (const sp of splits) {
          if (sp.method === 'CASH') cashSales += Number(sp.amount);
          else cashlessSales += Number(sp.amount);
        }
        continue;
      } catch {
        // Fallback below
      }
    }
    if (o.payment_method === 'CASH') cashSales += Number(o.total_amount);
    else cashlessSales += Number(o.total_amount);
  }

  const expensesRows = db.prepare('SELECT amount, currency, timestamp FROM expenses').all<{
    amount: number;
    currency: 'USD' | 'KHR';
    timestamp: string;
  }>();
  const totalExpenses = expensesRows.reduce(
    (sum, e) => sum + (e.currency === 'KHR' ? Number(e.amount) / 4100 : Number(e.amount)),
    0
  );

  res.json({
    summary: {
      totalOrderCount: validOrders.length,
      todayOrderCount: todayOrders.length,
      grossSales: Math.round(validOrders.reduce((s, o) => s + Number(o.subtotal), 0) * 100) / 100,
      totalDiscounts: Math.round(validOrders.reduce((s, o) => s + Number(o.discount_amount), 0) * 100) / 100,
      taxCollected: Math.round(validOrders.reduce((s, o) => s + Number(o.tax_amount), 0) * 100) / 100,
      netRevenue: Math.round(validOrders.reduce((s, o) => s + Number(o.total_amount), 0) * 100) / 100,
      cashSales: Math.round(cashSales * 100) / 100,
      cashlessSales: Math.round(cashlessSales * 100) / 100,
      totalExpenses: Math.round(totalExpenses * 100) / 100,
    },
  });
});

export default router;
