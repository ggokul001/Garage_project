import {ChevronFirst,ChevronLast,ChevronLeft,ChevronRight} from 'lucide-react';

type Props={page:number;pageSize:number;total:number;onPageChange:(page:number)=>void;onPageSizeChange?:(size:number)=>void};

export function ListPagination({page,pageSize,total,onPageChange,onPageSizeChange}:Props){
  const pages=Math.max(1,Math.ceil(total/pageSize)),from=total?(page-1)*pageSize+1:0,to=Math.min(page*pageSize,total);
  return <div className="list-pagination">
    <div className="flex items-center gap-2"><span>Showing {from}–{to} of {total.toLocaleString('en-IN')}</span>{onPageSizeChange&&<select aria-label="Rows per page" className="page-size-select" value={pageSize} onChange={event=>onPageSizeChange(Number(event.target.value))}>{[10,15,25,50,100].map(size=><option key={size} value={size}>{size} / page</option>)}</select>}</div>
    <div className="ml-auto flex items-center gap-1">
      <button className="page-btn" title="First page" disabled={page<=1} onClick={()=>onPageChange(1)}><ChevronFirst size={15}/></button>
      <button className="page-btn" title="Previous page" disabled={page<=1} onClick={()=>onPageChange(page-1)}><ChevronLeft size={15}/></button>
      <input aria-label="Current page" className="page-number-input" type="number" min={1} max={pages} value={page} onChange={event=>{const value=Number(event.target.value);if(value>=1&&value<=pages)onPageChange(value)}}/>
      <span className="px-1 font-semibold text-fg">/ {pages}</span>
      <button className="page-btn" title="Next page" disabled={page>=pages} onClick={()=>onPageChange(page+1)}><ChevronRight size={15}/></button>
      <button className="page-btn" title="Last page" disabled={page>=pages} onClick={()=>onPageChange(pages)}><ChevronLast size={15}/></button>
    </div>
  </div>;
}
