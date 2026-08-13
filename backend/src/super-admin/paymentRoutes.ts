import fs from 'node:fs';
import path from 'node:path';
import {NextFunction,Request,Response,Router} from 'express';
import multer from 'multer';
import {ResultSetHeader,RowDataPacket} from 'mysql2/promise';
import {z} from 'zod';
import {env} from '../config/env';
import {execute,query,withTransaction} from '../config/db';
import {authenticate,requireSuperAdmin} from '../middleware/auth';
import {companyStorage,isInsideUploads,platformStorage} from '../utils/uploadStorage';

const router=Router();
const asyncRoute=(handler:(req:Request,res:Response)=>Promise<void>)=>(req:Request,res:Response,next:NextFunction)=>handler(req,res).catch(next);
router.use('/super-admin',authenticate,requireSuperAdmin);

const allowedExtensions=new Set(['.pdf','.jpg','.jpeg','.png','.xls','.xlsx']);
const paymentCompanyId=async(req:Request)=>{
  if(req.body.data){try{const companyId=Number(JSON.parse(String(req.body.data)).company_id);if(companyId>0)return companyId}catch{}}
  const paymentId=Number(req.params.id||req.params.paymentId);
  if(paymentId>0){const rows=await query<RowDataPacket&{company_id:number}>('SELECT company_id FROM company_payments WHERE id=? AND deleted_at IS NULL',[paymentId]);if(rows[0])return Number(rows[0].company_id)}
  throw new Error('Select a company before uploading payment files');
};
const upload=multer({
  storage:companyStorage('company-payments',paymentCompanyId),
  limits:{fileSize:env.maxUploadSizeMb*1024*1024,files:10},
  fileFilter:(_req,file,callback)=>allowedExtensions.has(path.extname(file.originalname).toLowerCase())?callback(null,true):callback(new Error('Only PDF, JPG, PNG, XLS and XLSX files are allowed')),
}).array('files',10);
const logoUpload=multer({storage:platformStorage('platform-profile'),limits:{fileSize:env.maxUploadSizeMb*1024*1024,files:1},fileFilter:(_req,file,callback)=>['image/jpeg','image/png','image/webp'].includes(file.mimetype)?callback(null,true):callback(new Error('Logo must be JPG, PNG or WEBP'))}).single('logo');

const profileSchema=z.object({organization_name:z.string().trim().min(2).max(180),legal_name:z.string().trim().max(180).nullish(),gstin:z.string().trim().max(15).nullish(),pan:z.string().trim().max(10).nullish(),phone:z.string().trim().max(20).nullish(),email:z.union([z.string().trim().email(),z.literal(''),z.null()]).nullish(),website:z.union([z.string().trim().url(),z.literal(''),z.null()]).nullish(),address_line1:z.string().trim().max(180).nullish(),address_line2:z.string().trim().max(180).nullish(),city:z.string().trim().max(80).nullish(),state:z.string().trim().max(80).nullish(),pincode:z.string().trim().max(10).nullish(),receipt_prefix:z.string().trim().min(2).max(30),receipt_footer:z.string().trim().max(500).nullish()});
async function profileData(){const rows=await query<RowDataPacket&Record<string,unknown>>('SELECT * FROM platform_profile WHERE id=1'),profile=rows[0];if(!profile)return null;let logo_data_url:string|null=null;if(profile.logo_path&&profile.logo_mime_type){try{const data=fs.readFileSync(String(profile.logo_path));logo_data_url=`data:${profile.logo_mime_type};base64,${data.toString('base64')}`}catch{}}return{...profile,logo_data_url}}
router.get('/super-admin/platform-profile',asyncRoute(async(_req,res)=>{res.json({data:await profileData()})}));
router.put('/super-admin/platform-profile',logoUpload,asyncRoute(async(req,res)=>{const file=req.file;let raw:unknown={};try{raw=JSON.parse(String(req.body.data??'{}'))}catch{if(file)try{fs.unlinkSync(file.path)}catch{}res.status(422).json({message:'Invalid profile data'});return}const parsed=profileSchema.safeParse(raw);if(!parsed.success){if(file)try{fs.unlinkSync(file.path)}catch{}res.status(422).json({message:parsed.error.issues[0]?.message});return}const d=parsed.data,existing=await query<RowDataPacket&{logo_path:string|null}>('SELECT logo_path FROM platform_profile WHERE id=1');await execute(`UPDATE platform_profile SET organization_name=?,legal_name=?,gstin=?,pan=?,phone=?,email=?,website=?,address_line1=?,address_line2=?,city=?,state=?,pincode=?,receipt_prefix=?,receipt_footer=?,logo_path=COALESCE(?,logo_path),logo_mime_type=COALESCE(?,logo_mime_type),updated_by=? WHERE id=1`,[d.organization_name,d.legal_name||null,d.gstin||null,d.pan||null,d.phone||null,d.email||null,d.website||null,d.address_line1||null,d.address_line2||null,d.city||null,d.state||null,d.pincode||null,d.receipt_prefix,d.receipt_footer||null,file?.path??null,file?.mimetype??null,req.user!.id]);if(file&&existing[0]?.logo_path&&path.resolve(existing[0].logo_path)!==path.resolve(file.path)){try{fs.unlinkSync(existing[0].logo_path)}catch{}}res.json({data:await profileData(),message:'Platform profile updated'})}));

