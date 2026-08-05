import path from 'node:path';
import dotenv from 'dotenv';

const environment=process.env.NODE_ENV??'development';
const envFile=process.env.ENV_FILE??(environment==='production'?'.env.production':'.env');
// Resolve from the application root so bundled and regular builds load the same file.
dotenv.config({path:path.resolve(process.cwd(),envFile)});
const normalize=(value:string)=>!value||value==='/'?'':`/${value.replace(/^\/+|\/+$/g,'')}`;
const basePath=normalize(process.env.APP_BASE_PATH??'');
const apiPath=normalize(process.env.API_PREFIX??'/api/v1');

export const env = {
  nodeEnv: environment,
  port: Number(process.env.PORT ?? 4010),
  basePath,
  apiPrefix: `${basePath}${apiPath}`,
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5174',
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:5174',
  jwtSecret: process.env.JWT_ACCESS_SECRET ?? process.env.JWT_SECRET ?? 'accura-local-development-secret-change-in-production',
  jwtAccessExpires: process.env.JWT_ACCESS_EXPIRES??'8h',
  bcryptRounds: Number(process.env.BCRYPT_ROUNDS??12),
  uploadDir: process.env.UPLOAD_DIR ?? './uploads',
  maxUploadSizeMb: Number(process.env.MAX_UPLOAD_SIZE_MB??5),
  db: {
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER ?? 'root',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_NAME ?? 'accura_trucking',
  },
};
