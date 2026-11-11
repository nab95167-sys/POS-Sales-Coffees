import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Award,
  CheckCircle2,
  Clock,
  Edit3,
  Key,
  Lock,
  Mail,
  Moon,
  MoreVertical,
  Phone,
  Power,
  RefreshCw,
  Search,
  Shield,
  Sun,
  Sunrise,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { Role, StaffMember } from '../types';
import { apiFetch, ApiError } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { showToastNotification } from '../services/telegramBotService';
import { PageHeader } from '../components/ui/PageHeader';
import { StatCard } from '../components/ui/StatCard';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { RoleManagementModal } from '../components/employees/RoleManagementModal';
import { UserPermissionModal } from '../components/employees/UserPermissionModal';
import { StaffFormModal, StaffFormPayload } from '../components/employees/StaffFormModal';

const ROLE_STYLES: Record<Role, string> = {
  ADMIN: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  MANAGER: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
  CASHIER: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  BARISTA: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
};

const STATUS_STYLES: Record<StaffMember['status'], { pill: string; dot: string }> = {
  Active: {
    pill: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    dot: 'bg-emerald-400',
  },
  'On Leave': {
    pill: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    dot: 'bg-amber-400',
  },
  Inactive: {
    pill: 'bg-zinc-800/80 text-zinc-400 border-zinc-700/60',
    dot: 'bg-zinc-500',
  },
};

function renderShiftBadge(shift: StaffMember['shift']) {
  if (shift === 'Morning') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-semibold">
        <Sunrise className="w-3.5 h-3.5" /> Morning
      </span>
    );
  }
  if (shift === 'Afternoon') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-300 text-xs font-semibold">
        <Sun className="w-3.5 h-3.5" /> Afternoon
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold">
      <Moon className="w-3.5 h-3.5" /> Evening
    </span>
  );
}