type CompanyBillingRow=RowDataPacket&{id:number;account_type:'TRIAL'|'PAID';billing_cycle:'MONTHLY'|'ONE_TIME';monthly_fee:number;billing_start_month:string|null;billing_due_day:number};
const monthDate=(date:Date)=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-01`;
const dueDate=(year:number,month:number,day:number)=>{const last=new Date(year,month+1,0).getDate();return `${year}-${String(month+1).padStart(2,'0')}-${String(Math.min(day,last)).padStart(2,'0')}`};

async function syncCompanyDues(companyId:number){
  const companies=await query<CompanyBillingRow>('SELECT id,account_type,billing_cycle,monthly_fee,billing_start_month,billing_due_day FROM companies WHERE id=?',[companyId]);
  const company=companies[0];
  if(!company||company.account_type!=='PAID'||company.billing_cycle!=='MONTHLY'||Number(company.monthly_fee)<=0||!company.billing_start_month)return;
  const startParts=String(company.billing_start_month).slice(0,10).split('-').map(Number),start=new Date(startParts[0],startParts[1]-1,1),now=new Date(),end=new Date(now.getFullYear(),now.getMonth(),1);
  const months=(end.getFullYear()-start.getFullYear())*12+end.getMonth()-start.getMonth();
  if(months<0)return;
  if(months>240)throw new Error('Billing start month cannot be more than 20 years in the past');
  const rates=await query<RowDataPacket&{effective_from_month:string;monthly_fee:number;due_day:number}>('SELECT effective_from_month,monthly_fee,due_day FROM company_billing_rates WHERE company_id=? ORDER BY effective_from_month',[companyId]);
  for(let index=0;index<=months;index++){
    const current=new Date(start.getFullYear(),start.getMonth()+index,1);
    const key=monthDate(current),rate=[...rates].reverse().find(row=>String(row.effective_from_month).slice(0,10)<=key),fee=Number(rate?.monthly_fee??company.monthly_fee),day=Number(rate?.due_day??company.billing_due_day)||10;
    await execute('INSERT IGNORE INTO company_monthly_dues(company_id,billing_month,due_date,due_amount)VALUES(?,?,?,?)',[companyId,key,dueDate(current.getFullYear(),current.getMonth(),day),fee]);
  }
}

async function syncAllDues(){
  const companies=await query<RowDataPacket&{id:number}>("SELECT id FROM companies WHERE account_type='PAID' AND billing_cycle='MONTHLY' AND monthly_fee>0 AND billing_start_month IS NOT NULL");
  for(const company of companies)await syncCompanyDues(Number(company.id));
}

router.get('/super-admin/dashboard',asyncRoute(async(_req,res)=>{
  await syncAllDues();
  const [companySummary,billingSummary,paymentSummary,trialAlerts,outstandingCompanies,recentPayments,collectionTrend]=await Promise.all([
    query<RowDataPacket&Record<string,unknown>>(`SELECT COUNT(*) total_companies,SUM(status='active') active_companies,SUM(status='inactive') inactive_companies,SUM(account_type='TRIAL') trial_companies,SUM(account_type='PAID') paid_companies FROM companies`),
    query<RowDataPacket&Record<string,unknown>>(`SELECT COALESCE(SUM(due_amount),0) total_billed,COALESCE(SUM(paid_amount),0) total_allocated,COALESCE(SUM(GREATEST(due_amount-paid_amount,0)),0) total_outstanding,SUM(status='PAID') paid_months,SUM(status='PARTIAL') partial_months,SUM(status='PENDING') pending_months,SUM(status<>'PAID' AND due_date<CURDATE()) overdue_months FROM company_monthly_dues`),
    query<RowDataPacket&Record<string,unknown>>(`SELECT COUNT(*) payment_count,COALESCE(SUM(amount),0) total_received,COALESCE(SUM(CASE WHEN DATE_FORMAT(payment_date,'%Y-%m')=DATE_FORMAT(CURDATE(),'%Y-%m') THEN amount ELSE 0 END),0) received_this_month,COALESCE(SUM(CASE WHEN payment_date=CURDATE() THEN amount ELSE 0 END),0) received_today FROM company_payments WHERE deleted_at IS NULL`),
    query<RowDataPacket&Record<string,unknown>>(`SELECT id,code,name,status,trial_started_at,trial_ends_at,DATEDIFF(trial_ends_at,CURDATE()) days_remaining FROM companies WHERE account_type='TRIAL' AND trial_ends_at IS NOT NULL AND DATEDIFF(trial_ends_at,CURDATE())<=30 ORDER BY trial_ends_at,id LIMIT 20`),
    query<RowDataPacket&Record<string,unknown>>(`SELECT c.id,c.code,c.name,c.status,c.monthly_fee,COUNT(CASE WHEN d.status<>'PAID' THEN 1 END) balance_months,SUM(CASE WHEN d.status='PARTIAL' THEN 1 ELSE 0 END) partial_months,SUM(CASE WHEN d.status<>'PAID' AND d.due_date<CURDATE() THEN 1 ELSE 0 END) overdue_months,MIN(CASE WHEN d.status<>'PAID' THEN d.billing_month END) oldest_pending_month,MAX(p.payment_date) last_payment_date,COALESCE(SUM(GREATEST(d.due_amount-d.paid_amount,0)),0) outstanding_amount FROM companies c LEFT JOIN company_monthly_dues d ON d.company_id=c.id LEFT JOIN (SELECT company_id,MAX(payment_date) payment_date FROM company_payments WHERE deleted_at IS NULL GROUP BY company_id) p ON p.company_id=c.id GROUP BY c.id HAVING outstanding_amount>0 ORDER BY outstanding_amount DESC,balance_months DESC,c.name LIMIT 20`),
    query<RowDataPacket&Record<string,unknown>>(`SELECT p.id,p.payment_no,p.payment_date,p.amount,p.payment_mode,p.reference_number,c.id company_id,c.code company_code,c.name company_name,u.full_name created_by_name FROM company_payments p JOIN companies c ON c.id=p.company_id JOIN users u ON u.id=p.created_by WHERE p.deleted_at IS NULL ORDER BY p.payment_date DESC,p.id DESC LIMIT 10`),
    query<RowDataPacket&Record<string,unknown>>(`SELECT DATE_FORMAT(payment_date,'%Y-%m') month,COALESCE(SUM(amount),0) amount,COUNT(*) payments FROM company_payments WHERE deleted_at IS NULL AND payment_date>=DATE_FORMAT(DATE_SUB(CURDATE(),INTERVAL 11 MONTH),'%Y-%m-01') GROUP BY DATE_FORMAT(payment_date,'%Y-%m') ORDER BY month`),
  ]);
  const companies=companySummary[0]??{},billing=billingSummary[0]??{},payments=paymentSummary[0]??{};
  res.json({data:{generated_at:new Date().toISOString(),summary:{...companies,...billing,...payments,trial_expiring:Number(trialAlerts.filter(row=>Number(row.days_remaining)>=0).length),trial_expired:Number(trialAlerts.filter(row=>Number(row.days_remaining)<0).length),outstanding_companies:outstandingCompanies.length},trial_alerts:trialAlerts,outstanding_companies:outstandingCompanies,recent_payments:recentPayments,collection_trend:collectionTrend}});
}));

const billingSchema=z.object({
  billing_cycle:z.enum(['MONTHLY','ONE_TIME']),monthly_fee:z.coerce.number().min(0),billing_start_month:z.union([z.string().regex(/^\d{4}-\d{2}(-\d{2})?$/),z.literal(''),z.null()]).nullish(),effective_from_month:z.union([z.string().regex(/^\d{4}-\d{2}(-\d{2})?$/),z.literal(''),z.null()]).nullish(),billing_due_day:z.coerce.number().int().min(1).max(28),remarks:z.string().trim().max(255).nullish(),
}).superRefine((value,context)=>{if(value.billing_cycle==='MONTHLY'&&value.monthly_fee>0&&!value.billing_start_month)context.addIssue({code:z.ZodIssueCode.custom,path:['billing_start_month'],message:'Billing start month is required for monthly billing'})});

router.get('/super-admin/billing/companies',asyncRoute(async(_req,res)=>{
  await syncAllDues();
  const rows=await query<RowDataPacket&Record<string,unknown>>(`SELECT c.id,c.code,c.name,c.status,c.account_type,c.billing_cycle,c.monthly_fee,c.billing_start_month,c.billing_due_day,
    COUNT(d.id) due_months,SUM(d.status='PAID') paid_months,SUM(d.status='PARTIAL') partial_months,SUM(d.status='PENDING') pending_months,
    COALESCE(SUM(d.due_amount),0) billed_amount,COALESCE(SUM(d.paid_amount),0) allocated_amount,COALESCE(SUM(d.due_amount-d.paid_amount),0) outstanding_amount,
    MAX(CASE WHEN d.status='PAID' THEN d.billing_month END) paid_until,
    (SELECT COALESCE(SUM(p.amount),0) FROM company_payments p WHERE p.company_id=c.id AND p.deleted_at IS NULL) total_received,
    (SELECT MAX(p.payment_date) FROM company_payments p WHERE p.company_id=c.id AND p.deleted_at IS NULL) last_payment_date
    FROM companies c LEFT JOIN company_monthly_dues d ON d.company_id=c.id GROUP BY c.id ORDER BY c.name`);
  res.json({data:rows});
}));

router.put('/super-admin/billing/companies/:id',asyncRoute(async(req,res)=>{
  const parsed=billingSchema.safeParse(req.body);if(!parsed.success){res.status(422).json({message:parsed.error.issues[0]?.message});return}
  const data=parsed.data,start=data.billing_start_month?`${String(data.billing_start_month).slice(0,7)}-01`:null,effective=data.effective_from_month?`${String(data.effective_from_month).slice(0,7)}-01`:start;
  const current=await query<RowDataPacket&{id:number;billing_start_month:string|null}>('SELECT id,billing_start_month FROM companies WHERE id=?',[req.params.id]);if(!current[0]){res.status(404).json({message:'Company not found'});return}
  await withTransaction(async connection=>{
    const originalStart=current[0].billing_start_month?String(current[0].billing_start_month).slice(0,10):null,nextStart=originalStart&&start?(originalStart<start?originalStart:start):(originalStart||start);
    await connection.execute('UPDATE companies SET billing_cycle=?,monthly_fee=?,billing_start_month=?,billing_due_day=? WHERE id=?',[data.billing_cycle,data.monthly_fee,nextStart,data.billing_due_day,req.params.id]);
    if(data.billing_cycle==='MONTHLY'&&data.monthly_fee>0&&effective){
      await connection.execute(`INSERT INTO company_billing_rates(company_id,effective_from_month,monthly_fee,due_day,remarks,created_by)VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE monthly_fee=VALUES(monthly_fee),due_day=VALUES(due_day),remarks=VALUES(remarks),created_by=VALUES(created_by)`,[req.params.id,effective,data.monthly_fee,data.billing_due_day,data.remarks||'Billing rate updated',req.user!.id]);
      await connection.execute(`UPDATE company_monthly_dues SET due_amount=?,due_date=STR_TO_DATE(CONCAT(DATE_FORMAT(billing_month,'%Y-%m-'),LPAD(LEAST(?,DAY(LAST_DAY(billing_month))),2,'0')),'%Y-%m-%d'),status=CASE WHEN paid_amount<=0 THEN 'PENDING' WHEN paid_amount>=? THEN 'PAID' ELSE 'PARTIAL' END WHERE company_id=? AND billing_month>=? AND paid_amount<=?`,[data.monthly_fee,data.billing_due_day,data.monthly_fee,req.params.id,effective,data.monthly_fee]);
    }
  });
  await syncCompanyDues(Number(req.params.id));
  res.json({message:effective?`Billing rate will apply from ${String(effective).slice(0,7)}`:'Company billing settings updated'});
}));

router.get('/super-admin/billing/companies/:id/dues',asyncRoute(async(req,res)=>{
  await syncCompanyDues(Number(req.params.id));
  const company=await query<RowDataPacket&Record<string,unknown>>('SELECT id,code,name,account_type,billing_cycle,monthly_fee,billing_start_month,billing_due_day FROM companies WHERE id=?',[req.params.id]);
  if(!company[0]){res.status(404).json({message:'Company not found'});return}
  const dues=await query<RowDataPacket&Record<string,unknown>>('SELECT *,GREATEST(due_amount-paid_amount,0) balance FROM company_monthly_dues WHERE company_id=? ORDER BY billing_month',[req.params.id]);
  const rates=await query<RowDataPacket&Record<string,unknown>>('SELECT r.*,u.full_name created_by_name FROM company_billing_rates r LEFT JOIN users u ON u.id=r.created_by WHERE r.company_id=? ORDER BY r.effective_from_month DESC',[req.params.id]);
  res.json({data:{company:company[0],dues,rates}});
}));

const dueUpdateSchema=z.object({due_amount:z.coerce.number().min(0),due_date:z.string().date()});
router.put('/super-admin/billing/companies/:companyId/dues/:id',asyncRoute(async(req,res)=>{
  const parsed=dueUpdateSchema.safeParse(req.body);if(!parsed.success){res.status(422).json({message:parsed.error.issues[0]?.message});return}
  const rows=await query<RowDataPacket&{paid_amount:number;billing_month:string}>('SELECT paid_amount,billing_month FROM company_monthly_dues WHERE id=? AND company_id=?',[req.params.id,req.params.companyId]);if(!rows[0]){res.status(404).json({message:'Billing month not found'});return}
  if(parsed.data.due_amount<Number(rows[0].paid_amount)){res.status(422).json({message:'Due amount cannot be lower than the amount already paid for this month'});return}
  const status=parsed.data.due_amount<=Number(rows[0].paid_amount)?'PAID':Number(rows[0].paid_amount)>0?'PARTIAL':'PENDING';
  await execute('UPDATE company_monthly_dues SET due_amount=?,due_date=?,status=? WHERE id=? AND company_id=?',[parsed.data.due_amount,parsed.data.due_date,status,req.params.id,req.params.companyId]);
  res.json({message:`${String(rows[0].billing_month).slice(0,7)} billing month corrected`});
}));

const paymentSchema=z.object({company_id:z.coerce.number().int().positive(),payment_date:z.string().date(),amount:z.coerce.number().positive(),payment_mode:z.enum(['CASH','UPI','BANK_TRANSFER','CHEQUE','CARD','OTHER']),reference_number:z.string().trim().max(100).nullish(),remarks:z.string().trim().min(2).max(500),due_ids:z.array(z.coerce.number().int().positive()).default([])});
const cleanupFiles=(files:Express.Multer.File[])=>files.forEach(file=>{try{fs.unlinkSync(file.path)}catch{}});

router.get('/super-admin/payments',asyncRoute(async(req,res)=>{
  const page=Math.max(1,Number(req.query.page)||1),pageSize=Math.min(100,Math.max(10,Number(req.query.pageSize)||15)),companyId=Number(req.query.company_id)||0,search=String(req.query.search??'').trim(),from=String(req.query.from??''),to=String(req.query.to??'');
  const clauses=['p.deleted_at IS NULL'],params:unknown[]=[];
  if(companyId){clauses.push('p.company_id=?');params.push(companyId)}if(from){clauses.push('p.payment_date>=?');params.push(from)}if(to){clauses.push('p.payment_date<=?');params.push(to)}if(search){clauses.push('(p.payment_no LIKE ? OR c.name LIKE ? OR p.reference_number LIKE ? OR p.remarks LIKE ?)');params.push(...Array(4).fill(`%${search}%`))}
  const where=clauses.join(' AND '),count=await query<RowDataPacket&{total:number}>(`SELECT COUNT(*) total FROM company_payments p JOIN companies c ON c.id=p.company_id WHERE ${where}`,params);
  const rows=await query<RowDataPacket&Record<string,unknown>>(`SELECT p.*,c.code company_code,c.name company_name,u.full_name created_by_name,
    (SELECT COUNT(*) FROM company_payment_attachments a WHERE a.payment_id=p.id AND a.deleted_at IS NULL) attachment_count,
    (SELECT GROUP_CONCAT(DATE_FORMAT(d.billing_month,'%b %Y') ORDER BY d.billing_month SEPARATOR ', ') FROM company_payment_allocations a JOIN company_monthly_dues d ON d.id=a.due_id WHERE a.payment_id=p.id) allocated_months
    FROM company_payments p JOIN companies c ON c.id=p.company_id JOIN users u ON u.id=p.created_by WHERE ${where} ORDER BY p.payment_date DESC,p.id DESC LIMIT ? OFFSET ?`,[...params,pageSize,(page-1)*pageSize]);
  res.json({data:rows,meta:{page,pageSize,total:Number(count[0]?.total??0)}});
}));

router.get('/super-admin/payments/:id',asyncRoute(async(req,res)=>{
  const payments=await query<RowDataPacket&Record<string,unknown>>('SELECT p.*,c.code company_code,c.name company_name,u.full_name created_by_name FROM company_payments p JOIN companies c ON c.id=p.company_id JOIN users u ON u.id=p.created_by WHERE p.id=? AND p.deleted_at IS NULL',[req.params.id]);
  if(!payments[0]){res.status(404).json({message:'Payment not found'});return}
  const allocations=await query<RowDataPacket&Record<string,unknown>>('SELECT a.id,a.amount,d.billing_month,d.due_date,d.due_amount,d.paid_amount,d.status FROM company_payment_allocations a JOIN company_monthly_dues d ON d.id=a.due_id WHERE a.payment_id=? ORDER BY d.billing_month',[req.params.id]);
  const attachments=await query<RowDataPacket&Record<string,unknown>>('SELECT id,original_name,mime_type,file_size,created_at FROM company_payment_attachments WHERE payment_id=? AND deleted_at IS NULL ORDER BY id',[req.params.id]);
  res.json({data:{...payments[0],allocations,attachments}});
}));

router.post('/super-admin/payments',upload,asyncRoute(async(req,res)=>{
  const files=(req.files as Express.Multer.File[])??[];let raw:unknown={};try{raw=JSON.parse(String(req.body.data??'{}'))}catch{cleanupFiles(files);res.status(422).json({message:'Invalid payment form data'});return}
  const parsed=paymentSchema.safeParse(raw);if(!parsed.success){cleanupFiles(files);res.status(422).json({message:parsed.error.issues[0]?.message});return}
  const data=parsed.data;await syncCompanyDues(data.company_id);
  try{
    const created=await withTransaction(async connection=>{
      const[companies]=await connection.query<CompanyBillingRow[]>('SELECT id,account_type,billing_cycle,monthly_fee,billing_start_month,billing_due_day FROM companies WHERE id=? FOR UPDATE',[data.company_id]);
      if(!companies[0])throw new Error('Company not found');
      const dueIds=[...new Set(data.due_ids)],monthly=companies[0].account_type==='PAID'&&companies[0].billing_cycle==='MONTHLY'&&Number(companies[0].monthly_fee)>0&&!!companies[0].billing_start_month;
      if(monthly&&!dueIds.length)throw new Error('Select at least one pending billing month');
      let dues:RowDataPacket[]=[];
      if(dueIds.length){const[rows]=await connection.query<RowDataPacket[]>(`SELECT * FROM company_monthly_dues WHERE company_id=? AND id IN (${dueIds.map(()=>'?').join(',')}) ORDER BY billing_month FOR UPDATE`,[data.company_id,...dueIds]);dues=rows;if(dues.length!==dueIds.length)throw new Error('One or more billing months are invalid')}
      const outstanding=dues.reduce((sum,due)=>sum+Math.max(0,Number(due.due_amount)-Number(due.paid_amount)),0);
      if(monthly&&data.amount>outstanding+0.001)throw new Error('Payment amount cannot exceed the selected months outstanding amount');
      await connection.execute('INSERT IGNORE INTO platform_sequences(sequence_name,last_number)VALUES("COMPANY_PAYMENT",0)');
      const[sequences]=await connection.query<RowDataPacket[]>('SELECT last_number FROM platform_sequences WHERE sequence_name="COMPANY_PAYMENT" FOR UPDATE'),next=Number(sequences[0].last_number)+1;
      await connection.execute('UPDATE platform_sequences SET last_number=? WHERE sequence_name="COMPANY_PAYMENT"',[next]);
      const paymentNo=`PAY-${new Date(data.payment_date+'T00:00:00').getFullYear()}-${String(next).padStart(6,'0')}`;
      const[out]=await connection.execute<ResultSetHeader>('INSERT INTO company_payments(payment_no,company_id,payment_date,amount,payment_mode,reference_number,remarks,created_by)VALUES(?,?,?,?,?,?,?,?)',[paymentNo,data.company_id,data.payment_date,data.amount,data.payment_mode,data.reference_number||null,data.remarks,req.user!.id]);
      let remaining=Number(data.amount);
      for(const due of dues){if(remaining<=0)break;const balance=Math.max(0,Number(due.due_amount)-Number(due.paid_amount)),allocated=Math.min(balance,remaining);if(allocated<=0)continue;const paid=Number(due.paid_amount)+allocated,status=paid+0.001>=Number(due.due_amount)?'PAID':'PARTIAL';await connection.execute('INSERT INTO company_payment_allocations(company_id,payment_id,due_id,amount)VALUES(?,?,?,?)',[data.company_id,out.insertId,due.id,allocated]);await connection.execute('UPDATE company_monthly_dues SET paid_amount=?,status=? WHERE id=?',[paid,status,due.id]);remaining-=allocated}
      if(monthly&&remaining>0.001)throw new Error('Payment amount could not be fully allocated to the selected months');
      for(const file of files)await connection.execute('INSERT INTO company_payment_attachments(company_id,payment_id,original_name,stored_name,file_path,mime_type,file_size,uploaded_by)VALUES(?,?,?,?,?,?,?,?)',[data.company_id,out.insertId,file.originalname,file.filename,file.path,file.mimetype,file.size,req.user!.id]);
      return{id:out.insertId,payment_no:paymentNo};
    });
    res.status(201).json({data:created,message:`Payment ${created.payment_no} created`});
  }catch(error){cleanupFiles(files);throw error}
}));

const paymentEditSchema=z.object({payment_date:z.string().date(),payment_mode:z.enum(['CASH','UPI','BANK_TRANSFER','CHEQUE','CARD','OTHER']),reference_number:z.string().trim().max(100).nullish(),remarks:z.string().trim().min(2).max(500)});
router.put('/super-admin/payments/:id',asyncRoute(async(req,res)=>{const parsed=paymentEditSchema.safeParse(req.body);if(!parsed.success){res.status(422).json({message:parsed.error.issues[0]?.message});return}const data=parsed.data,result=await execute('UPDATE company_payments SET payment_date=?,payment_mode=?,reference_number=?,remarks=?,updated_by=? WHERE id=? AND deleted_at IS NULL',[data.payment_date,data.payment_mode,data.reference_number||null,data.remarks,req.user!.id,req.params.id]);if(!result.affectedRows){res.status(404).json({message:'Payment not found'});return}res.json({message:'Payment details updated'})}));

router.post('/super-admin/payments/:id/attachments',upload,asyncRoute(async(req,res)=>{const files=(req.files as Express.Multer.File[])??[],payments=await query<RowDataPacket&{id:number;company_id:number}>('SELECT id,company_id FROM company_payments WHERE id=? AND deleted_at IS NULL',[req.params.id]);if(!payments[0]){cleanupFiles(files);res.status(404).json({message:'Payment not found'});return}for(const file of files)await execute('INSERT INTO company_payment_attachments(company_id,payment_id,original_name,stored_name,file_path,mime_type,file_size,uploaded_by)VALUES(?,?,?,?,?,?,?,?)',[payments[0].company_id,req.params.id,file.originalname,file.filename,file.path,file.mimetype,file.size,req.user!.id]);res.status(201).json({message:`${files.length} attachment(s) uploaded`})}));

router.get('/super-admin/payments/:paymentId/attachments/:id/download',asyncRoute(async(req,res)=>{const rows=await query<RowDataPacket&{file_path:string;original_name:string}>('SELECT file_path,original_name FROM company_payment_attachments WHERE id=? AND payment_id=? AND deleted_at IS NULL',[req.params.id,req.params.paymentId]);if(!rows[0]){res.status(404).json({message:'Attachment not found'});return}const resolved=path.resolve(rows[0].file_path);if(!isInsideUploads(resolved)){res.status(403).json({message:'Invalid attachment path'});return}res.download(resolved,rows[0].original_name)}));

router.delete('/super-admin/payments/:paymentId/attachments/:id',asyncRoute(async(req,res)=>{const result=await execute('UPDATE company_payment_attachments SET deleted_at=NOW(),deleted_by=? WHERE id=? AND payment_id=? AND deleted_at IS NULL',[req.user!.id,req.params.id,req.params.paymentId]);if(!result.affectedRows){res.status(404).json({message:'Attachment not found'});return}res.json({message:'Attachment removed'})}));

router.delete('/super-admin/payments/:id',asyncRoute(async(req,res)=>{
  await withTransaction(async connection=>{const[payments]=await connection.query<RowDataPacket[]>('SELECT id FROM company_payments WHERE id=? AND deleted_at IS NULL FOR UPDATE',[req.params.id]);if(!payments[0])throw new Error('Payment not found');const[allocations]=await connection.query<RowDataPacket[]>('SELECT * FROM company_payment_allocations WHERE payment_id=? FOR UPDATE',[req.params.id]);for(const allocation of allocations){const[dues]=await connection.query<RowDataPacket[]>('SELECT * FROM company_monthly_dues WHERE id=? FOR UPDATE',[allocation.due_id]);if(!dues[0])continue;const paid=Math.max(0,Number(dues[0].paid_amount)-Number(allocation.amount)),status=paid<=0?'PENDING':paid+0.001>=Number(dues[0].due_amount)?'PAID':'PARTIAL';await connection.execute('UPDATE company_monthly_dues SET paid_amount=?,status=? WHERE id=?',[paid,status,allocation.due_id])}await connection.execute('DELETE FROM company_payment_allocations WHERE payment_id=?',[req.params.id]);await connection.execute('UPDATE company_payment_attachments SET deleted_at=NOW(),deleted_by=? WHERE payment_id=? AND deleted_at IS NULL',[req.user!.id,req.params.id]);await connection.execute('UPDATE company_payments SET deleted_at=NOW(),deleted_by=? WHERE id=?',[req.user!.id,req.params.id])});res.json({message:'Payment deleted and monthly allocations reversed'})
}));

router.get('/super-admin/payment-report',asyncRoute(async(req,res)=>{
  await syncAllDues();
  const companyId=Number(req.query.company_id)||0,from=String(req.query.from??''),to=String(req.query.to??''),mode=String(req.query.payment_mode??''),search=String(req.query.search??'').trim(),clauses=['p.deleted_at IS NULL'],params:unknown[]=[];
  if(companyId){clauses.push('p.company_id=?');params.push(companyId)}if(from){clauses.push('p.payment_date>=?');params.push(from)}if(to){clauses.push('p.payment_date<=?');params.push(to)}if(mode){clauses.push('p.payment_mode=?');params.push(mode)}if(search){clauses.push('(p.payment_no LIKE ? OR c.name LIKE ? OR p.reference_number LIKE ? OR p.remarks LIKE ?)');params.push(...Array(4).fill(`%${search}%`))}
  const payments=await query<RowDataPacket&Record<string,unknown>>(`SELECT p.payment_no,p.payment_date,c.code company_code,c.name company_name,p.amount,p.payment_mode,p.reference_number,p.remarks,u.full_name created_by_name,p.created_at,(SELECT COUNT(*) FROM company_payment_attachments a WHERE a.payment_id=p.id AND a.deleted_at IS NULL) attachment_count,(SELECT GROUP_CONCAT(DATE_FORMAT(d.billing_month,'%b %Y') ORDER BY d.billing_month SEPARATOR ', ') FROM company_payment_allocations a JOIN company_monthly_dues d ON d.id=a.due_id WHERE a.payment_id=p.id) allocated_months FROM company_payments p JOIN companies c ON c.id=p.company_id JOIN users u ON u.id=p.created_by WHERE ${clauses.join(' AND ')} ORDER BY p.payment_date DESC,p.id DESC LIMIT 5000`,params);
  const totals=await query<RowDataPacket&{payment_count:number;received_amount:number}>(`SELECT COUNT(*) payment_count,COALESCE(SUM(p.amount),0) received_amount FROM company_payments p JOIN companies c ON c.id=p.company_id WHERE ${clauses.join(' AND ')}`,params);
  const companyWhere=companyId?'WHERE c.id=?':'',companyParams=companyId?[companyId]:[];
  const companies=await query<RowDataPacket&Record<string,unknown>>(`SELECT c.id company_id,c.code company_code,c.name company_name,c.account_type,c.billing_cycle,c.monthly_fee,c.billing_start_month,c.billing_due_day,COUNT(d.id) due_months,SUM(d.status='PAID') paid_months,SUM(d.status='PARTIAL') partial_months,SUM(d.status='PENDING') pending_months,COALESCE(SUM(d.due_amount),0) billed_amount,COALESCE(SUM(d.paid_amount),0) paid_amount,COALESCE(SUM(d.due_amount-d.paid_amount),0) outstanding_amount,MAX(CASE WHEN d.status='PAID' THEN d.billing_month END) paid_until,(SELECT MAX(p.payment_date) FROM company_payments p WHERE p.company_id=c.id AND p.deleted_at IS NULL) last_payment_date FROM companies c LEFT JOIN company_monthly_dues d ON d.company_id=c.id ${companyWhere} GROUP BY c.id ORDER BY outstanding_amount DESC,c.name`,companyParams);
  const outstanding=companies.reduce((sum,row)=>sum+Number(row.outstanding_amount??0),0),pendingMonths=companies.reduce((sum,row)=>sum+Number(row.pending_months??0)+Number(row.partial_months??0),0);
  res.json({data:{payments,companies,summary:{payment_count:Number(totals[0]?.payment_count??0),received_amount:Number(totals[0]?.received_amount??0),outstanding_amount:outstanding,pending_months:pendingMonths}}});
}));

export default router;
