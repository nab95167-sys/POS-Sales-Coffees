import React, { useState } from 'react';
import { X, ShieldAlert, Check, Delete, Lock } from 'lucide-react';
import { soundEffects } from '../../services/soundService';
import { logSecurityEvent } from '../../services/securityAuditService';

interface Props {
  actionTitle: string;
  actionDetails: string;
  onSuccess: () => void;
  onClose: () => void;
  performedBy: string;
}

export const ManagerPinModal: React.FC<Props> = ({
  actionTitle,
  actionDetails,
  onSuccess,
  onClose,
  performedBy,
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  const handleKeyPress = (num: string) => {
    soundEffects.playBeep();
    setError(false);
    if (pin.length < 4) {
      const nextPin = pin + num;
      setPin(nextPin);
      if (nextPin.length === 4) {
        verifyPin(nextPin);
      }
    }
  };

  const handleBackspace = () => {
    soundEffects.playBeep();
    setError(false);
    setPin((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    soundEffects.playBeep();
    setPin('');
    setError(false);
  };

  const verifyPin = (enteredPin: string) => {
    // Default Manager PIN is 1234
    if (enteredPin === '1234') {
      soundEffects.playCashRegister();
      logSecurityEvent(
        'DISCOUNT_OVERRIDE',
        actionTitle,
        `${actionDetails} (Approved by Manager PIN)`,
        performedBy,
        'Manager (PIN: 1234)',
        'WARNING'
      );
      onSuccess();
    } else {
      setError(true);
      setPin('');
      soundEffects.playBeep();
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
              <p className="text-[10px] text-amber-400 font-medium">Security PIN Required</p>
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
                    error
                      ? 'bg-red-500 border-red-400 animate-pulse'
                      : pin.length > idx
                      ? 'bg-amber-400 border-amber-300 scale-125 shadow-lg shadow-amber-400/50'
                      : 'border-stone-600 bg-stone-950'
                  }`}
                />
              ))}
            </div>
            {error && (
              <p className="text-[11px] font-bold text-red-400 animate-bounce">
                Incorrect Manager PIN! Try again.
              </p>
            )}
          </div>

          {/* Numpad */}
          <div className="grid grid-cols-3 gap-2.5 pt-1">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
              <button
                key={digit}
                onClick={() => handleKeyPress(digit)}
                className="py-3.5 rounded-2xl bg-stone-800/80 hover:bg-stone-700 text-stone-100 font-mono text-lg font-bold shadow-md transition-all active:scale-95 border border-stone-700/60"
              >
                {digit}
              </button>
            ))}
            <button
              onClick={handleClear}
              className="py-3.5 rounded-2xl bg-stone-950 hover:bg-stone-800 text-stone-400 font-bold text-xs uppercase transition-all"
            >
              Clear
            </button>
            <button
              onClick={() => handleKeyPress('0')}
              className="py-3.5 rounded-2xl bg-stone-800/80 hover:bg-stone-700 text-stone-100 font-mono text-lg font-bold shadow-md transition-all active:scale-95 border border-stone-700/60"
            >
              0
            </button>
            <button
              onClick={handleBackspace}
              className="py-3.5 rounded-2xl bg-stone-950 hover:bg-stone-800 text-stone-400 flex items-center justify-center transition-all"
            >
              <Delete className="w-5 h-5" />
            </button>
          </div>

          <div className="pt-2 text-[10px] text-stone-500 font-mono">
            Demo Manager PIN: <span className="text-amber-400 font-bold">1234</span>
          </div>
        </div>
      </div>
    </div>
  );
};
