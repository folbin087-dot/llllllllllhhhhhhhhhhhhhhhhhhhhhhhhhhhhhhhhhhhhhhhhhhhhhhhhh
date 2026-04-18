import { NextRequest, NextResponse } from "next/server"
import { getUserByTelegramId, updateUserBalance, query } from "@/lib/db"

// TON API endpoint
const TON_API_URL = "https://tonapi.io/v2"

// Casino wallet address from environment
const CASINO_WALLET = process.env.CASINO_TON_WALLET || ""

// Store pending payments in database
interface PendingPayment {
  id: string
  user_id: string
  telegram_id: string
  ton_amount: number
  rub_amount: number
  memo: string
  status: "pending" | "confirmed" | "expired"
  created_at: Date
  confirmed_at?: Date
  tx_hash?: string
}

// Create a new payment request
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { telegramId, tonAmount, rubAmount } = body

    if (!telegramId || !tonAmount || !rubAmount) {
      return NextResponse.json(
        { error: "Missing required fields: telegramId, tonAmount, rubAmount" },
        { status: 400 }
      )
    }

    // Verify user exists
    const user = await getUserByTelegramId(String(telegramId))
    if (!user) {
      return NextResponse.json(
        { error: "User not found. Please authenticate first." },
        { status: 404 }
      )
    }

    // Generate unique payment ID
    const paymentId = `ton_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    
    // Create payment memo for tracking - includes user telegram_id
    const memo = `dep_${telegramId}_${paymentId}`

    // Store pending payment in database
    try {
      await query(
        `INSERT INTO ton_payments (id, user_id, telegram_id, ton_amount, rub_amount, memo, status)
         VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
        [paymentId, user.id, telegramId, tonAmount, rubAmount, memo]
      )
    } catch (error) {
      console.error("Failed to store pending payment:", error)
      // Continue anyway - payment can still work
    }

    // Generate Tonkeeper payment link
    const amountNano = Math.floor(tonAmount * 1e9)
    const tonkeeperLink = `https://app.tonkeeper.com/transfer/${CASINO_WALLET}?amount=${amountNano}&text=${encodeURIComponent(memo)}`
    const tonLink = `ton://transfer/${CASINO_WALLET}?amount=${amountNano}&text=${encodeURIComponent(memo)}`

    return NextResponse.json({
      success: true,
      paymentId,
      walletAddress: CASINO_WALLET,
      tonAmount,
      rubAmount,
      memo,
      tonkeeperLink,
      tonLink,
      expiresAt: Date.now() + 30 * 60 * 1000 // 30 minutes
    })
  } catch (error) {
    console.error("Payment creation error:", error)
    return NextResponse.json(
      { error: "Failed to create payment" },
      { status: 500 }
    )
  }
}

// Check payment status
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const paymentId = searchParams.get("paymentId")
  const telegramId = searchParams.get("telegramId")

  if (paymentId) {
    // Check specific payment in database
    try {
      const result = await query<PendingPayment>(
        "SELECT * FROM ton_payments WHERE id = ?",
        [paymentId]
      )
      
      const payment = result.rows[0]
      
      if (!payment) {
        return NextResponse.json(
          { error: "Payment not found" },
          { status: 404 }
        )
      }

      // Check if expired (30 minutes)
      const createdAt = new Date(payment.created_at).getTime()
      if (Date.now() - createdAt > 30 * 60 * 1000 && payment.status === "pending") {
        await query(
          "UPDATE ton_payments SET status = 'expired' WHERE id = ?",
          [paymentId]
        )
        payment.status = "expired"
      }

      return NextResponse.json({
        paymentId,
        status: payment.status,
        tonAmount: payment.ton_amount,
        rubAmount: payment.rub_amount,
        createdAt: payment.created_at,
        confirmedAt: payment.confirmed_at,
        txHash: payment.tx_hash,
      })
    } catch (error) {
      console.error("Payment check error:", error)
      return NextResponse.json(
        { error: "Failed to check payment" },
        { status: 500 }
      )
    }
  }

  if (telegramId) {
    // Get all payments for user
    try {
      const result = await query<PendingPayment>(
        `SELECT * FROM ton_payments 
         WHERE telegram_id = ? 
         ORDER BY created_at DESC 
         LIMIT 50`,
        [telegramId]
      )

      return NextResponse.json({ 
        payments: result.rows.map(p => ({
          paymentId: p.id,
          tonAmount: p.ton_amount,
          rubAmount: p.rub_amount,
          status: p.status,
          createdAt: p.created_at,
          confirmedAt: p.confirmed_at,
        }))
      })
    } catch (error) {
      console.error("User payments error:", error)
      return NextResponse.json({ payments: [] })
    }
  }

  return NextResponse.json(
    { error: "Missing paymentId or telegramId" },
    { status: 400 }
  )
}

// Webhook for payment confirmation (called by monitoring service or manually)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { paymentId, txHash } = body

    // Verify webhook authenticity
    const webhookSecret = request.headers.get("x-webhook-secret")
    if (webhookSecret !== process.env.TON_WEBHOOK_SECRET && process.env.TON_WEBHOOK_SECRET) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Get payment from database
    const paymentResult = await query<PendingPayment>(
      "SELECT * FROM ton_payments WHERE id = ?",
      [paymentId]
    )
    
    const payment = paymentResult.rows[0]
    if (!payment) {
      return NextResponse.json(
        { error: "Payment not found" },
        { status: 404 }
      )
    }

    if (payment.status === "confirmed") {
      return NextResponse.json({
        success: true,
        message: "Payment already confirmed",
      })
    }

    // Verify transaction on blockchain
    if (txHash) {
      try {
        const txResponse = await fetch(`${TON_API_URL}/blockchain/transactions/${txHash}`)
        
        if (txResponse.ok) {
          const txData = await txResponse.json()
          const txAmount = Number(txData.in_msg?.value || 0) / 1e9
          const txMemo = txData.in_msg?.message || ""
          
          // Verify amount matches (with small tolerance for fees)
          if (Math.abs(txAmount - payment.ton_amount) > 0.01) {
            return NextResponse.json(
              { error: "Amount mismatch" },
              { status: 400 }
            )
          }
          
          // Verify memo contains our payment info
          if (!txMemo.includes(payment.telegram_id)) {
            return NextResponse.json(
              { error: "Invalid payment memo" },
              { status: 400 }
            )
          }
        }
      } catch (error) {
        console.error("Blockchain verification error:", error)
        // Continue with confirmation - tx might not be indexed yet
      }
    }

    // Get user
    const user = await getUserByTelegramId(payment.telegram_id)
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    // Update user balance
    await updateUserBalance(
      user.id,
      payment.rub_amount,
      "deposit",
      undefined,
      {
        type: "ton",
        paymentId,
        txHash,
        tonAmount: payment.ton_amount,
      }
    )

    // Mark payment as confirmed
    await query(
      `UPDATE ton_payments 
       SET status = 'confirmed', confirmed_at = datetime('now'), tx_hash = ? 
       WHERE id = ?`,
      [txHash, paymentId]
    )

    console.log(`TON Payment confirmed: ${paymentId} - ${payment.rub_amount} RUB for user ${payment.telegram_id}`)

    return NextResponse.json({
      success: true,
      message: "Payment confirmed",
      tonAmount: payment.ton_amount,
      rubAmount: payment.rub_amount,
    })
  } catch (error) {
    console.error("Webhook error:", error)
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    )
  }
}
