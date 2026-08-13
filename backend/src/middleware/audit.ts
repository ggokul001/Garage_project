import { NextFunction, Request, Response } from 'express';
import { RowDataPacket } from 'mysql2/promise';
import { execute,query } from '../config/db';

const secretKeys = new Set(['password','password_hash','currentpassword','newpassword','token','refreshtoken','authorization']);

function safeValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.slice(0, 200).map(safeValue);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value as Record<string,unknown>).filter(([key])=>!secretKeys.has(key.toLowerCase())).map(([key,item])=>[key,safeValue(item)]));
  if (typeof value === 'string' && value.length > 1000) return `${value.slice(0,1000)}...`;
  return value;
}

function normalizedBody(value:unknown):Record<string,unknown>{
  if(!value||typeof value!=='object')return{};
  const body={...(value as Record<string,unknown>)};
  if(typeof body.data==='string'){try{const parsed=JSON.parse(body.data);delete body.data;if(parsed&&typeof parsed==='object'&&!Array.isArray(parsed))Object.assign(body,parsed)}catch{}}
  return body;
}

function context(path: string, method: string) {
  const clean=path.replace(/^\/api\/v1\/?/,'');
  const parts=clean.split('/').filter(Boolean);
  let entity=parts[0]??'system',module=entity.replace(/-/g,' '),action=method==='POST'?'CREATE':method==='PUT'||method==='PATCH'?'UPDATE':'DELETE';
  if(entity==='masters'){entity=parts[1]??'master';module=`Master - ${entity.replace(/-/g,' ')}`;}
  if(clean.includes('/approve'))action='APPROVE';
  if(clean.includes('/finalize'))action='FINALIZE';
  if(clean.includes('reset-password'))action='PASSWORD RESET';
  if(entity==='attendance')action='SAVE';
  if(entity==='payroll'&&clean.includes('generate'))action='GENERATE';
  if(entity==='work-orders'&&clean.includes('attachments'))action=method==='DELETE'?'ATTACHMENT DELETE':'ATTACHMENT UPLOAD';
  if(entity==='super-admin'){
    const section=parts[1];
    if(section==='companies'){entity='companies';module='Platform Companies';if(clean.includes('/admin'))action='ADMIN CREDENTIALS';else if(clean.includes('/status'))action='STATUS CHANGE';else if(clean.includes('/extend-trial'))action='TRIAL EXTENSION';else if(clean.includes('/convert-paid'))action='PAID CONVERSION';}
    else if(section==='payments'){entity='company-payments';module='Super Admin Payments';if(clean.includes('attachments'))action=method==='DELETE'?'ATTACHMENT DELETE':'ATTACHMENT UPLOAD';}
    else if(section==='billing'){entity=parts.includes('dues')?'company-monthly-dues':'company-billing';module='Company Billing';action=parts.includes('dues')?'DUE CORRECTION':'BILLING UPDATE';}
    else if(section==='platform-profile'){entity='platform-profile';module='Platform Profile';action='UPDATE';}
    else if(section==='products'){entity='platform-products';module='Product Portfolio';}
  }
  return {entity,module:module.replace(/\b\w/g,c=>c.toUpperCase()),action,parts};
}

function displayName(body: Record<string,unknown>, responseBody: any, fallback: string) {
  const data=responseBody?.data??{};
  return String(data.job_card_no??data.work_order_no??data.store_no??data.payment_no??data.advance_no??data.receipt_no??data.code??data.name??body.job_card_no??body.work_order_no??body.store_no??body.code??body.name??body.bill_no??fallback);
}

async function beforeSnapshot(entity:string,parts:string[],body:Record<string,unknown>){
  let numeric=[...parts].reverse().find(value=>/^\d+$/.test(value));
  const simple:Record<string,string>={'job-cards':'job_cards','work-orders':'work_orders',stores:'store_entries','vendor-payments':'vendor_payments','company-payments':'company_payments','salary-advances':'salary_advances',users:'users',roles:'roles',companies:'companies','company-monthly-dues':'company_monthly_dues','platform-products':'platform_products'};
  if(entity==='company-billing'&&parts[3]){const rows=await query<RowDataPacket&Record<string,unknown>>('SELECT * FROM companies WHERE id=?',[parts[3]]);return{recordId:parts[3],snapshot:rows[0]}}
  if(entity==='platform-profile'){const rows=await query<RowDataPacket&Record<string,unknown>>('SELECT * FROM platform_profile WHERE id=1');return{recordId:'1',snapshot:rows[0]}}
  if(entity==='accounts'&&parts[1]==='receipts'&&numeric){const rows=await query<RowDataPacket&Record<string,unknown>>('SELECT * FROM payment_receipts WHERE id=?',[numeric]);return{recordId:String(rows[0]?.job_card_id??numeric),snapshot:rows[0]}}
  if(entity==='work-orders'&&parts[2]==='attachments')numeric=parts[1];
  if(entity==='company-payments'&&parts[3]==='attachments')numeric=parts[2];
  if(entity==='attendance'&&body.attendance_date&&body.branch_id){const rows=await query<RowDataPacket&Record<string,unknown>>('SELECT * FROM daily_attendance WHERE attendance_date=? AND branch_id=?',[body.attendance_date,body.branch_id]);return{recordId:`${body.attendance_date}-${body.branch_id}`,snapshot:{rows}}}
  if(entity==='payroll'&&body.salary_month&&body.branch_id){const runs=await query<RowDataPacket&Record<string,unknown>>('SELECT * FROM payroll_runs WHERE salary_month=? AND branch_id=?',[body.salary_month,body.branch_id]);return{recordId:String(runs[0]?.id??''),snapshot:runs[0]}}
  const table=simple[entity];if(!table||!numeric)return{recordId:numeric,snapshot:null};
  const rows=await query<RowDataPacket&Record<string,unknown>>(`SELECT * FROM ${table} WHERE id=?`,[numeric]);const header=rows[0];if(!header)return{recordId:numeric,snapshot:null};
  if(entity==='job-cards'){const details=await query<RowDataPacket&Record<string,unknown>>('SELECT * FROM job_card_complaints WHERE job_card_id=? AND is_deleted=0 ORDER BY sort_order',[numeric]);return{recordId:numeric,snapshot:{...header,complaints:details}}}
  if(entity==='work-orders'){const complaints=await query<RowDataPacket&Record<string,unknown>>('SELECT * FROM work_order_complaints WHERE work_order_id=? ORDER BY id',[numeric]),spares=await query<RowDataPacket&Record<string,unknown>>('SELECT * FROM work_order_spares WHERE work_order_id=? AND is_deleted=0 ORDER BY sort_order',[numeric]);return{recordId:numeric,snapshot:{...header,complaints,spares}}}
  if(entity==='stores'){const details=await query<RowDataPacket&Record<string,unknown>>('SELECT * FROM store_entry_details WHERE store_entry_id=? AND is_deleted=0 ORDER BY sort_order',[numeric]);return{recordId:numeric,snapshot:{...header,details}}}
  if(entity==='vendor-payments'){const allocations=await query<RowDataPacket&Record<string,unknown>>('SELECT * FROM vendor_payment_allocations WHERE vendor_payment_id=?',[numeric]);return{recordId:numeric,snapshot:{...header,allocations}}}
  return{recordId:numeric,snapshot:header};
}

