import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"

// PLAIDEX MERCHANT API Integration for SBP Payments
// Dashboard: https://app.plaidex.space/
// API Documentation: https://docs.plaidex.space/

const PLAIDEX_API_URL = "https://api.plaidex.space/v1"

// API credentials - MUST be set via environment variables only
// Set PLAIDEX_API_KEY and PLAIDEX_API_SECRET in your Vercel project environment variables
const PLAIDEX_API_KEY = process.env.PLAIDEX_API_KEY || ""
const PLAIDEX_API_SECRET = process.env.PLAIDEX_API_SECRET || ""

// Site URL for callbacks
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://plaidcas.live"

// Check if we have valid API credentials
const hasValidCredentials = PLAIDEX_API_KEY && PLAIDEX_API_KEY !== "YOUR_API_KEY_HERE" && PLAIDEX_API_KEY.length > 20

interface PaymentRequest {
  amount: number
  currency?: string
  description?: string
  method?: "sbp" | "card"
  telegramId?: string  // Telegram user ID for identification
  userId?: string      // Legacy support
  metadata?: Record<string, string>
}

interface PlaidexInvoiceResponse {
  success: boolean
  invoice_id?: string
  payment_url?: string
  qr_code?: string
  sbp_link?: string
  expires_at?: string
  error?: string
  message?: string
}

// Generate HMAC signature for API requests
function generateSignature(payload: string, timestamp: string): string {
  const signatureData = `${timestamp}.${payload}`
  return crypto
    .createHmac("sha256", PLAIDEX_API_SECRET)
    .update(signatureData)
    .digest("hex")
}

// Create SBP invoice via PLAIDEX
async function createSBPInvoice(
  amount: number,
  orderId: string,
  description: string,
  userId?: string
): Promise<PlaidexInvoiceResponse> {
  try {
    const timestamp = Math.floor(Date.now() / 1000).toString()
    
    // Use telegramId for proper user identification
    const customerId = telegramId || userId || `guest_${Date.now()}`
    
    const payload = {
      order_id: orderId,
      amount: Math.round(amount * 100), // Amount in kopecks
      currency: "RUB",
      payment_method: "sbp",
      description: description.substring(0, 255), // Max 255 chars
      customer_id: customerId,
      success_url: `${APP_URL}/deposit/success?orderId=${orderId}`,
      fail_url: `${APP_URL}/deposit/fail?orderId=${orderId}`,
      callback_url: `${APP_URL}/api/payments/plaidex/webhook`,
      lifetime: 1800, // 30 minutes
      metadata: {
        source: "plaidcas",
        user_id: customerId,
        telegram_id: telegramId || "",
      }
    }

    const payloadString = JSON.stringify(payload)
    const signature = generateSignature(payloadString, timestamp)

    const response = await fetch(`${PLAIDEX_API_URL}/invoices/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": PLAIDEX_API_KEY,
        "X-Timestamp": timestamp,
        "X-Signature": signature,
        "User-Agent": "PlaidCas/1.0",
      },
      body: payloadString,
    })

    const responseText = await response.text()
    let data: Record<string, unknown>
    
    try {
      data = JSON.parse(responseText)
    } catch {
      console.error("PLAIDEX: Failed to parse response:", responseText)
      return { success: false, error: "Invalid response from payment provider" }
    }

    if (!response.ok) {
      console.error("PLAIDEX API Error:", response.status, data)
      return { 
        success: false, 
        error: (data.message as string) || (data.error as string) || `API Error: ${response.status}` 
      }
    }

    // Handle successful response
    if (data.status === "success" || data.invoice_id || data.id) {
      return {
        success: true,
        invoice_id: (data.invoice_id as string) || (data.id as string),
        payment_url: data.payment_url as string | undefined,
        qr_code: data.qr_code as string | undefined,
        sbp_link: data.sbp_link as string | undefined,
        expires_at: data.expires_at as string | undefined,
      }
    }

    return { 
      success: false, 
      error: (data.message as string) || (data.error as string) || "Unknown error" 
    }
  } catch (error) {
    console.error("PLAIDEX createSBPInvoice error:", error)
    return { success: false, error: "Network error connecting to payment provider" }
  }
}

// Check invoice status
async function checkInvoiceStatus(invoiceId: string): Promise<{ 
  status: string
  paid: boolean
  amount?: number
  paidAt?: string 
}> {
  try {
    const timestamp = Math.floor(Date.now() / 1000).toString()
    const signature = generateSignature(invoiceId, timestamp)

    const response = await fetch(`${PLAIDEX_API_URL}/invoices/${invoiceId}`, {
      method: "GET",
      headers: {
        "X-Api-Key": PLAIDEX_API_KEY,
        "X-Timestamp": timestamp,
        "X-Signature": signature,
        "User-Agent": "PlaidCas/1.0",
      },
    })

    if (!response.ok) {
      return { status: "error", paid: false }
    }

    const data = await response.json()
    const isPaid = ["paid", "completed", "success", "confirmed"].includes(data.status?.toLowerCase())
    
    return {
      status: data.status || "unknown",
      paid: isPaid,
      amount: data.amount ? data.amount / 100 : undefined, // Convert from kopecks
      paidAt: data.paid_at || data.completed_at,
    }
  } catch (error) {
    console.error("PLAIDEX checkInvoiceStatus error:", error)
    return { status: "error", paid: false }
  }
}

// Input validation and sanitization
function sanitizeInput(input: string, maxLength = 100): string {
  return input
    .replace(/[<>'";&|`$(){}[\]\\]/g, "") // Remove potentially dangerous characters
    .substring(0, maxLength)
    .trim()
}

