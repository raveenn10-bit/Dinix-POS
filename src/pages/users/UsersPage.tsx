import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  ShieldCheck,
  UserCheck,
  Search,
  CheckCircle,
  XCircle,
  Edit2,
  Lock,
  Mail,
  Phone,
  Clock,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useNotification } from '@/context/NotificationContext';
import {
  fetchUsers,
  createStaffAccount,
  toggleUserStatus,
  updateUserRole,
} from '@/lib/dataService';
import { User, UserRole } from '@/types';
import { UserModal } from './UserModal';

export const UsersPage: React.FC = () => {
  const { userProfile, isAdmin } = useAuth();
  const { notifySuccess, notifyError } = useNotification();

  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'staff'>('all');

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const data = await fetchUsers();
      setUsers(data);
    } catch (err) {
      console.error(err);
      notifyError('Failed to load user accounts', 'Error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleSaveUser = async (data: {
    name: string;
    email: string;
    role: UserRole;
    phone?: string;
  }) => {
    if (!userProfile) return;
    const adminUser = { uid: userProfile.uid, name: userProfile.name };

    if (editingUser) {
      if (editingUser.role !== data.role) {
        await updateUserRole(editingUser.uid, data.role, adminUser);
      }
      notifySuccess('User role and details updated successfully!');
    } else {
      await createStaffAccount(data, adminUser);
      notifySuccess(`New user account created for ${data.name}!`);
    }
    await loadUsers();
  };

  const handleToggleStatus = async (user: User) => {
    if (!userProfile) return;
    if (user.uid === userProfile.uid) {
      notifyError('You cannot deactivate your own active session account.');
      return;
    }

    const nextState = !user.active;
    try {
      await toggleUserStatus(user.uid, nextState, { uid: userProfile.uid, name: userProfile.name });
      notifySuccess(`User ${user.name} is now ${nextState ? 'Active' : 'Disabled'}.`);
      await loadUsers();
    } catch (err) {
      console.error(err);
      notifyError('Failed to update user status.');
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.phone && u.phone.includes(searchQuery));
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700">
              <ShieldCheck className="h-3.5 w-3.5 text-brand-500" />
              Access Control
            </span>
          </div>
          <h1 className="text-2xl font-bold text-navy-950 sm:text-3xl">
            Team & User Management
          </h1>
          <p className="text-xs text-slate-500">
            Provision staff accounts, grant Super Admin privileges, and manage authentication status.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setEditingUser(null);
            setIsModalOpen(true);
          }}
          className="inline-flex items-center gap-2 self-start sm:self-auto rounded-xl bg-brand-500 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-brand-500/30 hover:bg-brand-600 transition-colors"
        >
          <UserPlus className="h-4 w-4" />
          <span>Add Staff Member</span>
        </button>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <span className="text-xs font-semibold uppercase text-slate-500">Total System Users</span>
          <p className="mt-2 text-2xl font-extrabold text-navy-950">{users.length}</p>
          <p className="mt-1 text-xs text-slate-500">Active and provisioned accounts</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <span className="text-xs font-semibold uppercase text-slate-500">Super Administrators</span>
          <p className="mt-2 text-2xl font-extrabold text-brand-600">
            {users.filter((u) => u.role === 'admin').length}
          </p>
          <p className="mt-1 text-xs text-slate-500">Full system access & reports</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <span className="text-xs font-semibold uppercase text-slate-500">Counter & POS Staff</span>
          <p className="mt-2 text-2xl font-extrabold text-sky-600">
            {users.filter((u) => u.role === 'staff').length}
          </p>
          <p className="mt-1 text-xs text-slate-500">Sales terminal and logistics operators</p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, email, phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-200 pl-9 pr-3.5 py-2 text-xs text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-xs font-medium text-slate-500">Role:</span>
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
            {(['all', 'admin', 'staff'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRoleFilter(r)}
                className={`rounded-md px-3 py-1 text-xs font-bold capitalize transition-all ${
                  roleFilter === r
                    ? 'bg-white text-brand-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {r === 'all' ? 'All Roles' : r}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
              <tr>
                <th className="px-6 py-3">User Profile</th>
                <th className="px-6 py-3">Role</th>
                <th className="px-6 py-3">Contact</th>
                <th className="px-6 py-3">Account Status</th>
                <th className="px-6 py-3">Registered Date</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                    No users matching criteria.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isCurrentUser = userProfile?.uid === u.uid;
                  return (
                    <tr key={u.uid} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-navy-900 font-bold text-white shadow-sm">
                            {u.name.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900">{u.name}</span>
                              {isCurrentUser && (
                                <span className="rounded bg-brand-100 px-1.5 py-0.2 text-[10px] font-bold text-brand-700">
                                  You
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-500 font-mono">{u.email}</span>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
                            u.role === 'admin'
                              ? 'bg-brand-50 text-brand-700 border border-brand-200'
                              : 'bg-sky-50 text-sky-700 border border-sky-200'
                          }`}
                        >
                          {u.role === 'admin' ? (
                            <ShieldCheck className="h-3 w-3" />
                          ) : (
                            <UserCheck className="h-3 w-3" />
                          )}
                          {u.role}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-slate-600">
                        {u.phone ? (
                          <div className="flex items-center gap-1.5">
                            <Phone className="h-3.5 w-3.5 text-slate-400" />
                            <span>{u.phone}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(u)}
                          disabled={isCurrentUser}
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition-all ${
                            u.active
                              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                              : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                          } ${isCurrentUser ? 'opacity-80 cursor-not-allowed' : 'cursor-pointer'}`}
                          title={isCurrentUser ? 'Active session' : 'Click to toggle status'}
                        >
                          {u.active ? (
                            <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                          ) : (
                            <XCircle className="h-3.5 w-3.5 text-rose-600" />
                          )}
                          <span>{u.active ? 'Active' : 'Disabled'}</span>
                        </button>
                      </td>

                      <td className="px-6 py-4 text-slate-500 text-[11px] whitespace-nowrap">
                        {new Date(Number(u.createdAt)).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>

                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingUser(u);
                            setIsModalOpen(true);
                          }}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand-600 transition-colors"
                          title="Edit User Role"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Modal */}
      <UserModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingUser(null);
        }}
        onSave={handleSaveUser}
        initialData={editingUser}
      />
    </div>
  );
};
