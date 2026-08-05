import { FormEvent,useState } from 'react';
import { useMutation,useQuery,useQueryClient } from '@tanstack/react-query';
import { HandCoins,Plus,Search,Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { payrollApi,RecordData,transactionApi } from '../../api';
import { useFy } from '../../fyStore';
import { useAuth } from '../../authStore';
import { Autocomplete } from '../../components/Autocomplete';
import { Modal } from '../../components/Modal';
import { AuditActionButton } from '../../components/AuditTimeline';
import { PageTitle } from '../UsersPage';

const today=()=>new Date().toISOString().slice(0,10),month=()=>today().slice(0,7);

export function SalaryAdvancePage(){
  const fy=useFy(s=>s.activeId),has=useAuth(s=>s.has),qc=useQueryClient();
  const [search,setSearch]=useState(''),[open,setOpen]=useState(false),[employee,setEmployee]=useState('');
  const [form,setForm]=useState<any>({advance_date:today(),employee_id:null,amount:0,recovery_month:month(),remarks:''});
  const list=useQuery({queryKey:['salary-advances',fy,search],queryFn:()=>payrollApi.advances({financial_year_id:fy,search}),enabled:!!fy});
  const create=useMutation({mutationFn:()=>payrollApi.createAdvance({...form,financial_year_id:fy}),onSuccess:r=>{toast.success(r.message);setOpen(false);qc.invalidateQueries({queryKey:['salary-advances']})},onError:(e:Error)=>toast.error(e.message)});
  const remove=useMutation({mutationFn:payrollApi.deleteAdvance,onSuccess:r=>{toast.success(r.message);qc.invalidateQueries({queryKey:['salary-advances']})},onError:(e:Error)=>toast.error(e.message)});
  const submit=(e:FormEvent)=>{e.preventDefault();if(!form.employee_id)return toast.error('Select employee');create.mutate()};
  const newAdvance=()=>{setEmployee('');setForm({advance_date:today(),employee_id:null,amount:0,recovery_month:month(),remarks:''});setOpen(true)};
  return <div>
    <PageTitle title="Salary Advance" subtitle="Simple employee advance and monthly recovery" icon={HandCoins} action={has('SALARY_ADVANCE_CREATE')?<button className="btn-primary" onClick={newAdvance}><Plus size={15}/>New Advance</button>:undefined}/>
    <section className="panel overflow-hidden">
      <div className="table-toolbar"><div className="relative max-w-sm flex-1"><Search className="search-icon" size={15}/><input className="input pl-9" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Advance no or employee…"/></div><span>{list.data?.length??0} records</span></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[900px]"><thead><tr><th>Advance No</th><th>Date</th><th>Employee</th><th>Department</th><th>Recovery Month</th><th className="text-right">Amount</th><th>Status</th><th className="text-right">Actions</th></tr></thead><tbody>{list.data?.map(row=><tr key={row.id}><td className="font-semibold text-primary">{String(row.advance_no)}</td><td>{String(row.advance_date)}</td><td><strong className="text-fg">{String(row.employee_name)}</strong><small className="block">{String(row.employee_code)}</small></td><td>{String(row.department_name??'—')}</td><td>{String(row.recovery_month)}</td><td className="text-right font-semibold">₹ {Number(row.amount).toLocaleString('en-IN')}</td><td><span className={row.status==='RECOVERED'?'badge-active':'badge-warn'}>{String(row.status)}</span></td><td><div className="flex justify-end gap-1">{has('AUDIT_VIEW')&&<AuditActionButton entityType="salary-advances" recordId={row.id} title={String(row.advance_no)} code={String(row.advance_no)}/>} {row.status==='PENDING'&&has('SALARY_ADVANCE_DELETE')&&<button className="action danger" title="Delete" onClick={()=>confirm('Delete this salary advance?')&&remove.mutate(row.id)}><Trash2 size={15}/></button>}</div></td></tr>)}</tbody></table></div>
      {!list.data?.length&&<div className="empty-state">No salary advances found.</div>}
    </section>
    <Modal open={open} onClose={()=>setOpen(false)} title="New Salary Advance" footer={<><button className="btn-secondary" onClick={()=>setOpen(false)}>Cancel</button><button className="btn-primary" form="advance-form">Save Advance</button></>}>
      <form id="advance-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <div><label className="label">Advance Date *</label><input className="input" type="date" value={form.advance_date} onChange={e=>setForm({...form,advance_date:e.target.value})}/></div>
        <div><label className="label">Recovery Month *</label><input className="input" type="month" value={form.recovery_month} onChange={e=>setForm({...form,recovery_month:e.target.value})}/></div>
        <div className="sm:col-span-2"><Autocomplete label="Employee" required value={employee} onChange={setEmployee} onSelect={(row:RecordData|null)=>setForm({...form,employee_id:row?.id??null})} fetchOptions={s=>transactionApi.autocomplete('employees',s)} renderOption={row=><span><strong>{String(row.full_name)}</strong> · {String(row.code)}</span>}/></div>
        <div><label className="label">Advance Amount *</label><input className="input" type="number" value={form.amount} onChange={e=>setForm({...form,amount:Number(e.target.value)})}/></div>
        <div><label className="label">Remarks</label><input className="input" value={form.remarks} onChange={e=>setForm({...form,remarks:e.target.value})}/></div>
      </form>
    </Modal>
  </div>
}
