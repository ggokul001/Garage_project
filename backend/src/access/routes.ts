import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { RowDataPacket } from 'mysql2';
import { z } from 'zod';
import { execute, query } from '../config/db';
import { env } from '../config/env';
import { authenticate, getPermissions, requirePermission } from '../middleware/auth';

const router=Router();
const asyncRoute=(fn:(req:Request,res:Response)=>Promise<void>)=>(req:Request,res:Response,next:NextFunction)=>fn(req,res).catch(next);

async function userDetails(id:number){
  const rows=await query<RowDataPacket & Record<string,unknown>>(`SELECT u.id,u.username,u.email,u.full_name,u.role_id,u.branch_id,u.company_id,u.status,u.must_change_password,u.last_login_at,r.code role_code,r.name role_name,b.name branch_name,c.name company_name,c.account_type,c.trial_ends_at FROM users u JOIN roles r ON r.id=u.role_id LEFT JOIN branches b ON b.id=u.branch_id LEFT JOIN companies c ON c.id=u.company_id WHERE u.id=?`,[id]);
  if(!rows[0]) return null;
  return {...rows[0],permissions:await getPermissions(id)};
}

router.post('/auth/login',asyncRoute(async(req,res)=>{
  const parsed=z.object({login:z.string().trim().min(1),password:z.string().min(1)}).safeParse(req.body);
  if(!parsed.success){res.status(422).json({message:'Username and password are required'});return;}
  const rows=await query<RowDataPacket & {id:number;password_hash:string;status:string;role_code:string;company_id:number|null;company_status:string|null;account_type:string|null;trial_ends_at:string|null}>(`SELECT u.id,u.password_hash,u.status,u.company_id,r.code role_code,c.status company_status,c.account_type,c.trial_ends_at FROM users u JOIN roles r ON r.id=u.role_id LEFT JOIN companies c ON c.id=u.company_id WHERE u.username=? OR u.email=? LIMIT 1`,[parsed.data.login,parsed.data.login]);
  const found=rows[0];
  if(!found||found.status!=='active'||!(await bcrypt.compare(parsed.data.password,found.password_hash))){res.status(401).json({message:'Invalid username/email or password'});return;}
  if(found.role_code!=='SUPER_ADMIN'){
    const expired=found.account_type==='TRIAL'&&!!found.trial_ends_at&&new Date(found.trial_ends_at).getTime()<=Date.now();
    if(expired&&found.company_id){const changed=await execute('UPDATE companies SET status="inactive",inactive_at=NOW(),inactive_reason="Trial period expired" WHERE id=? AND status="active"',[found.company_id]);if(changed.affectedRows)await execute('INSERT INTO company_status_history(company_id,old_status,new_status,reason)VALUES(?,"active","inactive","Trial period expired")',[found.company_id])}
    if(expired){res.status(403).json({message:'Your trial period has expired. Please contact the administrator to activate your account.'});return}
    if(found.company_status!=='active'){res.status(403).json({message:'Your company account is inactive. Please contact the administrator.'});return}
  }
  await execute('UPDATE users SET last_login_at=NOW() WHERE id=?',[found.id]);
  const token=jwt.sign({sub:found.id,role:found.role_code},env.jwtSecret,{expiresIn:env.jwtAccessExpires as jwt.SignOptions['expiresIn']});
  res.json({data:{token,user:await userDetails(found.id)}});
}));
router.get('/auth/me',authenticate,asyncRoute(async(req,res)=>{res.json({data:await userDetails(req.user!.id)});}));
router.post('/auth/change-password',authenticate,asyncRoute(async(req,res)=>{
  const parsed=z.object({currentPassword:z.string().min(1),newPassword:z.string().min(8)}).safeParse(req.body);
  if(!parsed.success){res.status(422).json({message:'New password must contain at least 8 characters'});return;}
  const rows=await query<RowDataPacket & {password_hash:string}>('SELECT password_hash FROM users WHERE id=?',[req.user!.id]);
  if(!(await bcrypt.compare(parsed.data.currentPassword,rows[0].password_hash))){res.status(422).json({message:'Current password is incorrect'});return;}
  await execute('UPDATE users SET password_hash=?,must_change_password=0 WHERE id=?',[await bcrypt.hash(parsed.data.newPassword,12),req.user!.id]);
  res.json({message:'Password changed successfully'});
}));

