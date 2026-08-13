import {useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {Eye,History,Search,X} from 'lucide-react';
import {AuditRow,superAdminApi} from '../../api';
import {ListPagination} from '../../components/ListPagination';
import {Modal} from '../../components/Modal';
import {useListQueryState} from '../../hooks/useListQueryState';
import {friendlyColumn} from '../../utils/report';
import {PageTitle} from '../UsersPage';
import {AuditValue,normalizeAuditData} from '../../components/AuditValue';

const show=(value:unknown)=>value===null||value===undefined||value===''?'—':typeof value==='object'?JSON.stringify(value):String(value);
const actions=['CREATE','UPDATE','DELETE','STATUS CHANGE','TRIAL EXTENSION','PAID CONVERSION','ADMIN CREDENTIALS','BILLING UPDATE','DUE CORRECTION','ATTACHMENT UPLOAD','ATTACHMENT DELETE'];

export function SuperAdminAuditPage(){
  const{page,pageSize,search,setPage,setPageSize,setSearch}=useListQueryState();
  const[module,setModule]=useState(''),[action,setAction]=useState(''),[company,setCompany]=useState(''),[user,setUser]=useState(''),[from,setFrom]=useState(''),[to,setTo]=useState(''),[selected,setSelected]=useState<AuditRow|null>(null);
  const options=useQuery({queryKey:['super-admin-audit-options'],queryFn:superAdminApi.auditOptions});
  const params={page,pageSize,search:search||undefined,module:module||undefined,action:action||undefined,company_id:company||undefined,user_id:user||undefined,from:from||undefined,to:to||undefined};
  const logs=useQuery({queryKey:['super-admin-audit',params],queryFn:()=>superAdminApi.audit(params)}),rows=logs.data?.data??[];
  const reset=()=>{setSearch('');setModule('');setAction('');setCompany('');setUser('');setFrom('');setTo('');setPage(1)};
  return <div><PageTitle title="Super Admin Audit Log" subtitle="Every platform entry, change, actor and reason in one place" icon={History}/>
    <section className="panel mb-4 p-4"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
      <Filter label="Search"><div className="relative"><Search size={14} className="search-icon"/><input className="input pl-9" value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}} placeholder="Company, record or route..."/></div></Filter>
      <Filter label="Company"><select className="input" value={company} onChange={e=>{setCompany(e.target.value);setPage(1)}}><option value="">All companies</option>{options.data?.companies.map(row=><option key={row.id} value={row.id}>{String(row.name)}</option>)}</select></Filter>
      <Filter label="Module"><select className="input" value={module} onChange={e=>{setModule(e.target.value);setPage(1)}}><option value="">All modules</option>{options.data?.modules.map(value=><option key={value}>{value}</option>)}</select></Filter>
      <Filter label="Action"><select className="input" value={action} onChange={e=>{setAction(e.target.value);setPage(1)}}><option value="">All actions</option>{actions.map(value=><option key={value}>{value}</option>)}</select></Filter>
      <Filter label="Super Admin"><select className="input" value={user} onChange={e=>{setUser(e.target.value);setPage(1)}}><option value="">All users</option>{options.data?.users.map(row=><option key={row.id} value={row.id}>{String(row.full_name)}</option>)}</select></Filter>
      <Filter label="From"><input className="input" type="date" value={from} onChange={e=>{setFrom(e.target.value);setPage(1)}}/></Filter><Filter label="To"><input className="input" type="date" min={from||undefined} value={to} onChange={e=>{setTo(e.target.value);setPage(1)}}/></Filter>
    </div><div className="mt-3 flex justify-end"><button className="btn-secondary" onClick={reset}><X size={14}/>Clear filters</button></div></section>
    <section className="panel overflow-hidden"><div className="table-toolbar"><strong>Platform Activity</strong><span>{logs.data?.meta.total??0} records</span></div><div className="overflow-x-auto"><table className="w-full min-w-[1150px]"><thead><tr><th>Date & Time</th><th>Company</th><th>Module</th><th>Entry / Record</th><th>Action</th><th>Performed By</th><th>IP Address</th><th className="text-right">Details</th></tr></thead><tbody>{rows.map(row=><tr key={row.id}><td>{new Date(row.created_at).toLocaleString()}</td><td><strong>{String((row as any).company_name??'Platform')}</strong>{(row as any).company_code&&<small className="block">{String((row as any).company_code)}</small>}</td><td>{row.module_name}</td><td><strong>{row.record_display_name||'—'}</strong><small className="block">ID: {row.record_id||'—'}</small></td><td><span className={tone(row.action)}>{row.action}</span></td><td><strong>{row.user_name}</strong><small className="block">{row.username}</small></td><td>{row.ip_address||'—'}</td><td><div className="flex justify-end"><button className="action" title="View audit details" onClick={()=>setSelected(row)}><Eye size={15}/></button></div></td></tr>)}</tbody></table></div>{!rows.length&&!logs.isLoading&&<div className="empty-state"><History size={30}/><span>No Super Admin audit entries found</span></div>}<ListPagination page={page} pageSize={pageSize} total={logs.data?.meta.total??0} onPageChange={setPage} onPageSizeChange={setPageSize}/></section>
    <AuditDetails row={selected} close={()=>setSelected(null)}/>
  </div>
}

