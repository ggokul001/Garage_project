import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, FileSpreadsheet } from 'lucide-react';
import { transactionApi } from '../../api';
import { useAuth } from '../../authStore';
import { ReportColumnManager, useReportColumns } from '../../components/ReportColumnManager';
import { useFy } from '../../fyStore';
import { exportExcel, reportValue } from '../../utils/report';
import { PageTitle } from '../UsersPage';

type Mode = 'CUSTOM' | 'DAILY' | 'WEEKLY' | 'MONTHLY';
const availableColumns = [
  { key: 'vendor_code', label: 'Vendor Code' },
  { key: 'vendor_name', label: 'Vendor Name' },
  { key: 'gst_type', label: 'GST Type' },
  { key: 'gstin', label: 'GSTIN' },
  { key: 'bill_count', label: 'Bill Count' },
  { key: 'credit_amount', label: 'Credit Amount' },
  { key: 'paid_amount', label: 'Paid Amount' },
  { key: 'outstanding_amount', label: 'Outstanding Amount' },
];
const numericColumns = new Set(['bill_count', 'credit_amount', 'paid_amount', 'outstanding_amount']);

const date = (value: Date) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
function rangeFor(mode: Mode, from: string, to: string) {
  const now = new Date();
  if (mode === 'CUSTOM') return { from, to };
  if (mode === 'DAILY') return { from: date(now), to: date(now) };
  if (mode === 'WEEKLY') {
    const start = new Date(now);
    const day = (now.getDay() + 6) % 7;
    start.setDate(now.getDate() - day);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { from: date(start), to: date(end) };
  }
  return { from: date(new Date(now.getFullYear(), now.getMonth(), 1)), to: date(new Date(now.getFullYear(), now.getMonth() + 1, 0)) };
}

export function VendorOutstandingPage() {
  const fy = useFy((state) => state.activeId);
  const has = useAuth((state) => state.has);
  const [mode, setMode] = useState<Mode>('MONTHLY');
  const [from, setFrom] = useState(new Date().toISOString().slice(0, 8) + '01');
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const range = useMemo(() => rangeFor(mode, from, to), [mode, from, to]);
  const columns = useReportColumns('accura.report.columns.vendor-outstanding', availableColumns);
  const report = useQuery({
    queryKey: ['vendor-outstanding', fy, mode, range.from, range.to],
    queryFn: () => transactionApi.vendorOutstanding({ financial_year_id: fy, from: range.from, to: range.to }),
    enabled: !!fy,
  });
  const rows = report.data?.data ?? [];
  const download = () => exportExcel(
    `Vendor-Outstanding-${range.from}-to-${range.to}`,
    rows.map((row) => Object.fromEntries(columns.shown.map((column) => [column.key, reportValue(row[column.key], column.key)]))),
    columns.shown,
  );

  return <div>
    <PageTitle
      title="Vendor-wise Outstanding"
      subtitle="Credit purchase, payment and balance summary"
      icon={FileSpreadsheet}
      action={<div className="flex flex-wrap gap-2"><ReportColumnManager {...columns} />{has('OUTSTANDING_EXPORT') && <button className="btn-primary" onClick={download} disabled={!rows.length}><Download size={16} />Excel Download</button>}</div>}
    />
    <section className="panel p-5"><div className="flex flex-col gap-4 lg:flex-row lg:items-end">
      <div><label className="label">Period</label><div className="flex flex-wrap rounded-xl border border-border bg-surface-2 p-1">{(['CUSTOM', 'DAILY', 'WEEKLY', 'MONTHLY'] as Mode[]).map((item) => <button key={item} className={`rounded-lg px-4 py-2 text-xs font-semibold transition ${mode === item ? 'bg-primary text-white dark:text-[#071a3e]' : 'text-fg-muted hover:bg-surface'}`} onClick={() => setMode(item)}>{item === 'CUSTOM' ? 'From / To' : item}</button>)}</div></div>
      {mode === 'CUSTOM' && <><div><label className="label">From Date</label><input className="input" type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></div><div><label className="label">To Date</label><input className="input" type="date" value={to} onChange={(event) => setTo(event.target.value)} /></div></>}
      <div className="ml-auto text-sm font-medium text-fg-muted">Showing {range.from} to {range.to}</div>
    </div></section>
    <div className="mt-4 grid gap-3 sm:grid-cols-3"><Summary label="Credit Amount" value={report.data?.summary.credit_amount ?? 0} /><Summary label="Paid Amount" value={report.data?.summary.paid_amount ?? 0} /><Summary label="Outstanding Amount" value={report.data?.summary.outstanding_amount ?? 0} primary /></div>
    <section className="panel mt-4 overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-5 py-3"><span className="text-xs font-semibold text-fg-muted">{rows.length} vendor records</span><span className="text-[10px] text-fg-subtle">{columns.shown.length}/{availableColumns.length} columns visible</span></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[900px]"><thead><tr>{columns.shown.map((column) => <th key={column.key} className={numericColumns.has(column.key) ? 'text-right' : ''}>{column.label}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={String(row.vendor_id)}>{columns.shown.map((column) => <td key={column.key} className={`${numericColumns.has(column.key) ? 'text-right' : ''} ${column.key === 'vendor_name' ? 'font-semibold text-fg' : ''} ${column.key === 'outstanding_amount' ? 'font-bold text-danger' : column.key === 'paid_amount' ? 'text-success' : ''}`}>{reportValue(row[column.key], column.key)}</td>)}</tr>)}</tbody></table></div>
      {!rows.length && !report.isLoading && <div className="empty-state"><FileSpreadsheet size={30} /><span>No CREDIT Store Entries in this period</span></div>}
    </section>
  </div>;
}

function Summary({ label, value, primary = false }: { label: string; value: number; primary?: boolean }) {
  return <div className={`card ${primary ? 'border-primary/30 bg-primary/[.06]' : ''}`}><span className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">{label}</span><strong className={`mt-2 text-2xl ${primary ? 'text-primary' : 'text-fg'}`}>₹ {Number(value).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></div>;
}
