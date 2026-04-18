// SQLite Database Library with SQL Injection Protection
// Uses better-sqlite3 with parameterized queries to prevent SQL injection

import Database from 'better-sqlite3'
import path from 'path'

// Initialize SQLite database at project root
const dbPath = path.join(process.cwd(), 'database.db')
const db = new Database(dbPath)

// Enable foreign keys
db.pragma('foreign_keys = ON')

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
  is_partner: boolean
  is_premium_partner: boolean
  referral_code: string
  referred_by: string | null
  created_at: string
  last_activity: string
}

export interface Transaction {
  id: string
  user_id: string
  type: 'deposit' | 'withdraw' | 'bet' | 'win' | 'bonus' | 'referral'
  amount: number
  balance_before: number
  balance_after: number
  game: string | null
  metadata: string | null
  created_at: string
}

export interface PromoCode {
  id: string
  code: string
  bonus_amount: number
  bonus_percent: number
  max_uses: number
  current_uses: number
  min_deposit: number
  expires_at: string | null
  is_active: boolean
  created_at: string
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
  created_at: string
}

export interface GameOdds {
  id: string
  game: string
  house_edge: number
  updated_at: string
  updated_by: string | null
}

export interface SiteSettings {
  id: string
  key: string
  value: string
  updated_at: string
}

export interface ChannelClaim {
  id: string
  user_id: string
  channel_id: string
  claimed_at: string
}

// Helper function for safe parameterized queries
export function query<T = unknown>(
  text: string,
  params?: unknown[]
): T[] {
  try {
    const stmt = db.prepare(text)
    return stmt.all(...(params || [])) as T[]
  } catch (error) {
    console.error('Query error:', { text, params, error })
    throw error
  }
}

// Query single row
export function queryOne<T = unknown>(
  text: string,
  params?: unknown[]
): T | null {
  const result = query<T>(text, params)
  return result[0] || null
}

// Execute query without return
export function execute(text: string, params?: unknown[]): { changes: number } {
  try {
    const stmt = db.prepare(text)
    const info = stmt.run(...(params || []))
    return { changes: info.changes }
  } catch (error) {
    console.error('Execute error:', { text, params, error })
    throw error
  }
}

// Transaction wrapper for atomic operations
export function withTransaction<T>(
  callback: () => T
): T {
  try {
    db.exec('BEGIN')
    const result = callback()
    db.exec('COMMIT')
    return result
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}

// Helper function to generate UUID v4
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0,
      v = c == 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

// Helper function to generate referral code
function generateReferralCode(): string {
  return Math.random().toString(36).substring(2, 10).toUpperCase()
}

// =====================
// USER OPERATIONS
// =====================

export function getUserByTelegramId(telegramId: string): User | null {
  return queryOne<User>(
    'SELECT * FROM users WHERE telegram_id = ?',
    [telegramId]
  )
}

export function getUserById(id: string): User | null {
  return queryOne<User>(
    'SELECT * FROM users WHERE id = ?',
    [id]
  )
}

export function getUserByReferralCode(code: string): User | null {
  return queryOne<User>(
    'SELECT * FROM users WHERE referral_code = ?',
    [code]
  )
}

export function createUser(data: {
  telegram_id: string
  username: string | null
  first_name: string
  last_name: string | null
  referred_by?: string
}): User {
  const userId = generateUUID()
  const referralCode = generateReferralCode()
  
  // If referred_by is a referral code, find the user ID
  let referredByUserId: string | null = null
  if (data.referred_by) {
    const referrer = getUserByReferralCode(data.referred_by)
    if (referrer) {
      referredByUserId = referrer.id
    }
  }
  
  execute(
    `INSERT INTO users (
      id, telegram_id, username, first_name, last_name, 
      referral_code, referred_by, created_at, last_activity
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      data.telegram_id,
      data.username || null,
      data.first_name,
      data.last_name || null,
      referralCode,
      referredByUserId,
      new Date().toISOString(),
      new Date().toISOString(),
    ]
  )
  
  const user = getUserById(userId)
  if (!user) throw new Error('Failed to create user')
  return user
}

export function updateUserBalance(
  userId: string,
  amount: number,
  type: Transaction['type'],
  game?: string,
  metadata?: Record<string, unknown>
): User {
  return withTransaction(() => {
    // Get current balance with validation
    const user = getUserById(userId)
    if (!user) throw new Error('User not found')
    
    const newBalance = Math.max(0, user.balance + amount)
    const now = new Date().toISOString()
    
    // Build update query dynamically
    const updates: string[] = ['balance = ?', 'last_activity = ?']
    const values: unknown[] = [newBalance, now]
    
    if (type === 'deposit') {
      updates.push('total_deposited = total_deposited + ?')
      values.push(Math.abs(amount))
    } else if (type === 'withdraw') {
      updates.push('total_withdrawn = total_withdrawn + ?')
      values.push(Math.abs(amount))
    } else if (type === 'bet') {
      updates.push('total_wagered = total_wagered + ?')
      values.push(Math.abs(amount))
    } else if (type === 'win') {
      updates.push('total_won = total_won + ?')
      values.push(Math.abs(amount))
    }
    
    values.push(userId)
    
    execute(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      values
    )
    
    // Create transaction record
    execute(
      `INSERT INTO transactions (id, user_id, type, amount, balance_before, balance_after, game, metadata, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        generateUUID(),
        userId,
        type,
        amount,
        user.balance,
        newBalance,
        game || null,
        metadata ? JSON.stringify(metadata) : null,
        now,
      ]
    )
    
    const updated = getUserById(userId)
    if (!updated) throw new Error('User not found after update')
    return updated
  })
}

