import { NextFunction,Request,Response,Router } from 'express';
import { RowDataPacket } from 'mysql2/promise';
import { authenticate,requirePermission } from '../middleware/auth';
import { query } from '../config/db';

const router=Router();router.use(authenticate);
const asyncRoute=(fn:(req:Request,res:Response)=>Promise<void>)=>(req:Request,res:Response,next:NextFunction)=>fn(req,res).catch(next);

router.get('/reports/audit/options',requirePermission('AUDIT_VIEW'),asyncRoute(async(_req,res)=>{
  const modules=await query<RowDataPacket&{module_name:string}>('SELECT DISTINCT module_name FROM audit_logs ORDER BY module_name');
  const users=await query<RowDataPacket&Record<string,unknown>>('SELECT id,full_name,username FROM users ORDER BY full_name');
  res.json({data:{modules:modules.map(row=>row.module_name),users}});
}));

router.get('/reports/audit',requirePermission('AUDIT_VIEW'),asyncRoute(async(req,res)=>{
  const page=Math.max(1,Number(req.query.page)||1),pageSize=Math.min(100,Math.max(10,Number(req.query.pageSize)||25));
  const clauses:string[]=['1=1'],params:unknown[]=[];
  const add=(sql:string,value:unknown)=>{clauses.push(sql);params.push(value)};
  if(req.query.module)add('a.module_name=?',String(req.query.module));
  if(req.query.action)add('a.action=?',String(req.query.action));
  if(req.query.user_id)add('a.user_id=?',Number(req.query.user_id));
  if(req.query.from)add('DATE(a.created_at)>=?',String(req.query.from));
  if(req.query.to)add('DATE(a.created_at)<=?',String(req.query.to));
  if(req.query.search){const s=`%${String(req.query.search)}%`;clauses.push('(a.record_display_name LIKE ? OR a.record_id LIKE ? OR a.route LIKE ? OR u.full_name LIKE ?)');params.push(s,s,s,s)}
  const where=clauses.join(' AND ');
  const count=await query<RowDataPacket&{total:number}>(`SELECT COUNT(*) total FROM audit_logs a JOIN users u ON u.id=a.user_id WHERE ${where}`,params);
  const rows=await query<RowDataPacket&Record<string,unknown>>(`SELECT a.*,u.full_name user_name,u.username FROM audit_logs a JOIN users u ON u.id=a.user_id WHERE ${where} ORDER BY a.id DESC LIMIT ? OFFSET ?`,[...params,pageSize,(page-1)*pageSize]);
  res.json({data:rows,meta:{page,pageSize,total:Number(count[0]?.total??0)}});
}));

router.get('/audit/timeline',requirePermission('AUDIT_VIEW'),asyncRoute(async(req,res)=>{
  const entity=String(req.query.entity_type??''),recordId=String(req.query.record_id??''),displayName=String(req.query.display_name??'');
  if(!entity||!recordId){res.status(422).json({message:'Entity type and record ID are required'});return}
  const rows=await query<RowDataPacket&Record<string,unknown>>(`SELECT a.*,u.full_name user_name,u.username FROM audit_logs a JOIN users u ON u.id=a.user_id WHERE a.entity_type=? AND (a.record_id=? ${displayName?'OR a.record_display_name=?':''}) ORDER BY a.id DESC LIMIT 200`,displayName?[entity,recordId,displayName]:[entity,recordId]);
  res.json({data:rows});
}));

