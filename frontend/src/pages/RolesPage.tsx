import { FormEvent, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Shield, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { accessApi, Role } from '../api';
import { useAuth } from '../authStore';
import { AuditActionButton } from '../components/AuditTimeline';
import { Modal } from '../components/Modal';
import { PageTitle } from './UsersPage';

export function RolesPage() {
  const qc = useQueryClient();
  const has = useAuth((state) => state.has);
  const roles = useQuery({ queryKey: ['roles'], queryFn: accessApi.roles });
  const permissions = useQuery({ queryKey: ['permissions'], queryFn: accessApi.permissions });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Role | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('active');
  const [selected, setSelected] = useState<number[]>([]);
  const grouped = useMemo(() => Object.groupBy(permissions.data ?? [], (permission) => permission.module), [permissions.data]);
  const save = useMutation({ mutationFn: () => { const data = { name, description, status, permission_ids: selected }; return editing ? accessApi.updateRole(editing.id, data) : accessApi.createRole(data); }, onSuccess: () => { toast.success(editing ? 'Role updated' : 'Role created'); setOpen(false); qc.invalidateQueries({ queryKey: ['roles'] }); qc.invalidateQueries({ queryKey: ['navigation'] }); }, onError: (error: Error) => toast.error(error.message) });
  const remove = useMutation({ mutationFn: accessApi.removeRole, onSuccess: () => { toast.success('Role deleted'); qc.invalidateQueries({ queryKey: ['roles'] }); }, onError: (error: Error) => toast.error(error.message) });
  const launch = (role?: Role) => { setEditing(role ?? null); setName(role?.name ?? ''); setDescription(role?.description ?? ''); setStatus(role?.status ?? 'active'); setSelected(role?.permission_ids ?? []); setOpen(true); };
  const submit = (event: FormEvent) => { event.preventDefault(); save.mutate(); };

  return <div>
    <PageTitle title="Roles & Permissions" subtitle="Define access levels and module permissions" icon={Shield} action={has('ROLE_CREATE') ? <button className="btn-primary" onClick={() => launch()}><Plus size={16} />New role</button> : null} />
    <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">{roles.data?.map((role) => <div className="panel p-5" key={role.id}><div className="flex items-start"><div className="page-title-icon"><Shield size={18} /></div><div className="ml-3"><div className="flex items-center gap-2 font-semibold text-fg">{role.name}{role.is_system ? <span className="badge-info">System</span> : null}</div><p className="mt-1 text-xs text-fg-muted">{role.description || 'No description'}</p></div><div className="ml-auto flex">{has('AUDIT_VIEW') && <AuditActionButton entityType="roles" recordId={role.id} title={role.name} code={role.code} />}{has('ROLE_UPDATE') && <button className="action" title="Edit" onClick={() => launch(role)}><Pencil size={15} /></button>}{!role.is_system && has('ROLE_DELETE') && <button className="action danger" title="Delete" onClick={() => confirm('Delete role?') && remove.mutate(role.id)}><Trash2 size={15} /></button>}</div></div><div className="mt-5 flex items-center justify-between border-t border-border pt-4 text-xs"><span className="text-fg-muted">Permissions</span><span className="font-semibold text-primary">{role.permission_count}</span></div></div>)}</div>
    <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit Role' : 'New Role'} wide footer={<><button className="btn-secondary" onClick={() => setOpen(false)}>Cancel</button><button className="btn-primary" form="role-form">Save role</button></>}>
      <form id="role-form" onSubmit={submit}>
        <div className="grid gap-4 sm:grid-cols-2"><div><label className="label">Role name *</label><input className="input" value={name} onChange={(event) => setName(event.target.value)} required /></div><div><label className="label">Status</label><select className="input" value={status} onChange={(event) => setStatus(event.target.value)}><option value="active">Active</option><option value="inactive">Inactive</option></select></div><div className="sm:col-span-2"><label className="label">Description</label><textarea className="input h-16 py-2" value={description} onChange={(event) => setDescription(event.target.value)} /></div></div>
        <div className="mt-6 border-t border-border pt-5"><div className="mb-4 flex items-center justify-between"><div><h3 className="text-sm font-semibold">Permissions</h3><p className="text-xs text-fg-muted">Select what this role can access and manage.</p></div><button type="button" className="text-xs font-medium text-primary" onClick={() => setSelected(selected.length === (permissions.data?.length ?? 0) ? [] : (permissions.data ?? []).map((permission) => permission.id))}>{selected.length === (permissions.data?.length ?? 0) ? 'Clear all' : 'Select all'}</button></div>
          <div className="grid gap-4 lg:grid-cols-2">{Object.entries(grouped).filter(([module]) => module !== 'Attendance & Payroll').map(([module, items]) => <div className="permission-group" key={module}><div className="mb-3 flex items-center justify-between"><h4>{module}</h4><button type="button" onClick={() => { const ids = items.map((permission) => permission.id); const all = ids.every((id) => selected.includes(id)); setSelected(all ? selected.filter((id) => !ids.includes(id)) : [...new Set([...selected, ...ids])]); }} className="text-[10px] text-primary">Toggle group</button></div><div className="grid gap-2">{items.map((permission) => <label key={permission.id} className="permission-check"><input type="checkbox" checked={selected.includes(permission.id)} onChange={() => setSelected((current) => current.includes(permission.id) ? current.filter((id) => id !== permission.id) : [...current, permission.id])} /><span><strong>{permission.name}</strong><small>{permission.code}</small></span></label>)}</div></div>)}</div>
        </div>
      </form>
    </Modal>
  </div>;
}
