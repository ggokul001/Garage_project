import { useQuery } from '@tanstack/react-query';
import { Search, Warehouse } from 'lucide-react';
import { useEffect, useState } from 'react';
import { masterApi, transactionApi } from '../../api';
import { PageTitle } from '../UsersPage';
import { useAuth } from '../../authStore';

export function InventoryPage(){
  const has=useAuth(s=>s.has),user=useAuth(s=>s.user);
  const canViewAll=['ADMIN','COMPANY_ADMIN','SUPER_ADMIN'].includes(String(user?.role_code??''));
  const assignedBranchId=Number((user as any)?.branch_id??(user as any)?.branch_ids?.[0]??0)||0;
  const [tab,setTab]=useState<'stock'|'ledger'|'low'>('stock'),[search,setSearch]=useState(''),[branchId,setBranchId]=useState('');
  useEffect(()=>{if(!canViewAll&&assignedBranchId)setBranchId(String(assignedBranchId));},[canViewAll,assignedBranchId]);
  const branches=useQuery({queryKey:['inventory','branches'],queryFn:()=>masterApi.options('branches'),enabled:canViewAll});
  const params={search,branch_id:branchId||undefined};
  const stock=useQuery({queryKey:['inventory','stock',search,branchId],queryFn:()=>transactionApi.inventoryAvailability(params),enabled:tab==='stock'});
  const ledger=useQuery({queryKey:['inventory','ledger',search,branchId],queryFn:()=>transactionApi.inventoryLedger(params),enabled:tab==='ledger'});
  const low=useQuery({queryKey:['inventory','low',search,branchId],queryFn:()=>transactionApi.inventoryLowStock(params),enabled:tab==='low'});
  const rows=tab==='stock'?stock.data??[]:tab==='ledger'?ledger.data??[]:low.data??[];
  return <div><PageTitle title="Inventory" subtitle="Stock availability, movements and low-stock monitoring" icon={Warehouse}/>
    <section className="panel overflow-hidden"><div className="table-toolbar flex-wrap"><div className="relative min-w-64 max-w-sm flex-1"><Search className="search-icon" size={15}/><input className="input pl-9" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search product or reference..."/></div><select className="input max-w-xs" value={branchId} disabled={!canViewAll} onChange={e=>setBranchId(e.target.value)}><option value="">All branches</option>{branches.data?.map(branch=><option key={branch.id} value={String(branch.id)}>{String(branch.name)}</option>)}</select><div className="flex gap-1"><button className={tab==='stock'?'btn-primary':'btn-secondary'} onClick={()=>setTab('stock')}>Stock availability</button>{has('INVENTORY_LEDGER_VIEW')&&<button className={tab==='ledger'?'btn-primary':'btn-secondary'} onClick={()=>setTab('ledger')}>Stock ledger</button>}<button className={tab==='low'?'btn-primary':'btn-secondary'} onClick={()=>setTab('low')}>Low stock</button></div></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[900px]"><thead>{tab==='ledger'?<tr><th>Date</th><th>Branch</th><th>Product</th><th>Movement</th><th>Qty</th><th>Source</th><th>Reference</th></tr>:<tr><th>Product code</th><th>Product</th><th>Part number</th><th>UOM</th><th className="text-right">Current stock</th><th className="text-right">Reorder level</th><th>Status</th></tr>}</thead><tbody>{rows.map((row:any)=><tr key={row.id??`${row.product_code}-${row.branch_name}`}>
        {tab==='ledger'?<><td>{String(row.created_at).slice(0,16).replace('T',' ')}</td><td>{row.branch_name}</td><td><strong>{row.product_code}</strong><div>{row.product_name}</div></td><td>{String(row.movement_type).replaceAll('_',' ')}</td><td>{row.quantity} {row.uom_code}</td><td>{row.source_type}</td><td>{row.reference_no??'—'}</td></>:<><td className="font-semibold text-primary">{row.code}</td><td>{row.name}</td><td>{row.part_number??'—'}</td><td>{row.uom_code}</td><td className="text-right font-semibold">{Number(row.current_stock).toLocaleString('en-IN')}</td><td className="text-right">{Number(row.reorder_level).toLocaleString('en-IN')}</td><td><span className={Number(row.current_stock)===0||Number(row.reorder_level)>0&&Number(row.current_stock)<=Number(row.reorder_level)?'badge-warn':'badge-active'}>{Number(row.current_stock)===0?'OUT OF STOCK':Number(row.reorder_level)>0&&Number(row.current_stock)<=Number(row.reorder_level)?'LOW':'OK'}</span></td></>}
      </tr>)}</tbody></table></div>{!rows.length&&<div className="empty-state"><Warehouse size={30}/><span>No inventory records found</span></div>}</section></div>;
}