function AuditDetails({row,close}:{row:AuditRow|null;close:()=>void}){const before=normalizeAuditData(row?.old_values),after=normalizeAuditData(row?.new_values),keys=[...new Set([...Object.keys(before),...Object.keys(after)])].filter(key=>!['password','password_hash'].includes(key.toLowerCase()));return <Modal open={!!row} onClose={close} title={`${row?.action??''} — ${row?.record_display_name??'Entry'}`} wide footer={<button className="btn-secondary" onClick={close}>Close</button>}><div className="mb-4 grid gap-3 sm:grid-cols-4"><Info label="Company" value={(row as any)?.company_name??'Platform'}/><Info label="Module" value={row?.module_name}/><Info label="Performed By" value={row?.user_name}/><Info label="Date & Time" value={row?new Date(row.created_at).toLocaleString():''}/></div><div className="max-h-[55vh] space-y-2 overflow-auto rounded-xl border border-border p-3">{keys.map(key=><AuditField key={key} name={key} oldValue={before[key]} newValue={after[key]}/>)}{!keys.length&&<div className="empty-state py-10">No field payload available for this action.</div>}</div><p className="mt-3 text-[10px] text-fg-subtle">Route: {row?.route} · IP: {row?.ip_address??'—'}</p></Modal>}
function AuditField({name,oldValue,newValue}:{name:string;oldValue:unknown;newValue:unknown}){return <section className="rounded-lg border border-border p-3"><strong className="text-xs">{friendlyColumn(name)}</strong><div className="mt-2 grid gap-3 lg:grid-cols-2"><div className="rounded-lg bg-surface-2 p-3"><span className="text-[9px] font-bold tracking-wider text-fg-subtle">PREVIOUS</span><div className="mt-2"><AuditValue value={oldValue} fieldKey={name}/></div></div><div className="rounded-lg bg-surface-2 p-3"><span className="text-[9px] font-bold tracking-wider text-fg-subtle">NEW VALUE / INPUT</span><div className="mt-2"><AuditValue value={newValue} fieldKey={name}/></div></div></div></section>}
function Info({label,value}:{label:string;value:unknown}){return <div className="calculated-card"><span>{label}</span><strong>{show(value)}</strong></div>}
function Filter({label,children}:{label:string;children:React.ReactNode}){return <div><label className="label">{label}</label>{children}</div>}
function tone(action:string){return action.includes('DELETE')||action==='STATUS CHANGE'?'badge-danger':action.includes('CREATE')||action.includes('CONVERSION')?'badge-active':action.includes('TRIAL')||action.includes('DUE')?'badge-warn':'badge-info'}
