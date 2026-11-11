import React, { useEffect, useState } from 'react';
import { X, Key, Check, Save, RotateCcw, Lock } from 'lucide-react';
import { PermissionId, StaffMember } from '../../types';
import { PERMISSION_LIST } from './RoleManagementModal';
import { apiFetch, ApiError } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { soundEffects } from '../../services/soundService';

interface Props {
  staff: StaffMember;
  onClose: () => void;
  onSaved?: (updated: StaffMember) => void;
}

export const UserPermissionModal: React.FC<Props> = ({ staff, onClose, onSaved }) => {
  const { user, hasGranularPermission, refreshUser } = useAuth();
  const canEdit =
    hasGranularPermission('staff:manage') && !(staff.role === 'ADMIN' && user?.role !== 'ADMIN');

  const [userPermissions, setUserPermissions] = useState<PermissionId[]>(
    () => staff.permissions || []
  );
  const [hasCustomOverride, setHasCustomOverride] = useState<boolean>(
    Boolean(staff.customPermissions && staff.customPermissions.length >= 0)
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    try {
      localStorage.removeItem(`coffee_pos_user_perm_${staff.id}`);
    } catch {
      // Ignore storage cleanup error
    }
  }, [staff.id]);

  const handleTogglePermission = (permId: PermissionId) => {
    if (!canEdit) return;
    setUserPermissions((prev) =>
      prev.includes(permId) ? prev.filter((id) => id !== permId) : [...prev, permId]
    );
  };

  const handleSaveUserPermissions = async () => {
    if (!canEdit) return;
    setSaving(true);
    setError(null);
    try {
      const data = await apiFetch<{ staff: StaffMember }>(`/api/v1/staff/${staff.id}/permissions`, {
        method: 'PUT',
        body: { customPermissions: userPermissions },
      });
      setUserPermissions(data.staff.permissions || []);
      setHasCustomOverride(true);
      soundEffects.playSuccess();
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
      onSaved?.(data.staff);
      if (data.staff.id === user?.id) await refreshUser();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save permission overrides');
    } finally {
      setSaving(false);
    }
  };

  const handleResetToRoleDefault = async () => {
    if (!canEdit) return;
    setSaving(true);
    setError(null);
    try {
      const data = await apiFetch<{ staff: StaffMember }>(`/api/v1/staff/${staff.id}/permissions`, {
        method: 'PUT',
        body: { customPermissions: null },
      });
      setUserPermissions(data.staff.permissions || []);
      setHasCustomOverride(false);
      soundEffects.playBeep();
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
      onSaved?.(data.staff);
      if (data.staff.id === user?.id) await refreshUser();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to reset permissions');
    } finally {
      setSaving(false);
    }
  };

  const categories = ['POS Register', 'Inventory & Recipes', 'Reports & Finance', 'Administration'] as const;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md font-sans">
      <div className="bg-stone-900 border border-amber-700/40 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 glass-panel">
        {/* Header */}
        <div className="px-6 py-4 bg-stone-950 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-600/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-stone-100">Individual User Permissions</h3>
              <p className="text-xs text-stone-400">
                Server-enforced overrides for <span className="text-amber-300 font-bold">{staff.name}</span> ({staff.role})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-800 text-stone-400 hover:text-white flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* User Banner */}
        <div className="p-4 bg-stone-950/60 border-b border-stone-800 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-700 to-yellow-500 text-stone-950 font-bold flex items-center justify-center text-sm">
              {staff.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-stone-100">{staff.name}</span>
                {hasCustomOverride && (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-purple-950 text-purple-300 border border-purple-700/50">
                    Custom Override
                  </span>
                )}
              </div>
              <span className="text-[10px] text-stone-400">{staff.email} • Assigned Role: {staff.role}</span>
            </div>
          </div>

          {canEdit ? (
            <div className="flex items-center space-x-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleResetToRoleDefault()}
                className="px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 disabled:opacity-50 text-stone-300 font-bold text-xs flex items-center space-x-1"
                title="Clear custom overrides and inherit role matrix"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Role Default</span>
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleSaveUserPermissions()}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-stone-950 font-bold text-xs flex items-center space-x-1.5 transition-colors shadow-md"
              >
                {isSaved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                <span>{saving ? 'Saving...' : isSaved ? 'Saved!' : 'Save User Access'}</span>
              </button>
            </div>
          ) : (
            <span className="px-3 py-1.5 rounded-xl bg-stone-900 border border-stone-700 text-stone-400 text-[11px] font-semibold flex items-center space-x-1.5">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>Admin Protected</span>
            </span>
          )}
        </div>

        {error && (
          <div className="mx-6 mt-3 p-2.5 rounded-xl bg-red-950/60 border border-red-700/50 text-red-300 text-xs font-semibold">
            {error}
          </div>
        )}

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
                    const isChecked = userPermissions.includes(perm.id);

                    return (
                      <label
                        key={perm.id}
                        className={`p-3 rounded-2xl border flex items-start space-x-3 transition-all ${
                          canEdit ? 'cursor-pointer' : 'cursor-not-allowed opacity-75'
                        } ${
                          isChecked
                            ? 'bg-amber-950/40 border-amber-600/60 text-stone-100'
                            : 'bg-stone-950/60 border-stone-800 text-stone-500 hover:border-stone-700'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          disabled={!canEdit}
                          onChange={() => handleTogglePermission(perm.id)}
                          className="mt-0.5 rounded border-stone-700 text-amber-600 focus:ring-amber-500"
                        />
                        <div className="space-y-0.5">
                          <span className="text-xs font-bold block text-stone-200">{perm.name}</span>
                          <span className="text-[10px] text-stone-400 block leading-snug">{perm.description}</span>
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
