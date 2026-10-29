import React, { useState } from 'react';
import { X, Wallet, Gift, CheckCircle2, QrCode, Search } from 'lucide-react';

interface Props {
  onClose: () => void;
}

export const GiftCardWalletModal: React.FC<Props> = ({ onClose }) => {
  const [cardNumber, setCardNumber] = useState('GC-9948-2026');
  const [balance, setBalance] = useState<number | null>(45.00);
  const [redeemAmount, setRedeemAmount] = useState(15.00);

  const handleCheckBalance = () => {
    setBalance(Math.floor(20 + Math.random() * 80));
  };

  const handleRedeem = () => {
    if (!balance) return;
    const newBal = Math.max(0, balance - redeemAmount);
    setBalance(newBal);
    alert(`Successfully redeemed $${redeemAmount.toFixed(2)} from Gift Card #${cardNumber}! Remaining Balance: $${newBal.toFixed(2)}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md font-sans">
      <div className="bg-stone-900 border border-amber-700/40 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 bg-stone-950 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-amber-500 flex items-center justify-center text-stone-950 font-bold">
              <Gift className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-stone-100">Digital Gift Card & E-Wallet</h3>
              <p className="text-xs text-stone-400">Issue, balance check & checkout redemption</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-800 text-stone-400 hover:text-white flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <label className="text-xs font-semibold text-stone-400 block mb-1">Enter Gift Card / Wallet #</label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
                className="flex-1 px-4 py-2.5 rounded-xl glass-input text-stone-100 text-sm font-mono focus:outline-none"
              />
              <button
                onClick={handleCheckBalance}
                className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs"
              >
                Check
              </button>
            </div>
          </div>

          {balance !== null && (
            <div className="p-5 bg-stone-950 rounded-2xl border border-stone-800 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs text-stone-400">Available Wallet Balance</span>
                <span className="text-2xl font-extrabold text-amber-400 font-mono">${balance.toFixed(2)}</span>
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-400 block mb-1">Redeem Amount ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={redeemAmount}
                  onChange={(e) => setRedeemAmount(Number(e.target.value))}
                  className="w-full px-4 py-2 rounded-xl glass-input text-stone-100 text-lg font-mono font-bold"
                />
              </div>

              <button
                onClick={handleRedeem}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-stone-950 font-bold text-xs flex items-center justify-center space-x-2 shadow-lg"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Apply Gift Card Payment (${redeemAmount.toFixed(2)})</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
