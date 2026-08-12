import { app } from './app';
import { pool } from './config/db';
import { env } from './config/env';
import {expireTrials} from './companyLifecycle';

async function start() {
  await pool.query('SELECT 1');
  await expireTrials();
  app.listen(env.port, () => console.log(`Ara Garage API running on http://localhost:${env.port}${env.apiPrefix}`));
  const trialTimer=setInterval(()=>void expireTrials().catch(error=>console.error('Trial expiry check failed:',error)),60*60*1000);trialTimer.unref();
}

start().catch((error) => { console.error('Unable to start server:', error); process.exit(1); });
