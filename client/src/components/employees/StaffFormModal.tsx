import React, { useState, useEffect } from 'react';
import { X, User, Mail, Phone, Shield, Clock, Check, Save, KeyRound, AlertTriangle } from 'lucide-react';
import { StaffMember, Role } from '../../types';
import { soundEffects } from '../../services/soundService';

interface Props {
  staff?: StaffMember | null;
  onClose: () => void;
  onSave: (staffData: Partial<StaffMember>) => void;
}

export const StaffFormModal: React.FC<Props> = ({ staff, onClose, onSave }) => {
  const isEditing = Boolean(staff);

  const [name, setName] = useState(staff?.name || '');
  const [email, setEmail] = useState(staff?.email || '');
  const [phone, setPhone] = useState(staff?.phone || '+855 ');
  const [role, setRole] = useState<Role>(staff?.role || 'CASHIER');
  const [shift, setShift] = useState<'Morning' | 'Afternoon' | 'Evening'>(staff?.shift || 'Morning');
  const [status, setStatus] = useState<'Active' | 'On Leave' | 'Inactive'>(staff?.status || 'Active');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    soundEffects.playSuccess();
    onSave({
      name: name.trim(),
      email: email.trim() || `${name.toLowerCase().replace(/\s+/g, '')}@coffeepos.com`,
      phone: phone.trim(),
      role,
      shift,
      status,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md font-sans">
      <div className="bg-stone-900 border border-amber-700/40 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 glass-panel">
        {/* Header */}
        <div className="px-6 py-4 bg-stone-950 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-600/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-100 flex items-center space-x-2">
                <span>{isEditing ? 'Edit Staff Member' : 'Add New Staff Member'}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-950/60 text-amber-400 border border-amber-700/40 font-mono">
                  {isEditing ? 'កែប្រែព័ត៌មានបុគ្គលិក' : 'បន្ថែមបុគ្គលិកថ្មី'}
                </span>
              </h2>
              <p className="text-xs text-stone-400">
                {isEditing ? `Update details, role, and shift for ${staff?.name}` : 'Create a new employee profile with role & shift assignments'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-stone-800/80 hover:bg-stone-800 text-stone-400 hover:text-stone-100 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Full Name */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-stone-300 flex items-center space-x-1.5">
              <User className="w-3.5 h-3.5 text-amber-400" />
              <span>Full Name (ឈ្មោះបុគ្គលិក) *</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Sreymom Chan, Alex Wright..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs text-stone-100 focus:outline-none focus:border-amber-500 placeholder-stone-500"
            />
          </div>

          {/* Email & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-stone-300 flex items-center space-x-1.5">
                <Mail className="w-3.5 h-3.5 text-amber-400" />
                <span>Email Address (អ៊ីមែល)</span>
              </label>
              <input
                type="email"
                placeholder="staff@coffeepos.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs text-stone-100 focus:outline-none focus:border-amber-500 placeholder-stone-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-stone-300 flex items-center space-x-1.5">
                <Phone className="w-3.5 h-3.5 text-amber-400" />
                <span>Phone Number (ទូរស័ព្ទ)</span>
              </label>
              <input
                type="text"
                placeholder="+855 12 345 678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs text-stone-100 focus:outline-none focus:border-amber-500 placeholder-stone-500"
              />
            </div>
          </div>

          {/* Role Selection */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-stone-300 flex items-center space-x-1.5">
              <Shield className="w-3.5 h-3.5 text-amber-400" />
              <span>Assigned Role (តួនាទី) *</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(['ADMIN', 'MANAGER', 'CASHIER', 'BARISTA'] as Role[]).map((r) => (
                <button
                  type="button"
                  key={r}
                  onClick={() => setRole(r)}
                  className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all border ${
                    role === r
                      ? 'bg-amber-600 text-stone-950 border-amber-500 shadow-md font-black'
                      : 'bg-stone-950/60 border-stone-800 text-stone-400 hover:text-stone-200'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Shift Selection */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-stone-300 flex items-center space-x-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>Working Shift (វេនធ្វើការ) *</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['Morning', 'Afternoon', 'Evening'] as const).map((s) => (
                <button
                  type="button"
                  key={s}
                  onClick={() => setShift(s)}
                  className={`py-2 px-2 rounded-xl text-xs font-bold transition-all border ${
                    shift === s
                      ? 'bg-amber-600 text-stone-950 border-amber-500 shadow-md'
                      : 'bg-stone-950/60 border-stone-800 text-stone-400 hover:text-stone-200'
                  }`}
                >
                  {s === 'Morning' ? '🌅 ព្រឹក (07-15)' : s === 'Afternoon' ? '☀️ រសៀល (14-22)' : '🌙 យប់ (18-02)'}
                </button>
              ))}
            </div>
          </div>

          {/* Shift Status */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-stone-300">Account Status (ស្ថានភាព)</label>
            <div className="grid grid-cols-3 gap-2">
              {(['Active', 'On Leave', 'Inactive'] as const).map((st) => (
                <button
                  type="button"
                  key={st}
                  onClick={() => setStatus(st)}
                  className={`py-2 px-2 rounded-xl text-xs font-bold transition-all border ${
                    status === st
                      ? st === 'Active'
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-500 shadow-md'
                        : st === 'On Leave'
                        ? 'bg-amber-950 text-amber-300 border-amber-500 shadow-md'
                        : 'bg-red-950 text-red-300 border-red-500 shadow-md'
                      : 'bg-stone-950/60 border-stone-800 text-stone-500 hover:text-stone-300'
                  }`}
                >
                  {st === 'Active' ? '🟢 Active' : st === 'On Leave' ? '🟡 On Leave' : '🔴 Inactive'}
                </button>
              ))}
            </div>
          </div>

          {/* Footer Submit Buttons */}
          <div className="pt-4 border-t border-stone-800 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-bold transition-colors"
            >
              បោះបង់ (Cancel)
            </button>

            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-stone-950 font-bold text-xs flex items-center space-x-1.5 shadow-lg shadow-amber-900/40 transition-all hover:scale-[1.02]"
            >
              <Save className="w-4 h-4" />
              <span>{isEditing ? 'រក្សាទុកការកែប្រែ (Update Staff)' : 'បន្ថែមបុគ្គលិក (Create Staff)'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
