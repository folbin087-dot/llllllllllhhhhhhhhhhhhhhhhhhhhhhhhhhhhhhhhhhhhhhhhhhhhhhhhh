"use client"

// Tonkeeper API Integration for TON payments
// This library handles TON wallet connections and automatic payments

export interface TonWallet {
  address: string
  publicKey: string
  balance: number
}

export interface TonTransaction {
  id: string
  from: string
  to: string
  amount: number
  timestamp: number
  status: "pending" | "confirmed" | "failed"
  memo?: string
}

export interface PaymentRequest {
  amount: number
  toAddress: string
  memo?: string
  userId: string
}

// TON blockchain constants
const TON_API_URL = "https://tonapi.io/v2"
const TONKEEPER_CONNECT_URL = "https://app.tonkeeper.com/ton-connect"

// Casino wallet address (should be set in config)
const CASINO_WALLET_ADDRESS = process.env.NEXT_PUBLIC_CASINO_TON_WALLET || ""

// Convert TON to nanoTON
export function toNano(amount: number): string {
  return (amount * 1e9).toString()
}

// Convert nanoTON to TON
export function fromNano(amount: string | number): number {
  return Number(amount) / 1e9
}

// Generate a unique payment ID for tracking
export function generatePaymentId(): string {
  return `pay_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

// Create a Tonkeeper deep link for payment
export function createTonkeeperPaymentLink(params: {
  address: string
  amount: number
  memo?: string
}): string {
  const { address, amount, memo } = params
  const amountNano = toNano(amount)
  
  let link = `https://app.tonkeeper.com/transfer/${address}?amount=${amountNano}`
  
  if (memo) {
    link += `&text=${encodeURIComponent(memo)}`
  }
  
  return link
}

// Create a ton:// protocol link (works with any TON wallet)
export function createTonPaymentLink(params: {
  address: string
  amount: number
  memo?: string
}): string {
  const { address, amount, memo } = params
  const amountNano = toNano(amount)
  
  let link = `ton://transfer/${address}?amount=${amountNano}`
  
  if (memo) {
    link += `&text=${encodeURIComponent(memo)}`
  }
  
  return link
}

// Tonkeeper Connect class for wallet integration
export class TonkeeperConnect {
  private connected: boolean = false
  private wallet: TonWallet | null = null
  private onConnectCallback: ((wallet: TonWallet) => void) | null = null
  private onDisconnectCallback: (() => void) | null = null

  constructor() {
    // Check for existing connection in localStorage
    if (typeof window !== "undefined") {
      const savedWallet = localStorage.getItem("tonkeeper_wallet")
      if (savedWallet) {
        try {
          this.wallet = JSON.parse(savedWallet)
          this.connected = true
        } catch (e) {
          localStorage.removeItem("tonkeeper_wallet")
        }
      }
    }
  }

  // Check if wallet is connected
  isConnected(): boolean {
    return this.connected && this.wallet !== null
  }

  // Get connected wallet
  getWallet(): TonWallet | null {
    return this.wallet
  }

  // Set connection callback
  onConnect(callback: (wallet: TonWallet) => void): void {
    this.onConnectCallback = callback
  }

  // Set disconnection callback
  onDisconnect(callback: () => void): void {
    this.onDisconnectCallback = callback
  }

  // Generate TON Connect manifest URL
  getManifestUrl(): string {
    if (typeof window !== "undefined") {
      return `${window.location.origin}/tonconnect-manifest.json`
    }
    return ""
  }

