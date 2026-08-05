import fs from 'node:fs/promises';
import path from 'node:path';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import { env } from '../config/env';

async function migrate() {
  const schemaPath=process.env.NODE_ENV==='production'
    ? path.resolve(process.cwd(),'dist','database','schema.sql')
    : path.join(__dirname,'schema.sql');
  const sql = await fs.readFile(schemaPath, 'utf8');
  const connection = await mysql.createConnection({
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
    multipleStatements: true,
  });
  try {
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${mysql.escapeId(env.db.database)} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  } catch (error) {
    const dbError=error as {code?:string};
    if(dbError.code!=='ER_DBACCESS_DENIED_ERROR')throw error;
  }
  await connection.query(`USE ${mysql.escapeId(env.db.database)}`);
  await connection.query(sql);
  const passwordHash = await bcrypt.hash('Admin@123', env.bcryptRounds);
  await connection.execute(
    `INSERT INTO users (username,email,full_name,password_hash,role_id,branch_id,status)
     SELECT 'admin','admin@aragarage.local','System Administrator',?,r.id,b.id,'active'
     FROM roles r LEFT JOIN branches b ON b.is_head_office=1
     WHERE r.code='ADMIN' AND NOT EXISTS (SELECT 1 FROM users WHERE username='admin') LIMIT 1`,
    [passwordHash],
  );
  await connection.end();
  console.log(`Database ${env.db.database} is ready.`);
}

migrate().catch((error) => {
  console.error(error);
  process.exit(1);
});
