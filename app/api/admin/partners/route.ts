import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"

// GET all partners with their aggregated stats
export async function GET() {
  try {
    // Fetch all users who have at least 1 referral OR are marked as partners
    const partnersResult = await query<{
      id: string
      telegram_id: string
      username: string | null
      first_name: string
      referral_code: string
      is_premium_partner: boolean
      total_referrals: string
      active_referrals: string
      total_referral_wagered: string
      total_referral_losses: string
      total_paid: string
      pending_earnings: string
    }>(`
      SELECT
        p.id,
        p.telegram_id,
        p.username,
        p.first_name,
        p.referral_code,
        COALESCE(p.is_premium_partner, false) as is_premium_partner,
        COUNT(DISTINCT r.id) as total_referrals,
        SUM(CASE WHEN r.last_activity > datetime('now', '-7 days') THEN 1 ELSE 0 END) as active_referrals,
        COALESCE(SUM(r.total_wagered), 0) as total_referral_wagered,
        COALESCE(SUM(r.total_wagered - r.total_won), 0) as total_referral_losses,
        COALESCE((
          SELECT SUM(amount) FROM partner_earnings
          WHERE partner_id = p.id AND status = 'paid'
        ), 0) as total_paid,
        COALESCE((
          SELECT SUM(amount) FROM partner_earnings
          WHERE partner_id = p.id AND status = 'pending'
        ), 0) as pending_earnings
      FROM users p
      LEFT JOIN users r ON r.referred_by = p.id
      WHERE COALESCE(p.is_partner, false) = true OR EXISTS (SELECT 1 FROM users WHERE referred_by = p.id)
      GROUP BY p.id, p.telegram_id, p.username, p.first_name, p.referral_code, p.is_premium_partner
      ORDER BY total_referral_losses DESC
    `)

    const partners = partnersResult.rows.map(row => ({
      id: row.id,
      telegram_id: row.telegram_id,
      username: row.username,
      first_name: row.first_name,
      referral_code: row.referral_code,
      is_premium_partner: row.is_premium_partner,
      total_referrals: parseInt(row.total_referrals),
      active_referrals: parseInt(row.active_referrals),
      total_referral_wagered: parseFloat(row.total_referral_wagered),
      total_referral_losses: parseFloat(row.total_referral_losses),
      total_paid: parseFloat(row.total_paid),
      pending_earnings: parseFloat(row.pending_earnings),
    }))

    // Aggregate stats
    const totalReferrals = partners.reduce((s, p) => s + p.total_referrals, 0)
    const totalPartnerEarnings = partners.reduce((s, p) => s + p.total_paid, 0)
    const pendingPayouts = partners.reduce((s, p) => s + p.pending_earnings, 0)

    const stats = {
      totalPartners: partners.length,
      totalReferrals,
      totalPartnerEarnings,
      pendingPayouts,
      avgReferralsPerPartner: partners.length > 0 ? totalReferrals / partners.length : 0,
    }

    return NextResponse.json({ success: true, partners, stats })
  } catch (error) {
    console.error("Admin partners GET error:", error)
    return NextResponse.json({ success: false, error: "Failed to load partner data" }, { status: 500 })
  }
}

// POST - admin actions on partners (set_premium, add_partner, remove_partner)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, userId, isPremium, telegramId } = body

    if (action === "set_premium") {
      if (!userId) {
        return NextResponse.json({ success: false, error: "Missing userId" }, { status: 400 })
      }
      await query(
        "UPDATE users SET is_premium_partner = ? WHERE id = ?",
        [!!isPremium ? 1 : 0, userId]
      )
      return NextResponse.json({
        success: true,
        message: isPremium ? "Premium статус выдан" : "Premium статус снят",
      })
    }

    if (action === "add_partner") {
      if (!telegramId) {
        return NextResponse.json({ success: false, error: "Введите Telegram ID" }, { status: 400 })
      }
      
      // Check if user exists
      const userResult = await query<{ id: string; first_name: string; is_partner: boolean }>(
        "SELECT id, first_name, COALESCE(is_partner, false) as is_partner FROM users WHERE telegram_id = ?",
        [telegramId]
      )
      
      if (userResult.rows.length === 0) {
        return NextResponse.json({ success: false, error: "Пользователь с таким Telegram ID не найден" }, { status: 404 })
      }
      
      const user = userResult.rows[0]
      
      if (user.is_partner) {
        return NextResponse.json({ success: false, error: "Пользователь уже является партнером" }, { status: 400 })
      }
      
      // Mark user as partner
      await query(
        "UPDATE users SET is_partner = 1 WHERE id = ?",
        [user.id]
      )
      
      return NextResponse.json({
        success: true,
        message: `Пользователь ${user.first_name} добавлен как партнер`,
      })
    }

    if (action === "remove_partner") {
      if (!userId) {
        return NextResponse.json({ success: false, error: "Missing userId" }, { status: 400 })
      }
      
      // Remove partner status
      await query(
        "UPDATE users SET is_partner = 0, is_premium_partner = 0 WHERE id = ?",
        [userId]
      )
      
      return NextResponse.json({
        success: true,
        message: "Партнер удален из программы",
      })
    }

    return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 })
  } catch (error) {
    console.error("Admin partners POST error:", error)
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 })
  }
}
