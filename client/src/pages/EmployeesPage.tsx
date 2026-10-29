import React, { useState } from 'react';
import { ShieldAlert, Plus, Users, Clock, Shield, Award, CheckCircle2, XCircle, Settings, Key } from 'lucide-react';
import { StaffMember, Role } from '../types';
import { INITIAL_STAFF } from '../services/mockData';
import { RoleManagementModal } from '../components/employees/RoleManagementModal';
import { UserPermissionModal } from '../components/employees/UserPermissionModal';

export const EmployeesPage: React.FC = () => {
  const [staffList, setStaffList] = useState<StaffMember[]>(INITIAL_STAFF);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingUserPerms, setEditingUserPerms] = useState<StaffMember | null>(null);

  const handleToggleAttendance = (id: string) => {
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
            <h2 className="text-xl font-bold text-stone-100">Staff HR & Security Role Matrix</h2>
            <p className="text-xs text-stone-400">Manage employee shifts, attendance clocking, commission & individual user permissions</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowRoleModal(true)}
            className="px-4 py-2 rounded-xl bg-stone-900 border border-amber-600/40 hover:bg-stone-800 text-amber-300 font-bold text-xs flex items-center space-x-1.5 transition-colors"
          >
            <Settings className="w-4 h-4 text-amber-400" />
            <span>Manage Global Role Matrix</span>
          </button>

          <button
            onClick={() => {
              const name = prompt('Employee Name:');
              const email = prompt('Email Address:');
              if (name && email) {
                const newStaff: StaffMember = {
                  id: `stf-${Date.now()}`,
                  name,
                  email,
                  role: 'BARISTA',
                  phone: '+855 12 000 999',
                  status: 'Active',
                  shift: 'Morning',
                  salesCount: 0,
                };
                setStaffList([newStaff, ...staffList]);
              }
            }}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs flex items-center space-x-1.5 shadow-lg shadow-amber-900/30 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Staff Member</span>
          </button>
        </div>
      </div>

      {/* Staff Table */}
      <div className="bg-stone-900/80 border border-stone-800 rounded-3xl overflow-hidden glass-panel">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-950/80 text-stone-400 uppercase font-semibold border-b border-stone-800">
              <tr>
                <th className="p-4">Employee</th>
                <th className="p-4">Assigned Role</th>
                <th className="p-4">Active Shift</th>
                <th className="p-4">Total Orders Processed</th>
                <th className="p-4">Shift Status</th>
                <th className="p-4 text-right">User Permissions & Attendance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800/80 font-sans">
              {staffList.map((s) => (
                <tr key={s.id} className="hover:bg-stone-800/30 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-700 to-yellow-500 text-stone-950 font-bold flex items-center justify-center">
                        {s.name.charAt(0)}
                      </div>
                      <div>
                        <span className="font-bold text-stone-100 block text-sm">{s.name}</span>
                        <span className="text-[10px] text-stone-400">{s.email}</span>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span
                      className={`px-3 py-1 rounded-full text-[10px] font-bold border ${
                        s.role === 'ADMIN'
                          ? 'bg-purple-950 text-purple-300 border-purple-500/50'
                          : s.role === 'MANAGER'
                          ? 'bg-blue-950 text-blue-300 border-blue-500/50'
                          : 'bg-stone-800 text-amber-400 border-stone-700'
                      }`}
                    >
                      {s.role}
                    </span>
                  </td>
                  <td className="p-4 font-semibold text-stone-300">{s.shift} Shift</td>
                  <td className="p-4 font-mono font-bold text-amber-400">{s.salesCount} Orders</td>
                  <td className="p-4">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                        s.status === 'Active'
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                          : 'bg-red-500/20 text-red-400 border-red-500/40'
                      }`}
                    >
                      {s.status === 'Active' ? '🟢 Clocked In' : '🔴 Clocked Out'}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => setEditingUserPerms(s)}
                        className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-amber-300 font-bold text-xs flex items-center space-x-1 border border-amber-600/30"
                        title="Configure User Specific Permissions"
                      >
                        <Key className="w-3.5 h-3.5" />
                        <span>Edit Permissions</span>
                      </button>

                      <button
                        onClick={() => handleToggleAttendance(s.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
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
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showRoleModal && <RoleManagementModal onClose={() => setShowRoleModal(false)} />}
      {editingUserPerms && (
        <UserPermissionModal staff={editingUserPerms} onClose={() => setEditingUserPerms(null)} />
      )}
    </div>
  );
};
