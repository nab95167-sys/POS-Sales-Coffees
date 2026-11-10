import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, Plus, Users, Clock, Shield, Award, CheckCircle2, 
  XCircle, Settings, Key, Search, Edit3, Trash2, Filter, Phone, Mail
} from 'lucide-react';
import { StaffMember, Role } from '../types';
import { INITIAL_STAFF } from '../services/mockData';
import { RoleManagementModal } from '../components/employees/RoleManagementModal';
import { UserPermissionModal } from '../components/employees/UserPermissionModal';
import { StaffFormModal } from '../components/employees/StaffFormModal';
import { soundEffects } from '../services/soundService';

const STORAGE_KEY = 'coffee_pos_staff_members';

export const EmployeesPage: React.FC = () => {
  const [staffList, setStaffList] = useState<StaffMember[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse staff', e);
    }
    return INITIAL_STAFF;
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<'ALL' | Role>('ALL');

  // Modals state
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingUserPerms, setEditingUserPerms] = useState<StaffMember | null>(null);
  const [staffModalData, setStaffModalData] = useState<{ isOpen: boolean; staff: StaffMember | null }>({
    isOpen: false,
    staff: null,
  });

  // Persist staffList changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(staffList));
  }, [staffList]);

  // Filtered staff list
  const filteredStaff = staffList.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.phone.includes(searchQuery) ||
      s.role.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = selectedRoleFilter === 'ALL' || s.role === selectedRoleFilter;

    return matchesSearch && matchesRole;
  });

  // Handle Save (Create or Update)
  const handleSaveStaff = (data: Partial<StaffMember>) => {
    if (staffModalData.staff) {
      // Update existing staff
      setStaffList((prev) =>
        prev.map((s) => (s.id === staffModalData.staff!.id ? ({ ...s, ...data } as StaffMember) : s))
      );
      soundEffects.playSuccess();
    } else {
      // Add new staff
      const newStaff: StaffMember = {
        id: `stf-${Date.now()}`,
        name: data.name || 'New Staff',
        email: data.email || 'staff@coffeepos.com',
        role: data.role || 'CASHIER',
        phone: data.phone || '+855 12 000 000',
        status: data.status || 'Active',
        shift: data.shift || 'Morning',
        salesCount: 0,
      };
      setStaffList((prev) => [newStaff, ...prev]);
      soundEffects.playSuccess();
    }
    setStaffModalData({ isOpen: false, staff: null });
  };

  // Handle Delete Staff
  const handleDeleteStaff = (staff: StaffMember) => {
    if (confirm(`តើអ្នកប្រាកដជាចង់លុបបុគ្គលិក "${staff.name}" (${staff.role}) ចេញពីប្រព័ន្ធមែនទេ?\nAre you sure you want to delete staff member "${staff.name}"?`)) {
      setStaffList((prev) => prev.filter((s) => s.id !== staff.id));
      soundEffects.playBeep();
    }
  };

  // Toggle Attendance
  const handleToggleAttendance = (id: string) => {
    soundEffects.playBeep();
    setStaffList((prev) =>
      prev.map((s) => {
        if (s.id === id) {
          const nextStatus = s.status === 'Active' ? 'On Leave' : 'Active';
          return { ...s, status: nextStatus };
        }
        return s;
      })
    );
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-stone-900/80 p-4 rounded-3xl border border-stone-800 glass-panel">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-600/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-bold text-stone-100">Staff HR & Role Matrix</h2>
              <span className="text-xs font-mono font-bold text-amber-400 bg-amber-950/70 border border-amber-900/50 px-2 py-0.5 rounded-full">
                {staffList.length} Employees
              </span>
            </div>
            <p className="text-xs text-stone-400">Manage employee accounts, shifts, edit details, delete staff & permissions</p>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => setShowRoleModal(true)}
            className="px-3.5 py-2 rounded-xl bg-stone-900 border border-amber-600/40 hover:bg-stone-800 text-amber-300 font-bold text-xs flex items-center space-x-1.5 transition-colors shadow-sm"
          >
            <Settings className="w-4 h-4 text-amber-400" />
            <span>Manage Roles Matrix</span>
          </button>

          <button
            onClick={() => setStaffModalData({ isOpen: true, staff: null })}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-stone-950 font-bold text-xs flex items-center space-x-1.5 shadow-lg shadow-amber-900/30 transition-all hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>+ Add Staff Member (បន្ថែមបុគ្គលិក)</span>
          </button>
        </div>
      </div>

      {/* Search & Role Filter Bar */}
      <div className="p-4 bg-stone-900/60 border border-stone-800/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 glass-panel">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-stone-500 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search employee by name, email, phone or role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl glass-input text-xs text-stone-100 focus:outline-none"
          />
        </div>

        <div className="flex items-center space-x-1.5 overflow-x-auto">
          <span className="text-xs text-stone-400 flex items-center space-x-1 mr-1">
            <Filter className="w-3.5 h-3.5 text-amber-400" />
            <span>Role:</span>
          </span>
          {(['ALL', 'ADMIN', 'MANAGER', 'CASHIER', 'BARISTA'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setSelectedRoleFilter(r)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                selectedRoleFilter === r
                  ? 'bg-amber-600 text-stone-950 shadow-md'
                  : 'bg-stone-950/60 text-stone-400 hover:text-stone-200 border border-stone-800'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Staff Table with Update and Delete buttons */}
      <div className="bg-stone-900/80 border border-stone-800 rounded-3xl overflow-hidden glass-panel shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-950/80 text-stone-400 uppercase font-semibold border-b border-stone-800">
              <tr>
                <th className="p-4">Employee Name</th>
                <th className="p-4">Assigned Role</th>
                <th className="p-4">Active Shift</th>
                <th className="p-4">Phone Number</th>
                <th className="p-4">Orders Processed</th>
                <th className="p-4">Shift Status</th>
                <th className="p-4 text-right">Actions (កែប្រែ / លុប / Permissions)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800/80 font-sans">
              {filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-stone-500">
                    <Users className="w-10 h-10 mx-auto stroke-1 text-stone-600 mb-2" />
                    <span>No employee records matching your filter.</span>
                  </td>
                </tr>
              ) : (
                filteredStaff.map((s) => (
                  <tr key={s.id} className="hover:bg-stone-800/30 transition-colors">
                    {/* Employee Profile */}
                    <td className="p-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-700 to-yellow-500 text-stone-950 font-bold flex items-center justify-center shadow-md">
                          {s.name.charAt(0)}
                        </div>
                        <div>
                          <span className="font-bold text-stone-100 block text-sm">{s.name}</span>
                          <span className="text-[10px] text-stone-400">{s.email}</span>
                        </div>
                      </div>
                    </td>

                    {/* Role Badge */}
                    <td className="p-4">
                      <span
                        className={`px-3 py-1 rounded-full text-[10px] font-bold border ${
                          s.role === 'ADMIN'
                            ? 'bg-purple-950 text-purple-300 border-purple-500/50'
                            : s.role === 'MANAGER'
                            ? 'bg-blue-950 text-blue-300 border-blue-500/50'
                            : s.role === 'CASHIER'
                            ? 'bg-amber-950 text-amber-300 border-amber-600/50'
                            : 'bg-stone-800 text-stone-300 border-stone-700'
                        }`}
                      >
                        {s.role}
                      </span>
                    </td>

                    {/* Shift */}
                    <td className="p-4 font-semibold text-stone-300">
                      {s.shift === 'Morning' ? '🌅 Morning' : s.shift === 'Afternoon' ? '☀️ Afternoon' : '🌙 Evening'}
                    </td>

                    {/* Phone */}
                    <td className="p-4 font-mono text-stone-400">{s.phone}</td>

                    {/* Sales Count */}
                    <td className="p-4 font-mono font-bold text-amber-400">{s.salesCount} Orders</td>

                    {/* Shift Status */}
                    <td className="p-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                          s.status === 'Active'
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                            : s.status === 'On Leave'
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : 'bg-red-500/20 text-red-400 border-red-500/40'
                        }`}
                      >
                        {s.status === 'Active' ? '🟢 Clocked In' : s.status === 'On Leave' ? '🟡 On Leave' : '🔴 Inactive'}
                      </span>
                    </td>

                    {/* Actions: Edit, Delete, Permissions, Clock */}
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        {/* UPDATE / EDIT BUTTON */}
                        <button
                          onClick={() => setStaffModalData({ isOpen: true, staff: s })}
                          className="p-1.5 rounded-xl bg-stone-800 hover:bg-amber-600 hover:text-stone-950 text-stone-300 transition-colors border border-stone-700"
                          title="Update / Edit Staff Details (កែប្រែព័ត៌មានបុគ្គលិក)"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        {/* DELETE BUTTON */}
                        <button
                          onClick={() => handleDeleteStaff(s)}
                          className="p-1.5 rounded-xl bg-stone-800 hover:bg-red-600 text-stone-300 hover:text-white transition-colors border border-stone-700"
                          title="Delete Staff Member (លុបបុគ្គលិក)"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>

                        {/* PERMISSIONS BUTTON */}
                        <button
                          onClick={() => setEditingUserPerms(s)}
                          className="px-2.5 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-amber-300 font-bold text-xs flex items-center space-x-1 border border-amber-600/30"
                          title="Configure User Specific Permissions"
                        >
                          <Key className="w-3 h-3" />
                          <span className="hidden lg:inline">Perms</span>
                        </button>

                        {/* CLOCK TOGGLE */}
                        <button
                          onClick={() => handleToggleAttendance(s.id)}
                          className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            s.status === 'Active'
                              ? 'bg-red-950/60 border border-red-600/50 text-red-300 hover:bg-red-900/60'
                              : 'bg-emerald-950/60 border border-emerald-600/50 text-emerald-300 hover:bg-emerald-900/60'
                          }`}
                        >
                          {s.status === 'Active' ? 'Clock Out' : 'Clock In'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Role Management Modal */}
      {showRoleModal && <RoleManagementModal onClose={() => setShowRoleModal(false)} />}

      {/* Individual User Permission Modal */}
      {editingUserPerms && (
        <UserPermissionModal staff={editingUserPerms} onClose={() => setEditingUserPerms(null)} />
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
