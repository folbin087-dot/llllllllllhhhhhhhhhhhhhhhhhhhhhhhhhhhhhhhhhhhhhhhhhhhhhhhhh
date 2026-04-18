#!/usr/bin/env node

/**
 * Initialize SQLite Database
 * Run: node --env-file-if-exists=/vercel/share/.env.project scripts/001_init_sqlite.js
 */

import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.join(__dirname, '..')
const dbPath = path.join(projectRoot, 'database.db')

console.log(`[v0] Initializing SQLite database at: ${dbPath}`)

const db = new Database(dbPath)

// Enable foreign keys
db.pragma('foreign_keys = ON')

// Create all tables
const tables = [
  // Users table
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    telegram_id TEXT NOT NULL UNIQUE,
    username TEXT,
    first_name TEXT NOT NULL,
    last_name TEXT,
    balance REAL NOT NULL DEFAULT 0,
    total_deposited REAL NOT NULL DEFAULT 0,
    total_withdrawn REAL NOT NULL DEFAULT 0,
    total_wagered REAL NOT NULL DEFAULT 0,
    total_won REAL NOT NULL DEFAULT 0,
    is_banned INTEGER NOT NULL DEFAULT 0,
    is_admin INTEGER NOT NULL DEFAULT 0,
    is_super_admin INTEGER NOT NULL DEFAULT 0,
    is_partner INTEGER NOT NULL DEFAULT 0,
    is_premium_partner INTEGER NOT NULL DEFAULT 0,
    referral_code TEXT NOT NULL UNIQUE,
    referred_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL,
    last_activity TEXT NOT NULL,
    UNIQUE(telegram_id)
  )`,

  // Transactions table
  `CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK(type IN ('deposit', 'withdraw', 'bet', 'win', 'bonus', 'referral')),
    amount REAL NOT NULL,
    balance_before REAL NOT NULL,
    balance_after REAL NOT NULL,
    game TEXT,
    metadata TEXT,
    created_at TEXT NOT NULL
  )`,

  // Promo codes table
  `CREATE TABLE IF NOT EXISTS promo_codes (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    bonus_amount REAL NOT NULL DEFAULT 0,
    bonus_percent REAL NOT NULL DEFAULT 0,
    max_uses INTEGER NOT NULL DEFAULT 0,
    current_uses INTEGER NOT NULL DEFAULT 0,
    min_deposit REAL NOT NULL DEFAULT 0,
    expires_at TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
  )`,

  // Promo uses tracking
  `CREATE TABLE IF NOT EXISTS promo_uses (
    id TEXT PRIMARY KEY,
    promo_id TEXT NOT NULL REFERENCES promo_codes(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL,
    UNIQUE(promo_id, user_id)
  )`,

  // Bonus channels table
  `CREATE TABLE IF NOT EXISTS bonus_channels (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    username TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL CHECK(type IN ('channel', 'group')),
    reward REAL NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    subscriber_count INTEGER,
    claims_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  )`,

  // Channel claims tracking
  `CREATE TABLE IF NOT EXISTS channel_claims (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    channel_id TEXT NOT NULL REFERENCES bonus_channels(id) ON DELETE CASCADE,
    claimed_at TEXT NOT NULL,
    UNIQUE(user_id, channel_id)
  )`,

  // Game odds table
  `CREATE TABLE IF NOT EXISTS game_odds (
    id TEXT PRIMARY KEY,
    game TEXT NOT NULL UNIQUE,
    house_edge REAL NOT NULL DEFAULT 5,
    updated_at TEXT NOT NULL,
    updated_by TEXT REFERENCES users(id) ON DELETE SET NULL
  )`,

  // Site settings table
  `CREATE TABLE IF NOT EXISTS site_settings (
    id TEXT PRIMARY KEY,
    key TEXT NOT NULL UNIQUE,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,

  // Partner earnings table
  `CREATE TABLE IF NOT EXISTS partner_earnings (
    id TEXT PRIMARY KEY,
    partner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount REAL NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('pending', 'paid')) DEFAULT 'pending',
    created_at TEXT NOT NULL
  )`,

  // Partner applications table
  `CREATE TABLE IF NOT EXISTS partner_applications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK(status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
    created_at TEXT NOT NULL
  )`,

  // Partner clicks tracking
  `CREATE TABLE IF NOT EXISTS partner_clicks (
    id TEXT PRIMARY KEY,
    partner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    click_date TEXT NOT NULL,
    count INTEGER NOT NULL DEFAULT 1
  )`,
]

// Create tables
console.log('[v0] Creating tables...')
tables.forEach((sql, index) => {
  try {
    db.exec(sql)
    console.log(`[v0] ✓ Table ${index + 1}/${tables.length} created`)
  } catch (error) {
    console.error(`[v0] ✗ Error creating table ${index + 1}:`, error.message)
  }
})

// Create indexes for performance
const indexes = [
  'CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id)',
  'CREATE INDEX IF NOT EXISTS idx_users_referred_by ON users(referred_by)',
  'CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id)',
  'CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at)',
  'CREATE INDEX IF NOT EXISTS idx_promo_uses_user_id ON promo_uses(user_id)',
  'CREATE INDEX IF NOT EXISTS idx_channel_claims_user_id ON channel_claims(user_id)',
  'CREATE INDEX IF NOT EXISTS idx_partner_earnings_partner_id ON partner_earnings(partner_id)',
]

console.log('[v0] Creating indexes...')
indexes.forEach((sql) => {
  try {
    db.exec(sql)
  } catch (error) {
    console.error(`[v0] ✗ Error creating index:`, error.message)
  }
})

console.log('[v0] ✓ Database initialization complete!')
console.log(`[v0] Database file: ${dbPath}`)

db.close()
