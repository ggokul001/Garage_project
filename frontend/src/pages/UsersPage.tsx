import { FormEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { KeyRound, Pencil, Plus, Search, ShieldCheck, Trash2, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { accessApi, masterApi, User } from '../api';
import { useAuth } from '../authStore';
import { AuditActionButton } from '../components/AuditTimeline';
import { Modal } from '../components/Modal';
import { PasswordField } from '../components/PasswordField';

const blank = { username: '', email: '', full_name: '', role_id: '', branch_id: null, status: 'active', password: '' };

export function UsersPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const has = useAuth((state) => state.has);
  const [page] = useState(1);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState<Record<string, unknown>>(blank);
  const [resetUser, setResetUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const users = useQuery({ queryKey: ['users', page, search], queryFn: () => accessApi.users({ page, search }) });
  const roles = useQuery({ queryKey: ['roles'], queryFn: accessApi.roles });
  const branches = useQuery({ queryKey: ['options', 'branches'], queryFn: () => masterApi.options('branches') });
  const save = useMutation({ mutationFn: () => editing ? accessApi.updateUser(editing.id, form) : accessApi.createUser(form), onSuccess: () => { toast.success(editing ? 'User updated' : 'User created'); setOpen(false); qc.invalidateQueries({ queryKey: ['users'] }); }, onError: (error: Error) => toast.error(error.message) });
  const remove = useMutation({ mutationFn: accessApi.removeUser, onSuccess: () => { toast.success('User deleted'); qc.invalidateQueries({ queryKey: ['users'] }); }, onError: (error: Error) => toast.error(error.message) });
  const reset = useMutation({ mutationFn: () => accessApi.resetPassword(resetUser!.id, newPassword), onSuccess: () => { toast.success('Password reset'); setResetUser(null); setNewPassword(''); }, onError: (error: Error) => toast.error(error.message) });
  const edit = (user: User) => { setEditing(user); setForm({ username: user.username, email: user.email, full_name: user.full_name, role_id: user.role_id, branch_id: user.branch_id ?? null, status: user.status }); setOpen(true); };
  const submit = (event: FormEvent) => { event.preventDefault(); save.mutate(); };

  return <div>
    <PageTitle title="Users" subtitle="Manage application users, roles and branch access" icon={Users} action={has('USER_CREATE') ? <button className="btn-primary" onClick={() => { setEditing(null); setForm(blank); setOpen(true); }}><Plus size={16} />New user</button> : null} />
    <div className="panel overflow-hidden">
      <div className="table-toolbar"><div className="relative max-w-sm flex-1"><Search size={15} className="search-icon" /><input className="input pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search users..." /></div><span>{users.data?.meta.total ?? 0} users</span></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[850px]"><thead><tr><th>User</th><th>Username</th><th>Role</th><th>Branch</th><th>Last login</th><th>Status</th><th className="text-right">Actions</th></tr></thead><tbody>{users.data?.data.map((user) => <tr key={user.id}><td><div className="font-medium text-fg">{user.full_name}</div><div className="text-xs text-fg-subtle">{user.email}</div></td><td>{user.username}</td><td>{user.role_name}</td><td>{user.branch_name ?? 'All branches'}</td><td>{user.last_login_at ? new Date(String(user.last_login_at)).toLocaleString() : 'Never'}</td><td><span className={user.status === 'active' ? 'badge-active' : 'badge-inactive'}>{user.status}</span></td><td><div className="flex justify-end gap-1">{has('PERMISSION_ASSIGN') && <button className="action" title="Permissions" onClick={() => navigate(`/users/${user.id}/permissions`, { state: user })}><ShieldCheck size={15} /></button>}{has('AUDIT_VIEW') && <AuditActionButton entityType="users" recordId={user.id} title={user.full_name} code={user.username} />}{has('USER_UPDATE') && <><button className="action" title="Reset password" onClick={() => { setNewPassword(''); setResetUser(user); }}><KeyRound size={15} /></button><button className="action" title="Edit" onClick={() => edit(user)}><Pencil size={15} /></button></>}{has('USER_DELETE') && <button className="action danger" title="Delete" onClick={() => confirm('Delete this user?') && remove.mutate(user.id)}><Trash2 size={15} /></button>}</div></td></tr>)}</tbody></table></div>
    </div>
    <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit User' : 'New User'} footer={<><button className="btn-secondary" onClick={() => setOpen(false)}>Cancel</button><button className="btn-primary" form="user-form">{save.isPending ? 'Saving...' : 'Save user'}</button></>}><form id="user-form" className="grid gap-4 sm:grid-cols-2" onSubmit={submit}><Field label="Full name *" value={form.full_name} set={(value) => setForm({ ...form, full_name: value })} /><Field label="Username *" value={form.username} set={(value) => setForm({ ...form, username: value })} /><Field label="Email *" type="email" value={form.email} set={(value) => setForm({ ...form, email: value })} />{!editing && <PasswordField label="Temporary password *" value={String(form.password ?? '')} onChange={(value) => setForm({ ...form, password: value })} required />}<SelectField label="Role *" value={form.role_id} set={(value) => setForm({ ...form, role_id: Number(value) })} options={(roles.data ?? []).filter((role) => role.status === 'active').map((role) => [role.id, role.name])} /><SelectField label="Branch" value={form.branch_id} set={(value) => setForm({ ...form, branch_id: value ? Number(value) : null })} options={(branches.data ?? []).map((branch) => [branch.id, String(branch.name)])} empty="All branches" /><SelectField label="Status" value={form.status} set={(value) => setForm({ ...form, status: value })} options={[["active", "Active"], ["inactive", "Inactive"]]} /></form></Modal>
    <Modal open={!!resetUser} onClose={() => { setResetUser(null); setNewPassword(''); }} title={`Reset Password \u2014 ${resetUser?.username}`} footer={<><button className="btn-secondary" onClick={() => { setResetUser(null); setNewPassword(''); }}>Cancel</button><button className="btn-primary" disabled={newPassword.length < 8 || reset.isPending} onClick={() => reset.mutate()}>{reset.isPending ? 'Resetting...' : 'Reset password'}</button></>}><PasswordField label="New temporary password" value={newPassword} onChange={setNewPassword} autoFocus required /><p className="mt-3 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">Share the copied password securely. The user will be asked to change it.</p></Modal>
  </div>;
}

export function PageTitle({ title, subtitle, icon: Icon, action }: { title: string; subtitle: string; icon: typeof Users; action?: React.ReactNode }) {
  return <div className="page-title"><div className="page-title-icon"><Icon size={20} /></div><div><h1>{title}</h1><p>{subtitle}</p></div>{action && <div className="ml-auto">{action}</div>}</div>;
}
function Field({ label, value, set, type = 'text' }: { label: string; value: unknown; set: (value: string) => void; type?: string }) {
  return <div><label className="label">{label}</label><input className="input" type={type} value={String(value ?? '')} onChange={(event) => set(event.target.value)} required={label.includes('*')} /></div>;
}
function SelectField({ label, value, set, options, empty }: { label: string; value: unknown; set: (value: string) => void; options: [unknown, string][]; empty?: string }) {
  return <div><label className="label">{label}</label><select className="input" value={String(value ?? '')} onChange={(event) => set(event.target.value)} required={label.includes('*')}><option value="">{empty ?? `Select ${label.replace('*', '').toLowerCase()}`}</option>{options.map(([optionValue, optionLabel]) => <option key={String(optionValue)} value={String(optionValue)}>{optionLabel}</option>)}</select></div>;
}
