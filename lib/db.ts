// PostgreSQL Database Library with SQL Injection Protection
// Uses parameterized queries to prevent SQL injection

import { Pool, PoolClient, QueryResult } from 'pg'

// Database configuration from environment variables
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

// Type definitions
export interface User {
  id: string
  telegram_id: string
  username: string | null
  first_name: string
  last_name: string | null
  balance: number
  total_deposited: number
  total_withdrawn: number
  total_wagered: number
  total_won: number
  is_banned: boolean
  is_admin: boolean
  is_super_admin: boolean
  referral_code: string
  referred_by: string | null
  created_at: Date
  last_activity: Date
}

export interface Transaction {
  id: string
  user_id: string
  type: 'deposit' | 'withdraw' | 'bet' | 'win' | 'bonus' | 'referral'
  amount: number
  balance_before: number
  balance_after: number
  game: string | null
  metadata: Record<string, unknown> | null
  created_at: Date
}

export interface PromoCode {
  id: string
  code: string
  bonus_amount: number
  bonus_percent: number
  max_uses: number
  current_uses: number
  min_deposit: number
  expires_at: Date | null
  is_active: boolean
  created_at: Date
}

export interface BonusChannel {
  id: string
  name: string
  username: string
  type: 'channel' | 'group'
  reward: number
  is_active: boolean
  subscriber_count: number | null
  claims_count: number
  created_at: Date
}

export interface GameOdds {
  id: string
  game: string
  house_edge: number
  updated_at: Date
  updated_by: string | null
}

export interface SiteSettings {
  id: string
  key: string
  value: string
  updated_at: Date
}

export interface ChannelClaim {
  id: string
  user_id: string
  channel_id: string
  claimed_at: Date
}

// Helper function for safe parameterized queries
export async function query<T = unknown>(
  text: string, 
  params?: unknown[]
): Promise<QueryResult<T>> {
  const client = await pool.connect()
  try {
    const result = await client.query<T>(text, params)
    return result
  } finally {
    client.release()
  }
}

// Transaction wrapper for atomic operations
export async function withTransaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await callback(client)
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

// =====================
// USER OPERATIONS
// =====================

export async function getUserByTelegramId(telegramId: string): Promise<User | null> {
  const result = await query<User>(
    'SELECT * FROM users WHERE telegram_id = $1',
    [telegramId]
  )
  return result.rows[0] || null
}

export async function createUser(data: {
  telegram_id: string
  username: string | null
  first_name: string
  last_name: string | null
  referred_by?: string
}): Promise<User> {
  const referralCode = generateReferralCode()
  
  const result = await query<User>(
    `INSERT INTO users (telegram_id, username, first_name, last_name, referral_code, referred_by)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [data.telegram_id, data.username, data.first_name, data.last_name, referralCode, data.referred_by || null]
  )
  return result.rows[0]
}

export async function updateUserBalance(
  userId: string, 
  amount: number, 
  type: Transaction['type'],
  game?: string,
  metadata?: Record<string, unknown>
): Promise<User> {
  return withTransaction(async (client) => {
    // Get current balance with row lock
    const userResult = await client.query<User>(
      'SELECT * FROM users WHERE id = $1 FOR UPDATE',
      [userId]
    )
    const user = userResult.rows[0]
    if (!user) throw new Error('User not found')
    
    const newBalance = Math.max(0, user.balance + amount)
    
    // Update user balance and stats
    const updateFields: string[] = ['balance = $2', 'last_activity = NOW()']
    const updateValues: unknown[] = [userId, newBalance]
    let paramIndex = 3
    
    if (type === 'deposit') {
      updateFields.push(`total_deposited = total_deposited + $${paramIndex}`)
      updateValues.push(Math.abs(amount))
      paramIndex++
    } else if (type === 'withdraw') {
      updateFields.push(`total_withdrawn = total_withdrawn + $${paramIndex}`)
      updateValues.push(Math.abs(amount))
      paramIndex++
    } else if (type === 'bet') {
      updateFields.push(`total_wagered = total_wagered + $${paramIndex}`)
      updateValues.push(Math.abs(amount))
      paramIndex++
    } else if (type === 'win') {
      updateFields.push(`total_won = total_won + $${paramIndex}`)
      updateValues.push(Math.abs(amount))
      paramIndex++
    }
    
    await client.query(
      `UPDATE users SET ${updateFields.join(', ')} WHERE id = $1`,
      updateValues
    )
    
    // Create transaction record
    await client.query(
      `INSERT INTO transactions (user_id, type, amount, balance_before, balance_after, game, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [userId, type, amount, user.balance, newBalance, game || null, metadata ? JSON.stringify(metadata) : null]
    )
    
    return { ...user, balance: newBalance }
  })
}

