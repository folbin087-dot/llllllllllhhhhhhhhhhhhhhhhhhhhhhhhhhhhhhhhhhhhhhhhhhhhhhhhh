"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Header from "@/components/header"
import Footer from "@/components/footer"
import { 
  Copy, Users, TrendingUp, DollarSign, Check, 
  Loader2, Crown, ArrowUpRight, ArrowDownRight,
  Calendar, Activity, Award, ExternalLink, Wallet,
  ChevronRight, Star
} from "lucide-react"

interface ReferralStats {
  total_referrals: number
  active_referrals: number
  total_wagered: number
  total_losses: number
  total_commission_earned: number
  pending_commission: number
  this_week_earnings: number
  this_month_earnings: number
}

interface ReferralUser {
  id: string
  username: string | null
  first_name: string
  joined_at: string
  total_wagered: number
  total_losses: number
  commission_earned: number
  is_active: boolean
  last_activity: string
}

interface DailyStats {
  date: string
  new_referrals: number
  total_wagered: number
  total_losses: number
  commission_earned: number
}

export default function PartnerPage() {
  const [copied, setCopied] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isWithdrawing, setIsWithdrawing] = useState(false)
  const [withdrawMessage, setWithdrawMessage] = useState<string | null>(null)
  
  const [isPartner, setIsPartner] = useState(false)
  const [isPremiumPartner, setIsPremiumPartner] = useState(false)
  const [commissionRate, setCommissionRate] = useState(0.05)
  const [partnerLink, setPartnerLink] = useState("")
  const [referralCode, setReferralCode] = useState("")
  const [stats, setStats] = useState<ReferralStats | null>(null)
  const [referrals, setReferrals] = useState<ReferralUser[]>([])
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([])
  const [activeTab, setActiveTab] = useState<"overview" | "referrals" | "analytics">("overview")

  useEffect(() => {
    const loadPartnerData = async () => {
      try {
        let telegramId: string | null = null
        
        if (typeof window !== "undefined") {
          const tg = (window as { Telegram?: { WebApp?: { initDataUnsafe?: { user?: { id: number } } } } }).Telegram?.WebApp
          if (tg?.initDataUnsafe?.user?.id) {
            telegramId = String(tg.initDataUnsafe.user.id)
          } else {
            telegramId = localStorage.getItem("telegram_user_id")
          }
        }
        
        if (!telegramId) {
          setIsLoading(false)
          return
        }
        
        const response = await fetch(`/api/partner?telegramId=${telegramId}`)
        const data = await response.json()
        
        if (data.success) {
          setIsPartner(data.isPartner)
          setIsPremiumPartner(data.isPremiumPartner)
          setCommissionRate(data.commissionRate)
          setPartnerLink(data.partnerLink)
          setReferralCode(data.referralCode)
          setStats(data.stats)
          setReferrals(data.referrals || [])
          setDailyStats(data.dailyStats || [])
        }
      } catch (error) {
        console.error("Failed to load partner data:", error)
      } finally {
        setIsLoading(false)
      }
    }
    
    loadPartnerData()
  }, [])

  const copyLink = () => {
    navigator.clipboard.writeText(partnerLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleWithdraw = async () => {
    setIsWithdrawing(true)
    setWithdrawMessage(null)
    
    try {
      let telegramId: string | null = null
      if (typeof window !== "undefined") {
        const tg = (window as { Telegram?: { WebApp?: { initDataUnsafe?: { user?: { id: number } } } } }).Telegram?.WebApp
        telegramId = tg?.initDataUnsafe?.user?.id 
          ? String(tg.initDataUnsafe.user.id) 
          : localStorage.getItem("telegram_user_id")
      }
      
      const response = await fetch("/api/partner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telegramId,
          action: "withdraw_commission"
        })
      })
      
      const data = await response.json()
      if (data.success) {
        setWithdrawMessage(`Выведено ${data.amount?.toFixed(2)} р на баланс!`)
        // Refresh stats
        setTimeout(() => window.location.reload(), 2000)
      } else {
        setWithdrawMessage(data.error || "Ошибка вывода")
      }
    } catch {
      setWithdrawMessage("Ошибка соединения")
    }
    
    setIsWithdrawing(false)
  }

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M`
    if (amount >= 1000) return `${(amount / 1000).toFixed(1)}K`
    return amount.toFixed(0)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })
  }

  // Calculate chart max for scaling
  const chartMax = Math.max(...dailyStats.map(d => d.commission_earned), 1)

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-[#2ee06e] animate-spin" />
        </main>
        <Footer />
      </div>
    )
  }

  // If not a partner, show access denied message
  if (!isPartner) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl border border-border/50 p-8 text-center max-w-md">
            <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-xl font-bold text-foreground mb-2">Партнерская панель</h1>
            <p className="text-muted-foreground mb-4">
              Эта страница доступна только для партнеров казино. Чтобы стать партнером, обратитесь в поддержку.
            </p>
            <a 
              href="/support"
              className="inline-flex items-center gap-2 bg-[#2ee06e] hover:bg-[#25c45c] text-[#0f1923] font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              Связаться с поддержкой
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
        
        {/* Header with Partner Status */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              Партнерская программа
              {isPremiumPartner && (
                <span className="inline-flex items-center gap-1 bg-gradient-to-r from-[#ffd93d] to-[#e17055] text-[#0f1923] text-[10px] font-bold px-2 py-0.5 rounded-full">
                  <Crown className="w-3 h-3" /> PREMIUM
                </span>
              )}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Зарабатывайте {(commissionRate * 100).toFixed(0)}% с проигрышей ваших рефералов
            </p>
          </div>
          {!isPremiumPartner && isPartner && (
            <button 
              onClick={() => {/* Apply for premium */}}
              className="text-xs text-[#ffd93d] hover:underline flex items-center gap-1"
            >
              <Star className="w-3 h-3" /> Стать премиум
            </button>
          )}
        </div>

        {/* Info Banner */}
        <div className="bg-gradient-to-r from-[#2ee06e]/10 to-[#00b4d8]/10 rounded-xl border border-[#2ee06e]/20 p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#2ee06e]/20 flex items-center justify-center flex-shrink-0">
              <Award className="w-5 h-5 text-[#2ee06e]" />
            </div>
            <div className="flex-1">
              <h2 className="text-sm font-bold text-foreground">
                Выгодные условия
              </h2>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Получайте {(commissionRate * 100).toFixed(0)}% от чистого проигрыша каждого приглашенного игрока. 
                Комиссия начисляется автоматически и доступна для вывода на баланс.
              </p>
            </div>
          </div>
        </div>

        {/* Partner Link */}
        <div className="bg-card rounded-xl border border-border/50 p-4">
          <p className="text-xs font-medium text-muted-foreground mb-2">Ваша партнерская ссылка</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-secondary rounded-lg px-3 py-2.5 text-xs text-foreground/80 truncate font-mono">
              {partnerLink || `https://t.me/plaid_casino_bot?start=ref_${referralCode}`}
            </div>
            <button
              onClick={copyLink}
              className="flex items-center gap-1.5 bg-[#2ee06e] hover:bg-[#25c45c] text-[#0f1923] font-semibold text-xs px-3 py-2.5 rounded-lg transition-colors flex-shrink-0"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Скопировано" : "Копировать"}
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">
            Код: <span className="font-semibold text-foreground font-mono">{referralCode}</span>
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="bg-card rounded-xl border border-border/50 p-3">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-[#00b4d8]" />
              <span className="text-[10px] text-muted-foreground">Рефералов</span>
            </div>
            <p className="text-lg font-bold text-foreground">{stats?.total_referrals || 0}</p>
            <p className="text-[10px] text-[#2ee06e]">{stats?.active_referrals || 0} активных</p>
          </div>
          
          <div className="bg-card rounded-xl border border-border/50 p-3">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-4 h-4 text-[#ffd93d]" />
              <span className="text-[10px] text-muted-foreground">Оборот</span>
            </div>
            <p className="text-lg font-bold text-foreground">{formatCurrency(stats?.total_wagered || 0)} р</p>
            <p className="text-[10px] text-muted-foreground">всего ставок</p>
          </div>
          
          <div className="bg-card rounded-xl border border-border/50 p-3">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-[#2ee06e]" />
              <span className="text-[10px] text-muted-foreground">Заработано</span>
            </div>
            <p className="text-lg font-bold text-[#2ee06e]">{formatCurrency(stats?.total_commission_earned || 0)} р</p>
            <p className="text-[10px] text-muted-foreground">всего</p>
          </div>
          
          <div className="bg-card rounded-xl border border-border/50 p-3">
            <div className="flex items-center gap-2 mb-1">
              <Wallet className="w-4 h-4 text-[#e17055]" />
              <span className="text-[10px] text-muted-foreground">К выводу</span>
            </div>
            <p className="text-lg font-bold text-[#e17055]">{(stats?.pending_commission || 0).toFixed(0)} р</p>
            <button 
              onClick={handleWithdraw}
              disabled={isWithdrawing || (stats?.pending_commission || 0) < 100}
              className="text-[10px] text-[#2ee06e] hover:underline disabled:text-muted-foreground disabled:no-underline"
            >
              {isWithdrawing ? "Вывод..." : "Вывести"}
            </button>
          </div>
        </div>

        {withdrawMessage && (
          <div className={`text-center text-sm py-2 px-4 rounded-lg ${
            withdrawMessage.includes("Ошибка") || withdrawMessage.includes("Минимальная")
              ? "bg-destructive/20 text-destructive" 
              : "bg-[#2ee06e]/20 text-[#2ee06e]"
          }`}>
            {withdrawMessage}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-secondary rounded-lg p-1">
          {[
            { id: "overview", label: "Обзор" },
            { id: "referrals", label: "Рефералы" },
            { id: "analytics", label: "Аналитика" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex-1 py-2 text-xs font-semibold rounded-md transition-all ${
                activeTab === tab.id
                  ? "bg-[#2ee06e] text-[#0f1923]"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === "overview" && (
          <>
            {/* Period Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-card rounded-xl border border-border/50 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">Эта неделя</span>
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
                <p className="text-xl font-bold text-foreground">
                  {formatCurrency(stats?.this_week_earnings || 0)} р
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <ArrowUpRight className="w-3 h-3 text-[#2ee06e]" />
                  <span className="text-[10px] text-[#2ee06e]">+12% к прошлой</span>
                </div>
              </div>
              
              <div className="bg-card rounded-xl border border-border/50 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">Этот месяц</span>
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
                <p className="text-xl font-bold text-foreground">
                  {formatCurrency(stats?.this_month_earnings || 0)} р
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <ArrowUpRight className="w-3 h-3 text-[#2ee06e]" />
                  <span className="text-[10px] text-[#2ee06e]">+8% к прошлому</span>
                </div>
              </div>
            </div>

            {/* Mini Chart */}
            <div className="bg-card rounded-xl border border-border/50 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground">Доход за 7 дней</h3>
                <Link href="#" className="text-xs text-[#2ee06e] flex items-center gap-1">
                  Подробнее <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="flex items-end gap-1 h-24">
                {dailyStats.slice(0, 7).reverse().map((day, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div 
                      className="w-full bg-[#2ee06e]/20 rounded-t-sm transition-all hover:bg-[#2ee06e]/30"
                      style={{ 
                        height: `${Math.max(4, (day.commission_earned / chartMax) * 80)}px`,
                        background: `linear-gradient(to top, #2ee06e40, #2ee06e20)`
                      }}
                    />
                    <span className="text-[8px] text-muted-foreground">{formatDate(day.date)}</span>
                  </div>
                ))}
                {dailyStats.length < 7 && Array.from({ length: 7 - dailyStats.length }).map((_, i) => (
                  <div key={`empty-${i}`} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full h-1 bg-secondary rounded-t-sm" />
                    <span className="text-[8px] text-muted-foreground">-</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Referrals */}
            <div className="bg-card rounded-xl border border-border/50 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground">Топ рефералы</h3>
                <button 
                  onClick={() => setActiveTab("referrals")}
                  className="text-xs text-[#2ee06e] flex items-center gap-1"
                >
                  Все <ChevronRight className="w-3 h-3" />
                </button>
              </div>
              {referrals.slice(0, 3).map((ref, i) => (
                <div key={ref.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                  <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      i === 0 ? "bg-[#ffd93d]/20 text-[#ffd93d]" :
                      i === 1 ? "bg-[#a8c8d8]/20 text-[#a8c8d8]" :
                      "bg-[#cd7f32]/20 text-[#cd7f32]"
                    }`}>
                      {i + 1}
                    </div>
                    <div>
                      <p className="text-xs font-medium text-foreground">
                        {ref.username ? `@${ref.username}` : ref.first_name}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        Оборот: {formatCurrency(ref.total_wagered)} р
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold text-[#2ee06e]">+{ref.commission_earned.toFixed(0)} р</p>
                    <p className="text-[10px] text-muted-foreground">ваш доход</p>
                  </div>
                </div>
              ))}
              {referrals.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">
                  Пока нет рефералов. Поделитесь ссылкой!
                </p>
              )}
            </div>
          </>
        )}

        {activeTab === "referrals" && (
          <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
            <div className="p-4 border-b border-border/50">
              <h3 className="text-sm font-semibold text-foreground">Все рефералы ({referrals.length})</h3>
            </div>
            <div className="divide-y divide-border/50 max-h-[400px] overflow-y-auto">
              {referrals.map((ref) => (
                <div key={ref.id} className="p-3 flex items-center justify-between hover:bg-secondary/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${ref.is_active ? "bg-[#2ee06e]" : "bg-muted-foreground"}`} />
                    <div>
                      <p className="text-xs font-medium text-foreground">
                        {ref.username ? `@${ref.username}` : ref.first_name}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        С {new Date(ref.joined_at).toLocaleDateString("ru-RU")}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">
                      Ставки: {formatCurrency(ref.total_wagered)} р
                    </p>
                    <p className="text-xs font-semibold text-[#2ee06e]">
                      +{ref.commission_earned.toFixed(0)} р
                    </p>
                  </div>
                </div>
              ))}
              {referrals.length === 0 && (
                <div className="p-8 text-center">
                  <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Пока нет рефералов</p>
                  <p className="text-xs text-muted-foreground mt-1">Поделитесь партнерской ссылкой</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "analytics" && (
          <>
            {/* Full Chart */}
            <div className="bg-card rounded-xl border border-border/50 p-4">
              <h3 className="text-sm font-semibold text-foreground mb-4">Доход за 30 дней</h3>
              <div className="h-40 flex items-end gap-0.5">
                {dailyStats.slice(0, 30).reverse().map((day, i) => (
                  <div 
                    key={i} 
                    className="flex-1 bg-gradient-to-t from-[#2ee06e] to-[#2ee06e]/50 rounded-t-sm hover:from-[#25c45c] hover:to-[#25c45c]/50 transition-all cursor-pointer group relative"
                    style={{ height: `${Math.max(2, (day.commission_earned / chartMax) * 100)}%` }}
                  >
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-card border border-border px-2 py-1 rounded text-[10px] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                      {formatDate(day.date)}: {day.commission_earned.toFixed(0)} р
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-2 text-[10px] text-muted-foreground">
                <span>30 дней назад</span>
                <span>Сегодня</span>
              </div>
            </div>

            {/* Detailed Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-card rounded-xl border border-border/50 p-4">
                <h4 className="text-xs text-muted-foreground mb-2">Средний доход/день</h4>
                <p className="text-xl font-bold text-foreground">
                  {dailyStats.length > 0 
                    ? (dailyStats.reduce((a, b) => a + b.commission_earned, 0) / dailyStats.length).toFixed(0)
                    : 0} р
                </p>
              </div>
              <div className="bg-card rounded-xl border border-border/50 p-4">
                <h4 className="text-xs text-muted-foreground mb-2">Конверсия</h4>
                <p className="text-xl font-bold text-foreground">
                  {stats && stats.total_referrals > 0 
                    ? ((stats.active_referrals / stats.total_referrals) * 100).toFixed(0)
                    : 0}%
                </p>
                <p className="text-[10px] text-muted-foreground">активных</p>
              </div>
            </div>

            {/* Revenue Breakdown */}
            <div className="bg-card rounded-xl border border-border/50 p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">Источники дохода</h3>
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Проигрыши рефералов</span>
                    <span className="font-medium text-foreground">{formatCurrency(stats?.total_losses || 0)} р</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-[#ff4757] rounded-full" style={{ width: "100%" }} />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Ваша комиссия ({(commissionRate * 100).toFixed(0)}%)</span>
                    <span className="font-medium text-[#2ee06e]">{formatCurrency((stats?.total_losses || 0) * commissionRate)} р</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-[#2ee06e] rounded-full" style={{ width: `${commissionRate * 100}%` }} />
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Share Buttons */}
        <div className="bg-card rounded-xl border border-border/50 p-4">
          <h3 className="text-xs font-semibold text-foreground mb-3">Поделиться</h3>
          <div className="grid grid-cols-3 gap-2">
            <a
              href={`https://t.me/share/url?url=${encodeURIComponent(partnerLink)}&text=${encodeURIComponent("Играй в лучшем казино! Получи бонус при регистрации!")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-1 p-3 bg-[#2aabee]/10 hover:bg-[#2aabee]/20 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-[#2aabee]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
              </svg>
              <span className="text-[10px] text-foreground">Telegram</span>
            </a>
            <a
              href={`https://vk.com/share.php?url=${encodeURIComponent(partnerLink)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-1 p-3 bg-[#4a76a8]/10 hover:bg-[#4a76a8]/20 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-[#4a76a8]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M15.684 0H8.316C1.592 0 0 1.592 0 8.316v7.368C0 22.408 1.592 24 8.316 24h7.368C22.408 24 24 22.408 24 15.684V8.316C24 1.592 22.408 0 15.684 0zm3.692 17.123h-1.744c-.66 0-.864-.525-2.05-1.727-1.033-1.033-1.49-1.17-1.744-1.17-.356 0-.458.102-.458.593v1.575c0 .424-.135.678-1.253.678-1.846 0-3.896-1.118-5.335-3.202C4.624 10.857 4 8.64 4 8.153c0-.254.102-.491.593-.491h1.744c.44 0 .61.203.78.677.863 2.49 2.303 4.675 2.896 4.675.22 0 .322-.102.322-.66V9.721c-.068-1.186-.695-1.287-.695-1.71 0-.203.17-.407.44-.407h2.743c.373 0 .508.203.508.643v3.473c0 .372.17.508.271.508.22 0 .407-.136.814-.542 1.27-1.422 2.18-3.624 2.18-3.624.119-.254.322-.491.763-.491h1.744c.525 0 .644.27.525.643-.22 1.017-2.354 4.031-2.354 4.031-.186.305-.254.44 0 .78.186.254.796.779 1.203 1.253.745.847 1.32 1.558 1.473 2.05.17.475-.085.72-.576.72z"/>
              </svg>
              <span className="text-[10px] text-foreground">VK</span>
            </a>
            <button
              onClick={copyLink}
              className="flex flex-col items-center gap-1 p-3 bg-secondary hover:bg-border rounded-lg transition-colors"
            >
              <ExternalLink className="w-5 h-5 text-foreground" />
              <span className="text-[10px] text-foreground">Ссылка</span>
            </button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
