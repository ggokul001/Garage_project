import mysql, { Pool, ResultSetHeader, RowDataPacket, PoolConnection } from 'mysql2/promise';
import { env } from './env';

export const pool: Pool = mysql.createPool({
  ...env.db,
  waitForConnections: true,
  connectionLimit: 10,
  dateStrings: true,
  decimalNumbers: true,
});

export async function query<T extends RowDataPacket>(sql: string, params: unknown[] = []): Promise<T[]> {
  const [rows] = await pool.query<T[]>(sql, params);
  return rows;
}

export async function execute(sql: string, params: unknown[] = []): Promise<ResultSetHeader> {
  const [result] = await pool.execute<ResultSetHeader>(sql, params as never[]);
  return result;
}

export async function withTransaction<T>(handler:(connection:PoolConnection)=>Promise<T>):Promise<T>{
  let lastError: unknown;
  for(let attempt=0;attempt<2;attempt++){
    const connection=await pool.getConnection();
    try{
      await connection.beginTransaction();
      const result=await handler(connection);
      await connection.commit();
      return result;
    }catch(error){
      lastError=error;
      try{await connection.rollback()}catch{}
      const message=String((error as Error)?.message??'');
      if(!message.toLowerCase().includes('connection is in closed state')||attempt===1)throw error;
    }finally{connection.release()}
  }
  throw lastError;
}