router.get('/navigation',authenticate,asyncRoute(async(req,res)=>{
  if(req.user!.is_super_admin){res.json({data:[{id:-1,parent_id:null,title:'Companies',route:'/super-admin/companies',icon:'Building2',permission_code:null,sort_order:1,children:[]}]});return}
  const rows=await query<RowDataPacket & Record<string,unknown>>(`SELECT id,parent_id,title,route,icon,permission_code,sort_order FROM navigation_items WHERE status='active' ORDER BY sort_order,title`);
  const allowed=rows.filter(row=>!row.permission_code||req.user!.permissions.includes(String(row.permission_code))) as Array<Record<string, any>>;
  const parents: Array<Record<string, any>>=allowed.filter(row=>!row.parent_id).map(parent=>({...parent,children:allowed.filter(row=>Number(row.parent_id)===Number(parent.id))}));
  res.json({data:parents.filter(parent=>parent.route||parent.children.length)});
}));

router.get('/permissions',authenticate,requirePermission('PERMISSION_VIEW'),asyncRoute(async(_req,res)=>{
  res.json({data:await query<RowDataPacket & Record<string,unknown>>('SELECT * FROM permissions ORDER BY module,name')});
}));

router.get('/roles',authenticate,requirePermission('ROLE_VIEW'),asyncRoute(async(_req,res)=>{
  const req=_req;const roles=await query<RowDataPacket & Record<string,unknown>>(`SELECT r.*,COUNT(rp.permission_id) permission_count FROM roles r LEFT JOIN role_permissions rp ON rp.role_id=r.id WHERE r.company_id=? OR (r.company_id IS NULL AND r.code IN ('ADMIN','USER','COMPANY_ADMIN')) GROUP BY r.id ORDER BY r.name`,[req.user!.company_id]);
  const mappings=await query<RowDataPacket & {role_id:number;permission_id:number}>('SELECT role_id,permission_id FROM role_permissions');
  res.json({data:roles.map(role=>({...role,permission_ids:mappings.filter(m=>Number(m.role_id)===Number(role.id)).map(m=>m.permission_id)}))});
}));
const roleSchema=z.object({name:z.string().trim().min(2),description:z.string().trim().nullish(),status:z.enum(['active','inactive']),permission_ids:z.array(z.coerce.number().int().positive()).default([])});
router.post('/roles',authenticate,requirePermission('ROLE_CREATE'),asyncRoute(async(req,res)=>{
  const parsed=roleSchema.safeParse(req.body);if(!parsed.success){res.status(422).json({message:parsed.error.issues[0].message});return;}
  const code=parsed.data.name.toUpperCase().replace(/[^A-Z0-9]+/g,'_').replace(/^_|_$/g,'');
  const result=await execute('INSERT INTO roles(company_id,code,name,description,status) VALUES(?,?,?,?,?)',[req.user!.company_id,`${code}_${req.user!.company_id}`,parsed.data.name,parsed.data.description||null,parsed.data.status]);
  for(const permissionId of parsed.data.permission_ids) await execute('INSERT INTO role_permissions(role_id,permission_id) VALUES(?,?)',[result.insertId,permissionId]);
  res.status(201).json({message:'Role created'});
}));
router.put('/roles/:id',authenticate,requirePermission('ROLE_UPDATE'),asyncRoute(async(req,res)=>{
  const parsed=roleSchema.safeParse(req.body);if(!parsed.success){res.status(422).json({message:parsed.error.issues[0].message});return;}
  const owned=await query<RowDataPacket>('SELECT id FROM roles WHERE id=? AND company_id=?',[req.params.id,req.user!.company_id]);if(!owned[0]){res.status(404).json({message:'Company role not found'});return}await execute('UPDATE roles SET name=?,description=?,status=? WHERE id=? AND company_id=?',[parsed.data.name,parsed.data.description||null,parsed.data.status,req.params.id,req.user!.company_id]);
  await execute('DELETE FROM role_permissions WHERE role_id=?',[req.params.id]);
  for(const permissionId of parsed.data.permission_ids) await execute('INSERT INTO role_permissions(role_id,permission_id) VALUES(?,?)',[req.params.id,permissionId]);
  res.json({message:'Role updated'});
}));
router.delete('/roles/:id',authenticate,requirePermission('ROLE_DELETE'),asyncRoute(async(req,res)=>{
  const roles=await query<RowDataPacket & {is_system:number}>('SELECT is_system FROM roles WHERE id=? AND company_id=?',[req.params.id,req.user!.company_id]);
  if(roles[0]?.is_system){res.status(409).json({message:'System roles cannot be deleted'});return;} await execute('DELETE FROM roles WHERE id=?',[req.params.id]);res.json({message:'Role deleted'});
}));

