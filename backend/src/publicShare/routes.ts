import { Router, Request, Response, NextFunction } from 'express';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { RowDataPacket } from 'mysql2/promise';
import { query } from '../config/db';

const router=Router();
const asyncRoute=(fn:(req:Request,res:Response)=>Promise<void>)=>(req:Request,res:Response,next:NextFunction)=>fn(req,res).catch(next);

router.get('/public/job-card-share/:token',asyncRoute(async(req,res)=>{
  const token=String(req.params.token||'').trim();
  if(!/^[a-f0-9]{64}$/i.test(token)){res.status(404).json({message:'Share link not found or expired'});return}
  const hash=createHash('sha256').update(token).digest('hex');
  const rows=await query<RowDataPacket&Record<string,unknown>>(`SELECT j.*,f.name financial_year_name,b.name branch_name,
    v.vehicle_number,v.vehicle_name,v.model vehicle_model,v.manufacturing_year vehicle_manufacturing_year,
    v.fuel_type vehicle_fuel_type,v.engine_number vehicle_engine_number,v.chassis_number vehicle_chassis,
    c.name customer_name,c.mobile customer_mobile,cu.full_name created_by_name,au.full_name approved_by_name,
    w.work_order_no
    FROM job_card_share_links sl JOIN job_cards j ON j.id=sl.job_card_id AND j.company_id=sl.company_id
    JOIN financial_years f ON f.id=j.financial_year_id JOIN branches b ON b.id=j.branch_id
    JOIN vehicles v ON v.id=j.vehicle_id JOIN customers c ON c.id=j.customer_id JOIN users cu ON cu.id=j.created_by
    LEFT JOIN users au ON au.id=j.approved_by LEFT JOIN work_orders w ON w.job_card_id=j.id AND w.deleted_at IS NULL
    WHERE sl.token_hash=? AND sl.document_type='JOB_CARD' AND sl.revoked_at IS NULL AND sl.expires_at>NOW() AND j.deleted_at IS NULL LIMIT 1`,[hash]);
  if(!rows[0]){res.status(404).json({message:'Share link not found or expired'});return}
  const job=rows[0];
  const complaints=await query<RowDataPacket&Record<string,unknown>>('SELECT complaint,cost,sort_order FROM job_card_complaints WHERE job_card_id=? AND is_deleted=0 ORDER BY sort_order,id',[job.id]);
  const companies=await query<RowDataPacket&Record<string,unknown>>('SELECT id,name,legal_name,gstin,pan,phone,email,website,address_line1,address_line2,city,state,pincode,logo_path,logo_mime_type FROM companies WHERE id=? AND status="active"',[job.company_id]);
  const company=companies[0]??{};
  if(company.logo_path&&company.logo_mime_type){try{company.logo_data_url=`data:${company.logo_mime_type};base64,${fs.readFileSync(String(company.logo_path)).toString('base64')}`}catch{} }
  delete company.logo_path;delete company.logo_mime_type;
  res.json({data:{job_card:{...job,complaints},company}});
}));

