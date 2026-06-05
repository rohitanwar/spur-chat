import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { config } from '../config';

const pool = new Pool({ connectionString: config.databaseUrl });

async function runMigrations() {
  const client = await pool.connect();
  try {
    const sql = fs.readFileSync(
      path.join(__dirname, 'migrations', '001.sql'),
      'utf-8'
    );
    await client.query(sql);
    console.log('Database migrations applied');
  } finally {
    client.release();
  }
}

export { pool, runMigrations };