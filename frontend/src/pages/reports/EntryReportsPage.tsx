import { useMemo,useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download,FileBarChart,Search,SlidersHorizontal,X } from 'lucide-react';
import { reportApi } from '../../api';
import { useFy } from '../../fyStore';
import { useAuth } from '../../authStore';
import { PageTitle } from '../UsersPage';
import { ReportColumnManager,useReportColumns } from '../../components/ReportColumnManager';
import { exportExcel as exportCsv,friendlyColumn,reportValue } from '../../utils/report';

const statusOptions:Record<string,string[]|undefined>={
  'job-cards':['draft','approved','in_progress','completed'],
  'work-orders':['pending','partial','completed'],
  'work-order-complaints':['pending','completed'],
  stores:['CASH','CREDIT'],'store-spares':['CASH','CREDIT'],attendance:['PRESENT','PERMISSION','HALF_DAY_LEAVE','FULL_DAY_LEAVE','ABSENT'],
  'salary-advances':['PENDING','RECOVERED'],payroll:['DRAFT','FINALIZED'],
};

export function EntryReportsPage(){
  const fy=useFy(state=>state.activeId),has=useAuth(state=>state.has),[type,setType]=useState('job-cards'),[search,setSearch]=useState(''),[from,setFrom]=useState(''),[to,setTo]=useState(''),[branch,setBranch]=useState(''),[vendor,setVendor]=useState(''),[status,setStatus]=useState('');
  const options=useQuery({queryKey:['entry-report-options'],queryFn:reportApi.entryOptions});
  const params={financial_year_id:fy,search:search||undefined,from:from||undefined,to:to||undefined,branch_id:branch||undefined,vendor_id:vendor||undefined,status:status||undefined};
  const report=useQuery({queryKey:['entry-report',type,params],queryFn:()=>reportApi.entryReport(type,params),enabled:!!fy});
  const rows=report.data?.data??[];
  const available=useMemo(()=>Object.keys(rows[0]??{}).map(key=>({key,label:friendlyColumn(key)})),[rows]);
  const columnState=useReportColumns(`ara-garage.report.columns.${type}`,available);
  const statuses=statusOptions[type];
  const clear=()=>{setSearch('');setFrom('');setTo('');setBranch('');setVendor('');setStatus('')};
  return <div><PageTitle title="Entry Reports" subtitle="Live operational reports with advanced filters and adjustable columns" icon={FileBarChart} action={<div className="flex gap-2"><ReportColumnManager columns={columnState.columns} visible={columnState.visible} toggle={columnState.toggle} move={columnState.move} reorder={columnState.reorder} reset={columnState.reset}/>{has('ENTRY_REPORT_EXPORT')&&<button className="btn-primary" disabled={!rows.length||!columnState.shown.length} onClick={()=>exportCsv(`${type}-report`,rows,columnState.shown)}><Download size={15}/>Excel Download</button>}</div>}/>
    <section className="panel mb-4 overflow-hidden"><div className="flex gap-1 overflow-x-auto border-b border-border p-2">{options.data?.reports.map(item=><button key={item.key} className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold transition ${type===item.key?'bg-primary text-white shadow':'text-fg-muted hover:bg-surface-2 hover:text-fg'}`} onClick={()=>{setType(item.key);setStatus('')}}>{item.label}</button>)}</div>
      <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7"><div className="relative lg:col-span-2"><label className="label">Search</label><Search className="absolute bottom-3 left-3 text-fg-subtle" size={14}/><input className="input pl-9" value={search} onChange={event=>setSearch(event.target.value)} placeholder="Document, party, employee..."/></div><Filter label="From Date"><input className="input" type="date" value={from} onChange={event=>setFrom(event.target.value)}/></Filter><Filter label="To Date"><input className="input" type="date" min={from||undefined} value={to} onChange={event=>setTo(event.target.value)}/></Filter><Filter label="Branch"><select className="input" value={branch} onChange={event=>setBranch(event.target.value)}><option value="">All branches</option>{options.data?.branches.map(row=><option key={row.id} value={row.id}>{String(row.name)}</option>)}</select></Filter><Filter label="Vendor"><select className="input" value={vendor} onChange={event=>setVendor(event.target.value)}><option value="">All vendors</option>{options.data?.vendors.map(row=><option key={row.id} value={row.id}>{String(row.name)}</option>)}</select></Filter><Filter label="Status / Type">{statuses?<select className="input" value={status} onChange={event=>setStatus(event.target.value)}><option value="">All statuses</option>{statuses.map(value=><option key={value}>{value.replaceAll('_',' ')}</option>)}</select>:<input className="input" value={status} onChange={event=>setStatus(event.target.value)} placeholder="All"/>}</Filter></div>
      <div className="flex items-center border-t border-border px-4 py-3 text-xs text-fg-muted"><SlidersHorizontal size={14} className="mr-2"/>Filters apply to the selected financial year.<button className="btn-secondary ml-auto h-8 px-3" onClick={clear}><X size={13}/>Clear</button></div></section>
    <section className="panel overflow-hidden"><div className="table-toolbar"><strong>{report.data?.meta.label??'Report'}</strong><span>{rows.length.toLocaleString('en-IN')} records</span></div><div className="max-h-[62vh] overflow-auto"><table className="w-full min-w-max"><thead className="sticky top-0 z-10"><tr>{columnState.shown.map(column=><th key={column.key}>{column.label}</th>)}</tr></thead><tbody>{rows.map((row,index)=><tr key={index}>{columnState.shown.map(column=><td key={column.key} className={/amount|total|balance|salary|rate|paid|credit|advance|deduction|earning/.test(column.key)?'text-right':''}>{reportValue(row[column.key],column.key)}</td>)}</tr>)}</tbody></table></div>{!rows.length&&!report.isLoading&&<div className="empty-state"><FileBarChart size={30}/><span>No records found for the selected filters</span></div>}{report.isLoading&&<div className="empty-state">Loading live report...</div>}</section>
  </div>
}
function Filter({label,children}:{label:string;children:React.ReactNode}){return <div><label className="label">{label}</label>{children}</div>}