type ReportDefinition={label:string;date:string;fy?:string;branch?:string;status?:string;vendor?:string;search:string[];sql:string;order:string};
const reports:Record<string,ReportDefinition>={
  'job-cards':{label:'Job Cards',date:'j.entry_date',fy:'j.financial_year_id',branch:'j.branch_id',status:'j.status',search:['j.job_card_no','v.vehicle_number','c.name','c.mobile'],order:'j.entry_date DESC,j.id DESC',sql:`SELECT j.job_card_no,j.entry_date,b.name branch_name,v.vehicle_number,c.code customer_code,c.name customer_name,c.mobile contact_number,j.driver_contact,j.current_kms,j.current_hours,j.next_service_date,j.complaint_total,j.estimate_amount,j.advance_paid,j.balance,j.status,COUNT(jcc.id) complaint_count FROM job_cards j JOIN branches b ON b.id=j.branch_id JOIN vehicles v ON v.id=j.vehicle_id JOIN customers c ON c.id=j.customer_id LEFT JOIN job_card_complaints jcc ON jcc.job_card_id=j.id AND jcc.is_deleted=0`},
  'work-orders':{label:'Work Orders',date:'j.entry_date',fy:'w.financial_year_id',branch:'j.branch_id',status:'w.overall_status',search:['w.work_order_no','j.job_card_no','v.vehicle_number','c.name'],order:'w.id DESC',sql:`SELECT w.work_order_no,j.job_card_no,j.entry_date,b.name branch_name,c.name customer_name,c.mobile contact_number,v.vehicle_number,w.work_order_type,w.overall_status,w.approval_status,w.approved_at,(SELECT COUNT(*) FROM work_order_complaints wc WHERE wc.work_order_id=w.id) complaint_count,(SELECT COUNT(*) FROM work_order_spares ws WHERE ws.work_order_id=w.id AND ws.is_deleted=0) spare_count,(SELECT COALESCE(SUM(ws.total),0) FROM work_order_spares ws WHERE ws.work_order_id=w.id AND ws.is_deleted=0) spare_total FROM work_orders w JOIN job_cards j ON j.id=w.job_card_id JOIN branches b ON b.id=j.branch_id JOIN customers c ON c.id=j.customer_id JOIN vehicles v ON v.id=j.vehicle_id`},
  'work-order-complaints':{label:'Work Order Complaints',date:'j.entry_date',fy:'w.financial_year_id',branch:'j.branch_id',status:'wc.status',search:['w.work_order_no','j.job_card_no','jc.complaint','v.vehicle_number','c.name'],order:'w.id DESC,wc.id',sql:`SELECT w.work_order_no,j.job_card_no,j.entry_date,b.name branch_name,c.name customer_name,v.vehicle_number,jc.complaint,CONCAT_WS(' ',e.first_name,e.last_name) mechanic_name,wc.status,ps.name pending_sub_status FROM work_order_complaints wc JOIN work_orders w ON w.id=wc.work_order_id JOIN job_cards j ON j.id=w.job_card_id JOIN job_card_complaints jc ON jc.id=wc.job_card_complaint_id JOIN branches b ON b.id=j.branch_id JOIN customers c ON c.id=j.customer_id JOIN vehicles v ON v.id=j.vehicle_id LEFT JOIN employees e ON e.id=wc.mechanic_employee_id LEFT JOIN work_pending_sub_statuses ps ON ps.id=wc.pending_sub_status_id`},
  'accounts':{label:'Customer Accounts',date:'j.entry_date',fy:'j.financial_year_id',branch:'j.branch_id',status:'j.status',search:['j.job_card_no','w.work_order_no','c.name','v.vehicle_number','c.mobile'],order:'j.entry_date DESC,j.id DESC',sql:`SELECT j.job_card_no,w.work_order_no,j.entry_date,b.name branch_name,c.name customer_name,c.mobile contact_number,v.vehicle_number,j.status job_status,j.estimate_amount,j.advance_paid,COALESCE(SUM(p.amount),0) additional_paid,j.advance_paid+COALESCE(SUM(p.amount),0) total_paid,GREATEST(j.estimate_amount-j.advance_paid-COALESCE(SUM(p.amount),0),0) balance,CASE WHEN GREATEST(j.estimate_amount-j.advance_paid-COALESCE(SUM(p.amount),0),0)=0 THEN '100% PAID' WHEN j.advance_paid+COALESCE(SUM(p.amount),0)>0 THEN 'PARTIALLY PAID' ELSE '100% PENDING' END payment_status FROM job_cards j JOIN branches b ON b.id=j.branch_id JOIN customers c ON c.id=j.customer_id JOIN vehicles v ON v.id=j.vehicle_id LEFT JOIN work_orders w ON w.job_card_id=j.id AND w.deleted_at IS NULL LEFT JOIN payment_receipts p ON p.job_card_id=j.id AND p.is_deleted=0`},
  'customer-receipts':{label:'Customer Receipts',date:'p.receipt_date',fy:'p.financial_year_id',branch:'j.branch_id',search:['p.receipt_no','j.job_card_no','c.name','p.reference_number'],order:'p.receipt_date DESC,p.id DESC',sql:`SELECT p.receipt_no,p.receipt_date,b.name branch_name,j.job_card_no,w.work_order_no,c.name customer_name,v.vehicle_number,p.payment_mode,p.reference_number,p.amount,p.remarks,u.full_name received_by FROM payment_receipts p JOIN job_cards j ON j.id=p.job_card_id JOIN branches b ON b.id=j.branch_id JOIN customers c ON c.id=j.customer_id JOIN vehicles v ON v.id=j.vehicle_id LEFT JOIN work_orders w ON w.id=p.work_order_id JOIN users u ON u.id=p.created_by`},
  'stores':{label:'Store Entries',date:'s.entry_date',fy:'s.financial_year_id',status:'s.store_type',vendor:'s.vendor_id',search:['s.store_no','s.bill_no','v.name','v.code'],order:'s.entry_date DESC,s.id DESC',sql:`SELECT s.store_no,s.entry_date,s.store_type,s.bill_no,v.code vendor_code,v.name vendor_name,s.vendor_gst_type,s.vendor_gstin,s.taxable_amount,s.gst_amount,s.discount_amount,s.net_amount,COUNT(d.id) item_count FROM store_entries s JOIN vendors v ON v.id=s.vendor_id LEFT JOIN store_entry_details d ON d.store_entry_id=s.id AND d.is_deleted=0`},
  'store-spares':{label:'Store Spare Details',date:'s.entry_date',fy:'s.financial_year_id',status:'s.store_type',vendor:'s.vendor_id',search:['s.store_no','s.bill_no','v.name','d.product_code','d.product_name'],order:'s.entry_date DESC,s.id DESC,d.sort_order',sql:`SELECT s.store_no,s.entry_date,s.store_type,s.bill_no,v.name vendor_name,d.product_code,d.product_name,d.part_number,d.hsn_code,d.quantity,d.rate,d.gst_percent,d.discount_percent,d.taxable_amount,d.gst_amount,d.total_amount FROM store_entry_details d JOIN store_entries s ON s.id=d.store_entry_id JOIN vendors v ON v.id=s.vendor_id`},
  'vendor-payments':{label:'Vendor Payments',date:'p.payment_date',fy:'p.financial_year_id',vendor:'p.vendor_id',search:['p.payment_no','v.name','s.store_no','s.bill_no'],order:'p.payment_date DESC,p.id DESC',sql:`SELECT p.payment_no,p.payment_date,v.code vendor_code,v.name vendor_name,s.store_no,s.bill_no,s.entry_date bill_date,s.net_amount bill_amount,a.amount allocated_amount,p.total_amount payment_total,p.remarks,u.full_name paid_by FROM vendor_payment_allocations a JOIN vendor_payments p ON p.id=a.vendor_payment_id JOIN vendors v ON v.id=p.vendor_id JOIN store_entries s ON s.id=a.store_entry_id JOIN users u ON u.id=p.created_by`},
  'attendance':{label:'Daily Attendance',date:'a.attendance_date',fy:'a.financial_year_id',branch:'a.branch_id',status:'a.attendance_type',search:['e.code','e.first_name','e.last_name','d.name'],order:'a.attendance_date DESC,e.first_name',sql:`SELECT a.attendance_date,b.name branch_name,e.code employee_code,CONCAT_WS(' ',e.first_name,e.last_name) employee_name,d.name department_name,g.name designation_name,s.name shift_name,asf.name additional_shift,a.attendance_type,a.in_time,a.out_time,a.permission_hours,a.ot_hours,a.source,a.remarks FROM daily_attendance a JOIN branches b ON b.id=a.branch_id JOIN employees e ON e.id=a.employee_id LEFT JOIN departments d ON d.id=e.department_id LEFT JOIN designations g ON g.id=e.designation_id LEFT JOIN shifts s ON s.id=a.shift_id LEFT JOIN shifts asf ON asf.id=a.additional_shift_id`},
  'salary-advances':{label:'Salary Advances',date:'sa.advance_date',fy:'sa.financial_year_id',status:'sa.status',search:['sa.advance_no','e.code','e.first_name','e.last_name'],order:'sa.advance_date DESC,sa.id DESC',sql:`SELECT sa.advance_no,sa.advance_date,e.code employee_code,CONCAT_WS(' ',e.first_name,e.last_name) employee_name,d.name department_name,sa.amount,sa.recovery_month,sa.status,sa.remarks FROM salary_advances sa JOIN employees e ON e.id=sa.employee_id LEFT JOIN departments d ON d.id=e.department_id`},
  'payroll':{label:'Payroll',date:'STR_TO_DATE(CONCAT(r.salary_month,"-01"),"%Y-%m-%d")',fy:'r.financial_year_id',branch:'r.branch_id',status:'r.status',search:['e.code','e.first_name','e.last_name','d.name'],order:'r.salary_month DESC,e.first_name',sql:`SELECT r.salary_month,b.name branch_name,r.status payroll_status,e.code employee_code,CONCAT_WS(' ',e.first_name,e.last_name) employee_name,d.name department_name,p.month_days,p.present_days,p.permission_days,p.half_days,p.leave_days,p.absent_days,p.payable_days,p.ot_hours,p.monthly_salary,p.earned_salary,p.ot_amount,p.advance_deduction,p.other_earnings,p.other_deductions,p.net_salary FROM payroll_details p JOIN payroll_runs r ON r.id=p.payroll_run_id JOIN branches b ON b.id=r.branch_id JOIN employees e ON e.id=p.employee_id LEFT JOIN departments d ON d.id=e.department_id`},
};

