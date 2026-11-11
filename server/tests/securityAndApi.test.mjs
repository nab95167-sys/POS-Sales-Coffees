import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';

let createApp;
let closeDb;
let getDb;
let server;
let baseUrl = '';

function parseSetCookies(res) {
  const raw = typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [];
  const jar = {};
  for (const cookieStr of raw) {
    const firstPart = cookieStr.split(';')[0];
    const eqIdx = firstPart.indexOf('=');
    if (eqIdx > 0) {
      jar[firstPart.slice(0, eqIdx).trim()] = firstPart.slice(eqIdx + 1).trim();
    }
  }
  return { raw, jar };
}

function cookieHeader(jar) {
  return Object.entries(jar)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');
}

async function api(path, { method = 'GET', body, cookies } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (cookies && Object.keys(cookies).length > 0) {
    headers['Cookie'] = cookieHeader(cookies);
  }
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  return { status: res.status, json, cookies: parseSetCookies(res) };
}

before(async () => {
  process.env.DATABASE_PATH = ':memory:';
  process.env.NODE_ENV = 'test';
  ({ createApp } = await import('../dist/index.js'));
  ({ closeDb, getDb } = await import('../dist/db/database.js'));

  const app = createApp();
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve);
  });
  const addr = server.address();
  baseUrl = `http://127.0.0.1:${addr.port}`;
});

after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  closeDb();
});

test('1. Unauthenticated requests to protected endpoints fail with 401', async () => {
  for (const path of [
    '/api/v1/auth/me',
    '/api/v1/products',
    '/api/v1/orders',
    '/api/v1/staff',
    '/api/v1/settings',
    '/api/v1/security/audit-logs',
  ]) {
    const res = await api(path);
    assert.equal(res.status, 401, `Expected 401 on ${path}, got ${res.status}`);
  }
});

test('2. Admin login issues HttpOnly SameSite=Strict cookies and /auth/me hydrates full permissions', async () => {
  const login = await api('/api/v1/auth/login', {
    method: 'POST',
    body: { email: 'admin@coffeepos.com', password: 'Admin@2026!' },
  });
  assert.equal(login.status, 200);
  assert.equal(login.json.user.email, 'admin@coffeepos.com');
  assert.equal(login.json.user.role, 'ADMIN');
  assert.equal(login.json.user.password_hash, undefined);
  assert.equal(login.json.user.pin_hash, undefined);

  const accessCookie = login.cookies.raw.find((c) => c.startsWith('coffee_access_token='));
  const refreshCookie = login.cookies.raw.find((c) => c.startsWith('coffee_refresh_token='));
  assert.ok(accessCookie?.includes('HttpOnly'), 'Access cookie must be HttpOnly');
  assert.ok(accessCookie?.includes('SameSite=Strict'), 'Access cookie must be SameSite=Strict');
  assert.ok(refreshCookie?.includes('HttpOnly'), 'Refresh cookie must be HttpOnly');

  const me = await api('/api/v1/auth/me', { cookies: login.cookies.jar });
  assert.equal(me.status, 200);
  assert.ok(me.json.user.permissions.includes('settings:edit'));
  assert.ok(me.json.user.permissions.includes('staff:manage'));

  const productsRes = await api('/api/v1/products', { cookies: login.cookies.jar });
  assert.equal(productsRes.status, 200);
  assert.equal(productsRes.json.products.length, 100);
});