export async function getAllUsers(limit = 100, offset = 0): Promise<{ users: User[], total: number }> {
  const countResult = await query<{ count: string }>('SELECT COUNT(*) FROM users')
  const total = parseInt(countResult.rows[0].count)
  
  const result = await query<User>(
    'SELECT * FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2',
    [limit, offset]
  )
  
  return { users: result.rows, total }
}

export async function banUser(userId: string, banned: boolean): Promise<void> {
  await query('UPDATE users SET is_banned = $2 WHERE id = $1', [userId, banned])
}

export async function setAdmin(userId: string, isAdmin: boolean, isSuperAdmin = false): Promise<void> {
  await query(
    'UPDATE users SET is_admin = $2, is_super_admin = $3 WHERE id = $1',
    [userId, isAdmin, isSuperAdmin]
  )
}

// =====================
// PROMO CODE OPERATIONS
// =====================

export async function getPromoCode(code: string): Promise<PromoCode | null> {
  const result = await query<PromoCode>(
    'SELECT * FROM promo_codes WHERE UPPER(code) = UPPER($1)',
    [code]
  )
  return result.rows[0] || null
}

export async function createPromoCode(data: {
  code: string
  bonus_amount?: number
  bonus_percent?: number
  max_uses?: number
  min_deposit?: number
  expires_at?: Date
}): Promise<PromoCode> {
  const result = await query<PromoCode>(
    `INSERT INTO promo_codes (code, bonus_amount, bonus_percent, max_uses, min_deposit, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      data.code.toUpperCase(),
      data.bonus_amount || 0,
      data.bonus_percent || 0,
      data.max_uses || 0,
      data.min_deposit || 0,
      data.expires_at || null
    ]
  )
  return result.rows[0]
}

export async function usePromoCode(promoId: string, userId: string): Promise<boolean> {
  return withTransaction(async (client) => {
    // Check if already used by this user
    const usedResult = await client.query(
      'SELECT 1 FROM promo_uses WHERE promo_id = $1 AND user_id = $2',
      [promoId, userId]
    )
    if (usedResult.rows.length > 0) return false
    
    // Increment uses
    await client.query(
      'UPDATE promo_codes SET current_uses = current_uses + 1 WHERE id = $1',
      [promoId]
    )
    
    // Record use
    await client.query(
      'INSERT INTO promo_uses (promo_id, user_id) VALUES ($1, $2)',
      [promoId, userId]
    )
    
    return true
  })
}

export async function getAllPromoCodes(): Promise<PromoCode[]> {
  const result = await query<PromoCode>('SELECT * FROM promo_codes ORDER BY created_at DESC')
  return result.rows
}

// =====================
// BONUS CHANNEL OPERATIONS
// =====================

export async function getBonusChannels(activeOnly = false): Promise<BonusChannel[]> {
  const whereClause = activeOnly ? 'WHERE is_active = true' : ''
  const result = await query<BonusChannel>(
    `SELECT * FROM bonus_channels ${whereClause} ORDER BY created_at DESC`
  )
  return result.rows
}

export async function createBonusChannel(data: {
  name: string
  username: string
  type: 'channel' | 'group'
  reward: number
}): Promise<BonusChannel> {
  const result = await query<BonusChannel>(
    `INSERT INTO bonus_channels (name, username, type, reward)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [data.name, data.username, data.type, data.reward]
  )
  return result.rows[0]
}

