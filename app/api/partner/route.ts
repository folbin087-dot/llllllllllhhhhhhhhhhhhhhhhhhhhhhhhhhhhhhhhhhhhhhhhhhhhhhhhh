import { NextRequest, NextResponse } from "next/server"
import { query, withTransaction, getUserByTelegramId } from "@/lib/db"

// Partner commission rate (from losses, not deposits)
// This ensures we never lose money - partners only earn from player losses
const PARTNER_COMMISSION_RATE = 0.05 // 5% of losses
const PREMIUM_PARTNER_COMMISSION = 0.08 // 8% for premium partners

interface ReferralStats {
  total_referrals: number
  active_referrals: number
  total_wagered: number
  total_losses: number
  total_commission_earned: number
  pending_commission: number
  this_week_earnings: number
  this_month_earnings: number
}

interface ReferralUser {
  id: string
  username: string | null
  first_name: string
  joined_at: string
  total_wagered: number
  total_losses: number
  commission_earned: number
  is_active: boolean
  last_activity: string
}

interface DailyStats {
  date: string
  new_referrals: number
  total_wagered: number
  total_losses: number
  commission_earned: number
}

// GET - Fetch partner dashboard data
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const telegramId = searchParams.get("telegramId")
    
    if (!telegramId) {
      return NextResponse.json({ success: false, error: "Missing telegramId" }, { status: 400 })
    }
    
    const user = await getUserByTelegramId(telegramId)
    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 })
    }
    
    // Check if user is a partner (has any referrals or is marked as partner)
    const isPartner = await checkIsPartner(user.id)
    const isPremiumPartner = await checkIsPremiumPartner(user.id)
    
    // Get referral stats
    const stats = await getReferralStats(user.id, isPremiumPartner)
    
    // Get referred users list
    const referrals = await getReferredUsers(user.id)
    
    // Get daily stats for chart (last 30 days)
    const dailyStats = await getDailyStats(user.id)
    
    // Get weekly breakdown
    const weeklyStats = await getWeeklyStats(user.id)
    
    // Generate unique partner link
    const partnerLink = `https://t.me/plaid_casino_bot?start=ref_${user.referral_code}`
    
    return NextResponse.json({
      success: true,
      isPartner,
      isPremiumPartner,
      commissionRate: isPremiumPartner ? PREMIUM_PARTNER_COMMISSION : PARTNER_COMMISSION_RATE,
      referralCode: user.referral_code,
      partnerLink,
      stats,
      referrals,
      dailyStats,
      weeklyStats,
    })
  } catch (error) {
    console.error("Partner API error:", error)
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 })
  }
}

// POST - Request withdrawal of commission
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { telegramId, action } = body
    
    if (!telegramId) {
      return NextResponse.json({ success: false, error: "Missing telegramId" }, { status: 400 })
    }
    
    const user = await getUserByTelegramId(telegramId)
    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 })
    }
    
    if (action === "withdraw_commission") {
      const result = await withdrawCommission(user.id)
      return NextResponse.json(result)
    }
    
    if (action === "apply_for_premium") {
      // Request premium partner status (requires approval)
      const result = await applyForPremiumPartner(user.id)
      return NextResponse.json(result)
    }
    
    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("Partner POST error:", error)
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 })
  }
}

// Helper functions
async function checkIsPartner(userId: string): Promise<boolean> {
  // Check if user is marked as partner OR has referrals
  const result = await query<{ is_partner: boolean; ref_count: string }>(
    `SELECT 
       COALESCE(is_partner, false) as is_partner,
       (SELECT COUNT(*) FROM users WHERE referred_by = $1) as ref_count
     FROM users WHERE id = $1`,
    [userId]
  )
  if (result.rows.length === 0) return false
  return result.rows[0].is_partner || parseInt(result.rows[0].ref_count) > 0
}

async function checkIsPremiumPartner(userId: string): Promise<boolean> {
  const result = await query<{ is_premium_partner: boolean }>(
    "SELECT COALESCE(is_premium_partner, false) as is_premium_partner FROM users WHERE id = $1",
    [userId]
  )
  return result.rows[0]?.is_premium_partner || false
}

