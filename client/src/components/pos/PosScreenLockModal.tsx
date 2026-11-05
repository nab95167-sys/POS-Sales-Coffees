import React, { useState, useEffect } from 'react';
import { Lock, Unlock, Clock, ShieldCheck, UserCheck, Delete } from 'lucide-react';
import { User } from '../../types';
import { soundEffects } from '../../services/soundService';
import { logSecurityEvent } from '../../services/securityAuditService';

interface Props {
  user: User | null;
  onUnlock: () => void;
}

export const PosScreenLockModal: React.FC<Props> = ({ user, onUnlock }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleKeyPress = (num: string) => {
    soundEffects.playBeep();
    setError(false);
    if (pin.length < 4) {
      const nextPin = pin + num;
      setPin(nextPin);
      if (nextPin.length === 4) {
        verifyUnlock(nextPin);
      }
    }
  };

  const handleBackspace = () => {
    soundEffects.playBeep();
    setError(false);
    setPin((prev) => prev.slice(0, -1));
  };

  const verifyUnlock = (enteredPin: string) => {
    // Standard unlock PIN is 1234 or matching last digits
    if (enteredPin === '1234' || enteredPin === '0000') {
      soundEffects.playCashRegister();
      logSecurityEvent(
        'SCREEN_UNLOCK',
        'Terminal Unlocked',
        'Cashier unlocked register terminal via PIN pad',
        user?.name || 'Staff'
      );
      onUnlock();
    } else {
      setError(true);
      setPin('');
      soundEffects.playBeep();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-6 bg-black/95 backdrop-blur-2xl font-sans select-none animate-in fade-in duration-300">
      <div className="w-full max-w-md bg-stone-900/90 border border-amber-600/40 rounded-3xl p-8 shadow-2xl glass-panel text-center space-y-6">
        {/* Clock & Status */}
        <div className="space-y-1">
          <div className="w-14 h-14 rounded-3xl bg-amber-600/20 border border-amber-500/40 flex items-center justify-center mx-auto text-amber-400 mb-2 shadow-lg shadow-amber-900/30">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-3xl font-extrabold text-stone-100 font-mono tracking-wider">
            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </h2>
          <p className="text-xs text-stone-400 font-medium">
            {currentTime.toLocaleDateString('km-KH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* User Card */}
        <div className="p-3.5 bg-stone-950/80 rounded-2xl border border-stone-800 flex items-center justify-center space-x-3">
          {user?.avatar ? (
            <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full object-cover border border-amber-500/50" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-amber-600 text-stone-950 font-bold flex items-center justify-center text-sm">
              {user?.name?.charAt(0) || 'U'}
            </div>
          )}
          <div className="text-left">
            <span className="text-xs font-bold text-stone-200 block">{user?.name || 'Cashier on Duty'}</span>
            <span className="text-[10px] text-amber-400 font-mono font-bold">Role: {user?.role || 'STAFF'} • Register #01</span>
          </div>
        </div>

        {/* 4-Digit PIN Display */}
        <div className="space-y-2">
          <div className="flex justify-center items-center space-x-4 py-1">
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
          {error ? (
            <p className="text-xs font-bold text-red-400 animate-bounce">
              Incorrect PIN! Try 1234.
            </p>
          ) : (
            <p className="text-[11px] text-stone-400">Enter PIN to unlock terminal</p>
          )}
        </div>

        {/* Numeric Keypad */}
        <div className="grid grid-cols-3 gap-2.5">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              onClick={() => handleKeyPress(digit)}
              className="py-3.5 rounded-2xl bg-stone-800/80 hover:bg-stone-700 text-stone-100 font-mono text-xl font-bold shadow-md transition-all active:scale-95 border border-stone-700/60"
            >
              {digit}
            </button>
          ))}
          <button
            onClick={() => setPin('')}
            className="py-3.5 rounded-2xl bg-stone-950 hover:bg-stone-800 text-stone-400 font-bold text-xs uppercase"
          >
            Clear
          </button>
          <button
            onClick={() => handleKeyPress('0')}
            className="py-3.5 rounded-2xl bg-stone-800/80 hover:bg-stone-700 text-stone-100 font-mono text-xl font-bold shadow-md transition-all active:scale-95 border border-stone-700/60"
          >
            0
          </button>
          <button
            onClick={handleBackspace}
            className="py-3.5 rounded-2xl bg-stone-950 hover:bg-stone-800 text-stone-400 flex items-center justify-center"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        <div className="text-[10px] text-stone-500 font-mono">
          Demo Unlock PIN: <span className="text-amber-400 font-bold">1234</span>
        </div>
      </div>
    </div>
  );
};
