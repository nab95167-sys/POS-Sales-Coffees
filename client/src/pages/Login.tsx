import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Coffee,
  Lock,
  Mail,
  ShieldCheck,
  ArrowRight,
  AlertTriangle,
  Eye,
  EyeOff,
  Globe,
  Sparkles,
  Layers,
  BarChart3,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage, Language } from '../context/LanguageContext';

const QUICK_ROLE_EMAILS = [
  { label: 'Admin', email: 'admin@coffeepos.com' },
  { label: 'Manager', email: 'manager@coffeepos.com' },
  { label: 'Cashier', email: 'cashier@coffeepos.com' },
  { label: 'Barista', email: 'barista@coffeepos.com' },
];

export const Login: React.FC = () => {
  const { login } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);
    try {
      const signedInUser = await login(email, password);
      if (signedInUser.role === 'BARISTA') {
        navigate('/kds', { replace: true });
      } else if (signedInUser.role === 'CASHIER') {
        navigate('/pos', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Authentication failed. Check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#08090c] flex flex-col lg:grid lg:grid-cols-12 relative overflow-hidden font-sans">
      {/* Ambient Radial Highlights */}
      <div className="absolute -top-24 -left-24 w-[480px] h-[480px] bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 right-0 w-[440px] h-[440px] bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Left Editorial Brand Showcase (Desktop) */}
      <div className="hidden lg:flex lg:col-span-6 xl:col-span-7 flex-col justify-between p-12 border-r border-white/10 bg-[#0b0c10]/80 backdrop-blur-xl relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl gold-gradient-bg flex items-center justify-center shadow-lg shadow-amber-500/20 border border-amber-300/40">
              <Coffee className="w-6 h-6 text-zinc-950 stroke-[2.4]" />
            </div>
            <div>
              <h1 className="font-black text-base text-zinc-100 tracking-wide">{t('appName')}</h1>
              <span className="text-[10px] font-bold tracking-widest uppercase gold-gradient-text">{t('appSub')}</span>
            </div>
          </div>

          <div className="flex items-center gap-1 bg-white/[0.04] border border-white/10 rounded-xl p-1">
            {(['EN', 'KH', 'TH', 'ZH'] as Language[]).map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => setLanguage(lang)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                  language === lang ? 'bg-amber-500 text-zinc-950' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {lang}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-6 max-w-xl my-auto py-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Enterprise Omnichannel Café Suite</span>
          </div>
          <h2 className="text-4xl xl:text-5xl font-black text-zinc-100 leading-[1.12] tracking-tight">
            Designed for speed at the counter, clarity in the back office.
          </h2>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Seamlessly responsive across desktop monitors, counter iPads, KDS kitchen screens, and mobile management — backed by encrypted SQLite persistence and strict RBAC enforcement.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2">
            <div className="glass-card rounded-2xl p-4 space-y-2">
              <Coffee className="w-5 h-5 text-amber-400" />
              <div className="text-xs font-extrabold text-zinc-100">Touch POS & KDS</div>
              <p className="text-[11px] text-zinc-400">Live bar queue, 80mm thermal receipts & cup labels.</p>
            </div>
            <div className="glass-card rounded-2xl p-4 space-y-2">
              <Layers className="w-5 h-5 text-emerald-400" />
              <div className="text-xs font-extrabold text-zinc-100">Floor & Stock</div>
              <p className="text-[11px] text-zinc-400">Synced table plans with automatic recipe deduction.</p>
            </div>
            <div className="glass-card rounded-2xl p-4 space-y-2">
              <BarChart3 className="w-5 h-5 text-sky-400" />
              <div className="text-xs font-extrabold text-zinc-100">X/Z Shift Reports</div>
              <p className="text-[11px] text-zinc-400">Dual USD/KHR drawer count, P&L & audit logs.</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-zinc-500 border-t border-white/10 pt-5">
          <span>Phnom Penh • Phnom Penh Main (#001)</span>
          <span className="font-mono">HttpOnly JWT • SameSite=Strict • Bcrypt</span>
        </div>
      </div>

      {/* Right Authentication Panel */}
      <div className="flex-1 lg:col-span-6 xl:col-span-5 flex flex-col items-center justify-center p-5 sm:p-8 relative z-10">
        {/* Top Mobile Language & Brand Strip */}
        <div className="w-full max-w-md flex lg:hidden items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl gold-gradient-bg flex items-center justify-center">
              <Coffee className="w-5 h-5 text-zinc-950 stroke-[2.4]" />
            </div>
            <span className="font-black text-sm text-zinc-100">{t('appName')}</span>
          </div>
          <div className="flex items-center gap-1 bg-white/[0.04] border border-white/10 rounded-xl p-1">
            <Globe className="w-3.5 h-3.5 text-amber-400 ml-1" />
            {(['EN', 'KH', 'TH', 'ZH'] as Language[]).map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => setLanguage(lang)}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                  language === lang ? 'bg-amber-500 text-zinc-950' : 'text-zinc-400'
                }`}
              >
                {lang}
              </button>
            ))}
          </div>
        </div>

        <div className="w-full max-w-md glass-panel border border-white/12 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="space-y-1.5">
            <h2 className="text-xl sm:text-2xl font-black text-zinc-100 tracking-tight">Staff Sign In</h2>
            <p className="text-xs text-zinc-400">
              Authenticate to access your role-assigned POS terminal or back-office portal.
            </p>
          </div>

          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-500/45 text-red-200 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <span className="font-semibold leading-relaxed">{errorMessage}</span>
            </div>
          )}

          {/* Quick Role Email Selector */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-zinc-400 block">Quick Select Staff Role Email</span>
            <div className="grid grid-cols-4 gap-1.5">
              {QUICK_ROLE_EMAILS.map((r) => (
                <button
                  key={r.email}
                  type="button"
                  onClick={() => setEmail(r.email)}
                  className={`py-1.5 px-2 rounded-xl text-[11px] font-bold border transition-colors ${
                    email === r.email
                      ? 'bg-amber-500/20 border-amber-500/60 text-amber-300'
                      : 'bg-white/[0.03] border-white/10 text-zinc-400 hover:text-zinc-200 hover:border-white/20'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-zinc-300 block mb-1.5">Staff Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-sm focus:outline-none"
                  placeholder="name@coffeepos.com"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-300 block mb-1.5">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl glass-input text-sm focus:outline-none"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-2.5 p-0.5 text-zinc-400 hover:text-zinc-200"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl gold-gradient-bg hover:brightness-110 disabled:opacity-60 text-zinc-950 font-black text-sm shadow-lg shadow-amber-900/30 flex items-center justify-center gap-2 transition-all"
            >
              <span>{isLoading ? 'Verifying Session...' : 'Sign In to Terminal'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="pt-4 border-t border-white/10 flex items-center justify-between text-[11px] text-zinc-400">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>HttpOnly Session & RBAC</span>
            </div>
            <span className="font-mono text-zinc-500">Max 5 attempts</span>
          </div>
        </div>
      </div>
    </div>
  );
};
