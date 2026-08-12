import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import masterRoutes from './masters/routes';
import accessRoutes from './access/routes';
import transactionRoutes from './transactions/routes';
import storeRoutes from './stores/routes';
import payrollRoutes from './payroll/routes';
import dashboardRoutes from './dashboard/routes';
import reportRoutes from './reports/routes';
import { auditMiddleware } from './middleware/audit';
import superAdminRoutes from './super-admin/routes';
import superAdminPaymentRoutes from './super-admin/paymentRoutes';

export const app = express();
app.use(helmet());
const configuredOrigins=new Set([...env.corsOrigins,env.frontendUrl.replace(/\/$/,'')]);
const localDevelopmentHosts=new Set(['localhost','127.0.0.1','[::1]','::1']);
export const isCorsOriginAllowed=(origin?:string)=>{
  if(!origin||configuredOrigins.has('*')||configuredOrigins.has(origin.replace(/\/$/,'')))return true;
  if(env.nodeEnv==='production')return false;
  try{return localDevelopmentHosts.has(new URL(origin).hostname)}catch{return false}
};
app.use(cors({origin:(origin,callback)=>callback(null,isCorsOriginAllowed(origin))}));
app.use(express.json({ limit: '1mb' }));
app.use(auditMiddleware);
app.get(`${env.apiPrefix}/health`, (_req, res) => res.json({ status: 'ok' }));
app.use(env.apiPrefix, accessRoutes);
app.use(env.apiPrefix, superAdminPaymentRoutes);
app.use(env.apiPrefix, superAdminRoutes);
app.use(env.apiPrefix, transactionRoutes);
app.use(env.apiPrefix, storeRoutes);
app.use(env.apiPrefix, payrollRoutes);
app.use(env.apiPrefix, dashboardRoutes);
app.use(env.apiPrefix, reportRoutes);
app.use(`${env.apiPrefix}/masters`, masterRoutes);
app.use((_req, res) => res.status(404).json({ message: 'Route not found' }));
app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const dbError = error as { code?: string; sqlMessage?: string; message?: string };
  if (dbError.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'Code or unique value already exists' });
  if (dbError.code === 'ER_ROW_IS_REFERENCED_2') return res.status(409).json({ message: 'This record is in use and cannot be deleted' });
  if (dbError.code === 'ER_NO_REFERENCED_ROW_2') return res.status(422).json({ message: 'A selected linked record does not exist' });
  console.error(error);
  return res.status(500).json({ message: dbError.message ?? 'Internal server error' });
});
