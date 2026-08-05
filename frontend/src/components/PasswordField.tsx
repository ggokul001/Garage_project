import { useState } from 'react';
import { Check, Copy, Eye, EyeOff, Wand2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { generatePassword } from '../utils/password';

export function PasswordField({
  label,
  value,
  onChange,
  onGenerate,
  required = false,
  autoFocus = false,
  placeholder = 'Enter password',
  showGenerator = true,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onGenerate?: (value: string) => void;
  required?: boolean;
  autoFocus?: boolean;
  placeholder?: string;
  showGenerator?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const generate = () => {
    const password = generatePassword();
    onChange(password);
    onGenerate?.(password);
    setVisible(true);
  };
  const copy = async () => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success('Password copied');
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Unable to copy password');
    }
  };

  return <div>
    <label className="label">{label}</label>
    <div className="relative">
      <input className={`input ${showGenerator ? 'pr-20' : 'pr-12'}`} type={visible ? 'text' : 'password'} minLength={8} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} required={required} autoFocus={autoFocus} autoComplete="new-password" />
      <div className="absolute inset-y-0 right-2 flex items-center gap-1">
        {showGenerator && <button type="button" className="action h-7 w-7" title="Copy password" disabled={!value} onClick={copy}>{copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}</button>}
        <button type="button" className="action h-7 w-7" title={visible ? 'Hide password' : 'Show password'} onClick={() => setVisible((current) => !current)}>{visible ? <EyeOff size={14} /> : <Eye size={14} />}</button>
      </div>
    </div>
    {showGenerator && <div className="mt-2 flex items-center justify-between gap-3">
      <button type="button" className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline" onClick={generate}><Wand2 size={13} />Generate strong password</button>
      <span className="text-[10px] text-fg-subtle">Minimum 8 characters</span>
    </div>}
  </div>;
}
