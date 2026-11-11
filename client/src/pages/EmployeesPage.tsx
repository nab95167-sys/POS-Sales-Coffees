import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldAlert, Plus, Users, Clock, Shield, Settings, Key, Search, Edit3, Trash2,
  Phone, Mail, ChevronDown, X, Coffee, RefreshCw
} from 'lucide-react';
import { StaffMember, Role } from '../types';
import { apiFetch, ApiError } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { RoleManagementModal } from '../components/employees/RoleManagementModal';
import { UserPermissionModal } from '../components/employees/UserPermissionModal';
import { StaffFormModal, StaffFormPayload } from '../components/employees/StaffFormModal';
import { soundEffects } from '../services/soundService';

export const EmployeesPage: React.FC = () => {
  const { user, hasGranularPermission, refreshUser } = useAuth();
  const canManageStaff = hasGranularPermission('staff:manage');

  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<'ALL' | Role>('ALL');
  const [selectedShiftFilter, setSelectedShiftFilter] = useState<'ALL' | 'Morning' | 'Afternoon' | 'Evening'>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'ALL' | 'Active' | 'On Leave' | 'Inactive'>('ALL');

  // Active Dropdown Action ID
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  // Modals state
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingUserPerms, setEditingUserPerms] = useState<StaffMember | null>(null);
  const [staffModalData, setStaffModalData] = useState<{ isOpen: boolean; staff: StaffMember | null }>({
    isOpen: false,
    staff: null,
  });

  const loadStaff = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<{ staff: StaffMember[] }>('/api/v1/staff');
      setStaffList(data.staff);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load staff directory');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.removeItem('coffee_pos_staff_members');
    } catch {
      // Ignore storage errors
    }
    void loadStaff();
  }, [loadStaff]);

  // Click outside listener for action dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.staff-action-dropdown')) {
        setOpenDropdownId(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenDropdownId(null);
    };

    document.addEventListener('click', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Filtered staff list
  const filteredStaff = staffList.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.phone.includes(searchQuery) ||
      s.role.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = selectedRoleFilter === 'ALL' || s.role === selectedRoleFilter;
    const matchesShift = selectedShiftFilter === 'ALL' || s.shift === selectedShiftFilter;
    const matchesStatus = selectedStatusFilter === 'ALL' || s.status === selectedStatusFilter;

    return matchesSearch && matchesRole && matchesShift && matchesStatus;
  });

  // KPI Metrics
  const totalEmployees = staffList.length;
  const clockedInCount = staffList.filter((s) => s.status === 'Active').length;
  const leadershipCount = staffList.filter((s) => s.role === 'ADMIN' || s.role === 'MANAGER').length;
  const frontlineCount = staffList.filter((s) => s.role === 'CASHIER' || s.role === 'BARISTA').length;

  // Handle Save (Create or Update)
  const handleSaveStaff = async (data: StaffFormPayload) => {
    setError(null);
    if (staffModalData.staff) {
      const res = await apiFetch<{ staff: StaffMember }>(`/api/v1/staff/${staffModalData.staff.id}`, {
        method: 'PUT',
        body: data,
      });
      setStaffList((prev) => prev.map((s) => (s.id === res.staff.id ? res.staff : s)));
      if (res.staff.id === user?.id) await refreshUser();
      soundEffects.playSuccess();
    } else {
      const res = await apiFetch<{ staff: StaffMember }>('/api/v1/staff', {
        method: 'POST',
        body: data,
      });
      setStaffList((prev) => [...prev, res.staff]);
      soundEffects.playSuccess();
    }
  };

  // Handle Delete Staff
  const handleDeleteStaff = async (staff: StaffMember) => {
    if (!canManageStaff || staff.id === user?.id) return;
    if (
      !confirm(
        `តើអ្នកប្រាកដជាចង់លុបបុគ្គលិក "${staff.name}" (${staff.role}) ចេញពីប្រព័ន្ធមែនទេ?\nAre you sure you want to delete staff member "${staff.name}"?`
      )
    ) {
      return;
    }

    setError(null);
    try {
      await apiFetch(`/api/v1/staff/${staff.id}`, { method: 'DELETE' });
      setStaffList((prev) => prev.filter((s) => s.id !== staff.id));
      soundEffects.playBeep();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete staff member');
    }
  };

  // Toggle Attendance
  const handleToggleAttendance = async (staff: StaffMember) => {
    if (!canManageStaff) return;
    const nextStatus = staff.status === 'Active' ? 'On Leave' : 'Active';
    setError(null);
    try {
      const res = await apiFetch<{ staff: StaffMember }>(`/api/v1/staff/${staff.id}`, {
        method: 'PUT',
        body: { status: nextStatus },
      });
      setStaffList((prev) => prev.map((s) => (s.id === res.staff.id ? res.staff : s)));
      soundEffects.playBeep();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update shift status');
    }
  };

  const roleStyles = {
    ADMIN: 'bg-purple-950/80 text-purple-300 border-purple-500/50 shadow-sm',
    MANAGER: 'bg-blue-950/80 text-blue-300 border-blue-500/50 shadow-sm',
    CASHIER: 'bg-amber-950/80 text-amber-300 border-amber-600/50 shadow-sm',
    BARISTA: 'bg-emerald-950/80 text-emerald-300 border-emerald-600/50 shadow-sm',
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-stone-900/80 p-5 rounded-3xl border border-stone-800 glass-panel shadow-xl">
        <div className="flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-700 to-amber-500 flex items-center justify-center text-stone-950 shadow-lg shadow-amber-900/30 font-bold">
            <ShieldAlert className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-black text-stone-100 tracking-tight">Staff HR & Role Matrix</h2>
              <span className="text-xs font-mono font-bold text-amber-400 bg-amber-950/80 border border-amber-800/60 px-2.5 py-0.5 rounded-full">
                {staffList.length} Accounts
              </span>
            </div>
            <p className="text-xs text-stone-400">SQLite employee accounts, shifts, RBAC policies & permission overrides</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => void loadStaff()}
            disabled={loading}
            className="px-3.5 py-2.5 rounded-2xl bg-stone-950/80 border border-stone-700 hover:bg-stone-800 text-stone-300 font-bold text-xs flex items-center space-x-1.5 transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => setShowRoleModal(true)}
            className="px-4 py-2.5 rounded-2xl bg-stone-950/80 border border-amber-600/40 hover:bg-stone-800 text-amber-300 font-bold text-xs flex items-center space-x-2 transition-all shadow-md"
          >
            <Settings className="w-4 h-4 text-amber-400" />
            <span>Manage Roles Matrix</span>
          </button>

          {canManageStaff && (
            <button
              onClick={() => setStaffModalData({ isOpen: true, staff: null })}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-stone-950 font-extrabold text-xs flex items-center space-x-2 shadow-lg shadow-amber-900/40 transition-all hover:scale-[1.02]"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Add Staff Member (បន្ថែមបុគ្គលិក)</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-2xl bg-red-950/50 border border-red-700/50 text-red-300 text-xs font-semibold">
          {error}
        </div>
      )}

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Staff */}
        <div className="p-4 rounded-3xl bg-stone-900/80 border border-stone-800 glass-card shadow-lg flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block">Total Employees</span>
            <h3 className="text-2xl font-black text-stone-100 font-mono mt-0.5">{totalEmployees}</h3>
            <span className="text-[10px] text-amber-400 font-medium">Registered on system</span>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-amber-600/20 text-amber-400 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Clocked In */}
        <div className="p-4 rounded-3xl bg-stone-900/80 border border-stone-800 glass-card shadow-lg flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block">On Duty Today</span>
            <h3 className="text-2xl font-black text-emerald-400 font-mono mt-0.5">{clockedInCount}</h3>
            <span className="text-[10px] text-emerald-400 font-medium flex items-center space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Currently Clocked In</span>
            </span>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* Leadership */}
        <div className="p-4 rounded-3xl bg-stone-900/80 border border-stone-800 glass-card shadow-lg flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block">Leadership / Admin</span>
            <h3 className="text-2xl font-black text-purple-300 font-mono mt-0.5">{leadershipCount}</h3>
            <span className="text-[10px] text-purple-400 font-medium">Admin & Managers</span>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-purple-600/20 text-purple-400 flex items-center justify-center">
            <Shield className="w-5 h-5" />
          </div>
        </div>

        {/* Frontline */}
        <div className="p-4 rounded-3xl bg-stone-900/80 border border-stone-800 glass-card shadow-lg flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block">Frontline Staff</span>
            <h3 className="text-2xl font-black text-blue-300 font-mono mt-0.5">{frontlineCount}</h3>
            <span className="text-[10px] text-blue-400 font-medium">Cashiers & Baristas</span>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-blue-600/20 text-blue-400 flex items-center justify-center">
            <Coffee className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Modern Filter & Search Controls */}
      <div className="p-4 bg-stone-900/60 border border-stone-800/80 rounded-2xl glass-panel space-y-3 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-stone-500 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search by name, email, phone, or role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 rounded-xl glass-input text-xs text-stone-100 focus:outline-none focus:border-amber-500 placeholder-stone-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-3 text-stone-500 hover:text-stone-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Dropdown Filters */}
          <div className="flex items-center space-x-2 flex-wrap gap-y-2">
            {/* Role Filter */}
            <div className="flex items-center space-x-1.5 bg-stone-950 px-2.5 py-1 rounded-xl border border-stone-800 text-xs">
              <span className="text-stone-500 font-semibold">Role:</span>
              <select
                value={selectedRoleFilter}
                onChange={(e) => setSelectedRoleFilter(e.target.value as any)}
                className="bg-transparent text-stone-200 text-xs font-bold focus:outline-none cursor-pointer"
              >
                <option value="ALL" className="bg-stone-900">All Roles</option>
                <option value="ADMIN" className="bg-stone-900">Admin</option>
                <option value="MANAGER" className="bg-stone-900">Manager</option>
                <option value="CASHIER" className="bg-stone-900">Cashier</option>
                <option value="BARISTA" className="bg-stone-900">Barista</option>
              </select>
            </div>

            {/* Shift Filter */}
            <div className="flex items-center space-x-1.5 bg-stone-950 px-2.5 py-1 rounded-xl border border-stone-800 text-xs">
              <span className="text-stone-500 font-semibold">Shift:</span>
              <select
                value={selectedShiftFilter}
                onChange={(e) => setSelectedShiftFilter(e.target.value as any)}
                className="bg-transparent text-stone-200 text-xs font-bold focus:outline-none cursor-pointer"
              >
                <option value="ALL" className="bg-stone-900">All Shifts</option>
                <option value="Morning" className="bg-stone-900">🌅 Morning (07-15)</option>
                <option value="Afternoon" className="bg-stone-900">☀️ Afternoon (14-22)</option>
                <option value="Evening" className="bg-stone-900">🌙 Evening (18-02)</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center space-x-1.5 bg-stone-950 px-2.5 py-1 rounded-xl border border-stone-800 text-xs">
              <span className="text-stone-500 font-semibold">Status:</span>
              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value as any)}
                className="bg-transparent text-stone-200 text-xs font-bold focus:outline-none cursor-pointer"
              >
                <option value="ALL" className="bg-stone-900">All Status</option>
                <option value="Active" className="bg-stone-900">🟢 Active (Clocked In)</option>
                <option value="On Leave" className="bg-stone-900">🟡 On Leave</option>
                <option value="Inactive" className="bg-stone-900">🔴 Inactive</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Staff Table with Sleek UX/UI Dropdown Actions */}
      <div className="bg-stone-900/80 border border-stone-800 rounded-3xl overflow-visible glass-panel shadow-2xl pb-16">
        <div className="overflow-x-auto overflow-y-visible">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-950/80 text-stone-400 uppercase font-semibold border-b border-stone-800">
              <tr>
                <th className="p-4">Employee</th>
                <th className="p-4">Assigned Role</th>
                <th className="p-4">Active Shift</th>
                <th className="p-4">Phone Number</th>
                <th className="p-4">Orders Processed</th>
                <th className="p-4">Shift Status</th>
                <th className="p-4 text-right">Actions (សកម្មភាព)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800/80 font-sans">
              {filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-16 text-center text-stone-500">
                    <Users className="w-12 h-12 mx-auto stroke-1 text-stone-600 mb-2" />
                    <span className="text-sm font-semibold block">No staff members match the selected filters.</span>
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedRoleFilter('ALL');
                        setSelectedShiftFilter('ALL');
                        setSelectedStatusFilter('ALL');
                      }}
                      className="mt-3 px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-amber-400 text-xs font-bold"
                    >
                      Reset All Filters
                    </button>
                  </td>
                </tr>
              ) : (
                filteredStaff.map((s, index) => {
                  const isDropdownOpen = openDropdownId === s.id;
                  const isNearBottom = index >= filteredStaff.length - 2 && filteredStaff.length > 2;

                  return (
                    <tr key={s.id} className="hover:bg-stone-800/30 transition-colors">
                      {/* Employee Profile */}
                      <td className="p-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-700 via-amber-600 to-yellow-500 text-stone-950 font-black text-sm flex items-center justify-center shadow-md shadow-amber-900/30">
                            {s.name.charAt(0)}
                          </div>
                          <div>
                            <span className="font-extrabold text-stone-100 block text-sm">{s.name}</span>
                            <span className="text-[10px] text-stone-400 flex items-center space-x-1">
                              <Mail className="w-3 h-3 text-stone-500" />
                              <span>{s.email}</span>
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Assigned Role */}
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black border ${roleStyles[s.role] || 'bg-stone-800 text-stone-300'}`}>
                          {s.role}
                        </span>
                      </td>

                      {/* Active Shift */}
                      <td className="p-4">
                        <div className="flex items-center space-x-1.5 font-semibold text-stone-300">
                          <span>
                            {s.shift === 'Morning' ? '🌅 Morning' : s.shift === 'Afternoon' ? '☀️ Afternoon' : '🌙 Evening'}
                          </span>
                        </div>
                        <span className="text-[10px] text-stone-500 block">
                          {s.shift === 'Morning' ? '07:00 AM - 03:00 PM' : s.shift === 'Afternoon' ? '02:00 PM - 10:00 PM' : '06:00 PM - 02:00 AM'}
                        </span>
                      </td>

                      {/* Phone Number */}
                      <td className="p-4 font-mono font-semibold text-stone-300">
                        <span className="flex items-center space-x-1">
                          <Phone className="w-3 h-3 text-stone-500" />
                          <span>{s.phone}</span>
                        </span>
                      </td>

                      {/* Orders Processed */}
                      <td className="p-4">
                        <span className="font-mono font-black text-amber-400 text-sm">{s.salesCount}</span>
                        <span className="text-[10px] text-stone-500 block">completed orders</span>
                      </td>

                      {/* Shift Status */}
                      <td className="p-4">
                        <span
                          className={`px-3 py-1 rounded-full text-[10px] font-bold border flex items-center space-x-1.5 w-max ${
                            s.status === 'Active'
                              ? 'bg-emerald-950/80 text-emerald-400 border-emerald-600/50 shadow-sm'
                              : s.status === 'On Leave'
                              ? 'bg-amber-950/80 text-amber-300 border-amber-600/50'
                              : 'bg-red-950/80 text-red-400 border-red-600/50'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              s.status === 'Active' ? 'bg-emerald-400 animate-pulse' : s.status === 'On Leave' ? 'bg-amber-400' : 'bg-red-400'
                            }`}
                          ></span>
                          <span>{s.status === 'Active' ? 'Clocked In (On Duty)' : s.status === 'On Leave' ? 'On Leave' : 'Clocked Out'}</span>
                        </span>
                      </td>

                      {/* Action Dropdown Menu */}
                      <td className="p-4 text-right">
                        <div className="relative inline-block text-left staff-action-dropdown">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenDropdownId(isDropdownOpen ? null : s.id);
                            }}
                            className={`flex items-center space-x-1.5 px-3 py-2 rounded-2xl border text-xs font-bold transition-all shadow-md ${
                              isDropdownOpen
                                ? 'bg-amber-600 text-stone-950 border-amber-500 ring-2 ring-amber-500/40'
                                : 'bg-stone-950/90 hover:bg-stone-800 border-stone-700/80 text-stone-200 hover:text-amber-300'
                            }`}
                          >
                            <span>Action</span>
                            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                          </button>

                          {/* Floating Dropdown Panel */}
                          {isDropdownOpen && (
                            <div
                              className={`absolute right-0 ${
                                isNearBottom ? 'bottom-full mb-2' : 'top-full mt-2'
                              } w-64 rounded-2xl bg-stone-950/95 backdrop-blur-xl border border-amber-600/40 shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150 glass-panel text-left`}
                            >
                              {/* Dropdown Employee Header */}
                              <div className="px-3 py-2 border-b border-stone-800/80 mb-1">
                                <p className="text-xs font-black text-stone-100 truncate">{s.name}</p>
                                <p className="text-[10px] text-amber-400 font-mono font-semibold">
                                  {s.role} • {s.shift} Shift
                                </p>
                              </div>

                              {/* Action 1: Edit Profile */}
                              <button
                                onClick={() => {
                                  setOpenDropdownId(null);
                                  setStaffModalData({ isOpen: true, staff: s });
                                }}
                                className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-left text-xs text-stone-200 hover:bg-amber-600/20 hover:text-amber-300 transition-colors group"
                              >
                                <Edit3 className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform shrink-0" />
                                <div>
                                  <span className="font-bold block">Edit Profile (កែប្រែ)</span>
                                  <span className="text-[10px] text-stone-400 block">Name, role, shift & phone</span>
                                </div>
                              </button>

                              {/* Action 2: User Permissions */}
                              <button
                                onClick={() => {
                                  setOpenDropdownId(null);
                                  setEditingUserPerms(s);
                                }}
                                className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-left text-xs text-stone-200 hover:bg-purple-950/40 hover:text-purple-300 transition-colors group"
                              >
                                <Key className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform shrink-0" />
                                <div>
                                  <span className="font-bold block">Permissions (កំណត់សិទ្ធិ)</span>
                                  <span className="text-[10px] text-stone-400 block">Granular RBAC overrides</span>
                                </div>
                              </button>

                              {/* Action 3: Clock In / Clock Out */}
                              {canManageStaff && (
                                <button
                                  onClick={() => {
                                    setOpenDropdownId(null);
                                    void handleToggleAttendance(s);
                                  }}
                                  className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-left text-xs text-stone-200 hover:bg-stone-800/80 transition-colors group"
                                >
                                  <Clock
                                    className={`w-4 h-4 shrink-0 ${
                                      s.status === 'Active' ? 'text-amber-400' : 'text-emerald-400'
                                    }`}
                                  />
                                  <div>
                                    <span className="font-bold block">
                                      {s.status === 'Active' ? 'Clock Out (ចេញវេន)' : 'Clock In (ចូលវេន)'}
                                    </span>
                                    <span className="text-[10px] text-stone-400 block">
                                      {s.status === 'Active' ? 'Set as On Leave / Off duty' : 'Mark as active on register'}
                                    </span>
                                  </div>
                                </button>
                              )}

                              {/* Divider */}
                              <div className="my-1 border-t border-stone-800/80"></div>

                              {/* Action 4: Delete Staff */}
                              {canManageStaff && s.id !== user?.id && !(s.role === 'ADMIN' && user?.role !== 'ADMIN') && (
                                <button
                                  onClick={() => {
                                    setOpenDropdownId(null);
                                    void handleDeleteStaff(s);
                                  }}
                                  className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-left text-xs text-red-400 hover:bg-red-950/50 hover:text-red-300 transition-colors group"
                                >
                                  <Trash2 className="w-4 h-4 text-red-400 group-hover:scale-110 transition-transform shrink-0" />
                                  <div>
                                    <span className="font-bold block">Delete Staff (លុបបុគ្គលិក)</span>
                                    <span className="text-[10px] text-red-400/70 block">Remove account permanently</span>
                                  </div>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Role Management Modal */}
      {showRoleModal && (
        <RoleManagementModal
          onClose={() => setShowRoleModal(false)}
          onUpdated={() => void loadStaff()}
        />
      )}

      {/* Individual User Permission Modal */}
      {editingUserPerms && (
        <UserPermissionModal
          staff={editingUserPerms}
          onClose={() => setEditingUserPerms(null)}
          onSaved={(updated) => {
            setStaffList((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
            setEditingUserPerms(updated);
          }}
        />
      )}

      {/* Staff Form Modal (Create & Update) */}
      {staffModalData.isOpen && (
        <StaffFormModal
          staff={staffModalData.staff}
          onClose={() => setStaffModalData({ isOpen: false, staff: null })}
          onSave={handleSaveStaff}
        />
      )}
    </div>
  );
};
