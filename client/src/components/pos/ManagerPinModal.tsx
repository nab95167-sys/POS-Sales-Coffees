import React, { useState } from 'react';
import { X, ShieldAlert, Delete } from 'lucide-react';
import { soundEffects } from '../../services/soundService';
import { apiFetch } from '../../services/api';

interface Props {
  actionTitle: string;
  actionDetails: string;
  onSuccess: (overrideToken?: string) => void;
  onClose: () => void;
  performedBy?: string;
}

export const ManagerPinModal: React.FC<Props> = ({
  actionTitle,
  actionDetails,
  onSuccess,
  onClose,
}) => {
  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const handleKeyPress = (num: string) => {
    if (isVerifying) return;
    soundEffects.playBeep();
    setErrorMsg('');
    if (pin.length < 4) {
      const nextPin = pin + num;
      setPin(nextPin);
      if (nextPin.length === 4) {
        void verifyPin(nextPin);
      }
    }
  };

  const handleBackspace = () => {
    if (isVerifying) return;
    soundEffects.playBeep();
    setErrorMsg('');
    setPin((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    if (isVerifying) return;
    soundEffects.playBeep();
    setPin('');
    setErrorMsg('');
  };

  const verifyPin = async (enteredPin: string) => {
    setIsVerifying(true);
    try {
      const res = await apiFetch<{
        authorized: boolean;
        authorizerName: string;
        authorizerRole: string;
        overrideToken?: string;
      }>('/api/v1/security/verify-pin', {
        method: 'POST',
        body: {
          pin: enteredPin,
          purpose: 'MANAGER_OVERRIDE',
          actionTitle,
          actionDetails,
        },
        skipAuthRefresh: true,
      });
      soundEffects.playCashRegister();
      onSuccess(res.overrideToken);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Incorrect Manager PIN.');
      setPin('');
      soundEffects.playBeep();
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md font-sans">
      <div className="bg-stone-900 border border-amber-600/50 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 glass-panel">
        {/* Header */}
        <div className="px-6 py-4 bg-stone-950 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-stone-100">Manager Authorization</h3>
              <p className="text-[10px] text-amber-400 font-medium">Server-Verified PIN Override</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-stone-800 text-stone-400 hover:text-white flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Description */}
        <div className="p-5 text-center space-y-4">
          <div className="p-3 bg-stone-950/80 rounded-2xl border border-stone-800 space-y-1">
            <span className="text-[10px] text-stone-400 uppercase tracking-wider block font-bold">Action Request</span>
            <p className="text-xs font-bold text-amber-300">{actionTitle}</p>
            <p className="text-[11px] text-stone-400">{actionDetails}</p>
          </div>

          {/* 4-Digit PIN Indicators */}
          <div className="space-y-2">
            <div className="flex justify-center items-center space-x-4 py-2">
              {[0, 1, 2, 3].map((idx) => (
                <div
                  key={idx}
                  className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${
                    errorMsg
                      ? 'bg-red-500 border-red-400 animate-pulse'
                      : pin.length > idx
                      ? 'bg-amber-400 border-amber-300 scale-125 shadow-lg shadow-amber-400/50'
                      : 'border-stone-600 bg-stone-950'
                  }`}
                />
              ))}
            </div>
            {errorMsg ? (
              <p className="text-[11px] font-bold text-red-400">{errorMsg}</p>
            ) : (
              <p className="text-[11px] text-stone-400">
                {isVerifying ? 'Verifying with security server...' : 'Enter Manager or Admin PIN'}
              </p>
            )}
          </div>

          {/* Numpad */}
          <div className="grid grid-cols-3 gap-2.5 pt-1">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
              <button
                key={digit}
                disabled={isVerifying}
                onClick={() => handleKeyPress(digit)}
                className="py-3.5 rounded-2xl bg-stone-800/80 hover:bg-stone-700 disabled:opacity-50 text-stone-100 font-mono text-lg font-bold shadow-md transition-all active:scale-95 border border-stone-700/60"
              >
                {digit}
              </button>
            ))}
            <button
              disabled={isVerifying}
              onClick={handleClear}
              className="py-3.5 rounded-2xl bg-stone-950 hover:bg-stone-800 text-stone-400 font-bold text-xs uppercase transition-all"
            >
              Clear
            </button>
            <button
              disabled={isVerifying}
              onClick={() => handleKeyPress('0')}
              className="py-3.5 rounded-2xl bg-stone-800/80 hover:bg-stone-700 disabled:opacity-50 text-stone-100 font-mono text-lg font-bold shadow-md transition-all active:scale-95 border border-stone-700/60"
            >
              0
            </button>
            <button
              disabled={isVerifying}
              onClick={handleBackspace}
              className="py-3.5 rounded-2xl bg-stone-950 hover:bg-stone-800 text-stone-400 flex items-center justify-center transition-all"
            >
              <Delete className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
