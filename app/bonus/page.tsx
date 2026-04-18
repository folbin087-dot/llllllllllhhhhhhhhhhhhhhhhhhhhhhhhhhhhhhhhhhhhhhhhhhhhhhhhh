"use client"

import { useState, useEffect, useCallback } from "react"
import Header from "@/components/header"
import Footer from "@/components/footer"
import { Gift, Clock, CheckCircle, Star, Coins, AlertCircle, ExternalLink, Users, Loader2 } from "lucide-react"
import Link from "next/link"

interface BonusState {
  dailyClaimed: boolean;
  dailyStreak: number;
  telegramClaimed: boolean;
  lastDailyClaimDate: string | null;
  claimedChannels: string[];
}

interface BonusChannel {
  id: string;
  name: string;
  username: string;
  type: "channel" | "group";
  reward: number;
  isActive: boolean;
}

const DAILY_REWARDS = [5, 10, 15, 20, 25, 30, 35] // Streak rewards

// Demo channels - in production these come from database API
const DEMO_CHANNELS: BonusChannel[] = [
  { id: "1", name: "PlaidCas Новости", username: "@plaidcas_news", type: "channel", reward: 15, isActive: true },
  { id: "2", name: "Чат игроков", username: "@plaidcas_chat", type: "group", reward: 10, isActive: true },
  { id: "3", name: "VIP Канал", username: "@plaidcas_vip", type: "channel", reward: 20, isActive: true },
]

