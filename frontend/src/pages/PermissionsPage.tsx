import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import api from '../lib/api';
import PageHeader from '../components/PageHeader';
import LoadingSpinner from '../components/LoadingSpinner';

const ROLES = ['SUPER_ADMIN', 'BRANCH_MANAGER', 'PROCUREMENT', 'WAREHOUSE', 'KITCHEN', 'BARISTA', 'PASTRY', 'CASHIER', 'WAITER', 'DRIVER', 'CLEANER', 'ACCOUNTANT'];

// Default permissions matrix — what each role can access
const DEFAULT_PERMISSIONS: Record<string, Record<string, boolean>> = {
  SUPER_ADMIN: { pos: true, waiter: true, kds: true, menu: true, inventory: true, purchasing: true, production: true, finance: true, reports: true, settings: true, users: true, branches: true, audit: true, floor_edit: true, refund: true, void: true, discount: true, price_override: true },
  BRANCH_MANAGER: { pos: true, waiter: true, kds: true, menu: true, inventory: true, purchasing: true, production: true, finance: true, reports: true, settings: true, users: true, floor_edit: true, refund: true, void: true, discount: true, price_override: true },
  CASHIER: { pos: true, waiter: true, menu: true, floor_edit: true, discount: true, price_override: true },
  WAITER: { waiter: true, menu: true, kds: false },
  KITCHEN: { kds: true, menu: true, production: true },
  BARISTA: { kds: true, menu: true },
  PASTRY: { kds: true, menu: true, production: true },
  PROCUREMENT: { inventory: true, purchasing: true, reports: true },
  WAREHOUSE: { inventory: true, purchasing: true, production: true },
  DRIVER: { deliveries: true },
  CLEANER: { tasks: true },
  ACCOUNTANT: { finance: true, reports: true },
};

const PERMISSION_GROUPS = [
  { label: 'Point of Sale', permissions: [
    { key: 'pos', label: 'POS Checkout', desc: 'Ring up orders, take payments' },
    { key: 'waiter', label: 'Waiter / Floor', desc: 'Seat guests, take orders on tables' },
    { key: 'kds', label: 'Kitchen Display', desc: 'View and bump KDS tickets' },
    { key: 'floor_edit', label: 'Edit Floor Plan', desc: 'Add/move/delete tables' },
  ]},
  { label: 'Sales Actions', permissions: [
    { key: 'discount', label: 'Apply Discounts', desc: 'Apply coupons and discount rules' },
    { key: 'price_override', label: 'Price Override', desc: 'Change item price at POS' },
    { key: 'refund', label: 'Issue Refunds', desc: 'Refund completed orders' },
    { key: 'void', label: 'Void Orders', desc: 'Cancel/void open orders' },
  ]},
  { label: 'Menu & Inventory', permissions: [
    { key: 'menu', label: 'Menu Management', desc: 'Add/edit menu items, 86 toggle' },
    { key: 'inventory', label: 'Inventory', desc: 'View stock, adjustments, transfers' },
    { key: 'purchasing', label: 'Purchasing', desc: 'Purchase orders, suppliers, receiving' },
    { key: 'production', label: 'Production', desc: 'Production orders (central kitchen)' },
  ]},
  { label: 'Administration', permissions: [
    { key: 'finance', label: 'Finance', desc: 'Finance journal, receivables, payables' },
    { key: 'reports', label: 'Reports', desc: 'Sales reports, analytics, sessions' },
    { key: 'settings', label: 'Settings', desc: 'System configuration' },
    { key: 'users', label: 'Manage Users', desc: 'Create/edit users, assign roles' },
    { key: 'branches', label: 'Manage Branches', desc: 'Create/edit branches' },
    { key: 'audit', label: 'Audit Log', desc: 'View system audit trail' },
  ]},
  { label: 'Other', permissions: [
    { key: 'deliveries', label: 'Deliveries', desc: 'Driver delivery terminal' },
    { key: 'tasks', label: 'Staff Tasks', desc: 'View/complete assigned tasks' },
  ]},
];

const ALL_PERM_KEYS = PERMISSION_GROUPS.flatMap(g => g.permissions.map(p => p.key));

