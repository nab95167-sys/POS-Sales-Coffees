import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bell,
  Building2,
  CheckCircle2,
  Coins,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  MapPin,
  Phone,
  Receipt,
  RefreshCw,
  Save,
  Send,
  Settings,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { StoreSettings } from '../types';
import { apiFetch, ApiError } from '../services/api';
import { sendTelegramTestAlert, showToastNotification } from '../services/telegramBotService';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { PageHeader } from '../components/ui/PageHeader';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';

const DEFAULT_SETTINGS: StoreSettings = {
  shopName: 'Aura Coffee House',
  address: 'St. 306, BKK1, Phnom Penh',
  phone: '+855 23 999 888',
  taxRate: 10,
  khrExchangeRate: 4100,
  telegramEnabled: false,
  telegramChatId: '',
  hasTelegramBotToken: false,
};

export const SettingsPage: React.FC = () => {
  const { t } = useLanguage();
  const { hasGranularPermission } = useAuth();
  const canEdit = hasGranularPermission('settings:edit');

  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_SETTINGS);
  const [telegramBotToken, setTelegramBotToken] = useState('');
  const [showBotToken, setShowBotToken] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingTelegram, setTestingTelegram] = useState(false);
  const [confirmClearToken, setConfirmClearToken] = useState(false);
  const [clearingToken, setClearingToken] = useState(false);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ settings: StoreSettings }>('/api/v1/settings');
      if (res.settings) {
        setSettings(res.settings);
      }
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to load system settings.';
      showToastNotification(msg, 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const handleSaveSettings = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!canEdit) {
      showToastNotification('Insufficient permissions to update store settings.', 'warning');
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        shopName: settings.shopName.trim(),
        address: settings.address.trim(),
        phone: settings.phone.trim(),
        taxRate: Number(settings.taxRate) || 0,
        khrExchangeRate: Math.max(100, Number(settings.khrExchangeRate) || 4100),
        telegramEnabled: Boolean(settings.telegramEnabled),
        telegramChatId: (settings.telegramChatId || '').trim(),
      };
      if (telegramBotToken.trim()) {
        payload.telegramBotToken = telegramBotToken.trim();
      }

      const res = await apiFetch<{ settings: StoreSettings }>('/api/v1/settings', {
        method: 'PUT',
        body: payload,
      });
      if (res.settings) {
        setSettings(res.settings);
      }
      setTelegramBotToken('');
      showToastNotification('Store & vault settings saved securely.', 'success');
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Unable to save store settings.';
      showToastNotification(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleTestTelegram = async () => {
    setTestingTelegram(true);
    try {
      const res = await sendTelegramTestAlert();
      if (res.sent) {
        showToastNotification('Test alert delivered to Telegram.', 'success');
      } else {
        showToastNotification(res.error || 'Telegram test alert failed.', 'warning');
      }
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Unable to trigger Telegram test.';
      showToastNotification(msg, 'error');
    } finally {
      setTestingTelegram(false);
    }
  };

  const handleClearBotToken = async () => {
    setClearingToken(true);
    try {
      const res = await apiFetch<{ settings: StoreSettings }>('/api/v1/settings', {
        method: 'PUT',
        body: { clearTelegramBotToken: true },
      });
      if (res.settings) {
        setSettings(res.settings);
      }
      setTelegramBotToken('');
      setConfirmClearToken(false);
      showToastNotification('Encrypted Telegram bot token cleared.', 'info');
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to clear bot token.';
      showToastNotification(msg, 'error');
    } finally {
      setClearingToken(false);
    }
  };

  const receiptPreview = useMemo(() => {
    const sampleSubtotal = 7.5;
    const taxRate = Number(settings.taxRate) || 0;
    const taxAmount = sampleSubtotal * (taxRate / 100);
    const totalUsd = sampleSubtotal + taxAmount;
    const rate = Math.max(100, Number(settings.khrExchangeRate) || 4100);
    const totalKhr = Math.round((totalUsd * rate) / 100) * 100;
    return {
      sampleSubtotal,
      taxRate,
      taxAmount,
      totalUsd,
      rate,
      totalKhr,
    };
  }, [settings.taxRate, settings.khrExchangeRate]);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20 lg:pb-8">
      <PageHeader
        icon={<Settings className="w-6 h-6" />}
        title={t('settings')}
        subtitle={t('settingsSub')}
        badge="AES-256-GCM Vault"
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => void loadSettings()}
              disabled={loading}
              className="px-3.5 py-2.5 rounded-xl bg-zinc-900/70 hover:bg-zinc-800 border border-white/10 text-zinc-200 text-xs font-semibold flex items-center gap-2 transition-all disabled:opacity-60"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
              <span className="hidden sm:inline">{t('refresh')}</span>
            </button>

            {canEdit && (
              <button
                type="button"
                onClick={() => void handleSaveSettings()}
                disabled={saving || loading}
                className="px-5 py-2.5 rounded-xl gold-gradient-bg text-zinc-950 text-xs font-black flex items-center gap-2 shadow-lg shadow-amber-500/20 hover:brightness-110 transition-all disabled:opacity-60"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : t('save')}
              </button>
            )}
          </div>
        }
      />

      {loading ? (
        <div className="glass-card rounded-2xl p-12 text-center text-zinc-400 text-sm">
          Decrypting system configuration...
        </div>
      ) : (
        <form onSubmit={handleSaveSettings} className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Configuration Column */}
          <div className="lg:col-span-7 space-y-5">
            {/* Store Metadata Card */}
            <section className="glass-card p-5 sm:p-6 rounded-2xl space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-white/10">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-300">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Store Identity & Receipt Header</h2>
                  <p className="text-xs text-zinc-400">Printed on thermal bills, cup stickers, and Z-Reports</p>
                </div>
              </div>

              <div className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Shop Name</label>
                  <input
                    type="text"
                    required
                    disabled={!canEdit}
                    value={settings.shopName}
                    onChange={(e) => setSettings((s) => ({ ...s, shopName: e.target.value }))}
                    className="glass-input w-full px-3.5 py-2.5 rounded-xl text-sm text-white disabled:opacity-60"
                    placeholder="Aura Coffee House"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Business Address</label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      required
                      disabled={!canEdit}
                      value={settings.address}
                      onChange={(e) => setSettings((s) => ({ ...s, address: e.target.value }))}
                      className="glass-input w-full pl-10 pr-3.5 py-2.5 rounded-xl text-sm text-white disabled:opacity-60"
                      placeholder="Street address & district"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Contact Phone</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      required
                      disabled={!canEdit}
                      value={settings.phone}
                      onChange={(e) => setSettings((s) => ({ ...s, phone: e.target.value }))}
                      className="glass-input w-full pl-10 pr-3.5 py-2.5 rounded-xl text-sm text-white disabled:opacity-60"
                      placeholder="+855 23 999 888"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Tax & Exchange Rate Card */}
            <section className="glass-card p-5 sm:p-6 rounded-2xl space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-white/10">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-300">
                  <Coins className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">VAT Tax & Dual-Currency Rate</h2>
                  <p className="text-xs text-zinc-400">Controls tax calculation and live USD to KHR checkout conversion</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    VAT / Sales Tax Rate (%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={50}
                    step={0.5}
                    disabled={!canEdit}
                    value={settings.taxRate}
                    onChange={(e) => setSettings((s) => ({ ...s, taxRate: Number(e.target.value) }))}
                    className="glass-input w-full px-3.5 py-2.5 rounded-xl text-sm text-white tabular-nums disabled:opacity-60"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    KHR Exchange Rate (៛ per $1 USD)
                  </label>
                  <input
                    type="number"
                    min={100}
                    max={100000}
                    step={50}
                    disabled={!canEdit}
                    value={settings.khrExchangeRate}
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, khrExchangeRate: Number(e.target.value) }))
                    }
                    className="glass-input w-full px-3.5 py-2.5 rounded-xl text-sm text-white tabular-nums disabled:opacity-60"
                  />
                </div>
              </div>
            </section>

            {/* Telegram Vault Card */}
            <section className="glass-card p-5 sm:p-6 rounded-2xl space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-300">
                    <Bell className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white">Telegram Telemetry & Encrypted Bot</h2>
                    <p className="text-xs text-zinc-400">Receive shift closures, high-value refunds, and stock alerts</p>
                  </div>
                </div>

                <label className="inline-flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    disabled={!canEdit}
                    checked={Boolean(settings.telegramEnabled)}
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, telegramEnabled: e.target.checked }))
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-zinc-800 border border-white/10 rounded-full peer peer-checked:bg-emerald-500/30 peer-checked:border-emerald-400/50 relative transition-all after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-5 after:h-5 after:rounded-full after:bg-zinc-400 peer-checked:after:bg-emerald-400 peer-checked:after:translate-x-5 after:transition-all" />
                  <span className="text-xs font-bold text-zinc-300">
                    {settings.telegramEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </label>
              </div>

              <div className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Telegram Chat / Group ID
                  </label>
                  <input
                    type="text"
                    disabled={!canEdit}
                    value={settings.telegramChatId || ''}
                    onChange={(e) => setSettings((s) => ({ ...s, telegramChatId: e.target.value }))}
                    className="glass-input w-full px-3.5 py-2.5 rounded-xl text-sm text-white font-mono disabled:opacity-60"
                    placeholder="-1001234567890"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                      Bot Token (Write-Only Encrypted Input)
                    </label>
                    {settings.hasTelegramBotToken && (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-mono font-bold">
                        Stored: {settings.botTokenMasked || '********'}
                      </span>
                    )}
                  </div>

                  <div className="relative">
                    <input
                      type={showBotToken ? 'text' : 'password'}
                      disabled={!canEdit}
                      value={telegramBotToken}
                      onChange={(e) => setTelegramBotToken(e.target.value)}
                      autoComplete="new-password"
                      className="glass-input w-full pl-3.5 pr-10 py-2.5 rounded-xl text-sm text-white font-mono disabled:opacity-60"
                      placeholder={
                        settings.hasTelegramBotToken
                          ? 'Leave blank to keep existing vault token'
                          : 'Paste Telegram BotFather token...'
                      }
                    />
                    <button
                      type="button"
                      onClick={() => setShowBotToken((v) => !v)}
                      aria-label={showBotToken ? 'Hide token' : 'Show token'}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-1"
                    >
                      {showBotToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => void handleTestTelegram()}
                    disabled={testingTelegram || !settings.hasTelegramBotToken || !settings.telegramChatId}
                    className="px-4 py-2 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-sky-300 text-xs font-bold flex items-center gap-2 transition-all disabled:opacity-45"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {testingTelegram ? 'Sending Alert...' : 'Send Test Alert'}
                  </button>

                  {canEdit && settings.hasTelegramBotToken && (
                    <button
                      type="button"
                      onClick={() => setConfirmClearToken(true)}
                      className="px-3.5 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 text-xs font-semibold flex items-center gap-1.5 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Clear Stored Token
                    </button>
                  )}
                </div>
              </div>
            </section>
          </div>

          {/* Right Live Preview & Vault Status Column */}
          <div className="lg:col-span-5 space-y-5 lg:sticky lg:top-6">
            {/* Live Receipt Preview */}
            <div className="glass-card p-5 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-amber-400" />
                  <h3 className="text-sm font-bold text-white">Live Receipt Header Preview</h3>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  80mm Thermal
                </span>
              </div>

              <div className="rounded-xl bg-zinc-950/90 border border-white/10 p-5 font-mono text-xs text-zinc-300 space-y-3">
                <div className="text-center space-y-1 border-b border-dashed border-zinc-700 pb-3">
                  <p className="text-sm font-black text-amber-300 tracking-wide uppercase">
                    {settings.shopName || 'Shop Name'}
                  </p>
                  <p className="text-[11px] text-zinc-400">{settings.address || 'Address'}</p>
                  <p className="text-[11px] text-zinc-400">Tel: {settings.phone || '—'}</p>
                </div>

                <div className="space-y-1.5 text-[11px] border-b border-dashed border-zinc-700 pb-3">
                  <div className="flex justify-between">
                    <span>2x Iced Caramel Latte (M)</span>
                    <span className="tabular-nums">$7.50</span>
                  </div>
                </div>

                <div className="space-y-1 text-[11px]">
                  <div className="flex justify-between text-zinc-400">
                    <span>Subtotal</span>
                    <span className="tabular-nums">${receiptPreview.sampleSubtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>VAT ({receiptPreview.taxRate}%)</span>
                    <span className="tabular-nums">${receiptPreview.taxAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-black text-white pt-1.5 border-t border-white/10">
                    <span>TOTAL USD</span>
                    <span className="tabular-nums text-amber-300">${receiptPreview.totalUsd.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs font-bold text-emerald-400">
                    <span>KHR ({receiptPreview.rate.toLocaleString()} ៛/$)</span>
                    <span className="tabular-nums">{receiptPreview.totalKhr.toLocaleString()} ៛</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Security Vault Status */}
            <div className="glass-card p-5 rounded-2xl space-y-3.5">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Security & Vault Telemetry</h3>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/60 border border-white/10">
                  <span className="flex items-center gap-2 text-zinc-300">
                    <Lock className="w-3.5 h-3.5 text-emerald-400" />
                    Telegram Token Vault
                  </span>
                  <span
                    className={`font-bold ${
                      settings.hasTelegramBotToken ? 'text-emerald-400' : 'text-zinc-500'
                    }`}
                  >
                    {settings.hasTelegramBotToken ? 'AES-256 Encrypted' : 'Not Configured'}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/60 border border-white/10">
                  <span className="flex items-center gap-2 text-zinc-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                    Auth Transport
                  </span>
                  <span className="font-bold text-amber-300">HttpOnly Cookie JWT</span>
                </div>
              </div>
            </div>
          </div>
        </form>
      )}

      <ConfirmDialog
        isOpen={confirmClearToken}
        title="Revoke Telegram Bot Token"
        message="This will erase the encrypted bot token stored on the server vault and disable automated Telegram notifications until a new token is saved."
        confirmLabel="Clear Token"
        cancelLabel={t('cancel')}
        variant="warning"
        busy={clearingToken}
        onConfirm={() => void handleClearBotToken()}
        onCancel={() => !clearingToken && setConfirmClearToken(false)}
      />
    </div>
  );
};
