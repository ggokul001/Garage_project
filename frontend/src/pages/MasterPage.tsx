import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Eye, ImagePlus, Pencil, Plus, Search, Trash2, Inbox, XCircle } from 'lucide-react';
import { masterApi, MasterSlug, RecordData } from '../api';
import { Field, masterBySlug } from '../masterConfig';
import { Modal } from '../components/Modal';
import { useAuth } from '../authStore';
import { cleanInput, validationProps } from '../utils/inputValidation';
import { AuditActionButton } from '../components/AuditTimeline';
import { ListPagination } from '../components/ListPagination';
import { useListQueryState } from '../hooks/useListQueryState';

const emptyFor=(fields:Field[])=>Object.fromEntries(fields.map(f=>[f.name,f.name==='payroll_applicable'?true:f.type==='checkbox'?false:f.name==='status'?'active':f.type==='number'?0:'']));
const show=(v:unknown)=>v===null||v===undefined||v===''?'—':String(v);
const permissionPrefix:Record<MasterSlug,string>={companies:'COMPANY',branches:'BRANCH',departments:'DEPARTMENT',designations:'DESIGNATION',employees:'EMPLOYEE',customers:'CUSTOMER',vendors:'VENDOR',vehicles:'VEHICLE',uoms:'UOM',products:'PRODUCT','work-pending-sub-statuses':'PENDING_STATUS','financial-years':'FY',shifts:'SHIFT'};

