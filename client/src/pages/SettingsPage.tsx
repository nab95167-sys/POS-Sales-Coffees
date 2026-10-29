import React, { useState } from 'react';
import { Settings, Store, Receipt, Printer, Save, Check, Send, Bot, HelpCircle } from 'lucide-react';
import { getTelegramConfig, saveTelegramConfig, TelegramConfig, sendTelegramSaleAlert } from '../services/telegramBotService';

export const SettingsPage: React.FC = () => {
  const [shopName, setShopName] = useState('Aura Coffee Shop');
  const [address, setAddress] = useState('Street 240, Phnom Penh, Cambodia');
  const [phone, setPhone] = useState('+855 23 999 888');
  const [taxRate, setTaxRate] = useState(10);
  const [khrExchangeRate, setKhrExchangeRate] = useState(4100);

  // Telegram Config State
  const [telegramConfig, setTelegramConfigState] = useState<TelegramConfig>(getTelegramConfig());
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = () => {
    saveTelegramConfig(telegramConfig);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleTestTelegramAlert = () => {
    sendTelegramSaleAlert({
      id: 'test-ord',
      orderNumber: 'ORD-TEST-888',
      type: 'DINE_IN',
      status: 'COMPLETED',
      cashierName: 'Sophia Chen',
      items: [
        {
          cartItemId: '1',
          productId: '1',
          name: 'Caramel Macchiato',
          image: '',
          selectedVariant: { id: 'v1', name: 'Large', priceOffset: 0.75 },
          selectedToppings: [{ id: 't1', name: 'Oat Milk', price: 0.60 }],
          unitPrice: 5.60,
          quantity: 2,
          itemSubtotal: 11.20,
        },
      ],
      subtotal: 11.20,
      discountAmount: 0,
      taxAmount: 1.12,
      serviceCharge: 0,
      totalAmount: 12.32,
      paymentMethod: 'ABA_KHQR',
      createdAt: new Date().toISOString(),
    });
  };

  return (
    <div className="space-y-6 max-w-4xl font-sans">
      {/* Header Bar */}
      <div className="flex items-center justify-between bg-stone-900/80 p-4 rounded-3xl border border-stone-800 glass-panel">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-600/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-stone-100">POS & Store Settings</h2>
            <p className="text-xs text-stone-400">Configure café metadata, taxes, Telegram alerts & receipt templates</p>
          </div>
        </div>

        <button
          onClick={handleSave}
          className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs flex items-center space-x-1.5 transition-colors shadow-lg shadow-amber-900/30"
        >
          {isSaved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          <span>{isSaved ? 'Settings Saved!' : 'Save Configuration'}</span>
        </button>
      </div>

      {/* Form sections */}
      <div className="space-y-6">
        {/* Telegram Bot Notification Alerts */}
        <div className="p-6 rounded-3xl bg-stone-900/80 border border-amber-600/40 glass-panel space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-amber-400 font-bold text-sm">
              <Bot className="w-5 h-5 text-amber-400" />
              <span>Telegram Bot Real-Time Sales Notification Alerts</span>
            </div>
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={telegramConfig.isEnabled}
                onChange={(e) => setTelegramConfigState({ ...telegramConfig, isEnabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-stone-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600 relative"></div>
            </label>
          </div>

          {/* Quick instructions box */}
          <div className="p-3.5 bg-stone-950 border border-stone-800 rounded-2xl text-xs space-y-1.5 text-stone-300">
            <div className="font-bold text-amber-400 flex items-center space-x-1">
              <HelpCircle className="w-4 h-4" />
              <span>How to connect your Telegram Bot (1 Minute Setup):</span>
            </div>
            <ol className="list-decimal pl-5 space-y-1 text-stone-400">
              <li>Open Telegram, search for <b>@BotFather</b> and type <code>/newbot</code> to get your <b>Bot Token</b>.</li>
              <li>Add your new Bot to your Telegram group/channel.</li>
              <li>Send any message in your group, then search for <b>@userinfobot</b> to get your <b>Chat ID</b> (e.g., <code>-1001234567890</code>).</li>
              <li>Paste the Bot Token & Chat ID below and click <b>Save Configuration</b>!</li>
            </ol>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-stone-400 block mb-1">Telegram Bot Token</label>
              <input
                type="text"
                value={telegramConfig.botToken}
                onChange={(e) => setTelegramConfigState({ ...telegramConfig, botToken: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl glass-input text-stone-100 text-xs font-mono focus:outline-none"
                placeholder="Paste Token from @BotFather (e.g. 7123456789:AAFx...)"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-stone-400 block mb-1">Telegram Chat ID / Group ID</label>
              <input
                type="text"
                value={telegramConfig.chatId}
                onChange={(e) => setTelegramConfigState({ ...telegramConfig, chatId: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl glass-input text-stone-100 text-xs font-mono focus:outline-none"
                placeholder="Paste Chat ID (e.g. -1001234567890)"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end space-x-3">
            <button
              onClick={handleTestTelegramAlert}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs flex items-center space-x-2 shadow-lg"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send Test Telegram Sale Alert</span>
            </button>
          </div>
        </div>

        {/* Store Metadata */}
        <div className="p-6 rounded-3xl bg-stone-900/80 border border-stone-800 glass-panel space-y-4">
          <div className="flex items-center space-x-2 text-amber-400 font-bold text-sm">
            <Store className="w-4 h-4" />
            <span>Store Profile & Information</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-stone-400 block mb-1">Café / Shop Name</label>
              <input
                type="text"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl glass-input text-stone-100 text-sm focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-stone-400 block mb-1">Contact Phone</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl glass-input text-stone-100 text-sm focus:outline-none"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-stone-400 block mb-1">Physical Address</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl glass-input text-stone-100 text-sm focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Financial & Tax Settings */}
        <div className="p-6 rounded-3xl bg-stone-900/80 border border-stone-800 glass-panel space-y-4">
          <div className="flex items-center space-x-2 text-amber-400 font-bold text-sm">
            <Receipt className="w-4 h-4" />
            <span>Tax & Exchange Rates</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-stone-400 block mb-1">VAT Tax Rate (%)</label>
              <input
                type="number"
                value={taxRate}
                onChange={(e) => setTaxRate(Number(e.target.value))}
                className="w-full px-4 py-2.5 rounded-xl glass-input text-stone-100 text-sm font-mono focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-stone-400 block mb-1">USD to KHR Exchange Rate (៛)</label>
              <input
                type="number"
                value={khrExchangeRate}
                onChange={(e) => setKhrExchangeRate(Number(e.target.value))}
                className="w-full px-4 py-2.5 rounded-xl glass-input text-stone-100 text-sm font-mono focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
