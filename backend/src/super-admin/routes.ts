import {Router,Request,Response,NextFunction} from 'express';
import bcrypt from 'bcryptjs';
import {ResultSetHeader,RowDataPacket} from 'mysql2/promise';
import {z} from 'zod';
import {query,execute,withTransaction} from '../config/db';
import {authenticate,requireSuperAdmin} from '../middleware/auth';

const router=Router();
const asyncRoute=(fn:(req:Request,res:Response)=>Promise<void>)=>(req:Request,res:Response,next:NextFunction)=>fn(req,res).catch(next);
router.use(authenticate,requireSuperAdmin);

const companySchema=z.object({
  code:z.string().trim().min(2).max(20),name:z.string().trim().min(2).max(150),legal_name:z.string().trim().max(180).nullish(),
  phone:z.string().trim().max(20).nullish(),email:z.union([z.string().trim().email(),z.literal(''),z.null()]).nullish(),
  gstin:z.string().trim().max(15).nullish(),pan:z.string().trim().max(10).nullish(),address_line1:z.string().trim().max(180).nullish(),address_line2:z.string().trim().max(180).nullish(),city:z.string().trim().max(80).nullish(),state:z.string().trim().max(80).nullish(),pincode:z.string().trim().max(10).nullish(),
  account_type:z.enum(['TRIAL','PAID']),trial_days:z.coerce.number().int().min(1).max(365).optional(),status:z.enum(['active','inactive']).default('active'),inactive_reason:z.string().trim().max(255).nullish(),max_users:z.coerce.number().int().positive().nullish(),max_branches:z.coerce.number().int().positive().nullish(),
  admin:z.object({full_name:z.string().trim().min(2),username:z.string().trim().min(3),email:z.string().trim().email(),password:z.string().min(8)}).optional(),
}).refine(value=>value.account_type!=='TRIAL'||!!value.trial_days,{message:'Trial days are required for a trial company'});

router.get('/super-admin/companies',asyncRoute(async(req,res)=>{
  const page=Math.max(1,Number(req.query.page)||1),size=20,search=`%${String(req.query.search??'')}%`,status=String(req.query.status??'');
  const clauses=['(c.code LIKE ? OR c.name LIKE ? OR c.email LIKE ?)'],params:unknown[]=[search,search,search];if(status){clauses.push('c.status=?');params.push(status)}
  const count=await query<RowDataPacket&{total:number}>(`SELECT COUNT(*) total FROM companies c WHERE ${clauses.join(' AND ')}`,params);
  const rows=await query<RowDataPacket&Record<string,unknown>>(`SELECT c.*,GREATEST(0,TIMESTAMPDIFF(DAY,NOW(),c.trial_ends_at)) trial_days_remaining,(SELECT COUNT(*) FROM users u WHERE u.company_id=c.id) user_count,(SELECT COUNT(*) FROM branches b WHERE b.company_id=c.id) branch_count,(SELECT u.full_name FROM users u JOIN roles r ON r.id=u.role_id WHERE u.company_id=c.id AND r.code IN ('ADMIN','COMPANY_ADMIN') ORDER BY u.id LIMIT 1) admin_name FROM companies c WHERE ${clauses.join(' AND ')} ORDER BY c.id DESC LIMIT ? OFFSET ?`,[...params,size,(page-1)*size]);
  res.json({data:rows,meta:{page,pageSize:size,total:Number(count[0]?.total??0)}});
}));

router.get('/super-admin/companies/:id',asyncRoute(async(req,res)=>{
  const rows=await query<RowDataPacket&Record<string,unknown>>('SELECT * FROM companies WHERE id=?',[req.params.id]);if(!rows[0]){res.status(404).json({message:'Company not found'});return}
  const admins=await query<RowDataPacket&Record<string,unknown>>(`SELECT u.id,u.full_name,u.username,u.email,u.status,u.last_login_at FROM users u JOIN roles r ON r.id=u.role_id WHERE u.company_id=? AND r.code IN ('ADMIN','COMPANY_ADMIN') ORDER BY u.id`,[req.params.id]);
  const history=await query<RowDataPacket&Record<string,unknown>>('SELECT h.*,u.full_name changed_by_name FROM company_status_history h LEFT JOIN users u ON u.id=h.changed_by WHERE h.company_id=? ORDER BY h.id DESC LIMIT 100',[req.params.id]);
  res.json({data:{...rows[0],admins,history}});
}));