export function MasterPage(){
  const {slug:raw}=useParams(); const slug=raw as MasterSlug; const def=masterBySlug[slug]; const qc=useQueryClient();
  const has=useAuth(s=>s.has),user=useAuth(s=>s.user),prefix=permissionPrefix[slug],isCompanyProfile=slug==='companies';const canCreate=!isCompanyProfile&&has(`${prefix}_CREATE`),canUpdate=has(`${prefix}_UPDATE`),canDelete=!isCompanyProfile&&has(`${prefix}_DELETE`);
  const canSelectBranch=['ADMIN','SUPER_ADMIN'].includes(String(user?.role_code??''));
  const {page,pageSize,search,setPage,setPageSize,setSearch}=useListQueryState();
  const [formOpen,setFormOpen]=useState(false),[editing,setEditing]=useState<RecordData|null>(null),[viewing,setViewing]=useState<RecordData|null>(null),[searchText,setSearchText]=useState(search);
  const [form,setForm]=useState<Record<string,unknown>>({});
  const [companyLogo,setCompanyLogo]=useState<File|null>(null);
  useEffect(()=>{setPage(1);setSearch('');setSearchText('');setFormOpen(false);setEditing(null)},[slug]);
  const list=useQuery({queryKey:['master',slug,page,pageSize,search],queryFn:()=>masterApi.list(slug,{page,pageSize,search})});
  const branding=useQuery({queryKey:['company-branding'],queryFn:masterApi.companyBranding,enabled:isCompanyProfile});
  const save=useMutation({mutationFn:(data:Record<string,unknown>)=>editing?masterApi.update(slug,editing.id,data):masterApi.create(slug,data),onSuccess:()=>{toast.success(`${def.singular} ${editing?'updated':'created'}`);setFormOpen(false);setEditing(null);qc.invalidateQueries({queryKey:['master',slug]})},onError:(e:Error)=>toast.error(e.message)});
  const saveLogo=useMutation({mutationFn:()=>masterApi.saveCompanyLogo(companyLogo!),onSuccess:(response:any)=>{toast.success(response.message);setCompanyLogo(null);qc.invalidateQueries({queryKey:['master','companies']});qc.invalidateQueries({queryKey:['company-branding']})},onError:(e:Error)=>toast.error(e.message)});
  const remove=useMutation({mutationFn:(id:number)=>masterApi.remove(slug,id),onSuccess:()=>{toast.success(`${def.singular} deleted`);qc.invalidateQueries({queryKey:['master',slug]})},onError:(e:Error)=>toast.error(e.message)});
  const startCreate=()=>{setEditing(null);const empty=emptyFor(def.fields);setForm(['employees','customers','vehicles'].includes(slug)&&!canSelectBranch?{...empty,branch_id:user?.branch_id??''}:empty);setFormOpen(true)};
  const startEdit=(row:RecordData)=>{setEditing(row);setForm(Object.fromEntries(def.fields.map(f=>[f.name,row[f.name]??(f.type==='checkbox'?false:'')])));setFormOpen(true)};
  const submit=(e:FormEvent)=>{e.preventDefault();const missing=def.fields.find(f=>(editing||f.name!=='code')&&f.required&&(form[f.name]===undefined||form[f.name]===null||form[f.name]===''));if(missing){toast.error(`${missing.label} is required`);return}save.mutate(form)};
  if(!def)return <div>Master not found</div>;
  const total=list.data?.meta.total??0;
  return <div>
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center"><div><h1 className="text-xl font-bold tracking-tight">{isCompanyProfile?'Company Profile':def.title}</h1><p className="mt-1 text-sm text-fg-muted">{isCompanyProfile?'View and maintain your own company details':def.subtitle}</p></div>{canCreate&&<button className="btn-primary sm:ml-auto" onClick={startCreate}><Plus size={16}/>New {def.singular.toLowerCase()}</button>}</div>
    {isCompanyProfile&&list.data?.data[0]&&<section className="panel mb-4 p-5"><div className="grid items-center gap-5 md:grid-cols-[220px_1fr]"><div className="grid min-h-28 place-items-center rounded-xl border border-dashed border-border bg-white p-3">{branding.data?.logo_data_url?<img src={String(branding.data.logo_data_url)} alt="Company logo" className="max-h-24 max-w-full object-contain"/>:<div className="text-center text-xs text-fg-subtle">No company logo uploaded</div>}</div><div><h3 className="font-semibold">Company Print Logo</h3><p className="mt-1 text-xs leading-5 text-fg-muted">Job Card, Work Order and Salary Slip prints use this company logo and profile details. Ara Garage product logo will not be used as fallback.</p><div className="mt-3 flex flex-wrap items-center gap-2"><label className="btn-secondary cursor-pointer"><ImagePlus size={15}/>Select logo<input className="hidden" type="file" accept=".jpg,.jpeg,.png,.webp" onChange={event=>setCompanyLogo(event.target.files?.[0]??null)}/></label>{companyLogo&&<button className="btn-primary" onClick={()=>saveLogo.mutate()} disabled={saveLogo.isPending}>{saveLogo.isPending?'Uploading...':'Upload logo'}</button>}{companyLogo&&<span className="text-xs text-fg-muted">{companyLogo.name}</span>}</div></div></div></section>}
    <div className="card overflow-hidden p-0"><div className="flex items-center border-b border-border p-4"><div className="relative w-full max-w-sm"><Search size={15} className="absolute left-3 top-2.5 text-fg-subtle"/><input className="input pl-9" value={searchText} onChange={e=>{const value=e.target.value;setSearchText(value);setSearch(value)}} placeholder={`Search ${def.title.toLowerCase()}...`}/>{searchText&&<button type="button" onClick={()=>{setSearchText('');setSearch('')}} className="absolute right-2 top-2 text-fg-subtle hover:text-fg"><XCircle size={17}/></button>}</div><span className="ml-auto hidden text-xs text-fg-subtle sm:block">{total} record{total===1?'':'s'}</span></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left"><thead><tr>{def.columns.map(c=><th key={c.key}>{c.label}</th>)}<th>Status</th><th className="w-32 text-right">Actions</th></tr></thead><tbody>
        {list.isLoading&&Array.from({length:5}).map((_,i)=><tr key={i}>{Array.from({length:def.columns.length+2}).map((_,j)=><td key={j}><div className="h-3 animate-pulse rounded bg-surface-3"/></td>)}</tr>)}
        {list.isError&&<tr><td colSpan={def.columns.length+2}><div className="grid place-items-center py-14 text-danger"><XCircle size={30}/><div className="mt-2 text-sm font-medium">{list.error instanceof Error?list.error.message:'Unable to load records'}</div><button className="btn-secondary mt-4" onClick={()=>list.refetch()}>Try again</button></div></td></tr>}
        {!list.isLoading&&list.data?.data.map(row=><tr key={row.id}>{def.columns.map(c=><td key={c.key}>{show(c.render?c.render(row):row[c.key])}</td>)}<td><span className={row.status==='active'?'badge-active':'badge-inactive'}>{row.status}</span></td><td><div className="flex justify-end gap-1"><button className="action" title="View" onClick={()=>setViewing(row)}><Eye size={15}/></button>{has('AUDIT_VIEW')&&<AuditActionButton entityType={slug} recordId={row.id} title={String(row.name??row.full_name??row.vehicle_number??row.code??row.id)} code={String(row.code??row.vehicle_number??row.id)}/>} {canUpdate&&<button className="action" title="Edit" onClick={()=>startEdit(row)}><Pencil size={15}/></button>}{canDelete&&<button className="action danger" title="Delete" onClick={()=>confirm(`Delete this ${def.singular.toLowerCase()}?`)&&remove.mutate(row.id)}><Trash2 size={15}/></button>}</div></td></tr>)}
        {!list.isLoading&&!list.isError&&!list.data?.data.length&&<tr><td colSpan={def.columns.length+2}><div className="grid place-items-center py-14 text-fg-subtle"><Inbox size={30}/><div className="mt-2 text-sm font-medium">No {def.title.toLowerCase()} found</div></div></td></tr>}
      </tbody></table></div>
      <ListPagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} onPageSizeChange={setPageSize}/>
    </div>
    <Modal open={formOpen} onClose={()=>setFormOpen(false)} title={isCompanyProfile?'Edit Company Profile':`${editing?'Edit':'New'} ${def.singular}`} wide={def.fields.length>10} footer={<><button className="btn-secondary" onClick={()=>setFormOpen(false)}>Cancel</button><button form="master-form" className="btn-primary" disabled={save.isPending}>{save.isPending?'Saving...':editing?'Save changes':'Create'}</button></>}><form id="master-form" onSubmit={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">{!editing&&def.fields.some(field=>field.name==='code')&&<div className="sm:col-span-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-xs font-medium text-primary">Code will be generated automatically when this record is created.</div>}{def.fields.filter(field=>(editing||field.name!=='code')&&(!isCompanyProfile||field.name!=='status')).map(field=>['employees','customers','vehicles'].includes(slug)&&field.name==='branch_id'&&!canSelectBranch?<ReadOnlyBranchField key={field.name} label={field.label} value={String(user?.branch_name??'Assigned branch')}/>:<FormField key={field.name} field={field} value={form[field.name]} readOnly={editing&&field.name==='code'} onChange={value=>setForm(v=>({...v,[field.name]:value}))}/>)}</form></Modal>
    <Modal open={!!viewing} onClose={()=>setViewing(null)} title={`${def.singular} details`} wide><div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">{viewing&&def.fields.map(field=><div key={field.name} className={field.span===2?'sm:col-span-2':''}><div className="text-[10px] font-semibold uppercase tracking-wider text-fg-subtle">{field.label}</div><div className="mt-1 text-sm font-medium text-fg">{field.type==='checkbox'?(viewing[field.name]?'Yes':'No'):show(viewing[field.name])}</div></div>)}</div></Modal>
  </div>;
}

