import React, { useState } from 'react';
import {
  X, CreditCard, Banknote, QrCode, CheckCircle2, DollarSign, Wallet, ArrowRightLeft
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { PaymentMethod, Order, SplitPayment } from '../../types';

interface Props {
  order: Order;
  khrRate?: number;
  onClose: () => void;
  onPaymentComplete: (
    method: PaymentMethod,
    amountPaid: number,
    change: number,
    transactionId?: string,
    splitPayments?: SplitPayment[]
  ) => void;
}

export const PaymentModal: React.FC<Props> = ({
  order,
  khrRate = 4100,
  onClose,
  onPaymentComplete,
}) => {
  const [isSplitMode, setIsSplitMode] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('ABA_KHQR');
  const [cashTendered, setCashTendered] = useState<string>(order.totalAmount.toFixed(2));
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const [splitCashAmount, setSplitCashAmount] = useState<string>(
    order.totalAmount > 5 ? '5.00' : (order.totalAmount / 2).toFixed(2)
  );
  const [splitDigitalMethod, setSplitDigitalMethod] = useState<PaymentMethod>('ABA_KHQR');

  const tenderedAmount = parseFloat(cashTendered) || 0;
  const changeDue = Math.max(0, tenderedAmount - order.totalAmount);
  const isCashSufficient = tenderedAmount >= order.totalAmount;

  const splitCash = Math.max(0, parseFloat(splitCashAmount) || 0);
  const splitDigital = Math.max(0, Number((order.totalAmount - splitCash).toFixed(2)));

  const paymentMethods: { id: PaymentMethod; label: string; icon: React.ComponentType<{ className?: string }>; color: string }[] = [
    { id: 'ABA_KHQR', label: 'ABA KHQR', icon: QrCode, color: 'bg-red-950/60 border-red-500/60 text-red-300' },
    { id: 'CASH', label: 'Cash (USD / KHR)', icon: Banknote, color: 'bg-emerald-950/60 border-emerald-500/60 text-emerald-300' },
    { id: 'CREDIT_CARD', label: 'Credit Card', icon: CreditCard, color: 'bg-sky-950/60 border-sky-500/60 text-sky-300' },
    { id: 'BAKONG', label: 'Bakong KHQR', icon: Wallet, color: 'bg-orange-950/60 border-orange-500/60 text-orange-300' },
    { id: 'WING', label: 'Wing Bank', icon: DollarSign, color: 'bg-lime-950/60 border-lime-500/60 text-lime-300' },
    { id: 'ACLEDA', label: 'ACLEDA Mobile', icon: CreditCard, color: 'bg-indigo-950/60 border-indigo-500/60 text-indigo-300' },
  ];

  const handleProcessPayment = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setIsSuccess(true);
      setTimeout(() => {
        if (isSplitMode) {
          const splits: SplitPayment[] = [
            { method: 'CASH', amount: splitCash },
            { method: splitDigitalMethod, amount: splitDigital },
          ];
          onPaymentComplete(
            'MIXED',
            order.totalAmount,
            0,
            `SPLIT-${Math.floor(100000 + Math.random() * 900000)}`,
            splits
          );
        } else {
          onPaymentComplete(
            selectedMethod,
            selectedMethod === 'CASH' ? tenderedAmount : order.totalAmount,
            selectedMethod === 'CASH' ? changeDue : 0,
            `TXN-${Math.floor(100000 + Math.random() * 900000)}`
          );
        }
      }, 750);
    }, 650);
  };

  const currentQrAmount = isSplitMode ? splitDigital : order.totalAmount;
  const khqrPayload = `00020101021238580016A0000007700001010111ABA_COFFEE0208AURACOFF5204599953038405404${currentQrAmount.toFixed(
    2
  )}5802KH5911Aura Coffee6010Phnom Penh6304C4F2`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md font-sans">
      <div className="glass-panel border border-amber-500/35 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Sticky Header */}
        <div className="px-4 sm:px-6 py-4 bg-[#0b0c10] border-b border-white/10 flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/35 flex items-center justify-center flex-shrink-0">
              <CreditCard className="w-5 h-5 text-amber-400" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-extrabold text-zinc-100 flex items-center gap-2 flex-wrap">
                <span>Checkout Payment</span>
                {order.tableName && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-mono">
                    {order.tableName}
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-zinc-400 truncate">
                Order #{order.orderNumber} • {order.type.replace('_', ' ')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-zinc-950 p-1 rounded-xl border border-white/10 text-xs">
              <button
                type="button"
                onClick={() => setIsSplitMode(false)}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  !isSplitMode ? 'bg-amber-500 text-zinc-950 shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Standard
              </button>
              <button
                type="button"
                onClick={() => setIsSplitMode(true)}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1 ${
                  isSplitMode ? 'bg-purple-600 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <ArrowRightLeft className="w-3 h-3" />
                <span>Split</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-zinc-800/80 text-zinc-400 hover:text-white flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto">
          {isSuccess ? (
            <div className="p-10 sm:p-12 text-center space-y-4">
              <div className="w-20 h-20 rounded-full bg-emerald-500/20 border border-emerald-500 flex items-center justify-center mx-auto text-emerald-400 animate-bounce">
                <CheckCircle2 className="w-12 h-12" />
              </div>
              <h4 className="text-2xl font-extrabold text-zinc-100">Payment Successful!</h4>
              {isSplitMode ? (
                <p className="text-sm text-zinc-400">
                  Received <span className="text-emerald-400 font-bold">${splitCash.toFixed(2)} Cash</span> +{' '}
                  <span className="text-amber-400 font-bold">${splitDigital.toFixed(2)} {splitDigitalMethod.replace('_', ' ')}</span>.
                </p>
              ) : (
                <p className="text-sm text-zinc-400">
                  Received <span className="text-emerald-400 font-bold">${(selectedMethod === 'CASH' ? tenderedAmount : order.totalAmount).toFixed(2)}</span> via {selectedMethod.replace('_', ' ')}.
                </p>
              )}
              {!isSplitMode && selectedMethod === 'CASH' && changeDue > 0 && (
                <div className="p-4 bg-emerald-950/40 border border-emerald-500/40 rounded-2xl inline-block mt-2">
                  <span className="text-xs text-emerald-300 block">Change Due</span>
                  <span className="text-3xl font-extrabold text-emerald-400 font-mono tabular-nums">${changeDue.toFixed(2)}</span>
                </div>
              )}
            </div>
          ) : isSplitMode ? (
            <div className="p-4 sm:p-6 space-y-5">
              <div className="p-4 bg-purple-950/30 border border-purple-500/35 rounded-2xl flex items-center justify-between gap-4">
                <div>
                  <span className="text-[11px] text-purple-300 font-bold uppercase tracking-wider block">Total Bill Amount</span>
                  <span className="text-2xl font-black text-zinc-100 font-mono tabular-nums">${order.totalAmount.toFixed(2)}</span>
                  <span className="text-xs text-zinc-400 block font-mono">≈ ៛ {Math.round(order.totalAmount * khrRate).toLocaleString()} KHR</span>
                </div>
                <span className="text-xs font-bold text-purple-300 bg-purple-950 px-3 py-1 rounded-full border border-purple-500/40">
                  Cash + QR Hybrid
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-[#0b0c10] border border-white/10 rounded-2xl space-y-3">
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <Banknote className="w-4 h-4" />
                    <span>Cash Portion ($)</span>
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={order.totalAmount}
                    value={splitCashAmount}
                    onChange={(e) => setSplitCashAmount(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xl font-mono font-bold text-emerald-400 focus:outline-none"
                  />
                  <div className="grid grid-cols-4 gap-1.5">
                    {[1, 2, 5, 10].map((amt) => (
                      <button
                        key={`split-c-${amt}`}
                        type="button"
                        onClick={() => setSplitCashAmount(Math.min(order.totalAmount, amt).toFixed(2))}
                        className="py-1.5 bg-zinc-800/80 hover:bg-zinc-700 rounded-lg text-xs font-bold text-zinc-200 transition-colors"
                      >
                        ${amt}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-4 bg-[#0b0c10] border border-white/10 rounded-2xl space-y-3">
                  <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                    <QrCode className="w-4 h-4" />
                    <span>Digital Balance ({splitDigitalMethod.replace('_', ' ')})</span>
                  </span>
                  <div className="p-3 bg-zinc-900 border border-amber-500/30 rounded-xl flex items-baseline justify-between">
                    <span className="text-xl font-black font-mono tabular-nums text-amber-400">${splitDigital.toFixed(2)}</span>
                    <span className="text-xs font-mono text-zinc-400">≈ ៛ {Math.round(splitDigital * khrRate).toLocaleString()} KHR</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {(['ABA_KHQR', 'CREDIT_CARD', 'BAKONG'] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setSplitDigitalMethod(m)}
                        className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-colors ${
                          splitDigitalMethod === m
                            ? 'bg-amber-500 text-zinc-950 font-extrabold'
                            : 'bg-zinc-800/80 text-zinc-400 hover:bg-zinc-700'
                        }`}
                      >
                        {m.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {splitDigital > 0 && splitDigitalMethod !== 'CREDIT_CARD' && (
                <div className="p-4 bg-[#0b0c10] rounded-2xl border border-white/10 flex flex-col sm:flex-row items-center justify-center gap-4">
                  <div className="p-2.5 bg-white rounded-xl shadow-lg flex-shrink-0">
                    <QRCodeSVG value={khqrPayload} size={105} level="H" />
                  </div>
                  <div className="text-center sm:text-left space-y-1">
                    <span className="text-xs font-bold text-amber-400 block">Scan Remaining ${splitDigital.toFixed(2)}</span>
                    <p className="text-[11px] text-zinc-400 max-w-xs">
                      Exact balance: <strong>៛ {Math.round(splitDigital * khrRate).toLocaleString()} KHR</strong>.
                    </p>
                  </div>
                </div>
              )}

              <button
                type="button"
                disabled={splitCash > order.totalAmount || Math.abs(splitCash + splitDigital - order.totalAmount) > 0.01}
                onClick={handleProcessPayment}
                className="w-full py-3.5 rounded-xl font-extrabold text-sm bg-gradient-to-r from-purple-600 to-amber-500 hover:brightness-110 text-white shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isProcessing
                  ? 'Confirming Split Payment...'
                  : `Confirm Split ($${splitCash.toFixed(2)} + $${splitDigital.toFixed(2)})`}
              </button>
            </div>
          ) : (
            <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-12 gap-5">
              {/* Left Method List */}
              <div className="md:col-span-5 space-y-2.5">
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                  Payment Method
                </label>
                <div className="grid grid-cols-2 md:grid-cols-1 gap-2">
                  {paymentMethods.map((m) => {
                    const Icon = m.icon;
                    const isSelected = selectedMethod === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setSelectedMethod(m.id)}
                        className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all ${
                          isSelected
                            ? `${m.color} ring-2 ring-amber-500/40 font-bold shadow-lg`
                            : 'bg-white/[0.03] border-white/10 text-zinc-300 hover:bg-white/[0.06]'
                        }`}
                      >
                        <Icon className="w-4 h-4 flex-shrink-0" />
                        <span className="text-xs font-semibold truncate">{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right Workspace */}
              <div className="md:col-span-7 bg-[#0b0c10] border border-white/10 rounded-2xl p-4 sm:p-5 flex flex-col justify-between gap-4">
                {selectedMethod === 'CASH' ? (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center pb-3 border-b border-white/10">
                      <div>
                        <span className="text-xs text-zinc-400 block">Total Payable</span>
                        <span className="text-[11px] text-amber-400 font-mono font-bold">
                          ៛ {Math.round(order.totalAmount * khrRate).toLocaleString()} KHR
                        </span>
                      </div>
                      <span className="text-2xl font-mono font-black tabular-nums text-amber-400">
                        ${order.totalAmount.toFixed(2)}
                      </span>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="text-xs font-semibold text-zinc-300">Tendered Cash (USD)</label>
                        <button
                          type="button"
                          onClick={() => setCashTendered(order.totalAmount.toFixed(2))}
                          className="text-[11px] font-bold text-amber-400 hover:underline"
                        >
                          Exact (${order.totalAmount.toFixed(2)})
                        </button>
                      </div>
                      <input
                        type="number"
                        step="0.01"
                        value={cashTendered}
                        onChange={(e) => setCashTendered(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl glass-input text-2xl font-mono font-bold text-emerald-400 focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">USD Quick Notes</span>
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                        {[1, 5, 10, 20, 50, 100].map((amt) => (
                          <button
                            key={`usd-${amt}`}
                            type="button"
                            onClick={() => setCashTendered(amt.toFixed(2))}
                            className="py-2 bg-zinc-900 border border-white/10 rounded-xl text-xs font-bold text-zinc-200 hover:bg-amber-500 hover:text-zinc-950 transition-colors"
                          >
                            ${amt}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Khmer Riel Quick Notes</span>
                      <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                        {[
                          { khr: '10k', usd: 10000 / khrRate },
                          { khr: '20k', usd: 20000 / khrRate },
                          { khr: '40k', usd: 40000 / khrRate },
                          { khr: '50k', usd: 50000 / khrRate },
                          { khr: '100k', usd: 100000 / khrRate },
                        ].map((item) => (
                          <button
                            key={item.khr}
                            type="button"
                            onClick={() => setCashTendered(item.usd.toFixed(2))}
                            className="py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-[11px] font-bold text-amber-300 hover:bg-amber-500 hover:text-zinc-950 transition-colors"
                          >
                            ៛{item.khr}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="p-3 bg-zinc-900/90 border border-white/10 rounded-xl flex justify-between items-center">
                      <div>
                        <span className="text-xs text-zinc-400 block font-semibold">Change Return</span>
                        <span className="text-[11px] font-mono text-emerald-400 font-bold">
                          ៛ {Math.round(changeDue * khrRate).toLocaleString()} KHR
                        </span>
                      </div>
                      <span className={`text-xl font-mono font-black tabular-nums ${changeDue > 0 ? 'text-emerald-400' : 'text-zinc-500'}`}>
                        ${changeDue.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center space-y-4 py-2 my-auto">
                    <div className="inline-block p-3.5 bg-white rounded-2xl shadow-xl">
                      <QRCodeSVG value={khqrPayload} size={150} level="H" />
                    </div>
                    <div>
                      <span className="text-xs text-zinc-400 block">Scan KHQR Code with Mobile Banking</span>
                      <span className="text-xs font-bold text-amber-400">ABA / Bakong / Wing / ACLEDA</span>
                    </div>
                    <div className="p-3 bg-zinc-900/90 border border-amber-500/25 rounded-xl text-xs text-zinc-200 flex items-center justify-between">
                      <span>Amount Due:</span>
                      <span className="font-mono font-bold text-amber-400">
                        ${order.totalAmount.toFixed(2)} (៛{Math.round(order.totalAmount * khrRate).toLocaleString()})
                      </span>
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  disabled={selectedMethod === 'CASH' && !isCashSufficient}
                  onClick={handleProcessPayment}
                  className={`w-full py-3.5 rounded-xl font-extrabold text-sm flex items-center justify-center gap-2 transition-all ${
                    selectedMethod === 'CASH' && !isCashSufficient
                      ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                      : 'gold-gradient-bg hover:brightness-110 text-zinc-950 shadow-lg shadow-amber-900/30'
                  }`}
                >
                  {isProcessing
                    ? 'Processing Payment...'
                    : `Confirm & Complete ($${order.totalAmount.toFixed(2)})`}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
