import { NextRequest, NextResponse } from "next/server"
import { getUserByTelegramId, query } from "@/lib/db"

interface Transaction {
  id: string
  type: string
  amount: number
  game: string | null
  created_at: Date
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const telegramId = searchParams.get("telegramId")
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100)
  const offset = parseInt(searchParams.get("offset") || "0")
  
  if (!telegramId) {
    return NextResponse.json(
      { success: false, error: "Telegram ID required" },
      { status: 400 }
    )
  }
  
  try {
    // Get user
    const user = await getUserByTelegramId(telegramId)
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      )
    }
    
    // Get transactions
    const result = await query<Transaction>(
      `SELECT id, type, amount, game, created_at 
       FROM transactions 
       WHERE user_id = ? 
       ORDER BY created_at DESC 
       LIMIT ? OFFSET ?`,
      [user.id, limit, offset]
    )
    
    // Get total count
    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM transactions WHERE user_id = ?`,
      [user.id]
    )
    
    return NextResponse.json({
      success: true,
      transactions: result.rows || [],
      total: countResult.rows && countResult.rows[0] ? parseInt(String(countResult.rows[0].count)) : 0,
      limit,
      offset,
    })
    
  } catch (error) {
    console.error("Transactions fetch error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch transactions" },
      { status: 500 }
    )
  }
}
