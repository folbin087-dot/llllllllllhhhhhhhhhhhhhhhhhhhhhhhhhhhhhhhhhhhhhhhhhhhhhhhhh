import { NextRequest, NextResponse } from "next/server"

// Telegram Bot API for verifying channel/group subscriptions
// Requires BOT_TOKEN with admin rights in the target channel/group

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || ""
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`

interface VerifyRequest {
  userId: string | number // Telegram user ID
  channelUsername: string // @channel_username or channel ID
}

interface TelegramMember {
  status: "creator" | "administrator" | "member" | "restricted" | "left" | "kicked"
  user?: {
    id: number
    username?: string
    first_name?: string
  }
}

// Check if user is a member of channel/group
async function checkMembership(
  chatId: string, 
  userId: string | number
): Promise<{ isMember: boolean; status: string; error?: string }> {
  try {
    // Format chat ID properly
    let formattedChatId = chatId
    if (!chatId.startsWith("@") && !chatId.startsWith("-")) {
      formattedChatId = `@${chatId.replace("@", "")}`
    }
    
    const response = await fetch(
      `${TELEGRAM_API}/getChatMember?chat_id=${encodeURIComponent(formattedChatId)}&user_id=${userId}`,
      { method: "GET" }
    )
    
    const data = await response.json()
    
    if (!data.ok) {
      console.error("Telegram API error:", data.description)
      return { 
        isMember: false, 
        status: "error", 
        error: data.description || "Failed to check membership" 
      }
    }
    
    const member: TelegramMember = data.result
    const memberStatuses = ["creator", "administrator", "member", "restricted"]
    const isMember = memberStatuses.includes(member.status)
    
    return {
      isMember,
      status: member.status,
    }
  } catch (error) {
    console.error("Telegram membership check error:", error)
    return { 
      isMember: false, 
      status: "error", 
      error: "Network error" 
    }
  }
}

// Validate Telegram user ID
function validateUserId(userId: unknown): number | null {
  const id = typeof userId === "number" ? userId : parseInt(String(userId))
  if (isNaN(id) || id <= 0) return null
  return id
}

// Sanitize channel username
function sanitizeChannelUsername(username: string): string {
  return username
    .trim()
    .replace(/[<>'";&|`$(){}[\]\\]/g, "")
    .substring(0, 100)
}

export async function POST(request: NextRequest) {
  try {
    const body: VerifyRequest = await request.json()
    
    // Validate user ID
    const userId = validateUserId(body.userId)
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Invalid user ID" },
        { status: 400 }
      )
    }
    
    // Validate channel username
    if (!body.channelUsername) {
      return NextResponse.json(
        { success: false, error: "Channel username required" },
        { status: 400 }
      )
    }
    
    const channelUsername = sanitizeChannelUsername(body.channelUsername)
    
    // Check if bot token is configured
    if (!BOT_TOKEN) {
      console.warn("TELEGRAM_BOT_TOKEN not configured - running in demo mode")
      
      // Demo mode: simulate successful verification
      return NextResponse.json({
        success: true,
        demo: true,
        isMember: true,
        status: "member",
        message: "Демо режим - настройте TELEGRAM_BOT_TOKEN"
      })
    }
    
    // Verify membership
    const result = await checkMembership(channelUsername, userId)
    
    if (result.error) {
      return NextResponse.json({
        success: false,
        isMember: false,
        status: result.status,
        error: result.error,
      })
    }
    
    return NextResponse.json({
      success: true,
      isMember: result.isMember,
      status: result.status,
      channel: channelUsername,
    })
    
  } catch (error) {
    console.error("Subscription verification error:", error)
    return NextResponse.json(
      { success: false, error: "Verification failed" },
      { status: 500 }
    )
  }
}

// GET method for checking bot status
export async function GET() {
  if (!BOT_TOKEN) {
    return NextResponse.json({
      configured: false,
      message: "Bot token not configured"
    })
  }
  
  try {
    const response = await fetch(`${TELEGRAM_API}/getMe`)
    const data = await response.json()
    
    if (data.ok) {
      return NextResponse.json({
        configured: true,
        bot: {
          id: data.result.id,
          username: data.result.username,
          name: data.result.first_name,
        }
      })
    }
    
    return NextResponse.json({
      configured: true,
      error: "Invalid bot token"
    })
  } catch {
    return NextResponse.json({
      configured: true,
      error: "Failed to connect to Telegram API"
    })
  }
}
