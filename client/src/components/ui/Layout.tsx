import React, { useState, useEffect, useRef } from 'react';
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
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  MoreHorizontal,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage, Language } from '../../context/LanguageContext';
import { WORLDWIDE_BRANCHES } from '../../services/worldwideBranches';
import { apiFetch } from '../../services/api';
import { GlobalBranch, PermissionId, Role } from '../../types';
import { CommandPalette } from './CommandPalette';

const LANG_OPTIONS: Array<{ code: Language; label: string; short: string; flag: string }> = [
  { code: 'EN', label: 'English', short: 'EN', flag: '🇺🇸' },
  { code: 'KH', label: 'ភាសាខ្មែរ', short: 'KH', flag: '🇰🇭' },
  { code: 'TH', label: 'ภาษาไทย', short: 'TH', flag: '🇹🇭' },
  { code: 'ZH', label: '中文', short: 'ZH', flag: '🇨🇳' },
];

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout, hasGranularPermission } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();

  const [currentTime, setCurrentTime] = useState(new Date());
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('coffee_pos_sidebar_collapsed') === '1';
    } catch {
      return false;
    }
  });
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [showBranchSelector, setShowBranchSelector] = useState(false);
  const [showLangSelector, setShowLangSelector] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);

  const branchMenuRef = useRef<HTMLDivElement | null>(null);
  const langMenuRef = useRef<HTMLDivElement | null>(null);

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

  // Close mobile drawer when route changes
  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  // Global Ctrl+K / Cmd+K & outside click handlers
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowCommandPalette((prev) => !prev);
      } else if (e.key === 'Escape') {
        setShowBranchSelector(false);
        setShowLangSelector(false);
        setMobileNavOpen(false);
      }
    };

    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (branchMenuRef.current && !branchMenuRef.current.contains(target)) {
        setShowBranchSelector(false);
      }
      if (langMenuRef.current && !langMenuRef.current.contains(target)) {
        setShowLangSelector(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onMouseDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onMouseDown);
    };
  }, []);

  const toggleSidebarCollapse = () => {
    const next = !sidebarCollapsed;
    setSidebarCollapsed(next);
    try {
      localStorage.setItem('coffee_pos_sidebar_collapsed', next ? '1' : '0');
    } catch {
      // Ignore storage error
    }
  };

  const handleBranchSelect = (branch: GlobalBranch) => {
    setActiveBranch(branch);
    localStorage.setItem('coffee_pos_active_branch', JSON.stringify(branch));
    setShowBranchSelector(false);
  };

  interface NavItem {
    name: string;
    path: string;
    icon: React.ComponentType<{ className?: string }>;
    roles: Role[];
    perm?: PermissionId;
    group: 'ops' | 'catalog' | 'manage';
  }

  const navigation: NavItem[] = [
    { name: t('posScreen'), path: '/pos', icon: ShoppingBag, roles: ['ADMIN', 'MANAGER', 'CASHIER'], perm: 'pos:access', group: 'ops' },
    { name: t('kitchenKds'), path: '/kds', icon: UtensilsCrossed, roles: ['ADMIN', 'MANAGER', 'BARISTA', 'CASHIER'], perm: 'pos:access', group: 'ops' },
    { name: t('tables'), path: '/tables', icon: Layers, roles: ['ADMIN', 'MANAGER', 'CASHIER'], perm: 'pos:access', group: 'ops' },
    { name: t('products'), path: '/products', icon: Coffee, roles: ['ADMIN', 'MANAGER'], group: 'catalog' },
    { name: t('inventory'), path: '/inventory', icon: Package, roles: ['ADMIN', 'MANAGER'], perm: 'inventory:view', group: 'catalog' },
    { name: t('customers'), path: '/customers', icon: Users, roles: ['ADMIN', 'MANAGER', 'CASHIER'], group: 'catalog' },
    { name: t('dashboard'), path: '/', icon: LayoutDashboard, roles: ['ADMIN', 'MANAGER'], group: 'manage' },
    { name: t('staff'), path: '/employees', icon: ShieldAlert, roles: ['ADMIN', 'MANAGER'], group: 'manage' },
    { name: t('reports'), path: '/reports', icon: BarChart3, roles: ['ADMIN', 'MANAGER'], perm: 'reports:view', group: 'manage' },
    { name: t('settings'), path: '/settings', icon: Settings, roles: ['ADMIN'], perm: 'settings:edit', group: 'manage' },
  ];

  const visibleNav = navigation.filter((item) => {
    const roleOk = Boolean(user && item.roles.includes(user.role));
    const permOk = !item.perm || hasGranularPermission(item.perm);
    return roleOk && permOk;
  });

  const navGroups: Array<{ key: NavItem['group']; label: string }> = [
    { key: 'ops', label: t('navOps') },
    { key: 'catalog', label: t('navCatalog') },
    { key: 'manage', label: t('navManage') },
  ];

  const mobileDockItems = visibleNav.slice(0, 4);
  const currentRouteTitle = navigation.find((n) => n.path === location.pathname)?.name || t('posScreen');
  const activeLangMeta = LANG_OPTIONS.find((l) => l.code === language) || LANG_OPTIONS[0];

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

  const renderSidebarBody = (compact: boolean) => (
    <>
      <div className="flex flex-col min-h-0 flex-1">
        {/* Brand Header */}
        <div className={`flex items-center ${compact ? 'justify-center px-1' : 'justify-between px-2'} py-2.5 mb-5`}>
          <Link to={user?.role === 'BARISTA' ? '/kds' : user?.role === 'CASHIER' ? '/pos' : '/'} className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl gold-gradient-bg flex items-center justify-center shadow-lg shadow-amber-500/20 border border-amber-300/40 flex-shrink-0">
              <Coffee className="w-5 h-5 text-zinc-950 stroke-[2.4]" />
            </div>
            {!compact && (
              <div className="min-w-0">
                <h1 className="font-extrabold text-sm text-zinc-100 tracking-wide leading-tight truncate">
                  {t('appName')}
                </h1>
                <span className="text-[10px] font-bold tracking-wider block mt-0.5 gold-gradient-text uppercase truncate">
                  {t('appSub')}
                </span>
              </div>
            )}
          </Link>

          {/* Collapse Button (Desktop) */}
          {!compact && (
            <button
              type="button"
              onClick={toggleSidebarCollapse}
              className="hidden lg:flex p-1.5 rounded-lg text-zinc-500 hover:text-amber-300 hover:bg-white/5 transition-colors"
              title="Collapse Sidebar"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          )}
        </div>

        {compact && (
          <button
            type="button"
            onClick={toggleSidebarCollapse}
            className="hidden lg:flex mx-auto mb-3 p-2 rounded-xl bg-zinc-900/90 border border-white/10 text-zinc-400 hover:text-amber-300 transition-colors"
            title="Expand Sidebar"
          >
            <PanelLeftOpen className="w-4 h-4" />
          </button>
        )}

        {/* Grouped Navigation */}
        <nav className="flex-1 overflow-y-auto scrollbar-none space-y-5 pr-0.5">
          {navGroups.map((group) => {
            const items = visibleNav.filter((i) => i.group === group.key);
            if (items.length === 0) return null;
            return (
              <div key={group.key} className="space-y-1">
                {!compact && (
                  <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                    {group.label}
                  </div>
                )}
                {items.map((item) => {
                  const isActive = location.pathname === item.path;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      title={compact ? item.name : undefined}
                      className={`flex items-center ${
                        compact ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2.5'
                      } rounded-xl text-xs font-semibold transition-all duration-150 ${
                        isActive
                          ? 'bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-transparent text-amber-300 border border-amber-500/30 shadow-sm'
                          : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.04] border border-transparent'
                      }`}
                    >
                      <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-amber-400' : 'text-zinc-400'}`} />
                      {!compact && <span className="truncate">{item.name}</span>}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>
      </div>

      {/* Bottom User & Security Footer */}
      <div className="pt-3 mt-3 border-t border-white/10 space-y-2.5">
        {!compact ? (
          <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/[0.03] border border-white/10 text-xs">
            <span className="flex items-center gap-1.5 text-amber-300 font-semibold">
              <Shield className="w-3.5 h-3.5 text-amber-400" />
              <span>{user?.role}</span>
            </span>
            <button
              type="button"
              onClick={() => {
                setSecFeedback(null);
                setShowSecurityModal(true);
              }}
              className="flex items-center gap-1 text-[11px] font-bold text-zinc-400 hover:text-amber-300 transition-colors"
              title="Update Password or Security PIN"
            >
              <KeyRound className="w-3 h-3" />
              <span>PIN / Key</span>
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              setSecFeedback(null);
              setShowSecurityModal(true);
            }}
            className="w-full p-2 rounded-xl bg-white/[0.03] border border-white/10 text-amber-400 hover:bg-white/[0.06] flex justify-center"
            title="Update Password or Security PIN"
          >
            <KeyRound className="w-4 h-4" />
          </button>
        )}

        <div className={`flex items-center ${compact ? 'flex-col gap-2' : 'justify-between px-1'}`}>
          <div className={`flex items-center ${compact ? 'justify-center' : 'gap-2.5 min-w-0'}`}>
            <img
              src={user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
              alt={user?.name}
              className="w-9 h-9 rounded-full object-cover border border-amber-500/40 flex-shrink-0"
            />
            {!compact && (
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-zinc-100 truncate">{user?.name}</p>
                <p className="text-[10px] text-zinc-400 truncate">{user?.email}</p>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={async () => {
              await logout();
              navigate('/login', { replace: true });
            }}
            className="p-2 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors flex-shrink-0"
            title={t('signOut')}
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-[#08090c] text-zinc-100 overflow-hidden font-sans">
      {/* Desktop Collapsible Sidebar */}
      <aside
        className={`hidden lg:flex flex-col justify-between p-3.5 border-r border-white/10 bg-[#0c0d12]/95 backdrop-blur-xl transition-all duration-200 z-20 flex-shrink-0 ${
          sidebarCollapsed ? 'w-[78px]' : 'w-64'
        }`}
      >
        {renderSidebarBody(sidebarCollapsed)}
      </aside>

      {/* Mobile / Tablet Slide-Over Navigation Drawer */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-sm"
            onClick={() => setMobileNavOpen(false)}
          />
          <aside className="relative w-72 max-w-[85vw] h-full bg-[#0c0d12] border-r border-white/10 p-4 flex flex-col justify-between z-10 shadow-2xl">
            <button
              type="button"
              onClick={() => setMobileNavOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-zinc-900 text-zinc-400 hover:text-white"
              aria-label="Close Menu"
            >
              <X className="w-4 h-4" />
            </button>
            {renderSidebarBody(false)}
          </aside>
        </div>
      )}

      {/* Main Content Shell */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Responsive Top App Bar */}
        <header className="h-14 sm:h-16 bg-[#0b0c10]/85 backdrop-blur-xl border-b border-white/10 px-3 sm:px-6 flex items-center justify-between gap-2 z-20 flex-shrink-0">
          {/* Left: Menu Trigger + Active Title + Branch */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="lg:hidden p-2 rounded-xl bg-white/[0.04] border border-white/10 text-zinc-200 hover:border-amber-500/40"
              aria-label="Open Navigation"
            >
              <Menu className="w-4 h-4" />
            </button>

            <h2 className="text-sm sm:text-base font-extrabold text-zinc-100 tracking-tight truncate">
              {currentRouteTitle}
            </h2>

            {/* Branch Selector Dropdown */}
            <div className="relative" ref={branchMenuRef}>
              <button
                type="button"
                onClick={() => setShowBranchSelector((prev) => !prev)}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 hover:border-amber-500/40 text-amber-300 text-xs font-bold transition-colors"
              >
                <span>{activeBranch.flag}</span>
                <span className="hidden sm:inline truncate max-w-[150px]">{activeBranch.name}</span>
                <span className="sm:hidden font-mono">{activeBranch.code}</span>
                <ChevronDown className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
              </button>

              {showBranchSelector && (
                <div className="absolute top-11 left-0 w-72 bg-[#12131a] border border-white/15 rounded-2xl p-2 shadow-2xl space-y-1 z-50">
                  <div className="text-[10px] text-zinc-400 font-bold px-2.5 py-1 uppercase tracking-wider border-b border-white/10">
                    Branch Network
                  </div>
                  {WORLDWIDE_BRANCHES.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => handleBranchSelect(b)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-left transition-colors ${
                        activeBranch.id === b.id
                          ? 'bg-amber-500 text-zinc-950 font-extrabold'
                          : 'text-zinc-200 hover:bg-white/[0.06]'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span>{b.flag}</span>
                        <div className="truncate">
                          <span className="block font-bold truncate">{b.name}</span>
                          <span className="text-[10px] opacity-75">{b.country} • {b.currency}</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono opacity-80">{b.code}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Utilities: Search + Language Dropdown + Clock */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={() => setShowCommandPalette(true)}
              className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 text-zinc-400 hover:text-zinc-100 hover:border-amber-500/35 text-xs font-semibold transition-colors"
              title="Quick Search (Ctrl+K)"
            >
              <Search className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden md:inline">{t('quickSearch')}</span>
              <kbd className="hidden lg:inline px-1.5 py-0.5 rounded bg-zinc-900 text-[10px] font-mono text-zinc-400 border border-white/10">
                Ctrl K
              </kbd>
            </button>

            {/* Compact Language Dropdown */}
            <div className="relative" ref={langMenuRef}>
              <button
                type="button"
                onClick={() => setShowLangSelector((prev) => !prev)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 hover:border-amber-500/40 text-xs font-bold text-zinc-200 transition-colors"
              >
                <Globe className="w-3.5 h-3.5 text-amber-400" />
                <span>{activeLangMeta.flag}</span>
                <span>{activeLangMeta.short}</span>
                <ChevronDown className="w-3 h-3 text-zinc-400" />
              </button>

              {showLangSelector && (
                <div className="absolute right-0 top-11 w-44 bg-[#12131a] border border-white/15 rounded-2xl p-1.5 shadow-2xl space-y-1 z-50">
                  {LANG_OPTIONS.map((opt) => (
                    <button
                      key={opt.code}
                      type="button"
                      onClick={() => {
                        setLanguage(opt.code);
                        setShowLangSelector(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors ${
                        language === opt.code
                          ? 'bg-amber-500 text-zinc-950 font-extrabold'
                          : 'text-zinc-200 hover:bg-white/[0.06] font-semibold'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span>{opt.flag}</span>
                        <span>{opt.label}</span>
                      </span>
                      <span className="text-[10px] font-mono opacity-80">{opt.short}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="hidden md:flex items-center gap-2 bg-white/[0.04] px-3 py-1.5 rounded-xl border border-white/10 text-xs">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-mono tabular-nums text-amber-300 font-bold">
                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>
          </div>
        </header>

        {/* Main Workspace Canvas */}
        <main
          className={`flex-1 min-h-0 ${
            location.pathname === '/pos'
              ? 'p-3 sm:p-4 overflow-hidden flex flex-col'
              : 'p-3 sm:p-5 lg:p-6 pb-24 md:pb-6 overflow-y-auto'
          }`}
        >
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation Dock (Hidden on POS when Register handles its own Cart Bar, or quick switcher) */}
      {location.pathname !== '/pos' && (
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-[#0b0c10]/95 backdrop-blur-xl border-t border-white/10 px-2 py-1.5 flex items-center justify-around safe-pb">
          {mobileDockItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center gap-0.5 px-2.5 py-1 rounded-xl text-[10px] font-bold transition-colors ${
                  isActive ? 'text-amber-400' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="truncate max-w-[68px]">{item.name}</span>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            className="flex flex-col items-center gap-0.5 px-2.5 py-1 rounded-xl text-[10px] font-bold text-zinc-400 hover:text-amber-300"
          >
            <MoreHorizontal className="w-4 h-4" />
            <span>Menu</span>
          </button>
        </nav>
      )}

      <CommandPalette
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
      />

      {/* Self-Service Password & PIN Change Modal */}
      {showSecurityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md glass-panel border border-amber-500/30 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold text-zinc-100">Account Credentials & Terminal PIN</h3>
              </div>
              <button
                onClick={() => setShowSecurityModal(false)}
                className="w-7 h-7 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex gap-2 bg-zinc-950 p-1 rounded-xl border border-white/10">
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
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs flex items-center justify-center gap-1.5"
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
