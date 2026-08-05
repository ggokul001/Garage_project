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
  const cfg: MasterConfig = masterConfigs[req.params.master as MasterName];
  const rows = await query<RowDataPacket & Record<string, unknown>>(
    `SELECT ${cfg.select} FROM ${cfg.table} m ${cfg.joins ?? ''} WHERE m.status='active' ORDER BY ${cfg.orderBy ?? 'm.id'} LIMIT 1000`
  );
  res.json({ data: rows });
}));

router.get('/:master', requireMasterAction('VIEW'), asyncRoute(async (req, res) => {
  const cfg: MasterConfig = masterConfigs[req.params.master as MasterName];
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(100, Math.max(5, Number(req.query.pageSize) || 15));
  const search = String(req.query.search ?? '').trim();
  const where = search ? `WHERE (${cfg.search.map((column) => `${column} LIKE ?`).join(' OR ')})` : '';
  const params = search ? cfg.search.map(() => `%${search}%`) : [];
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
  const cfg: MasterConfig = masterConfigs[req.params.master as MasterName];
  const rows = await query<RowDataPacket & Record<string, unknown>>(
    `SELECT ${cfg.select} FROM ${cfg.table} m ${cfg.joins ?? ''} WHERE m.id=?`, [req.params.id]
  );
  if (!rows[0]) { res.status(404).json({ message: 'Record not found' }); return; }
  res.json({ data: rows[0] });
}));

router.post('/:master', requireMasterAction('CREATE'), asyncRoute(async (req, res) => {
  const master=req.params.master as MasterName,cfg: MasterConfig = masterConfigs[master];
  const prefix=codePrefix[master];
  const preview=cfg.schema.safeParse({...req.body,...(prefix&&cfg.columns.includes('code')?{code:`${prefix}-00000`}:{})});
  if(!preview.success){res.status(422).json({message:preview.error.issues[0]?.message,errors:preview.error.flatten().fieldErrors});return}
  const created:any=await withTransaction(async connection=>{
    let generatedCode: string|undefined;
    if(prefix&&cfg.columns.includes('code')){
      await connection.execute('INSERT IGNORE INTO master_code_sequences(master_name,last_number) VALUES(?,0)',[master]);
      const [sequences]=await connection.query<RowDataPacket[]>('SELECT last_number FROM master_code_sequences WHERE master_name=? FOR UPDATE',[master]);
      let next=Number(sequences[0]?.last_number??0)+1;
      while(true){generatedCode=`${prefix}-${String(next).padStart(5,'0')}`;const[found]=await connection.query<RowDataPacket[]>(`SELECT id FROM ${cfg.table} WHERE code=? LIMIT 1`,[generatedCode]);if(!found[0])break;next++}
      await connection.execute('UPDATE master_code_sequences SET last_number=? WHERE master_name=?',[next,master]);
    }
    const parsed = cfg.schema.safeParse({...req.body,...(generatedCode?{code:generatedCode}:{})});
    if (!parsed.success) throw parsed.error;
    const data = parsed.data as Record<string, unknown>;
    if (master === 'financial-years' && data.is_current) await connection.execute('UPDATE financial_years SET is_current=0');
    const values = cfg.columns.map((column) => data[column] ?? null);
    const [result]=await connection.execute<ResultSetHeader>(`INSERT INTO ${cfg.table} (${cfg.columns.join(',')}) VALUES (${cfg.columns.map(() => '?').join(',')})`, values as never[]);
    const [rows]=await connection.query<RowDataPacket[]>(`SELECT ${cfg.select} FROM ${cfg.table} m ${cfg.joins ?? ''} WHERE m.id=?`, [result.insertId]);
    return {data:rows[0] as Record<string,unknown>};
  });
  res.status(201).json({ data: created.data, message: 'Created successfully' });
}));

router.put('/:master/:id', requireMasterAction('UPDATE'), asyncRoute(async (req, res) => {
  const cfg: MasterConfig = masterConfigs[req.params.master as MasterName];
  const before=await query<RowDataPacket&Record<string,unknown>>(`SELECT m.* FROM ${cfg.table} m WHERE m.id=?`,[req.params.id]);
  if(!before[0]){res.status(404).json({message:'Record not found'});return}
  res.locals.auditBefore=before[0];
  const parsed = cfg.schema.safeParse({...req.body,...(cfg.columns.includes('code')?{code:before[0].code}:{})});
  if (!parsed.success) { res.status(422).json({ message: parsed.error.issues[0]?.message, errors: parsed.error.flatten().fieldErrors }); return; }
  const data = parsed.data as Record<string, unknown>;
  if (req.params.master === 'financial-years' && data.is_current) await execute('UPDATE financial_years SET is_current=0 WHERE id<>?',[req.params.id]);
  const values = cfg.columns.map((column) => data[column] ?? null);
  const result = await execute(`UPDATE ${cfg.table} SET ${cfg.columns.map((column) => `${column}=?`).join(',')} WHERE id=?`, [...values, req.params.id]);
  if (!result.affectedRows) { res.status(404).json({ message: 'Record not found' }); return; }
  res.json({ message: 'Updated successfully' });
}));

router.delete('/:master/:id', requireMasterAction('DELETE'), asyncRoute(async (req, res) => {
  const cfg: MasterConfig = masterConfigs[req.params.master as MasterName];
  const before=await query<RowDataPacket&Record<string,unknown>>(`SELECT m.* FROM ${cfg.table} m WHERE m.id=?`,[req.params.id]);
  if(before[0])res.locals.auditBefore=before[0];
  const result = await execute(`DELETE FROM ${cfg.table} WHERE id=?`, [req.params.id]);
  if (!result.affectedRows) { res.status(404).json({ message: 'Record not found' }); return; }
  res.json({ message: 'Deleted successfully' });
}));

export default router;
