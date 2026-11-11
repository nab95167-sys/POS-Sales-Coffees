import { Router } from 'express';
import { z } from 'zod';
import { getDb } from '../db/database';
import { authenticateToken, AuthRequest, requirePermission } from '../middlewares/auth';
import { recordSecurityAudit } from '../services/auditService';
import { dispatchTelegramText } from '../services/telegramService';
import { decryptSecret, encryptSecret, maskSecret } from '../utils/crypto';

const router = Router();

interface SettingsRow {
  id: number;
  shop_name: string;
  address: string;
  phone: string;
  tax_rate: number;
  khr_exchange_rate: number;
  telegram_enabled: number;
  telegram_chat_id: string;
  telegram_bot_token_enc: string;
  updated_at: string;
}

router.get('/', authenticateToken, (req: AuthRequest, res) => {
  const db = getDb();
  const row = db.prepare('SELECT * FROM store_settings WHERE id = 1').get<SettingsRow>();
  if (!row) {
    res.status(500).json({ error: 'Store settings not initialized' });
    return;
  }

  const canEditSettings = req.user!.role === 'ADMIN' || req.user!.permissions.includes('settings:edit');
  const plainToken = row.telegram_bot_token_enc ? decryptSecret(row.telegram_bot_token_enc) : '';

  res.json({
    settings: {
      shopName: row.shop_name,
      address: row.address,
      phone: row.phone,
      taxRate: Number(row.tax_rate),
      khrExchangeRate: Number(row.khr_exchange_rate),
      ...(canEditSettings
        ? {
            telegramEnabled: Boolean(row.telegram_enabled),
            telegramChatId: row.telegram_chat_id,
            hasTelegramBotToken: Boolean(plainToken),
            botTokenMasked: plainToken ? maskSecret(plainToken) : '',
          }
        : {}),
    },
  });
});

const updateSettingsSchema = z.object({
  shopName: z.string().trim().min(1).max(120).optional(),
  address: z.string().trim().min(1).max(200).optional(),
  phone: z.string().trim().min(1).max(50).optional(),
  taxRate: z.number().min(0).max(50).optional(),
  khrExchangeRate: z.number().int().min(3000).max(6000).optional(),
  telegramEnabled: z.boolean().optional(),
  telegramChatId: z.string().trim().max(80).optional(),
  telegramBotToken: z.string().trim().max(256).optional(),
  clearTelegramBotToken: z.boolean().optional(),
});

router.put('/', authenticateToken, requirePermission('settings:edit'), (req: AuthRequest, res) => {
  const parsed = updateSettingsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid settings payload' });
    return;
  }

  const d = parsed.data;
  const db = getDb();
  const existing = db.prepare('SELECT * FROM store_settings WHERE id = 1').get<SettingsRow>();
  if (!existing) {
    res.status(500).json({ error: 'Store settings row missing' });
    return;
  }

  let nextEncToken = existing.telegram_bot_token_enc;
  if (d.clearTelegramBotToken) {
    nextEncToken = '';
  } else if (d.telegramBotToken && d.telegramBotToken.trim() !== '') {
    nextEncToken = encryptSecret(d.telegramBotToken.trim());
  }

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE store_settings SET
      shop_name = ?,
      address = ?,
      phone = ?,
      tax_rate = ?,
      khr_exchange_rate = ?,
      telegram_enabled = ?,
      telegram_chat_id = ?,
      telegram_bot_token_enc = ?,
      updated_at = ?
    WHERE id = 1
  `).run(
    d.shopName ?? existing.shop_name,
    d.address ?? existing.address,
    d.phone ?? existing.phone,
    d.taxRate ?? existing.tax_rate,
    d.khrExchangeRate ?? existing.khr_exchange_rate,
    d.telegramEnabled !== undefined ? (d.telegramEnabled ? 1 : 0) : existing.telegram_enabled,
    d.telegramChatId ?? existing.telegram_chat_id,
    nextEncToken,
    now
  );

  recordSecurityAudit({
    action: 'SETTINGS_UPDATED',
    title: 'Store & Security Settings Updated',
    details: `Updated store configuration${d.telegramBotToken ? ' (Telegram Bot Token rotated/encrypted)' : ''}`,
    userId: req.user!.id,
    performedBy: `${req.user!.name} (${req.user!.role})`,
    ipAddress: req.ip,
    severity: 'WARNING',
  });

  const updated = db.prepare('SELECT * FROM store_settings WHERE id = 1').get<SettingsRow>()!;
  const plainToken = updated.telegram_bot_token_enc ? decryptSecret(updated.telegram_bot_token_enc) : '';

  res.json({
    settings: {
      shopName: updated.shop_name,
      address: updated.address,
      phone: updated.phone,
      taxRate: Number(updated.tax_rate),
      khrExchangeRate: Number(updated.khr_exchange_rate),
      telegramEnabled: Boolean(updated.telegram_enabled),
      telegramChatId: updated.telegram_chat_id,
      hasTelegramBotToken: Boolean(plainToken),
      botTokenMasked: plainToken ? maskSecret(plainToken) : '',
    },
  });
});

router.post('/telegram/test', authenticateToken, requirePermission('settings:edit'), async (req: AuthRequest, res) => {
  const safeName = req.user!.name
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  const result = await dispatchTelegramText(
    `🛡️ <b>AURA COFFEE POS — Security Test</b>\nVerified Telegram bot link initiated by <b>${safeName}</b> (${req.user!.role}).`
  );

  if (!result.sent) {
    res.status(400).json({ sent: false, error: result.reason || 'Failed to send Telegram test alert' });
    return;
  }
  res.json({ sent: true });
});

export default router;
