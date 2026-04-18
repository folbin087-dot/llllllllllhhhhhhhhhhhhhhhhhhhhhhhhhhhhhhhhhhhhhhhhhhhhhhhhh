const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../database.db');
console.log(`[v0] Connecting to database at: ${dbPath}\n`);

try {
  const db = new Database(dbPath);
  
  // Get all tables
  const tables = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' 
    ORDER BY name
  `).all();
  
  console.log('=== DATABASE TABLES ===');
  tables.forEach(table => {
    console.log(`\n📊 Table: ${table.name}`);
    
    // Get table schema
    const schema = db.prepare(`PRAGMA table_info(${table.name})`).all();
    schema.forEach(col => {
      console.log(`   - ${col.name}: ${col.type}${col.notnull ? ' NOT NULL' : ''}${col.pk ? ' PRIMARY KEY' : ''}`);
    });
    
    // Get row count
    const count = db.prepare(`SELECT COUNT(*) as cnt FROM ${table.name}`).get();
    console.log(`   📈 Rows: ${count.cnt}`);
  });
  
  console.log('\n✅ Database verification complete!');
  db.close();
  
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
