import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Coffee, LayoutDashboard, ShoppingBag, UtensilsCrossed, 
  Layers, Package, Users, ShieldAlert, BarChart3, Settings, 
  LogOut, Clock, RefreshCw, UserCheck, Shield, Globe, MapPin, ChevronDown, Command, Search
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage, Language } from '../../context/LanguageContext';
import { WORLDWIDE_BRANCHES } from '../../services/worldwideBranches';
import { GlobalBranch, Role } from '../../types';
import { CommandPalette } from './CommandPalette';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout, switchDemoRole } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showRoleSelector, setShowRoleSelector] = useState(false);
  const [showBranchSelector, setShowBranchSelector] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  
  const [activeBranch, setActiveBranch] = useState<GlobalBranch>(() => {
    const saved = localStorage.getItem('coffee_pos_active_branch');
    return saved ? JSON.parse(saved) : WORLDWIDE_BRANCHES[0];
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

  const navigation = [
    { name: t('posScreen'), path: '/pos', icon: ShoppingBag, roles: ['ADMIN', 'MANAGER', 'CASHIER'] },
    { name: t('kitchenKds'), path: '/kds', icon: UtensilsCrossed, roles: ['ADMIN', 'MANAGER', 'BARISTA', 'CASHIER'] },
    { name: t('tables'), path: '/tables', icon: Layers, roles: ['ADMIN', 'MANAGER', 'CASHIER'] },
    { name: t('dashboard'), path: '/', icon: LayoutDashboard, roles: ['ADMIN', 'MANAGER'] },
    { name: t('products'), path: '/products', icon: Coffee, roles: ['ADMIN', 'MANAGER'] },
    { name: t('inventory'), path: '/inventory', icon: Package, roles: ['ADMIN', 'MANAGER'] },
    { name: t('customers'), path: '/customers', icon: Users, roles: ['ADMIN', 'MANAGER', 'CASHIER'] },
    { name: t('staff'), path: '/employees', icon: ShieldAlert, roles: ['ADMIN', 'MANAGER'] },
    { name: t('reports'), path: '/reports', icon: BarChart3, roles: ['ADMIN', 'MANAGER'] },
    { name: t('settings'), path: '/settings', icon: Settings, roles: ['ADMIN'] },
  ];

  const handleRoleSwitch = (role: Role) => {
    switchDemoRole(role);
    setShowRoleSelector(false);
  };

  return (
    <div className="flex h-screen bg-stone-950 text-stone-100 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-stone-900/90 border-r border-amber-900/20 flex flex-col justify-between p-4 z-20 glass-panel">
        <div>
          {/* Brand Logo */}
          <div className="flex items-center space-x-3 px-2 py-3 mb-6">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-700 via-amber-600 to-yellow-500 flex items-center justify-center shadow-lg shadow-amber-900/40">
              <Coffee className="w-6 h-6 text-stone-950 font-bold" />
            </div>
            <div>
              <h1 className="font-bold text-sm text-amber-100 tracking-wide font-sans leading-none">{t('appName')}</h1>
              <span className="text-[9px] text-amber-500 font-medium tracking-wider block mt-0.5">{t('appSub')}</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {navigation.map((item) => {
              const isActive = location.pathname === item.path;
              const hasAccess = user && item.roles.includes(user.role);

              if (!hasAccess) return null;

              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-amber-600/20 text-amber-400 border border-amber-500/30 shadow-md shadow-amber-900/20'
                      : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-stone-400'}`} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User & Shift Card */}
        <div className="pt-4 border-t border-stone-800/80 space-y-3">
          {/* Quick Role Switcher */}
          <div className="relative">
            <button
              onClick={() => setShowRoleSelector(!showRoleSelector)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-amber-950/40 border border-amber-700/30 text-amber-300 text-xs font-semibold hover:bg-amber-900/40 transition-colors"
            >
              <span className="flex items-center space-x-1.5">
                <Shield className="w-3.5 h-3.5" />
                <span>Role: {user?.role}</span>
              </span>
              <RefreshCw className="w-3 h-3 text-amber-400" />
            </button>

            {showRoleSelector && (
              <div className="absolute bottom-12 left-0 right-0 bg-stone-900 border border-amber-700/40 rounded-xl p-2 shadow-2xl space-y-1 z-50">
                <div className="text-[10px] text-stone-400 font-semibold px-2 py-1 uppercase">Switch Demo Role</div>
                {(['ADMIN', 'MANAGER', 'CASHIER', 'BARISTA'] as Role[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => handleRoleSwitch(r)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      user?.role === r ? 'bg-amber-600 text-stone-950 font-bold' : 'text-stone-300 hover:bg-stone-800'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between px-1">
            <div className="flex items-center space-x-3">
              <img
                src={user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                alt={user?.name}
                className="w-9 h-9 rounded-full object-cover border border-amber-500/40"
              />
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-stone-200 truncate">{user?.name}</p>
                <p className="text-[10px] text-stone-400 truncate">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={() => {
                logout();
                navigate('/login');
              }}
              className="p-1.5 rounded-lg text-stone-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top App Bar */}
        <header className="h-16 bg-stone-900/60 border-b border-stone-800/80 px-6 flex items-center justify-between glass-panel z-10">
          <div className="flex items-center space-x-4">
            <h2 className="text-lg font-bold text-stone-100 tracking-wide">
              {navigation.find((n) => n.path === location.pathname)?.name || t('posScreen')}
            </h2>

            {/* Worldwide Branch Selector Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowBranchSelector(!showBranchSelector)}
                className="flex items-center space-x-2 px-3 py-1.5 rounded-2xl bg-amber-950/40 border border-amber-600/40 text-amber-300 text-xs font-bold hover:bg-amber-900/40 transition-colors shadow-md"
              >
                <span>{activeBranch.flag}</span>
                <span>Branch {activeBranch.code} ({activeBranch.name})</span>
                <ChevronDown className="w-3.5 h-3.5 text-amber-400" />
              </button>

              {showBranchSelector && (
                <div className="absolute top-10 left-0 w-72 bg-stone-900 border border-amber-700/40 rounded-2xl p-2 shadow-2xl space-y-1 z-50 animate-in fade-in zoom-in-95">
                  <div className="text-[10px] text-stone-400 font-semibold px-2 py-1 uppercase border-b border-stone-800">
                    Select Worldwide Branch Network
                  </div>
                  {WORLDWIDE_BRANCHES.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => handleBranchSelect(b)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-left transition-colors ${
                        activeBranch.id === b.id
                          ? 'bg-amber-600 text-stone-950 font-bold'
                          : 'text-stone-200 hover:bg-stone-800'
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

          {/* Right Header Bar: Command Palette Launcher, Quad Language Selector & Clock */}
          <div className="flex items-center space-x-3 text-sm text-stone-300">
            {/* Command Palette Ctrl+K Launcher */}
            <button
              onClick={() => setShowCommandPalette(true)}
              className="flex items-center space-x-2 px-3 py-1.5 rounded-2xl bg-stone-950 border border-stone-800 text-stone-400 hover:text-stone-200 text-xs font-semibold shadow-inner"
            >
              <Search className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden lg:inline">Quick Search...</span>
              <kbd className="px-1.5 py-0.5 rounded bg-stone-800 text-[10px] font-mono text-stone-400 border border-stone-700">
                Ctrl K
              </kbd>
            </button>

            {/* Quad Language Selector Buttons */}
            <div className="flex items-center bg-stone-950 p-1 rounded-2xl border border-stone-800 shadow-inner">
              <Globe className="w-3.5 h-3.5 text-amber-400 ml-2 mr-1" />
              {(['EN', 'KH', 'TH', 'ZH'] as Language[]).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setLanguage(lang)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all ${
                    language === lang
                      ? 'bg-amber-600 text-stone-950 shadow-md'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  {lang === 'EN' && 'EN'}
                  {lang === 'KH' && 'KH 🇰🇭'}
                  {lang === 'TH' && 'TH 🇹🇭'}
                  {lang === 'ZH' && 'ZH 🇨🇳'}
                </button>
              ))}
            </div>

            {/* Time */}
            <div className="hidden sm:flex items-center space-x-2 bg-stone-800/50 px-3 py-1.5 rounded-xl border border-stone-700/50">
              <Clock className="w-4 h-4 text-amber-400" />
              <span className="font-mono text-amber-200">
                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <main className="flex-1 overflow-y-auto p-6 bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950">
          {children}
        </main>
      </div>

      {/* Global Command Palette */}
      <CommandPalette
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
      />
    </div>
  );
};