export function getAllUsers(
  limit = 100,
  offset = 0
): { users: User[]; total: number } {
  const countResult = query<{ count: number }>(
    'SELECT COUNT(*) as count FROM users'
  )
  const total = countResult[0]?.count || 0
  
  const users = query<User>(
    'SELECT * FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?',
    [limit, offset]
  )
  
  return { users, total }
}

export function banUser(userId: string, banned: boolean): void {
  execute('UPDATE users SET is_banned = ? WHERE id = ?', [banned ? 1 : 0, userId])
}

export function setAdmin(
  userId: string,
  isAdmin: boolean,
  isSuperAdmin = false
): void {
  execute(
    'UPDATE users SET is_admin = ?, is_super_admin = ? WHERE id = ?',
    [isAdmin ? 1 : 0, isSuperAdmin ? 1 : 0, userId]
  )
}

export function setPartner(
  userId: string,
  isPartner: boolean,
  isPremium = false
): void {
  execute(
    'UPDATE users SET is_partner = ?, is_premium_partner = ? WHERE id = ?',
    [isPartner ? 1 : 0, isPremium ? 1 : 0, userId]
  )
}

// =====================
// PROMO CODE OPERATIONS
// =====================

export function getPromoCode(code: string): PromoCode | null {
  return queryOne<PromoCode>(
    'SELECT * FROM promo_codes WHERE UPPER(code) = UPPER(?)',
    [code]
  )
}

export function createPromoCode(data: {
  code: string
  bonus_amount?: number
  bonus_percent?: number
  max_uses?: number
  min_deposit?: number
  expires_at?: Date
}): PromoCode {
  const id = generateUUID()
  const now = new Date().toISOString()
  
  execute(
    `INSERT INTO promo_codes (id, code, bonus_amount, bonus_percent, max_uses, min_deposit, expires_at, is_active, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.code.toUpperCase(),
      data.bonus_amount || 0,
      data.bonus_percent || 0,
      data.max_uses || 0,
      data.min_deposit || 0,
      data.expires_at?.toISOString() || null,
      1,
      now,
    ]
  )
  
  const promo = queryOne<PromoCode>(
    'SELECT * FROM promo_codes WHERE id = ?',
    [id]
  )
  if (!promo) throw new Error('Failed to create promo code')
  return promo
}

export function usePromoCode(promoId: string, userId: string): boolean {
  return withTransaction(() => {
    // Check if already used
    const existing = query(
      'SELECT 1 FROM promo_uses WHERE promo_id = ? AND user_id = ?',
      [promoId, userId]
    )
    if (existing.length > 0) return false
    
    // Increment uses
    execute(
      'UPDATE promo_codes SET current_uses = current_uses + 1 WHERE id = ?',
      [promoId]
    )
    
    // Record use
    execute(
      `INSERT INTO promo_uses (id, promo_id, user_id, created_at)
       VALUES (?, ?, ?, ?)`,
      [generateUUID(), promoId, userId, new Date().toISOString()]
    )
    
    return true
  })
}

export function getAllPromoCodes(): PromoCode[] {
  return query<PromoCode>(
    'SELECT * FROM promo_codes ORDER BY created_at DESC'
  )
}

// =====================
// BONUS CHANNEL OPERATIONS
// =====================

export function getBonusChannels(activeOnly = false): BonusChannel[] {
  const where = activeOnly ? 'WHERE is_active = 1' : ''
  return query<BonusChannel>(
    `SELECT * FROM bonus_channels ${where} ORDER BY created_at DESC`
  )
}

export function createBonusChannel(data: {
  name: string
  username: string
  type: 'channel' | 'group'
  reward: number
}): BonusChannel {
  const id = generateUUID()
  const now = new Date().toISOString()
  
  execute(
    `INSERT INTO bonus_channels (id, name, username, type, reward, is_active, claims_count, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, data.name, data.username, data.type, data.reward, 1, 0, now]
  )
  
  const channel = queryOne<BonusChannel>(
    'SELECT * FROM bonus_channels WHERE id = ?',
    [id]
  )
  if (!channel) throw new Error('Failed to create bonus channel')
  return channel
}

