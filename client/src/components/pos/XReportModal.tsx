import React, { useEffect, useState } from 'react';
import { X, Printer, CheckCircle2, AlertTriangle, ArrowRightLeft, Calculator, RefreshCw } from 'lucide-react';
import { fetchExpenses, computeTodayExpenses } from '../../services/expenseService';
import { fetchOrders, computeTodayMetricsFromOrders } from '../../services/orderService';
import { apiFetch, ApiError } from '../../services/api';
import { soundEffects } from '../../services/soundService';
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
  outgoingCashier: string;
}

export const XReportModal: React.FC<Props> = ({ onClose, outgoingCashier }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openingFloat, setOpeningFloat] = useState(0);
  const [cashSales, setCashSales] = useState(0);
  const [abaKhqrSales, setAbaKhqrSales] = useState(0);
  const [grossSales, setGrossSales] = useState(0);
  const [pettyCashExpenses, setPettyCashExpenses] = useState(0);
  const [khrRate, setKhrRate] = useState(4100);
  const [shiftLabel, setShiftLabel] = useState('Active Shift');

  const [incomingCashier, setIncomingCashier] = useState('');
  const [actualCashUSD, setActualCashUSD] = useState<string>('0.00');
  const [actualCashKHR, setActualCashKHR] = useState<string>('0');

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

      const rate = settingsRes?.settings?.khrExchangeRate || 4100;
      setKhrRate(rate);

      const activeShift = shiftRes.currentShift || shiftRes.recentShifts[0] || null;
      const shiftFloat = activeShift ? activeShift.startingFloat : 0;
      setShiftLabel(activeShift ? `${activeShift.status} (${activeShift.cashierName})` : 'No Active Shift');

      const metrics = computeTodayMetricsFromOrders(orders);
      const expensesToday = computeTodayExpenses(expenses, rate);

      setOpeningFloat(shiftFloat);
      setCashSales(metrics.cashSales);
      setAbaKhqrSales(metrics.cashlessSales);
      setGrossSales(metrics.grossSales);
      setPettyCashExpenses(expensesToday);

      const expected = Math.max(0, shiftFloat + metrics.cashSales - expensesToday);
      setActualCashUSD(expected.toFixed(2));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load shift report data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const expectedCashInDrawer = openingFloat + cashSales - pettyCashExpenses;
  const countedUSD = parseFloat(actualCashUSD) || 0;
  const countedKHRInUSD = (parseFloat(actualCashKHR) || 0) / khrRate;
  const totalCountedUSD = countedUSD + countedKHRInUSD;
  const cashDiscrepancy = totalCountedUSD - expectedCashInDrawer;

  const handlePrint = () => {
    soundEffects.playBeep();
    window.print();
  };

  const xReportNumber = `X-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-HANDOVER`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md font-sans">
      <div className="bg-stone-900 border border-amber-700/40 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 glass-panel">
        {/* Header */}
        <div className="px-6 py-4 bg-stone-950 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-600/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-100 flex items-center space-x-2">
                <span>Shift Handover Report (X-Report)</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-950/60 text-amber-400 border border-amber-700/40 font-mono">
                  របាយការណ៍ប្តូរវេន
                </span>
              </h2>
              <p className="text-xs text-stone-400">Live mid-day drawer verification • Shift: {shiftLabel}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => void loadData()}
              disabled={loading}
              className="w-8 h-8 rounded-xl bg-stone-800/80 hover:bg-stone-800 text-stone-400 hover:text-stone-100 flex items-center justify-center"
              title="Refresh"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-stone-800/80 hover:bg-stone-800 text-stone-400 hover:text-stone-100 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {error && (
          <div className="mx-6 mt-3 p-2.5 rounded-xl bg-red-950/60 border border-red-700/50 text-red-300 text-xs font-semibold">
            {error}
          </div>
        )}

        {/* Form Body */}
        <div className="p-6 max-h-[65vh] overflow-y-auto space-y-4">
          {/* Shift Cashiers Card */}
          <div className="p-4 bg-stone-950/60 border border-stone-800 rounded-2xl grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <span className="text-xs text-stone-400 block">បុគ្គលិកចេញវេន (Outgoing Cashier)</span>
              <span className="text-sm font-bold text-stone-100">{outgoingCashier}</span>
            </div>
            <div>
              <label className="text-xs text-stone-400 block mb-1">បុគ្គលិកចូលវេន (Incoming Cashier)</label>
              <input
                type="text"
                placeholder="Enter incoming cashier name..."
                value={incomingCashier}
                onChange={(e) => setIncomingCashier(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl glass-input text-xs text-stone-100 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Cash Metrics Table */}
          <div className="p-4 bg-stone-950/80 border border-stone-800 rounded-2xl space-y-2.5 text-xs">
            <div className="flex justify-between text-stone-300">
              <span>Shift Gross Sales:</span>
              <span className="font-mono font-bold text-stone-100">${grossSales.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-stone-300">
              <span>Opening Cash Float (ប្រាក់ដើមការ):</span>
              <span className="font-mono text-stone-200">+${openingFloat.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-emerald-400">
              <span>Cash Sales Collected (ប្រាក់លក់បាន):</span>
              <span className="font-mono font-bold">+${cashSales.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-blue-400">
              <span>ABA KHQR / Digital Cashless:</span>
              <span className="font-mono font-bold">${abaKhqrSales.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-red-400">
              <span>Petty Cash Expenses Paid Out:</span>
              <span className="font-mono font-bold">-${pettyCashExpenses.toFixed(2)}</span>
            </div>
            <div className="pt-2 border-t border-stone-800 flex justify-between font-bold text-sm text-amber-400">
              <span>Expected Cash in Drawer:</span>
              <span className="font-mono text-base">${expectedCashInDrawer.toFixed(2)}</span>
            </div>
          </div>

          {/* Physical Cash Counting Input */}
          <div className="p-4 bg-gradient-to-r from-amber-950/20 to-stone-950 border border-amber-600/30 rounded-2xl space-y-3">
            <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center space-x-1.5">
              <Calculator className="w-4 h-4" />
              <span>រាប់សាច់ប្រាក់ជាក់ស្តែងក្នុងថត (Physical Cash Count)</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-stone-400 block mb-1">Counted USD ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={actualCashUSD}
                  onChange={(e) => setActualCashUSD(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl glass-input text-lg font-mono font-bold text-emerald-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] text-stone-400 block mb-1">Counted KHR (៛ គិត 4,100)</label>
                <input
                  type="number"
                  step="500"
                  value={actualCashKHR}
                  onChange={(e) => setActualCashKHR(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl glass-input text-lg font-mono font-bold text-amber-400 focus:outline-none"
                />
              </div>
            </div>

            {/* Reconciliation Discrepancy Status */}
            <div className="pt-2 border-t border-stone-800/80 flex items-center justify-between text-xs">
              <span>
                Total Counted: <strong className="text-stone-100 font-mono">${totalCountedUSD.toFixed(2)}</strong>
              </span>
              <div>
                {Math.abs(cashDiscrepancy) < 0.05 ? (
                  <span className="px-2.5 py-1 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-600/40 font-bold flex items-center space-x-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>BALANCED (ត្រឹមត្រូវ)</span>
                  </span>
                ) : cashDiscrepancy > 0 ? (
                  <span className="px-2.5 py-1 rounded-full bg-blue-950 text-blue-400 border border-blue-600/40 font-bold flex items-center space-x-1">
                    <span>OVER +${cashDiscrepancy.toFixed(2)}</span>
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-full bg-red-950 text-red-400 border border-red-600/40 font-bold flex items-center space-x-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>SHORT -${Math.abs(cashDiscrepancy).toFixed(2)}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Printable 80mm ESC/POS Thermal Layout for Shift Handover */}
        <div id="thermal-receipt" className="hidden font-mono text-black p-4 text-[11px]">
          <div className="text-center pb-2 border-b border-black">
            <h2 className="text-base font-black">AURA COFFEE SHOP</h2>
            <p className="text-[10px]">BRANCH #001 - PHNOM PENH MAIN</p>
            <p className="font-bold text-xs mt-1">*** SHIFT HANDOVER X-REPORT ***</p>
            <p className="text-[9px] mt-0.5">{xReportNumber}</p>
          </div>

          <div className="py-2 border-b border-dashed border-black text-[10px] space-y-0.5">
            <div className="flex justify-between">
              <span>Date/Time:</span>
              <span>{new Date().toLocaleString('km-KH')}</span>
            </div>
            <div className="flex justify-between">
              <span>Outgoing Cashier:</span>
              <span>{outgoingCashier}</span>
            </div>
            <div className="flex justify-between">
              <span>Incoming Cashier:</span>
              <span>{incomingCashier}</span>
            </div>
          </div>

          <div className="py-2 border-b border-black text-[10px] space-y-1">
            <div className="flex justify-between font-bold">
              <span>SHIFT GROSS SALES:</span>
              <span>${grossSales.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Opening Cash Float:</span>
              <span>${openingFloat.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Cash Sales:</span>
              <span>${cashSales.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>ABA KHQR / Digital:</span>
              <span>${abaKhqrSales.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Petty Cash Paid:</span>
              <span>-${pettyCashExpenses.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-xs pt-1 border-t border-dashed border-black">
              <span>EXPECTED CASH:</span>
              <span>${expectedCashInDrawer.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold">
              <span>PHYSICAL COUNTED:</span>
              <span>${totalCountedUSD.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold">
              <span>DISCREPANCY:</span>
              <span>{cashDiscrepancy >= 0 ? `+$${cashDiscrepancy.toFixed(2)}` : `-$${Math.abs(cashDiscrepancy).toFixed(2)}`}</span>
            </div>
          </div>

          <div className="pt-4 text-center text-[10px] space-y-4">
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="border-t border-black pt-1">
                <p>Outgoing Cashier</p>
                <p className="font-bold">{outgoingCashier}</p>
              </div>
              <div className="border-t border-black pt-1">
                <p>Incoming Cashier</p>
                <p className="font-bold">{incomingCashier}</p>
              </div>
            </div>
            <p className="text-[9px] text-gray-600">Register balance handed over successfully.</p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-stone-950 border-t border-stone-800 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold transition-colors"
          >
            បិទ (Close)
          </button>

          <button
            onClick={handlePrint}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-stone-950 font-bold text-xs flex items-center space-x-2 shadow-lg shadow-amber-900/30 transition-all hover:scale-[1.02]"
          >
            <Printer className="w-4 h-4" />
            <span>ព្រីនរបាយការណ៍ប្តូរវេន (Print X-Report)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