router.get('/public/billing-share/:token',asyncRoute(async(req,res)=>{
  const token=String(req.params.token||'').trim();
  if(!/^[a-f0-9]{64}$/i.test(token)){res.status(404).json({message:'Share link not found or expired'});return}
  const hash=createHash('sha256').update(token).digest('hex');
  const rows=await query<RowDataPacket&Record<string,unknown>>(`SELECT j.*,f.name financial_year_name,b.name branch_name,
    v.vehicle_number,v.vehicle_name,v.model vehicle_model,c.name customer_name,c.mobile customer_mobile,
    w.id work_order_id,w.work_order_no,w.work_order_type,w.service_cost,w.labour_cost
    FROM job_card_share_links sl JOIN job_cards j ON j.id=sl.job_card_id AND j.company_id=sl.company_id
    JOIN financial_years f ON f.id=j.financial_year_id JOIN branches b ON b.id=j.branch_id
    JOIN vehicles v ON v.id=j.vehicle_id JOIN customers c ON c.id=j.customer_id
    LEFT JOIN work_orders w ON w.job_card_id=j.id AND w.company_id=j.company_id AND w.deleted_at IS NULL
    WHERE sl.token_hash=? AND sl.document_type='BILLING' AND sl.revoked_at IS NULL AND sl.expires_at>NOW() AND j.deleted_at IS NULL LIMIT 1`,[hash]);
  if(!rows[0]){res.status(404).json({message:'Share link not found or expired'});return}
  const bill=rows[0];
  const complaints=await query<RowDataPacket&Record<string,unknown>>('SELECT complaint,cost,sort_order FROM job_card_complaints WHERE job_card_id=? AND is_deleted=0 ORDER BY sort_order,id',[bill.id]);
  const spares=bill.work_order_id?await query<RowDataPacket&Record<string,unknown>>('SELECT * FROM work_order_spares WHERE work_order_id=? AND is_deleted=0 ORDER BY sort_order,id',[bill.work_order_id]):[];
  const receipts=await query<RowDataPacket&Record<string,unknown>>('SELECT * FROM payment_receipts WHERE job_card_id=? AND is_deleted=0 ORDER BY receipt_date,id',[bill.id]);
  const companies=await query<RowDataPacket&Record<string,unknown>>('SELECT id,name,legal_name,gstin,pan,phone,email,website,address_line1,address_line2,city,state,pincode,logo_path,logo_mime_type FROM companies WHERE id=? AND status="active"',[bill.company_id]);
  const company=companies[0]??{};
  if(company.logo_path&&company.logo_mime_type){try{company.logo_data_url=`data:${company.logo_mime_type};base64,${fs.readFileSync(String(company.logo_path)).toString('base64')}`}catch{} }
  delete company.logo_path;delete company.logo_mime_type;
  const totalPaid=Number(bill.advance_paid??0)+receipts.reduce((sum,row)=>sum+Number(row.amount??0),0);
  res.json({data:{billing:{...bill,complaints,spares,receipts,total_paid:totalPaid},company}});
}));

router.get('/public/work-order-share/:token',asyncRoute(async(req,res)=>{
  const token=String(req.params.token||'').trim();
  if(!/^[a-f0-9]{64}$/i.test(token)){res.status(404).json({message:'Share link not found or expired'});return}
  const hash=createHash('sha256').update(token).digest('hex');
  const rows=await query<RowDataPacket&Record<string,unknown>>(`SELECT w.*,j.job_card_no,j.entry_date,j.estimate_amount,j.advance_paid,j.balance,
    f.name financial_year_name,b.name branch_name,v.vehicle_number,v.vehicle_name,v.model vehicle_model,
    c.name customer_name,c.mobile customer_contact
    FROM job_card_share_links sl JOIN work_orders w ON w.id=sl.work_order_id AND w.company_id=sl.company_id AND w.deleted_at IS NULL
    JOIN job_cards j ON j.id=w.job_card_id AND j.company_id=w.company_id AND j.deleted_at IS NULL
    JOIN financial_years f ON f.id=j.financial_year_id JOIN branches b ON b.id=j.branch_id
    JOIN vehicles v ON v.id=j.vehicle_id JOIN customers c ON c.id=j.customer_id
    WHERE sl.token_hash=? AND sl.document_type='WORK_ORDER' AND sl.revoked_at IS NULL AND sl.expires_at>NOW() LIMIT 1`,[hash]);
  if(!rows[0]){res.status(404).json({message:'Share link not found or expired'});return}
  const work=rows[0];
  const complaints=await query<RowDataPacket&Record<string,unknown>>('SELECT wc.*,jc.complaint,jc.cost,CONCAT_WS(\' \',e.first_name,e.last_name) mechanic_name,s.name pending_sub_status_name FROM work_order_complaints wc JOIN job_card_complaints jc ON jc.id=wc.job_card_complaint_id LEFT JOIN employees e ON e.id=wc.mechanic_employee_id LEFT JOIN work_pending_sub_statuses s ON s.id=wc.pending_sub_status_id WHERE wc.work_order_id=? AND jc.is_deleted=0 ORDER BY jc.sort_order,id',[work.id]);
  const spares=await query<RowDataPacket&Record<string,unknown>>('SELECT * FROM work_order_spares WHERE work_order_id=? AND is_deleted=0 ORDER BY sort_order,id',[work.id]);
  const companies=await query<RowDataPacket&Record<string,unknown>>('SELECT id,name,legal_name,gstin,pan,phone,email,website,address_line1,address_line2,city,state,pincode,logo_path,logo_mime_type FROM companies WHERE id=? AND status="active"',[work.company_id]);
  const company=companies[0]??{};
  if(company.logo_path&&company.logo_mime_type){try{company.logo_data_url=`data:${company.logo_mime_type};base64,${fs.readFileSync(String(company.logo_path)).toString('base64')}`}catch{} }
  delete company.logo_path;delete company.logo_mime_type;
  res.json({data:{work_order:{...work,complaints,spares},company}});
}));

export default router;
