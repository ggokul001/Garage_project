import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, ChevronUp, Clock3, History, UserRound } from 'lucide-react';
import { AuditRow, reportApi, superAdminApi } from '../api';
import { useAuth } from '../authStore';
import { Modal } from './Modal';
import { friendlyColumn } from '../utils/report';
import {AuditValue,normalizeAuditData} from './AuditValue';

const excludedFields = ['updated_at', 'created_at', 'updated_by', 'created_by', 'password_hash'];

function displayValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '\u2014';
  return typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
}

const same = (left: unknown, right: unknown) =>
  JSON.stringify(left ?? null) === JSON.stringify(right ?? null);

export function AuditActionButton({
  entityType,
  recordId,
  title,
  code,
}: {
  entityType: string;
  recordId: string | number;
  title: string;
  code?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="action" title="Audit Log" onClick={() => setOpen(true)}>
        <History size={15} />
      </button>
      <AuditTimeline
        open={open}
        close={() => setOpen(false)}
        entityType={entityType}
        recordId={recordId}
        title={title}
        code={code}
      />
    </>
  );
}

export function AuditTimeline({
  open,
  close,
  entityType,
  recordId,
  title,
  code,
}: {
  open: boolean;
  close: () => void;
  entityType: string;
  recordId: string | number;
  title: string;
  code?: string;
}) {
  const superAdmin=useAuth(state=>state.user?.role_code==='SUPER_ADMIN');
  const logs = useQuery({
    queryKey: ['audit-timeline', entityType, recordId, title],
    queryFn: () => superAdmin?superAdminApi.auditTimeline(entityType,recordId):reportApi.auditTimeline(entityType, recordId, title),
    enabled: open,
  });
  const chronological = [...(logs.data ?? [])].reverse();
  const created = chronological.find((row) => row.action === 'CREATE');
  const updated = logs.data?.[0];

  return (
    <Modal
      open={open}
      onClose={close}
      title={`Audit Log \u2014 ${title}`}
      wide
      footer={<button className="btn-secondary" onClick={close}>Close</button>}
    >
      <p className="-mt-3 mb-5 text-xs text-fg-muted">Complete record-level activity and field change history</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Info label="Record Name" value={title} />
        <Info label="Record Code" value={code ?? String(recordId)} />
        <Info label="Created By" value={created?.user_name} />
        <Info label="Created Date" value={created ? new Date(created.created_at).toLocaleString() : undefined} />
        <Info label="Last Updated By" value={updated?.user_name} />
        <Info label="Last Activity" value={updated ? new Date(updated.created_at).toLocaleString() : undefined} />
        <Info label="Total Activities" value={logs.data?.length ?? 0} />
        <Info label="Module" value={updated?.module_name ?? friendlyColumn(entityType)} />
      </div>
      <div className="mt-5 space-y-3">
        {logs.isLoading && <div className="empty-state py-12">Loading audit history...</div>}
        {logs.data?.map((row, index) => <AuditEvent row={row} key={row.id} initiallyOpen={index === 0} />)}
        {!logs.isLoading && !logs.data?.length && (
          <div className="empty-state py-12">
            <History size={28} />
            <span>No audit activity recorded for this record yet.</span>
            <small>New changes will appear here automatically.</small>
          </div>
        )}
      </div>
    </Modal>
  );
}

function AuditEvent({ row, initiallyOpen }: { row: AuditRow; initiallyOpen: boolean }) {
  const [open, setOpen] = useState(initiallyOpen);
  const oldData = normalizeAuditData(row.old_values);
  const newData = normalizeAuditData(row.new_values);
  const changes = useMemo(() => {
    const candidates = row.action === 'DELETE' ? Object.keys(oldData) : Object.keys(newData);
    return candidates.filter((key) => !excludedFields.includes(key) && !same(oldData[key], newData[key]));
  }, [row.action, row.old_values, row.new_values]);

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-surface">
      <button className="flex w-full items-center gap-3 bg-surface-2/70 px-4 py-3 text-left" onClick={() => setOpen(!open)}>
        <span className={`rounded-lg px-2.5 py-1 text-[10px] font-bold tracking-wide ${row.action === 'DELETE' ? 'badge-danger' : row.action === 'CREATE' ? 'badge-active' : 'badge-info'}`}>{row.action}</span>
        <div>
          <strong className="block text-xs">{row.user_name}</strong>
          <span className="mt-0.5 flex items-center gap-1 text-[10px] text-fg-muted">
            <Clock3 size={11} />{new Date(row.created_at).toLocaleString()} &middot; {changes.length} change{changes.length === 1 ? '' : 's'}
          </span>
        </div>
        <span className="ml-auto text-fg-muted">{open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</span>
      </button>
      {open && (
        <div className="p-4">
          <div className="mb-3 flex flex-wrap gap-4 text-[10px] text-fg-muted">
            <span className="flex items-center gap-1"><UserRound size={11} />{row.username}</span>
            <span>IP: {row.ip_address ?? '\u2014'}</span>
          </div>
          <div className="space-y-2">
            {changes.map((key) => (
              <div className="rounded-lg border border-border p-3" key={key}>
                <strong className="text-xs">{friendlyColumn(key)}</strong>
                <div className="mt-2 grid gap-3 sm:grid-cols-2">
                  <Value label="OLD" value={oldData[key]} fieldKey={key}/>
                  <Value label={row.action === 'DELETE' ? 'REMOVED' : 'NEW'} value={newData[key]} fieldKey={key}/>
                </div>
              </div>
            ))}
            {!changes.length && <p className="text-xs text-fg-muted">Status/action recorded without field value changes.</p>}
          </div>
        </div>
      )}
    </section>
  );
}

function Value({ label, value,fieldKey }: { label: string; value: unknown;fieldKey:string }) {
  return <div className="min-w-0 rounded-lg bg-surface-2 p-3"><span className="text-[9px] font-bold tracking-wider text-fg-subtle">{label}</span><div className="mt-2"><AuditValue value={value} fieldKey={fieldKey}/></div></div>;
}

function Info({ label, value }: { label: string; value: unknown }) {
  return <div className="rounded-xl border border-border bg-surface-2/60 p-4"><span className="text-[9px] font-bold uppercase tracking-wider text-fg-subtle">{label}</span><strong className="mt-1.5 block truncate text-sm">{displayValue(value)}</strong></div>;
}