function validateAmount(amount: unknown): number | null {
  const num = typeof amount === "number" ? amount : parseFloat(String(amount))
  if (isNaN(num) || num < 100 || num > 500000) {
    return null
  }
  return Math.round(num * 100) / 100 // Round to 2 decimal places
}

export async function POST(request: NextRequest) {
  try {
    const body: PaymentRequest = await request.json()
    
    // Validate amount
    const validatedAmount = validateAmount(body.amount)
    if (validatedAmount === null) {
      return NextResponse.json(
        { success: false, error: "Сумма должна быть от 100 до 500 000 рублей" },
        { status: 400 }
      )
    }

    // Sanitize inputs
    const description = sanitizeInput(
      body.description || `Пополнение баланса ${validatedAmount} ₽`,
      255
    )
    const telegramId = body.telegramId ? sanitizeInput(String(body.telegramId), 50) : undefined
    const userId = body.userId ? sanitizeInput(body.userId, 50) : undefined

    // Generate unique order ID (timestamp + random string)
    const orderId = `sbp_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`
    
    // Check if API keys are properly configured
    if (!hasValidCredentials) {
      console.warn("PLAIDEX: API keys appear to be demo/placeholder values")
    }
    
    // Log API call for debugging (remove in production)
    console.log("[PLAIDEX] Creating invoice:", { amount: validatedAmount, orderId })

    // Create real SBP invoice via PLAIDEX
    const invoice = await createSBPInvoice(
      validatedAmount,
      orderId,
      description,
      userId
    )

    if (invoice.success) {
      return NextResponse.json({
        success: true,
        orderId,
        invoiceId: invoice.invoice_id,
        paymentUrl: invoice.payment_url,
        qrCode: invoice.qr_code,
        sbpLink: invoice.sbp_link,
        expiresAt: invoice.expires_at,
      })
    }

    return NextResponse.json(
      { success: false, error: invoice.error || "Ошибка создания платежа" },
      { status: 500 }
    )

  } catch (error) {
    console.error("Payment creation error:", error)
    return NextResponse.json(
      { success: false, error: "Внутренняя ошибка сервера" },
      { status: 500 }
    )
  }
}

// GET method for checking payment status
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const invoiceId = searchParams.get("invoiceId")
  const orderId = searchParams.get("orderId")

  if (!invoiceId && !orderId) {
    return NextResponse.json(
      { success: false, error: "Invoice ID or Order ID required" },
      { status: 400 }
    )
  }

  // Sanitize input
  const id = sanitizeInput((invoiceId || orderId) as string, 100)
  
  if (!id) {
    return NextResponse.json(
      { success: false, error: "Invalid ID format" },
      { status: 400 }
    )
  }

  const status = await checkInvoiceStatus(id)
  
  return NextResponse.json({
    success: true,
    invoiceId: id,
    ...status,
  })
}
