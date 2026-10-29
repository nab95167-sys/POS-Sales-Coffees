import React, { useState } from 'react';
import { X, Key, ShieldCheck, Check, Save, User } from 'lucide-react';
import { StaffMember } from '../../types';
import { PERMISSION_LIST } from './RoleManagementModal';

interface Props {
  staff: StaffMember;
  onClose: () => void;
}

export const UserPermissionModal: React.FC<Props> = ({ staff, onClose }) => {
  const [userPermissions, setUserPermissions] = useState<string[]>(() => {
    const saved = localStorage.getItem(`coffee_pos_user_perm_${staff.id}`);
    if (saved) return JSON.parse(saved);
    // Default fallback based on role
    return staff.role === 'ADMIN'
      ? PERMISSION_LIST.map((p) => p.id)
      : staff.role === 'MANAGER'
      ? ['pos:access', 'pos:discount', 'pos:void', 'pos:shift_manage', 'inventory:view', 'inventory:edit']
      : ['pos:access', 'pos:discount', 'pos:shift_manage'];
  });

  const [isSaved, setIsSaved] = useState(false);

  const handleTogglePermission = (permId: string) => {
    setUserPermissions((prev) =>
      prev.includes(permId) ? prev.filter((id) => id !== permId) : [...prev, permId]
    );
  };

  const handleSaveUserPermissions = () => {
    localStorage.setItem(`coffee_pos_user_perm_${staff.id}`, JSON.stringify(userPermissions));
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
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
                Custom permission overrides for <span className="text-amber-300 font-bold">{staff.name}</span> ({staff.role})
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
        <div className="p-4 bg-stone-950/60 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-700 to-yellow-500 text-stone-950 font-bold flex items-center justify-center text-sm">
              {staff.name.charAt(0)}
            </div>
            <div>
              <span className="text-xs font-bold text-stone-100 block">{staff.name}</span>
              <span className="text-[10px] text-stone-400">{staff.email} • Assigned Role: {staff.role}</span>
            </div>
          </div>

          <button
            onClick={handleSaveUserPermissions}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs flex items-center space-x-1.5 transition-colors shadow-md"
          >
            {isSaved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            <span>{isSaved ? 'Saved!' : 'Save User Access'}</span>
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
                    const isChecked = userPermissions.includes(perm.id);

                    return (
                      <label
                        key={perm.id}
                        onClick={() => handleTogglePermission(perm.id)}
                        className={`p-3 rounded-2xl border flex items-start space-x-3 cursor-pointer transition-all ${
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