router.get('/users',authenticate,requirePermission('USER_VIEW'),asyncRoute(async(req,res)=>{
  const page=Math.max(1,Number(req.query.page)||1),pageSize=15,search=String(req.query.search??'');const like=`%${search}%`;
  const count=await query<RowDataPacket & {total:number}>('SELECT COUNT(*) total FROM users WHERE company_id=? AND (username LIKE ? OR full_name LIKE ? OR email LIKE ?)',[req.user!.company_id,like,like,like]);
  const rows=await query<RowDataPacket & Record<string,unknown>>(`SELECT u.id,u.username,u.email,u.full_name,u.role_id,u.branch_id,u.status,u.last_login_at,r.name role_name,b.name branch_name FROM users u JOIN roles r ON r.id=u.role_id LEFT JOIN branches b ON b.id=u.branch_id WHERE u.company_id=? AND (u.username LIKE ? OR u.full_name LIKE ? OR u.email LIKE ?) ORDER BY u.full_name LIMIT ? OFFSET ?`,[req.user!.company_id,like,like,like,pageSize,(page-1)*pageSize]);
  res.json({data:rows,meta:{page,pageSize,total:Number(count[0].total)}});
}));
const userSchema=z.object({username:z.string().trim().min(3),email:z.string().email(),full_name:z.string().trim().min(2),role_id:z.coerce.number().positive(),branch_id:z.coerce.number().positive().nullable().optional(),status:z.enum(['active','inactive']),password:z.string().min(8).optional()});
router.post('/users',authenticate,requirePermission('USER_CREATE'),asyncRoute(async(req,res)=>{
  const parsed=userSchema.extend({password:z.string().min(8)}).safeParse(req.body);if(!parsed.success){res.status(422).json({message:parsed.error.issues[0].message});return;}
  const limits=await query<RowDataPacket&{max_users:number|null;used:number}>('SELECT c.max_users,(SELECT COUNT(*) FROM users WHERE company_id=c.id) used FROM companies c WHERE c.id=?',[req.user!.company_id]);if(limits[0]?.max_users&&Number(limits[0].used)>=Number(limits[0].max_users)){res.status(409).json({message:'Company user limit reached'});return}
  await execute('INSERT INTO users(company_id,username,email,full_name,password_hash,role_id,branch_id,status) SELECT ?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM roles WHERE id=? AND (company_id=? OR company_id IS NULL)) AND (? IS NULL OR EXISTS(SELECT 1 FROM branches WHERE id=? AND company_id=?))',[req.user!.company_id,parsed.data.username,parsed.data.email,parsed.data.full_name,await bcrypt.hash(parsed.data.password,12),parsed.data.role_id,parsed.data.branch_id||null,parsed.data.status,parsed.data.role_id,req.user!.company_id,parsed.data.branch_id||null,parsed.data.branch_id||null,req.user!.company_id]);res.status(201).json({message:'User created'});
}));
router.put('/users/:id',authenticate,requirePermission('USER_UPDATE'),asyncRoute(async(req,res)=>{
  const parsed=userSchema.safeParse(req.body);if(!parsed.success){res.status(422).json({message:parsed.error.issues[0].message});return;}
  await execute('UPDATE users SET username=?,email=?,full_name=?,role_id=?,branch_id=?,status=? WHERE id=? AND company_id=?',[parsed.data.username,parsed.data.email,parsed.data.full_name,parsed.data.role_id,parsed.data.branch_id||null,parsed.data.status,req.params.id,req.user!.company_id]);res.json({message:'User updated'});
}));
router.post('/users/:id/reset-password',authenticate,requirePermission('USER_UPDATE'),asyncRoute(async(req,res)=>{
  const password=String(req.body.password??'');if(password.length<8){res.status(422).json({message:'Password must contain at least 8 characters'});return;}await execute('UPDATE users SET password_hash=?,must_change_password=1 WHERE id=? AND company_id=?',[await bcrypt.hash(password,12),req.params.id,req.user!.company_id]);res.json({message:'Password reset'});
}));
router.delete('/users/:id',authenticate,requirePermission('USER_DELETE'),asyncRoute(async(req,res)=>{if(Number(req.params.id)===req.user!.id){res.status(409).json({message:'You cannot delete your own account'});return;}await execute('DELETE FROM users WHERE id=? AND company_id=?',[req.params.id,req.user!.company_id]);res.json({message:'User deleted'});}));
router.get('/users/:id/permissions',authenticate,requirePermission('PERMISSION_ASSIGN'),asyncRoute(async(req,res)=>{
  const all=await query<RowDataPacket & Record<string,unknown>>('SELECT * FROM permissions ORDER BY module,name');const overrides=await query<RowDataPacket & Record<string,unknown>>('SELECT o.permission_id,o.allowed FROM user_permission_overrides o JOIN users u ON u.id=o.user_id WHERE o.user_id=? AND u.company_id=?',[req.params.id,req.user!.company_id]);const users=await query<RowDataPacket&Record<string,unknown>>('SELECT u.id,u.full_name,u.username,u.email,u.status,r.name role_name,b.name branch_name FROM users u JOIN roles r ON r.id=u.role_id LEFT JOIN branches b ON b.id=u.branch_id WHERE u.id=? AND u.company_id=?',[req.params.id,req.user!.company_id]);if(!users[0]){res.status(404).json({message:'User not found'});return}const inherited=await query<RowDataPacket&{code:string}>('SELECT p.code FROM users u JOIN role_permissions rp ON rp.role_id=u.role_id JOIN permissions p ON p.id=rp.permission_id WHERE u.id=? AND u.company_id=?',[req.params.id,req.user!.company_id]);res.json({data:{user:users[0],permissions:all,inherited:inherited.map(row=>row.code),effective:await getPermissions(Number(req.params.id)),overrides}});
}));
router.put('/users/:id/permissions',authenticate,requirePermission('PERMISSION_ASSIGN'),asyncRoute(async(req,res)=>{
  const users=await query<RowDataPacket>('SELECT id FROM users WHERE id=? AND company_id=?',[req.params.id,req.user!.company_id]);if(!users[0]){res.status(404).json({message:'User not found'});return}const overrides=z.array(z.object({permission_id:z.coerce.number().positive(),allowed:z.boolean()})).parse(req.body.overrides??[]);await execute('DELETE FROM user_permission_overrides WHERE user_id=?',[req.params.id]);for(const o of overrides)await execute('INSERT INTO user_permission_overrides(user_id,permission_id,allowed) VALUES(?,?,?)',[req.params.id,o.permission_id,o.allowed]);res.json({message:'User permissions updated'});
}));

