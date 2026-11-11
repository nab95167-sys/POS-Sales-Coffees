import React, { useEffect, useState } from 'react';
import { X, ShieldCheck, Check, Save, Lock, Edit3 } from 'lucide-react';
import { PermissionId, Role, RoleConfigDTO } from '../../types';
import { apiFetch, ApiError } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { soundEffects } from '../../services/soundService';

interface Props {
  onClose: () => void;
  onUpdated?: () => void;
}

export interface PermissionItem {
  id: PermissionId;
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

const DEFAULT_ROLE_NOTES: Record<Role, string> = {
  ADMIN: 'Full root access to all system modules, finances, settings, and staff HR.',
  MANAGER: 'Authorizes voids, petty cash, discounts, shift handover, inventory restocking and reports.',
  CASHIER: 'Front counter operations: Ringing up sales, taking cash & ABA KHQR payments, and customer care.',
  BARISTA: 'Kitchen Display System (KDS) order fulfillment, drink brewing, and recipe stock checks.',
};

const DEFAULT_ROLE_PERMS: Record<Role, PermissionId[]> = {
  ADMIN: PERMISSION_LIST.map((p) => p.id),
  MANAGER: [
    'pos:access', 'pos:discount', 'pos:void', 'pos:shift_manage',
    'inventory:view', 'inventory:edit', 'reports:view', 'reports:export',
  ],
  CASHIER: ['pos:access', 'pos:shift_manage', 'inventory:view'],
  BARISTA: ['pos:access', 'inventory:view'],
};

export const RoleManagementModal: React.FC<Props> = ({ onClose, onUpdated }) => {
  const { user, refreshUser } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [selectedRole, setSelectedRole] = useState<Role>('CASHIER');
  const [roleNotes, setRoleNotes] = useState<Record<Role, string>>(DEFAULT_ROLE_NOTES);
  const [rolePermissions, setRolePermissions] = useState<Record<Role, PermissionId[]>>(DEFAULT_ROLE_PERMS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    try {
      localStorage.removeItem('coffee_pos_rbac_permissions');
      localStorage.removeItem('coffee_pos_role_notes');
    } catch {
      // Ignore storage errors
    }

    let cancelled = false;
    const loadRoles = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await apiFetch<{ roles: RoleConfigDTO[] }>('/api/v1/staff/roles');
        if (cancelled) return;
        const notesMap = { ...DEFAULT_ROLE_NOTES };
        const permsMap = { ...DEFAULT_ROLE_PERMS };
        for (const r of data.roles) {
          notesMap[r.role] = r.notes;
          permsMap[r.role] = r.permissions;
        }
        setRoleNotes(notesMap);
        setRolePermissions(permsMap);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : 'Failed to load role matrix');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void loadRoles();
    return () => {
      cancelled = true;
    };
  }, []);

  const canEditSelected = isAdmin && selectedRole !== 'ADMIN';

  const handleTogglePermission = (permId: PermissionId) => {
    if (!canEditSelected) return;
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

  const handleGrantAll = () => {
    if (!canEditSelected) return;
    soundEffects.playBeep();
    setRolePermissions((prev) => ({
      ...prev,
      [selectedRole]: PERMISSION_LIST.map((p) => p.id),
    }));
  };

  const handleRevokeAll = () => {
    if (!canEditSelected) return;
    soundEffects.playBeep();
    setRolePermissions((prev) => ({
      ...prev,
      [selectedRole]: [],
    }));
  };

  const handleResetDefaults = () => {
    if (!isAdmin) return;
    if (confirm(`Reset ${selectedRole} permissions & note back to system factory defaults?`)) {
      soundEffects.playBeep();
      setRolePermissions((prev) => ({
        ...prev,
        [selectedRole]: DEFAULT_ROLE_PERMS[selectedRole],
      }));
      setRoleNotes((prev) => ({
        ...prev,
        [selectedRole]: DEFAULT_ROLE_NOTES[selectedRole],
      }));
    }
  };

  const handleSavePermissions = async () => {
    if (!isAdmin) return;
    setSaving(true);
    setError(null);
    try {
      const data = await apiFetch<{ role: RoleConfigDTO }>(`/api/v1/staff/roles/${selectedRole}`, {
        method: 'PUT',
        body: {
          notes: roleNotes[selectedRole] || '',
          permissions: rolePermissions[selectedRole] || [],
        },
      });
      setRoleNotes((prev) => ({ ...prev, [selectedRole]: data.role.notes }));
      setRolePermissions((prev) => ({ ...prev, [selectedRole]: data.role.permissions }));
      soundEffects.playSuccess();
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
      await refreshUser();
      onUpdated?.();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save role policy');
    } finally {
      setSaving(false);
    }
  };

  const categories = ['POS Register', 'Inventory & Recipes', 'Reports & Finance', 'Administration'] as const;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md font-sans">
      <div className="bg-stone-900 border border-amber-700/40 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 glass-panel">
        {/* Header */}
        <div className="px-6 py-4 bg-stone-950 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-600/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-stone-100 flex items-center space-x-2">
                <span>Role Matrix & Permissions</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-950/60 text-amber-400 border border-amber-700/40 font-mono">
                  Server-Enforced RBAC
                </span>
              </h3>
              <p className="text-xs text-stone-400">Configure feature access, privileges & role operational notes in SQLite</p>
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
        <div className="p-4 bg-stone-950/60 border-b border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2 overflow-x-auto">
            {(['ADMIN', 'MANAGER', 'CASHIER', 'BARISTA'] as Role[]).map((r) => (
              <button
                key={r}
                onClick={() => setSelectedRole(r)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                  selectedRole === r
                    ? 'bg-amber-600 text-stone-950 border-amber-500 shadow-md font-black'
                    : 'bg-stone-900 border-stone-800 text-stone-400 hover:text-stone-200'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          <div className="flex items-center space-x-2">
            {isAdmin ? (
              <button
                onClick={() => void handleSavePermissions()}
                disabled={saving || loading}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-stone-950 font-bold text-xs flex items-center space-x-1.5 transition-colors shadow-md"
              >
                {isSaved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                <span>{saving ? 'Saving...' : isSaved ? 'រក្សាទុកជោគជ័យ!' : 'Save Role Matrix'}</span>
              </button>
            ) : (
              <span className="px-3 py-1.5 rounded-xl bg-stone-900 border border-stone-700 text-stone-400 text-[11px] font-semibold flex items-center space-x-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <span>Admin Read-Only Policy</span>
              </span>
            )}
          </div>
        </div>

        {error && (
          <div className="mx-6 mt-3 p-2.5 rounded-xl bg-red-950/60 border border-red-700/50 text-red-300 text-xs font-semibold">
            {error}
          </div>
        )}

        {/* Role Note & Quick Permission Toggles */}
        <div className="p-4 bg-stone-950/40 border-b border-stone-800/80 space-y-2.5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <label className="text-xs font-bold text-stone-300 flex items-center space-x-1.5">
              <Edit3 className="w-3.5 h-3.5 text-amber-400" />
              <span>Role Operational Note / Description for {selectedRole}:</span>
            </label>

            {isAdmin && (
              <div className="flex items-center space-x-1.5 text-xs">
                <button
                  type="button"
                  onClick={handleGrantAll}
                  disabled={!canEditSelected}
                  className="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 disabled:opacity-40 text-emerald-400 text-[11px] font-semibold transition-colors"
                  title="Grant all permissions to this role"
                >
                  Grant All
                </button>
                <button
                  type="button"
                  onClick={handleRevokeAll}
                  disabled={!canEditSelected}
                  className="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 disabled:opacity-40 text-red-400 text-[11px] font-semibold transition-colors"
                  title="Revoke all permissions from this role"
                >
                  Clear All
                </button>
                <button
                  type="button"
                  onClick={handleResetDefaults}
                  className="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-400 text-[11px] font-semibold transition-colors"
                  title="Reset to default permissions"
                >
                  Reset Default
                </button>
              </div>
            )}
          </div>

          <input
            type="text"
            value={roleNotes[selectedRole] || ''}
            disabled={!isAdmin}
            onChange={(e) =>
              setRoleNotes((prev) => ({
                ...prev,
                [selectedRole]: e.target.value,
              }))
            }
            placeholder="Add operational notes or duty scope for this role..."
            className="w-full px-3.5 py-2 rounded-xl glass-input text-xs text-stone-200 focus:outline-none focus:border-amber-500 placeholder-stone-600 disabled:opacity-60"
          />
          {selectedRole === 'ADMIN' && (
            <p className="text-[11px] text-amber-400/80">
              Administrator always retains full system permissions on the server.
            </p>
          )}
        </div>

        {/* Permission List Grid */}
        <div className="p-6 max-h-[50vh] overflow-y-auto space-y-6">
          {loading ? (
            <div className="py-8 text-center text-xs text-stone-400">Loading role policies...</div>
          ) : (
            categories.map((cat) => {
              const catPerms = PERMISSION_LIST.filter((p) => p.category === cat);
              return (
                <div key={cat} className="space-y-3">
                  <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider border-b border-stone-800 pb-1">
                    {cat}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {catPerms.map((perm) => {
                      const isChecked = rolePermissions[selectedRole]?.includes(perm.id) ?? false;

                      return (
                        <label
                          key={perm.id}
                          className={`p-3.5 rounded-2xl border flex items-start space-x-3 transition-all ${
                            canEditSelected ? 'cursor-pointer' : 'cursor-not-allowed opacity-75'
                          } ${
                            isChecked
                              ? 'bg-amber-950/40 border-amber-600/60 text-stone-100'
                              : 'bg-stone-950/60 border-stone-800 text-stone-500 hover:border-stone-700'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            disabled={!canEditSelected}
                            onChange={() => handleTogglePermission(perm.id)}
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
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-stone-950 border-t border-stone-800 flex items-center justify-between text-xs text-stone-500">
          <span>{rolePermissions[selectedRole]?.length || 0} permissions active for {selectedRole}</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold"
          >
            បិទ (Close)
          </button>
        </div>
      </div>
    </div>
  );
};
