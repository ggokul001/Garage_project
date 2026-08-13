import {friendlyColumn,isAmountColumn} from '../utils/report';

const metadataFields=new Set(['company_id','created_at','updated_at','created_by','updated_by','deleted_at','deleted_by','is_deleted','password','password_hash']);

export function parseAuditData(value:unknown):Record<string,unknown>{
  if(!value)return{};
  if(typeof value==='object'&&!Array.isArray(value))return value as Record<string,unknown>;
  try{const parsed=JSON.parse(String(value));return parsed&&typeof parsed==='object'&&!Array.isArray(parsed)?parsed as Record<string,unknown>:{value:parsed}}catch{return{value}}
}

export function normalizeAuditData(value:unknown){
  const source=parseAuditData(value),result:Record<string,unknown>={};
  for(const[key,item]of Object.entries(source)){
    if(key!=='data'&&key!=='_submitted'){result[key]=item;continue}
    let expanded=item;
    if(typeof expanded==='string'){try{expanded=JSON.parse(expanded)}catch{result[key]=expanded;continue}}
    if(expanded&&typeof expanded==='object'&&!Array.isArray(expanded))Object.assign(result,expanded as Record<string,unknown>);else result[key]=expanded;
  }
  return result;
}

function scalar(value:unknown,key=''){
  if(value===null||value===undefined||value==='')return '—';
  if(typeof value==='boolean'||((value===0||value===1)&&/^(is_|has_|open_)/.test(key)))return Boolean(value)?'Yes':'No';
  if(isAmountColumn(key)&&!Number.isNaN(Number(value)))return `₹ ${Number(value).toLocaleString('en-IN',{maximumFractionDigits:2})}`;
  if(typeof value==='string'&&/^\d{4}-\d{2}-\d{2}(?:[ T]\d{2}:\d{2}:\d{2})?$/.test(value)){const date=new Date(value.replace(' ','T'));if(!Number.isNaN(date.getTime()))return value.length>10?date.toLocaleString():date.toLocaleDateString()}
  return String(value).replaceAll('_',' ');
}

function usefulEntries(object:Record<string,unknown>){
  const entries=Object.entries(object).filter(([key])=>!metadataFields.has(key));
  const withoutHeaderIds=entries.filter(([key])=>key!=='id'&&!key.endsWith('_id'));
  return withoutHeaderIds.length?entries.filter(([key])=>key!=='id'&&!['work_order_id','job_card_id','store_entry_id','payment_id'].includes(key)):entries;
}

function itemTitle(item:Record<string,unknown>,index:number){
  const label=item.product_name??item.complaint??item.description??item.name??item.full_name??item.employee_name;
  const code=item.product_code??item.code??item.part_number;
  if(label)return `${String(label)}${code?` · ${String(code)}`:''}`;
  const reference=item.job_card_complaint_id??item.employee_id??item.due_id??item.id;
  return reference?`Item ${index+1} · Ref #${reference}`:`Item ${index+1}`;
}

export function AuditValue({value,fieldKey=''}:{value:unknown;fieldKey?:string}){
  if(Array.isArray(value)){
    if(!value.length)return <span className="audit-empty-value">No items</span>;
    return <div className="audit-array">{value.map((item,index)=>item&&typeof item==='object'&&!Array.isArray(item)?<section className="audit-array-item" key={String((item as any).id??index)}><div className="audit-array-title">{itemTitle(item as Record<string,unknown>,index)}</div><ObjectGrid value={item as Record<string,unknown>}/></section>:<div className="audit-scalar" key={index}>{scalar(item,fieldKey)}</div>)}</div>;
  }
  if(value&&typeof value==='object')return <ObjectGrid value={value as Record<string,unknown>}/>;
  return <span className="audit-scalar">{scalar(value,fieldKey)}</span>;
}

function ObjectGrid({value}:{value:Record<string,unknown>}){const entries=usefulEntries(value);if(!entries.length)return <span className="audit-empty-value">No details</span>;return <div className="audit-object-grid">{entries.map(([key,item])=><div className="audit-object-field" key={key}><span>{friendlyColumn(key)}</span>{item&&typeof item==='object'?<AuditValue value={item} fieldKey={key}/>:<strong>{scalar(item,key)}</strong>}</div>)}</div>}
