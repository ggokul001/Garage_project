import { Router, Request, Response, NextFunction } from 'express';
import { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { z } from 'zod';
import multer from 'multer';
import path from 'node:path';
import { authenticate, requirePermission } from '../middleware/auth';
import { execute, query, withTransaction } from '../config/db';
import { syncSourceQuantity } from '../inventory/service';
import { canAccessBranch, isCompanyWideRole } from '../security/branchAccess';
import { companyStorage, isInsideUploads } from '../utils/uploadStorage';
import { env } from '../config/env';
const router = Router();
router.use(authenticate);
const branchScope = (req: Request, alias: string) => { if (isCompanyWideRole(req.user?.role, req.user?.branch_ids??[])) return { sql:'', params:[] as number[] }; const ids=req.user?.branch_ids??[]; return ids.length ? { sql:` AND ${alias}.branch_id IN (${ids.map(()=>'?').join(',')})`, params:ids } : { sql:' AND 1=0', params:[] as number[] }; };
const assertBranchAccess=(req:Request,branchId:number)=>{if(!canAccessBranch(req.user?.role,branchId,req.user?.branch_ids??[]))throw new Error('You do not have access to this branch')};
const inventoryBranch=(req:Request,requested:number)=>{if(isCompanyWideRole(req.user?.role,req.user?.branch_ids??[]))return requested;const allowed=[...(req.user?.branch_ids??[]),Number(req.user?.branch_id??0)].filter(Boolean);return requested||Number(allowed[0]??0)};
const inventoryBranchAllowed=(req:Request,branchId:number)=>isCompanyWideRole(req.user?.role,req.user?.branch_ids??[])||!branchId||canAccessBranch(req.user?.role,branchId,req.user?.branch_ids??[])||Number(req.user?.branch_id)===branchId;
const asyncRoute = (fn: (req: Request, res: Response) => Promise<void>) => (req: Request, res: Response, next: NextFunction) => fn(req, res).catch(next);
const id = z.coerce.number().int().positive(), money = z.coerce.number().min(0), round = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
async function nextNumber(conn: PoolConnection, type: string, fyId: number, prefix: string,companyId:number) {
    await conn.execute('INSERT IGNORE INTO document_sequences(company_id,document_type,financial_year_id,prefix,last_number) VALUES(?,?,?,?,0)', [companyId,type, fyId, prefix]);
    const [rows] = await conn.query<RowDataPacket[]>('SELECT id,last_number FROM document_sequences WHERE company_id=? AND document_type=? AND financial_year_id=? FOR UPDATE', [companyId,type, fyId]);
    const next = Number(rows[0].last_number) + 1;
    await conn.execute('UPDATE document_sequences SET last_number=? WHERE id=?', [next, rows[0].id]);
    const [fy] = await conn.query<RowDataPacket[]>('SELECT code FROM financial_years WHERE id=? AND company_id=? AND status="active"', [fyId,companyId]);
    if (!fy[0])
        throw new Error('Financial year not found or inactive');
    return `${prefix}/${fy[0].code}/${String(next).padStart(6, '0')}`;
}
const detailSchema = z.object({ id: id.optional(), product_id: id, product_code: z.string().trim().min(1), product_name: z.string().trim().min(1), part_number: z.string().trim().optional().nullable(), hsn_code: z.string().trim().min(1), quantity: z.coerce.number().positive(), rate: money, gst_percent: z.coerce.number().min(0).max(100), discount_percent: z.coerce.number().min(0).max(100) });
const storeSchema = z.object({ financial_year_id: id, branch_id: id, store_type: z.enum(['CASH', 'CREDIT']), bill_no: z.string().trim().min(1).max(80), entry_date: z.string().date(), vendor_id: id, details: z.array(detailSchema).min(1) });
type StoreData = z.infer<typeof storeSchema>;
type CalculatedDetail = z.infer<typeof detailSchema> & {
    base_amount: number;
    discount_amount: number;
    taxable_amount: number;
    gst_amount: number;
    total_amount: number;
};
async function calculateStore(conn: PoolConnection, data: StoreData,companyId:number) {
    const [branches] = await conn.query<RowDataPacket[]>('SELECT id FROM branches WHERE id=? AND company_id=?', [data.branch_id, companyId]);
    if (!branches[0])
        throw new Error('Selected branch does not belong to your company');
    const [financialYears] = await conn.query<RowDataPacket[]>('SELECT id FROM financial_years WHERE id=? AND company_id=? AND status="active"', [data.financial_year_id, companyId]);
    if (!financialYears[0])
        throw new Error('Selected financial year does not exist or is inactive');
    const [vendors] = await conn.query<RowDataPacket[]>('SELECT id,gstin,gst_type FROM vendors WHERE id=? AND company_id=? AND status="active"', [data.vendor_id,companyId]);
    const vendor = vendors[0];
    if (!vendor)
        throw new Error('Active vendor not found');
    const productIds=data.details.map(row=>row.product_id);if(productIds.length){const[products]=await conn.query<RowDataPacket[]>(`SELECT id FROM products WHERE company_id=? AND id IN (${productIds.map(()=>'?').join(',')})`,[companyId,...productIds]);if(products.length!==new Set(productIds).size)throw new Error('One or more products do not belong to your company')}
    const rows: CalculatedDetail[] = data.details.map(row => { const base = round(row.quantity * row.rate), discount = round(base * row.discount_percent / 100), taxable = round(base - discount), gstPercent = vendor.gst_type === 'WITH_GST' ? row.gst_percent : 0, gst = round(taxable * gstPercent / 100); return { ...row, gst_percent: gstPercent, base_amount: base, discount_amount: discount, taxable_amount: taxable, gst_amount: gst, total_amount: round(taxable + gst) }; });
    return { vendor, rows, summary: { taxable_amount: round(rows.reduce((s, r) => s + r.taxable_amount, 0)), gst_amount: round(rows.reduce((s, r) => s + r.gst_amount, 0)), discount_amount: round(rows.reduce((s, r) => s + r.discount_amount, 0)), net_amount: round(rows.reduce((s, r) => s + r.total_amount, 0)) } };
}
const storeSelect = `SELECT s.*,f.name financial_year_name,v.code vendor_code,v.name vendor_name,v.mobile vendor_mobile,
  COALESCE(pay.paid_amount,0) paid_amount,GREATEST(s.net_amount-COALESCE(pay.paid_amount,0),0) balance,
  CASE WHEN s.store_type='CASH' OR COALESCE(pay.paid_amount,0)>=s.net_amount THEN 'PAID' WHEN COALESCE(pay.paid_amount,0)>0 THEN 'PARTIALLY PAID' ELSE 'PENDING' END payment_status,
  CASE WHEN COALESCE(pay.payment_count,0)>0 THEN 1 ELSE 0 END payment_locked
  FROM store_entries s JOIN financial_years f ON f.id=s.financial_year_id JOIN vendors v ON v.id=s.vendor_id
  LEFT JOIN (SELECT a.store_entry_id,SUM(a.amount) paid_amount,COUNT(DISTINCT p.id) payment_count FROM vendor_payment_allocations a JOIN vendor_payments p ON p.id=a.vendor_payment_id AND p.is_deleted=0 GROUP BY a.store_entry_id) pay ON pay.store_entry_id=s.id`;
router.get('/stores', requirePermission('STORE_VIEW'), asyncRoute(async (req, res) => { const page = Math.max(1, Number(req.query.page) || 1), size = Math.min(100,Math.max(10,Number(req.query.pageSize)||15)), fy = Number(req.query.financial_year_id) || 0, s = `%${String(req.query.search ?? '')}%`, scope=branchScope(req,'s'); const where = `s.company_id=?${scope.sql} AND s.deleted_at IS NULL ${fy ? 'AND s.financial_year_id=?' : ''} AND (s.store_no LIKE ? OR s.bill_no LIKE ? OR v.name LIKE ? OR v.code LIKE ?)`; const params = fy ? [req.user!.company_id,...scope.params,fy, s, s, s, s] : [req.user!.company_id,...scope.params,s, s, s, s]; const count = await query<RowDataPacket & {
    total: number;
}>(`SELECT COUNT(*) total FROM store_entries s JOIN vendors v ON v.id=s.vendor_id WHERE ${where}`, params); const rows = await query<RowDataPacket & Record<string, unknown>>(`${storeSelect} WHERE ${where} ORDER BY s.id DESC LIMIT ? OFFSET ?`, [...params, size, (page - 1) * size]); res.json({ data: rows, meta: { page, pageSize: size, total: Number(count[0].total) } }); }));
router.get('/stores/:id', requirePermission('STORE_VIEW'), asyncRoute(async (req, res) => { const scope=branchScope(req,'s'); const rows = await query<RowDataPacket & Record<string, unknown>>(`${storeSelect} WHERE s.id=? AND s.company_id=?${scope.sql} AND s.deleted_at IS NULL`, [req.params.id,req.user!.company_id,...scope.params]); if (!rows[0]) {
    res.status(404).json({ message: 'Store Entry not found' });
    return;
} const details = await query<RowDataPacket & Record<string, unknown>>('SELECT * FROM store_entry_details WHERE store_entry_id=? AND is_deleted=0 ORDER BY sort_order,id', [req.params.id]); const attachments = await query<RowDataPacket & Record<string, unknown>>('SELECT id,original_name,mime_type,file_size,created_at FROM store_entry_attachments WHERE store_entry_id=? AND company_id=? AND deleted_at IS NULL ORDER BY id DESC', [req.params.id,req.user!.company_id]); res.json({ data: { ...rows[0], details, attachments } }); }));
const billUpload = multer({ storage: companyStorage('store-entries', async req => { const owner = await query<RowDataPacket>(`SELECT s.id FROM store_entries s WHERE s.id=? AND s.company_id=? AND s.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM vendor_payment_allocations a JOIN vendor_payments p ON p.id=a.vendor_payment_id AND p.is_deleted=0 WHERE a.store_entry_id=s.id)`, [req.params.id, req.user?.company_id]); if (!owner[0]) throw new Error('Store Entry not found or locked after payment'); return Number(req.user!.company_id); }), limits: { fileSize: env.maxUploadSizeMb * 1024 * 1024, files: 1 }, fileFilter: (_req, file, callback) => ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype) ? callback(null, true) : callback(new Error('Only PDF, JPG, PNG and WEBP bills are allowed')) }).single('bill');
router.post('/stores/:id/bill', requirePermission('STORE_UPDATE'), billUpload, asyncRoute(async (req, res) => { const file=req.file; if (!file) { res.status(422).json({message:'Bill file is required'}); return; } await execute('INSERT INTO store_entry_attachments(company_id,store_entry_id,original_name,stored_name,file_path,mime_type,file_size,uploaded_by) VALUES(?,?,?,?,?,?,?,?)',[req.user!.company_id,req.params.id,file.originalname,file.filename,file.path,file.mimetype,file.size,req.user!.id]); const attachments=await query<RowDataPacket&Record<string,unknown>>('SELECT id,original_name,mime_type,file_size,created_at FROM store_entry_attachments WHERE store_entry_id=? AND company_id=? AND deleted_at IS NULL ORDER BY id DESC',[req.params.id,req.user!.company_id]); res.status(201).json({data:attachments,message:'Bill uploaded'}); }));
router.get('/stores/:storeId/bill/:id/download', requirePermission('STORE_VIEW'), asyncRoute(async (req,res)=>{const rows=await query<RowDataPacket&{file_path:string;original_name:string}>('SELECT file_path,original_name FROM store_entry_attachments WHERE id=? AND store_entry_id=? AND company_id=? AND deleted_at IS NULL',[req.params.id,req.params.storeId,req.user!.company_id]);if(!rows[0]){res.status(404).json({message:'Bill not found'});return}const resolved=path.resolve(rows[0].file_path);if(!isInsideUploads(resolved)){res.status(403).json({message:'Invalid bill path'});return}res.download(resolved,rows[0].original_name)}));
router.delete('/stores/:storeId/bill/:id', requirePermission('STORE_UPDATE'), asyncRoute(async (req,res)=>{const locked=await query<RowDataPacket>('SELECT s.id FROM store_entries s WHERE s.id=? AND s.company_id=? AND s.deleted_at IS NULL AND EXISTS (SELECT 1 FROM vendor_payment_allocations a JOIN vendor_payments p ON p.id=a.vendor_payment_id AND p.is_deleted=0 WHERE a.store_entry_id=s.id)',[req.params.storeId,req.user!.company_id]);if(locked[0]){res.status(409).json({message:'Store Entry cannot be changed after payment generation'});return}const result=await execute('UPDATE store_entry_attachments SET deleted_at=NOW(),deleted_by=? WHERE id=? AND store_entry_id=? AND company_id=? AND deleted_at IS NULL',[req.user!.id,req.params.id,req.params.storeId,req.user!.company_id]);if(!result.affectedRows){res.status(404).json({message:'Bill not found'});return}res.json({message:'Bill removed'});}));
router.post('/stores', requirePermission('STORE_CREATE'), asyncRoute(async (req, res) => { const parsed = storeSchema.safeParse(req.body); if (!parsed.success) {
    res.status(422).json({ message: parsed.error.issues[0].message });
    return;
} const data = parsed.data; assertBranchAccess(req,data.branch_id); const duplicate=await query<RowDataPacket>('SELECT store_no FROM store_entries WHERE company_id=? AND branch_id=? AND vendor_id=? AND bill_no=? AND deleted_at IS NULL LIMIT 1',[req.user!.company_id,data.branch_id,data.vendor_id,data.bill_no]);if(duplicate[0]){res.status(409).json({message:`This vendor bill is already recorded as ${duplicate[0].store_no}`});return}const result = await withTransaction(async (conn) => { const companyId=Number(req.user!.company_id);const [duplicates]=await conn.query<RowDataPacket[]>('SELECT id,store_no FROM store_entries WHERE company_id=? AND branch_id=? AND vendor_id=? AND bill_no=? AND deleted_at IS NULL LIMIT 1 FOR UPDATE',[companyId,data.branch_id,data.vendor_id,data.bill_no]);if(duplicates[0])throw new Error(`This vendor bill is already recorded as ${duplicates[0].store_no}`);const calculated = await calculateStore(conn, data,companyId), no = await nextNumber(conn, 'STORE', data.financial_year_id, 'ST',companyId); const [header] = await conn.execute<ResultSetHeader>('INSERT INTO store_entries(company_id,branch_id,financial_year_id,store_no,store_type,bill_no,entry_date,vendor_id,vendor_gst_type,vendor_gstin,taxable_amount,gst_amount,discount_amount,net_amount,created_by,updated_by) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', [companyId,data.branch_id, data.financial_year_id, no, data.store_type, data.bill_no, data.entry_date, data.vendor_id, calculated.vendor.gst_type, calculated.vendor.gst_type === 'WITH_GST' ? calculated.vendor.gstin : null, calculated.summary.taxable_amount, calculated.summary.gst_amount, calculated.summary.discount_amount, calculated.summary.net_amount, req.user!.id, req.user!.id]); for (const [index, row] of calculated.rows.entries())
    { await insertDetail(conn, header.insertId, row, index + 1, req.user!.id,companyId);
    await syncSourceQuantity(conn,{companyId,branchId:data.branch_id,productId:row.product_id,desiredQuantity:row.quantity,rate:row.rate,sourceType:'STORE_ENTRY',sourceId:Number(header.insertId),referenceNo:no,userId:req.user!.id}); }
    return { id: header.insertId, store_no: no }; }); res.status(201).json({ data: result, message: `Store Entry ${result.store_no} created` }); }));