export function updateBonusChannel(
  id: string,
  data: Partial<{
    name: string
    username: string
    type: string
    reward: number
    is_active: boolean
  }>
): void {
  const updates: string[] = []
  const values: unknown[] = []
  
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined) {
      updates.push(`${key} = ?`)
      if (typeof value === 'boolean') {
        values.push(value ? 1 : 0)
      } else {
        values.push(value)
      }
    }
  })
  
  if (updates.length === 0) return
  
  values.push(id)
  execute(`UPDATE bonus_channels SET ${updates.join(', ')} WHERE id = ?`, values)
}

export function deleteBonusChannel(id: string): void {
  execute('DELETE FROM bonus_channels WHERE id = ?', [id])
}

export function claimChannelBonus(userId: string, channelId: string): boolean {
  return withTransaction(() => {
    // Check if already claimed
    const existing = query(
      'SELECT 1 FROM channel_claims WHERE user_id = ? AND channel_id = ?',
      [userId, channelId]
    )
    if (existing.length > 0) return false
    
    // Get channel
    const channel = queryOne<BonusChannel>(
      'SELECT * FROM bonus_channels WHERE id = ? AND is_active = 1',
      [channelId]
    )
    if (!channel) return false
    
    // Record claim
    execute(
      `INSERT INTO channel_claims (id, user_id, channel_id, claimed_at)
       VALUES (?, ?, ?, ?)`,
      [generateUUID(), userId, channelId, new Date().toISOString()]
    )
    
    // Increment claims count
    execute(
      'UPDATE bonus_channels SET claims_count = claims_count + 1 WHERE id = ?',
      [channelId]
    )
    
    return true
  })
}

export function getUserChannelClaims(userId: string): string[] {
  const result = query<{ channel_id: string }>(
    'SELECT channel_id FROM channel_claims WHERE user_id = ?',
    [userId]
  )
  return result.map((r) => r.channel_id)
}

// =====================
// GAME ODDS OPERATIONS
// =====================

export function getGameOdds(game: string): number {
  const result = queryOne<GameOdds>(
    'SELECT * FROM game_odds WHERE game = ?',
    [game]
  )
  return result?.house_edge || 5 // Default 5%
}

export function setGameOdds(
  game: string,
  houseEdge: number,
  updatedBy?: string
): void {
  const existing = queryOne('SELECT 1 FROM game_odds WHERE game = ?', [game])
  
  if (existing) {
    execute(
      'UPDATE game_odds SET house_edge = ?, updated_by = ?, updated_at = ? WHERE game = ?',
      [houseEdge, updatedBy || null, new Date().toISOString(), game]
    )
  } else {
    execute(
      `INSERT INTO game_odds (id, game, house_edge, updated_by, updated_at)
       VALUES (?, ?, ?, ?, ?)`,
      [generateUUID(), game, houseEdge, updatedBy || null, new Date().toISOString()]
    )
  }
}

export function getAllGameOdds(): Record<string, number> {
  const result = query<GameOdds>('SELECT * FROM game_odds')
  const odds: Record<string, number> = {}
  result.forEach((row) => {
    odds[row.game] = row.house_edge
  })
  return odds
}

// =====================
// SITE SETTINGS OPERATIONS
// =====================

export function getSetting(key: string): string | null {
  const result = queryOne<SiteSettings>(
    'SELECT value FROM site_settings WHERE key = ?',
    [key]
  )
  return result?.value || null
}

