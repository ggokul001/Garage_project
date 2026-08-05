import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { RowDataPacket } from 'mysql2';
import { env } from '../config/env';
import { query } from '../config/db';

type TokenPayload = { sub: number; role: string };

export async function getPermissions(userId: number): Promise<string[]> {
  const roleRows = await query<RowDataPacket & { code: string }>(
    'SELECT r.code FROM users u JOIN roles r ON r.id=u.role_id WHERE u.id=?', [userId]
  );
  if (roleRows[0]?.code === 'ADMIN') {
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
    const users = await query<RowDataPacket & { id:number; username:string; role_code:string; status:string }>(
      'SELECT u.id,u.username,u.status,r.code role_code FROM users u JOIN roles r ON r.id=u.role_id WHERE u.id=?', [payload.sub]
    );
    if (!users[0] || users[0].status !== 'active') return res.status(401).json({ message: 'Session is no longer active' });
    req.user = { id: users[0].id, username: users[0].username, role: users[0].role_code, permissions: await getPermissions(users[0].id) };
    next();
  } catch { return res.status(401).json({ message: 'Invalid or expired session' }); }
}

export const requirePermission = (code: string) => (req: Request, res: Response, next: NextFunction) =>
  req.user?.permissions.includes(code) ? next() : res.status(403).json({ message: 'You do not have permission for this action' });
