"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { User, Wallet, Menu, X, Gift, Users, Shield } from "lucide-react"

interface TelegramUser {
  id: number
  first_name: string
  last_name?: string
  username?: string
  language_code?: string
  is_premium?: boolean
}

interface TelegramWebApp {
  initData: string
  initDataUnsafe: {
    user?: TelegramUser
    query_id?: string
    auth_date?: number
    hash?: string
  }
  ready: () => void
  expand: () => void
  close: () => void
}

declare global {
  interface Window {
    Telegram?: {
      WebApp?: TelegramWebApp
    }
  }
}

// Admin IDs from environment
const ADMIN_IDS = (process.env.NEXT_PUBLIC_ADMIN_IDS || "").split(",").filter(Boolean)
const SUPER_ADMIN_IDS = (process.env.NEXT_PUBLIC_SUPER_ADMIN_IDS || "").split(",").filter(Boolean)

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [balance, setBalance] = useState(0)
  const [telegramUser, setTelegramUser] = useState<TelegramUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isPartner, setIsPartner] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  // Initialize Telegram WebApp and load user data
  useEffect(() => {
    const initTelegram = async () => {
      try {
        // Check if running inside Telegram WebApp
        if (typeof window !== "undefined" && window.Telegram?.WebApp) {
          const tg = window.Telegram.WebApp
          
          // Expand the WebApp to full height
          tg.expand()
          tg.ready()
          
          const initData = tg.initData
          const user = tg.initDataUnsafe?.user
          
          if (user) {
            setTelegramUser(user)
            
            // Check if user is admin
            const userId = String(user.id)
            if (ADMIN_IDS.includes(userId) || SUPER_ADMIN_IDS.includes(userId)) {
              setIsAdmin(true)
            }
            
            // Register/login user via API
            try {
              const response = await fetch("/api/auth/telegram", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  initData,
                  user: {
                    id: user.id,
                    first_name: user.first_name,
                    last_name: user.last_name || null,
                    username: user.username || null,
                    language_code: user.language_code,
                    is_premium: user.is_premium || false,
                  }
                })
              })
              
              const data = await response.json()
              if (data.success && data.user) {
                setBalance(data.user.balance || 0)
                setIsPartner(data.user.is_partner || false)
                // Store user data in localStorage for other components
                localStorage.setItem("telegram_user", JSON.stringify(data.user))
                localStorage.setItem("telegram_user_id", String(user.id))
              }
            } catch (error) {
              console.error("Failed to authenticate with Telegram:", error)
            }
          }
        } else {
          // Not in Telegram - try to load from localStorage
          const savedUser = localStorage.getItem("telegram_user")
          if (savedUser) {
            try {
              const userData = JSON.parse(savedUser)
              setBalance(userData.balance || 0)
              setIsPartner(userData.is_partner || false)
            } catch (e) {
              // Invalid data
            }
          }
          
          // For development/demo, allow full access
          if (process.env.NODE_ENV === "development" || ADMIN_IDS.length === 0) {
            setIsAdmin(true)
            setIsPartner(true)
          }
        }
      } finally {
        setIsLoading(false)
      }
    }
    
    initTelegram()
    
    // Listen for balance updates from other components
    const handleBalanceUpdate = (event: Event) => {
      const customEvent = event as CustomEvent
      if (customEvent.detail?.balance !== undefined) {
        setBalance(customEvent.detail.balance)
      }
    }
    
    // Listen for partner status updates
    const handlePartnerUpdate = (event: Event) => {
      const customEvent = event as CustomEvent
      if (customEvent.detail?.isPartner !== undefined) {
        setIsPartner(customEvent.detail.isPartner)
      }
    }
    
    window.addEventListener("balance-updated", handleBalanceUpdate)
    window.addEventListener("partner-updated", handlePartnerUpdate)
    
    return () => {
      window.removeEventListener("balance-updated", handleBalanceUpdate)
      window.removeEventListener("partner-updated", handlePartnerUpdate)
    }
  }, [])

  return (
    <header className="sticky top-0 z-50 bg-[#0d1620]/95 backdrop-blur-md border-b border-border">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-14">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="text-2xl font-black tracking-tight text-[#2ee06e]">
            PLAID
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1">
          <Link
            href="/"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-foreground/80 hover:text-foreground hover:bg-secondary transition-colors"
          >
            Игры
          </Link>
          <Link
            href="/bonus"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-foreground/80 hover:text-foreground hover:bg-secondary transition-colors"
          >
            <Gift className="w-4 h-4" />
            Бонусы
          </Link>
          {isPartner && (
            <Link
              href="/partner"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-[#2ee06e]/20 to-[#00b4d8]/20 text-[#2ee06e] hover:from-[#2ee06e]/30 hover:to-[#00b4d8]/30 border border-[#2ee06e]/30 transition-colors"
            >
              <Users className="w-4 h-4" />
              Партнерка
            </Link>
          )}
          {isAdmin && (
            <Link
              href="/admin"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-foreground/80 hover:text-foreground hover:bg-secondary transition-colors"
            >
              <Shield className="w-4 h-4" />
              Админ
            </Link>
          )}
        </nav>

        {/* Balance & Profile */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center bg-secondary rounded-md overflow-hidden">
            <div className="flex items-center gap-1 px-2 py-1.5">
              <Wallet className="w-3.5 h-3.5 text-[#2ee06e]" />
              <span className="text-xs font-semibold text-foreground max-w-[80px] truncate">
                {isLoading ? "..." : `${balance >= 10000 ? (balance/1000).toFixed(1) + 'K' : balance.toFixed(0)} ₽`}
              </span>
            </div>
            <Link
              href="/deposit"
              className="bg-[#2ee06e] hover:bg-[#25c45c] text-[#0f1923] px-2 py-1.5 text-xs font-bold transition-colors"
            >
              +
            </Link>
          </div>

          <Link
            href="/profile"
            className="flex items-center justify-center w-8 h-8 rounded-md bg-secondary hover:bg-secondary/80 transition-colors"
          >
            <User className="w-3.5 h-3.5 text-foreground/80" />
          </Link>

          {/* Telegram Link */}
          <a
            href="https://t.me/plaid_casino"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center justify-center w-8 h-8 rounded-md bg-[#2aabee]/20 hover:bg-[#2aabee]/30 transition-colors"
            aria-label="Telegram"
          >
            <svg className="w-3.5 h-3.5 text-[#2aabee]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
            </svg>
          </a>

          {/* Mobile Menu Toggle */}
          <button
            className="md:hidden flex items-center justify-center w-8 h-8 rounded-md bg-secondary hover:bg-secondary/80 transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Menu"
          >
            {mobileMenuOpen ? <X className="w-3.5 h-3.5" /> : <Menu className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#0d1620] border-t border-border">
          <nav className="flex flex-col p-2">
            <Link
              href="/"
              className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium text-foreground/80 hover:text-foreground hover:bg-secondary"
              onClick={() => setMobileMenuOpen(false)}
            >
              Игры
            </Link>
            <Link
              href="/bonus"
              className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium text-foreground/80 hover:text-foreground hover:bg-secondary"
              onClick={() => setMobileMenuOpen(false)}
            >
              <Gift className="w-4 h-4" />
              Бонусы
            </Link>
            {isPartner && (
              <Link
                href="/partner"
                className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium bg-gradient-to-r from-[#2ee06e]/10 to-[#00b4d8]/10 text-[#2ee06e] border border-[#2ee06e]/20"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Users className="w-4 h-4" />
                Партнерка
                <span className="ml-auto text-[10px] bg-[#ffd93d]/20 text-[#ffd93d] px-1.5 py-0.5 rounded font-semibold">5%</span>
              </Link>
            )}
            {isAdmin && (
              <Link
                href="/admin"
                className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium text-foreground/80 hover:text-foreground hover:bg-secondary"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Shield className="w-4 h-4" />
                Админ
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  )
}
