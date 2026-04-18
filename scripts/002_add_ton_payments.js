const Database = require('better-sqlite3')
const path = require('path')

const dbPath = path.join(__dirname, '..', 'database.db')
const db = new Database(dbPath)

console.log('Adding ton_payments table...')

try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS ton_payments (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      telegram_id TEXT NOT NULL,
      ton_amount REAL NOT NULL,
      rub_amount REAL NOT NULL,
      memo TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('pending', 'confirmed', 'expired')),
      tx_hash TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      confirmed_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    
    CREATE INDEX IF NOT EXISTS idx_ton_payments_user ON ton_payments(user_id);
    CREATE INDEX IF NOT EXISTS idx_ton_payments_telegram ON ton_payments(telegram_id);
    CREATE INDEX IF NOT EXISTS idx_ton_payments_status ON ton_payments(status);
  `)
  
  console.log('✅ ton_payments table created successfully!')
  
  // Verify table
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all()
  console.log('\nAll tables in database:')
  tables.forEach(t => {
    console.log(`  - ${t.name}`)
  })
  
} catch (error) {
  console.error('Error creating ton_payments table:', error.message)
  process.exit(1)
} finally {
  db.close()
}
