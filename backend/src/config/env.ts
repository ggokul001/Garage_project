import path from 'node:path';
import fs from 'node:fs';
import dotenv from 'dotenv';

const environment=process.env.NODE_ENV??'development';
const envFile=process.env.ENV_FILE??(environment==='production'?'.env.production':'.env');
// Resolve from the application root so bundled and regular builds load the same file.
dotenv.config({path:path.resolve(process.cwd(),envFile)});
// Local development may reuse only the already-configured production mail
// credentials. Other production settings (database, base path, etc.) are never
// imported into the local process.
const productionEnvPath=path.resolve(process.cwd(),'.env.production');
const mailFallback:Record<string,string>=environment!=='production'&&fs.existsSync(productionEnvPath)
  ?dotenv.parse(fs.readFileSync(productionEnvPath))
  :{};
const mailValue=(key:string)=>process.env[key]?.trim()||mailFallback[key]?.trim()||'';
const normalize=(value:string)=>!value||value==='/'?'':`/${value.replace(/^\/+|\/+$/g,'')}`;
const csv=(value:string)=>[...new Set(value.split(',').map(item=>item.trim().replace(/\/$/,'')).filter(Boolean))];
const basePath=normalize(process.env.APP_BASE_PATH??'');
const apiPath=normalize(process.env.API_PREFIX??'/api/v1');

export const env = {
  nodeEnv: environment,
  port: Number(process.env.PORT ?? 4010),
  basePath,
  apiPrefix: `${basePath}${apiPath}`,
  corsOrigins: csv(process.env.CORS_ORIGIN ?? 'http://localhost:5174,http://localhost:5175'),
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:5174',
  jwtSecret: process.env.JWT_ACCESS_SECRET ?? process.env.JWT_SECRET ?? 'ara-garage-local-development-secret-change-in-production',
  jwtAccessExpires: process.env.JWT_ACCESS_EXPIRES??'8h',
  bcryptRounds: Number(process.env.BCRYPT_ROUNDS??12),
  uploadDir: process.env.UPLOAD_DIR ?? './uploads',
  maxUploadSizeMb: Number(process.env.MAX_UPLOAD_SIZE_MB??5),
  mail: {
    host: mailValue('SMTP_HOST'),
    port: Number(mailValue('SMTP_PORT')||587),
    secure: mailValue('SMTP_SECURE').toLowerCase()==='true'||Number(mailValue('SMTP_PORT'))===465,
    user: mailValue('SMTP_USER'),
    password: mailValue('SMTP_PASS'),
    from: mailValue('MAIL_FROM')||mailValue('SMTP_USER'),
  },
  helpDeskRecipient: mailValue('HELP_DESK_RECIPIENT'),
  db: {
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER ?? 'root',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_NAME ?? 'ara_garage',
  },
};
