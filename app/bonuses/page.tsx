'use client'

import { useState, useEffect } from 'react'
import { Gift, Sparkles, Check, MessageCircle, Users, ExternalLink, RefreshCw } from 'lucide-react'

interface BonusChannel {
  id: string
  name: string
  username: string
  type: 'channel' | 'group'
  reward: number
  subscriberCount?: number
  isActive: boolean
  requiresJoinRequest?: boolean
}

interface ClaimedBonus {
  channelId: string
  claimedAt: Date
}

const mockChannels: BonusChannel[] = [
  {
    id: '1',
    name: 'PlaidCas News',
    username: '@plaidcas_news',
    type: 'channel',
    reward: 100,
    subscriberCount: 15420,
    isActive: true,
  },
  {
    id: '2', 
    name: 'PlaidCas VIP',
    username: '@plaidcas_vip',
    type: 'channel',
    reward: 250,
    subscriberCount: 8930,
    isActive: true,
    requiresJoinRequest: true,
  },
]

export default function BonusesPage() {
  const [channels, setChannels] = useState<BonusChannel[]>([])
  const [claimedBonuses, setClaimedBonuses] = useState<ClaimedBonus[]>([])
  const [checkingId, setCheckingId] = useState<string | null>(null)

  useEffect(() => {
    setChannels(mockChannels.filter(ch => ch.isActive))
    
    const saved = localStorage.getItem("claimed_bonuses")
    if (saved) {
      try {
        setClaimedBonuses(JSON.parse(saved))
      } catch {
        setClaimedBonuses([])
      }
    }
  }, [])

  const isChannelClaimed = (channelId: string) => {
    return claimedBonuses.some(b => b.channelId === channelId)
  }

  const handleCheckSubscription = async (channel: BonusChannel) => {
    setCheckingId(channel.id)

    try {
      const response = await fetch("/api/telegram/verify-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: 123456,
          channelUsername: channel.username,
        }),
      })
      
      const data = await response.json()
      const isSubscribed = data.isMember === true
      
      if (isSubscribed) {
        const newClaimed = [...claimedBonuses, { channelId: channel.id, claimedAt: new Date() }]
        setClaimedBonuses(newClaimed)
        localStorage.setItem("claimed_bonuses", JSON.stringify(newClaimed))

        const currentBalance = parseFloat(localStorage.getItem("demo_balance") || "10000")
        const newBalance = currentBalance + channel.reward
        localStorage.setItem("demo_balance", String(newBalance))
        
        alert(`+${channel.reward} ₽ начислено на баланс!`)
      } else {
        alert("Вы не подписаны на канал. Подпишитесь и попробуйте снова.")
      }
    } catch (error) {
      console.error("Subscription check error:", error)
      alert("Ошибка проверки подписки. Попробуйте позже.")
    }

    setCheckingId(null)
  }

  const totalAvailable = channels
    .filter(ch => !isChannelClaimed(ch.id))
    .reduce((sum, ch) => sum + ch.reward, 0)

  const totalEarned = channels
    .filter(ch => isChannelClaimed(ch.id))
    .reduce((sum, ch) => sum + ch.reward, 0)

  return (
    <div className="min-h-screen bg-background flex flex-col pb-20">
      <header className="bg-card border-b border-border/50 p-4">
        <h1 className="text-xl font-bold text-foreground">PlaidCas</h1>
      </header>
      
      <main className="flex-1 max-w-md mx-auto w-full px-4 py-4 flex flex-col gap-4">
        <div className="bg-gradient-to-r from-[#2ee06e]/20 to-[#00b4d8]/20 border border-[#2ee06e]/30 rounded-2xl p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-[#2ee06e]/20 flex items-center justify-center mx-auto mb-4">
            <Gift className="w-8 h-8 text-[#2ee06e]" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Бонусы</h1>
          <p className="text-sm text-muted-foreground">
            Получайте бонусы за подписку на наши каналы
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card rounded-xl border border-border/50 p-4 text-center">
            <Sparkles className="w-5 h-5 text-[#ffd93d] mx-auto mb-2" />
            <p className="text-xl font-bold text-[#ffd93d]">{totalAvailable} ₽</p>
            <p className="text-xs text-muted-foreground">Доступно</p>
          </div>
          <div className="bg-card rounded-xl border border-border/50 p-4 text-center">
            <Check className="w-5 h-5 text-[#2ee06e] mx-auto mb-2" />
            <p className="text-xl font-bold text-[#2ee06e]">{totalEarned} ₽</p>
            <p className="text-xs text-muted-foreground">Получено</p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-[#2aabee]" />
            Подписка на каналы
          </h2>

          {channels.length === 0 ? (
            <div className="bg-card rounded-xl border border-border/50 p-8 text-center">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-muted-foreground">Нет доступных бонусов</p>
            </div>
          ) : (
            channels.map((channel) => {
              const isClaimed = isChannelClaimed(channel.id)
              const isChecking = checkingId === channel.id

              return (
                <div 
                  key={channel.id} 
                  className="bg-card rounded-xl border border-border/50 p-4"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-semibold text-foreground">{channel.name}</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#00b4d8]/20 text-[#00b4d8]">
                          КАНАЛ
                        </span>
                      </div>
                      
                      <a 
                        href={`https://t.me/${channel.username.replace("@", "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-[#2aabee] hover:underline flex items-center gap-1"
                      >
                        {channel.username}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    
                    <div className="px-3 py-2 rounded-xl bg-[#ffd93d]/20">
                      <span className="text-lg font-bold text-[#ffd93d]">
                        +{channel.reward} ₽
                      </span>
                    </div>
                  </div>

                  {isClaimed ? (
                    <div className="flex items-center justify-center gap-2 bg-[#2ee06e]/20 text-[#2ee06e] py-3 rounded-xl">
                      <Check className="w-4 h-4" />
                      <span className="text-sm font-semibold">Бонус получен</span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <a
                          href={`https://t.me/${channel.username.replace("@", "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 bg-[#2aabee] hover:bg-[#229ed9] text-white py-3 rounded-xl transition-colors"
                        >
                          <MessageCircle className="w-4 h-4" />
                          <span className="text-sm font-semibold">Подписаться</span>
                        </a>
                        <button
                          onClick={() => handleCheckSubscription(channel)}
                          disabled={isChecking}
                          className="flex items-center justify-center gap-2 bg-[#2ee06e] hover:bg-[#25c45c] disabled:opacity-70 text-[#0f1923] py-3 rounded-xl transition-colors"
                        >
                          {isChecking ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              <span className="text-sm font-semibold">Проверка...</span>
                            </>
                          ) : (
                            <>
                              <Check className="w-4 h-4" />
                              <span className="text-sm font-semibold">Проверить</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border/50 p-2">
        <div className="flex justify-around">
          <a href="/" className="flex flex-col items-center p-2 text-muted-foreground">
            <span className="text-xs">Главная</span>
          </a>
          <a href="/bonuses" className="flex flex-col items-center p-2 text-primary">
            <span className="text-xs">Бонусы</span>
          </a>
        </div>
      </nav>
    </div>
  )
}