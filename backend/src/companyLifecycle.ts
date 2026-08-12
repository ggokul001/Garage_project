import {RowDataPacket} from 'mysql2/promise';
import {withTransaction} from './config/db';

export async function expireTrials(){
  return withTransaction(async connection=>{
    const[companies]=await connection.query<RowDataPacket[]>(`SELECT id FROM companies WHERE account_type='TRIAL' AND status='active' AND trial_ends_at IS NOT NULL AND trial_ends_at<=NOW() FOR UPDATE`);
    for(const company of companies){await connection.execute(`UPDATE companies SET status='inactive',inactive_at=NOW(),inactive_reason='Trial period expired' WHERE id=? AND status='active'`,[company.id]);await connection.execute(`INSERT INTO company_status_history(company_id,old_status,new_status,reason)VALUES(?,'active','inactive','Trial period expired')`,[company.id])}
    return companies.length;
  });
}
