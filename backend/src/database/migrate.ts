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
  // Seed the first effective rate for installations that already used the
  // single monthly_fee field, then repair unpaid dues created with an earlier
  // mistaken amount. Paid value is never reduced or invalidated.
  await connection.query(`INSERT IGNORE INTO company_billing_rates(company_id,effective_from_month,monthly_fee,due_day,remarks)
    SELECT id,billing_start_month,monthly_fee,billing_due_day,'Migrated opening billing rate' FROM companies
    WHERE billing_cycle='MONTHLY' AND monthly_fee>0 AND billing_start_month IS NOT NULL`);
  // Older installations may contain a due row one month before the stored
  // start month (legacy Date timezone conversion). Treat that earliest
  // existing due as the opening month instead of leaving it on an orphan fee.
  await connection.query(`UPDATE company_billing_rates r
    JOIN (SELECT company_id,MIN(billing_month) first_due FROM company_monthly_dues GROUP BY company_id) d ON d.company_id=r.company_id
    SET r.effective_from_month=d.first_due
    WHERE r.remarks='Migrated opening billing rate' AND d.first_due<r.effective_from_month`);
  await connection.query(`UPDATE companies c
    JOIN (SELECT company_id,MIN(billing_month) first_due FROM company_monthly_dues GROUP BY company_id) d ON d.company_id=c.id
    SET c.billing_start_month=d.first_due
    WHERE c.billing_start_month IS NOT NULL AND d.first_due<c.billing_start_month`);
  await connection.query(`UPDATE company_monthly_dues d
    JOIN company_billing_rates r ON r.company_id=d.company_id AND r.effective_from_month=(
      SELECT MAX(r2.effective_from_month) FROM company_billing_rates r2 WHERE r2.company_id=d.company_id AND r2.effective_from_month<=d.billing_month
    )
    SET d.due_amount=r.monthly_fee,d.due_date=STR_TO_DATE(CONCAT(DATE_FORMAT(d.billing_month,'%Y-%m-'),LPAD(LEAST(r.due_day,DAY(LAST_DAY(d.billing_month))),2,'0')),'%Y-%m-%d'),
        d.status=CASE WHEN d.paid_amount<=0 THEN 'PENDING' WHEN d.paid_amount>=r.monthly_fee THEN 'PAID' ELSE 'PARTIAL' END
    WHERE d.paid_amount<=r.monthly_fee`);
  const tenantTables=['designations','employees','customers','vendors','financial_years','vehicles','uoms','products','work_pending_sub_statuses','document_sequences','job_cards','job_card_complaints','work_orders','work_order_complaints','work_order_spares','work_order_attachments','payment_receipts','store_entries','store_entry_details','vendor_payments','vendor_payment_allocations','shifts','daily_attendance','salary_advances','payroll_runs','payroll_details','master_code_sequences','help_desk_tickets'];
  for(const table of tenantTables){
    const[columns]=await connection.query<mysql.RowDataPacket[]>('SELECT IS_NULLABLE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=? AND TABLE_NAME=? AND COLUMN_NAME="company_id"',[env.db.database,table]);
    if(columns[0]?.IS_NULLABLE==='YES')await connection.query(`ALTER TABLE ${mysql.escapeId(table)} MODIFY company_id BIGINT UNSIGNED NOT NULL`);
    const [indexRows]=await connection.query<mysql.RowDataPacket[]>('SELECT INDEX_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=? AND TABLE_NAME=? AND INDEX_NAME=?',[env.db.database,table,`idx_${table}_company`]);
    if(!indexRows[0])await connection.query(`ALTER TABLE ${mysql.escapeId(table)} ADD INDEX ${mysql.escapeId(`idx_${table}_company`)} (company_id)`);
  }
  const companyUnique:[string,string,string][]=[
    ['branches','code','uq_branches_company_code'],['departments','code','uq_departments_company_code'],['designations','code','uq_designations_company_code'],['employees','code','uq_employees_company_code'],['customers','code','uq_customers_company_code'],['vendors','code','uq_vendors_company_code'],['financial_years','code','uq_financial_years_company_code'],['vehicles','vehicle_number','uq_vehicles_company_number'],['uoms','code','uq_uoms_company_code'],['products','code','uq_products_company_code'],['work_pending_sub_statuses','code','uq_pending_status_company_code'],['shifts','code','uq_shifts_company_code'],
  ];
  for(const[table,legacyIndex,newIndex]of companyUnique){
    const[legacy]=await connection.query<mysql.RowDataPacket[]>('SELECT INDEX_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=? AND TABLE_NAME=? AND INDEX_NAME=?',[env.db.database,table,legacyIndex]);
    if(legacy[0])await connection.query(`ALTER TABLE ${mysql.escapeId(table)} DROP INDEX ${mysql.escapeId(legacyIndex)}`);
    const[composite]=await connection.query<mysql.RowDataPacket[]>('SELECT INDEX_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=? AND TABLE_NAME=? AND INDEX_NAME=?',[env.db.database,table,newIndex]);
    if(!composite[0])await connection.query(`ALTER TABLE ${mysql.escapeId(table)} ADD UNIQUE INDEX ${mysql.escapeId(newIndex)} (company_id,${mysql.escapeId(legacyIndex)})`);
  }
  const[sequencePk]=await connection.query<mysql.RowDataPacket[]>(`SELECT COUNT(*) column_count FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA=? AND TABLE_NAME='master_code_sequences' AND CONSTRAINT_NAME='PRIMARY'`,[env.db.database]);
  if(Number(sequencePk[0]?.column_count)===1)await connection.query('ALTER TABLE master_code_sequences MODIFY company_id BIGINT UNSIGNED NOT NULL,DROP PRIMARY KEY,ADD PRIMARY KEY(master_name,company_id)');
  const passwordHash = await bcrypt.hash('Admin@123', env.bcryptRounds);
  await connection.execute(
    `INSERT INTO users (username,email,full_name,password_hash,role_id,branch_id,company_id,status)
     SELECT 'admin','admin@aragarage.local','Company Administrator',?,r.id,b.id,b.company_id,'active'
     FROM roles r LEFT JOIN branches b ON b.is_head_office=1
     WHERE r.code='ADMIN' AND NOT EXISTS (SELECT 1 FROM users WHERE username='admin') LIMIT 1`,
    [passwordHash],
  );
  const superPasswordHash = await bcrypt.hash('SuperAdmin@123', env.bcryptRounds);
  await connection.execute(
    `INSERT INTO users (username,email,full_name,password_hash,role_id,branch_id,company_id,status,must_change_password)
     SELECT 'superadmin','superadmin@aragarage.local','Super Administrator',?,r.id,NULL,NULL,'active',1
     FROM roles r WHERE r.code='SUPER_ADMIN' AND NOT EXISTS (SELECT 1 FROM users WHERE username='superadmin') LIMIT 1`,
    [superPasswordHash],
  );
  await connection.end();
  console.log(`Database ${env.db.database} is ready.`);
}

migrate().catch((error) => {
  console.error(error);
  process.exit(1);
});