test('3. Refresh token rotates on use and revokes entire session on reuse attack', async () => {
  const login = await api('/api/v1/auth/login', {
    method: 'POST',
    body: { email: 'manager@coffeepos.com', password: 'Manager@2026!' },
  });
  assert.equal(login.status, 200);
  const initialCookies = { ...login.cookies.jar };

  // First refresh rotates token
  const refresh1 = await api('/api/v1/auth/refresh', {
    method: 'POST',
    cookies: initialCookies,
  });
  assert.equal(refresh1.status, 200);
  assert.ok(refresh1.cookies.jar.coffee_refresh_token);
  assert.notEqual(
    refresh1.cookies.jar.coffee_refresh_token,
    initialCookies.coffee_refresh_token,
    'Refresh token must rotate'
  );

  // Attacker replays stolen initial refresh token -> rejected + revokes newer token!
  const replay = await api('/api/v1/auth/refresh', {
    method: 'POST',
    cookies: initialCookies,
  });
  assert.equal(replay.status, 401);

  // Victim's rotated token is now also revoked for safety
  const victimNext = await api('/api/v1/auth/refresh', {
    method: 'POST',
    cookies: refresh1.cookies.jar,
  });
  assert.equal(victimNext.status, 401);
});

test('4. Brute-force account lockout locks account after 5 failed password attempts', async () => {
  for (let i = 1; i <= 4; i++) {
    const res = await api('/api/v1/auth/login', {
      method: 'POST',
      body: { email: 'barista@coffeepos.com', password: 'WrongPassword!' },
    });
    assert.equal(res.status, 401, `Attempt ${i} should be 401`);
  }

  const fifth = await api('/api/v1/auth/login', {
    method: 'POST',
    body: { email: 'barista@coffeepos.com', password: 'WrongPassword!' },
  });
  assert.equal(fifth.status, 429);

  // Even the valid password is blocked while locked out
  const lockedCorrect = await api('/api/v1/auth/login', {
    method: 'POST',
    body: { email: 'barista@coffeepos.com', password: 'Barista@2026!' },
  });
  assert.equal(lockedCorrect.status, 429);
});

test('5. RBAC denies Cashier access to Staff, Reports summary, Settings edit, Audit logs, and Role Matrix', async () => {
  const login = await api('/api/v1/auth/login', {
    method: 'POST',
    body: { email: 'cashier@coffeepos.com', password: 'Cashier@2026!' },
  });
  assert.equal(login.status, 200);
  const cookies = login.cookies.jar;

  assert.equal((await api('/api/v1/staff', { cookies })).status, 403);
  assert.equal((await api('/api/v1/security/audit-logs', { cookies })).status, 403);
  assert.equal((await api('/api/v1/finance/reports/summary', { cookies })).status, 403);
  assert.equal(
    (await api('/api/v1/settings', { method: 'PUT', body: { taxRate: 0 }, cookies })).status,
    403
  );
  assert.equal(
    (await api('/api/v1/staff/roles/CASHIER', {
      method: 'PUT',
      body: { permissions: ['settings:edit'] },
      cookies,
    })).status,
    403
  );

  // Settings GET for cashier only exposes store metadata, never masked Telegram config
  const storeMeta = await api('/api/v1/settings', { cookies });
  assert.equal(storeMeta.status, 200);
  assert.equal(storeMeta.json.settings.hasTelegramBotToken, undefined);
  assert.equal(storeMeta.json.settings.botTokenMasked, undefined);
});

