import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { KeyRound, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { PasswordField } from '../components/PasswordField';
import { accessApi } from '../api';
import { useAuth } from '../authStore';
import { PageTitle } from './UsersPage';

export function ChangePasswordPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const logout = useAuth((state) => state.logout);
  const [currentPassword, setCurrent] = useState('');
  const [newPassword, setNew] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (newPassword !== confirm) return toast.error('Passwords do not match');
    setSaving(true);
    try {
      await accessApi.changePassword(currentPassword, newPassword);
      queryClient.clear();
      logout();
      toast.success('Password changed. Please sign in with your new password.');
      navigate('/login', { replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to change password');
    } finally {
      setSaving(false);
    }
  };
  return <div>
    <PageTitle title="Change Password" subtitle="Update your account password securely" icon={KeyRound} />
    <div className="panel mx-auto max-w-xl overflow-hidden">
      <div className="flex items-center gap-3 border-b border-border bg-primary/[.04] px-6 py-4"><div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary"><ShieldCheck size={18} /></div><div><strong className="text-sm">Secure password update</strong><p className="mt-0.5 text-xs text-fg-muted">Enter manually or generate and copy a strong password.</p></div></div>
      <form onSubmit={submit} className="space-y-5 p-6">
        <div><label className="label">Current password</label><input className="input" type="password" value={currentPassword} onChange={(event) => setCurrent(event.target.value)} autoComplete="current-password" required /></div>
        <PasswordField label="New password" value={newPassword} onChange={setNew} onGenerate={(password) => setConfirm(password)} required />
        <PasswordField label="Confirm new password" value={confirm} onChange={setConfirm} showGenerator={false} required />
        {newPassword && confirm && <p className={`rounded-lg px-3 py-2 text-xs font-semibold ${newPassword === confirm ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-danger'}`}>{newPassword === confirm ? 'Passwords match' : 'Passwords do not match'}</p>}
        <button className="btn-primary w-full" disabled={saving || newPassword !== confirm}>{saving ? 'Updating...' : 'Update password'}</button>
      </form>
    </div>
  </div>;
}
