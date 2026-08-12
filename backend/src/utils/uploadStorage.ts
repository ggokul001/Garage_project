import fs from 'node:fs';
import path from 'node:path';
import {Request} from 'express';
import multer from 'multer';
import {RowDataPacket} from 'mysql2/promise';
import {env} from '../config/env';
import {query} from '../config/db';

export const uploadsRoot=path.resolve(env.uploadDir);

const safeSegment=(value:unknown,fallback:string)=>{
  const cleaned=String(value??'').trim().replace(/[^a-zA-Z0-9_-]+/g,'-').replace(/^-+|-+$/g,'');
  return cleaned||fallback;
};

export const uploadMonth=(value:Date|string=new Date())=>{
  const date=value instanceof Date?value:new Date(value);
  const valid=Number.isNaN(date.getTime())?new Date():date;
  return `${valid.getFullYear()}-${String(valid.getMonth()+1).padStart(2,'0')}`;
};

export const companyUploadDirectory=async(companyId:number,moduleName:string,date:Date|string=new Date())=>{
  if(!Number.isInteger(companyId)||companyId<=0)throw new Error('A valid company is required before uploading files');
  const rows=await query<RowDataPacket&{code:string}>('SELECT code FROM companies WHERE id=?',[companyId]);
  if(!rows[0])throw new Error('Company not found for file upload');
  const directory=path.join(uploadsRoot,safeSegment(rows[0].code,`company-${companyId}`),safeSegment(moduleName,'general'),uploadMonth(date));
  fs.mkdirSync(directory,{recursive:true});
  return directory;
};

export const platformUploadDirectory=(moduleName:string,date:Date|string=new Date())=>{
  const directory=path.join(uploadsRoot,'platform',safeSegment(moduleName,'general'),uploadMonth(date));
  fs.mkdirSync(directory,{recursive:true});
  return directory;
};

export const storedFilename=(_req:Request,file:Express.Multer.File,callback:(error:Error|null,filename:string)=>void)=>{
  callback(null,`${Date.now()}-${Math.random().toString(36).slice(2)}${path.extname(file.originalname).toLowerCase()}`);
};

export const companyStorage=(moduleName:string,resolveCompanyId:(req:Request)=>number|Promise<number>)=>multer.diskStorage({
  destination:(req,_file,callback)=>Promise.resolve(resolveCompanyId(req)).then(companyId=>companyUploadDirectory(Number(companyId),moduleName)).then(directory=>callback(null,directory)).catch(error=>callback(error as Error,'')),
  filename:storedFilename,
});

export const platformStorage=(moduleName:string)=>multer.diskStorage({
  destination:(_req,_file,callback)=>{try{callback(null,platformUploadDirectory(moduleName))}catch(error){callback(error as Error,'')}},
  filename:storedFilename,
});

export const isInsideUploads=(filePath:string)=>{
  const resolved=path.resolve(filePath);
  return resolved!==uploadsRoot&&resolved.startsWith(`${uploadsRoot}${path.sep}`);
};
