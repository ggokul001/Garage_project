import fs from 'node:fs';
import path from 'node:path';
import {NextFunction,Request,Response,Router} from 'express';
import multer from 'multer';
import {ResultSetHeader,RowDataPacket} from 'mysql2/promise';
import {z} from 'zod';
import {env} from '../config/env';
import {execute,query} from '../config/db';
import {authenticate,requireSuperAdmin} from '../middleware/auth';
import {isInsideUploads,platformStorage} from '../utils/uploadStorage';

const router=Router();
const asyncRoute=(handler:(req:Request,res:Response)=>Promise<void>)=>(req:Request,res:Response,next:NextFunction)=>handler(req,res).catch(next);
const logoUpload=multer({
  storage:platformStorage('products'),
  limits:{fileSize:env.maxUploadSizeMb*1024*1024,files:1},
  fileFilter:(_req,file,callback)=>['image/jpeg','image/png','image/webp','image/svg+xml'].includes(file.mimetype)?callback(null,true):callback(new Error('Product logo must be JPG, PNG, WEBP or SVG')),
}).single('logo');

const productSchema=z.object({
  code:z.string().trim().min(2).max(40).regex(/^[A-Za-z0-9_-]+$/,'Code can contain only letters, numbers, hyphen and underscore'),
  name:z.string().trim().min(2).max(120),
  tagline:z.string().trim().max(200).nullish(),
  product_url:z.union([z.string().trim().url('Enter a valid product URL'),z.literal(''),z.null()]).nullish(),
  display_order:z.coerce.number().int().min(0).max(9999).default(0),
  open_new_tab:z.coerce.boolean().default(true),
  status:z.enum(['active','inactive']).default('active'),
});

const logoData=(row:Record<string,unknown>)=>{
  let logo_data_url:string|null=null;
  if(row.logo_path&&row.logo_mime_type){try{const data=fs.readFileSync(String(row.logo_path));logo_data_url=`data:${row.logo_mime_type};base64,${data.toString('base64')}`}catch{}}
  return{...row,logo_data_url};
};
const removeFile=(filePath:unknown)=>{if(!filePath)return;try{const resolved=path.resolve(String(filePath));if(isInsideUploads(resolved)&&fs.existsSync(resolved))fs.unlinkSync(resolved)}catch{}};
const parseForm=(req:Request,file?:Express.Multer.File)=>{
  let raw:unknown={};
  try{raw=JSON.parse(String(req.body.data??'{}'))}catch{if(file)removeFile(file.path);return{error:'Invalid product data'} as const}
  const parsed=productSchema.safeParse(raw);
  if(!parsed.success){if(file)removeFile(file.path);return{error:parsed.error.issues[0]?.message??'Invalid product data'} as const}
  return{data:parsed.data} as const;
};

router.get('/platform-products/active',authenticate,asyncRoute(async(_req,res)=>{
  const rows=await query<RowDataPacket&Record<string,unknown>>("SELECT id,code,name,tagline,product_url,logo_path,logo_mime_type,display_order,open_new_tab FROM platform_products WHERE status='active' ORDER BY display_order,name,id");
  res.json({data:rows.map(logoData)});
}));

router.use('/super-admin/products',authenticate,requireSuperAdmin);
router.get('/super-admin/products',asyncRoute(async(req,res)=>{
  const page=Math.max(1,Number(req.query.page)||1),pageSize=Math.min(100,Math.max(10,Number(req.query.pageSize)||15)),search=String(req.query.search??'').trim(),params:unknown[]=[];
  const where=search?'WHERE code LIKE ? OR name LIKE ? OR tagline LIKE ?':'';
  if(search)params.push(...Array(3).fill(`%${search}%`));
  const count=await query<RowDataPacket&{total:number}>(`SELECT COUNT(*) total FROM platform_products ${where}`,params);
  const rows=await query<RowDataPacket&Record<string,unknown>>(`SELECT * FROM platform_products ${where} ORDER BY display_order,name,id LIMIT ? OFFSET ?`,[...params,pageSize,(page-1)*pageSize]);
  res.json({data:rows.map(logoData),meta:{page,pageSize,total:Number(count[0]?.total??0)}});
}));

router.post('/super-admin/products',logoUpload,asyncRoute(async(req,res)=>{
  const file=req.file,parsed=parseForm(req,file);if('error'in parsed){res.status(422).json({message:parsed.error});return}
  if(!file){res.status(422).json({message:'Product logo is required'});return}
  const d=parsed.data;
  try{const out=await execute('INSERT INTO platform_products(code,name,tagline,product_url,logo_path,logo_mime_type,display_order,open_new_tab,status,created_by,updated_by) VALUES(?,?,?,?,?,?,?,?,?,?,?)',[d.code.toUpperCase(),d.name,d.tagline||null,d.product_url||null,file.path,file.mimetype,d.display_order,d.open_new_tab?1:0,d.status,req.user!.id,req.user!.id]);res.status(201).json({data:{id:out.insertId,code:d.code.toUpperCase(),name:d.name},message:`${d.name} added to Our Products`})}catch(error){removeFile(file.path);throw error}
}));

router.put('/super-admin/products/:id',logoUpload,asyncRoute(async(req,res)=>{
  const file=req.file,parsed=parseForm(req,file);if('error'in parsed){res.status(422).json({message:parsed.error});return}
  const existing=await query<RowDataPacket&{id:number;logo_path:string|null}>('SELECT id,logo_path FROM platform_products WHERE id=?',[req.params.id]);
  if(!existing[0]){if(file)removeFile(file.path);res.status(404).json({message:'Product not found'});return}
  const d=parsed.data;
  try{await execute('UPDATE platform_products SET code=?,name=?,tagline=?,product_url=?,logo_path=COALESCE(?,logo_path),logo_mime_type=COALESCE(?,logo_mime_type),display_order=?,open_new_tab=?,status=?,updated_by=? WHERE id=?',[d.code.toUpperCase(),d.name,d.tagline||null,d.product_url||null,file?.path??null,file?.mimetype??null,d.display_order,d.open_new_tab?1:0,d.status,req.user!.id,req.params.id]);if(file)removeFile(existing[0].logo_path);res.json({data:{id:Number(req.params.id),code:d.code.toUpperCase(),name:d.name},message:`${d.name} updated`})}catch(error){if(file)removeFile(file.path);throw error}
}));

router.delete('/super-admin/products/:id',asyncRoute(async(req,res)=>{
  const rows=await query<RowDataPacket&{id:number;name:string;logo_path:string|null}>('SELECT id,name,logo_path FROM platform_products WHERE id=?',[req.params.id]);
  if(!rows[0]){res.status(404).json({message:'Product not found'});return}
  const result=await execute('DELETE FROM platform_products WHERE id=?',[req.params.id]);
  if((result as ResultSetHeader).affectedRows)removeFile(rows[0].logo_path);
  res.json({data:{id:Number(req.params.id),name:rows[0].name},message:`${rows[0].name} removed`});
}));

export default router;
