import { useEffect, useState } from 'react';
import { Check, ChevronDown, ChevronUp, Columns3, GripVertical, RotateCcw, X } from 'lucide-react';

export type ReportColumn = { key: string; label: string };
type SavedColumns = { version: 2; ordered: string[]; visible: string[] };

export function useReportColumns(storageKey: string, available: ReportColumn[]) {
  const defaults = available.map((column) => column.key);
  const defaultsKey = defaults.join('|');
  const [ordered, setOrdered] = useState<string[]>([]);
  const [visible, setVisible] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(false);
    if (!defaults.length) {
      setOrdered([]);
      setVisible([]);
      return;
    }
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) ?? 'null') as SavedColumns | null;
      if (saved?.version !== 2) {
        setOrdered(defaults);
        setVisible(defaults);
      } else {
        const savedOrder = saved.ordered.filter((key) => defaults.includes(key));
        const nextOrder = [...savedOrder, ...defaults.filter((key) => !savedOrder.includes(key))];
        const savedVisible = saved.visible.filter((key) => defaults.includes(key));
        setOrdered(nextOrder);
        setVisible(savedVisible.length ? savedVisible : defaults);
      }
    } catch {
      setOrdered(defaults);
      setVisible(defaults);
    }
    setHydrated(true);
  }, [storageKey, defaultsKey]);

  useEffect(() => {
    if (!hydrated || !ordered.length) return;
    localStorage.setItem(storageKey, JSON.stringify({ version: 2, ordered, visible } satisfies SavedColumns));
  }, [storageKey, hydrated, ordered, visible]);

  const columns = ordered.map((key) => available.find((column) => column.key === key)).filter(Boolean) as ReportColumn[];
  const shown = columns.filter((column) => visible.includes(column.key));
  const toggle = (key: string) => setVisible((current) => {
    if (current.includes(key)) return current.length === 1 ? current : current.filter((item) => item !== key);
    return [...current, key];
  });
  const move = (key: string, direction: -1 | 1) => setOrdered((current) => {
    const from = current.indexOf(key);
    const to = from + direction;
    if (from < 0 || to < 0 || to >= current.length) return current;
    const next = [...current];
    [next[from], next[to]] = [next[to], next[from]];
    return next;
  });
  const reorder = (sourceKey: string, targetKey: string) => setOrdered((current) => {
    const source = current.indexOf(sourceKey);
    const target = current.indexOf(targetKey);
    if (source < 0 || target < 0 || source === target) return current;
    const next = [...current];
    const [moved] = next.splice(source, 1);
    next.splice(target, 0, moved);
    return next;
  });
  const reset = () => {
    setOrdered(defaults);
    setVisible(defaults);
  };
  return { columns, shown, visible, toggle, move, reorder, reset };
}

type ManagerProps = {
  columns: ReportColumn[];
  visible: string[];
  toggle: (key: string) => void;
  move: (key: string, direction: -1 | 1) => void;
  reorder: (sourceKey: string, targetKey: string) => void;
  reset: () => void;
};

export function ReportColumnManager({ columns, visible, toggle, move, reorder, reset }: ManagerProps) {
  const [open, setOpen] = useState(false);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);

  return <div className="relative">
    <button className="btn-secondary" onClick={() => setOpen(!open)}><Columns3 size={15} />Columns <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">{visible.length}/{columns.length}</span></button>
    {open && <>
      <button className="fixed inset-0 z-30" aria-label="Close column manager" onClick={() => setOpen(false)} />
      <div className="absolute right-0 top-11 z-40 w-[22rem] overflow-hidden rounded-xl border border-border bg-surface shadow-2xl">
        <div className="flex items-center border-b border-border px-4 py-3"><div><strong className="text-sm">Adjust columns</strong><p className="text-[10px] text-fg-muted">All checked by default. Drag rows to arrange.</p></div><button className="ml-auto action" onClick={() => setOpen(false)}><X size={15} /></button></div>
        <div className="max-h-96 overflow-y-auto p-2">{columns.map((column, index) => {
          const checked = visible.includes(column.key);
          return <div
            className={`group flex items-center gap-2 rounded-lg border px-2 py-2 transition ${dragOver === column.key && dragging !== column.key ? 'border-primary bg-primary/10' : 'border-transparent hover:bg-surface-2'} ${dragging === column.key ? 'opacity-50' : ''}`}
            key={column.key}
            draggable
            onDragStart={(event) => { setDragging(column.key); event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', column.key); }}
            onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; setDragOver(column.key); }}
            onDrop={(event) => { event.preventDefault(); const source = event.dataTransfer.getData('text/plain') || dragging; if (source) reorder(source, column.key); setDragging(null); setDragOver(null); }}
            onDragEnd={() => { setDragging(null); setDragOver(null); }}
          >
            <span className="cursor-grab text-fg-subtle active:cursor-grabbing" title="Drag to reorder"><GripVertical size={16} /></span>
            <button className={`grid h-5 w-5 place-items-center rounded border ${checked ? 'border-primary bg-primary text-white' : 'border-border'}`} title={checked && visible.length === 1 ? 'At least one column must remain visible' : checked ? 'Hide column' : 'Show column'} onClick={() => toggle(column.key)}>{checked && <Check size={12} />}</button>
            <span className="min-w-0 flex-1 truncate text-xs font-medium">{column.label}</span>
            <button className="action h-7 w-7" title="Move up" disabled={index === 0} onClick={() => move(column.key, -1)}><ChevronUp size={13} /></button>
            <button className="action h-7 w-7" title="Move down" disabled={index === columns.length - 1} onClick={() => move(column.key, 1)}><ChevronDown size={13} /></button>
          </div>;
        })}</div>
        <div className="border-t border-border p-3"><button className="btn-secondary w-full" onClick={reset}><RotateCcw size={13} />Reset: show all columns</button></div>
      </div>
    </>}
  </div>;
}
