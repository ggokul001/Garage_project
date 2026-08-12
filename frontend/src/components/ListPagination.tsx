import {ChevronLeft,ChevronRight} from 'lucide-react';

type Props={page:number;pageSize:number;total:number;onPageChange:(page:number)=>void};

export function ListPagination({page,pageSize,total,onPageChange}:Props){
  const pages=Math.max(1,Math.ceil(total/pageSize)),from=total?(page-1)*pageSize+1:0,to=Math.min(page*pageSize,total);
  if(total<=pageSize)return null;
  return <div className="flex flex-wrap items-center gap-3 border-t border-border px-4 py-3 text-xs text-fg-muted">
    <span>Showing {from}–{to} of {total.toLocaleString('en-IN')}</span>
    <span className="hidden sm:inline">Page {page} of {pages}</span>
    <div className="ml-auto flex items-center gap-1">
      <button className="page-btn" title="Previous page" disabled={page<=1} onClick={()=>onPageChange(page-1)}><ChevronLeft size={15}/></button>
      <span className="min-w-16 text-center font-medium text-fg sm:hidden">{page} / {pages}</span>
      <button className="page-btn" title="Next page" disabled={page>=pages} onClick={()=>onPageChange(page+1)}><ChevronRight size={15}/></button>
    </div>
  </div>;
}
