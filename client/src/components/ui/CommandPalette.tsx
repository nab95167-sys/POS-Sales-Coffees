import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, ShoppingBag, UtensilsCrossed, Layers, LayoutDashboard, 
  Coffee, Package, Users, ShieldAlert, BarChart3, Settings, X, Command, ArrowRight
} from 'lucide-react';
import { INITIAL_PRODUCTS } from '../../services/mockData';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const CommandPalette: React.FC<Props> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          // Trigger open via state in parent or keyboard listener
        }
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const navigationCommands = [
    { name: 'POS Register', path: '/pos', icon: ShoppingBag, category: 'Navigation' },
    { name: 'Kitchen KDS Display', path: '/kds', icon: UtensilsCrossed, category: 'Navigation' },
    { name: 'Dining Floor Plan & Tables', path: '/tables', icon: Layers, category: 'Navigation' },
    { name: 'Executive Dashboard', path: '/', icon: LayoutDashboard, category: 'Navigation' },
    { name: 'Product Menu Catalog', path: '/products', icon: Coffee, category: 'Navigation' },
    { name: 'Inventory & Raw Materials', path: '/inventory', icon: Package, category: 'Navigation' },
    { name: 'Customer Loyalty CRM', path: '/customers', icon: Users, category: 'Navigation' },
    { name: 'Staff & Security Roles', path: '/employees', icon: ShieldAlert, category: 'Navigation' },
    { name: 'Financial & Sales Reports', path: '/reports', icon: BarChart3, category: 'Navigation' },
    { name: 'Store Settings', path: '/settings', icon: Settings, category: 'Navigation' },
  ];

  const filteredNav = navigationCommands.filter((cmd) =>
    cmd.name.toLowerCase().includes(query.toLowerCase())
  );

  const filteredProducts = INITIAL_PRODUCTS.filter((p) =>
    p.name.toLowerCase().includes(query.toLowerCase()) || p.sku.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelectNav = (path: string) => {
    navigate(path);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-black/80 backdrop-blur-md font-sans">
      <div className="bg-stone-900 border border-amber-700/50 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 glass-panel">
        {/* Search Bar Input */}
        <div className="px-5 py-4 border-b border-stone-800 flex items-center space-x-3 bg-stone-950">
          <Search className="w-5 h-5 text-amber-400" />
          <input
            type="text"
            autoFocus
            placeholder="Type a command or search drinks (Press Esc to close)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-stone-100 text-sm focus:outline-none placeholder:text-stone-500"
          />
          <kbd className="px-2 py-0.5 rounded bg-stone-800 border border-stone-700 text-[10px] font-mono text-stone-400">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="p-3 max-h-96 overflow-y-auto space-y-4">
          {/* Navigation Section */}
          {filteredNav.length > 0 && (
            <div>
              <div className="text-[10px] font-bold text-stone-500 uppercase px-3 py-1 tracking-wider">
                System Navigation
              </div>
              <div className="space-y-1 mt-1">
                {filteredNav.map((cmd) => {
                  const Icon = cmd.icon;
                  return (
                    <button
                      key={cmd.path}
                      onClick={() => handleSelectNav(cmd.path)}
                      className="w-full flex items-center justify-between p-3 rounded-2xl text-left hover:bg-stone-800/80 transition-colors group"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-xl bg-stone-800 flex items-center justify-center text-amber-400 group-hover:bg-amber-600 group-hover:text-stone-950 transition-colors">
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-bold text-stone-200 group-hover:text-amber-300">
                          {cmd.name}
                        </span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-stone-600 group-hover:text-amber-400 transition-colors" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Products Section */}
          {query.length > 0 && filteredProducts.length > 0 && (
            <div>
              <div className="text-[10px] font-bold text-stone-500 uppercase px-3 py-1 tracking-wider">
                Drink & Menu Search ({filteredProducts.length})
              </div>
              <div className="space-y-1 mt-1">
                {filteredProducts.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => {
                      navigate('/pos');
                      onClose();
                    }}
                    className="w-full flex items-center justify-between p-3 rounded-2xl text-left hover:bg-stone-800/80 transition-colors group"
                  >
                    <div className="flex items-center space-x-3">
                      <img src={product.image} alt={product.name} className="w-8 h-8 rounded-lg object-cover" />
                      <div>
                        <span className="text-xs font-bold text-stone-200 block">{product.name}</span>
                        <span className="text-[10px] text-stone-400 font-mono">{product.sku}</span>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-amber-400 font-mono">${product.sellingPrice.toFixed(2)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