test('6. Orders compute totals authoritatively server-side and enforce PIN override / Void permissions', async () => {
  const cashierLogin = await api('/api/v1/auth/login', {
    method: 'POST',
    body: { email: 'cashier@coffeepos.com', password: 'Cashier@2026!' },
  });
  const cashierCookies = cashierLogin.cookies.jar;

  const productsRes = await api('/api/v1/products', { cookies: cashierCookies });
  const macchiato = productsRes.json.products.find((p) => p.sku === 'ESP-MAC-001');
  assert.ok(macchiato, 'Caramel Macchiato seeded product missing');

  // Cashier cannot apply an unauthorized 50% manual discount without overrideToken
  const unauthorizedDiscount = await api('/api/v1/orders', {
    method: 'POST',
    cookies: cashierCookies,
    body: {
      type: 'TAKE_AWAY',
      items: [{ productId: macchiato.id, quantity: 2 }],
      discountPercent: 50,
      paymentMethod: 'CASH',
      amountPaid: 10,
    },
  });
  assert.equal(unauthorizedDiscount.status, 403);

  // Valid COFFEE20 coupon computes authoritative totals on server (ignoring any client total/price tampering)
  const validOrder = await api('/api/v1/orders', {
    method: 'POST',
    cookies: cashierCookies,
    body: {
      type: 'TAKE_AWAY',
      items: [{ productId: macchiato.id, quantity: 2, unitPrice: 0.01 }],
      couponCode: 'COFFEE20',
      paymentMethod: 'CASH',
      amountPaid: 10,
      totalAmount: 0.01,
    },
  });
  assert.equal(validOrder.status, 201);
  // 2 * $4.25 = $8.50 subtotal; -20% = -$1.70 -> $6.80 taxable; +10% VAT = $0.68 -> $7.48 total
  assert.equal(validOrder.json.order.subtotal, 8.5);
  assert.equal(validOrder.json.order.discountAmount, 1.7);
  assert.equal(validOrder.json.order.taxAmount, 0.68);
  assert.equal(validOrder.json.order.totalAmount, 7.48);
  assert.equal(validOrder.json.order.changeAmount, 2.52);

  // Cashier cannot refund without pos:void or Manager PIN override
  const noPinRefund = await api(`/api/v1/orders/${validOrder.json.order.id}/refund`, {
    method: 'POST',
    cookies: cashierCookies,
    body: { reason: 'Customer changed mind' },
  });
  assert.equal(noPinRefund.status, 403);

  // Cashier PIN ('1111') is rejected for MANAGER_OVERRIDE
  const cashierPinAttempt = await api('/api/v1/security/verify-pin', {
    method: 'POST',
    cookies: cashierCookies,
    body: {
      pin: '1111',
      purpose: 'MANAGER_OVERRIDE',
      actionTitle: 'Refund Order',
    },
  });
  assert.equal(cashierPinAttempt.status, 401);

  // Screen unlock allows Cashier's own PIN ('1111') and resets failure count
  const unlockAttempt = await api('/api/v1/security/verify-pin', {
    method: 'POST',
    cookies: cashierCookies,
    body: { pin: '1111', purpose: 'SCREEN_UNLOCK', actionTitle: 'Unlock Terminal' },
  });
  assert.equal(unlockAttempt.status, 200);

  // Manager PIN ('1234') produces single-use overrideToken
  const pinOk = await api('/api/v1/security/verify-pin', {
    method: 'POST',
    cookies: cashierCookies,
    body: {
      pin: '1234',
      purpose: 'MANAGER_OVERRIDE',
      actionTitle: `Refund ${validOrder.json.order.orderNumber}`,
    },
  });
  assert.equal(pinOk.status, 200);
  assert.ok(pinOk.json.overrideToken);

  // Refund with single-use overrideToken succeeds
  const refundOk = await api(`/api/v1/orders/${validOrder.json.order.id}/refund`, {
    method: 'POST',
    cookies: cashierCookies,
    body: {
      reason: 'Customer requested iced instead',
      overrideToken: pinOk.json.overrideToken,
    },
  });
  assert.equal(refundOk.status, 200);
  assert.equal(refundOk.json.order.isRefunded, true);

  // Reusing the same overrideToken is rejected
  const order2 = await api('/api/v1/orders', {
    method: 'POST',
    cookies: cashierCookies,
    body: {
      type: 'TAKE_AWAY',
      items: [{ productId: macchiato.id, quantity: 1 }],
      discountPercent: 25,
      overrideToken: pinOk.json.overrideToken,
      paymentMethod: 'CASH',
      amountPaid: 10,
    },
  });
  assert.equal(order2.status, 403);
});