export const EmployeesPage: React.FC = () => {
  const { user, hasGranularPermission, refreshUser } = useAuth();
  const { t } = useLanguage();
  const canManageStaff = hasGranularPermission('staff:manage');

  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | Role>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | StaffMember['status']>('ALL');

  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuContainerRef = useRef<HTMLDivElement | null>(null);

  const [showRoleMatrix, setShowRoleMatrix] = useState(false);
  const [permissionStaff, setPermissionStaff] = useState<StaffMember | null>(null);
  const [showStaffForm, setShowStaffForm] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<StaffMember | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadStaff = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await apiFetch<{ staff: StaffMember[] }>('/api/v1/staff');
      setStaffList(res.staff || []);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to load staff roster';
      showToastNotification(msg, 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadStaff();
  }, [loadStaff]);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (menuContainerRef.current && !menuContainerRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenMenuId(null);
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, []);

  const canModifyMember = useCallback(
    (member: StaffMember) => {
      if (!canManageStaff) return false;
      if (member.role === 'ADMIN' && user?.role !== 'ADMIN') return false;
      return true;
    },
    [canManageStaff, user?.role]
  );

  const canDeleteMember = useCallback(
    (member: StaffMember) => {
      if (!canModifyMember(member)) return false;
      if (member.id === user?.id) return false;
      return true;
    },
    [canModifyMember, user?.id]
  );

  const handleSaveStaff = async (payload: StaffFormPayload) => {
    if (editingStaff) {
      const res = await apiFetch<{ staff: StaffMember }>(`/api/v1/staff/${editingStaff.id}`, {
        method: 'PUT',
        body: payload,
      });
      setStaffList((prev) => prev.map((s) => (s.id === res.staff.id ? res.staff : s)));
      if (res.staff.id === user?.id) {
        await refreshUser();
      }
      showToastNotification(`Updated ${res.staff.name}'s profile.`, 'success');
    } else {
      const res = await apiFetch<{ staff: StaffMember }>('/api/v1/staff', {
        method: 'POST',
        body: payload,
      });
      setStaffList((prev) => [res.staff, ...prev]);
      showToastNotification(`Added ${res.staff.name} to the team.`, 'success');
    }
    setShowStaffForm(false);
    setEditingStaff(null);
  };

  const handleToggleStatus = async (member: StaffMember) => {
    setOpenMenuId(null);
    if (!canModifyMember(member) || member.id === user?.id) {
      showToastNotification('You cannot change duty status for this account.', 'warning');
      return;
    }
    const nextStatus: StaffMember['status'] = member.status === 'Active' ? 'Inactive' : 'Active';
    try {
      const res = await apiFetch<{ staff: StaffMember }>(`/api/v1/staff/${member.id}`, {
        method: 'PUT',
        body: { status: nextStatus },
      });
      setStaffList((prev) => prev.map((s) => (s.id === res.staff.id ? res.staff : s)));
      showToastNotification(`${member.name} is now ${nextStatus}.`, 'success');
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Unable to update staff status';
      showToastNotification(msg, 'error');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiFetch(`/api/v1/staff/${deleteTarget.id}`, { method: 'DELETE' });
      setStaffList((prev) => prev.filter((s) => s.id !== deleteTarget.id));
      showToastNotification(`Removed ${deleteTarget.name} from staff.`, 'success');
      setDeleteTarget(null);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to delete staff member';
      showToastNotification(msg, 'error');
    } finally {
      setDeleting(false);
    }
  };

  const filteredStaff = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return staffList.filter((s) => {
      if (roleFilter !== 'ALL' && s.role !== roleFilter) return false;
      if (statusFilter !== 'ALL' && s.status !== statusFilter) return false;
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        (s.phone || '').toLowerCase().includes(q) ||
        s.role.toLowerCase().includes(q)
      );
    });
  }, [staffList, roleFilter, statusFilter, searchQuery]);

  const metrics = useMemo(() => {
    const activeCount = staffList.filter((s) => s.status === 'Active').length;
    const awayCount = staffList.filter((s) => s.status !== 'Active').length;
    const customPermsCount = staffList.filter(
      (s) => Array.isArray(s.customPermissions) && s.customPermissions.length >= 0
    ).length;
    return {
      total: staffList.length,
      active: activeCount,
      away: awayCount,
      customPerms: customPermsCount,
    };
  }, [staffList]);

  const renderActionDropdown = (member: StaffMember) => {
    const editable = canModifyMember(member);
    const deletable = canDeleteMember(member);

    return (
      <div className="relative inline-block text-left">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setOpenMenuId((prev) => (prev === member.id ? null : member.id));
          }}
          aria-label={`Actions for ${member.name}`}
          className={`p-2 rounded-xl border transition-all ${
            openMenuId === member.id
              ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
              : 'bg-zinc-900/70 border-white/10 text-zinc-400 hover:text-white hover:border-white/20'
          }`}
        >
          <MoreVertical className="w-4 h-4" />
        </button>

        {openMenuId === member.id && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute right-0 mt-2 w-56 rounded-2xl bg-[#13141c]/98 backdrop-blur-xl border border-white/15 shadow-2xl py-1.5 z-50"
          >
            {editable && (
              <button
                type="button"
                onClick={() => {
                  setOpenMenuId(null);
                  setEditingStaff(member);
                  setShowStaffForm(true);
                }}
                className="w-full px-3.5 py-2.5 text-left text-xs font-semibold text-zinc-200 hover:bg-white/10 hover:text-amber-300 flex items-center gap-2.5 transition-colors"
              >
                <Edit3 className="w-4 h-4 text-amber-400" />
                Edit Profile & Credentials
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setOpenMenuId(null);
                setPermissionStaff(member);
              }}
              className="w-full px-3.5 py-2.5 text-left text-xs font-semibold text-zinc-200 hover:bg-white/10 hover:text-amber-300 flex items-center gap-2.5 transition-colors"
            >
              <Key className="w-4 h-4 text-sky-400" />
              {editable ? 'Custom Permissions' : 'View Permissions'}
            </button>

            {editable && member.id !== user?.id && (
              <button
                type="button"
                onClick={() => void handleToggleStatus(member)}
                className="w-full px-3.5 py-2.5 text-left text-xs font-semibold text-zinc-200 hover:bg-white/10 hover:text-emerald-300 flex items-center gap-2.5 transition-colors"
              >
                <Power className="w-4 h-4 text-emerald-400" />
                {member.status === 'Active' ? 'Set Inactive (Clock Out)' : 'Set Active (Clock In)'}
              </button>
            )}

            {deletable && (
              <>
                <div className="my-1 border-t border-white/10" />
                <button
                  type="button"
                  onClick={() => {
                    setOpenMenuId(null);
                    setDeleteTarget(member);
                  }}
                  className="w-full px-3.5 py-2.5 text-left text-xs font-semibold text-red-400 hover:bg-red-500/15 flex items-center gap-2.5 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Staff Member
                </button>
              </>
            )}

            {!editable && (
              <div className="px-3.5 py-2 text-[11px] text-zinc-500 flex items-center gap-1.5 border-t border-white/10 mt-1">
                <Lock className="w-3.5 h-3.5" /> Read-only for your role
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div ref={menuContainerRef} className="space-y-6 pb-20 lg:pb-8">
      <PageHeader
        icon={<Users className="w-6 h-6" />}
        title={t('staff')}
        subtitle={t('staffSub')}
        badge="HR & RBAC"
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => void loadStaff(true)}
              disabled={refreshing}
              className="px-3.5 py-2.5 rounded-xl bg-zinc-900/70 hover:bg-zinc-800 border border-white/10 text-zinc-200 text-xs font-semibold flex items-center gap-2 transition-all disabled:opacity-60"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-amber-400' : ''}`} />
              <span className="hidden sm:inline">{t('refresh')}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowRoleMatrix(true)}
              className="px-4 py-2.5 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center gap-2 transition-all"
            >
              <Shield className="w-4 h-4" />
              Role Matrix
            </button>

            {canManageStaff && (
              <button
                type="button"
                onClick={() => {
                  setEditingStaff(null);
                  setShowStaffForm(true);
                }}
                className="px-4 py-2.5 rounded-xl gold-gradient-bg text-zinc-950 text-xs font-black flex items-center gap-2 shadow-lg shadow-amber-500/20 hover:brightness-110 transition-all"
              >
                <UserPlus className="w-4 h-4" />
                {t('addStaff')}
              </button>
            )}
          </div>
        }
      />

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label="Total Team"
          value={metrics.total}
          subtext="Registered accounts"
          icon={<Users className="w-5 h-5" />}
          accent="amber"
        />
        <StatCard
          label="Active Duty"
          value={metrics.active}
          subtext="Available for shifts"
          icon={<CheckCircle2 className="w-5 h-5" />}
          accent="emerald"
        />
        <StatCard
          label="Away / Inactive"
          value={metrics.away}
          subtext="On leave or off-duty"
          icon={<Clock className="w-5 h-5" />}
          accent="purple"
        />
        <StatCard
          label="Custom Access"
          value={metrics.customPerms}
          subtext="Individual overrides"
          icon={<Key className="w-5 h-5" />}
          accent="blue"
        />
      </div>

      {/* Filter & Search Toolbar */}
      <div className="glass-card p-3.5 sm:p-4 rounded-2xl flex flex-col xl:flex-row gap-3 xl:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search name, email, phone or role..."
            className="glass-input w-full pl-10 pr-9 py-2.5 rounded-xl text-sm text-white placeholder-zinc-500"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-200 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5 sm:items-center justify-between">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {(['ALL', 'ADMIN', 'MANAGER', 'CASHIER', 'BARISTA'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRoleFilter(r)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all border ${
                  roleFilter === r
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-zinc-900/60 text-zinc-400 border-white/10 hover:text-zinc-200'
                }`}
              >
                {r === 'ALL' ? 'All Roles' : r}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto">
            {(['ALL', 'Active', 'On Leave', 'Inactive'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border ${
                  statusFilter === st
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                    : 'bg-zinc-900/60 text-zinc-400 border-white/10 hover:text-zinc-200'
                }`}
              >
                {st === 'ALL' ? 'All Status' : st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Loading / Empty */}
      {loading ? (
        <div className="glass-card rounded-2xl p-12 text-center text-zinc-400 text-sm">
          Loading staff roster...
        </div>
      ) : filteredStaff.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center space-y-3">
          <Users className="w-10 h-10 text-zinc-600 mx-auto" />
          <p className="text-zinc-300 font-semibold">No matching staff members found</p>
          <p className="text-zinc-500 text-xs">Try adjusting your search query or filters.</p>
        </div>
      ) : (
        <>
          {/* Mobile & Tablet Cards (< lg) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 lg:hidden">
            {filteredStaff.map((member) => {
              const statusStyle = STATUS_STYLES[member.status] || STATUS_STYLES.Active;
              const isSelf = member.id === user?.id;
              const hasOverride =
                Array.isArray(member.customPermissions) && member.customPermissions.length >= 0;

              return (
                <div
                  key={member.id}
                  className={`glass-card p-4 rounded-2xl space-y-3.5 relative ${
                    openMenuId === member.id ? 'z-30' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-300 font-black text-base flex-shrink-0">
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-bold text-white text-sm truncate">{member.name}</h3>
                          {isSelf && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              You
                            </span>
                          )}
                        </div>
                        <span
                          className={`inline-flex items-center mt-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                            ROLE_STYLES[member.role]
                          }`}
                        >
                          {member.role}
                        </span>
                      </div>
                    </div>
                    {renderActionDropdown(member)}
                  </div>

                  <div className="space-y-1.5 text-xs text-zinc-400">
                    <div className="flex items-center gap-2 truncate">
                      <Mail className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
                      <span className="truncate">{member.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
                      <span>{member.phone || 'No phone set'}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-white/10">
                    <div className="flex items-center gap-2">
                      {renderShiftBadge(member.shift)}
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold ${statusStyle.pill}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
                        {member.status}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      {hasOverride && (
                        <span
                          title="Has custom permissions"
                          className="px-2 py-0.5 rounded-md bg-sky-500/15 text-sky-300 border border-sky-500/30 text-[10px] font-bold"
                        >
                          Custom
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 text-zinc-300 font-bold tabular-nums">
                        <Award className="w-3.5 h-3.5 text-amber-400" />
                        {member.salesCount || 0}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table (lg+) */}
          <div className="hidden lg:block glass-card rounded-2xl overflow-visible">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-[11px] uppercase tracking-wider text-zinc-400 font-bold">
                  <th className="py-3.5 px-5">Staff Member</th>
                  <th className="py-3.5 px-4">Role & Access</th>
                  <th className="py-3.5 px-4">Contact</th>
                  <th className="py-3.5 px-4">Shift</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Orders</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {filteredStaff.map((member) => {
                  const statusStyle = STATUS_STYLES[member.status] || STATUS_STYLES.Active;
                  const isSelf = member.id === user?.id;
                  const hasOverride =
                    Array.isArray(member.customPermissions) && member.customPermissions.length >= 0;

                  return (
                    <tr
                      key={member.id}
                      className={`hover:bg-white/[0.03] transition-colors ${
                        openMenuId === member.id ? 'relative z-30 bg-white/[0.04]' : ''
                      }`}
                    >
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-300 font-black text-sm flex-shrink-0">
                            {member.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-white">{member.name}</span>
                              {isSelf && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                  You
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-zinc-500">{member.email}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${
                              ROLE_STYLES[member.role]
                            }`}
                          >
                            {member.role}
                          </span>
                          {hasOverride && (
                            <span
                              title="Individual permission overrides active"
                              className="px-2 py-0.5 rounded-md bg-sky-500/15 text-sky-300 border border-sky-500/30 text-[10px] font-bold"
                            >
                              Custom
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-xs text-zinc-300">
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-zinc-500" />
                          <span>{member.phone || '—'}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">{renderShiftBadge(member.shift)}</td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold ${statusStyle.pill}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
                          {member.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right font-bold text-sm text-zinc-200 tabular-nums">
                        {member.salesCount || 0}
                      </td>

                      <td className="py-3.5 px-5 text-right">{renderActionDropdown(member)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Modals */}
      {showRoleMatrix && (
        <RoleManagementModal
          onClose={() => setShowRoleMatrix(false)}
          onUpdated={() => void loadStaff()}
        />
      )}

      {permissionStaff && (
        <UserPermissionModal
          staff={permissionStaff}
          onClose={() => setPermissionStaff(null)}
          onSaved={(updated) => {
            setStaffList((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
          }}
        />
      )}

      {showStaffForm && (
        <StaffFormModal
          staff={editingStaff}
          onClose={() => {
            setShowStaffForm(false);
            setEditingStaff(null);
          }}
          onSave={handleSaveStaff}
        />
      )}

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Delete Staff Member"
        message={
          deleteTarget
            ? `Are you sure you want to permanently remove "${deleteTarget.name}" (${deleteTarget.role})? Their access tokens will be revoked immediately.`
            : ''
        }
        confirmLabel="Delete Account"
        cancelLabel={t('cancel')}
        variant="danger"
        busy={deleting}
        onConfirm={() => void handleConfirmDelete()}
        onCancel={() => !deleting && setDeleteTarget(null)}
      />
    </div>
  );
};