router.put('/stores/:id', requirePermission('STORE_UPDATE'), asyncRoute(async (req, res) => { const parsed = storeSchema.safeParse(req.body); if (!parsed.success) {
    res.status(422).json({ message: parsed.error.issues[0].message });
    return;
} const data = parsed.data; assertBranchAccess(req,data.branch_id); await withTransaction(async (conn) => { const companyId=Number(req.user!.company_id);const [stores] = await conn.query<RowDataPacket[]>('SELECT id,branch_id FROM store_entries WHERE id=? AND company_id=? AND deleted_at IS NULL FOR UPDATE', [req.params.id,companyId]); if (!stores[0])
    throw new Error('Store Entry not found'); const [payments] = await conn.query<RowDataPacket[]>('SELECT COUNT(*) count FROM vendor_payment_allocations a JOIN vendor_payments p ON p.id=a.vendor_payment_id AND p.is_deleted=0 WHERE a.store_entry_id=?', [req.params.id]); if (Number(payments[0].count) > 0)
    throw new Error('Store Entry cannot be edited after payment generation'); if(Number(stores[0].branch_id)!==data.branch_id){const [movements]=await conn.query<RowDataPacket[]>('SELECT id FROM stock_ledger WHERE source_type="STORE_ENTRY" AND source_id=? AND company_id=? LIMIT 1',[req.params.id,companyId]);if(movements[0])throw new Error('Branch cannot be changed after stock movement');}const[fy]=await conn.query<RowDataPacket[]>('SELECT id FROM financial_years WHERE id=? AND company_id=?',[data.financial_year_id,companyId]);if(!fy[0])throw new Error('Financial year does not belong to your company'); const calculated = await calculateStore(conn, data,companyId); await conn.execute('UPDATE store_entries SET branch_id=?,financial_year_id=?,store_type=?,bill_no=?,entry_date=?,vendor_id=?,vendor_gst_type=?,vendor_gstin=?,taxable_amount=?,gst_amount=?,discount_amount=?,net_amount=?,updated_by=? WHERE id=? AND company_id=?', [data.branch_id, data.financial_year_id, data.store_type, data.bill_no, data.entry_date, data.vendor_id, calculated.vendor.gst_type, calculated.vendor.gst_type === 'WITH_GST' ? calculated.vendor.gstin : null, calculated.summary.taxable_amount, calculated.summary.gst_amount, calculated.summary.discount_amount, calculated.summary.net_amount, req.user!.id, req.params.id,companyId]); const kept = calculated.rows.filter(r => r.id).map(r => r.id!); if (kept.length)
    await conn.query(`UPDATE store_entry_details SET is_deleted=1,deleted_at=NOW(),deleted_by=? WHERE store_entry_id=? AND is_deleted=0 AND id NOT IN (${kept.map(() => '?').join(',')})`, [req.user!.id, req.params.id, ...kept]);
else
    await conn.execute('UPDATE store_entry_details SET is_deleted=1,deleted_at=NOW(),deleted_by=? WHERE store_entry_id=? AND is_deleted=0', [req.user!.id, req.params.id]); for (const [index, row] of calculated.rows.entries()) {
    if (row.id)
        await conn.execute('UPDATE store_entry_details SET product_id=?,product_code=?,product_name=?,part_number=?,hsn_code=?,quantity=?,rate=?,gst_percent=?,discount_percent=?,base_amount=?,discount_amount=?,taxable_amount=?,gst_amount=?,total_amount=?,sort_order=?,updated_by=? WHERE id=? AND store_entry_id=?', [row.product_id, row.product_code, row.product_name, row.part_number || null, row.hsn_code, row.quantity, row.rate, row.gst_percent, row.discount_percent, row.base_amount, row.discount_amount, row.taxable_amount, row.gst_amount, row.total_amount, index + 1, req.user!.id, row.id, req.params.id]);
    else
        await insertDetail(conn, Number(req.params.id), row, index + 1, req.user!.id,companyId);
    }
    const [header] = await conn.query<RowDataPacket[]>('SELECT branch_id,store_no FROM store_entries WHERE id=? AND company_id=?',[req.params.id,companyId]);
    const [oldProducts]=await conn.query<RowDataPacket[]>('SELECT DISTINCT product_id FROM stock_ledger WHERE company_id=? AND source_type="STORE_ENTRY" AND source_id=?',[companyId,req.params.id]); const desired=new Map<number,number>(); for(const row of calculated.rows) desired.set(Number(row.product_id),Number(desired.get(Number(row.product_id))??0)+Number(row.quantity)); const products=new Set<number>([...oldProducts.map(row=>Number(row.product_id)),...desired.keys()]); for(const productId of products) await syncSourceQuantity(conn,{companyId,branchId:Number(header[0]?.branch_id ?? req.user!.branch_id),productId,desiredQuantity:Number(desired.get(productId)??0),rate:0,sourceType:'STORE_ENTRY',sourceId:Number(req.params.id),referenceNo:String(header[0]?.store_no ?? req.params.id),userId:req.user!.id});
}); res.json({ message: 'Store Entry updated' }); }));
router.delete('/stores/:id', requirePermission('STORE_DELETE'), asyncRoute(async (req, res) => { const [payments] = await query<RowDataPacket & {
    count: number;
}>('SELECT COUNT(*) count FROM vendor_payment_allocations a JOIN vendor_payments p ON p.id=a.vendor_payment_id AND p.is_deleted=0 WHERE a.store_entry_id=?', [req.params.id]); if (Number(payments.count) > 0) {
    res.status(409).json({ message: 'Store Entry cannot be deleted after payment generation' });
    return;
} const oldBeforeDelete=await query<RowDataPacket & {branch_id:number;product_id:number}>('SELECT s.branch_id,d.product_id FROM store_entries s JOIN store_entry_details d ON d.store_entry_id=s.id AND d.is_deleted=0 WHERE s.id=? AND s.company_id=?',[req.params.id,req.user!.company_id]); await withTransaction(async(conn)=>{for(const row of oldBeforeDelete)await syncSourceQuantity(conn,{companyId:Number(req.user!.company_id),branchId:Number(row.branch_id),productId:Number(row.product_id),desiredQuantity:0,rate:0,sourceType:'STORE_ENTRY',sourceId:Number(req.params.id),referenceNo:String(req.params.id),userId:req.user!.id});}); const result = await execute('UPDATE store_entries SET deleted_at=NOW(),deleted_by=? WHERE id=? AND company_id=? AND deleted_at IS NULL', [req.user!.id, req.params.id,req.user!.company_id]); if (!result.affectedRows) {
    res.status(404).json({ message: 'Store Entry not found' });
    return;
} const old=await query<RowDataPacket & {branch_id:number;product_id:number;quantity:number}>('SELECT s.branch_id,d.product_id,d.quantity FROM store_entries s JOIN store_entry_details d ON d.store_entry_id=s.id AND d.is_deleted=0 WHERE s.id=? AND s.company_id=?',[req.params.id,req.user!.company_id]); await withTransaction(async(conn)=>{for(const row of old)await syncSourceQuantity(conn,{companyId:Number(req.user!.company_id),branchId:Number(row.branch_id),productId:Number(row.product_id),desiredQuantity:0,rate:0,sourceType:'STORE_ENTRY',sourceId:Number(req.params.id),referenceNo:String(req.params.id),userId:req.user!.id});}); res.json({ message: 'Store Entry deleted' }); }));
async function insertDetail(conn: PoolConnection, storeId: number, row: CalculatedDetail, sort: number, userId: number,companyId:number) { await conn.execute('INSERT INTO store_entry_details(company_id,store_entry_id,product_id,product_code,product_name,part_number,hsn_code,quantity,rate,gst_percent,discount_percent,base_amount,discount_amount,taxable_amount,gst_amount,total_amount,sort_order,created_by,updated_by) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', [companyId,storeId, row.product_id, row.product_code, row.product_name, row.part_number || null, row.hsn_code, row.quantity, row.rate, row.gst_percent, row.discount_percent, row.base_amount, row.discount_amount, row.taxable_amount, row.gst_amount, row.total_amount, sort, userId, userId]); }

