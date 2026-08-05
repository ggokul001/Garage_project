import { AlertTriangle } from 'lucide-react';
import { useFy } from '../fyStore';

export function FyBanner() {
  const years = useFy((state) => state.years);
  const activeId = useFy((state) => state.activeId);
  const selected = years.find((year) => Number(year.id) === Number(activeId));
  if (!selected || Boolean(selected.is_current)) return null;
  return <div className="z-20 flex shrink-0 items-center justify-center gap-2 border-b border-amber-500/30 bg-amber-400 px-4 py-2 text-center text-xs font-semibold text-amber-950 shadow-sm sm:text-sm"><AlertTriangle size={16} className="shrink-0" /><span>You are working in Financial Year <strong>{String(selected.name)}</strong>. This is not the current financial year.</span></div>;
}
