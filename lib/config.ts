// Casino Bot Configuration System
// All sensitive data should be stored in environment variables

export interface BotConfig {
  // Telegram Bot Settings
  botToken: string
  botUsername: string
  
  // Admin Settings
  adminIds: string[]
  superAdminIds: string[]
  
  // Casino Settings
  casinoName: string
  minBet: number
  maxBet: number
  defaultBalance: number
  
  // Payment Settings
  tonWalletAddress: string
  sbpPhoneNumber: string
  sbpBankName: string
  rubToTonRate: number
  minDeposit: number
  maxDeposit: number
  
  // Game Settings
  houseEdge: number
  maxWinMultiplier: number
  
  // Feature Flags
  enableTonPayments: boolean
  enableSbpPayments: boolean
  enableBonuses: boolean
  enableReferrals: boolean
  maintenanceMode: boolean
}

// Default configuration (override with environment variables)
const defaultConfig: BotConfig = {
  // Telegram Bot Settings
  botToken: process.env.TELEGRAM_BOT_TOKEN || "",
  botUsername: process.env.TELEGRAM_BOT_USERNAME || "CasinoBot",
  
  // Admin Settings - comma-separated Telegram user IDs
  adminIds: (process.env.ADMIN_IDS || "").split(",").filter(Boolean),
  superAdminIds: (process.env.SUPER_ADMIN_IDS || "").split(",").filter(Boolean),
  
  // Casino Settings
  casinoName: process.env.CASINO_NAME || "Lucky Casino",
  minBet: Number(process.env.MIN_BET) || 10,
  maxBet: Number(process.env.MAX_BET) || 100000,
  defaultBalance: Number(process.env.DEFAULT_BALANCE) || 1000,
  
  // Payment Settings
  tonWalletAddress: process.env.CASINO_TON_WALLET || "",
  sbpPhoneNumber: process.env.SBP_PHONE_NUMBER || "",
  sbpBankName: process.env.SBP_BANK_NAME || "Сбербанк",
  rubToTonRate: Number(process.env.RUB_TO_TON_RATE) || 250,
  minDeposit: Number(process.env.MIN_DEPOSIT) || 100,
  maxDeposit: Number(process.env.MAX_DEPOSIT) || 500000,
  
  // Game Settings
  houseEdge: Number(process.env.HOUSE_EDGE) || 0.03, // 3% house edge
  maxWinMultiplier: Number(process.env.MAX_WIN_MULTIPLIER) || 100,
  
  // Feature Flags
  enableTonPayments: process.env.ENABLE_TON_PAYMENTS !== "false",
  enableSbpPayments: process.env.ENABLE_SBP_PAYMENTS !== "false",
  enableBonuses: process.env.ENABLE_BONUSES !== "false",
  enableReferrals: process.env.ENABLE_REFERRALS !== "false",
  maintenanceMode: process.env.MAINTENANCE_MODE === "true",
}

// Get current configuration
export function getConfig(): BotConfig {
  return { ...defaultConfig }
}

// Check if user is admin
export function isAdmin(userId: string | number): boolean {
  const config = getConfig()
  const id = String(userId)
  return config.adminIds.includes(id) || config.superAdminIds.includes(id)
}

// Check if user is super admin
export function isSuperAdmin(userId: string | number): boolean {
  const config = getConfig()
  return config.superAdminIds.includes(String(userId))
}

// Validate bet amount
export function validateBet(amount: number): { valid: boolean; error?: string } {
  const config = getConfig()
  
  if (amount < config.minBet) {
    return { valid: false, error: `Минимальная ставка: ${config.minBet} руб.` }
  }
  
  if (amount > config.maxBet) {
    return { valid: false, error: `Максимальная ставка: ${config.maxBet} руб.` }
  }
  
  return { valid: true }
}

// Validate deposit amount
export function validateDeposit(amount: number): { valid: boolean; error?: string } {
  const config = getConfig()
  
  if (amount < config.minDeposit) {
    return { valid: false, error: `Минимальный депозит: ${config.minDeposit} руб.` }
  }
  
  if (amount > config.maxDeposit) {
    return { valid: false, error: `Максимальный депозит: ${config.maxDeposit} руб.` }
  }
  
  return { valid: true }
}

// Calculate win with house edge
export function calculateWin(betAmount: number, multiplier: number): number {
  const config = getConfig()
  const grossWin = betAmount * multiplier
  const netWin = grossWin * (1 - config.houseEdge)
  return Math.floor(netWin)
}

// Environment variable template for .env.local
export const envTemplate = `
# ===========================================
# Casino Bot Configuration
# ===========================================

# Telegram Bot Settings
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_BOT_USERNAME=YourCasinoBot

# Admin Settings (comma-separated Telegram user IDs)
ADMIN_IDS=123456789,987654321
SUPER_ADMIN_IDS=123456789

# Casino Settings
CASINO_NAME=Lucky Casino
MIN_BET=10
MAX_BET=100000
DEFAULT_BALANCE=1000

# Payment Settings
CASINO_TON_WALLET=EQxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SBP_PHONE_NUMBER=+79001234567
SBP_BANK_NAME=Сбербанк
RUB_TO_TON_RATE=250
MIN_DEPOSIT=100
MAX_DEPOSIT=500000

# Game Settings
HOUSE_EDGE=0.03
MAX_WIN_MULTIPLIER=100

# Feature Flags
ENABLE_TON_PAYMENTS=true
ENABLE_SBP_PAYMENTS=true
ENABLE_BONUSES=true
ENABLE_REFERRALS=true
MAINTENANCE_MODE=false

# TON Payment Webhook
TON_WEBHOOK_SECRET=your_webhook_secret_here
`.trim()

// Client-safe config (no sensitive data)
export interface PublicConfig {
  casinoName: string
  minBet: number
  maxBet: number
  minDeposit: number
  maxDeposit: number
  enableTonPayments: boolean
  enableSbpPayments: boolean
  enableBonuses: boolean
  maintenanceMode: boolean
}

export function getPublicConfig(): PublicConfig {
  const config = getConfig()
  return {
    casinoName: config.casinoName,
    minBet: config.minBet,
    maxBet: config.maxBet,
    minDeposit: config.minDeposit,
    maxDeposit: config.maxDeposit,
    enableTonPayments: config.enableTonPayments,
    enableSbpPayments: config.enableSbpPayments,
    enableBonuses: config.enableBonuses,
    maintenanceMode: config.maintenanceMode,
  }
}
