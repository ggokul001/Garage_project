import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { RowDataPacket } from 'mysql2';
import { env } from '../config/env';
import { execute, query } from '../config/db';

type TokenPayload = { sub: number };

export async function getPermissions(userId: number): Promise<string[]> {
  const roleRows = await query<RowDataPacket & { code: string }>(
    'SELECT r.code FROM users u JOIN roles r ON r.id=u.role_id WHERE u.id=?', [userId]
  );
  if (roleRows[0]?.code === 'ADMIN' || roleRows[0]?.code === 'COMPANY_ADMIN' || roleRows[0]?.code === 'SUPER_ADMIN') {
    const all = await query<RowDataPacket & { code: string }>('SELECT code FROM permissions ORDER BY code');
    return all.map((row) => row.code);
  }
  const rows = await query<RowDataPacket & { code: string }>(
    `SELECT DISTINCT p.code FROM permissions p
     JOIN role_permissions rp ON rp.permission_id=p.id
     JOIN users u ON u.role_id=rp.role_id
     WHERE u.id=? AND NOT EXISTS (
       SELECT 1 FROM user_permission_overrides o WHERE o.user_id=u.id AND o.permission_id=p.id AND o.allowed=0
     )
     UNION
     SELECT p.code FROM permissions p JOIN user_permission_overrides o ON o.permission_id=p.id
     WHERE o.user_id=? AND o.allowed=1`, [userId,userId]
  );
  return rows.map((row) => row.code);
}

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : '';
    if (!token) return res.status(401).json({ message: 'Authentication required' });
    const payload = jwt.verify(token, env.jwtSecret) as unknown as TokenPayload;
    const users = await query<RowDataPacket & { id:number; username:string; role_code:string; status:string; company_id:number|null; branch_id:number|null; company_status:string|null; account_type:string|null; trial_ends_at:string|null }>(
      `SELECT u.id,u.username,u.status,u.company_id,u.branch_id,r.code role_code,c.status company_status,c.account_type,c.trial_ends_at
       FROM users u JOIN roles r ON r.id=u.role_id LEFT JOIN companies c ON c.id=u.company_id WHERE u.id=?`, [payload.sub]
    );
    if (!users[0] || users[0].status !== 'active') return res.status(401).json({ message: 'Session is no longer active' });
    const user=users[0],isSuperAdmin=user.role_code==='SUPER_ADMIN';
    if(!isSuperAdmin){
      if(!user.company_id)return res.status(403).json({message:'Your user is not assigned to a company'});
      const trialExpired=user.account_type==='TRIAL'&&!!user.trial_ends_at&&new Date(user.trial_ends_at).getTime()<=Date.now();
      if(trialExpired&&user.company_status==='active'){const changed=await execute('UPDATE companies SET status="inactive",inactive_at=NOW(),inactive_reason="Trial period expired" WHERE id=? AND status="active"',[user.company_id]);if(changed.affectedRows)await execute('INSERT INTO company_status_history(company_id,old_status,new_status,reason)VALUES(?,"active","inactive","Trial period expired")',[user.company_id])}
      if(trialExpired)return res.status(403).json({code:'TRIAL_EXPIRED',message:'Your trial period has expired. Please contact the administrator to activate your account.',details:{trial_ends_at:user.trial_ends_at}});
      if(user.company_status!=='active')return res.status(403).json({code:'COMPANY_INACTIVE',message:'Your company account is inactive. Please contact the administrator.'});
    }
    const branchRows=isSuperAdmin||['ADMIN'].includes(user.role_code)?[]:await query<RowDataPacket & {branch_id:number}>('SELECT branch_id FROM user_branch_access WHERE user_id=? AND company_id=?',[user.id,user.company_id]);
    const branchIds=branchRows.map(row=>Number(row.branch_id));
    if(!branchIds.length&&!isSuperAdmin&&!['ADMIN'].includes(user.role_code)&&user.branch_id)branchIds.push(Number(user.branch_id));
    req.user = { id: user.id, username: user.username, role: user.role_code, permissions: await getPermissions(user.id), company_id:user.company_id, branch_id:user.branch_id??null, branch_ids:branchIds, is_super_admin:isSuperAdmin };
    next();
  } catch { return res.status(401).json({ message: 'Invalid or expired session' }); }
}

export const requirePermission = (code: string) => (req: Request, res: Response, next: NextFunction) =>
  req.user?.permissions.includes(code) ? next() : res.status(403).json({ message: 'You do not have permission for this action' });

export const requireSuperAdmin = (req:Request,res:Response,next:NextFunction) =>
  req.user?.is_super_admin ? next() : res.status(403).json({message:'Super Administrator access required'});
