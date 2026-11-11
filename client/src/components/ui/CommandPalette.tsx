import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, ShoppingBag, UtensilsCrossed, Layers, LayoutDashboard,
  Coffee, Package, Users, ShieldAlert, BarChart3, Settings, ArrowRight
} from 'lucide-react';
import { useProducts } from '../../context/ProductContext';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { PermissionId, Role } from '../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const CommandPalette: React.FC<Props> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const { products } = useProducts();
  const { user, hasGranularPermission } = useAuth();
  const { t } = useLanguage();

  useEffect(() => {
    if (!isOpen) return;
    setQuery('');
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const navigationCommands: Array<{
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

  const allowedNav = navigationCommands.filter((cmd) => {
    const roleOk = Boolean(user && cmd.roles.includes(user.role));
    const permOk = !cmd.perm || hasGranularPermission(cmd.perm);
    return roleOk && permOk;
  });

  const filteredNav = allowedNav.filter((cmd) =>
    cmd.name.toLowerCase().includes(query.toLowerCase())
  );

  const filteredProducts = products
    .filter(
      (p) =>
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.sku.toLowerCase().includes(query.toLowerCase())
    )
    .slice(0, 12);

  const handleSelectNav = (path: string) => {
    navigate(path);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-20 p-4 bg-black/80 backdrop-blur-md font-sans"
      onClick={onClose}
    >
      <div
        className="glass-panel border border-amber-500/35 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Bar */}
        <div className="px-4 py-3.5 border-b border-white/10 flex items-center gap-3 bg-[#0c0d12]">
          <Search className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <input
            type="text"
            autoFocus
            placeholder={t('searchPlaceholder')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-zinc-100 text-sm focus:outline-none placeholder:text-zinc-500"
          />
          <kbd className="px-2 py-0.5 rounded bg-zinc-900 border border-white/10 text-[10px] font-mono text-zinc-400">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="p-2.5 max-h-96 overflow-y-auto space-y-4">
          {filteredNav.length > 0 && (
            <div>
              <div className="text-[10px] font-bold text-zinc-500 uppercase px-2.5 py-1 tracking-wider">
                Navigation
              </div>
              <div className="space-y-1 mt-1">
                {filteredNav.map((cmd) => {
                  const Icon = cmd.icon;
                  return (
                    <button
                      key={cmd.path}
                      onClick={() => handleSelectNav(cmd.path)}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl text-left hover:bg-white/[0.06] transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-white/10 flex items-center justify-center text-amber-400 group-hover:bg-amber-500 group-hover:text-zinc-950 transition-colors">
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-bold text-zinc-200 group-hover:text-amber-300">
                          {cmd.name}
                        </span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-amber-400 transition-colors" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {query.length > 0 && filteredProducts.length > 0 && (
            <div>
              <div className="text-[10px] font-bold text-zinc-500 uppercase px-2.5 py-1 tracking-wider">
                Menu Items ({filteredProducts.length})
              </div>
              <div className="space-y-1 mt-1">
                {filteredProducts.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => {
                      navigate('/pos');
                      onClose();
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl text-left hover:bg-white/[0.06] transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img src={product.image} alt={product.name} className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-zinc-100 block truncate">{product.name}</span>
                        <span className="text-[10px] text-zinc-400 font-mono">{product.sku}</span>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-amber-400 font-mono ml-2">${product.sellingPrice.toFixed(2)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {filteredNav.length === 0 && (query.length === 0 || filteredProducts.length === 0) && (
            <div className="py-10 text-center text-xs text-zinc-500">
              No matching views or menu items found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