router.post('/super-admin/companies',asyncRoute(async(req,res)=>{
  const parsed=companySchema.safeParse(req.body);if(!parsed.success){res.status(422).json({message:parsed.error.issues[0].message});return}const d=parsed.data;
  if(!d.admin){res.status(422).json({message:'Company Administrator details are required'});return}
  const result=await withTransaction(async connection=>{
    const start=d.account_type==='TRIAL'?new Date():null,end=start?new Date(start.getTime()+Number(d.trial_days)*86400000):null;
    const[out]=await connection.execute<ResultSetHeader>(`INSERT INTO companies(code,name,legal_name,gstin,pan,phone,email,address_line1,address_line2,city,state,pincode,status,account_type,trial_started_at,trial_ends_at,inactive_reason,inactive_at,max_users,max_branches)VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,[d.code,d.name,d.legal_name||null,d.gstin||null,d.pan||null,d.phone||null,d.email||null,d.address_line1||null,d.address_line2||null,d.city||null,d.state||null,d.pincode||null,d.status,d.account_type,start,end,d.inactive_reason||null,d.status==='inactive'?new Date():null,d.max_users||null,d.max_branches||null]);
    const companyId=out.insertId;
    const[branch]=await connection.execute<ResultSetHeader>('INSERT INTO branches(company_id,code,name,is_head_office,status)VALUES(?,?,?,?,"active")',[companyId,'BR-001','Head Office',1]);
    await connection.execute('INSERT INTO departments(company_id,code,name,status)VALUES(?,"DEP-001","Operations","active")',[companyId]);
    await connection.execute('INSERT INTO designations(company_id,code,name,status)VALUES(?,"DES-001","Manager","active")',[companyId]);
    await connection.execute('INSERT INTO uoms(company_id,code,name,description,status)VALUES(?,"NOS","Numbers","Individual count","active")',[companyId]);
    await connection.execute('INSERT INTO work_pending_sub_statuses(company_id,code,name,status)VALUES(?,"WAIT_CUSTOMER_APPROVAL","WAIT FOR CUSTOMER APPROVAL","active"),(?,"PARTS_UNAVAILABLE","PARTS WAITING / UNAVAILABLE","active")',[companyId,companyId]);
    await connection.execute('INSERT INTO shifts(company_id,code,name,in_time,out_time,working_hours,status)VALUES(?,"GENERAL","General Shift","09:30:00","18:30:00",8,"active"),(?,"MORNING","Morning Shift","06:00:00","14:00:00",8,"active"),(?,"EVENING","Evening Shift","14:00:00","22:00:00",8,"active")',[companyId,companyId,companyId]);
    const today=new Date(),fyStart=today.getMonth()>=3?today.getFullYear():today.getFullYear()-1,fyCode=`${fyStart}-${String(fyStart+1).slice(-2)}`;
    await connection.execute('INSERT INTO financial_years(company_id,code,name,start_date,end_date,is_current,status)VALUES(?,?,?,?,?,1,"active")',[companyId,fyCode,fyCode,`${fyStart}-04-01`,`${fyStart+1}-03-31`]);
    const[roleRows]=await connection.query<RowDataPacket[]>("SELECT id FROM roles WHERE code='ADMIN' LIMIT 1");
    const admin=d.admin!;await connection.execute('INSERT INTO users(company_id,username,email,full_name,password_hash,role_id,branch_id,status,must_change_password)VALUES(?,?,?,?,?,?,?,"active",1)',[companyId,admin.username,admin.email,admin.full_name,await bcrypt.hash(admin.password,12),roleRows[0].id,branch.insertId]);
    await connection.execute('INSERT INTO company_status_history(company_id,old_status,new_status,reason,changed_by)VALUES(?,NULL,?,?,?)',[companyId,d.status,d.inactive_reason||'Company created',req.user!.id]);
    return{id:companyId};
  });
  res.status(201).json({data:result,message:'Company and Company Administrator created'});
}));

const updateSchema=z.object({code:z.string().trim().min(2).max(20),name:z.string().trim().min(2).max(150),legal_name:z.string().trim().max(180).nullish(),phone:z.string().trim().max(20).nullish(),email:z.union([z.string().trim().email(),z.literal(''),z.null()]).nullish(),gstin:z.string().trim().max(15).nullish(),pan:z.string().trim().max(10).nullish(),address_line1:z.string().trim().max(180).nullish(),address_line2:z.string().trim().max(180).nullish(),city:z.string().trim().max(80).nullish(),state:z.string().trim().max(80).nullish(),pincode:z.string().trim().max(10).nullish(),account_type:z.enum(['TRIAL','PAID']),trial_ends_at:z.string().datetime().nullish(),status:z.enum(['active','inactive']),inactive_reason:z.string().trim().max(255).nullish(),max_users:z.coerce.number().int().positive().nullish(),max_branches:z.coerce.number().int().positive().nullish()});
router.put('/super-admin/companies/:id',asyncRoute(async(req,res)=>{
  const parsed=updateSchema.safeParse(req.body);if(!parsed.success){res.status(422).json({message:parsed.error.issues[0].message});return}const d=parsed.data;
  const existing=await query<RowDataPacket&{status:'active'|'inactive'}>('SELECT status FROM companies WHERE id=?',[req.params.id]);if(!existing[0]){res.status(404).json({message:'Company not found'});return}
  await withTransaction(async connection=>{
    await connection.execute(`UPDATE companies SET code=?,name=?,legal_name=?,gstin=?,pan=?,phone=?,email=?,address_line1=?,address_line2=?,city=?,state=?,pincode=?,status=?,account_type=?,trial_ends_at=?,inactive_reason=?,inactive_at=CASE WHEN ?='inactive' THEN COALESCE(inactive_at,NOW()) ELSE NULL END,max_users=?,max_branches=? WHERE id=?`,[d.code,d.name,d.legal_name||null,d.gstin||null,d.pan||null,d.phone||null,d.email||null,d.address_line1||null,d.address_line2||null,d.city||null,d.state||null,d.pincode||null,d.status,d.account_type,d.account_type==='TRIAL'?d.trial_ends_at||null:null,d.status==='inactive'?d.inactive_reason||'Manually inactivated':null,d.status,d.max_users||null,d.max_branches||null,req.params.id]);
    if(existing[0].status!==d.status)await connection.execute('INSERT INTO company_status_history(company_id,old_status,new_status,reason,changed_by)VALUES(?,?,?,?,?)',[req.params.id,existing[0].status,d.status,d.inactive_reason||null,req.user!.id]);
  });res.json({message:'Company updated'});
}));

router.post('/super-admin/companies/:id/status',asyncRoute(async(req,res)=>{
  const parsed=z.object({status:z.enum(['active','inactive']),reason:z.string().trim().min(3).max(255)}).safeParse(req.body);if(!parsed.success){res.status(422).json({message:parsed.error.issues[0].message});return}
  const rows=await query<RowDataPacket&{status:'active'|'inactive'}>('SELECT status FROM companies WHERE id=?',[req.params.id]);if(!rows[0]){res.status(404).json({message:'Company not found'});return}
  await withTransaction(async connection=>{await connection.execute('UPDATE companies SET status=?,inactive_reason=?,inactive_at=? WHERE id=?',[parsed.data.status,parsed.data.status==='inactive'?parsed.data.reason:null,parsed.data.status==='inactive'?new Date():null,req.params.id]);await connection.execute('INSERT INTO company_status_history(company_id,old_status,new_status,reason,changed_by)VALUES(?,?,?,?,?)',[req.params.id,rows[0].status,parsed.data.status,parsed.data.reason,req.user!.id])});
  res.json({message:`Company ${parsed.data.status==='active'?'activated':'inactivated'}`});
}));

router.post('/super-admin/companies/:id/extend-trial',asyncRoute(async(req,res)=>{
  const parsed=z.object({days:z.coerce.number().int().min(1).max(365)}).safeParse(req.body);if(!parsed.success){res.status(422).json({message:'Trial extension must be between 1 and 365 days'});return}
  await execute(`UPDATE companies SET account_type='TRIAL',trial_started_at=COALESCE(trial_started_at,NOW()),trial_ends_at=DATE_ADD(GREATEST(COALESCE(trial_ends_at,NOW()),NOW()),INTERVAL ? DAY),status='active',inactive_reason=NULL,inactive_at=NULL WHERE id=?`,[parsed.data.days,req.params.id]);
  await execute('INSERT INTO company_status_history(company_id,new_status,reason,changed_by)VALUES(?,"active",?,?)',[req.params.id,`Trial extended by ${parsed.data.days} days`,req.user!.id]);res.json({message:`Trial extended by ${parsed.data.days} days`});
}));

router.post('/super-admin/companies/:id/convert-paid',asyncRoute(async(req,res)=>{await execute(`UPDATE companies SET account_type='PAID',trial_ends_at=NULL,status='active',inactive_reason=NULL,inactive_at=NULL WHERE id=?`,[req.params.id]);await execute('INSERT INTO company_status_history(company_id,new_status,reason,changed_by)VALUES(?,"active","Converted to paid account",?)',[req.params.id,req.user!.id]);res.json({message:'Company converted to paid account'})}));

export default router;
