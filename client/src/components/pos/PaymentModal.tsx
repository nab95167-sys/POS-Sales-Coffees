import React, { useState } from 'react';
import { X, CreditCard, Banknote, QrCode, CheckCircle2, DollarSign, Wallet } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { PaymentMethod, Order } from '../../types';

interface Props {
  order: Order;
  onClose: () => void;
  onPaymentComplete: (method: PaymentMethod, amountPaid: number, change: number, transactionId?: string) => void;
}

export const PaymentModal: React.FC<Props> = ({ order, onClose, onPaymentComplete }) => {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('ABA_KHQR');
  const [cashTendered, setCashTendered] = useState<string>(order.totalAmount.toFixed(2));
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const tenderedAmount = parseFloat(cashTendered) || 0;
  const changeDue = Math.max(0, tenderedAmount - order.totalAmount);
  const isCashSufficient = tenderedAmount >= order.totalAmount;

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
        onPaymentComplete(
          selectedMethod,
          selectedMethod === 'CASH' ? tenderedAmount : order.totalAmount,
          selectedMethod === 'CASH' ? changeDue : 0,
          `TXN-${Math.floor(100000 + Math.random() * 900000)}`
        );
      }, 1000);
    }, 1200);
  };

  const khqrPayload = `00020101021238580016A0000007700001010111ABA_COFFEE0208AURACOFF5204599953038405404${order.totalAmount.toFixed(
    2
  )}5802KH5911Aura Coffee6010Phnom Penh6304C4F2`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-stone-900 border border-amber-700/40 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 bg-stone-950 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-amber-600/20 border border-amber-500/40 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-stone-100">Checkout Payment</h3>
              <p className="text-xs text-stone-400">Order #{order.orderNumber} • {order.type.replace('_', ' ')}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-800 text-stone-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {isSuccess ? (
          <div className="p-12 text-center space-y-4">
            <div className="w-20 h-20 rounded-full bg-emerald-500/20 border border-emerald-500 flex items-center justify-center mx-auto text-emerald-400 animate-bounce">
              <CheckCircle2 className="w-12 h-12" />
            </div>
            <h4 className="text-2xl font-extrabold text-stone-100">Payment Successful!</h4>
            <p className="text-sm text-stone-400">
              Received <span className="text-emerald-400 font-bold">${(selectedMethod === 'CASH' ? tenderedAmount : order.totalAmount).toFixed(2)}</span> via {selectedMethod.replace('_', ' ')}.
            </p>
            {selectedMethod === 'CASH' && changeDue > 0 && (
              <div className="p-4 bg-emerald-950/40 border border-emerald-500/40 rounded-2xl inline-block mt-2">
                <span className="text-xs text-emerald-300 block">Change Due</span>
                <span className="text-3xl font-extrabold text-emerald-400 font-mono">${changeDue.toFixed(2)}</span>
              </div>
            )}
          </div>
        ) : (
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
                    <span className="text-xs text-stone-400">Total Payable</span>
                    <span className="text-xl font-mono font-bold text-amber-400">${order.totalAmount.toFixed(2)}</span>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-stone-400 block mb-1">Tendered Cash (USD)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={cashTendered}
                      onChange={(e) => setCashTendered(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl glass-input text-2xl font-mono font-bold text-emerald-400 focus:outline-none"
                    />
                  </div>

                  {/* Quick Cash Presets */}
                  <div className="grid grid-cols-4 gap-2">
                    {[5, 10, 20, 50].map((amt) => (
                      <button
                        key={amt}
                        onClick={() => setCashTendered(amt.toFixed(2))}
                        className="py-2 bg-stone-800 border border-stone-700 rounded-xl text-xs font-bold text-stone-200 hover:bg-amber-600 hover:text-stone-950 transition-colors"
                      >
                        ${amt}
                      </button>
                    ))}
                  </div>

                  <div className="p-3 bg-stone-900 border border-stone-800 rounded-xl flex justify-between items-center">
                    <span className="text-xs text-stone-400">Change Return</span>
                    <span className={`text-lg font-mono font-bold ${changeDue > 0 ? 'text-emerald-400' : 'text-stone-500'}`}>
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
