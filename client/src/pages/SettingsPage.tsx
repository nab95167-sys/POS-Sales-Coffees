import React, { useState, useEffect } from 'react';
import { Settings, Store, Receipt, Save, Check, Send, Bot, HelpCircle, Lock, Trash2, AlertTriangle } from 'lucide-react';
import { apiFetch } from '../services/api';
import { sendTelegramTestAlert, showToastNotification } from '../services/telegramBotService';
import { StoreSettings } from '../types';

export const SettingsPage: React.FC = () => {
  const [shopName, setShopName] = useState('Aura Coffee Shop');
  const [address, setAddress] = useState('Street 240, Phnom Penh, Cambodia');
  const [phone, setPhone] = useState('+855 23 999 888');
  const [taxRate, setTaxRate] = useState(10);
  const [khrExchangeRate, setKhrExchangeRate] = useState(4100);

  // Server-encrypted Telegram config
  const [telegramEnabled, setTelegramEnabled] = useState(false);
  const [telegramChatId, setTelegramChatId] = useState('');
  const [newBotToken, setNewBotToken] = useState('');
  const [hasSavedToken, setHasSavedToken] = useState(false);
  const [botTokenMasked, setBotTokenMasked] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await apiFetch<{ settings: StoreSettings }>('/api/v1/settings');
        if (!active) return;
        const s = res.settings;
        setShopName(s.shopName);
        setAddress(s.address);
        setPhone(s.phone);
        setTaxRate(s.taxRate);
        setKhrExchangeRate(s.khrExchangeRate);
        setTelegramEnabled(Boolean(s.telegramEnabled));
        setTelegramChatId(s.telegramChatId || '');
        setHasSavedToken(Boolean(s.hasTelegramBotToken));
        setBotTokenMasked(s.botTokenMasked || '');
      } catch (err) {
        if (active) {
          setErrorMsg(err instanceof Error ? err.message : 'Failed to load settings');
        }
      } finally {
        if (active) setIsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const handleSave = async () => {
    setErrorMsg('');
    setIsSaving(true);
    try {
      const payload: Record<string, unknown> = {
        shopName,
        address,
        phone,
        taxRate: Number(taxRate),
        khrExchangeRate: Math.round(Number(khrExchangeRate)),
        telegramEnabled,
        telegramChatId,
      };
      if (newBotToken.trim()) {
        payload.telegramBotToken = newBotToken.trim();
      }
      const res = await apiFetch<{ settings: StoreSettings }>('/api/v1/settings', {
        method: 'PUT',
        body: payload,
      });
      setHasSavedToken(Boolean(res.settings.hasTelegramBotToken));
      setBotTokenMasked(res.settings.botTokenMasked || '');
      setNewBotToken('');
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2500);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to update settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearToken = async () => {
    setErrorMsg('');
    try {
      const res = await apiFetch<{ settings: StoreSettings }>('/api/v1/settings', {
        method: 'PUT',
        body: { clearTelegramBotToken: true },
      });
      setHasSavedToken(Boolean(res.settings.hasTelegramBotToken));
      setBotTokenMasked('');
      setNewBotToken('');
      showToastNotification('Cleared saved Telegram Bot Token from encrypted vault.');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to clear token');
    }
  };

  const handleTestTelegramAlert = async () => {
    setErrorMsg('');
    try {
      await sendTelegramTestAlert();
      showToastNotification('Telegram Bot test alert sent securely from server!');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Telegram test failed');
    }
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
            <p className="text-xs text-stone-400">Encrypted store secrets, authoritative tax/exchange rates & Telegram bot</p>
          </div>
        </div>

        <button
          onClick={() => void handleSave()}
          disabled={isLoading || isSaving}
          className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-60 text-stone-950 font-bold text-xs flex items-center space-x-1.5 transition-colors shadow-lg shadow-amber-900/30"
        >
          {isSaved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          <span>{isSaving ? 'Saving...' : isSaved ? 'Settings Saved!' : 'Save Configuration'}</span>
        </button>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-2xl bg-red-950/60 border border-red-500/50 text-red-300 text-xs flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <span className="font-semibold">{errorMsg}</span>
        </div>
      )}

      {/* Form sections */}
      <div className="space-y-6">
        {/* Telegram Bot Notification Alerts */}
        <div className="p-6 rounded-3xl bg-stone-900/80 border border-amber-600/40 glass-panel space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-amber-400 font-bold text-sm">
              <Bot className="w-5 h-5 text-amber-400" />
              <span>Telegram Bot Server-Side Sales Alerts</span>
              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[10px] text-emerald-300 font-mono">
                <Lock className="w-3 h-3" />
                <span>AES-256-GCM Encrypted</span>
              </span>
            </div>
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={telegramEnabled}
                onChange={(e) => setTelegramEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-stone-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600 relative" />
            </label>
          </div>

          <div className="p-3.5 bg-stone-950 border border-stone-800 rounded-2xl text-xs space-y-1.5 text-stone-300">
            <div className="font-bold text-amber-400 flex items-center space-x-1">
              <HelpCircle className="w-4 h-4" />
              <span>Server Vault Security:</span>
            </div>
            <p className="text-stone-400">
              Your Telegram Bot Token from <b>@BotFather</b> is encrypted at rest on the backend with AES-256-GCM and is never exposed back to the browser. All Telegram dispatches execute server-side upon checkout.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-stone-400">
                  {hasSavedToken ? `Replace Bot Token (Saved: ${botTokenMasked})` : 'Telegram Bot Token'}
                </label>
                {hasSavedToken && (
                  <button
                    type="button"
                    onClick={() => void handleClearToken()}
                    className="text-[10px] text-red-400 hover:text-red-300 font-bold flex items-center space-x-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Clear Token</span>
                  </button>
                )}
              </div>
              <input
                type="password"
                autoComplete="off"
                value={newBotToken}
                onChange={(e) => setNewBotToken(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl glass-input text-stone-100 text-xs font-mono focus:outline-none"
                placeholder={
                  hasSavedToken
                    ? `Encrypted (${botTokenMasked}) — leave blank to keep`
                    : 'Paste Token from @BotFather'
                }
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-stone-400 block mb-1">Telegram Chat ID / Group ID</label>
              <input
                type="text"
                value={telegramChatId}
                onChange={(e) => setTelegramChatId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl glass-input text-stone-100 text-xs font-mono focus:outline-none"
                placeholder="Paste Chat ID (e.g. -1001234567890)"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => void handleTestTelegramAlert()}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs flex items-center space-x-2 shadow-lg"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send Test Telegram Alert</span>
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
            <span>Authoritative Tax & Exchange Rates</span>
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
