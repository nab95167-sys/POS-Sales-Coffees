import bcrypt from 'bcryptjs';
import { getDb, runInTransaction } from './database';
import { CATEGORIES_100, PRODUCTS_CATALOG_100 } from '../data/catalogSeed';
import { DEFAULT_ROLE_NOTES, DEFAULT_ROLE_PERMS, Role } from '../types';

export function seedDatabaseIfEmpty(): void {
  const db = getDb();
  const userCountRow = db.prepare('SELECT COUNT(*) as cnt FROM users').get<{ cnt: number }>();
  if (userCountRow && Number(userCountRow.cnt) > 0) {
    return;
  }

  const now = new Date().toISOString();

  runInTransaction((tx) => {
    // 1. Seed Role Configurations
    const insertRole = tx.prepare(`
      INSERT INTO role_configs (role, notes, permissions_json, updated_at)
      VALUES (?, ?, ?, ?)
    `);
    (['ADMIN', 'MANAGER', 'CASHIER', 'BARISTA'] as Role[]).forEach((role) => {
      insertRole.run(role, DEFAULT_ROLE_NOTES[role], JSON.stringify(DEFAULT_ROLE_PERMS[role]), now);
    });

    // 2. Seed Users with Bcrypt Hashed Passwords & PINs
    const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'Admin@2026!';
    const managerPassword = process.env.SEED_MANAGER_PASSWORD || 'Manager@2026!';
    const cashierPassword = process.env.SEED_CASHIER_PASSWORD || 'Cashier@2026!';
    const baristaPassword = process.env.SEED_BARISTA_PASSWORD || 'Barista@2026!';
    const managerPin = process.env.SEED_MANAGER_PIN || '1234';

    const insertUser = tx.prepare(`
      INSERT INTO users (
        id, name, email, phone, role, shift, status, avatar,
        password_hash, pin_hash, custom_permissions_json, sales_count,
        is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, 1, ?, ?)
    `);

    const seedUsers = [
      {
        id: 's-1',
        name: 'Sophia Chen',
        email: 'admin@coffeepos.com',
        phone: '+855 12 000 111',
        role: 'ADMIN',
        shift: 'Morning',
        status: 'Active',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        passwordHash: bcrypt.hashSync(adminPassword, 10),
        pinHash: bcrypt.hashSync(managerPin, 10),
        salesCount: 142,
      },
      {
        id: 's-2',
        name: 'Alexander Wright',
        email: 'manager@coffeepos.com',
        phone: '+855 12 000 222',
        role: 'MANAGER',
        shift: 'Morning',
        status: 'Active',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
        passwordHash: bcrypt.hashSync(managerPassword, 10),
        pinHash: bcrypt.hashSync(managerPin, 10),
        salesCount: 89,
      },
      {
        id: 's-3',
        name: 'Sokha Ly',
        email: 'cashier@coffeepos.com',
        phone: '+855 12 000 333',
        role: 'CASHIER',
        shift: 'Afternoon',
        status: 'Active',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
        passwordHash: bcrypt.hashSync(cashierPassword, 10),
        pinHash: bcrypt.hashSync('1111', 10),
        salesCount: 310,
      },
      {
        id: 's-4',
        name: 'Devin Vance',
        email: 'barista@coffeepos.com',
        phone: '+855 12 000 444',
        role: 'BARISTA',
        shift: 'Morning',
        status: 'Active',
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
        passwordHash: bcrypt.hashSync(baristaPassword, 10),
        pinHash: bcrypt.hashSync('2222', 10),
        salesCount: 0,
      },
    ];

    for (const u of seedUsers) {
      insertUser.run(
        u.id,
        u.name,
        u.email,
        u.phone,
        u.role,
        u.shift,
        u.status,
        u.avatar,
        u.passwordHash,
        u.pinHash,
        u.salesCount,
        now,
        now
      );
    }

    // 3. Seed Categories & Full 100-item Catalog
    const insertCat = tx.prepare(`
      INSERT INTO categories (id, name, slug, icon, description, sort_order)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    CATEGORIES_100.forEach((c, idx) => {
      insertCat.run(c.id, c.name, c.slug, c.icon || 'Coffee', c.description || '', idx);
    });

    const insertProd = tx.prepare(`
      INSERT INTO products (
        id, name, description, sku, barcode, category_id, category_name,
        cost_price, selling_price, image, is_available, variants_json, toppings_json,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const p of PRODUCTS_CATALOG_100) {
      insertProd.run(
        p.id,
        p.name,
        p.description,
        p.sku,
        p.barcode,
        p.categoryId,
        p.categoryName || 'Beverages',
        p.costPrice,
        p.sellingPrice,
        p.image,
        p.isAvailable ? 1 : 0,
        JSON.stringify(p.variants || []),
        JSON.stringify(p.toppings || []),
        now,
        now
      );
    }

    // 4. Seed Dining Tables
    const insertTable = tx.prepare(`
      INSERT INTO dining_tables (id, table_number, name, capacity, status, floor_section, current_order_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const tables = [
      ['t-1', 'T-01', 'Table 1', 2, 'OCCUPIED', 'Main Floor', 'ORD-8821'],
      ['t-2', 'T-02', 'Table 2', 4, 'AVAILABLE', 'Main Floor', null],
      ['t-3', 'T-03', 'Table 3', 2, 'RESERVED', 'Main Floor', null],
      ['t-4', 'T-04', 'Table 4', 6, 'AVAILABLE', 'Main Floor', null],
      ['t-5', 'T-05', 'Terrace 1', 4, 'AVAILABLE', 'Terrace', null],
      ['t-6', 'T-06', 'Terrace 2', 4, 'OCCUPIED', 'Terrace', 'ORD-8824'],
      ['t-7', 'T-07', 'VIP Room', 8, 'AVAILABLE', 'VIP Lounge', null],
    ];
    for (const t of tables) {
      insertTable.run(t[0] as string, t[1] as string, t[2] as string, t[3] as number, t[4] as string, t[5] as string, t[6] as string | null);
    }

    // 5. Seed Ingredients
    const insertIng = tx.prepare(`
      INSERT INTO ingredients (id, name, unit, current_stock, min_stock_alert, cost_per_unit, last_restocked)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const ings = [
      ['ing-1', 'Ethiopia Yirgacheffe Beans', 'kg', 14.5, 5.0, 18.0, '2026-08-01'],
      ['ing-2', 'Fresh Whole Milk', 'ml', 25000, 8000, 0.002, '2026-08-04'],
      ['ing-3', 'Oat Milk Barista Edition', 'ml', 4500, 5000, 0.0035, '2026-08-02'],
      ['ing-4', 'Monin Vanilla Syrup', 'ml', 3200, 1000, 0.012, '2026-07-28'],
      ['ing-5', 'Artisan Sourdough Loaves', 'pcs', 8, 10, 1.2, '2026-08-04'],
    ];
    for (const ing of ings) {
      insertIng.run(ing[0] as string, ing[1] as string, ing[2] as string, ing[3] as number, ing[4] as number, ing[5] as number, ing[6] as string);
    }

    // 6. Seed Customers
    const insertCust = tx.prepare(`
      INSERT INTO customers (id, name, phone, email, loyalty_points, tier, total_spent, birthday, last_visit, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const custs = [
      ['c-1', 'Chantara Dara', '+855 12 345 678', 'chantara@example.com', 480, 'Gold', 340.5, '1995-04-12', 'Today'],
      ['c-2', 'David Miller', '+855 98 765 432', 'david@example.com', 120, 'Silver', 98.0, null, 'Yesterday'],
      ['c-3', 'Sophea Pich', '+855 77 112 233', 'sophea@example.com', 1250, 'Platinum', 890.0, '1992-11-20', 'Today'],
      ['c-4', 'Elena Rostova', '+855 92 888 999', 'elena@example.com', 40, 'Bronze', 28.5, null, '2 days ago'],
    ];
    for (const c of custs) {
      insertCust.run(
        c[0] as string,
        c[1] as string,
        c[2] as string,
        c[3] as string,
        c[4] as number,
        c[5] as string,
        c[6] as number,
        c[7] as string | null,
        c[8] as string,
        now
      );
    }

    // 7. Seed Initial Orders & Items
    const insertOrder = tx.prepare(`
      INSERT INTO orders (
        id, order_number, type, status, table_id, table_name, user_id, cashier_name,
        subtotal, discount_amount, coupon_code, tax_amount, service_charge, total_amount,
        payment_method, amount_paid, change_amount, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertOrderItem = tx.prepare(`
      INSERT INTO order_items (
        id, order_id, cart_item_id, product_id, name, image,
        selected_variant_json, selected_toppings_json, unit_price, quantity, item_subtotal, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const eightMinAgo = new Date(Date.now() - 8 * 60 * 1000).toISOString();
    const threeMinAgo = new Date(Date.now() - 3 * 60 * 1000).toISOString();

    insertOrder.run('ord-kds-1', 'ORD-8821', 'DINE_IN', 'PREPARING', 't-1', 'Table 1', 's-3', 'Sokha Ly', 13.95, 0, null, 1.4, 0, 15.35, 'ABA_KHQR', 15.35, 0, eightMinAgo);
    insertOrderItem.run(
      'oi-1',
      'ord-kds-1',
      'item-1',
      'prod-1',
      'Caramel Macchiato',
      'https://images.unsplash.com/photo-1485808191679-5f86510681a2?auto=format&fit=crop&w=600&q=80',
      JSON.stringify({ id: 'v-lg', name: 'Large', priceOffset: 0.75 }),
      JSON.stringify([{ id: 'top-2', name: 'Oat Milk Substitute', price: 0.6 }]),
      5.6,
      2,
      11.2,
      'Less sweet, extra hot'
    );
    insertOrderItem.run(
      'oi-2',
      'ord-kds-1',
      'item-2',
      'prod-76',
      'Artisan Butter Croissant',
      'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=600&q=80',
      null,
      '[]',
      2.75,
      1,
      2.75,
      null
    );

    insertOrder.run('ord-kds-2', 'ORD-8824', 'TAKE_AWAY', 'PENDING', null, 'Take Away', 's-3', 'Sokha Ly', 5.1, 0, null, 0.51, 0, 5.61, 'CASH', 10.0, 4.39, threeMinAgo);
    insertOrderItem.run(
      'oi-3',
      'ord-kds-2',
      'item-3',
      'prod-21',
      'Nitro Velvet Cold Brew',
      'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?auto=format&fit=crop&w=600&q=80',
      JSON.stringify({ id: 'v-md', name: 'Medium', priceOffset: 0 }),
      JSON.stringify([{ id: 'top-6', name: 'Sweet Cold Foam', price: 0.85 }]),
      5.1,
      1,
      5.1,
      null
    );

    // 8. Seed Initial Expenses
    const insertExp = tx.prepare(`
      INSERT INTO expenses (id, timestamp, category, amount, currency, description, paid_to, recorded_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertExp.run('exp-1', new Date(Date.now() - 1000 * 60 * 180).toISOString(), 'Ice & Water', 4.5, 'USD', 'Morning purified tube ice delivery (3 bags)', 'Phnom Penh Pure Ice Co.', 'Sokha Ly');
    insertExp.run('exp-2', new Date(Date.now() - 1000 * 60 * 90).toISOString(), 'Dairy & Fresh Produce', 8.0, 'USD', 'Emergency fresh whole milk top-up (4L)', 'Lucky Supermarket', 'Alexander Wright');

    // 9. Seed Active Shift
    tx.prepare(`
      INSERT INTO shifts (id, user_id, cashier_name, status, starting_float, cash_in, cash_out, opened_at)
      VALUES (?, ?, ?, 'OPEN', 100.0, 0, 0, ?)
    `).run('shift-1', 's-3', 'Sokha Ly', new Date(Date.now() - 1000 * 60 * 240).toISOString());

    // 10. Seed Promotions
    const insertPromo = tx.prepare(`
      INSERT INTO promotions (
        id, name, name_kh, type, value, category_ids_json, start_hour, end_hour,
        days_of_week_json, min_spend, is_active, description, description_kh, badge
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertPromo.run(
      'promo-happy-hour',
      'Afternoon Happy Hour (20% Off)',
      'Happy Hour រសៀល បញ្ចុះតម្លៃ ២០%',
      'HAPPY_HOUR',
      20,
      JSON.stringify(['cat-1', 'cat-2', 'cat-3']),
      14,
      17,
      JSON.stringify([1, 2, 3, 4, 5]),
      null,
      1,
      '20% off all artisan coffees & cold brews between 2:00 PM and 5:00 PM Mon-Fri',
      'បញ្ចុះតម្លៃ ២០% លើកាហ្វេ និង Cold Brew ទាំងអស់ ចន្លោះម៉ោង ២:០០ ដល់ ៥:០០ រសៀល',
      '⚡ 2:00 - 5:00 PM'
    );
    insertPromo.run(
      'promo-vip-member',
      'VIP / Regular Guest Perk 10%',
      'ភ្ញៀវកិត្តិយស VIP បញ្ចុះតម្លៃ ១០%',
      'PERCENT',
      10,
      null,
      null,
      null,
      null,
      null,
      1,
      'Store-wide 10% discount for registered VIP loyalty cardholders',
      'បញ្ចុះតម្លៃ ១០% លើវិក្កយបត្រសរុបសម្រាប់សមាជិក VIP',
      '👑 VIP Loyalty'
    );

    // 11. Seed Broadcasts
    const insertBc = tx.prepare(`
      INSERT INTO broadcasts (id, message_kh, message_en, priority, author, created_at, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    insertBc.run(
      'broadcast-1',
      '☕ ស្វាគមន៍មកកាន់សាខា #001: ភេសជ្ជៈពិសេសប្រចាំថ្ងៃគឺ Salted Cream Cold Brew! សូមបុគ្គលិកត្រួតពិនិត្យស្តុកទឹកដោះគោនៅម៉ោង 3 រសៀល។',
      "Welcome to Branch #001: Today's Special is Salted Cream Cold Brew! Staff please inspect fresh dairy stock at 3:00 PM.",
      'HIGH',
      'Store General Manager',
      now,
      1
    );

    // 12. Seed Store Settings
    tx.prepare(`
      INSERT INTO store_settings (id, shop_name, address, phone, tax_rate, khr_exchange_rate, telegram_enabled, telegram_chat_id, telegram_bot_token_enc, updated_at)
      VALUES (1, 'Aura Coffee Shop', 'Street 240, Phnom Penh, Cambodia', '+855 23 999 888', 10, 4100, 0, '', '', ?)
    `).run(now);

    // 13. Seed Initial Audit Log
    tx.prepare(`
      INSERT INTO security_audit_logs (id, action, title, details, user_id, performed_by, authorized_by, ip_address, severity, created_at)
      VALUES (?, 'SYSTEM_INIT', 'Security System Initialized', 'SQLite persistence, RBAC matrix, and Bcrypt credentials initialized', 's-1', 'System Bootstrap', 'ADMIN', '127.0.0.1', 'INFO', ?)
    `).run('log-init-1', now);
  });
}
