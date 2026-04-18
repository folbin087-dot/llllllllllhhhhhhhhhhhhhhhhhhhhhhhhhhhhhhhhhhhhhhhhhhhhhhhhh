import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { getUserByTelegramId, createUser, query } from "@/lib/db"

// Telegram Bot Token for validation
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || ""

interface TelegramAuthRequest {
  initData: string
  user: {
    id: number
    first_name: string
    last_name?: string | null
    username?: string | null
    language_code?: string
    is_premium?: boolean
  }
  referralCode?: string
}

/**
 * Validate Telegram WebApp InitData
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
function validateTelegramInitData(initData: string): { valid: boolean; data?: Record<string, string> } {
  if (!BOT_TOKEN || !initData) {
    // Allow demo mode when bot token is not set
    return { valid: true, data: {} }
  }
  
  try {
    const urlParams = new URLSearchParams(initData)
    const hash = urlParams.get("hash")
    
    if (!hash) {
      return { valid: false }
    }
    
    // Remove hash from params and sort alphabetically
    urlParams.delete("hash")
    const dataCheckArr: string[] = []
    
    urlParams.forEach((value, key) => {
      dataCheckArr.push(`${key}=${value}`)
    })
    
    dataCheckArr.sort()
    const dataCheckString = dataCheckArr.join("\n")
    
    // Create secret key using HMAC-SHA256
    const secretKey = crypto
      .createHmac("sha256", "WebAppData")
      .update(BOT_TOKEN)
      .digest()
    
    // Calculate hash
    const calculatedHash = crypto
      .createHmac("sha256", secretKey)
      .update(dataCheckString)
      .digest("hex")
    
    // Compare hashes using timing-safe comparison
    const isValid = crypto.timingSafeEqual(
      Buffer.from(hash),
      Buffer.from(calculatedHash)
    )
    
    if (!isValid) {
      return { valid: false }
    }
    
    // Check auth_date (data older than 24 hours is invalid)
    const authDate = urlParams.get("auth_date")
    if (authDate) {
      const authTimestamp = parseInt(authDate) * 1000
      const now = Date.now()
      const maxAge = 24 * 60 * 60 * 1000 // 24 hours
      
      if (now - authTimestamp > maxAge) {
        return { valid: false }
      }
    }
    
    // Parse data into object
    const data: Record<string, string> = {}
    urlParams.forEach((value, key) => {
      data[key] = value
    })
    
    return { valid: true, data }
  } catch (error) {
    console.error("InitData validation error:", error)
    return { valid: false }
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: TelegramAuthRequest = await request.json()
    
    // Validate request
    if (!body.user || !body.user.id) {
      return NextResponse.json(
        { success: false, error: "User data required" },
        { status: 400 }
      )
    }
    
    // Validate Telegram InitData
    const validation = validateTelegramInitData(body.initData || "")
    
    if (!validation.valid && BOT_TOKEN) {
      return NextResponse.json(
        { success: false, error: "Invalid authentication data" },
        { status: 401 }
      )
    }
    
    const telegramId = String(body.user.id)
    
    // Check if user exists
    let user = await getUserByTelegramId(telegramId)
    let isNewUser = false
    
    if (!user) {
      // Create new user with 0 balance
      isNewUser = true
      try {
        user = await createUser({
          telegram_id: telegramId,
          username: body.user.username || null,
          first_name: body.user.first_name,
          last_name: body.user.last_name || null,
          referred_by: body.referralCode,
        })
        
        console.log(`New user registered: ${telegramId} (${body.user.first_name})`)
      } catch (error) {
        console.error("Failed to create user:", error)
        return NextResponse.json(
          { success: false, error: "Failed to create user" },
          { status: 500 }
        )
      }
    } else {
      // Update last activity and user info
      isNewUser = false
      try {
        await query(
          `UPDATE users 
           SET last_activity = NOW(), 
               username = COALESCE($2, username),
               first_name = COALESCE($3, first_name),
               last_name = COALESCE($4, last_name)
           WHERE telegram_id = $1`,
          [telegramId, body.user.username, body.user.first_name, body.user.last_name]
        )
      } catch (error) {
        console.error("Failed to update user:", error)
      }
    }
    
    // Check if user is a partner (marked as partner OR has referrals)
    let isPartner = false
    try {
      const partnerResult = await query<{ is_partner: boolean; ref_count: string }>(
        `SELECT 
           COALESCE(is_partner, false) as is_partner,
           (SELECT COUNT(*) FROM users WHERE referred_by = $1) as ref_count
         FROM users WHERE id = $1`,
        [user.id]
      )
      if (partnerResult.rows.length > 0) {
        isPartner = partnerResult.rows[0].is_partner || parseInt(partnerResult.rows[0].ref_count) > 0
      }
    } catch (error) {
      console.error("Failed to check partner status:", error)
    }
    
    // Return user data (without sensitive info)
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        telegram_id: user.telegram_id,
        username: user.username,
        first_name: user.first_name,
        last_name: user.last_name,
        balance: user.balance,
        referral_code: user.referral_code,
        is_admin: user.is_admin,
        is_banned: user.is_banned,
        is_partner: isPartner,
        created_at: user.created_at,
      },
      isNewUser,
    })
    
  } catch (error) {
    console.error("Telegram auth error:", error)
    return NextResponse.json(
      { success: false, error: "Authentication failed" },
      { status: 500 }
    )
  }
}

// GET method to check auth status
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const telegramId = searchParams.get("telegramId")
  
  if (!telegramId) {
    return NextResponse.json(
      { success: false, error: "Telegram ID required" },
      { status: 400 }
    )
  }
  
  try {
    const user = await getUserByTelegramId(telegramId)
    
    if (!user) {
      return NextResponse.json({
        success: false,
        authenticated: false,
      })
    }
    
    // Check if user is a partner (marked as partner OR has referrals)
    let isPartner = false
    try {
      const partnerResult = await query<{ is_partner: boolean; ref_count: string }>(
        `SELECT 
           COALESCE(is_partner, false) as is_partner,
           (SELECT COUNT(*) FROM users WHERE referred_by = $1) as ref_count
         FROM users WHERE id = $1`,
        [user.id]
      )
      if (partnerResult.rows.length > 0) {
        isPartner = partnerResult.rows[0].is_partner || parseInt(partnerResult.rows[0].ref_count) > 0
      }
    } catch (error) {
      // Ignore partner check error
    }
    
    return NextResponse.json({
      success: true,
      authenticated: true,
      user: {
        id: user.id,
        telegram_id: user.telegram_id,
        username: user.username,
        first_name: user.first_name,
        balance: user.balance,
        referral_code: user.referral_code,
        is_admin: user.is_admin,
        is_partner: isPartner,
      },
    })
  } catch (error) {
    console.error("Auth check error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to check authentication" },
      { status: 500 }
    )
  }
}
