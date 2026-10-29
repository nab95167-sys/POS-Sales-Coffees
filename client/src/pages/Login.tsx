import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Coffee, Lock, Mail, ShieldCheck, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Role } from '../types';

export const Login: React.FC = () => {
  const { login, switchDemoRole } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@coffeepos.com');
  const [password, setPassword] = useState('Admin123!');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    await login(email, password);
    setIsLoading(false);
    navigate('/pos');
  };

  const handleQuickDemoLogin = (role: Role) => {
    switchDemoRole(role);
    navigate('/pos');
  };

  return (
    <div className="min-h-screen bg-stone-950 flex items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-yellow-600/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md bg-stone-900/80 border border-amber-700/30 rounded-3xl p-8 shadow-2xl glass-panel relative z-10 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-amber-700 via-amber-600 to-yellow-500 flex items-center justify-center mx-auto shadow-xl shadow-amber-900/40">
            <Coffee className="w-9 h-9 text-stone-950 stroke-[2.5]" />
          </div>
          <h1 className="text-2xl font-extrabold text-stone-100 tracking-wide font-sans">AURA COFFEE POS</h1>
          <p className="text-xs text-stone-400">Sign in to your café register & management account</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-stone-400 block mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-stone-500 absolute left-3.5 top-3.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-stone-100 text-sm focus:outline-none"
                placeholder="staff@coffeepos.com"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-stone-400 block mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-stone-500 absolute left-3.5 top-3.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-stone-100 text-sm focus:outline-none"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-stone-950 font-bold text-sm shadow-lg shadow-amber-900/30 flex items-center justify-center space-x-2 transition-all"
          >
            <span>{isLoading ? 'Authenticating...' : 'Sign In to Register'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Demo Role One-Click Switcher */}
        <div className="pt-4 border-t border-stone-800 space-y-3">
          <div className="flex items-center space-x-2 text-stone-400 text-xs">
            <ShieldCheck className="w-4 h-4 text-amber-500" />
            <span className="font-semibold">Quick Demo Login (Select Role):</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {[
              { role: 'ADMIN', label: 'Admin (Sophia)', color: 'border-amber-500/40 text-amber-300' },
              { role: 'MANAGER', label: 'Manager (Alex)', color: 'border-blue-500/40 text-blue-300' },
              { role: 'CASHIER', label: 'Cashier (Sokha)', color: 'border-emerald-500/40 text-emerald-300' },
              { role: 'BARISTA', label: 'Barista (Devin)', color: 'border-purple-500/40 text-purple-300' },
            ].map((btn) => (
              <button
                key={btn.role}
                onClick={() => handleQuickDemoLogin(btn.role as Role)}
                className={`py-2 px-3 rounded-xl border bg-stone-800/40 hover:bg-stone-800 text-xs font-bold text-left transition-colors ${btn.color}`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