export function setSetting(key: string, value: string): void {
  const existing = queryOne('SELECT 1 FROM site_settings WHERE key = ?', [key])
  
  if (existing) {
    execute(
      'UPDATE site_settings SET value = ?, updated_at = ? WHERE key = ?',
      [value, new Date().toISOString(), key]
    )
  } else {
    execute(
      `INSERT INTO site_settings (id, key, value, updated_at)
       VALUES (?, ?, ?, ?)`,
      [generateUUID(), key, value, new Date().toISOString()]
    )
  }
}

export function getAllSettings(): Record<string, string> {
  const result = query<SiteSettings>('SELECT * FROM site_settings')
  const settings: Record<string, string> = {}
  result.forEach((row) => {
    settings[row.key] = row.value
  })
  return settings
}

// =====================
// STATISTICS
// =====================

export function getStats(): {
  totalUsers: number
  totalDeposits: number
  totalWithdrawals: number
  totalBets: number
  totalWins: number
  profit: number
  activeToday: number
} {
  const users = query<{ count: number }>(
    'SELECT COUNT(*) as count FROM users'
  )
  
  const deposits = query<{ sum: number }>(
    "SELECT COALESCE(SUM(amount), 0) as sum FROM transactions WHERE type = 'deposit'"
  )
  
  const withdrawals = query<{ sum: number }>(
    "SELECT COALESCE(SUM(amount), 0) as sum FROM transactions WHERE type = 'withdraw'"
  )
  
  const bets = query<{ sum: number }>(
    "SELECT COALESCE(SUM(ABS(amount)), 0) as sum FROM transactions WHERE type = 'bet'"
  )
  
  const wins = query<{ sum: number }>(
    "SELECT COALESCE(SUM(amount), 0) as sum FROM transactions WHERE type = 'win'"
  )
  
  const now = new Date()
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
  const active = query<{ count: number }>(
    'SELECT COUNT(DISTINCT user_id) as count FROM transactions WHERE created_at > ?',
    [yesterday]
  )
  
  const totalDeposits = deposits[0]?.sum || 0
  const totalWithdrawals = withdrawals[0]?.sum || 0
  const totalBets = bets[0]?.sum || 0
  const totalWins = wins[0]?.sum || 0
  
  return {
    totalUsers: users[0]?.count || 0,
    totalDeposits,
    totalWithdrawals,
    totalBets,
    totalWins,
    profit: totalBets - totalWins,
    activeToday: active[0]?.count || 0,
  }
}

// =====================
// PARTNER OPERATIONS
// =====================

export function getPartnerEarnings(
  partnerId: string
): { total: number; pending: number; paid: number } {
  const all = query<{ status: string; sum: number }>(
    'SELECT status, SUM(amount) as sum FROM partner_earnings WHERE partner_id = ? GROUP BY status',
    [partnerId]
  )
  
  const earnings = {
    total: 0,
    pending: 0,
    paid: 0,
  }
  
  all.forEach((row) => {
    earnings.total += row.sum || 0
    if (row.status === 'pending') earnings.pending = row.sum || 0
    if (row.status === 'paid') earnings.paid = row.sum || 0
  })
  
  return earnings
}

export function addPartnerEarning(
  partnerId: string,
  amount: number,
  status: 'pending' | 'paid' = 'pending'
): void {
  execute(
    `INSERT INTO partner_earnings (id, partner_id, amount, status, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    [generateUUID(), partnerId, amount, status, new Date().toISOString()]
  )
}

export function getPartnerApplications(): Array<{
  id: string
  user_id: string
  status: string
  created_at: string
}> {
  return query(
    'SELECT id, user_id, status, created_at FROM partner_applications ORDER BY created_at DESC'
  )
}

export function createPartnerApplication(userId: string): void {
  // Check if already exists
  const existing = queryOne(
    'SELECT 1 FROM partner_applications WHERE user_id = ?',
    [userId]
  )
  
  if (!existing) {
    execute(
      `INSERT INTO partner_applications (id, user_id, status, created_at)
       VALUES (?, ?, ?, ?)`,
      [generateUUID(), userId, 'pending', new Date().toISOString()]
    )
  } else {
    execute(
      'UPDATE partner_applications SET status = ?, created_at = ? WHERE user_id = ?',
      ['pending', new Date().toISOString(), userId]
    )
  }
}

// Export database instance for migrations
export { db }
