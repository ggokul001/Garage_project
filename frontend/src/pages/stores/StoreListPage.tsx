import { useState } from 'react';
import { useMutation,useQuery,useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Eye,Pencil,Plus,Search,Trash2,Warehouse } from 'lucide-react';
import { transactionApi } from '../../api';
import { useAuth } from '../../authStore';
import { useFy } from '../../fyStore';
import { AuditActionButton } from '../../components/AuditTimeline';
import { PageTitle } from '../UsersPage';

export function StoreListPage(){
  const navigate=useNavigate(),qc=useQueryClient(),has=useAuth(s=>s.has),fy=useFy(s=>s.activeId);
  const[page,setPage]=useState(1),[search,setSearch]=useState('');
  const list=useQuery({queryKey:['stores',fy,page,search],queryFn:()=>transactionApi.stores({financial_year_id:fy,page,search}),enabled:!!fy});
  const remove=useMutation({mutationFn:transactionApi.deleteStore,onSuccess:()=>{toast.success('Store Entry deleted');qc.invalidateQueries({queryKey:['stores']})},onError:(e:Error)=>toast.error(e.message)});
  return <div><PageTitle title="Store" subtitle="Cash and credit spare purchase entries" icon={Warehouse} action={has('STORE_CREATE')?<button className="btn-primary" onClick={()=>navigate('/stores/new')}><Plus size={16}/>New Store Entry</button>:undefined}/><div className="panel overflow-hidden"><div className="table-toolbar"><div className="relative max-w-sm flex-1"><Search className="search-icon" size={15}/><input className="input pl-9" value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}} placeholder="Store no, bill no or vendor..."/></div><span>{list.data?.meta.total??0} records</span></div><div className="overflow-x-auto"><table className="w-full min-w-[1050px]"><thead><tr><th>Store No</th><th>Date</th><th>Bill No</th><th>Vendor</th><th>Type</th><th className="text-right">Net Amount</th><th>Payment</th><th className="text-right">Actions</th></tr></thead><tbody>{list.data?.data.map((row:any)=><tr key={row.id}><td className="font-semibold text-primary">{row.store_no}</td><td>{row.entry_date}</td><td>{row.bill_no}</td><td><div className="font-medium text-fg">{row.vendor_name}</div><small>{row.vendor_code}</small></td><td><span className={row.store_type==='CREDIT'?'badge-warn':'badge-info'}>{row.store_type}</span></td><td className="text-right font-semibold text-fg">₹ {Number(row.net_amount).toLocaleString('en-IN')}</td><td><span className={row.payment_status==='PAID'?'badge-active':row.payment_status==='PARTIALLY PAID'?'badge-warn':'badge-danger'}>{row.payment_status}</span></td><td><div className="flex justify-end gap-1"><button className="action" title="View" onClick={()=>navigate(`/stores/${row.id}`)}><Eye size={15}/></button>{has('AUDIT_VIEW')&&<AuditActionButton entityType="stores" recordId={row.id} title={String(row.store_no)} code={String(row.store_no)}/>} {has('STORE_UPDATE')&&!row.payment_locked&&<button className="action" title="Edit" onClick={()=>navigate(`/stores/${row.id}`)}><Pencil size={15}/></button>}{has('STORE_DELETE')&&!row.payment_locked&&<button className="action danger" title="Delete" onClick={()=>confirm('Delete this Store Entry?')&&remove.mutate(row.id)}><Trash2 size={15}/></button>}</div></td></tr>)}</tbody></table></div>{!list.data?.data.length&&!list.isLoading&&<div className="empty-state"><Warehouse size={30}/><span>No Store Entries found</span></div>}</div></div>
}