router.get('/reports/entries/options',requirePermission('ENTRY_REPORT_VIEW'),asyncRoute(async(_req,res)=>{
  const branches=await query<RowDataPacket&Record<string,unknown>>("SELECT id,name FROM branches WHERE status='active' ORDER BY name");
  const vendors=await query<RowDataPacket&Record<string,unknown>>("SELECT id,name,code FROM vendors WHERE status='active' ORDER BY name");
  res.json({data:{reports:Object.entries(reports).map(([key,value])=>({key,label:value.label})),branches,vendors}});
}));

router.get('/reports/entries/:type',requirePermission('ENTRY_REPORT_VIEW'),asyncRoute(async(req,res)=>{
  const def=reports[req.params.type];if(!def){res.status(404).json({message:'Report not found'});return}
  const clauses:string[]=[];const params:unknown[]=[];
  if(req.params.type==='job-cards'||req.params.type==='accounts')clauses.push('j.deleted_at IS NULL');
  if(req.params.type.startsWith('work-order'))clauses.push('w.deleted_at IS NULL');
  if(req.params.type==='stores'||req.params.type==='store-spares')clauses.push('s.deleted_at IS NULL');
  if(req.params.type==='store-spares')clauses.push('d.is_deleted=0');
  if(req.params.type==='vendor-payments')clauses.push('p.is_deleted=0');
  if(req.params.type==='customer-receipts')clauses.push('p.is_deleted=0');
  if(req.params.type==='salary-advances')clauses.push('sa.deleted_at IS NULL');
  if(def.fy&&req.query.financial_year_id){clauses.push(`${def.fy}=?`);params.push(Number(req.query.financial_year_id))}
  if(req.query.from){clauses.push(`${def.date}>=?`);params.push(String(req.query.from))}
  if(req.query.to){clauses.push(`${def.date}<=?`);params.push(String(req.query.to))}
  if(def.branch&&req.query.branch_id){clauses.push(`${def.branch}=?`);params.push(Number(req.query.branch_id))}
  if(def.vendor&&req.query.vendor_id){clauses.push(`${def.vendor}=?`);params.push(Number(req.query.vendor_id))}
  if(def.status&&req.query.status){clauses.push(`${def.status}=?`);params.push(String(req.query.status))}
  if(req.query.search){const search=`%${String(req.query.search)}%`;clauses.push(`(${def.search.map(column=>`${column} LIKE ?`).join(' OR ')})`);params.push(...def.search.map(()=>search))}
  let sql=`${def.sql} ${clauses.length?`WHERE ${clauses.join(' AND ')}`:''}`;
  if(['job-cards','work-orders','accounts','stores'].includes(req.params.type))sql+=' GROUP BY '+({
    'job-cards':'j.id','work-orders':'w.id','accounts':'j.id','stores':'s.id',
  } as Record<string,string>)[req.params.type];
  sql+=` ORDER BY ${def.order} LIMIT 5000`;
  const rows=await query<RowDataPacket&Record<string,unknown>>(sql,params);
  res.json({data:rows,meta:{type:req.params.type,label:def.label,total:rows.length}});
}));

export default router;
