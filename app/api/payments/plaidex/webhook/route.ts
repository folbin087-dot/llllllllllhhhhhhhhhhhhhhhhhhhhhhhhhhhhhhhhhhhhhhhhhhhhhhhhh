import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { getUserByTelegramId, updateUserBalance, query } from "@/lib/db"

// PLAIDEX Webhook Handler
// Receives payment confirmations and updates user balances

const PLAIDEX_API_SECRET = process.env.PLAIDEX_API_SECRET || ""

interface WebhookPayload {
  event?: string
  invoice_id?: string
  payment_id?: string
  order_id: string
  amount: number
  currency: string
  status: string
  paid_at?: string
  customer_id?: string
  metadata?: Record<string, string>
  signature?: string
  timestamp?: number
}

// Verify webhook signature using timing-safe comparison
function verifySignature(payload: string, signature: string, timestamp: string): boolean {
  if (!PLAIDEX_API_SECRET) return true // Allow in demo mode
  
  const expectedSignature = crypto
    .createHmac("sha256", PLAIDEX_API_SECRET)
    .update(`${timestamp}.${payload}`)
    .digest("hex")
  
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    )
  } catch {
    return false
  }
}

// Process successful payment - update user balance
async function processPayment(payload: WebhookPayload): Promise<boolean> {
  try {
    const amountRubles = payload.amount > 1000 ? payload.amount / 100 : payload.amount // Handle kopecks
    
    console.log("Processing successful SBP payment:", {
      orderId: payload.order_id,
      invoiceId: payload.invoice_id || payload.payment_id,
      amount: amountRubles,
      customerId: payload.customer_id,
      paidAt: payload.paid_at,
    })
    
    // Extract telegram_id from customer_id or order_id
    let telegramId: string | null = null
    
    // customer_id format: "telegram_123456789" or just "123456789"
    if (payload.customer_id && !payload.customer_id.startsWith("guest")) {
      telegramId = payload.customer_id.replace(/^telegram_/, "")
    }
    
    // Also try to extract from metadata
    if (!telegramId && payload.metadata?.user_id) {
      telegramId = payload.metadata.user_id
    }
    
    if (!telegramId) {
      console.error("Cannot process payment: No telegram_id found in payload")
      return false
    }
    
    // Get user from database
    const user = await getUserByTelegramId(telegramId)
    
    if (!user) {
      console.error(`Cannot process payment: User not found for telegram_id ${telegramId}`)
      return false
    }
    
    // Check if this payment was already processed
    const existingPayment = await query(
      `SELECT id FROM sbp_payments WHERE order_id = $1 AND status = 'confirmed'`,
      [payload.order_id]
    )
    
    if (existingPayment.rows.length > 0) {
      console.log(`Payment ${payload.order_id} already processed, skipping`)
      return true
    }
    
    // Update user balance
    await updateUserBalance(
      user.id,
      amountRubles,
      "deposit",
      undefined,
      { 
        orderId: payload.order_id, 
        invoiceId: payload.invoice_id || payload.payment_id,
        method: "sbp",
        paidAt: payload.paid_at,
      }
    )
    
    // Record payment in database
    await query(
      `INSERT INTO sbp_payments (order_id, user_id, telegram_id, amount, status, invoice_id, paid_at)
       VALUES ($1, $2, $3, $4, 'confirmed', $5, NOW())
       ON CONFLICT (order_id) DO UPDATE SET status = 'confirmed', paid_at = NOW()`,
      [payload.order_id, user.id, telegramId, amountRubles, payload.invoice_id || payload.payment_id]
    )
    
    console.log(`Balance updated for user ${telegramId}: +${amountRubles} RUB via SBP`)
    
    return true
  } catch (error) {
    console.error("Error processing SBP payment:", error)
    return false
  }
}