test('7. PIN lockout locks after 5 wrong PIN attempts on staff terminal', async () => {
  const adminLogin = await api('/api/v1/auth/login', {
    method: 'POST',
    body: { email: 'admin@coffeepos.com', password: 'Admin@2026!' },
  });
  const adminCookies = adminLogin.cookies.jar;

  // Admin creates a fresh test staff account
  const newStaff = await api('/api/v1/staff', {
    method: 'POST',
    cookies: adminCookies,
    body: {
      name: 'Test Cashier',
      email: 'testcashier@coffeepos.com',
      role: 'CASHIER',
      password: 'CashierTest@2026!',
      pin: '4321',
    },
  });
  assert.equal(newStaff.status, 201);

  const testLogin = await api('/api/v1/auth/login', {
    method: 'POST',
    body: { email: 'testcashier@coffeepos.com', password: 'CashierTest@2026!' },
  });
  assert.equal(testLogin.status, 200);
  const testCookies = testLogin.cookies.jar;

  for (let i = 1; i <= 4; i++) {
    const wrong = await api('/api/v1/security/verify-pin', {
      method: 'POST',
      cookies: testCookies,
      body: { pin: '9999', purpose: 'MANAGER_OVERRIDE', actionTitle: 'Void' },
    });
    assert.equal(wrong.status, 401);
  }
  const fifthWrong = await api('/api/v1/security/verify-pin', {
    method: 'POST',
    cookies: testCookies,
    body: { pin: '9999', purpose: 'MANAGER_OVERRIDE', actionTitle: 'Void' },
  });
  assert.equal(fifthWrong.status, 429);

  // Even correct PIN is rejected while PIN pad is locked
  const lockedCorrect = await api('/api/v1/security/verify-pin', {
    method: 'POST',
    cookies: testCookies,
    body: { pin: '1234', purpose: 'MANAGER_OVERRIDE', actionTitle: 'Void' },
  });
  assert.equal(lockedCorrect.status, 429);
});

test('8. Telegram Bot Token is AES-256-GCM encrypted at rest and never exposed in plain text; Audit logs recorded', async () => {
  const adminLogin = await api('/api/v1/auth/login', {
    method: 'POST',
    body: { email: 'admin@coffeepos.com', password: 'Admin@2026!' },
  });
  const adminCookies = adminLogin.cookies.jar;

  const rawToken = '123456789:AABBCCDDEEFFGGHHIIJJKKLLMMNNOOPP';
  const putRes = await api('/api/v1/settings', {
    method: 'PUT',
    cookies: adminCookies,
    body: {
      shopName: 'Aura Coffee Flagship',
      telegramEnabled: true,
      telegramChatId: '-10099887766',
      telegramBotToken: rawToken,
    },
  });
  assert.equal(putRes.status, 200);
  assert.equal(putRes.json.settings.hasTelegramBotToken, true);
  assert.ok(putRes.json.settings.botTokenMasked.includes('••••'));
  assert.equal(JSON.stringify(putRes.json).includes(rawToken), false);

  const getRes = await api('/api/v1/settings', { cookies: adminCookies });
  assert.equal(getRes.status, 200);
  assert.equal(JSON.stringify(getRes.json).includes(rawToken), false);

  const db = getDb();
  const row = db
    .prepare('SELECT telegram_bot_token_enc FROM store_settings WHERE id = 1')
    .get();
  assert.ok(row.telegram_bot_token_enc);
  assert.notEqual(row.telegram_bot_token_enc, rawToken);
  assert.equal(row.telegram_bot_token_enc.split(':').length, 3, 'Must store iv:authTag:ciphertext');

  const audits = await api('/api/v1/security/audit-logs', { cookies: adminCookies });
  assert.equal(audits.status, 200);
  assert.ok(audits.json.logs.some((l) => l.action === 'SETTINGS_UPDATED'));
  assert.ok(audits.json.logs.some((l) => l.action === 'ORDER_REFUNDED'));
  assert.ok(audits.json.logs.some((l) => l.action === 'PIN_LOCKED'));
  assert.ok(audits.json.logs.some((l) => l.action === 'REFRESH_TOKEN_REUSE'));
});