  // Connect to Tonkeeper wallet
  async connect(): Promise<TonWallet | null> {
    try {
      // Open Tonkeeper Connect
      const connectUrl = `${TONKEEPER_CONNECT_URL}?v=2&id=${generatePaymentId()}&r=${encodeURIComponent(this.getManifestUrl())}`
      
      // For demo purposes, simulate a connection
      // In production, this would open Tonkeeper and handle the OAuth flow
      const simulatedWallet: TonWallet = {
        address: "EQ" + Math.random().toString(36).substring(2, 50).toUpperCase(),
        publicKey: Math.random().toString(36).substring(2, 66),
        balance: 0
      }
      
      this.wallet = simulatedWallet
      this.connected = true
      
      // Save to localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem("tonkeeper_wallet", JSON.stringify(simulatedWallet))
      }
      
      if (this.onConnectCallback) {
        this.onConnectCallback(simulatedWallet)
      }
      
      return simulatedWallet
    } catch (error) {
      console.error("Failed to connect to Tonkeeper:", error)
      return null
    }
  }

  // Disconnect wallet
  disconnect(): void {
    this.wallet = null
    this.connected = false
    
    if (typeof window !== "undefined") {
      localStorage.removeItem("tonkeeper_wallet")
    }
    
    if (this.onDisconnectCallback) {
      this.onDisconnectCallback()
    }
  }

  // Request payment
  async requestPayment(params: PaymentRequest): Promise<{ success: boolean; txId?: string; error?: string }> {
    if (!this.connected || !this.wallet) {
      return { success: false, error: "Wallet not connected" }
    }

    try {
      const paymentId = generatePaymentId()
      const memo = params.memo || `Casino deposit: ${paymentId}`
      
      // Create payment link
      const paymentLink = createTonkeeperPaymentLink({
        address: params.toAddress || CASINO_WALLET_ADDRESS,
        amount: params.amount,
        memo
      })
      
      // Open Tonkeeper for payment
      if (typeof window !== "undefined") {
        window.open(paymentLink, "_blank")
      }
      
      return { success: true, txId: paymentId }
    } catch (error) {
      console.error("Payment request failed:", error)
      return { success: false, error: "Payment request failed" }
    }
  }

  // Get wallet balance
  async getBalance(): Promise<number> {
    if (!this.wallet) return 0
    
    try {
      const response = await fetch(`${TON_API_URL}/accounts/${this.wallet.address}`)
      if (response.ok) {
        const data = await response.json()
        return fromNano(data.balance || 0)
      }
    } catch (error) {
      console.error("Failed to get balance:", error)
    }
    
    return 0
  }
}

// Singleton instance
let tonkeeperInstance: TonkeeperConnect | null = null

export function getTonkeeper(): TonkeeperConnect {
  if (!tonkeeperInstance) {
    tonkeeperInstance = new TonkeeperConnect()
  }
  return tonkeeperInstance
}

// API functions for server-side payment verification
export async function verifyTransaction(txHash: string): Promise<TonTransaction | null> {
  try {
    const response = await fetch(`${TON_API_URL}/blockchain/transactions/${txHash}`)
    if (response.ok) {
      const data = await response.json()
      return {
        id: data.hash,
        from: data.in_msg?.source?.address || "",
        to: data.in_msg?.destination?.address || "",
        amount: fromNano(data.in_msg?.value || 0),
        timestamp: data.utime * 1000,
        status: "confirmed",
        memo: data.in_msg?.message || ""
      }
    }
  } catch (error) {
    console.error("Failed to verify transaction:", error)
  }
  return null
}

// Check for incoming transactions to casino wallet
export async function checkIncomingTransactions(
  walletAddress: string,
  sinceTimestamp?: number
): Promise<TonTransaction[]> {
  try {
    const response = await fetch(
      `${TON_API_URL}/blockchain/accounts/${walletAddress}/transactions?limit=100`
    )
    if (response.ok) {
      const data = await response.json()
      const transactions: TonTransaction[] = data.transactions
        ?.filter((tx: any) => {
          const txTime = tx.utime * 1000
          return !sinceTimestamp || txTime > sinceTimestamp
        })
        .map((tx: any) => ({
          id: tx.hash,
          from: tx.in_msg?.source?.address || "",
          to: tx.in_msg?.destination?.address || "",
          amount: fromNano(tx.in_msg?.value || 0),
          timestamp: tx.utime * 1000,
          status: "confirmed" as const,
          memo: tx.in_msg?.message || ""
        })) || []
      
      return transactions
    }
  } catch (error) {
    console.error("Failed to check incoming transactions:", error)
  }
  return []
}

// Parse payment memo to extract user ID
export function parsePaymentMemo(memo: string): { userId?: string; paymentId?: string } {
  const result: { userId?: string; paymentId?: string } = {}
  
  // Try to extract user ID from memo
  const userIdMatch = memo.match(/user[_:]?(\d+)/i)
  if (userIdMatch) {
    result.userId = userIdMatch[1]
  }
  
  // Try to extract payment ID
  const paymentIdMatch = memo.match(/pay_[\w]+/)
  if (paymentIdMatch) {
    result.paymentId = paymentIdMatch[0]
  }
  
  return result
}

// Calculate RUB to TON conversion (simplified - in production use real exchange rates)
export async function getRubToTonRate(): Promise<number> {
  try {
    // In production, fetch from a real exchange API
    // For now, use approximate rate
    return 250 // 1 TON ≈ 250 RUB (example rate)
  } catch (error) {
    console.error("Failed to get exchange rate:", error)
    return 250
  }
}

export function rubToTon(rubAmount: number, rate: number = 250): number {
  return rubAmount / rate
}

export function tonToRub(tonAmount: number, rate: number = 250): number {
  return tonAmount * rate
}
