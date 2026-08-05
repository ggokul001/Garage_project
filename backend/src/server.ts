import { app } from './app';
import { pool } from './config/db';
import { env } from './config/env';

async function start() {
  await pool.query('SELECT 1');
  app.listen(env.port, () => console.log(`Accura API running on http://localhost:${env.port}${env.apiPrefix}`));
}

start().catch((error) => { console.error('Unable to start server:', error); process.exit(1); });
