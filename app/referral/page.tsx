"use client"

import { useState } from "react"
import Header from "@/components/header"
import Footer from "@/components/footer"
import { Copy, Users, DollarSign, TrendingUp, Check } from "lucide-react"

export default function ReferralPage() {
  const [copied, setCopied] = useState(false)

  const referralLink = "https://plaid.app/?ref=PLAID-12847"
  const referralCode = "PLAID-12847"

  const stats = {
    totalReferrals: 12,
    activeReferrals: 8,
    totalEarned: 1540.0,
    pendingEarnings: 230.0,
  }

  const referrals = [
    { username: "Player_4821", deposited: 5000, earned: 500, date: "2026-02-28" },
    { username: "Player_9103", deposited: 3000, earned: 300, date: "2026-02-25" },
    { username: "Player_1447", deposited: 2000, earned: 200, date: "2026-02-20" },
    { username: "Player_6629", deposited: 1500, earned: 150, date: "2026-02-18" },
    { username: "Player_3345", deposited: 1000, earned: 100, date: "2026-02-15" },
  ]

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-4 flex flex-col gap-4">
        <h1 className="text-xl font-bold text-foreground">Реферальная программа</h1>

        {/* Info Banner */}
        <div className="bg-gradient-to-r from-[#ffd93d]/20 to-[#e17055]/20 rounded-xl border border-[#ffd93d]/30 p-6">
          <h2 className="text-lg font-bold text-foreground mb-1">
            Получайте 5% с проигрышей рефералов!
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Приглашайте друзей по вашей реферальной ссылке. Вы получите 5% от их проигрышей
            навсегда. Перейдите в раздел <strong>Партнерка</strong> для полной аналитики.
          </p>
        </div>

        {/* Referral Link */}
        <div className="bg-card rounded-xl border border-border/50 p-4">
          <p className="text-sm font-medium text-foreground mb-2">Ваша реферальная ссылка</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-secondary rounded-lg px-3 py-2.5 text-sm text-foreground/80 truncate">
              {referralLink}
            </div>
            <button
              onClick={copyLink}
              className="flex items-center gap-1.5 bg-[#2ee06e] hover:bg-[#25c45c] text-[#0f1923] font-semibold text-sm px-4 py-2.5 rounded-lg transition-colors flex-shrink-0"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? "Скопировано" : "Копировать"}
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Код: <span className="font-semibold text-foreground">{referralCode}</span>
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-card rounded-xl border border-border/50 p-4 text-center">
            <Users className="w-5 h-5 text-[#00b4d8] mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">Рефералов</p>
            <p className="text-lg font-bold text-foreground">{stats.totalReferrals}</p>
          </div>
          <div className="bg-card rounded-xl border border-border/50 p-4 text-center">
            <Users className="w-5 h-5 text-[#2ee06e] mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">Активных</p>
            <p className="text-lg font-bold text-[#2ee06e]">{stats.activeReferrals}</p>
          </div>
          <div className="bg-card rounded-xl border border-border/50 p-4 text-center">
            <TrendingUp className="w-5 h-5 text-[#ffd93d] mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">Заработано</p>
            <p className="text-lg font-bold text-[#ffd93d]">{stats.totalEarned.toFixed(0)} ₽</p>
          </div>
          <div className="bg-card rounded-xl border border-border/50 p-4 text-center">
            <DollarSign className="w-5 h-5 text-[#e17055] mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">Ожидается</p>
            <p className="text-lg font-bold text-[#e17055]">{stats.pendingEarnings.toFixed(0)} ₽</p>
          </div>
        </div>

        {/* Referral Table */}
        <div className="bg-card rounded-xl border border-border/50 p-4">
          <h2 className="text-sm font-semibold text-foreground mb-3">Ваши рефералы</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground border-b border-border">
                  <th className="text-left py-2 font-medium">Игрок</th>
                  <th className="text-right py-2 font-medium">Депозиты</th>
                  <th className="text-right py-2 font-medium">Ваш доход</th>
                  <th className="text-right py-2 font-medium">Дата</th>
                </tr>
              </thead>
              <tbody>
                {referrals.map((ref, i) => (
                  <tr key={i} className="border-b border-border/50 last:border-0">
                    <td className="py-2.5 text-foreground font-medium">{ref.username}</td>
                    <td className="py-2.5 text-right text-muted-foreground">{ref.deposited} ₽</td>
                    <td className="py-2.5 text-right text-[#2ee06e] font-semibold">+{ref.earned} ₽</td>
                    <td className="py-2.5 text-right text-muted-foreground">{ref.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