export default function PermissionsPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [selectedRole, setSelectedRole] = useState<string>('CASHIER');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [userPerms, setUserPerms] = useState<Record<string, boolean>>({});
  const [tab, setTab] = useState<'roles' | 'users'>('roles');

  const { data: users, isLoading } = useQuery({
    queryKey: ['users-permissions'],
    queryFn: () => api.get('/users').then((r) => r.data.data),
    staleTime: 60_000,
  });

  const saveUserPerms = useMutation({
    mutationFn: () => api.patch(`/users/${selectedUser.id}`, { posRights: userPerms }),
    onSuccess: () => { toast.success('Permissions saved'); qc.invalidateQueries({ queryKey: ['users-permissions'] }); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const rolePerms = DEFAULT_PERMISSIONS[selectedRole] || {};

  const openUserPerms = (user: any) => {
    setSelectedUser(user);
    // Merge role defaults with user-specific overrides
    const base = DEFAULT_PERMISSIONS[user.role] || {};
    const overrides = user.posRights || {};
    setUserPerms({ ...base, ...overrides });
    setTab('users');
  };

  return (
    <div>
      <PageHeader title="Permissions & Access Control" subtitle="Manage what each role and user can do" />

      {/* Tab switch */}
      <div className="flex gap-2 mb-4">
        <button onClick={() => setTab('roles')} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'roles' ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-800'}`}>
          By Role
        </button>
        <button onClick={() => setTab('users')} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'users' ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-800'}`}>
          By User (overrides)
        </button>
      </div>

      {/* ─── BY ROLE TAB ─── */}
      {tab === 'roles' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Role selector */}
          <div className="space-y-1">
            {ROLES.map((r) => (
              <button key={r} onClick={() => setSelectedRole(r)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm ${selectedRole === r ? 'bg-primary text-white' : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100'}`}>
                {r.replace('_', ' ')}
              </button>
            ))}
          </div>

          {/* Permissions grid */}
          <div className="lg:col-span-3">
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
              <h3 className="font-semibold text-sm mb-4">{selectedRole.replace('_', ' ')} — Default Permissions</h3>
              <div className="space-y-4">
                {PERMISSION_GROUPS.map((group) => (
                  <div key={group.label}>
                    <div className="text-xs font-semibold text-gray-400 uppercase mb-2">{group.label}</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {group.permissions.map((perm) => {
                        const enabled = !!rolePerms[perm.key];
                        return (
                          <div key={perm.key} className={`flex items-center gap-3 rounded-lg px-3 py-2 ${enabled ? 'bg-emerald-50 dark:bg-emerald-500/10' : 'bg-gray-50 dark:bg-gray-800/50'}`}>
                            <div className={`w-5 h-5 rounded flex items-center justify-center text-xs ${enabled ? 'bg-emerald-500 text-white' : 'bg-gray-300 dark:bg-gray-600'}`}>
                              {enabled ? '✓' : '—'}
                            </div>
                            <div>
                              <div className="text-sm font-medium">{perm.label}</div>
                              <div className="text-[10px] text-gray-400">{perm.desc}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-4 border-t border-gray-200 dark:border-gray-800 pt-3">
                These are system-level defaults. To override for a specific user, go to the "By User" tab.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ─── BY USER TAB ─── */}
      {tab === 'users' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* User list */}
          <div className="space-y-1 max-h-[70vh] overflow-y-auto">
            {isLoading ? <LoadingSpinner /> : (users || []).map((u: any) => (
              <button key={u.id} onClick={() => openUserPerms(u)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm ${selectedUser?.id === u.id ? 'bg-primary text-white' : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100'}`}>
                <div className="font-medium">{u.firstName} {u.lastName}</div>
                <div className="text-[10px] opacity-70">{u.role} · {u.email}</div>
              </button>
            ))}
          </div>

          {/* User permissions editor */}
          <div className="lg:col-span-3">
            {selectedUser ? (
              <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-sm">{selectedUser.firstName} {selectedUser.lastName}</h3>
                    <p className="text-xs text-gray-400">{selectedUser.role} · {selectedUser.email}</p>
                  </div>
                  <button onClick={() => saveUserPerms.mutate()} disabled={saveUserPerms.isPending}
                    className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium disabled:opacity-50">
                    {saveUserPerms.isPending ? 'Saving...' : 'Save Permissions'}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mb-4">Toggle permissions on/off for this specific user. These override the role defaults.</p>
                <div className="space-y-4">
                  {PERMISSION_GROUPS.map((group) => (
                    <div key={group.label}>
                      <div className="text-xs font-semibold text-gray-400 uppercase mb-2">{group.label}</div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {group.permissions.map((perm) => {
                          const enabled = !!userPerms[perm.key];
                          return (
                            <label key={perm.key} className={`flex items-center gap-3 rounded-lg px-3 py-2 cursor-pointer transition ${enabled ? 'bg-emerald-50 dark:bg-emerald-500/10' : 'bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100'}`}>
                              <input type="checkbox" checked={enabled}
                                onChange={(e) => setUserPerms({ ...userPerms, [perm.key]: e.target.checked })}
                                className="rounded border-gray-300" />
                              <div>
                                <div className="text-sm font-medium">{perm.label}</div>
                                <div className="text-[10px] text-gray-400">{perm.desc}</div>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-16 text-gray-400">
                <p>Select a user from the list to manage their permissions.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
