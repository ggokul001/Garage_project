import { Router, Request, Response, NextFunction } from 'express';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { execute, query, withTransaction } from '../config/db';
import { masterConfigs, MasterConfig, MasterName } from './config';
import { authenticate } from '../middleware/auth';

const router = Router();
const isMaster = (value: string): value is MasterName => value in masterConfigs;
const asyncRoute = (handler: (req: Request, res: Response) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => handler(req, res).catch(next);
const permissionPrefix: Record<MasterName,string> = { companies:'COMPANY',branches:'BRANCH',departments:'DEPARTMENT',designations:'DESIGNATION',employees:'EMPLOYEE',customers:'CUSTOMER',vendors:'VENDOR',vehicles:'VEHICLE',uoms:'UOM',products:'PRODUCT','work-pending-sub-statuses':'PENDING_STATUS','financial-years':'FY',shifts:'SHIFT' };
const codePrefix:Partial<Record<MasterName,string>>={companies:'COM',branches:'BRA',departments:'DEP',designations:'DES',employees:'EMP',customers:'CUS',vendors:'VEN',uoms:'UOM',products:'PRD','work-pending-sub-statuses':'PST','financial-years':'FY',shifts:'SHF'};
const tenantMaster=(master:MasterName)=>master!=='companies';
async function validateLinks(master:MasterName,data:Record<string,unknown>,companyId:number){
  const links:Partial<Record<MasterName,Array<[string,string]>>>={
    employees:[['branch_id','branches'],['department_id','departments'],['designation_id','designations']],
    vehicles:[['customer_id','customers']],products:[['uom_id','uoms']],branches:[['company_id','companies']],departments:[['company_id','companies']],
  };
  for(const[field,table]of links[master]??[]){const value=data[field];if(!value)continue;const scope=table==='companies'?'id=?':'id=? AND company_id=?';const params=table==='companies'?[companyId]:[value,companyId];const rows=await query<RowDataPacket>(`SELECT id FROM ${table} WHERE ${scope}`,params);if(!rows[0])throw new Error(`Invalid ${field.replace('_id','')} for this company`)}
}
const requireMasterAction = (action:'VIEW'|'CREATE'|'UPDATE'|'DELETE') => (req:Request,res:Response,next:NextFunction) => {
  const code=`${permissionPrefix[req.params.master as MasterName]}_${action}`;
  return req.user?.permissions.includes(code) ? next() : res.status(403).json({message:'You do not have permission for this action'});
};

router.use(authenticate);

router.param('master', (req, res, next, value) => {
  if (!isMaster(value)) return res.status(404).json({ message: 'Master not found' });
  next();
});

router.get('/:master/options', requireMasterAction('VIEW'), asyncRoute(async (req, res) => {
  const master=req.params.master as MasterName,cfg: MasterConfig = masterConfigs[master];
  if(master==='companies'){res.json({data:req.user!.company_id?await query('SELECT * FROM companies WHERE id=?',[req.user!.company_id]):[]});return}
  const rows = await query<RowDataPacket & Record<string, unknown>>(
    `SELECT ${cfg.select} FROM ${cfg.table} m ${cfg.joins ?? ''} WHERE m.company_id=? AND m.status='active' ORDER BY ${cfg.orderBy ?? 'm.id'} LIMIT 1000`,[req.user!.company_id]
  );
  res.json({ data: rows });
}));

router.get('/:master', requireMasterAction('VIEW'), asyncRoute(async (req, res) => {
  const master=req.params.master as MasterName,cfg: MasterConfig = masterConfigs[master];
  if(master==='companies'&&!req.user!.is_super_admin){const rows=await query<RowDataPacket&Record<string,unknown>>('SELECT * FROM companies WHERE id=?',[req.user!.company_id]);res.json({data:rows,meta:{page:1,pageSize:1,total:rows.length}});return}
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(100, Math.max(5, Number(req.query.pageSize) || 15));
  const search = String(req.query.search ?? '').trim();
  const clauses:string[]=[];const params:unknown[]=[];if(tenantMaster(master)){clauses.push('m.company_id=?');params.push(req.user!.company_id)}
  if(search){clauses.push(`(${cfg.search.map((column) => `${column} LIKE ?`).join(' OR ')})`);params.push(...cfg.search.map(() => `%${search}%`))}
  const where=clauses.length?`WHERE ${clauses.join(' AND ')}`:'';
  const count = await query<RowDataPacket & { total: number }>(
    `SELECT COUNT(*) total FROM ${cfg.table} m ${cfg.joins ?? ''} ${where}`,
    params
  );
  const rows = await query<RowDataPacket & Record<string, unknown>>(
    `SELECT ${cfg.select} FROM ${cfg.table} m ${cfg.joins ?? ''} ${where} ORDER BY ${cfg.orderBy ?? 'm.id'} LIMIT ? OFFSET ?`,
    [...params, pageSize, (page - 1) * pageSize]
  );
  res.json({ data: rows, meta: { page, pageSize, total: Number(count[0]?.total ?? 0) } });
}));

router.get('/:master/:id', requireMasterAction('VIEW'), asyncRoute(async (req, res) => {
  const master=req.params.master as MasterName,cfg: MasterConfig = masterConfigs[master];
  if(master==='companies'&&!req.user!.is_super_admin&&Number(req.params.id)!==req.user!.company_id){res.status(404).json({message:'Record not found'});return}
  const rows = await query<RowDataPacket & Record<string, unknown>>(
    `SELECT ${cfg.select} FROM ${cfg.table} m ${cfg.joins ?? ''} WHERE m.id=? ${tenantMaster(master)?'AND m.company_id=?':''}`, tenantMaster(master)?[req.params.id,req.user!.company_id]:[req.params.id]
  );
  if (!rows[0]) { res.status(404).json({ message: 'Record not found' }); return; }
  res.json({ data: rows[0] });
}));

router.post('/:master', requireMasterAction('CREATE'), asyncRoute(async (req, res) => {
  const master=req.params.master as MasterName,cfg: MasterConfig = masterConfigs[master];
  if(master==='companies'){res.status(403).json({message:'Use Super Administrator company management'});return}
  if(master==='branches'){const limits=await query<RowDataPacket&{max_branches:number|null;used:number}>('SELECT c.max_branches,(SELECT COUNT(*) FROM branches WHERE company_id=c.id) used FROM companies c WHERE c.id=?',[req.user!.company_id]);if(limits[0]?.max_branches&&Number(limits[0].used)>=Number(limits[0].max_branches)){res.status(409).json({message:'Company branch limit reached'});return}}
  const prefix=codePrefix[master];
  const tenantBody={...req.body,...(['branches','departments'].includes(master)?{company_id:req.user!.company_id}:{})};
  const preview=cfg.schema.safeParse({...tenantBody,...(prefix&&cfg.columns.includes('code')?{code:`${prefix}-00000`}:{})});
  if(!preview.success){res.status(422).json({message:preview.error.issues[0]?.message,errors:preview.error.flatten().fieldErrors});return}
  const created:any=await withTransaction(async connection=>{
    let generatedCode: string|undefined;
    if(prefix&&cfg.columns.includes('code')){
      await connection.execute('INSERT IGNORE INTO master_code_sequences(master_name,company_id,last_number) VALUES(?,?,0)',[master,req.user!.company_id]);
      const [sequences]=await connection.query<RowDataPacket[]>('SELECT last_number FROM master_code_sequences WHERE master_name=? AND company_id=? FOR UPDATE',[master,req.user!.company_id]);
      let next=Number(sequences[0]?.last_number??0)+1;
      while(true){generatedCode=`${prefix}-${String(next).padStart(5,'0')}`;const[found]=await connection.query<RowDataPacket[]>(`SELECT id FROM ${cfg.table} WHERE company_id=? AND code=? LIMIT 1`,[req.user!.company_id,generatedCode]);if(!found[0])break;next++}
      await connection.execute('UPDATE master_code_sequences SET last_number=? WHERE master_name=? AND company_id=?',[next,master,req.user!.company_id]);
    }
    const parsed = cfg.schema.safeParse({...tenantBody,...(generatedCode?{code:generatedCode}:{})});
    if (!parsed.success) throw parsed.error;
    const data = parsed.data as Record<string, unknown>;
    await validateLinks(master,data,Number(req.user!.company_id));
    if (master === 'financial-years' && data.is_current) await connection.execute('UPDATE financial_years SET is_current=0 WHERE company_id=?',[req.user!.company_id]);
    const insertColumns=cfg.columns.filter(column=>column!=='company_id'),values = insertColumns.map((column) => data[column] ?? null);
    const [result]=await connection.execute<ResultSetHeader>(`INSERT INTO ${cfg.table} (company_id,${insertColumns.join(',')}) VALUES (?,${insertColumns.map(() => '?').join(',')})`, [req.user!.company_id,...values] as never[]);
    const [rows]=await connection.query<RowDataPacket[]>(`SELECT ${cfg.select} FROM ${cfg.table} m ${cfg.joins ?? ''} WHERE m.id=? AND m.company_id=?`, [result.insertId,req.user!.company_id]);
    return {data:rows[0] as Record<string,unknown>};
  });
  res.status(201).json({ data: created.data, message: 'Created successfully' });
}));

router.put('/:master/:id', requireMasterAction('UPDATE'), asyncRoute(async (req, res) => {
  const master=req.params.master as MasterName,cfg: MasterConfig = masterConfigs[master];
  if(master==='companies'){res.status(403).json({message:'Use Super Administrator company management'});return}
  const before=await query<RowDataPacket&Record<string,unknown>>(`SELECT m.* FROM ${cfg.table} m WHERE m.id=? AND m.company_id=?`,[req.params.id,req.user!.company_id]);
  if(!before[0]){res.status(404).json({message:'Record not found'});return}
  res.locals.auditBefore=before[0];
  const parsed = cfg.schema.safeParse({...req.body,...(['branches','departments'].includes(master)?{company_id:req.user!.company_id}:{}),...(cfg.columns.includes('code')?{code:before[0].code}:{})});
  if (!parsed.success) { res.status(422).json({ message: parsed.error.issues[0]?.message, errors: parsed.error.flatten().fieldErrors }); return; }
  const data = parsed.data as Record<string, unknown>;
  await validateLinks(master,data,Number(req.user!.company_id));
  if (master === 'financial-years' && data.is_current) await execute('UPDATE financial_years SET is_current=0 WHERE id<>? AND company_id=?',[req.params.id,req.user!.company_id]);
  const values = cfg.columns.map((column) => data[column] ?? null);
  const result = await execute(`UPDATE ${cfg.table} SET ${cfg.columns.map((column) => `${column}=?`).join(',')} WHERE id=? AND company_id=?`, [...values, req.params.id,req.user!.company_id]);
  if (!result.affectedRows) { res.status(404).json({ message: 'Record not found' }); return; }
  res.json({ message: 'Updated successfully' });
}));

router.delete('/:master/:id', requireMasterAction('DELETE'), asyncRoute(async (req, res) => {
  const master=req.params.master as MasterName,cfg: MasterConfig = masterConfigs[master];
  if(master==='companies'){res.status(403).json({message:'Use Super Administrator company management'});return}
  const before=await query<RowDataPacket&Record<string,unknown>>(`SELECT m.* FROM ${cfg.table} m WHERE m.id=? AND m.company_id=?`,[req.params.id,req.user!.company_id]);
  if(before[0])res.locals.auditBefore=before[0];
  const result = await execute(`DELETE FROM ${cfg.table} WHERE id=? AND company_id=?`, [req.params.id,req.user!.company_id]);
  if (!result.affectedRows) { res.status(404).json({ message: 'Record not found' }); return; }
  res.json({ message: 'Deleted successfully' });
}));

export default router;
