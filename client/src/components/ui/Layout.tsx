import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Coffee,
  LayoutDashboard,
  ShoppingBag,
  UtensilsCrossed,
  Layers,
  Package,
  Users,
  ShieldAlert,
  BarChart3,
  Settings,
  LogOut,
  Clock,
  Shield,
  Globe,
  ChevronDown,
  Search,
  KeyRound,
  X,
  Check,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage, Language } from '../../context/LanguageContext';
import { WORLDWIDE_BRANCHES } from '../../services/worldwideBranches';
import { apiFetch } from '../../services/api';
import { GlobalBranch, PermissionId, Role } from '../../types';
import { CommandPalette } from './CommandPalette';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout, hasGranularPermission } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showBranchSelector, setShowBranchSelector] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);

  // Change Password / PIN Modal state
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [secTab, setSecTab] = useState<'password' | 'pin'>('pin');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPin, setNewPin] = useState('');
  const [secFeedback, setSecFeedback] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);
  const [secBusy, setSecBusy] = useState(false);

  const [activeBranch, setActiveBranch] = useState<GlobalBranch>(() => {
    try {
      const saved = localStorage.getItem('coffee_pos_active_branch');
      return saved ? JSON.parse(saved) : WORLDWIDE_BRANCHES[0];
    } catch {
      return WORLDWIDE_BRANCHES[0];
    }
  });

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleBranchSelect = (branch: GlobalBranch) => {
    setActiveBranch(branch);
    localStorage.setItem('coffee_pos_active_branch', JSON.stringify(branch));
    setShowBranchSelector(false);
  };

  const navigation: Array<{
    name: string;
    path: string;
    icon: React.ComponentType<{ className?: string }>;
    roles: Role[];
    perm?: PermissionId;
  }> = [
    { name: t('posScreen'), path: '/pos', icon: ShoppingBag, roles: ['ADMIN', 'MANAGER', 'CASHIER'], perm: 'pos:access' },
    { name: t('kitchenKds'), path: '/kds', icon: UtensilsCrossed, roles: ['ADMIN', 'MANAGER', 'BARISTA', 'CASHIER'], perm: 'pos:access' },
    { name: t('tables'), path: '/tables', icon: Layers, roles: ['ADMIN', 'MANAGER', 'CASHIER'], perm: 'pos:access' },
    { name: t('dashboard'), path: '/', icon: LayoutDashboard, roles: ['ADMIN', 'MANAGER'] },
    { name: t('products'), path: '/products', icon: Coffee, roles: ['ADMIN', 'MANAGER'] },
    { name: t('inventory'), path: '/inventory', icon: Package, roles: ['ADMIN', 'MANAGER'], perm: 'inventory:view' },
    { name: t('customers'), path: '/customers', icon: Users, roles: ['ADMIN', 'MANAGER', 'CASHIER'] },
    { name: t('staff'), path: '/employees', icon: ShieldAlert, roles: ['ADMIN', 'MANAGER'] },
    { name: t('reports'), path: '/reports', icon: BarChart3, roles: ['ADMIN', 'MANAGER'], perm: 'reports:view' },
    { name: t('settings'), path: '/settings', icon: Settings, roles: ['ADMIN'], perm: 'settings:edit' },
  ];

  const handleUpdateSecurity = async (e: React.FormEvent) => {
    e.preventDefault();
    setSecFeedback(null);
    setSecBusy(true);
    try {
      if (secTab === 'password') {
        await apiFetch('/api/v1/auth/change-password', {
          method: 'POST',
          body: { currentPassword, newPassword },
        });
        setCurrentPassword('');
        setNewPassword('');
        setSecFeedback({ type: 'ok', msg: 'Password updated successfully.' });
      } else {
        await apiFetch('/api/v1/auth/change-pin', {
          method: 'POST',
          body: { currentPassword, newPin },
        });
        setCurrentPassword('');
        setNewPin('');
        setSecFeedback({ type: 'ok', msg: 'Security PIN updated cleanly.' });
      }
    } catch (err) {
      setSecFeedback({
        type: 'err',
        msg: err instanceof Error ? err.message : 'Failed to update security credentials.',
      });
    } finally {
      setSecBusy(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#09090b] text-zinc-100 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-[#0d0d11]/95 border-r border-zinc-800/80 flex flex-col justify-between p-4 z-20 glass-panel">
        <div>
          {/* Brand Logo */}
          <div className="flex items-center space-x-3 px-2 py-3 mb-6">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-300 flex items-center justify-center shadow-lg shadow-amber-500/25 border border-amber-300/40">
              <Coffee className="w-5 h-5 text-zinc-950 font-black" />
            </div>
            <div>
              <h1 className="font-extrabold text-sm text-zinc-100 tracking-wide font-sans leading-none">{t('appName')}</h1>
              <span className="text-[9px] font-bold tracking-wider block mt-0.5 gold-gradient-text uppercase">{t('appSub')}</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            {navigation.map((item) => {
              const isActive = location.pathname === item.path;
              const roleOk = Boolean(user && item.roles.includes(user.role));
              const permOk = !item.perm || hasGranularPermission(item.perm);
              if (!roleOk || !permOk) return null;

              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-transparent text-amber-300 border-l-2 border-amber-500 shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/40'
                  }`}
                >
                  <Icon className={`w-4 h-4 transition-colors ${isActive ? 'text-amber-400' : 'text-zinc-400'}`} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Authenticated User & Security Controls */}
        <div className="pt-4 border-t border-zinc-800/80 space-y-3">
          <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-zinc-900/90 border border-zinc-800 text-xs">
            <span className="flex items-center space-x-1.5 text-amber-300 font-semibold">
              <Shield className="w-3.5 h-3.5 text-amber-400" />
              <span>Role: {user?.role}</span>
            </span>
            <button
              onClick={() => {
                setSecFeedback(null);
                setShowSecurityModal(true);
              }}
              className="flex items-center space-x-1 text-[10px] font-bold text-zinc-400 hover:text-amber-300 transition-colors"
              title="Update Password or Security PIN"
            >
              <KeyRound className="w-3 h-3" />
              <span>My PIN</span>
            </button>
          </div>

          <div className="flex items-center justify-between px-1">
            <div className="flex items-center space-x-3 min-w-0">
              <img
                src={user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                alt={user?.name}
                className="w-9 h-9 rounded-full object-cover border border-amber-500/40 flex-shrink-0"
              />
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-zinc-200 truncate">{user?.name}</p>
                <p className="text-[10px] text-zinc-400 truncate">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={async () => {
                await logout();
                navigate('/login', { replace: true });
              }}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors flex-shrink-0"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top App Bar */}
        <header className="h-16 bg-[#0c0c0f]/80 backdrop-blur-xl border-b border-zinc-800/80 px-6 flex items-center justify-between z-10">
          <div className="flex items-center space-x-4">
            <h2 className="text-lg font-bold text-zinc-100 tracking-wide font-sans">
              {navigation.find((n) => n.path === location.pathname)?.name || t('posScreen')}
            </h2>

            {/* Worldwide Branch Selector Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowBranchSelector(!showBranchSelector)}
                className="flex items-center space-x-2 px-3 py-1.5 rounded-2xl bg-zinc-900/90 border border-zinc-700/80 text-amber-300 text-xs font-bold hover:border-amber-500/50 transition-colors shadow-sm"
              >
                <span>{activeBranch.flag}</span>
                <span>Branch {activeBranch.code} ({activeBranch.name})</span>
                <ChevronDown className="w-3.5 h-3.5 text-amber-400" />
              </button>

              {showBranchSelector && (
                <div className="absolute top-10 left-0 w-72 bg-[#121217] border border-zinc-700 rounded-2xl p-2 shadow-2xl space-y-1 z-50 animate-in fade-in zoom-in-95">
                  <div className="text-[10px] text-zinc-400 font-semibold px-2 py-1 uppercase border-b border-zinc-800">
                    Select Worldwide Branch Network
                  </div>
                  {WORLDWIDE_BRANCHES.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => handleBranchSelect(b)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-left transition-colors ${
                        activeBranch.id === b.id
                          ? 'bg-amber-500 text-zinc-950 font-bold'
                          : 'text-zinc-200 hover:bg-zinc-800'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <span>{b.flag}</span>
                        <div>
                          <span className="block font-bold">{b.name}</span>
                          <span className="text-[9px] opacity-75">{b.country} • {b.currency}</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono opacity-80">{b.code}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Header Bar */}
          <div className="flex items-center space-x-3 text-sm text-zinc-300">
            <button
              onClick={() => setShowCommandPalette(true)}
              className="flex items-center space-x-2 px-3 py-1.5 rounded-2xl bg-zinc-900/90 border border-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs font-semibold shadow-inner"
            >
              <Search className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden lg:inline">Quick Search...</span>
              <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-[10px] font-mono text-zinc-400 border border-zinc-700">
                Ctrl K
              </kbd>
            </button>

            <div className="flex items-center bg-zinc-900/90 p-1 rounded-2xl border border-zinc-800 shadow-inner">
              <Globe className="w-3.5 h-3.5 text-amber-400 ml-2 mr-1" />
              {(['EN', 'KH', 'TH', 'ZH'] as Language[]).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setLanguage(lang)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all ${
                    language === lang
                      ? 'bg-amber-500 text-zinc-950 shadow-md font-extrabold'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {lang === 'EN' && 'EN'}
                  {lang === 'KH' && 'KH 🇰🇭'}
                  {lang === 'TH' && 'TH 🇹🇭'}
                  {lang === 'ZH' && 'ZH 🇨🇳'}
                </button>
              ))}
            </div>

            <div className="hidden sm:flex items-center space-x-2 bg-zinc-900/90 px-3 py-1.5 rounded-xl border border-zinc-800 text-xs">
              <Clock className="w-4 h-4 text-amber-400" />
              <span className="font-mono text-amber-300 font-bold">
                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <main
          className={`flex-1 min-h-0 bg-gradient-to-br from-[#09090b] via-[#0e0e13] to-[#09090b] ${
            location.pathname === '/pos'
              ? 'p-4 overflow-hidden flex flex-col'
              : 'p-6 overflow-y-auto'
          }`}
        >
          {children}
        </main>
      </div>

      <CommandPalette
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
      />

      {/* Self-Service Password & PIN Change Modal */}
      {showSecurityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-zinc-900 border border-amber-500/30 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center space-x-2">
                <KeyRound className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold text-zinc-100">Account Credentials & Terminal PIN</h3>
              </div>
              <button
                onClick={() => setShowSecurityModal(false)}
                className="w-7 h-7 rounded-full bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex space-x-2 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
              <button
                type="button"
                onClick={() => { setSecTab('pin'); setSecFeedback(null); }}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  secTab === 'pin' ? 'bg-amber-500 text-zinc-950' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Update Security PIN
              </button>
              <button
                type="button"
                onClick={() => { setSecTab('password'); setSecFeedback(null); }}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  secTab === 'password' ? 'bg-amber-500 text-zinc-950' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Change Password
              </button>
            </div>

            {secFeedback && (
              <div
                className={`p-3 rounded-xl text-xs font-semibold ${
                  secFeedback.type === 'ok'
                    ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-300'
                    : 'bg-red-950/60 border border-red-500/40 text-red-300'
                }`}
              >
                {secFeedback.msg}
              </div>
            )}

            <form onSubmit={handleUpdateSecurity} className="space-y-3">
              <div>
                <label className="text-xs text-zinc-400 block mb-1">Current Password (Required)</label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl glass-input text-xs text-zinc-100"
                  placeholder="Enter your current password"
                />
              </div>

              {secTab === 'pin' ? (
                <div>
                  <label className="text-xs text-zinc-400 block mb-1">New 4-Digit POS PIN</label>
                  <input
                    type="password"
                    required
                    maxLength={6}
                    pattern="\d{4,6}"
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-3.5 py-2 rounded-xl glass-input text-xs text-zinc-100 font-mono"
                    placeholder="4 to 6 digits"
                  />
                </div>
              ) : (
                <div>
                  <label className="text-xs text-zinc-400 block mb-1">New Password (min 8 characters)</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl glass-input text-xs text-zinc-100"
                    placeholder="Minimum 8 characters"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={secBusy}
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs flex items-center justify-center space-x-1.5"
              >
                <Check className="w-4 h-4" />
                <span>{secBusy ? 'Saving...' : 'Update Credentials'}</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