function ReadOnlyBranchField({label,value}:{label:string;value:string}){return <div><label className="label">{label}<span className="text-danger"> *</span></label><input className="input" value={value} disabled readOnly/></div>}
function FormField({field,value,onChange,readOnly=false}:{field:Field;value:unknown;onChange:(v:unknown)=>void;readOnly?:boolean|null}){
  const lookup=useQuery({queryKey:['options',field.lookup],queryFn:()=>masterApi.options(field.lookup!),enabled:!!field.lookup,staleTime:60000});
  const options=useMemo(()=>field.lookup?(lookup.data??[]).map(row=>({value:String(row.id),label:field.lookupLabel?.(row)??String(row.name??row.full_name??row.code)})):(field.options??[]),[field,lookup.data]);
  const cls=field.span===2?'sm:col-span-2':''; const label=<label className="label">{field.label}{field.required&&<span className="text-danger"> *</span>}</label>;
  if(field.type==='checkbox')return <label className={`${cls} mt-6 flex items-center gap-2 text-sm text-fg`}><input type="checkbox" checked={Boolean(value)} onChange={e=>onChange(e.target.checked)} className="h-4 w-4 rounded border-border text-primary"/>{field.label}</label>;
  if(field.type==='textarea')return <div className={cls}>{label}<textarea className="input h-20 py-2" value={String(value??'')} onChange={e=>onChange(e.target.value)}/></div>;
  if(field.type==='select')return <div className={cls}>{label}<select className="input" required={field.required} value={String(value??'')} onChange={e=>onChange(field.lookup&&e.target.value?Number(e.target.value):e.target.value)}><option value="">Select {field.label.toLowerCase()}</option>{options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select></div>;
  const format=field.format??(field.type==='number'?'decimal':undefined);
  const props=validationProps(format);
  const inputType=field.type==='number'?'text':field.type??'text';
  return <div className={cls}>{label}<input className="input" type={inputType} required={field.required} readOnly={Boolean(readOnly)} maxLength={field.maxLength} value={String(value??'')} onChange={e=>onChange(cleanInput(e.target.value,format,field.maxLength))} autoComplete="off" {...props}/>{readOnly&&<p className="mt-1 text-[10px] text-fg-subtle">System-generated code cannot be changed.</p>}</div>;
}
