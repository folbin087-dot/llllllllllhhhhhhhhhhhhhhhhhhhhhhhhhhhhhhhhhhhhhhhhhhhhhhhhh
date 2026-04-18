"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Header from "@/components/header"
import Footer from "@/components/footer"
import { User, Users, Copy, TrendingUp, TrendingDown, DollarSign, History, Check, Loader2 } from "lucide-react"

interface UserData {
  id: string
  telegram_id: string
  username: string | null
  first_name: string
  last_name: string | null
  balance: number
  total_deposited: number
  total_withdrawn: number
  total_wagered: number
  total_won: number
  referral_code: string
  created_at: string
}

interface Transaction {
  type: string
  game: string | null
  amount: number
  created_at: string
}

interface TelegramWebApp {
  initDataUnsafe: {
    user?: {
      id: number
      first_name: string
      username?: string
    }
  }
}

declare global {
  interface Window {
    Telegram?: {
      WebApp?: TelegramWebApp
    }
  }
}

export default function ProfilePage() {
  const [copied, setCopied] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<UserData | null>(null)
  const [recentActivity, setRecentActivity] = useState<Transaction[]>([])
  const [error, setError] = useState<string | null>(null)

  // Load user data
  useEffect(() => {
    const loadUserData = async () => {
      try {
        let telegramId: string | null = null
        
        // Try to get from Telegram WebApp
        if (typeof window !== "undefined" && window.Telegram?.WebApp?.initDataUnsafe?.user?.id) {
          telegramId = String(window.Telegram.WebApp.initDataUnsafe.user.id)
        } else {
          // Fallback to localStorage
          telegramId = localStorage.getItem("telegram_user_id")
        }
        
        if (!telegramId) {
          setError("Пожалуйста, откройте приложение через Telegram")
          setIsLoading(false)
          return
        }
        
        // Fetch user data from API
        const response = await fetch(`/api/auth/telegram?telegramId=${telegramId}`)
        const data = await response.json()
        
        if (data.success && data.user) {
          setUser(data.user)
          
          // Fetch recent transactions
          try {
            const txResponse = await fetch(`/api/user/transactions?telegramId=${telegramId}&limit=10`)
            const txData = await txResponse.json()
            if (txData.transactions) {
              setRecentActivity(txData.transactions)
            }
          } catch (txError) {
            console.error("Failed to load transactions:", txError)
          }
        } else {
          setError("Пользователь не найден")
        }
      } catch (err) {
        console.error("Failed to load user data:", err)
        setError("Ошибка загрузки данных")
      } finally {
        setIsLoading(false)
      }
    }
    
    loadUserData()
  }, [])

  const copyCode = () => {
    if (user?.referral_code) {
      navigator.clipboard.writeText(user.referral_code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }
  
  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    
    if (diff < 60000) return "только что"
    if (diff < 3600000) return `${Math.floor(diff / 60000)} мин назад`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} ч назад`
    return date.toLocaleDateString("ru-RU")
  }
  
  const getActivityLabel = (type: string, game: string | null) => {
    if (type === "deposit") return "Депозит"
    if (type === "withdraw") return "Вывод"
    if (type === "bonus") return "Бонус"
    if (type === "referral") return "Реферал"
    return game || type
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-[#2ee06e] animate-spin" />
            <p className="text-sm text-muted-foreground">Загрузка профиля...</p>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  if (error || !user) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center px-4">
          <div className="text-center">
            <User className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-xl font-bold text-foreground mb-2">
              {error || "Профиль недоступен"}
            </h1>
            <p className="text-sm text-muted-foreground mb-4">
              Для просмотра профиля откройте приложение через Telegram бота
            </p>
            <a
              href="https://t.me/plaid_casino_bot"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-[#2aabee] hover:bg-[#2aabee]/80 text-white font-bold text-sm px-4 py-2 rounded-lg transition-colors"
            >
              Открыть бота
            </a>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-4 flex flex-col gap-4">
        {/* Profile Header */}
        <div className="bg-card rounded-xl border border-border/50 p-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-[#2ee06e]/20 flex items-center justify-center">
              <User className="w-8 h-8 text-[#2ee06e]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">
                {user.first_name} {user.last_name || ""}
              </h1>
              {user.username && (
                <p className="text-sm text-muted-foreground">@{user.username}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Зарегистрирован: {new Date(user.created_at).toLocaleDateString("ru-RU")}
              </p>
            </div>
          </div>

          {/* Balance */}
          <div className="mt-4 bg-secondary rounded-xl p-3 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-muted-foreground">Баланс</p>
              <p className="text-lg font-bold text-[#2ee06e]">{user.balance.toFixed(2)} ₽</p>
            </div>
            <div className="flex gap-1.5">
              <Link
                href="/deposit"
                className="bg-[#2ee06e] hover:bg-[#25c45c] text-[#0f1923] font-semibold text-xs px-3 py-1.5 rounded-md transition-colors"
              >
                Пополнить
              </Link>
              <button className="bg-background border border-border hover:bg-border text-foreground font-semibold text-xs px-3 py-1.5 rounded-md transition-colors">
                Вывести
              </button>
            </div>
          </div>

          {/* Referral code */}
          <div className="mt-3 flex items-center gap-2">
            <div className="flex-1 bg-secondary rounded-lg px-3 py-2 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-muted-foreground">Реферальный код</p>
                <p className="text-sm font-semibold text-foreground">{user.referral_code}</p>
              </div>
              <button
                onClick={copyCode}
                className="p-1.5 rounded-md hover:bg-border transition-colors"
                aria-label="Copy code"
              >
                {copied ? <Check className="w-4 h-4 text-[#2ee06e]" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
              </button>
            </div>
          </div>
        </div>

        {/* Partner Program Banner */}
        <Link 
          href="/partner"
          className="block bg-gradient-to-r from-[#2ee06e]/10 via-[#00b4d8]/10 to-[#ffd93d]/10 border border-[#2ee06e]/30 rounded-xl p-4 hover:from-[#2ee06e]/20 hover:via-[#00b4d8]/20 hover:to-[#ffd93d]/20 transition-colors group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#2ee06e]/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-[#2ee06e]" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  Партнерская программа
                  <span className="text-[10px] bg-[#ffd93d]/20 text-[#ffd93d] px-1.5 py-0.5 rounded font-semibold">5%</span>
                </h3>
                <p className="text-xs text-muted-foreground">
                  Зарабатывайте с проигрышей ваших рефералов
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-[#2ee06e] group-hover:translate-x-1 transition-transform">
              <span className="text-xs font-semibold">Открыть</span>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </Link>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-card rounded-xl border border-border/50 p-4 flex flex-col items-center">
            <TrendingUp className="w-5 h-5 text-[#2ee06e] mb-1" />
            <p className="text-xs text-muted-foreground">Выигрыши</p>
            <p className="text-lg font-bold text-[#2ee06e]">{user.total_won.toFixed(0)} ₽</p>
          </div>
          <div className="bg-card rounded-xl border border-border/50 p-4 flex flex-col items-center">
            <TrendingDown className="w-5 h-5 text-destructive mb-1" />
            <p className="text-xs text-muted-foreground">Ставки</p>
            <p className="text-lg font-bold text-destructive">{user.total_wagered.toFixed(0)} ₽</p>
          </div>
          <div className="bg-card rounded-xl border border-border/50 p-4 flex flex-col items-center">
            <DollarSign className="w-5 h-5 text-[#00b4d8] mb-1" />
            <p className="text-xs text-muted-foreground">Депозиты</p>
            <p className="text-lg font-bold text-[#00b4d8]">{user.total_deposited.toFixed(0)} ₽</p>
          </div>
          <div className="bg-card rounded-xl border border-border/50 p-4 flex flex-col items-center">
            <DollarSign className="w-5 h-5 text-[#ffd93d] mb-1" />
            <p className="text-xs text-muted-foreground">Выводы</p>
            <p className="text-lg font-bold text-[#ffd93d]">{user.total_withdrawn.toFixed(0)} ₽</p>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-card rounded-xl border border-border/50 p-4">
          <div className="flex items-center gap-2 mb-3">
            <History className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Последняя активность</h2>
          </div>
          {recentActivity.length > 0 ? (
            <div className="flex flex-col gap-2">
              {recentActivity.map((item, i) => (
                <div key={i} className="flex items-center justify-between bg-secondary rounded-lg px-3 py-2">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        item.type === "win" || item.type === "deposit" || item.type === "bonus" 
                          ? "bg-[#2ee06e]" 
                          : "bg-destructive"
                      }`}
                    />
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {getActivityLabel(item.type, item.game)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{formatTime(item.created_at)}</p>
                    </div>
                  </div>
                  <span
                    className={`text-sm font-bold ${
                      item.amount > 0 ? "text-[#2ee06e]" : "text-destructive"
                    }`}
                  >
                    {item.amount > 0 ? "+" : ""}{item.amount.toFixed(2)} ₽
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              История транзакций пуста
            </p>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}