export default function BonusPage() {
  const [bonusState, setBonusState] = useState<BonusState>({
    dailyClaimed: false,
    dailyStreak: 0,
    telegramClaimed: false,
    lastDailyClaimDate: null,
    claimedChannels: [],
  })
  const [timeLeft, setTimeLeft] = useState("")
  const [balance, setBalance] = useState(0)
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null)
  const [promoCode, setPromoCode] = useState("")
  const [promoError, setPromoError] = useState("")
  const [promoSuccess, setPromoSuccess] = useState("")
  const [bonusChannels, setBonusChannels] = useState<BonusChannel[]>(DEMO_CHANNELS)
  const [verifyingChannel, setVerifyingChannel] = useState<string | null>(null)
  const [telegramUserId, setTelegramUserId] = useState<number | null>(null)

  // Load bonus state from localStorage and detect Telegram user
  useEffect(() => {
    const savedState = localStorage.getItem("plaid_bonus_state")
    if (savedState) {
      const parsed = JSON.parse(savedState) as BonusState
      
      // Check if daily bonus should be reset (new day)
      const today = new Date().toDateString()
      if (parsed.lastDailyClaimDate !== today) {
        setBonusState({
          ...parsed,
          dailyClaimed: false,
          claimedChannels: parsed.claimedChannels || [],
        })
      } else {
        setBonusState({
          ...parsed,
          claimedChannels: parsed.claimedChannels || [],
        })
      }
    }
    
    // Detect Telegram WebApp user ID and load balance from API
    const loadUserData = async () => {
      let tgUserId: number | null = null
      
      if (typeof window !== "undefined") {
        const tg = (window as unknown as { Telegram?: { WebApp?: { initDataUnsafe?: { user?: { id: number } } } } }).Telegram?.WebApp
        if (tg?.initDataUnsafe?.user?.id) {
          tgUserId = tg.initDataUnsafe.user.id
          setTelegramUserId(tgUserId)
        } else {
          // Fallback to localStorage
          const savedId = localStorage.getItem("telegram_user_id")
          if (savedId) {
            tgUserId = parseInt(savedId)
            setTelegramUserId(tgUserId)
          }
        }
        
        // Load balance from API
        if (tgUserId) {
          try {
            const response = await fetch(`/api/auth/telegram?telegramId=${tgUserId}`)
            const data = await response.json()
            if (data.success && data.user) {
              setBalance(data.user.balance || 0)
            }
          } catch (error) {
            console.error("Failed to load user balance:", error)
          }
        }
      }
    }
    
    loadUserData()
  }, [])

  // Save bonus state to localStorage
  useEffect(() => {
    localStorage.setItem("plaid_bonus_state", JSON.stringify(bonusState))
  }, [bonusState])

  // Emit balance update event for header
  useEffect(() => {
    if (balance > 0) {
      window.dispatchEvent(new CustomEvent("balance-updated", { detail: { balance } }))
    }
  }, [balance])

  // Daily timer
  useEffect(() => {
    const update = () => {
      const now = new Date()
      const tomorrow = new Date(now)
      tomorrow.setHours(24, 0, 0, 0)
      const diff = tomorrow.getTime() - now.getTime()
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setTimeLeft(`${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`)
    }
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [])

  // Show notification
  const showNotification = useCallback((message: string, type: "success" | "error") => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 3000)
  }, [])

  // Claim daily bonus
  const claimDailyBonus = useCallback(() => {
    if (bonusState.dailyClaimed) return
    
    const today = new Date().toDateString()
    const yesterday = new Date(Date.now() - 86400000).toDateString()
    
    // Calculate streak
    let newStreak = 1
    if (bonusState.lastDailyClaimDate === yesterday) {
      newStreak = Math.min(bonusState.dailyStreak + 1, DAILY_REWARDS.length)
    }
    
    // Get reward based on streak
    const reward = DAILY_REWARDS[Math.min(newStreak - 1, DAILY_REWARDS.length - 1)]
    
    // Update balance
    setBalance((b) => parseFloat((b + reward).toFixed(2)))
    
    // Update bonus state
    setBonusState({
      ...bonusState,
      dailyClaimed: true,
      dailyStreak: newStreak,
      lastDailyClaimDate: today,
    })
    
    showNotification(`Получено ${reward} ₽! Серия: ${newStreak} дней`, "success")
  }, [bonusState, showNotification])

  // Claim Telegram bonus
  const claimTelegramBonus = useCallback(() => {
    if (bonusState.telegramClaimed) return
    
    // In real app, this would verify Telegram subscription
    const reward = 15
    
    setBalance((b) => parseFloat((b + reward).toFixed(2)))
    setBonusState({
      ...bonusState,
      telegramClaimed: true,
    })
    
    showNotification(`Получено ${reward} ₽ за подписку на Telegram!`, "success")
  }, [bonusState, showNotification])

  // Verify and claim channel bonus
  const verifyChannelSubscription = useCallback(async (channel: BonusChannel) => {
    if (bonusState.claimedChannels.includes(channel.id)) {
      showNotification("Бонус за этот канал уже получен", "error")
      return
    }
    
    setVerifyingChannel(channel.id)
    
    try {
      // In demo mode or without Telegram user ID, simulate verification
      if (!telegramUserId) {
        // Open channel link and simulate subscription
        window.open(`https://t.me/${channel.username.replace("@", "")}`, "_blank")
        
        // Wait 3 seconds then "verify"
        await new Promise(resolve => setTimeout(resolve, 3000))
        
        // Grant bonus
        setBalance((b) => parseFloat((b + channel.reward).toFixed(2)))
        setBonusState(prev => ({
          ...prev,
          claimedChannels: [...prev.claimedChannels, channel.id],
        }))
        showNotification(`Получено ${channel.reward} ₽ за подписку на ${channel.name}!`, "success")
        setVerifyingChannel(null)
        return
      }
      
      // Real verification via API
      const response = await fetch("/api/telegram/verify-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: telegramUserId,
          channelUsername: channel.username,
        }),
      })
      
      const data = await response.json()
      
      if (data.success && data.isMember) {
        // Grant bonus
        setBalance((b) => parseFloat((b + channel.reward).toFixed(2)))
        setBonusState(prev => ({
          ...prev,
          claimedChannels: [...prev.claimedChannels, channel.id],
        }))
        showNotification(`Получено ${channel.reward} ₽ за подписку на ${channel.name}!`, "success")
      } else if (data.success && !data.isMember) {
        showNotification("Вы не подписаны на канал. Подпишитесь и попробуйте снова.", "error")
      } else {
        showNotification(data.error || "Ошибка проверки подписки", "error")
      }
    } catch (error) {
      console.error("Channel verification error:", error)
      showNotification("Ошибка при проверке подписки", "error")
    }
    
    setVerifyingChannel(null)
  }, [bonusState.claimedChannels, telegramUserId, showNotification])

  // Apply promo code
  const applyPromoCode = useCallback(() => {
    setPromoError("")
    setPromoSuccess("")
    
    if (!promoCode.trim()) {
      setPromoError("Введите промо-код")
      return
    }
    
    const code = promoCode.toUpperCase().trim()
    
    // Check used codes
    const usedCodes = JSON.parse(localStorage.getItem("plaid_used_promos") || "[]") as string[]
    if (usedCodes.includes(code)) {
      setPromoError("Этот промо-код уже был использован")
      return
    }
    
    // Define promo codes
    const promoCodes: Record<string, number> = {
      "BONUS20": 20,
      "START30": 30,
      "WELCOME": 10,
      "VIP50": 50,
      "PLAID25": 25,
    }
    
    const reward = promoCodes[code]
    
    if (reward) {
      setBalance((b) => parseFloat((b + reward).toFixed(2)))
      
      // Save used code
      usedCodes.push(code)
      localStorage.setItem("plaid_used_promos", JSON.stringify(usedCodes))
      
      setPromoSuccess(`Промо-код применен! +${reward} ₽`)
      setPromoCode("")
      showNotification(`Получено ${reward} ₽ по промо-коду!`, "success")
    } else {
      setPromoError("Недействительный промо-код")
    }
  }, [promoCode, showNotification])

  const currentDailyReward = DAILY_REWARDS[Math.min(bonusState.dailyStreak, DAILY_REWARDS.length - 1)]

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-4 flex flex-col gap-4">
        {/* Notification */}
        {notification && (
          <div className={`fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg font-medium text-sm animate-pulse ${
            notification.type === "success" 
              ? "bg-[#2ee06e] text-[#0f1923]" 
              : "bg-destructive text-white"
          }`}>
            {notification.message}
          </div>
        )}

        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground">Бонусы</h1>
          <div className="bg-secondary px-3 py-1.5 rounded-lg">
            <span className="text-xs text-muted-foreground">Баланс: </span>
            <span className="text-sm font-bold text-[#2ee06e]">{balance.toFixed(2)} ₽</span>
          </div>
        </div>

        {/* Daily Bonus Timer */}
        <div className="bg-gradient-to-r from-[#2ee06e]/20 to-[#00b4d8]/20 rounded-xl border border-[#2ee06e]/30 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">До следующего бонуса</p>
              <p className="text-3xl font-black text-foreground tracking-wider">{timeLeft}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Серия</p>
              <p className="text-lg font-bold text-[#ffd93d]">{bonusState.dailyStreak} дней</p>
            </div>
          </div>
          
          {/* Streak progress */}
          <div className="mt-4 flex gap-1">
            {DAILY_REWARDS.map((reward, i) => (
              <div 
                key={i}
                className={`flex-1 h-2 rounded-full ${
                  i < bonusState.dailyStreak 
                    ? "bg-[#2ee06e]" 
                    : i === bonusState.dailyStreak && !bonusState.dailyClaimed
                      ? "bg-[#ffd93d] animate-pulse"
                      : "bg-secondary"
                }`}
              />
            ))}
          </div>
          <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
            {DAILY_REWARDS.map((r, i) => (
              <span key={i}>{r}₽</span>
            ))}
          </div>
        </div>

        {/* Bonus Cards */}
        <div className="grid gap-3">
          {/* Daily Bonus */}
          <div className="bg-card rounded-xl border border-border/50 p-4 flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-[#2ee06e]/20"
            >
              <Clock className="w-6 h-6 text-[#2ee06e]" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-foreground">Ежедневный бонус</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Получайте бонус каждый день! Серия увеличивает сумму награды.
              </p>
            </div>
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              <span className="text-sm font-bold text-[#2ee06e]">
                {currentDailyReward} ₽
              </span>
              <button
                onClick={claimDailyBonus}
                disabled={bonusState.dailyClaimed}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                  bonusState.dailyClaimed
                    ? "bg-secondary text-muted-foreground cursor-not-allowed"
                    : "bg-[#2ee06e] text-[#0f1923] hover:bg-[#25c45c]"
                }`}
              >
                {bonusState.dailyClaimed ? (
                  <span className="flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Получено
                  </span>
                ) : (
                  "Получить"
                )}
              </button>
            </div>
          </div>

          {/* Deposit Bonus */}
          <div className="bg-card rounded-xl border border-border/50 p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-[#00b4d8]/20">
              <Gift className="w-6 h-6 text-[#00b4d8]" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-foreground">Бонус за депозит</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Получите +10% к первому депозиту от 500 ₽.
              </p>
            </div>
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              <span className="text-sm font-bold text-[#00b4d8]">+10%</span>
              <Link
                href="/deposit"
                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-secondary hover:bg-border text-foreground transition-colors"
              >
                Пополнить
              </Link>
            </div>
          </div>

          {/* Telegram Bonus */}
          <div className="bg-card rounded-xl border border-border/50 p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-[#ffd93d]/20">
              <Star className="w-6 h-6 text-[#ffd93d]" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-foreground">Бонус за Telegram</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Подпишитесь на наш Telegram канал и получите бонус.
              </p>
            </div>
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              <span className="text-sm font-bold text-[#ffd93d]">15 ₽</span>
              <button
                onClick={claimTelegramBonus}
                disabled={bonusState.telegramClaimed}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                  bonusState.telegramClaimed
                    ? "bg-secondary text-muted-foreground cursor-not-allowed"
                    : "bg-secondary hover:bg-border text-foreground"
                }`}
              >
                {bonusState.telegramClaimed ? (
                  <span className="flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Получено
                  </span>
                ) : (
                  "Подписаться"
                )}
              </button>
            </div>
          </div>
          
          {/* Referral Bonus */}
          <div className="bg-card rounded-xl border border-border/50 p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-[#6c5ce7]/20">
              <Coins className="w-6 h-6 text-[#6c5ce7]" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-foreground">Реферальная программа</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Приглашайте друзей и получайте 5% от их депозитов.
              </p>
            </div>
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              <span className="text-sm font-bold text-[#6c5ce7]">5%</span>
              <Link
                href="/referral"
                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-secondary hover:bg-border text-foreground transition-colors"
              >
                Подробнее
              </Link>
            </div>
          </div>
        </div>

        {/* Channel Subscription Bonuses */}
        {bonusChannels.filter(ch => ch.isActive).length > 0 && (
          <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
            <div className="px-4 py-3 bg-[#2aabee]/10 border-b border-border/50 flex items-center gap-2">
              <Users className="w-4 h-4 text-[#2aabee]" />
              <h2 className="text-sm font-semibold text-foreground">Бонусы за подписку</h2>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-xs text-muted-foreground">
                Подпишитесь на наши каналы и группы, чтобы получить бонус на баланс.
              </p>
              
              {bonusChannels.filter(ch => ch.isActive).map((channel) => {
                const isClaimed = bonusState.claimedChannels.includes(channel.id)
                const isVerifying = verifyingChannel === channel.id
                
                return (
                  <div key={channel.id} className="flex items-center gap-3 p-3 bg-secondary rounded-lg">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      channel.type === "channel" ? "bg-[#2aabee]/20" : "bg-[#ffd93d]/20"
                    }`}>
                      <Users className={`w-5 h-5 ${
                        channel.type === "channel" ? "text-[#2aabee]" : "text-[#ffd93d]"
                      }`} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground truncate">{channel.name}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                          channel.type === "channel" 
                            ? "bg-[#2aabee]/20 text-[#2aabee]" 
                            : "bg-[#ffd93d]/20 text-[#ffd93d]"
                        }`}>
                          {channel.type === "channel" ? "КАНАЛ" : "ГРУППА"}
                        </span>
                      </div>
                      <a 
                        href={`https://t.me/${channel.username.replace("@", "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-[#2aabee] hover:underline flex items-center gap-1"
                      >
                        {channel.username}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-sm font-bold text-[#2ee06e]">+{channel.reward} ₽</span>
                      
                      {isClaimed ? (
                        <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#2ee06e]/20 text-[#2ee06e]">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span className="text-xs font-semibold">Получено</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => verifyChannelSubscription(channel)}
                          disabled={isVerifying}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#2aabee] hover:bg-[#2196d6] disabled:opacity-50 text-white text-xs font-semibold transition-colors"
                        >
                          {isVerifying ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              Проверка...
                            </>
                          ) : (
                            "Проверить"
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
              
              <p className="text-[10px] text-muted-foreground text-center mt-2">
                Подпишитесь на канал/группу, затем нажмите "Проверить" для получения бонуса
              </p>
            </div>
          </div>
        )}

        {/* Promo Section */}
        <div className="bg-card rounded-xl border border-border/50 p-4">
          <h2 className="text-sm font-semibold text-foreground mb-3">Активировать промо-код</h2>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={promoCode}
              onChange={(e) => {
                setPromoCode(e.target.value.toUpperCase())
                setPromoError("")
                setPromoSuccess("")
              }}
              placeholder="Введите промо-код"
              className="flex-1 bg-secondary text-sm text-foreground px-3 py-2.5 rounded-lg outline-none placeholder:text-muted-foreground/50"
            />
            <button 
              onClick={applyPromoCode}
              className="bg-[#2ee06e] hover:bg-[#25c45c] text-[#0f1923] font-semibold text-sm px-4 py-2.5 rounded-lg transition-colors"
            >
              Активировать
            </button>
          </div>
          {promoError && (
            <p className="text-xs text-destructive mt-2 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {promoError}
            </p>
          )}
          {promoSuccess && (
            <p className="text-xs text-[#2ee06e] mt-2 flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              {promoSuccess}
            </p>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}
