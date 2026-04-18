import { Pool } from 'pg'
import fs from 'fs'
import path from 'path'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
})

async function runMigration() {
  const client = await pool.connect()
  try {
    console.log('Starting migration...')
    
    // Read and execute the SQL migration
    const sqlPath = path.join(process.cwd(), 'scripts', 'add_is_partner.sql')
    const sql = fs.readFileSync(sqlPath, 'utf-8')
    
    await client.query(sql)
    console.log('✓ Migration completed successfully')
  } catch (error) {
    console.error('✗ Migration failed:', error)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

runMigration()