async function getReferralStats(userId: string, isPremium: boolean): Promise<ReferralStats> {
  const commissionRate = isPremium ? PREMIUM_PARTNER_COMMISSION : PARTNER_COMMISSION_RATE
  
  // Get total referrals
  const totalResult = await query<{ count: string }>(
    "SELECT COUNT(*) as count FROM users WHERE referred_by = $1",
    [userId]
  )
  
  // Get active referrals (active in last 7 days)
  const activeResult = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM users 
     WHERE referred_by = $1 AND last_activity > datetime('now', '-7 days')`,
    [userId]
  )
  
  // Get wagered and losses from referrals
  const wagerResult = await query<{ total_wagered: string; total_losses: string }>(
    `SELECT 
       COALESCE(SUM(u.total_wagered), 0) as total_wagered,
       COALESCE(SUM(u.total_wagered - u.total_won), 0) as total_losses
     FROM users u 
     WHERE u.referred_by = $1`,
    [userId]
  )
  
  // Get commission already earned (from partner_earnings table)
  const earnedResult = await query<{ total: string }>(
    `SELECT COALESCE(SUM(amount), 0) as total 
     FROM partner_earnings 
     WHERE partner_id = $1 AND status = 'paid'`,
    [userId]
  )
  
  // Get pending commission
  const pendingResult = await query<{ total: string }>(
    `SELECT COALESCE(SUM(amount), 0) as total 
     FROM partner_earnings 
     WHERE partner_id = $1 AND status = 'pending'`,
    [userId]
  )
  
  // This week earnings
  const weekResult = await query<{ total: string }>(
    `SELECT COALESCE(SUM(amount), 0) as total 
     FROM partner_earnings 
     WHERE partner_id = $1 AND created_at > datetime('now', '-7 days')`,
    [userId]
  )
  
  // This month earnings  
  const monthResult = await query<{ total: string }>(
    `SELECT COALESCE(SUM(amount), 0) as total 
     FROM partner_earnings 
     WHERE partner_id = $1 AND created_at > datetime('now', '-30 days')`,
    [userId]
  )
  
  const totalLosses = parseFloat(wagerResult.rows[0]?.total_losses || "0")
  
  return {
    total_referrals: parseInt(totalResult.rows[0].count),
    active_referrals: parseInt(activeResult.rows[0].count),
    total_wagered: parseFloat(wagerResult.rows[0]?.total_wagered || "0"),
    total_losses: totalLosses,
    total_commission_earned: parseFloat(earnedResult.rows[0]?.total || "0"),
    pending_commission: Math.max(0, totalLosses * commissionRate - parseFloat(earnedResult.rows[0]?.total || "0")),
    this_week_earnings: parseFloat(weekResult.rows[0]?.total || "0"),
    this_month_earnings: parseFloat(monthResult.rows[0]?.total || "0"),
  }
}

async function getReferredUsers(userId: string): Promise<ReferralUser[]> {
  const result = await query<{
    id: string
    username: string | null
    first_name: string
    created_at: string
    total_wagered: number
    total_won: number
    last_activity: string
  }>(
    `SELECT id, username, first_name, created_at, total_wagered, total_won, last_activity
     FROM users 
     WHERE referred_by = $1 
     ORDER BY created_at DESC 
     LIMIT 50`,
    [userId]
  )
  
  return result.rows.map(row => ({
    id: row.id,
    username: row.username,
    first_name: row.first_name,
    joined_at: row.created_at,
    total_wagered: row.total_wagered,
    total_losses: Math.max(0, row.total_wagered - row.total_won),
    commission_earned: Math.max(0, (row.total_wagered - row.total_won) * PARTNER_COMMISSION_RATE),
    is_active: new Date(row.last_activity) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    last_activity: row.last_activity,
  }))
}

async function getDailyStats(userId: string): Promise<DailyStats[]> {
  // Get last 30 days of stats
  const result = await query<{
    date: string
    new_refs: string
    wagered: string
    losses: string
  }>(
    `SELECT 
       DATE(u.created_at) as date,
       COUNT(*) as new_refs,
       COALESCE(SUM(u.total_wagered), 0) as wagered,
       COALESCE(SUM(u.total_wagered - u.total_won), 0) as losses
     FROM users u
     WHERE u.referred_by = $1 
       AND u.created_at > datetime('now', '-30 days')
     GROUP BY DATE(u.created_at)
     ORDER BY date DESC`,
    [userId]
  )
  
  return result.rows.map(row => ({
    date: row.date,
    new_referrals: parseInt(row.new_refs),
    total_wagered: parseFloat(row.wagered),
    total_losses: parseFloat(row.losses),
    commission_earned: parseFloat(row.losses) * PARTNER_COMMISSION_RATE,
  }))
}

async function getWeeklyStats(userId: string) {
  const result = await query<{
    week: string
    new_refs: string
    wagered: string
    losses: string
  }>(
    `SELECT 
       DATE(u.created_at, 'start of week') as week,
       COUNT(*) as new_refs,
       COALESCE(SUM(u.total_wagered), 0) as wagered,
       COALESCE(SUM(u.total_wagered - u.total_won), 0) as losses
     FROM users u
     WHERE u.referred_by = $1 
       AND u.created_at > datetime('now', '-12 weeks')
     GROUP BY DATE(u.created_at, 'start of week')
     ORDER BY week DESC`,
    [userId]
  )
  
  return result.rows.map(row => ({
    week: row.week,
    new_referrals: parseInt(row.new_refs),
    total_wagered: parseFloat(row.wagered),
    total_losses: parseFloat(row.losses),
    commission_earned: parseFloat(row.losses) * PARTNER_COMMISSION_RATE,
  }))
}

async function withdrawCommission(userId: string): Promise<{ success: boolean; amount?: number; error?: string }> {
  return withTransaction(async (client) => {
    // Calculate available commission
    const statsResult = await client.query<{ total_wagered: string; total_won: string }>(
      `SELECT 
         COALESCE(SUM(u.total_wagered), 0) as total_wagered,
         COALESCE(SUM(u.total_won), 0) as total_won
       FROM users u 
       WHERE u.referred_by = $1`,
      [userId]
    )
    
    const paidResult = await client.query<{ total: string }>(
      `SELECT COALESCE(SUM(amount), 0) as total 
       FROM partner_earnings 
       WHERE partner_id = $1 AND status = 'paid'`,
      [userId]
    )
    
    const totalLosses = parseFloat(statsResult.rows[0]?.total_wagered || "0") - 
                        parseFloat(statsResult.rows[0]?.total_won || "0")
    const totalEarned = Math.max(0, totalLosses * PARTNER_COMMISSION_RATE)
    const alreadyPaid = parseFloat(paidResult.rows[0]?.total || "0")
    const available = totalEarned - alreadyPaid
    
    if (available < 100) {
      return { success: false, error: "Минимальная сумма для вывода: 100 ₽" }
    }
    
    // Record the withdrawal
    await client.query(
      `INSERT INTO partner_earnings (partner_id, amount, status, created_at)
       VALUES ($1, $2, 'paid', NOW())`,
      [userId, available]
    )
    
    // Add to user balance
    await client.query(
      `UPDATE users SET balance = balance + $2 WHERE id = $1`,
      [userId, available]
    )
    
    // Record transaction
    await client.query(
      `INSERT INTO transactions (user_id, type, amount, balance_before, balance_after, metadata)
       VALUES ($1, 'referral', $2, 
         (SELECT balance - $2 FROM users WHERE id = $1),
         (SELECT balance FROM users WHERE id = $1),
         '{"type": "partner_withdrawal"}')`,
      [userId, available]
    )
    
    return { success: true, amount: available }
  })
}

async function applyForPremiumPartner(userId: string): Promise<{ success: boolean; message: string }> {
  // Check if already applied
  const existing = await query(
    `SELECT 1 FROM partner_applications WHERE user_id = $1 AND status = 'pending'`,
    [userId]
  )
  
  if (existing.rows.length > 0) {
    return { success: false, message: "Заявка уже отправлена и ожидает рассмотрения" }
  }
  
  await query(
    `INSERT INTO partner_applications (user_id, status, created_at)
     VALUES ($1, 'pending', NOW())
     ON CONFLICT (user_id) DO UPDATE SET status = 'pending', created_at = NOW()`,
    [userId]
  )
  
  return { success: true, message: "Заявка на премиум-партнерство отправлена" }
}