router.get('/inventory/availability', requirePermission('INVENTORY_VIEW'), asyncRoute(async (req,res)=>{
  const branchId=inventoryBranch(req,Number(req.query.branch_id)||0),search=`%${String(req.query.search??'').trim()}%`,clauses=['p.company_id=?','p.status="active"'],params:unknown[]=[req.user!.company_id];
  if(branchId&&!inventoryBranchAllowed(req,branchId)) { res.status(403).json({message:'You do not have access to this branch'}); return; }
  if(branchId) { params.unshift(branchId); }
  if(req.query.search) { clauses.push('(p.code LIKE ? OR p.name LIKE ? OR p.part_number LIKE ?)'); params.push(search,search,search); }
  const rows=await query<RowDataPacket&Record<string,unknown>>(`SELECT p.id,p.code,p.name,p.part_number,p.reorder_level,u.code uom_code,COALESCE(SUM(ib.quantity),0) current_stock FROM products p JOIN uoms u ON u.id=p.uom_id LEFT JOIN inventory_balances ib ON ib.product_id=p.id AND ib.company_id=p.company_id ${branchId?'AND ib.branch_id=?':''} WHERE ${clauses.join(' AND ')} GROUP BY p.id,u.code ORDER BY p.name`,params);
  res.json({data:rows});
}));
router.get('/inventory/ledger', requirePermission('INVENTORY_LEDGER_VIEW'), asyncRoute(async(req,res)=>{
  const branchId=inventoryBranch(req,Number(req.query.branch_id)||0),search=`%${String(req.query.search??'')}%`,clauses=['l.company_id=?'],params:unknown[]=[req.user!.company_id];
  if(branchId&&!inventoryBranchAllowed(req,branchId)) { res.status(403).json({message:'You do not have access to this branch'}); return; }
  if(branchId){clauses.push('l.branch_id=?');params.push(branchId)}
  else if(!['ADMIN','COMPANY_ADMIN','SUPER_ADMIN'].includes(String(req.user?.role))){clauses.push('1=0')}
  if(req.query.from){clauses.push('DATE(l.created_at)>=?');params.push(String(req.query.from))} if(req.query.to){clauses.push('DATE(l.created_at)<=?');params.push(String(req.query.to))} if(req.query.search){clauses.push('(p.code LIKE ? OR p.name LIKE ? OR l.reference_no LIKE ? OR l.source_type LIKE ?)');params.push(search,search,search,search)}
  const rows=await query<RowDataPacket&Record<string,unknown>>(`SELECT l.id,l.created_at,b.name branch_name,p.code product_code,p.name product_name,u.code uom_code,l.movement_type,l.quantity,l.rate,l.source_type,l.reference_no,l.remarks FROM stock_ledger l JOIN branches b ON b.id=l.branch_id JOIN products p ON p.id=l.product_id JOIN uoms u ON u.id=p.uom_id WHERE ${clauses.join(' AND ')} ORDER BY l.id DESC LIMIT 1000`,params);res.json({data:rows});
}));
router.get('/inventory/low-stock', requirePermission('INVENTORY_VIEW'), asyncRoute(async(req,res)=>{
  const branchId=inventoryBranch(req,Number(req.query.branch_id)||0),search=`%${String(req.query.search??'').trim()}%`,clauses=['p.company_id=?','p.status="active"'],params:unknown[]=[req.user!.company_id];
  if(branchId&&!inventoryBranchAllowed(req,branchId)) { res.status(403).json({message:'You do not have access to this branch'}); return; }
  if(branchId) { params.unshift(branchId); }
  if(req.query.search) { clauses.push('(p.code LIKE ? OR p.name LIKE ? OR p.part_number LIKE ?)'); params.push(search,search,search); }
  const rows=await query<RowDataPacket&Record<string,unknown>>(`SELECT p.id,p.code,p.name,p.part_number,p.reorder_level,u.code uom_code,COALESCE(SUM(ib.quantity),0) current_stock FROM products p JOIN uoms u ON u.id=p.uom_id LEFT JOIN inventory_balances ib ON ib.product_id=p.id AND ib.company_id=p.company_id ${branchId?'AND ib.branch_id=?':''} WHERE ${clauses.join(' AND ')} GROUP BY p.id,u.code HAVING current_stock=0 OR (p.reorder_level>0 AND current_stock<=p.reorder_level) ORDER BY current_stock,p.name`,params);res.json({data:rows});
}));
const paymentSchema = z.object({ financial_year_id: id, payment_date: z.string().date(), vendor_id: id, remarks: z.string().trim().max(255).optional().nullable(), allocations: z.array(z.object({ store_entry_id: id, amount: z.coerce.number().positive() })).min(1) });
router.get('/vendor-payments/credit-stores', requirePermission('VENDOR_PAYMENT_VIEW'), asyncRoute(async (req, res) => { const vendorId = Number(req.query.vendor_id), fy = Number(req.query.financial_year_id), scope=branchScope(req,'s'); if (!vendorId || !fy) {
    res.json({ data: [] });
    return;
} const rows = await query<RowDataPacket & Record<string, unknown>>(`SELECT s.id,s.store_no,s.bill_no,s.entry_date,s.net_amount,COALESCE(SUM(CASE WHEN p.is_deleted=0 THEN a.amount ELSE 0 END),0) paid_amount,GREATEST(s.net_amount-COALESCE(SUM(CASE WHEN p.is_deleted=0 THEN a.amount ELSE 0 END),0),0) balance FROM store_entries s LEFT JOIN vendor_payment_allocations a ON a.store_entry_id=s.id LEFT JOIN vendor_payments p ON p.id=a.vendor_payment_id WHERE s.company_id=?${scope.sql} AND s.deleted_at IS NULL AND s.store_type='CREDIT' AND s.vendor_id=? AND s.financial_year_id=? GROUP BY s.id HAVING balance>0 ORDER BY s.entry_date,s.id`, [req.user!.company_id,...scope.params,vendorId, fy]); res.json({ data: rows }); }));
router.get('/vendor-payments', requirePermission('VENDOR_PAYMENT_VIEW'), asyncRoute(async (req, res) => { const fy = Number(req.query.financial_year_id) || 0, s = `%${String(req.query.search ?? '')}%`; const rows = await query<RowDataPacket & Record<string, unknown>>(`SELECT p.*,v.code vendor_code,v.name vendor_name,u.full_name created_by_name,COUNT(a.id) allocation_count FROM vendor_payments p JOIN vendors v ON v.id=p.vendor_id JOIN users u ON u.id=p.created_by JOIN vendor_payment_allocations a ON a.vendor_payment_id=p.id JOIN store_entries s ON s.id=a.store_entry_id WHERE p.company_id=?${branchScope(req,'s').sql} AND p.is_deleted=0 ${fy ? 'AND p.financial_year_id=?' : ''} AND (p.payment_no LIKE ? OR v.name LIKE ? OR v.code LIKE ?) GROUP BY p.id ORDER BY p.id DESC LIMIT 200`, fy ? [req.user!.company_id,...branchScope(req,'s').params,fy, s, s, s] : [req.user!.company_id,...branchScope(req,'s').params,s, s, s]); res.json({ data: rows }); }));
router.post('/vendor-payments', requirePermission('VENDOR_PAYMENT_CREATE'), asyncRoute(async (req, res) => { const parsed = paymentSchema.safeParse(req.body); if (!parsed.success) {
    res.status(422).json({ message: parsed.error.issues[0].message });
    return;
} const data = parsed.data; if (new Set(data.allocations.map(a => a.store_entry_id)).size !== data.allocations.length) {
    res.status(422).json({ message: 'Duplicate Store Entry allocation' });
    return;
} const result = await withTransaction(async (conn) => { const companyId=Number(req.user!.company_id);let total = 0; for (const allocation of data.allocations) {
    const [stores] = await conn.query<RowDataPacket[]>('SELECT * FROM store_entries WHERE id=? AND company_id=? AND deleted_at IS NULL FOR UPDATE', [allocation.store_entry_id,companyId]);
    const store = stores[0];
    if (!store || store.store_type !== 'CREDIT' || Number(store.vendor_id) !== data.vendor_id || Number(store.financial_year_id) !== data.financial_year_id)
        throw new Error('Invalid CREDIT Store Entry selected');
    const [paidRows] = await conn.query<RowDataPacket[]>('SELECT COALESCE(SUM(a.amount),0) paid FROM vendor_payment_allocations a JOIN vendor_payments p ON p.id=a.vendor_payment_id AND p.is_deleted=0 WHERE a.store_entry_id=?', [allocation.store_entry_id]);
    const balance = round(Number(store.net_amount) - Number(paidRows[0].paid));
    if (allocation.amount > balance)
        throw new Error(`Payment exceeds balance for ${store.store_no}`);
    total = round(total + allocation.amount);
} const no = await nextNumber(conn, 'VENDOR_PAYMENT', data.financial_year_id, 'VP',companyId); const [header] = await conn.execute<ResultSetHeader>('INSERT INTO vendor_payments(company_id,financial_year_id,payment_no,payment_date,vendor_id,total_amount,remarks,created_by) VALUES(?,?,?,?,?,?,?,?)', [companyId,data.financial_year_id, no, data.payment_date, data.vendor_id, total, data.remarks || null, req.user!.id]); for (const allocation of data.allocations)
    await conn.execute('INSERT INTO vendor_payment_allocations(company_id,vendor_payment_id,store_entry_id,amount) VALUES(?,?,?,?)', [companyId,header.insertId, allocation.store_entry_id, allocation.amount]); return { payment_no: no, total_amount: total }; }); res.status(201).json({ data: result, message: `Vendor Payment ${result.payment_no} created` }); }));
