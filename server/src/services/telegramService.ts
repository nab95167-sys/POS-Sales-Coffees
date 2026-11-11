import { getDb } from '../db/database';
import { decryptSecret } from '../utils/crypto';
import { OrderDTO } from '../types';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

interface TelegramSettingsRow {
  telegram_enabled: number;
  telegram_chat_id: string;
  telegram_bot_token_enc: string;
  khr_exchange_rate: number;
}

export async function dispatchTelegramText(
  htmlMessage: string
): Promise<{ sent: boolean; reason?: string }> {
  const db = getDb();
  const row = db
    .prepare(
      'SELECT telegram_enabled, telegram_chat_id, telegram_bot_token_enc, khr_exchange_rate FROM store_settings WHERE id = 1'
    )
    .get<TelegramSettingsRow>();

  if (!row || !row.telegram_enabled) {
    return { sent: false, reason: 'Telegram notifications are disabled.' };
  }

  const botToken = decryptSecret(row.telegram_bot_token_enc);
  const chatId = row.telegram_chat_id;

  if (!botToken || !chatId) {
    return { sent: false, reason: 'Telegram bot token or chat ID is not configured.' };
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: htmlMessage,
        parse_mode: 'HTML',
      }),
    });

    if (!res.ok) {
      return { sent: false, reason: `Telegram API returned status ${res.status}` };
    }
    return { sent: true };
  } catch (err) {
    return { sent: false, reason: err instanceof Error ? err.message : 'Network error' };
  }
}

export async function sendServerSaleAlert(order: OrderDTO): Promise<{ sent: boolean; reason?: string }> {
  const db = getDb();
  const row = db
    .prepare('SELECT khr_exchange_rate FROM store_settings WHERE id = 1')
    .get<{ khr_exchange_rate: number }>();
  const khrRate = row?.khr_exchange_rate || 4100;
  const totalKHR = Math.round(order.totalAmount * khrRate);

  const itemsList = order.items
    .map(
      (item) =>
        `• <b>${item.quantity}x ${escapeHtml(item.name)}</b> ${
          item.selectedVariant ? `(${escapeHtml(item.selectedVariant.name)})` : ''
        } - $${item.itemSubtotal.toFixed(2)}`
    )
    .join('\n');

  const msg = [
    `☕ <b>សេចក្តីជូនដំណឹងការលក់ថ្មី - AURA COFFEE</b>`,
    `────────────────────────`,
    `🆔 <b>Invoice #:</b> <code>${escapeHtml(order.orderNumber)}</code>`,
    `👤 <b>Cashier:</b> ${escapeHtml(order.cashierName)}`,
    `📋 <b>Type:</b> ${escapeHtml(order.type)}`,
    ``,
    `📦 <b>Items:</b>`,
    itemsList,
    `────────────────────────`,
    `💵 <b>Subtotal:</b> $${order.subtotal.toFixed(2)}`,
    order.discountAmount > 0 ? `🏷️ <b>Discount:</b> -$${order.discountAmount.toFixed(2)}` : null,
    `🧾 <b>VAT:</b> $${order.taxAmount.toFixed(2)}`,
    `💰 <b>TOTAL PAID:</b> <code>$${order.totalAmount.toFixed(2)}</code> (៛ ${totalKHR.toLocaleString()})`,
    `💳 <b>Payment:</b> ${escapeHtml(order.paymentMethod || 'CASH')}`,
  ]
    .filter(Boolean)
    .join('\n');

  return dispatchTelegramText(msg);
}

export async function sendServerLowStockAlert(
  name: string,
  currentStock: number,
  minAlert: number,
  unit: string
): Promise<void> {
  const msg = [
    `🚨 <b>ការជូនដំណឹងស្វ័យប្រវត្ត៖ វត្ថុធាតុដើមអស់ស្តុក!</b>`,
    `────────────────────────`,
    `📦 <b>Ingredient:</b> <code>${escapeHtml(name)}</code>`,
    `📉 <b>Current Stock:</b> <b>${currentStock} ${escapeHtml(unit)}</b>`,
    `🚨 <b>Min Threshold:</b> ${minAlert} ${escapeHtml(unit)}`,
  ].join('\n');

  await dispatchTelegramText(msg);
}
