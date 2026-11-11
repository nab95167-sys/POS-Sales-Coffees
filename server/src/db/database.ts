import fs from 'fs';
import path from 'path';
import { DatabaseSync } from 'node:sqlite';
import { config } from '../config';

let dbInstance: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (!dbInstance) {
    if (config.databasePath !== ':memory:') {
      fs.mkdirSync(path.dirname(config.databasePath), { recursive: true });
    }
    dbInstance = new DatabaseSync(config.databasePath);
    dbInstance.exec('PRAGMA journal_mode = WAL;');
    dbInstance.exec('PRAGMA foreign_keys = ON;');
    initializeSchema(dbInstance);
  }
  return dbInstance;
}

export function closeDb(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

export function runInTransaction<T>(fn: (db: DatabaseSync) => T): T {
  const db = getDb();
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = fn(db);
    db.exec('COMMIT');
    return result;
  } catch (err) {
    try {
      db.exec('ROLLBACK');
    } catch {
      // Ignore rollback errors if transaction wasn't active
    }
    throw err;
  }
}

function initializeSchema(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS role_configs (
      role TEXT PRIMARY KEY,
      notes TEXT NOT NULL,
      permissions_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      phone TEXT DEFAULT '',
      role TEXT NOT NULL CHECK (role IN ('ADMIN', 'MANAGER', 'CASHIER', 'BARISTA')),
      shift TEXT NOT NULL DEFAULT 'Morning',
      status TEXT NOT NULL DEFAULT 'Active',
      avatar TEXT DEFAULT '',
      password_hash TEXT NOT NULL,
      pin_hash TEXT,
      custom_permissions_json TEXT,
      sales_count INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      failed_login_attempts INTEGER NOT NULL DEFAULT 0,
      locked_until INTEGER DEFAULT 0,
      failed_pin_attempts INTEGER NOT NULL DEFAULT 0,
      pin_locked_until INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at INTEGER NOT NULL,
      revoked INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS pin_override_tokens (
      id TEXT PRIMARY KEY,
      token_hash TEXT NOT NULL UNIQUE,
      authorizer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      authorizer_name TEXT NOT NULL,
      authorizer_role TEXT NOT NULL,
      purpose TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      used INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      icon TEXT DEFAULT 'Coffee',
      description TEXT DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      sku TEXT NOT NULL UNIQUE,
      barcode TEXT NOT NULL,
      category_id TEXT NOT NULL REFERENCES categories(id),
      category_name TEXT NOT NULL,
      cost_price REAL NOT NULL,
      selling_price REAL NOT NULL,
      image TEXT NOT NULL,
      is_available INTEGER NOT NULL DEFAULT 1,
      variants_json TEXT NOT NULL DEFAULT '[]',
      toppings_json TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS dining_tables (
      id TEXT PRIMARY KEY,
      table_number TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      capacity INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'AVAILABLE',
      floor_section TEXT NOT NULL DEFAULT 'Main Floor',
      current_order_id TEXT
    );

    CREATE TABLE IF NOT EXISTS ingredients (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      unit TEXT NOT NULL,
      current_stock REAL NOT NULL,
      min_stock_alert REAL NOT NULL,
      cost_per_unit REAL NOT NULL,
      last_restocked TEXT NOT NULL,
      out_of_stock_date TEXT
    );

    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT NOT NULL UNIQUE,
      email TEXT,
      loyalty_points INTEGER NOT NULL DEFAULT 0,
      tier TEXT NOT NULL DEFAULT 'Bronze',
      total_spent REAL NOT NULL DEFAULT 0,
      birthday TEXT,
      last_visit TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      order_number TEXT NOT NULL UNIQUE,
      type TEXT NOT NULL,
      status TEXT NOT NULL,
      table_id TEXT,
      table_name TEXT,
      customer_id TEXT,
      customer_name TEXT,
      user_id TEXT REFERENCES users(id),
      cashier_name TEXT NOT NULL,
      subtotal REAL NOT NULL,
      discount_amount REAL NOT NULL DEFAULT 0,
      coupon_code TEXT,
      tax_amount REAL NOT NULL DEFAULT 0,
      service_charge REAL NOT NULL DEFAULT 0,
      total_amount REAL NOT NULL,
      payment_method TEXT,
      split_payments_json TEXT,
      amount_paid REAL DEFAULT 0,
      change_amount REAL DEFAULT 0,
      transaction_id TEXT,
      is_refunded INTEGER NOT NULL DEFAULT 0,
      refund_reason TEXT,
      refunded_by TEXT,
      refunded_at TEXT,
      notes TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      cart_item_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      name TEXT NOT NULL,
      image TEXT NOT NULL,
      selected_variant_json TEXT,
      selected_toppings_json TEXT NOT NULL DEFAULT '[]',
      unit_price REAL NOT NULL,
      quantity INTEGER NOT NULL,
      item_subtotal REAL NOT NULL,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      timestamp TEXT NOT NULL,
      category TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'USD',
      description TEXT NOT NULL,
      paid_to TEXT NOT NULL,
      recorded_by TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS shifts (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id),
      cashier_name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'OPEN',
      starting_float REAL NOT NULL,
      cash_in REAL NOT NULL DEFAULT 0,
      cash_out REAL NOT NULL DEFAULT 0,
      expected_cash REAL,
      actual_cash REAL,
      discrepancy REAL,
      opened_at TEXT NOT NULL,
      closed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS promotions (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      name_kh TEXT NOT NULL,
      type TEXT NOT NULL,
      value REAL NOT NULL,
      category_ids_json TEXT,
      start_hour INTEGER,
      end_hour INTEGER,
      days_of_week_json TEXT,
      min_spend REAL,
      is_active INTEGER NOT NULL DEFAULT 1,
      description TEXT NOT NULL,
      description_kh TEXT NOT NULL,
      badge TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS broadcasts (
      id TEXT PRIMARY KEY,
      message_kh TEXT NOT NULL,
      message_en TEXT NOT NULL,
      priority TEXT NOT NULL DEFAULT 'NORMAL',
      author TEXT NOT NULL,
      created_at TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS store_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      shop_name TEXT NOT NULL,
      address TEXT NOT NULL,
      phone TEXT NOT NULL,
      tax_rate REAL NOT NULL DEFAULT 10,
      khr_exchange_rate INTEGER NOT NULL DEFAULT 4100,
      telegram_enabled INTEGER NOT NULL DEFAULT 0,
      telegram_chat_id TEXT NOT NULL DEFAULT '',
      telegram_bot_token_enc TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS security_audit_logs (
      id TEXT PRIMARY KEY,
      action TEXT NOT NULL,
      title TEXT NOT NULL,
      details TEXT NOT NULL,
      user_id TEXT,
      performed_by TEXT NOT NULL,
      authorized_by TEXT,
      ip_address TEXT,
      severity TEXT NOT NULL DEFAULT 'INFO',
      created_at TEXT NOT NULL
    );
  `);
}