// Handle refund
async function processRefund(payload: WebhookPayload): Promise<boolean> {
  try {
    const amountRubles = payload.amount > 1000 ? payload.amount / 100 : payload.amount
    
    console.log("Processing refund:", {
      orderId: payload.order_id,
      amount: amountRubles,
    })
    
    // Find original payment
    const paymentResult = await query<{ user_id: string; telegram_id: string }>(
      `SELECT user_id, telegram_id FROM sbp_payments WHERE order_id = $1`,
      [payload.order_id]
    )
    
    if (paymentResult.rows.length === 0) {
      console.error(`Original payment not found for refund: ${payload.order_id}`)
      return false
    }
    
    const { user_id, telegram_id } = paymentResult.rows[0]
    
    // Deduct from user balance
    await updateUserBalance(
      user_id,
      -amountRubles,
      "withdraw",
      undefined,
      {
        type: "refund",
        orderId: payload.order_id,
      }
    )
    
    // Update payment status
    await query(
      `UPDATE sbp_payments SET status = 'refunded' WHERE order_id = $1`,
      [payload.order_id]
    )
    
    console.log(`Refund processed for user ${telegram_id}: -${amountRubles} RUB`)
    
    return true
  } catch (error) {
    console.error("Error processing refund:", error)
    return false
  }
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text()
    
    // Get signature headers
    const signature = request.headers.get("X-Signature") || 
                     request.headers.get("x-signature") ||
                     request.headers.get("X-PLAIDEX-Signature")
    const timestamp = request.headers.get("X-Timestamp") || 
                     request.headers.get("x-timestamp") ||
                     String(Math.floor(Date.now() / 1000))
    
    // Parse payload
    let payload: WebhookPayload
    try {
      payload = JSON.parse(rawBody)
    } catch {
      console.error("PLAIDEX Webhook: Invalid JSON payload")
      return NextResponse.json(
        { success: false, error: "Invalid JSON payload" },
        { status: 400 }
      )
    }

    // Verify signature in production
    if (signature && PLAIDEX_API_SECRET) {
      const isValid = verifySignature(rawBody, signature, timestamp)
      if (!isValid) {
        console.error("PLAIDEX Webhook: Invalid signature")
        return NextResponse.json(
          { success: false, error: "Invalid signature" },
          { status: 401 }
        )
      }
    }

    // Log webhook receipt
    console.log("PLAIDEX Webhook received:", {
      event: payload.event || payload.status,
      invoiceId: payload.invoice_id || payload.payment_id,
      orderId: payload.order_id,
      status: payload.status,
      amount: payload.amount,
      customerId: payload.customer_id,
    })

    // Determine event type from various possible formats
    const eventType = (payload.event || payload.status || "").toLowerCase()

    // Handle payment events
    if (["payment.success", "payment.completed", "paid", "success", "completed", "confirmed"].includes(eventType)) {
      const processed = await processPayment(payload)
      if (!processed) {
        console.error("Failed to process payment, but acknowledging webhook")
      }
    } else if (["payment.failed", "failed", "cancelled", "expired", "rejected"].includes(eventType)) {
      console.log("Payment failed/cancelled:", {
        orderId: payload.order_id,
        status: eventType,
      })
      
      // Update payment status in database
      await query(
        `UPDATE sbp_payments SET status = $2 WHERE order_id = $1`,
        [payload.order_id, eventType]
      ).catch(() => {})
      
    } else if (["payment.pending", "pending", "processing", "waiting"].includes(eventType)) {
      console.log("Payment pending:", payload.order_id)
    } else if (["payment.refunded", "refunded", "refund"].includes(eventType)) {
      await processRefund(payload)
    } else {
      console.log("Unknown webhook event type:", eventType)
    }

    // Always return 200 to acknowledge receipt
    return NextResponse.json({ 
      success: true, 
      message: "Webhook processed",
      orderId: payload.order_id,
      timestamp: new Date().toISOString(),
    })

  } catch (error) {
    console.error("Webhook processing error:", error)
    // Return 200 to prevent infinite retries
    return NextResponse.json(
      { success: false, error: "Internal error", acknowledged: true },
      { status: 200 }
    )
  }
}

// GET endpoint for webhook verification
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const challenge = searchParams.get("challenge") || searchParams.get("hub.challenge")
  
  if (challenge) {
    return new NextResponse(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain" }
    })
  }
  
  return NextResponse.json({ 
    status: "active", 
    service: "PlaidCas Payment Webhook",
    provider: "PLAIDEX",
    timestamp: new Date().toISOString(),
  })
}
