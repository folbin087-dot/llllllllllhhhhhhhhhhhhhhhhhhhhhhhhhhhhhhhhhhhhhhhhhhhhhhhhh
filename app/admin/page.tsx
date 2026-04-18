"use client"

import { useState, useEffect } from "react"
import Header from "@/components/header"
import AdminStats from "@/components/admin/admin-stats"
import AdminUsers from "@/components/admin/admin-users"
import AdminLogs from "@/components/admin/admin-logs"
import AdminPromos from "@/components/admin/admin-promos"
import AdminSettings from "@/components/admin/admin-settings"
import AdminBonusChannels from "@/components/admin/admin-bonus-channels"
import AdminPartners from "@/components/admin/admin-partners"
import { Shield, ShieldAlert, AlertTriangle, Lock } from "lucide-react"

// Regular admins can only see: stats, users, logs, promos, partners
// Super admins (creators) can see everything including: settings (odds), telegram links
const adminTabs = [
  { id: "stats", label: "Статистика", adminOnly: false, description: "Общая статистика казино" },
  { id: "users", label: "Пользователи", adminOnly: false, description: "Управление пользователями" },
  { id: "logs", label: "Логи", adminOnly: false, description: "Системные логи" },
  { id: "promos", label: "Промокоды", adminOnly: false, description: "Создание промокодов" },
  { id: "bonuses", label: "Бонус-каналы", adminOnly: false, description: "Каналы за подписку" },
  { id: "partners", label: "Партнеры", adminOnly: false, description: "Управление партнерами и выплатами" },
  { id: "config", label: "Настройки", adminOnly: true, description: "Подкрутка шансов и ссылки" }, // Super admin only
]

// Admin IDs from environment (in production, verify on server)
const ADMIN_IDS = (process.env.NEXT_PUBLIC_ADMIN_IDS || "").split(",").filter(Boolean)
const SUPER_ADMIN_IDS = (process.env.NEXT_PUBLIC_SUPER_ADMIN_IDS || "").split(",").filter(Boolean)

interface TelegramUser {
  id: number
  first_name: string
  last_name?: string
  username?: string
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState("stats")
  const [isAdmin, setIsAdmin] = useState(false)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [telegramUser, setTelegramUser] = useState<TelegramUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDemoMode, setIsDemoMode] = useState(true)

  useEffect(() => {
    // Check Telegram WebApp for user data
    const checkAdminAccess = () => {
      if (typeof window !== "undefined" && (window as any).Telegram?.WebApp) {
        const tg = (window as any).Telegram.WebApp
        const user = tg.initDataUnsafe?.user

        if (user) {
          setTelegramUser(user)
          const userId = String(user.id)
          
          // Check if user is admin
          if (ADMIN_IDS.includes(userId) || SUPER_ADMIN_IDS.includes(userId)) {
            setIsAdmin(true)
            setIsDemoMode(false)
          }
          
          // Check if user is super admin (creator)
          if (SUPER_ADMIN_IDS.includes(userId)) {
            setIsSuperAdmin(true)
          }
        }
      }
      
      // For development/demo, allow access
      if (process.env.NODE_ENV === "development" || ADMIN_IDS.length === 0) {
        setIsAdmin(true)
        setIsSuperAdmin(true) // Full access in demo mode
        setIsDemoMode(true)
      }
      
      setIsLoading(false)
    }

    checkAdminAccess()
  }, [])

  // Filter tabs based on admin level
  const availableTabs = adminTabs.filter(tab => {
    if (tab.adminOnly && !isSuperAdmin) {
      return false
    }
    return true
  })

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-[#2ee06e] border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl border border-border/50 p-8 text-center max-w-md">
            <ShieldAlert className="w-16 h-16 text-destructive mx-auto mb-4" />
            <h1 className="text-xl font-bold text-foreground mb-2">Доступ запрещен</h1>
            <p className="text-muted-foreground mb-4">
              У вас нет прав для доступа к админ панели.
            </p>
            {telegramUser && (
              <p className="text-sm text-muted-foreground">
                Ваш Telegram ID: <span className="font-mono text-foreground">{telegramUser.id}</span>
              </p>
            )}
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-4 flex flex-col gap-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-foreground">Админ панель</h1>
            {isSuperAdmin ? (
              <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/20 text-amber-500 text-xs font-medium">
                <Shield className="w-3 h-3" />
                СОЗДАТЕЛЬ
              </div>
            ) : (
              <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#00b4d8]/20 text-[#00b4d8] text-xs font-medium">
                <Shield className="w-3 h-3" />
                АДМИН
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isDemoMode && (
              <div className="flex items-center gap-1 px-3 py-1 rounded-lg bg-amber-500/20 text-amber-500 text-xs font-semibold">
                <AlertTriangle className="w-3 h-3" />
                DEMO
              </div>
            )}
            {telegramUser && (
              <div className="px-3 py-1 rounded-lg bg-card border border-border/50 text-xs">
                <span className="text-muted-foreground">ID: </span>
                <span className="font-mono text-foreground">{telegramUser.id}</span>
              </div>
            )}
          </div>
        </div>

        {/* Access level info */}
        {!isSuperAdmin && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex items-start gap-2">
            <Lock className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-500">
              У вас ограниченный доступ. Настройки подкрутки шансов доступны только создателю.
            </p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-card rounded-xl border border-border/50 p-1 overflow-x-auto">
          {availableTabs.map((tab) => {
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                  activeTab === tab.id
                    ? "bg-[#2ee06e] text-[#0f1923]"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                {tab.label}
                {tab.adminOnly && <Shield className="w-3 h-3" />}
              </button>
            )
          })}
        </div>

        {/* Tab Content */}
        {activeTab === "stats" && <AdminStats />}
        {activeTab === "users" && <AdminUsers />}
        {activeTab === "logs" && <AdminLogs />}
        {activeTab === "promos" && <AdminPromos />}
        {activeTab === "bonuses" && <AdminBonusChannels />}
        {activeTab === "partners" && <AdminPartners />}
        {activeTab === "config" && isSuperAdmin && <AdminSettings />}
      </main>
    </div>
  )
}