async function auditCompanyId(entity:string,parts:string[],recordId:string,body:Record<string,unknown>){
  if(entity==='companies')return Number(recordId||parts[2])||null;
  if(entity==='company-billing')return Number(parts[3]||recordId)||null;
  if(entity==='company-monthly-dues')return Number(parts[3])||null;
  if(entity==='company-payments'){
    const id=Number(parts[2]||recordId);if(id){const rows=await query<RowDataPacket&{company_id:number}>('SELECT company_id FROM company_payments WHERE id=?',[id]);if(rows[0])return Number(rows[0].company_id)}
    let payload:Record<string,unknown>=body;try{if(typeof body.data==='string')payload=JSON.parse(body.data) as Record<string,unknown>}catch{}
    return Number(payload.company_id)||null;
  }
  return null;
}

export async function auditMiddleware(req:Request,res:Response,next:NextFunction){
  if(!['POST','PUT','PATCH','DELETE'].includes(req.method)||req.path.includes('/auth/'))return next();
  const initial=context(req.originalUrl.split('?')[0],req.method),requestBody=normalizedBody(req.body);
  try{if(initial.action!=='CREATE'){const before=await beforeSnapshot(initial.entity,initial.parts,requestBody);if(before.snapshot)res.locals.auditBefore=before.snapshot;if(before.recordId)res.locals.auditRecordId=before.recordId}}catch(error){console.error('Audit snapshot failed',error)}
  let responseBody:unknown;
  const original=res.json.bind(res);
  res.json=((body:unknown)=>{responseBody=body;return original(body)}) as Response['json'];
  res.on('finish',()=>{
    if(res.statusCode>=400||!req.user)return;
    const {entity,module,action,parts}=context(req.originalUrl.split('?')[0],req.method);
    const numeric=[...parts].reverse().find(value=>/^\d+$/.test(value));
    const body=normalizedBody(req.body);
    const data=(responseBody as any)?.data;
    const recordId=String(data?.id??res.locals.auditRecordId??numeric??'');
    const actor=req.user;
    void (async()=>{try{
      let submitted:unknown=action==='CREATE'&&data&&typeof data==='object'?{...body,...data}:body;
      if(action!=='CREATE'&&req.method!=='DELETE'){const after=await beforeSnapshot(entity,parts,body);if(after.snapshot)submitted={...after.snapshot,...body}}
      const companyId=actor.company_id??await auditCompanyId(entity,parts,recordId,body);
      await execute('INSERT INTO audit_logs(company_id,module_name,entity_type,record_id,record_display_name,action,route,old_values,new_values,user_id,ip_address,user_agent) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)',[
        companyId,module,entity,recordId||null,String(res.locals.auditBefore?.name??res.locals.auditBefore?.payment_no??displayName(body,responseBody,recordId||entity)),action,req.originalUrl,
        res.locals.auditBefore?JSON.stringify(safeValue(res.locals.auditBefore)):null,
        req.method==='DELETE'?null:JSON.stringify(safeValue(submitted)),actor.id,req.ip??null,String(req.headers['user-agent']??'').slice(0,500)||null,
      ]);
      if(entity==='job-cards'&&action==='APPROVE'&&data?.id&&data?.work_order_no)await execute('INSERT INTO audit_logs(company_id,module_name,entity_type,record_id,record_display_name,action,route,new_values,user_id,ip_address,user_agent) VALUES(?,?,?,?,?,?,?,?,?,?,?)',[actor.company_id,'Work Orders','work-orders',String(data.id),String(data.work_order_no),'CREATE',req.originalUrl,JSON.stringify(safeValue(data)),actor.id,req.ip??null,String(req.headers['user-agent']??'').slice(0,500)||null]);
    }catch(error){console.error('Audit log failed',error)}})();
  });
  next();
}