router.get('/help-desk',authenticate,asyncRoute(async(req,res)=>{
  const all=req.user!.permissions.includes('HELPDESK_VIEW_ALL');const rows=await query<RowDataPacket & Record<string,unknown>>(`SELECT t.*,u.full_name user_name FROM help_desk_tickets t JOIN users u ON u.id=t.user_id WHERE t.company_id=? ${all?'':'AND t.user_id=?'} ORDER BY t.created_at DESC`,all?[req.user!.company_id]:[req.user!.company_id,req.user!.id]);res.json({data:rows});
}));
router.post('/help-desk',authenticate,asyncRoute(async(req,res)=>{
  const parsed=z.object({subject:z.string().min(3),category:z.enum(['technical','data','access','training','other']),priority:z.enum(['low','medium','high','critical']),description:z.string().min(10)}).safeParse(req.body);if(!parsed.success){res.status(422).json({message:parsed.error.issues[0].message});return;}
  const ticketNo=`HD-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${String(Date.now()).slice(-5)}`;await execute('INSERT INTO help_desk_tickets(company_id,ticket_no,user_id,subject,category,priority,description) VALUES(?,?,?,?,?,?,?)',[req.user!.company_id,ticketNo,req.user!.id,parsed.data.subject,parsed.data.category,parsed.data.priority,parsed.data.description]);res.status(201).json({message:`Ticket ${ticketNo} created`});
}));

export default router;
