import { Router,Request,Response,NextFunction } from 'express';
import { RowDataPacket } from 'mysql2/promise';
import { authenticate } from '../middleware/auth';
import { query } from '../config/db';

const router=Router();router.use(authenticate);
const asyncRoute=(fn:(req:Request,res:Response)=>Promise<void>)=>(req:Request,res:Response,next:NextFunction)=>fn(req,res).catch(next);
const one=async(sql:string,params:unknown[]=[])=>((await query<RowDataPacket&Record<string,unknown>>(sql,params))[0]??{});

router.get('/dashboard',asyncRoute(async(req,res)=>{
  const profile=await one(`SELECT u.branch_id,b.name branch_name,c.id company_id,c.name company_name FROM users u LEFT JOIN branches b ON b.id=u.branch_id LEFT JOIN companies c ON c.id=b.company_id WHERE u.id=?`,[req.user!.id]);
  if(!profile.company_name)Object.assign(profile,await one('SELECT id company_id,name company_name FROM companies WHERE status="active" ORDER BY id LIMIT 1'));
  const requested=String(req.query.view??'operations'),md=requested==='md'&&req.user!.permissions.includes('MD_DASHBOARD_VIEW'),operations=requested==='operations'&&req.user!.permissions.includes('DASHBOARD_VIEW');
  if(!md&&!operations){res.json({data:{mode:'welcome',company:profile}});return}
  const fy=Number(req.query.financial_year_id)||0,branch=md?0:Number(profile.branch_id)||0;
  const jobWhere=`j.deleted_at IS NULL ${fy?'AND j.financial_year_id=?':''} ${branch?'AND j.branch_id=?':''}`,jobParams=[...(fy?[fy]:[]),...(branch?[branch]:[])];
  const workWhere=`w.deleted_at IS NULL ${fy?'AND w.financial_year_id=?':''} ${branch?'AND j.branch_id=?':''}`,workParams=[...(fy?[fy]:[]),...(branch?[branch]:[])];
  const [jobs,works,finance,serviceDue,recentJobs,trend,masterCounts]=await Promise.all([
    one(`SELECT COUNT(*) total,SUM(j.status='draft') draft,SUM(j.status<>'draft') approved,SUM(j.entry_date=CURDATE()) today,SUM(DATE_FORMAT(j.entry_date,'%Y-%m')=DATE_FORMAT(CURDATE(),'%Y-%m')) this_month FROM job_cards j WHERE ${jobWhere}`,jobParams),
    one(`SELECT COUNT(*) total,SUM(w.overall_status='pending') pending,SUM(w.overall_status='partially_completed') partial,SUM(w.overall_status='completed') completed FROM work_orders w JOIN job_cards j ON j.id=w.job_card_id WHERE ${workWhere}`,workParams),
    one(`SELECT ROUND(COALESCE(SUM(j.estimate_amount),0),2) estimate,ROUND(COALESCE(SUM(j.advance_paid),0)+COALESCE(SUM(pay.receipts),0),2) collected,ROUND(COALESCE(SUM(GREATEST(j.estimate_amount-j.advance_paid-COALESCE(pay.receipts,0),0)),0),2) receivable FROM job_cards j LEFT JOIN(SELECT job_card_id,SUM(amount) receipts FROM payment_receipts WHERE is_deleted=0 GROUP BY job_card_id)pay ON pay.job_card_id=j.id WHERE ${jobWhere}`,jobParams),
    query<RowDataPacket&Record<string,unknown>>(`SELECT j.id,j.job_card_no,j.next_service_date,DATEDIFF(j.next_service_date,CURDATE()) due_in_days,v.vehicle_number,c.name customer_name,COALESCE(NULLIF(j.customer_contact,''),c.mobile) contact_number,b.name branch_name FROM job_cards j JOIN vehicles v ON v.id=j.vehicle_id JOIN customers c ON c.id=j.customer_id JOIN branches b ON b.id=j.branch_id WHERE ${jobWhere} AND j.next_service_date IS NOT NULL AND j.next_service_date<=DATE_ADD(CURDATE(),INTERVAL 7 DAY) AND j.id=(SELECT MAX(j2.id) FROM job_cards j2 WHERE j2.vehicle_id=j.vehicle_id AND j2.deleted_at IS NULL AND j2.next_service_date IS NOT NULL) ORDER BY j.next_service_date LIMIT 12`,jobParams),
    query<RowDataPacket&Record<string,unknown>>(`SELECT j.id,j.job_card_no,j.entry_date,j.status,v.vehicle_number,c.name customer_name,j.estimate_amount FROM job_cards j JOIN vehicles v ON v.id=j.vehicle_id JOIN customers c ON c.id=j.customer_id WHERE ${jobWhere} ORDER BY j.id DESC LIMIT 6`,jobParams),
    query<RowDataPacket&Record<string,unknown>>(`SELECT DATE_FORMAT(j.entry_date,'%Y-%m') month,COUNT(*) jobs,ROUND(SUM(j.estimate_amount),2) estimate FROM job_cards j WHERE ${jobWhere} AND j.entry_date>=DATE_SUB(DATE_FORMAT(CURDATE(),'%Y-%m-01'),INTERVAL 5 MONTH) GROUP BY DATE_FORMAT(j.entry_date,'%Y-%m') ORDER BY month`,jobParams),
    one(`SELECT (SELECT COUNT(*) FROM employees WHERE status='active' ${branch?'AND branch_id=?':''}) employees,(SELECT COUNT(*) FROM customers WHERE status='active') customers,(SELECT COUNT(*) FROM vendors WHERE status='active') vendors,(SELECT COUNT(*) FROM branches WHERE status='active') branches`,branch?[branch]:[]),
  ]);
  const common={mode:md?'md':'operations',company:profile,jobs,works,finance,service_due:serviceDue,recent_jobs:recentJobs,trend,masters:masterCounts};
  if(!md){
    const [attendance,paymentStatus,purchases,vendorOutstanding,pendingReasons,recentWorks]=await Promise.all([
      one(`SELECT COUNT(e.id) employees,SUM(a.id IS NOT NULL) marked,SUM(a.attendance_type='PRESENT') present,SUM(a.attendance_type='PERMISSION') permission,SUM(a.attendance_type='HALF_DAY_LEAVE') half_day,SUM(a.attendance_type='FULL_DAY_LEAVE') full_day_leave,SUM(a.attendance_type='ABSENT') absent,ROUND(COALESCE(SUM(a.ot_hours),0),2) ot_hours FROM employees e LEFT JOIN daily_attendance a ON a.employee_id=e.id AND a.attendance_date=CURDATE() WHERE e.status='active' AND e.payroll_applicable=1 ${branch?'AND e.branch_id=?':''}`,branch?[branch]:[]),
      one(`SELECT SUM(balance<=0) fully_paid,SUM(total_paid>0 AND balance>0) partially_paid,SUM(total_paid<=0 AND balance>0) pending,ROUND(COALESCE(SUM(balance),0),2) balance FROM(SELECT j.id,j.estimate_amount,j.advance_paid+COALESCE(pay.receipts,0) total_paid,GREATEST(j.estimate_amount-j.advance_paid-COALESCE(pay.receipts,0),0) balance FROM job_cards j LEFT JOIN(SELECT job_card_id,SUM(amount) receipts FROM payment_receipts WHERE is_deleted=0 GROUP BY job_card_id)pay ON pay.job_card_id=j.id WHERE ${jobWhere})x`,jobParams),
      one(`SELECT ROUND(COALESCE(SUM(net_amount),0),2) total,COUNT(*) bills FROM store_entries WHERE deleted_at IS NULL ${fy?'AND financial_year_id=?':''} AND DATE_FORMAT(entry_date,'%Y-%m')=DATE_FORMAT(CURDATE(),'%Y-%m')`,fy?[fy]:[]),
      one(`SELECT ROUND(COALESCE(SUM(GREATEST(s.net_amount-COALESCE(p.paid,0),0)),0),2) outstanding FROM store_entries s LEFT JOIN(SELECT a.store_entry_id,SUM(a.amount) paid FROM vendor_payment_allocations a JOIN vendor_payments vp ON vp.id=a.vendor_payment_id AND vp.is_deleted=0 GROUP BY a.store_entry_id)p ON p.store_entry_id=s.id WHERE s.deleted_at IS NULL AND s.store_type='CREDIT' ${fy?'AND s.financial_year_id=?':''}`,fy?[fy]:[]),
      query<RowDataPacket&Record<string,unknown>>(`SELECT COALESCE(s.name,'Awaiting update') reason,COUNT(*) total FROM work_order_complaints wc JOIN work_orders w ON w.id=wc.work_order_id JOIN job_cards j ON j.id=w.job_card_id LEFT JOIN work_pending_sub_statuses s ON s.id=wc.pending_sub_status_id WHERE wc.status='pending' AND ${workWhere} GROUP BY s.id,s.name ORDER BY total DESC`,workParams),
      query<RowDataPacket&Record<string,unknown>>(`SELECT w.id,w.work_order_no,w.overall_status,w.work_order_type,j.job_card_no,v.vehicle_number,c.name customer_name,COUNT(wc.id) complaints,SUM(wc.status='completed') completed FROM work_orders w JOIN job_cards j ON j.id=w.job_card_id JOIN vehicles v ON v.id=j.vehicle_id JOIN customers c ON c.id=j.customer_id LEFT JOIN work_order_complaints wc ON wc.work_order_id=w.id WHERE ${workWhere} GROUP BY w.id ORDER BY w.id DESC LIMIT 6`,workParams),
    ]);
    res.json({data:{...common,attendance,payment_status:paymentStatus,purchases,vendor_outstanding:vendorOutstanding,pending_reasons:pendingReasons,recent_works:recentWorks}});return
  }
  const [purchases,vendorOutstanding,branchPerformance,payroll]=await Promise.all([
    one(`SELECT ROUND(COALESCE(SUM(net_amount),0),2) total,COUNT(*) bills FROM store_entries WHERE deleted_at IS NULL ${fy?'AND financial_year_id=?':''} AND DATE_FORMAT(entry_date,'%Y-%m')=DATE_FORMAT(CURDATE(),'%Y-%m')`,fy?[fy]:[]),
    one(`SELECT ROUND(COALESCE(SUM(GREATEST(s.net_amount-COALESCE(p.paid,0),0)),0),2) outstanding FROM store_entries s LEFT JOIN(SELECT a.store_entry_id,SUM(a.amount) paid FROM vendor_payment_allocations a JOIN vendor_payments vp ON vp.id=a.vendor_payment_id AND vp.is_deleted=0 GROUP BY a.store_entry_id)p ON p.store_entry_id=s.id WHERE s.deleted_at IS NULL AND s.store_type='CREDIT' ${fy?'AND s.financial_year_id=?':''}`,fy?[fy]:[]),
    query<RowDataPacket&Record<string,unknown>>(`SELECT b.id,b.name,COUNT(j.id) jobs,ROUND(COALESCE(SUM(j.estimate_amount),0),2) estimate,ROUND(COALESCE(SUM(j.advance_paid),0),2) advance FROM branches b LEFT JOIN job_cards j ON j.branch_id=b.id AND j.deleted_at IS NULL ${fy?'AND j.financial_year_id=?':''} AND DATE_FORMAT(j.entry_date,'%Y-%m')=DATE_FORMAT(CURDATE(),'%Y-%m') WHERE b.status='active' ${branch?'AND b.id=?':''} GROUP BY b.id ORDER BY estimate DESC LIMIT 8`,[...(fy?[fy]:[]),...(branch?[branch]:[])]),
    one(`SELECT ROUND(COALESCE(SUM(d.net_salary),0),2) net_salary,COUNT(d.id) employees FROM payroll_details d JOIN payroll_runs r ON r.id=d.payroll_run_id WHERE r.salary_month=DATE_FORMAT(CURDATE(),'%Y-%m') ${branch?'AND r.branch_id=?':''}`,branch?[branch]:[]),
  ]);
  res.json({data:{...common,purchases,vendor_outstanding:vendorOutstanding,branch_performance:branchPerformance,payroll}});
}));

export default router;