export async function updateBonusChannel(
  id: string, 
  data: Partial<{ name: string; username: string; type: string; reward: number; is_active: boolean }>
): Promise<void> {
  const updates: string[] = []
  const values: unknown[] = []
  let paramIndex = 1
  
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined) {
      updates.push(`${key} = $${paramIndex}`)
      values.push(value)
      paramIndex++
    }
  })
  
  if (updates.length === 0) return
  
  values.push(id)
  await query(
    `UPDATE bonus_channels SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
    values
  )
}

export async function deleteBonusChannel(id: string): Promise<void> {
  await query('DELETE FROM bonus_channels WHERE id = $1', [id])
}

export async function claimChannelBonus(userId: string, channelId: string): Promise<boolean> {
  return withTransaction(async (client) => {
    // Check if already claimed
    const claimResult = await client.query(
      'SELECT 1 FROM channel_claims WHERE user_id = $1 AND channel_id = $2',
      [userId, channelId]
    )
    if (claimResult.rows.length > 0) return false
    
    // Get channel
    const channelResult = await client.query<BonusChannel>(
      'SELECT * FROM bonus_channels WHERE id = $1 AND is_active = true',
      [channelId]
    )
    const channel = channelResult.rows[0]
    if (!channel) return false
    
    // Record claim
    await client.query(
      'INSERT INTO channel_claims (user_id, channel_id) VALUES ($1, $2)',
      [userId, channelId]
    )
    
    // Increment claims count
    await client.query(
      'UPDATE bonus_channels SET claims_count = claims_count + 1 WHERE id = $1',
      [channelId]
    )
    
    return true
  })
}

export async function getUserChannelClaims(userId: string): Promise<string[]> {
  const result = await query<{ channel_id: string }>(
    'SELECT channel_id FROM channel_claims WHERE user_id = $1',
    [userId]
  )
  return result.rows.map(r => r.channel_id)
}

// =====================
// GAME ODDS OPERATIONS
// =====================

export async function getGameOdds(game: string): Promise<number> {
  const result = await query<GameOdds>(
    'SELECT * FROM game_odds WHERE game = $1',
    [game]
  )
  return result.rows[0]?.house_edge || 5 // Default 5%
}

export async function setGameOdds(game: string, houseEdge: number, updatedBy?: string): Promise<void> {
  await query(
    `INSERT INTO game_odds (game, house_edge, updated_by)
     VALUES ($1, $2, $3)
     ON CONFLICT (game) DO UPDATE SET house_edge = $2, updated_by = $3, updated_at = NOW()`,
    [game, houseEdge, updatedBy || null]
  )
}

export async function getAllGameOdds(): Promise<Record<string, number>> {
  const result = await query<GameOdds>('SELECT * FROM game_odds')
  const odds: Record<string, number> = {}
  result.rows.forEach(row => {
    odds[row.game] = row.house_edge
  })
  return odds
}

// =====================
// SITE SETTINGS OPERATIONS
// =====================

export async function getSetting(key: string): Promise<string | null> {
  const result = await query<SiteSettings>(
    'SELECT value FROM site_settings WHERE key = $1',
    [key]
  )
  return result.rows[0]?.value || null
}

export async function setSetting(key: string, value: string): Promise<void> {
  await query(
    `INSERT INTO site_settings (key, value)
     VALUES ($1, $2)
     ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
    [key, value]
  )
}

export async function getAllSettings(): Promise<Record<string, string>> {
  const result = await query<SiteSettings>('SELECT * FROM site_settings')
  const settings: Record<string, string> = {}
  result.rows.forEach(row => {
    settings[row.key] = row.value
  })
  return settings
}

// =====================
// STATISTICS
// =====================

export async function getStats(): Promise<{
  totalUsers: number
  totalDeposits: number
  totalWithdrawals: number
  totalBets: number
  totalWins: number
  profit: number
  activeToday: number
}> {
  const [users, deposits, withdrawals, bets, wins, active] = await Promise.all([
    query<{ count: string }>('SELECT COUNT(*) FROM users'),
    query<{ sum: string }>('SELECT COALESCE(SUM(amount), 0) as sum FROM transactions WHERE type = $1', ['deposit']),
    query<{ sum: string }>('SELECT COALESCE(SUM(amount), 0) as sum FROM transactions WHERE type = $1', ['withdraw']),
    query<{ sum: string }>('SELECT COALESCE(SUM(ABS(amount)), 0) as sum FROM transactions WHERE type = $1', ['bet']),
    query<{ sum: string }>('SELECT COALESCE(SUM(amount), 0) as sum FROM transactions WHERE type = $1', ['win']),
    query<{ count: string }>(
      "SELECT COUNT(DISTINCT user_id) FROM transactions WHERE created_at > NOW() - INTERVAL '24 hours'"
    ),
  ])
  
  const totalDeposits = parseFloat(deposits.rows[0].sum)
  const totalWithdrawals = parseFloat(withdrawals.rows[0].sum)
  const totalBets = parseFloat(bets.rows[0].sum)
  const totalWins = parseFloat(wins.rows[0].sum)
  
  return {
    totalUsers: parseInt(users.rows[0].count),
    totalDeposits,
    totalWithdrawals,
    totalBets,
    totalWins,
    profit: totalBets - totalWins,
    activeToday: parseInt(active.rows[0].count),
  }
}

export async function getTransactionLogs(limit = 100, offset = 0): Promise<Transaction[]> {
  const result = await query<Transaction>(
    'SELECT * FROM transactions ORDER BY created_at DESC LIMIT $1 OFFSET $2',
    [limit, offset]
  )
  return result.rows
}

// =====================
// HELPERS
// =====================

function generateReferralCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

// Export pool for cleanup
export { pool }
