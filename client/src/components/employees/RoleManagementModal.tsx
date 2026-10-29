import React, { useState } from 'react';
import { X, ShieldCheck, Check, Save, Lock, UserCheck } from 'lucide-react';
import { Role } from '../../types';

interface Props {
  onClose: () => void;
}

export interface PermissionItem {
  id: string;
  category: 'POS Register' | 'Inventory & Recipes' | 'Reports & Finance' | 'Administration';
  name: string;
  description: string;
}

export const PERMISSION_LIST: PermissionItem[] = [
  { id: 'pos:access', category: 'POS Register', name: 'Access POS Register', description: 'Take customer orders & process payments' },
  { id: 'pos:discount', category: 'POS Register', name: 'Apply Discounts & Promo Codes', description: 'Apply manual percentage discounts or promo coupons' },
  { id: 'pos:void', category: 'POS Register', name: 'Void & Refund Orders', description: 'Cancel pending orders or process customer refunds' },
  { id: 'pos:shift_manage', category: 'POS Register', name: 'Shift Open / Close Reconciliation', description: 'Manage starting cash float and count shift end cash' },
  { id: 'inventory:view', category: 'Inventory & Recipes', name: 'View Raw Materials Stock', description: 'Check ingredient levels and low stock warnings' },
  { id: 'inventory:edit', category: 'Inventory & Recipes', name: 'Adjust & Restock Ingredients', description: 'Perform stock-in purchase orders and inventory adjustments' },
  { id: 'reports:view', category: 'Reports & Finance', name: 'View Financial & P&L Reports', description: 'Access revenue charts, best sellers, and gross profit metrics' },
  { id: 'reports:export', category: 'Reports & Finance', name: 'Export PDF & CSV Statements', description: 'Print official financial statements and download CSV reports' },
  { id: 'staff:manage', category: 'Administration', name: 'Manage Staff & Roles', description: 'Add staff members, clock in/out, and edit role permissions' },
  { id: 'settings:edit', category: 'Administration', name: 'Edit Store & Telegram Settings', description: 'Configure bot token, taxes, currencies, and shop metadata' },
];

export const RoleManagementModal: React.FC<Props> = ({ onClose }) => {
  const [selectedRole, setSelectedRole] = useState<Role>('CASHIER');
  
  // Interactive Permission Matrix State
  const [rolePermissions, setRolePermissions] = useState<Record<Role, string[]>>(() => {
    const saved = localStorage.getItem('coffee_pos_rbac_permissions');
    if (saved) return JSON.parse(saved);
    return {
      ADMIN: PERMISSION_LIST.map((p) => p.id),
      MANAGER: [
        'pos:access', 'pos:discount', 'pos:void', 'pos:shift_manage',
        'inventory:view', 'inventory:edit', 'reports:view', 'reports:export'
      ],
      CASHIER: ['pos:access', 'pos:discount', 'pos:shift_manage', 'inventory:view'],
      BARISTA: ['pos:access', 'inventory:view'],
    };
  });

  const [isSaved, setIsSaved] = useState(false);

  const handleTogglePermission = (permId: string) => {
    setRolePermissions((prev) => {
      const currentList = prev[selectedRole] || [];
      const hasPerm = currentList.includes(permId);
      const updatedList = hasPerm
        ? currentList.filter((id) => id !== permId)
        : [...currentList, permId];

      return {
        ...prev,
        [selectedRole]: updatedList,
      };
    });
  };

  const handleSavePermissions = () => {
    localStorage.setItem('coffee_pos_rbac_permissions', JSON.stringify(rolePermissions));
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const categories = ['POS Register', 'Inventory & Recipes', 'Reports & Finance', 'Administration'] as const;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md font-sans">
      <div className="bg-stone-900 border border-amber-700/40 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 glass-panel">
        {/* Header */}
        <div className="px-6 py-4 bg-stone-950 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-600/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-stone-100">RBAC Role & Permission Matrix</h3>
              <p className="text-xs text-stone-400">Configure granular feature access for ADMIN, MANAGER, CASHIER, and BARISTA</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-800 text-stone-400 hover:text-white flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Role Selector Tabs & Save Bar */}
        <div className="p-4 bg-stone-950/60 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {(['ADMIN', 'MANAGER', 'CASHIER', 'BARISTA'] as Role[]).map((r) => (
              <button
                key={r}
                onClick={() => setSelectedRole(r)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  selectedRole === r
                    ? 'bg-amber-600 text-stone-950 shadow-md'
                    : 'bg-stone-900 border border-stone-800 text-stone-400 hover:text-stone-200'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          <button
            onClick={handleSavePermissions}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs flex items-center space-x-1.5 transition-colors shadow-md"
          >
            {isSaved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            <span>{isSaved ? 'Permissions Saved!' : 'Save Role Matrix'}</span>
          </button>
        </div>

        {/* Permission List Grid */}
        <div className="p-6 max-h-[60vh] overflow-y-auto space-y-6">
          {categories.map((cat) => {
            const catPerms = PERMISSION_LIST.filter((p) => p.category === cat);
            return (
              <div key={cat} className="space-y-3">
                <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider border-b border-stone-800 pb-1">
                  {cat}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {catPerms.map((perm) => {
                    const isChecked = rolePermissions[selectedRole]?.includes(perm.id);

                    return (
                      <label
                        key={perm.id}
                        onClick={() => handleTogglePermission(perm.id)}
                        className={`p-3.5 rounded-2xl border flex items-start space-x-3 cursor-pointer transition-all ${
                          isChecked
                            ? 'bg-amber-950/40 border-amber-600/60 text-stone-100'
                            : 'bg-stone-950/60 border-stone-800 text-stone-500 hover:border-stone-700'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="mt-0.5 rounded border-stone-700 text-amber-600 focus:ring-amber-500"
                        />
                        <div className="space-y-0.5">
                          <span className="text-xs font-bold block text-stone-200">{perm.name}</span>
                          <span className="text-[11px] text-stone-400 block leading-snug">{perm.description}</span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