router.delete('/vendor-payments/:id', requirePermission('VENDOR_PAYMENT_DELETE'), asyncRoute(async (req, res) => { const result = await execute('UPDATE vendor_payments SET is_deleted=1,deleted_at=NOW(),deleted_by=? WHERE id=? AND company_id=? AND is_deleted=0', [req.user!.id, req.params.id,req.user!.company_id]); if (!result.affectedRows) {
    res.status(404).json({ message: 'Vendor Payment not found' });
    return;
} res.json({ message: 'Vendor Payment deleted' }); }));
router.get('/reports/vendor-outstanding', requirePermission('OUTSTANDING_VIEW'), asyncRoute(async (req, res) => { const fy = Number(req.query.financial_year_id) || 0, from = String(req.query.from ?? ''), to = String(req.query.to ?? ''); const clauses = ['s.company_id=?','s.deleted_at IS NULL', 's.store_type="CREDIT"']; const params: (string | number)[] = [Number(req.user!.company_id)]; if (fy) {
    clauses.push('s.financial_year_id=?');
    params.push(fy);
} if (from) {
    clauses.push('s.entry_date>=?');
    params.push(from);
} if (to) {
    clauses.push('s.entry_date<=?');
    params.push(to);
} const rows = await query<RowDataPacket & Record<string, unknown>>(`SELECT v.id vendor_id,v.code vendor_code,v.name vendor_name,v.gst_type,v.gstin,COUNT(s.id) bill_count,ROUND(SUM(s.net_amount),2) credit_amount,ROUND(SUM(COALESCE(pay.paid_amount,0)),2) paid_amount,ROUND(SUM(GREATEST(s.net_amount-COALESCE(pay.paid_amount,0),0)),2) outstanding_amount FROM store_entries s JOIN vendors v ON v.id=s.vendor_id LEFT JOIN (SELECT a.store_entry_id,SUM(a.amount) paid_amount FROM vendor_payment_allocations a JOIN vendor_payments p ON p.id=a.vendor_payment_id AND p.is_deleted=0 GROUP BY a.store_entry_id) pay ON pay.store_entry_id=s.id WHERE ${clauses.join(' AND ')} GROUP BY v.id ORDER BY v.name`, params); const summary = rows.reduce((a, r) => ({ credit_amount: round(a.credit_amount + Number(r.credit_amount)), paid_amount: round(a.paid_amount + Number(r.paid_amount)), outstanding_amount: round(a.outstanding_amount + Number(r.outstanding_amount)) }), { credit_amount: 0, paid_amount: 0, outstanding_amount: 0 }); res.json({ data: rows, summary }); }));
export default router;
