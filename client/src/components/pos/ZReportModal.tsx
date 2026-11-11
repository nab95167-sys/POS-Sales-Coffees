import React, { useEffect, useState } from 'react';
import { X, Printer, CheckCircle2, AlertTriangle, FileSpreadsheet, Calculator, Lock } from 'lucide-react';
import { fetchExpenses, computeTodayExpenses } from '../../services/expenseService';
import { fetchOrders, computeTodayMetricsFromOrders } from '../../services/orderService';
import { apiFetch, ApiError } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { soundEffects } from '../../services/soundService';
import { showToastNotification } from '../../services/telegramBotService';
import { StoreSettings } from '../../types';

interface ShiftDTO {
  id: string;
  cashierName: string;
  status: 'OPEN' | 'CLOSED';
  startingFloat: number;
  cashIn: number;
  cashOut: number;
  openedAt: string;
}

interface Props {
  onClose: () => void;
  cashierName: string;
}

export const ZReportModal: React.FC<Props> = ({ onClose, cashierName }) => {
  const { hasGranularPermission } = useAuth();
  const canManageShift = hasGranularPermission('pos:shift_manage');

  const [loading, setLoading] = useState(true);
  const [closingShift, setClosingShift] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [activeShift, setActiveShift] = useState<ShiftDTO | null>(null);
  const [openingFloat, setOpeningFloat] = useState(0);
  const [grossSales, setGrossSales] = useState(0);
  const [discountsGiven, setDiscountsGiven] = useState(0);
  const [orderVoids, setOrderVoids] = useState(0);
  const [vatCollected, setVatCollected] = useState(0);
  const [netSales, setNetSales] = useState(0);
  const [cashSales, setCashSales] = useState(0);
  const [abaKhqrSales, setAbaKhqrSales] = useState(0);
  const [creditCardSales, setCreditCardSales] = useState(0);
  const [pettyCashExpenses, setPettyCashExpenses] = useState(0);
  const [khrRate, setKhrRate] = useState(4100);

  const [actualCashUSD, setActualCashUSD] = useState<string>('0.00');
  const [actualCashKHR, setActualCashKHR] = useState<string>('0');

  useEffect(() => {
    let cancelled = false;
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [orders, expenses, shiftRes, settingsRes] = await Promise.all([
          fetchOrders({ limit: 500 }),
          fetchExpenses(),
          apiFetch<{ currentShift: ShiftDTO | null; recentShifts: ShiftDTO[] }>('/api/v1/finance/shifts/current'),
          apiFetch<{ settings: StoreSettings }>('/api/v1/settings').catch(() => null),
        ]);

        if (cancelled) return;
        const rate = settingsRes?.settings?.khrExchangeRate || 4100;
        setKhrRate(rate);

        const open = shiftRes.currentShift;
        setActiveShift(open);
        const shiftFloat = open ? open.startingFloat : shiftRes.recentShifts[0]?.startingFloat ?? 0;

        const todayStr = new Date().toISOString().slice(0, 10);
        const refundedToday = orders
          .filter((o) => o.createdAt.startsWith(todayStr) && o.isRefunded)
          .reduce((sum, o) => sum + o.totalAmount, 0);

        const metrics = computeTodayMetricsFromOrders(orders);
        let khqrTotal = 0;
        let cardTotal = 0;
        for (const o of metrics.todayOrders) {
          if (o.splitPayments && o.splitPayments.length > 0) {
            for (const sp of o.splitPayments) {
              if (sp.method === 'CREDIT_CARD') cardTotal += sp.amount;
              else if (sp.method !== 'CASH') khqrTotal += sp.amount;
            }
          } else if (o.paymentMethod === 'CREDIT_CARD') {
            cardTotal += o.totalAmount;
          } else if (o.paymentMethod && o.paymentMethod !== 'CASH') {
            khqrTotal += o.totalAmount;
          }
        }

        const expensesToday = computeTodayExpenses(expenses, rate);

        setOpeningFloat(shiftFloat);
        setGrossSales(metrics.grossSales);
        setDiscountsGiven(metrics.discounts);
        setOrderVoids(refundedToday);
        setVatCollected(metrics.taxCollected);
        setNetSales(metrics.netSales);
        setCashSales(metrics.cashSales);
        setAbaKhqrSales(khqrTotal);
        setCreditCardSales(cardTotal);
        setPettyCashExpenses(expensesToday);

        const expected = Math.max(0, shiftFloat + metrics.cashSales - expensesToday);
        setActualCashUSD(expected.toFixed(2));
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : 'Failed to load Z-Report data');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void loadData();
    return () => {
      cancelled = true;
    };
  }, []);

  const expectedCashInDrawer = openingFloat + cashSales - pettyCashExpenses;
  const countedUSD = parseFloat(actualCashUSD) || 0;
  const countedKHRInUSD = (parseFloat(actualCashKHR) || 0) / khrRate;
  const totalCountedUSD = countedUSD + countedKHRInUSD;
  const cashDiscrepancy = totalCountedUSD - expectedCashInDrawer;

  const handleCloseShiftAndPost = async () => {
    if (!canManageShift || !activeShift) return;
    if (!confirm(`Close current shift and post Z-Report with $${totalCountedUSD.toFixed(2)} counted cash?`)) {
      return;
    }

    setClosingShift(true);
    setError(null);
    try {
      await apiFetch('/api/v1/finance/shifts/close', {
        method: 'POST',
        body: { actualCash: Number(totalCountedUSD.toFixed(2)) },
      });
      setActiveShift(null);
      window.dispatchEvent(new Event('coffee_shift_updated'));
      soundEffects.playSuccess();
      showToastNotification('Z-Report posted & shift closed cleanly.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to close shift');
    } finally {
      setClosingShift(false);
    }
  };

  const handlePrint = () => {
    soundEffects.playBeep();
    window.print();
  };

  const zReportNumber = `Z-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-001`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md font-sans">
      <div className="bg-stone-900 border border-amber-700/40 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 glass-panel">
        {/* Header */}
        <div className="px-6 py-4 bg-stone-950 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-600/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-100">End-of-Day Z-Report & Cash Drawer Closeout</h3>
              <p className="text-xs text-stone-400">
                {loading ? 'Loading live SQLite ledger...' : activeShift ? `Open Shift: ${activeShift.cashierName}` : 'No Open Shift (Preview Only)'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-800 text-stone-400 hover:text-white flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-3 p-2.5 rounded-xl bg-red-950/60 border border-red-700/50 text-red-300 text-xs font-semibold">
            {error}
          </div>
        )}

        {/* Content & Inputs */}
        <div className="p-6 max-h-[70vh] overflow-y-auto space-y-6">
          {/* Manager Cash Counting Form */}
          <div className="p-4 bg-stone-950/80 rounded-2xl border border-stone-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center space-x-1.5">
                <Calculator className="w-4 h-4" />
                <span>Physical Cash Count (រាប់លុយជាក់ស្តែងក្នុងថត)</span>
              </span>
              <span className="text-xs font-mono text-stone-400">
                Expected: <strong className="text-stone-100">${expectedCashInDrawer.toFixed(2)}</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-stone-400 block mb-1">Counted Cash (USD $)</label>
                <input
                  type="number"
                  step="0.01"
                  value={actualCashUSD}
                  onChange={(e) => setActualCashUSD(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl glass-input text-base font-mono font-bold text-emerald-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-stone-400 block mb-1">Counted Cash (KHR ៛ @ {khrRate})</label>
                <input
                  type="number"
                  step="100"
                  value={actualCashKHR}
                  onChange={(e) => setActualCashKHR(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl glass-input text-base font-mono font-bold text-amber-400 focus:outline-none"
                />
              </div>
            </div>

            {/* Discrepancy Alert */}
            <div
              className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                Math.abs(cashDiscrepancy) < 0.05
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                  : cashDiscrepancy < 0
                  ? 'bg-red-950/50 border-red-500/50 text-red-300 animate-pulse'
                  : 'bg-amber-950/40 border-amber-500/40 text-amber-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                {Math.abs(cashDiscrepancy) < 0.05 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                )}
                <span className="font-bold">
                  {Math.abs(cashDiscrepancy) < 0.05
                    ? 'Cash Drawer Perfectly Balanced (ស្មើទឹកប្រាក់ ១០០%)'
                    : cashDiscrepancy < 0
                    ? `Cash Shortage (ខ្វះសាច់ប្រាក់): -$${Math.abs(cashDiscrepancy).toFixed(2)}`
                    : `Cash Overage (លើសសាច់ប្រាក់): +$${cashDiscrepancy.toFixed(2)}`}
                </span>
              </div>
              <span className="font-mono font-bold text-sm">
                ${totalCountedUSD.toFixed(2)} / ${expectedCashInDrawer.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Printable 80mm Z-Report Statement Preview */}
          <div
            id="thermal-receipt"
            className="bg-white text-stone-900 p-6 rounded-2xl shadow-xl font-sans text-xs space-y-3 max-w-[340px] mx-auto border border-stone-300"
          >
            <div className="text-center space-y-1 pb-2 border-b border-dashed border-stone-400">
              <h2 className="text-base font-extrabold tracking-wide text-stone-950">AURA COFFEE CO., LTD.</h2>
              <p className="text-[10px] text-stone-600">សាខារាជធានីភ្នំពេញ (#001 Phnom Penh Main)</p>
              <div className="text-xs font-black uppercase tracking-wider bg-stone-900 text-white py-1 rounded my-1">
                ★ OFFICIAL Z-REPORT CLOSEOUT ★
              </div>
              <p className="text-[10px] text-stone-500 font-mono">Report ID: {zReportNumber}</p>
              <p className="text-[10px] text-stone-500">{new Date().toLocaleString('km-KH')}</p>
            </div>

            {/* Financial Overview */}
            <div className="space-y-1 text-[11px] pt-1 border-b border-dashed border-stone-400 pb-2">
              <div className="flex justify-between">
                <span>Gross Product Sales:</span>
                <span className="font-mono font-bold">${grossSales.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-red-600">
                <span>Discounts & Promotions:</span>
                <span className="font-mono">-${discountsGiven.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-red-600">
                <span>Voided Items / Returns:</span>
                <span className="font-mono">-${orderVoids.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax Collected (10% VAT):</span>
                <span className="font-mono">${vatCollected.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-black text-xs pt-1 border-t border-stone-800 text-stone-950">
                <span>NET REVENUE (ចំណូលសុទ្ធ):</span>
                <span className="font-mono font-bold text-sm">${netSales.toFixed(2)}</span>
              </div>
            </div>

            {/* Payment Method Breakdown */}
            <div className="space-y-1 text-[11px] border-b border-dashed border-stone-400 pb-2">
              <div className="font-bold text-[10px] uppercase text-stone-600 pb-0.5">Tender Breakdown</div>
              <div className="flex justify-between">
                <span>ABA KHQR Digital:</span>
                <span className="font-mono font-bold">${abaKhqrSales.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Cash Tendered (USD/KHR):</span>
                <span className="font-mono font-bold">${cashSales.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Credit / Debit Card:</span>
                <span className="font-mono font-bold">${creditCardSales.toFixed(2)}</span>
              </div>
            </div>

            {/* Drawer Cash Reconciliation */}
            <div className="space-y-1 text-[11px] border-b border-dashed border-stone-400 pb-2">
              <div className="font-bold text-[10px] uppercase text-stone-600 pb-0.5">Drawer Reconciliation</div>
              <div className="flex justify-between">
                <span>(+) Opening Shift Float:</span>
                <span className="font-mono">${openingFloat.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>(+) Cash Sales Today:</span>
                <span className="font-mono">${cashSales.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-red-600">
                <span>(-) Petty Cash Out:</span>
                <span className="font-mono">-${pettyCashExpenses.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold pt-1 border-t border-stone-300">
                <span>Expected Drawer Cash:</span>
                <span className="font-mono">${expectedCashInDrawer.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-stone-900">
                <span>Counted Actual Cash:</span>
                <span className="font-mono">${totalCountedUSD.toFixed(2)}</span>
              </div>
              <div className={`flex justify-between font-black text-xs pt-1 border-t border-stone-800 ${
                cashDiscrepancy < 0 ? 'text-red-600' : 'text-emerald-700'
              }`}>
                <span>DISCREPANCY (លើស/ខ្វះ):</span>
                <span className="font-mono">
                  {cashDiscrepancy >= 0 ? `+$${cashDiscrepancy.toFixed(2)}` : `-$${Math.abs(cashDiscrepancy).toFixed(2)}`}
                </span>
              </div>
            </div>

            {/* Signatures */}
            <div className="pt-4 space-y-6 text-[10px] text-stone-600">
              <div className="flex justify-between">
                <div>
                  <div className="border-b border-stone-400 w-32 pb-6"></div>
                  <span className="block mt-1">Cashier: {cashierName}</span>
                </div>
                <div>
                  <div className="border-b border-stone-400 w-32 pb-6"></div>
                  <span className="block mt-1">Store Manager</span>
                </div>
              </div>
              <p className="text-center text-[9px] text-stone-400">
                End of Day audit record generated for official accounting archives.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 bg-stone-950 border-t border-stone-800 flex items-center justify-between gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-bold"
          >
            Close
          </button>

          <div className="flex items-center space-x-2">
            {canManageShift && activeShift && (
              <button
                type="button"
                disabled={closingShift}
                onClick={() => void handleCloseShiftAndPost()}
                className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold text-xs flex items-center space-x-1.5 shadow-lg"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>{closingShift ? 'Closing...' : 'Close Shift & Post Z-Report'}</span>
              </button>
            )}

            <button
              onClick={handlePrint}
              className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs flex items-center space-x-2 shadow-lg shadow-amber-900/40"
            >
              <Printer className="w-4 h-4" />
              <span>Print Official Z-Report (80mm)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
