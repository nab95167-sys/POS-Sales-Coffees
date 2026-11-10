import React, { useState } from 'react';
import { X, CreditCard, Banknote, QrCode, CheckCircle2, DollarSign, Wallet, ArrowRightLeft, Split } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { PaymentMethod, Order, SplitPayment } from '../../types';

interface Props {
  order: Order;
  onClose: () => void;
  onPaymentComplete: (
    method: PaymentMethod,
    amountPaid: number,
    change: number,
    transactionId?: string,
    splitPayments?: SplitPayment[]
  ) => void;
}

export const PaymentModal: React.FC<Props> = ({ order, onClose, onPaymentComplete }) => {
  const [isSplitMode, setIsSplitMode] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('ABA_KHQR');
  const [cashTendered, setCashTendered] = useState<string>(order.totalAmount.toFixed(2));
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Split Mode State: Part 1 Cash, Part 2 Digital (ABA KHQR or Card)
  const defaultSplitCash = Math.min(order.totalAmount, 5.00);
  const [splitCashAmount, setSplitCashAmount] = useState<string>(
    order.totalAmount > 5 ? '5.00' : (order.totalAmount / 2).toFixed(2)
  );
  const [splitDigitalMethod, setSplitDigitalMethod] = useState<PaymentMethod>('ABA_KHQR');

  const tenderedAmount = parseFloat(cashTendered) || 0;
  const changeDue = Math.max(0, tenderedAmount - order.totalAmount);
  const isCashSufficient = tenderedAmount >= order.totalAmount;

  // Split calculations
  const splitCash = Math.max(0, parseFloat(splitCashAmount) || 0);
  const splitDigital = Math.max(0, order.totalAmount - splitCash);

  const paymentMethods: { id: PaymentMethod; label: string; icon: any; color: string }[] = [
    { id: 'ABA_KHQR', label: 'ABA KHQR', icon: QrCode, color: 'bg-red-950/60 border-red-500/60 text-red-400' },
    { id: 'CASH', label: 'Cash (USD / KHR)', icon: Banknote, color: 'bg-emerald-950/60 border-emerald-500/60 text-emerald-400' },
    { id: 'CREDIT_CARD', label: 'Credit Card', icon: CreditCard, color: 'bg-blue-950/60 border-blue-500/60 text-blue-400' },
    { id: 'BAKONG', label: 'Bakong KHQR', icon: Wallet, color: 'bg-orange-950/60 border-orange-500/60 text-orange-400' },
    { id: 'WING', label: 'Wing Bank', icon: DollarSign, color: 'bg-lime-950/60 border-lime-500/60 text-lime-400' },
    { id: 'ACLEDA', label: 'ACLEDA Mobile', icon: CreditCard, color: 'bg-indigo-950/60 border-indigo-500/60 text-indigo-400' },
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
      }, 1000);
    }, 1000);
  };

  const currentQrAmount = isSplitMode ? splitDigital : order.totalAmount;
  const khqrPayload = `00020101021238580016A0000007700001010111ABA_COFFEE0208AURACOFF5204599953038405404${currentQrAmount.toFixed(
    2
  )}5802KH5911Aura Coffee6010Phnom Penh6304C4F2`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md font-sans">
      <div className="bg-stone-900 border border-amber-700/40 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 glass-panel">
        {/* Header */}
        <div className="px-6 py-4 bg-stone-950 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-amber-600/20 border border-amber-500/40 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-100 flex items-center space-x-2">
                <span>Checkout Payment</span>
                {order.tableName && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-950/60 text-amber-300 border border-amber-700/40 font-mono">
                    {order.tableName}
                  </span>
                )}
              </h3>
              <p className="text-xs text-stone-400">Order #{order.orderNumber} • {order.type.replace('_', ' ')}</p>
            </div>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center space-x-2">
            <div className="flex items-center bg-stone-950 p-1 rounded-2xl border border-stone-800 text-xs">
              <button
                onClick={() => setIsSplitMode(false)}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                  !isSplitMode ? 'bg-amber-600 text-stone-950 shadow-md' : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                Standard
              </button>
              <button
                onClick={() => setIsSplitMode(true)}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center space-x-1 ${
                  isSplitMode ? 'bg-purple-600 text-white shadow-md' : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                <ArrowRightLeft className="w-3 h-3" />
                <span>Split (បង់ចម្រុះ)</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-stone-800 text-stone-400 hover:text-white flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {isSuccess ? (
          <div className="p-12 text-center space-y-4">
            <div className="w-20 h-20 rounded-full bg-emerald-500/20 border border-emerald-500 flex items-center justify-center mx-auto text-emerald-400 animate-bounce">
              <CheckCircle2 className="w-12 h-12" />
            </div>
            <h4 className="text-2xl font-extrabold text-stone-100">Payment Successful!</h4>
            {isSplitMode ? (
              <p className="text-sm text-stone-400">
                Received <span className="text-emerald-400 font-bold">${splitCash.toFixed(2)} Cash</span> +{' '}
                <span className="text-amber-400 font-bold">${splitDigital.toFixed(2)} {splitDigitalMethod.replace('_', ' ')}</span>.
              </p>
            ) : (
              <p className="text-sm text-stone-400">
                Received <span className="text-emerald-400 font-bold">${(selectedMethod === 'CASH' ? tenderedAmount : order.totalAmount).toFixed(2)}</span> via {selectedMethod.replace('_', ' ')}.
              </p>
            )}
            {!isSplitMode && selectedMethod === 'CASH' && changeDue > 0 && (
              <div className="p-4 bg-emerald-950/40 border border-emerald-500/40 rounded-2xl inline-block mt-2">
                <span className="text-xs text-emerald-300 block">Change Due</span>
                <span className="text-3xl font-extrabold text-emerald-400 font-mono">${changeDue.toFixed(2)}</span>
              </div>
            )}
          </div>
        ) : isSplitMode ? (
          /* Split Payment View (Part Cash + Part ABA KHQR) */
          <div className="p-6 space-y-5">
            <div className="p-4 bg-purple-950/30 border border-purple-600/40 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-xs text-purple-300 font-bold uppercase tracking-wider block">Total Bill Amount</span>
                <span className="text-2xl font-black text-stone-100 font-mono">${order.totalAmount.toFixed(2)}</span>
                <span className="text-xs text-stone-400 block font-mono">≈ ៛ {Math.round(order.totalAmount * 4100).toLocaleString()} KHR</span>
              </div>
              <div className="text-right">
                <span className="text-xs text-stone-400 block">Split Mode</span>
                <span className="text-xs font-bold text-purple-400 bg-purple-950 px-2.5 py-1 rounded-full border border-purple-700/50">
                  Cash + QR Hybrid
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Part 1: Cash Amount */}
              <div className="p-4 bg-stone-950/80 border border-stone-800 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400 flex items-center space-x-1.5">
                    <Banknote className="w-4 h-4" />
                    <span>Part 1: Cash Portion ($)</span>
                  </span>
                  <span className="text-[11px] text-stone-500 font-mono">សាច់ប្រាក់សុទ្ធ</span>
                </div>

                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max={order.totalAmount}
                  value={splitCashAmount}
                  onChange={(e) => setSplitCashAmount(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xl font-mono font-bold text-emerald-400 focus:outline-none"
                />

                <div className="grid grid-cols-4 gap-1 pt-1">
                  {[1, 2, 5, 10].map((amt) => (
                    <button
                      key={`split-c-${amt}`}
                      onClick={() => setSplitCashAmount(Math.min(order.totalAmount, amt).toFixed(2))}
                      className="py-1.5 bg-stone-800 hover:bg-stone-700 rounded-lg text-xs font-bold text-stone-200 transition-colors"
                    >
                      ${amt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Part 2: Digital Remaining Amount */}
              <div className="p-4 bg-stone-950/80 border border-stone-800 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-400 flex items-center space-x-1.5">
                    <QrCode className="w-4 h-4" />
                    <span>Part 2: Remaining ({splitDigitalMethod})</span>
                  </span>
                  <span className="text-[11px] text-stone-500 font-mono">ស្កេនទូទាត់</span>
                </div>

                <div className="p-2.5 bg-stone-900 border border-amber-700/40 rounded-xl flex items-baseline justify-between">
                  <span className="text-xl font-black font-mono text-amber-400">${splitDigital.toFixed(2)}</span>
                  <span className="text-xs font-mono text-stone-400">≈ ៛ {Math.round(splitDigital * 4100).toLocaleString()} KHR</span>
                </div>

                <div className="flex items-center space-x-2 pt-1">
                  {(['ABA_KHQR', 'CREDIT_CARD', 'BAKONG'] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setSplitDigitalMethod(m)}
                      className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-colors ${
                        splitDigitalMethod === m
                          ? 'bg-amber-600 text-stone-950 font-bold'
                          : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
                      }`}
                    >
                      {m.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Split QR Code Center */}
            {splitDigital > 0 && splitDigitalMethod !== 'CREDIT_CARD' && (
              <div className="p-4 bg-stone-950 rounded-2xl border border-stone-800 flex items-center justify-center space-x-5">
                <div className="p-2.5 bg-white rounded-xl shadow-lg shrink-0">
                  <QRCodeSVG value={khqrPayload} size={110} level="H" />
                </div>
                <div className="text-left space-y-1">
                  <span className="text-xs font-bold text-amber-400 block">Scan to Pay Remaining ${splitDigital.toFixed(2)}</span>
                  <p className="text-[11px] text-stone-400 max-w-xs">
                    Customer scans QR code for the exact remaining balance of <strong>៛ {Math.round(splitDigital * 4100).toLocaleString()} KHR</strong>.
                  </p>
                </div>
              </div>
            )}

            <button
              disabled={splitCash + splitDigital !== order.totalAmount}
              onClick={handleProcessPayment}
              className="w-full py-3.5 rounded-2xl font-bold text-sm bg-gradient-to-r from-purple-600 to-amber-500 hover:from-purple-500 hover:to-amber-400 text-stone-950 shadow-lg shadow-purple-950/40 transition-all flex items-center justify-center space-x-2"
            >
              {isProcessing ? (
                <span>Confirming Split Payment...</span>
              ) : (
                <span>Confirm Split Payment ($${splitCash.toFixed(2)} + $${splitDigital.toFixed(2)})</span>
              )}
            </button>
          </div>
        ) : (
          /* Standard Single Method View */
          <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Left Column: Method Selector */}
            <div className="md:col-span-5 space-y-3">
              <label className="text-xs font-semibold text-stone-400 uppercase tracking-wider block">
                Select Payment Method
              </label>
              <div className="space-y-2">
                {paymentMethods.map((m) => {
                  const Icon = m.icon;
                  const isSelected = selectedMethod === m.id;
                  return (
                    <button
                      key={m.id}
                      onClick={() => setSelectedMethod(m.id)}
                      className={`w-full flex items-center space-x-3 p-3.5 rounded-2xl border text-left transition-all ${
                        isSelected
                          ? `${m.color} ring-2 ring-amber-500/40 font-bold shadow-lg`
                          : 'bg-stone-800/40 border-stone-700/60 text-stone-300 hover:bg-stone-800'
                      }`}
                    >
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      <span className="text-xs font-semibold">{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right Column: KHQR Display or Cash Keypad */}
            <div className="md:col-span-7 bg-stone-950/60 border border-stone-800 rounded-2xl p-5 flex flex-col justify-between">
              {selectedMethod === 'CASH' ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center pb-3 border-b border-stone-800">
                    <div>
                      <span className="text-xs text-stone-400 block">Total Payable</span>
                      <span className="text-[11px] text-amber-500 font-mono font-bold">
                        ៛ {Math.round(order.totalAmount * 4100).toLocaleString()} KHR
                      </span>
                    </div>
                    <span className="text-2xl font-mono font-extrabold text-amber-400">${order.totalAmount.toFixed(2)}</span>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs font-semibold text-stone-300">Tendered Cash (USD $)</label>
                      <button
                        type="button"
                        onClick={() => setCashTendered(order.totalAmount.toFixed(2))}
                        className="text-[11px] font-bold text-amber-400 hover:underline"
                      >
                        Exact Cash (${order.totalAmount.toFixed(2)})
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

                  {/* Quick Cash Presets USD */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">USD Fast Presets ($)</span>
                    <div className="grid grid-cols-5 gap-1.5">
                      {[1, 5, 10, 20, 50, 100].map((amt) => (
                        <button
                          key={`usd-${amt}`}
                          onClick={() => setCashTendered(amt.toFixed(2))}
                          className="py-2 bg-stone-800/90 border border-stone-700/80 rounded-xl text-xs font-bold text-stone-200 hover:bg-amber-600 hover:text-stone-950 transition-colors"
                        >
                          ${amt}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Quick Cash Presets KHR */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">Khmer Riel Fast Presets (៛)</span>
                    <div className="grid grid-cols-5 gap-1.5">
                      {[
                        { khr: '10,000', usd: 10000 / 4100 },
                        { khr: '20,000', usd: 20000 / 4100 },
                        { khr: '40,000', usd: 40000 / 4100 },
                        { khr: '50,000', usd: 50000 / 4100 },
                        { khr: '100,000', usd: 100000 / 4100 },
                      ].map((item) => (
                        <button
                          key={item.khr}
                          onClick={() => setCashTendered(item.usd.toFixed(2))}
                          className="py-1.5 bg-amber-950/40 border border-amber-700/40 rounded-xl text-[11px] font-bold text-amber-300 hover:bg-amber-600 hover:text-stone-950 transition-colors"
                        >
                          ៛{item.khr}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Dual Currency Change Return Display */}
                  <div className="p-3 bg-stone-900 border border-stone-800 rounded-xl flex justify-between items-center">
                    <div>
                      <span className="text-xs text-stone-400 block font-semibold">Change Return (ប្រាក់អាប់)</span>
                      <span className="text-[11px] font-mono text-emerald-400 font-bold">
                        ៛ {Math.round(changeDue * 4100).toLocaleString()} KHR
                      </span>
                    </div>
                    <span className={`text-xl font-mono font-extrabold ${changeDue > 0 ? 'text-emerald-400' : 'text-stone-500'}`}>
                      ${changeDue.toFixed(2)}
                    </span>
                  </div>
                </div>
              ) : (
                /* KHQR / Card QR View */
                <div className="text-center space-y-4 py-2">
                  <div className="inline-block p-4 bg-white rounded-2xl shadow-xl">
                    <QRCodeSVG value={khqrPayload} size={160} level="H" />
                  </div>
                  <div>
                    <span className="text-xs text-stone-400 block">Scan KHQR Code with any Bank App</span>
                    <span className="text-xs font-bold text-amber-400">ABA / Bakong / Wing / ACLEDA</span>
                  </div>
                  <div className="p-2.5 bg-stone-900 border border-amber-900/30 rounded-xl text-xs text-stone-300">
                    Payable Amount: <span className="font-mono font-bold text-amber-400">${order.totalAmount.toFixed(2)}</span>
                  </div>
                </div>
              )}

              <button
                disabled={selectedMethod === 'CASH' && !isCashSufficient}
                onClick={handleProcessPayment}
                className={`w-full mt-4 py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center space-x-2 transition-all ${
                  selectedMethod === 'CASH' && !isCashSufficient
                    ? 'bg-stone-800 text-stone-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-stone-950 shadow-lg shadow-amber-900/30'
                }`}
              >
                {isProcessing ? (
                  <span>Processing Payment...</span>
                ) : (
                  <span>Confirm & Complete Order (${order.totalAmount.toFixed(2)})</span>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
