"use client"

import { useState, useEffect } from "react"
import { Users, TrendingUp, DollarSign, Crown, Search, RefreshCw, ChevronDown, ChevronUp, Plus, UserPlus, X, Eye } from "lucide-react"

interface PartnerRow {
  id: string
  telegram_id: string
  username: string | null
  first_name: string
  referral_code: string
  is_premium_partner: boolean
  total_referrals: number
  active_referrals: number
  total_referral_wagered: number
  total_referral_losses: number
  total_paid: number
  pending_earnings: number
}

interface AggregateStats {
  totalPartners: number
  totalReferrals: number
  totalPartnerEarnings: number
  pendingPayouts: number
  avgReferralsPerPartner: number
}

export default function AdminPartners() {
  const [partners, setPartners] = useState<PartnerRow[]>([])
  const [stats, setStats] = useState<AggregateStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [sortBy, setSortBy] = useState<"referrals" | "earnings" | "pending">("earnings")
  const [sortAsc, setSortAsc] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [addTelegramId, setAddTelegramId] = useState("")
  const [addingPartner, setAddingPartner] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [selectedPartner, setSelectedPartner] = useState<PartnerRow | null>(null)

  const loadData = async () => {
    setIsLoading(true)
    try {
      const res = await fetch("/api/admin/partners")
      const data = await res.json()
      if (data.success) {
        setPartners(data.partners || [])
        setStats(data.stats || null)
      }
    } catch (err) {
      console.error("Failed to load partner data:", err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handlePromote = async (partnerId: string, isPremium: boolean) => {
    try {
      const res = await fetch("/api/admin/partners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set_premium", userId: partnerId, isPremium: !isPremium }),
      })
      const data = await res.json()
      if (data.success) {
        setPartners(prev => prev.map(p =>
          p.id === partnerId ? { ...p, is_premium_partner: !isPremium } : p
        ))
      }
    } catch (err) {
      console.error("Failed to update partner status:", err)
    }
  }

  const handleAddPartner = async () => {
    if (!addTelegramId.trim()) {
      setAddError("Введите Telegram ID пользователя")
      return
    }
    
    setAddingPartner(true)
    setAddError(null)
    
    try {
      const res = await fetch("/api/admin/partners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add_partner", telegramId: addTelegramId.trim() }),
      })
      const data = await res.json()
      
      if (data.success) {
        setShowAddModal(false)
        setAddTelegramId("")
        loadData() // Refresh the list
      } else {
        setAddError(data.error || "Не удалось добавить партнера")
      }
    } catch (err) {
      setAddError("Ошибка соединения")
    } finally {
      setAddingPartner(false)
    }
  }

  const handleRemovePartner = async (partnerId: string) => {
    if (!confirm("Удалить партнера? Это уберет его из партнерской программы.")) return
    
    try {
      const res = await fetch("/api/admin/partners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "remove_partner", userId: partnerId }),
      })
      const data = await res.json()
      if (data.success) {
        loadData()
      }
    } catch (err) {
      console.error("Failed to remove partner:", err)
    }
  }

  const formatNum = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
    return n.toFixed(0)
  }

  const filtered = partners
    .filter(p => {
      const q = search.toLowerCase()
      return (
        p.first_name.toLowerCase().includes(q) ||
        (p.username || "").toLowerCase().includes(q) ||
        p.telegram_id.includes(q) ||
        p.referral_code.toLowerCase().includes(q)
      )
    })
    .sort((a, b) => {
      let diff = 0
      if (sortBy === "referrals") diff = a.total_referrals - b.total_referrals
      if (sortBy === "earnings") diff = a.total_paid - b.total_paid
      if (sortBy === "pending") diff = a.pending_earnings - b.pending_earnings
      return sortAsc ? diff : -diff
    })

  const toggleSort = (col: typeof sortBy) => {
    if (sortBy === col) setSortAsc(v => !v)
    else { setSortBy(col); setSortAsc(false) }
  }

  const SortIcon = ({ col }: { col: typeof sortBy }) =>
    sortBy === col
      ? sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
      : null

  return (
    <div className="flex flex-col gap-4">
      {/* Add Partner Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl border border-border/50 p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-[#2ee06e]" />
                Добавить партнера
              </h3>
              <button
                onClick={() => { setShowAddModal(false); setAddError(null); setAddTelegramId(""); }}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <p className="text-xs text-muted-foreground mb-4">
              Введите Telegram ID пользователя, чтобы добавить его в партнерскую программу. 
              Пользователь должен быть зарегистрирован в казино.
            </p>
            
            <input
              type="text"
              placeholder="Telegram ID (например: 123456789)"
              value={addTelegramId}
              onChange={e => setAddTelegramId(e.target.value)}
              className="w-full bg-secondary border border-border/50 rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#2ee06e]/50 mb-3"
            />
            
            {addError && (
              <p className="text-xs text-destructive mb-3">{addError}</p>
            )}
            
            <div className="flex gap-2">
              <button
                onClick={() => { setShowAddModal(false); setAddError(null); setAddTelegramId(""); }}
                className="flex-1 py-2 text-sm font-medium text-muted-foreground hover:text-foreground bg-secondary rounded-lg transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleAddPartner}
                disabled={addingPartner}
                className="flex-1 py-2 text-sm font-semibold bg-[#2ee06e] hover:bg-[#25c45c] text-[#0f1923] rounded-lg transition-colors disabled:opacity-50"
              >
                {addingPartner ? "Добавление..." : "Добавить"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Partner Details Modal */}
      {selectedPartner && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl border border-border/50 p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-foreground">
                Детали партнера
              </h3>
              <button
                onClick={() => setSelectedPartner(null)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-[#2ee06e]/20 rounded-full flex items-center justify-center">
                  <Users className="w-6 h-6 text-[#2ee06e]" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">
                    {selectedPartner.username ? `@${selectedPartner.username}` : selectedPartner.first_name}
                  </p>
                  <p className="text-xs text-muted-foreground font-mono">ID: {selectedPartner.telegram_id}</p>
                </div>
                {selectedPartner.is_premium_partner && (
                  <span className="ml-auto bg-[#ffd93d]/20 text-[#ffd93d] text-xs font-semibold px-2 py-1 rounded flex items-center gap-1">
                    <Crown className="w-3 h-3" /> Premium
                  </span>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-secondary rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Рефералов</p>
                  <p className="text-lg font-bold text-foreground">{selectedPartner.total_referrals}</p>
                  <p className="text-[10px] text-[#2ee06e]">{selectedPartner.active_referrals} активных</p>
                </div>
                <div className="bg-secondary rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Оборот рефералов</p>
                  <p className="text-lg font-bold text-foreground">{formatNum(selectedPartner.total_referral_wagered)} р</p>
                </div>
                <div className="bg-secondary rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Проигрыши рефералов</p>
                  <p className="text-lg font-bold text-[#ff4757]">{formatNum(selectedPartner.total_referral_losses)} р</p>
                </div>
                <div className="bg-secondary rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Выплачено</p>
                  <p className="text-lg font-bold text-[#2ee06e]">{formatNum(selectedPartner.total_paid)} р</p>
                </div>
              </div>
              
              <div className="bg-[#e17055]/10 border border-[#e17055]/30 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">К выплате</p>
                    <p className="text-xl font-bold text-[#e17055]">{formatNum(selectedPartner.pending_earnings)} р</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-secondary rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-1">Партнерский код</p>
                <p className="font-mono text-foreground bg-card px-2 py-1 rounded inline-block">{selectedPartner.referral_code}</p>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    handlePromote(selectedPartner.id, selectedPartner.is_premium_partner)
                    setSelectedPartner({
                      ...selectedPartner,
                      is_premium_partner: !selectedPartner.is_premium_partner
                    })
                  }}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-1 ${
                    selectedPartner.is_premium_partner
                      ? "bg-[#ffd93d]/20 text-[#ffd93d] hover:bg-[#ffd93d]/30"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Crown className="w-4 h-4" />
                  {selectedPartner.is_premium_partner ? "Снять Premium" : "Выдать Premium"}
                </button>
                <button
                  onClick={() => { handleRemovePartner(selectedPartner.id); setSelectedPartner(null); }}
                  className="py-2 px-4 text-sm font-medium bg-destructive/20 text-destructive hover:bg-destructive/30 rounded-lg transition-colors"
                >
                  Удалить
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">Управление партнерами</h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 bg-[#2ee06e] hover:bg-[#25c45c] text-[#0f1923] font-semibold text-xs px-3 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Добавить
        </button>
      </div>

      {/* Aggregate Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="bg-card rounded-xl border border-border/50 p-3">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-[#00b4d8]" />
            <span className="text-[10px] text-muted-foreground">Партнеров</span>
          </div>
          <p className="text-lg font-bold text-foreground">
            {isLoading ? "..." : stats?.totalPartners ?? partners.length}
          </p>
          <p className="text-[10px] text-muted-foreground">
            ср. {isLoading ? "?" : (stats?.avgReferralsPerPartner ?? 0).toFixed(1)} реф/партнер
          </p>
        </div>

        <div className="bg-card rounded-xl border border-border/50 p-3">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-[#a29bfe]" />
            <span className="text-[10px] text-muted-foreground">Всего рефералов</span>
          </div>
          <p className="text-lg font-bold text-foreground">
            {isLoading ? "..." : formatNum(stats?.totalReferrals ?? 0)}
          </p>
        </div>

        <div className="bg-card rounded-xl border border-border/50 p-3">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-[#2ee06e]" />
            <span className="text-[10px] text-muted-foreground">Выплачено партнерам</span>
          </div>
          <p className="text-lg font-bold text-[#2ee06e]">
            {isLoading ? "..." : `${formatNum(stats?.totalPartnerEarnings ?? 0)} р`}
          </p>
        </div>

        <div className="bg-card rounded-xl border border-border/50 p-3">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 text-[#e17055]" />
            <span className="text-[10px] text-muted-foreground">Ожидает выплаты</span>
          </div>
          <p className="text-lg font-bold text-[#e17055]">
            {isLoading ? "..." : `${formatNum(stats?.pendingPayouts ?? 0)} р`}
          </p>
        </div>
      </div>

      {/* Commission Info */}
      <div className="bg-[#2ee06e]/5 border border-[#2ee06e]/20 rounded-xl p-3 flex items-center justify-between flex-wrap gap-2">
        <div className="text-xs text-muted-foreground">
          Ставки комиссий:{" "}
          <span className="text-foreground font-semibold">Стандарт — 5%</span>
          {" · "}
          <span className="text-[#ffd93d] font-semibold flex-inline items-center gap-1">
            Premium — 8%
          </span>
          {" "}(от проигрышей рефералов)
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-1.5 text-xs text-[#2ee06e] hover:underline"
        >
          <RefreshCw className="w-3 h-3" />
          Обновить
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <input
          type="text"
          placeholder="Поиск по имени, @username, Telegram ID, коду..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-card border border-border/50 rounded-lg pl-9 pr-4 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#2ee06e]/50"
        />
      </div>

      {/* Partners Table */}
      <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/50 text-muted-foreground">
                <th className="text-left px-4 py-3 font-medium">Партнер</th>
                <th className="text-left px-3 py-3 font-medium">Код</th>
                <th
                  className="text-right px-3 py-3 font-medium cursor-pointer hover:text-foreground"
                  onClick={() => toggleSort("referrals")}
                >
                  <span className="flex items-center justify-end gap-1">
                    Рефералы <SortIcon col="referrals" />
                  </span>
                </th>
                <th className="text-right px-3 py-3 font-medium">Оборот</th>
                <th
                  className="text-right px-3 py-3 font-medium cursor-pointer hover:text-foreground"
                  onClick={() => toggleSort("earnings")}
                >
                  <span className="flex items-center justify-end gap-1">
                    Выплачено <SortIcon col="earnings" />
                  </span>
                </th>
                <th
                  className="text-right px-3 py-3 font-medium cursor-pointer hover:text-foreground"
                  onClick={() => toggleSort("pending")}
                >
                  <span className="flex items-center justify-end gap-1">
                    К выплате <SortIcon col="pending" />
                  </span>
                </th>
                <th className="text-right px-3 py-3 font-medium">Статус</th>
                <th className="text-right px-3 py-3 font-medium w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-muted-foreground">
                    Загрузка...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-muted-foreground">
                    {search ? "Ничего не найдено" : "Партнеров пока нет. Нажмите \"Добавить\" чтобы добавить партнера."}
                  </td>
                </tr>
              ) : (
                filtered.map(partner => (
                  <tr key={partner.id} className="hover:bg-secondary/30 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-foreground">
                          {partner.username ? `@${partner.username}` : partner.first_name}
                        </p>
                        <p className="text-[10px] text-muted-foreground font-mono">
                          ID: {partner.telegram_id}
                        </p>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span className="font-mono text-foreground/80 bg-secondary px-1.5 py-0.5 rounded text-[10px]">
                        {partner.referral_code}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <p className="font-medium text-foreground">{partner.total_referrals}</p>
                      <p className="text-[10px] text-[#2ee06e]">{partner.active_referrals} акт.</p>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <p className="text-foreground">{formatNum(partner.total_referral_wagered)} р</p>
                      <p className="text-[10px] text-[#ff4757]">
                        -{formatNum(partner.total_referral_losses)} р
                      </p>
                    </td>
                    <td className="px-3 py-3 text-right font-medium text-[#2ee06e]">
                      {formatNum(partner.total_paid)} р
                    </td>
                    <td className="px-3 py-3 text-right font-medium text-[#e17055]">
                      {formatNum(partner.pending_earnings)} р
                    </td>
                    <td className="px-3 py-3 text-right">
                      <button
                        onClick={() => handlePromote(partner.id, partner.is_premium_partner)}
                        className={`flex items-center gap-1 ml-auto text-[10px] font-semibold px-2 py-1 rounded-md transition-colors ${
                          partner.is_premium_partner
                            ? "bg-[#ffd93d]/20 text-[#ffd93d] hover:bg-[#ffd93d]/30"
                            : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-border"
                        }`}
                        title={partner.is_premium_partner ? "Снять Premium" : "Выдать Premium (8%)"}
                      >
                        <Crown className="w-3 h-3" />
                        {partner.is_premium_partner ? "Premium" : "Стандарт"}
                      </button>
                    </td>
                    <td className="px-2 py-3 text-right">
                      <button
                        onClick={() => setSelectedPartner(partner)}
                        className="p-1.5 rounded-md bg-secondary hover:bg-border transition-colors"
                        title="Подробнее"
                      >
                        <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground text-center">
        Нажмите на статус для переключения стандарт / premium (5% / 8%)
      </p>
    </div>
  )
}
