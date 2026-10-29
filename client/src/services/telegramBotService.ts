import { Order, Ingredient } from '../types';

export interface TelegramConfig {
  botToken: string;
  chatId: string;
  isEnabled: boolean;
}

export const getTelegramConfig = (): TelegramConfig => {
  const saved = localStorage.getItem('coffee_pos_telegram_config');
  if (saved) {
    return JSON.parse(saved);
  }
  return {
    botToken: '',
    chatId: '',
    isEnabled: true,
  };
};

export const saveTelegramConfig = (config: TelegramConfig) => {
  localStorage.setItem('coffee_pos_telegram_config', JSON.stringify(config));
};

export const sendTelegramSaleAlert = async (order: Order) => {
  const config = getTelegramConfig();
  const khrExchangeRate = 4100;
  const totalKHR = Math.round(order.totalAmount * khrExchangeRate);

  const itemsList = order.items
    .map((item) => `• <b>${item.quantity}x ${item.name}</b> ${item.selectedVariant ? `(${item.selectedVariant.name})` : ''} - $${item.itemSubtotal.toFixed(2)}`)
    .join('\n');

  const getOrderTypeKhmer = (type: string) => {
    switch (type) {
      case 'DINE_IN':
        return 'ហូបក្នុងហាង (DINE IN)';
      case 'TAKE_AWAY':
        return 'ខ្ចប់ (TAKE AWAY)';
      case 'DELIVERY':
        return 'ដឹកជញ្ជូន (DELIVERY)';
      default:
        return 'បើកបរទិញ (DRIVE THRU)';
    }
  };

  const getPaymentMethodKhmer = (method?: string) => {
    switch (method) {
      case 'ABA_KHQR':
        return 'ស្កែន ABA KHQR 🇰🇭';
      case 'CREDIT_CARD':
        return 'កាតធនាគារ (CREDIT CARD)';
      default:
        return 'ប្រាក់សុទ្ធ (CASH)';
    }
  };

  const message = `
☕ <b>សេចក្តីជូនដំណឹងការលក់ថ្មី - AURA COFFEE</b>
────────────────────────
🆔 <b>លេខវិក្កយបត្រ (Invoice #):</b> <code>${order.orderNumber}</code>
🏪 <b>សាខា (Branch):</b> Phnom Penh Main (#001)
👤 <b>បេឡាធិការ (Cashier):</b> ${order.cashierName}
📋 <b>ប្រភេទ (Type):</b> ${getOrderTypeKhmer(order.type)}

📦 <b>ទំនិញដែលបានទិញ (Items Purchased):</b>
${itemsList}

────────────────────────
💵 <b>សរុបរង (Subtotal):</b> $${order.subtotal.toFixed(2)}
${order.discountAmount > 0 ? `🏷️ <b>បញ្ចុះតម្លៃ (Discount):</b> -$${order.discountAmount.toFixed(2)}\n` : ''}🧾 <b>អាករលើតម្លៃបន្ថែម (VAT 10%):</b> $${order.taxAmount.toFixed(2)}
💰 <b>ប្រាក់ត្រូវបង់សរុប (TOTAL PAID):</b> <code>$${order.totalAmount.toFixed(2)}</code> (៛ ${totalKHR.toLocaleString()})
💳 <b>វិធីសាស្ត្រទូទាត់ (Payment):</b> ${getPaymentMethodKhmer(order.paymentMethod)}
⏰ <b>ម៉ោង (Time):</b> ${new Date(order.createdAt).toLocaleTimeString('km-KH')}
  `.trim();

  dispatchTelegramMessage(message, `📱 ផ្ញើសារជូនដំណឹងការលក់ Telegram Alert Sent!`);
};

export const sendTelegramLowStockAlert = async (ingredient: Ingredient) => {
  const depletionTimestamp = ingredient.outOfStockDate || new Date().toLocaleString('km-KH');

  const message = `
🚨 <b>ការជូនដំណឹងស្វ័យប្រវត្ត៖ វត្ថុធាតុដើមអស់ស្តុក!</b>
────────────────────────
📦 <b>វត្ថុធាតុដើមអស់ស្តុក (Depleted Ingredient):</b> <code>${ingredient.name}</code>
📉 <b>ស្តុកបច្ចុប្បន្ន (Current Stock):</b> <b>${ingredient.currentStock} ${ingredient.unit}</b>
🚨 <b>កម្រិតប្រកាសអាសន្ន (Min Threshold):</b> ${ingredient.minStockAlert} ${ingredient.unit}
📅 <b>ថ្ងៃខែឆ្នាំនិងម៉ោងអស់ស្តុក (Depletion Time):</b> <code>${depletionTimestamp}</code>
🏪 <b>សាខា (Branch):</b> Phnom Penh Main (#001)

💡 <i>ការជូនដំណឹងស្វ័យប្រវត្ត៖ វត្ថុធាតុដើមបានអស់ពីស្តុកអំឡុងពេលគិតលុយ។ សូមបញ្ជាទិញបន្ថែមភ្លាមៗ!</i>
  `.trim();

  dispatchTelegramMessage(
    message,
    `🚨 ជូនដំណឹងស្វ័យប្រវត្ត៖ ${ingredient.name} បានអស់ពីស្តុកនៅថ្ងៃទី ${depletionTimestamp}!`
  );
};

const dispatchTelegramMessage = async (message: string, toastText: string) => {
  const config = getTelegramConfig();

  if (config.isEnabled && config.botToken && config.chatId) {
    try {
      const response = await fetch(
        `https://api.telegram.org/bot${config.botToken}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: config.chatId,
            text: message,
            parse_mode: 'HTML',
          }),
        }
      );

      if (response.ok) {
        showToastNotification(toastText);
        return;
      }
    } catch (err) {
      console.warn('Telegram request error:', err);
    }
  }

  showToastNotification(toastText);
};

const showToastNotification = (text: string) => {
  const toast = document.createElement('div');
  toast.className =
    'fixed top-5 right-5 z-50 bg-stone-900 border border-amber-500 text-amber-300 text-xs font-bold px-4 py-3 rounded-2xl shadow-2xl animate-in fade-in slide-in-from-top-3 duration-300 flex items-center space-x-2';
  toast.innerHTML = `<span>${text}</span>`;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 4500);
};
