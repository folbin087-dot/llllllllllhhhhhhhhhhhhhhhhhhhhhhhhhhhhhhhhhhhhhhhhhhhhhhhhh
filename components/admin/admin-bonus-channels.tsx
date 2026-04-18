"use client"

import { useState, useEffect } from "react"
import { Plus, Trash2, Edit2, Check, X, ExternalLink, Users, Gift, RefreshCw, AlertCircle, Bot } from "lucide-react"

interface BonusChannel {
  id: string
  name: string
  username: string // @channel_username or invite link
  type: "channel" | "group"
  reward: number // bonus in RUB
  isActive: boolean
  subscriberCount?: number
  claimsCount: number
  createdAt: Date
  requiresJoinRequest?: boolean // For private groups that require join request
}

// Mock data - in production this comes from database
const initialChannels: BonusChannel[] = [
  {
    id: "1",
    name: "PlaidCas Новости",
    username: "@plaidcas_news",
    type: "channel",
    reward: 50,
    isActive: true,
    subscriberCount: 15420,
    claimsCount: 342,
    createdAt: new Date("2024-01-15"),
  },
  {
    id: "2",
    name: "Чат игроков",
    username: "@plaidcas_chat",
    type: "group",
    reward: 30,
    isActive: true,
    subscriberCount: 8750,
    claimsCount: 189,
    createdAt: new Date("2024-02-01"),
  },
  {
    id: "3",
    name: "VIP Канал",
    username: "@plaidcas_vip",
    type: "channel",
    reward: 100,
    isActive: true,
    subscriberCount: 2100,
    claimsCount: 87,
    createdAt: new Date("2024-02-10"),
  },
]

export default function AdminBonusChannels() {
  const [channels, setChannels] = useState<BonusChannel[]>(initialChannels)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingChannel, setEditingChannel] = useState<BonusChannel | null>(null)
  const [botStatus, setBotStatus] = useState<{ configured: boolean; bot?: { username: string } } | null>(null)
  
  // Form state
  const [formName, setFormName] = useState("")
  const [formUsername, setFormUsername] = useState("")
  const [formType, setFormType] = useState<"channel" | "group">("channel")
  const [formReward, setFormReward] = useState(50)
  const [formRequiresJoinRequest, setFormRequiresJoinRequest] = useState(false)

  // Check Telegram bot status on mount
  useEffect(() => {
    const checkBotStatus = async () => {
      try {
        const response = await fetch("/api/telegram/verify-subscription")
        const data = await response.json()
        setBotStatus(data)
      } catch {
        setBotStatus({ configured: false })
      }
    }
    checkBotStatus()
  }, [])

  const openAddModal = () => {
    setFormName("")
    setFormUsername("")
    setFormType("channel")
    setFormReward(50)
    setFormRequiresJoinRequest(false)
    setEditingChannel(null)
    setShowAddModal(true)
  }

  const openEditModal = (channel: BonusChannel) => {
    setFormName(channel.name)
    setFormUsername(channel.username)
    setFormType(channel.type)
    setFormReward(channel.reward)
    setFormRequiresJoinRequest(channel.requiresJoinRequest || false)
    setEditingChannel(channel)
    setShowAddModal(true)
  }

  const closeModal = () => {
    setShowAddModal(false)
    setEditingChannel(null)
    setFormRequiresJoinRequest(false)
  }

  const saveChannel = () => {
    if (!formName || !formUsername || formReward <= 0) return

    // Format username properly
    const formattedUsername = formUsername.startsWith("@") || formUsername.startsWith("https://") 
      ? formUsername 
      : `@${formUsername}`

    if (editingChannel) {
      // Update existing
      setChannels(prev => prev.map(ch => 
        ch.id === editingChannel.id 
          ? { 
              ...ch, 
              name: formName, 
              username: formattedUsername, 
              type: formType, 
              reward: formReward,
              requiresJoinRequest: formType === "group" ? formRequiresJoinRequest : false,
            }
          : ch
      ))
    } else {
      // Add new
      const newChannel: BonusChannel = {
        id: Date.now().toString(),
        name: formName,
        username: formattedUsername,
        type: formType,
        reward: formReward,
        isActive: true,
        claimsCount: 0,
        createdAt: new Date(),
        requiresJoinRequest: formType === "group" ? formRequiresJoinRequest : false,
      }
      setChannels(prev => [...prev, newChannel])
    }
    closeModal()
  }

  const toggleActive = (id: string) => {
    setChannels(prev => prev.map(ch => 
      ch.id === id ? { ...ch, isActive: !ch.isActive } : ch
    ))
  }

  const deleteChannel = (id: string) => {
    if (confirm("Удалить канал? Пользователи больше не смогут получить бонус.")) {
      setChannels(prev => prev.filter(ch => ch.id !== id))
    }
  }

  const totalRewardsPaid = channels.reduce((sum, ch) => sum + (ch.claimsCount * ch.reward), 0)
  const activeChannels = channels.filter(ch => ch.isActive).length

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="bg-[#2ee06e]/10 border border-[#2ee06e]/30 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <Gift className="w-5 h-5 text-[#2ee06e]" />
          <span className="text-sm font-semibold text-[#2ee06e]">Бонусы за подписку</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Добавьте Telegram каналы/группы. Пользователи получат бонус за подписку после проверки.
        </p>
      </div>

      {/* Bot Status */}
      <div className={`rounded-xl p-4 border ${
        botStatus?.configured 
          ? "bg-[#2aabee]/10 border-[#2aabee]/30" 
          : "bg-amber-500/10 border-amber-500/30"
      }`}>
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
            botStatus?.configured ? "bg-[#2aabee]/20" : "bg-amber-500/20"
          }`}>
            <Bot className={`w-5 h-5 ${botStatus?.configured ? "text-[#2aabee]" : "text-amber-500"}`} />
          </div>
          <div className="flex-1">
            <p className={`text-sm font-medium ${botStatus?.configured ? "text-[#2aabee]" : "text-amber-500"}`}>
              {botStatus?.configured ? "Telegram бот подключен" : "Telegram бот не настроен"}
            </p>
            {botStatus?.configured && botStatus.bot ? (
              <p className="text-xs text-muted-foreground mt-0.5">
                @{botStatus.bot.username} - готов проверять подписки
              </p>
            ) : (
              <p className="text-xs text-muted-foreground mt-0.5">
                Установите TELEGRAM_BOT_TOKEN для проверки подписок. Бот должен быть админом в каналах.
              </p>
            )}
          </div>
          {!botStatus?.configured && (
            <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card rounded-xl border border-border/50 p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{channels.length}</p>
          <p className="text-xs text-muted-foreground">Всего каналов</p>
        </div>
        <div className="bg-card rounded-xl border border-border/50 p-4 text-center">
          <p className="text-2xl font-bold text-[#2ee06e]">{activeChannels}</p>
          <p className="text-xs text-muted-foreground">Активных</p>
        </div>
        <div className="bg-card rounded-xl border border-border/50 p-4 text-center">
          <p className="text-2xl font-bold text-[#ffd93d]">{totalRewardsPaid.toLocaleString()} ₽</p>
          <p className="text-xs text-muted-foreground">Выплачено</p>
        </div>
      </div>

      {/* Add Button */}
      <button
        onClick={openAddModal}
        className="flex items-center justify-center gap-2 bg-[#2ee06e] hover:bg-[#25c45c] text-[#0f1923] font-semibold py-3 rounded-xl transition-colors"
      >
        <Plus className="w-4 h-4" />
        Добавить канал
      </button>

      {/* Channels List */}
      <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
        <div className="px-4 py-3 bg-secondary/30 border-b border-border/50">
          <h3 className="text-sm font-semibold text-foreground">Список каналов</h3>
        </div>
        
        {channels.length === 0 ? (
          <div className="p-8 text-center">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-muted-foreground">Нет добавленных каналов</p>
          </div>
        ) : (
          <div className="divide-y divide-border/30">
            {channels.map((channel) => (
              <div key={channel.id} className={`p-4 ${!channel.isActive ? "opacity-60" : ""}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-medium text-foreground truncate">{channel.name}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        channel.type === "channel" 
                          ? "bg-[#00b4d8]/20 text-[#00b4d8]" 
                          : "bg-[#ffd93d]/20 text-[#ffd93d]"
                      }`}>
                        {channel.type === "channel" ? "КАНАЛ" : "ГРУППА"}
                      </span>
                      {channel.requiresJoinRequest && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-400">
                          ЗАЯВКА
                        </span>
                      )}
                      {!channel.isActive && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-destructive/20 text-destructive">
                          ВЫКЛ
                        </span>
                      )}
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
                    
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      {channel.subscriberCount && (
                        <span>{channel.subscriberCount.toLocaleString()} подписчиков</span>
                      )}
                      <span>{channel.claimsCount} получили бонус</span>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end gap-2">
                    <div className="px-3 py-1 rounded-lg bg-[#2ee06e]/20">
                      <span className="text-sm font-bold text-[#2ee06e]">+{channel.reward} ₽</span>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(channel)}
                        className="p-1.5 rounded bg-secondary hover:bg-border transition-colors"
                        title="Редактировать"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                      <button
                        onClick={() => toggleActive(channel.id)}
                        className={`p-1.5 rounded transition-colors ${
                          channel.isActive 
                            ? "bg-[#2ee06e]/20 text-[#2ee06e]" 
                            : "bg-secondary text-muted-foreground"
                        }`}
                        title={channel.isActive ? "Выключить" : "Включить"}
                      >
                        {channel.isActive ? <Check className="w-3.5 h-3.5" /> : <RefreshCw className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => deleteChannel(channel.id)}
                        className="p-1.5 rounded bg-destructive/20 hover:bg-destructive/30 text-destructive transition-colors"
                        title="Удалить"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* How it works */}
      <div className="bg-card rounded-xl border border-border/50 p-4">
        <h4 className="text-sm font-medium text-foreground mb-3">Как это работает</h4>
        <ol className="text-xs text-muted-foreground space-y-2">
          <li className="flex items-start gap-2">
            <span className="w-5 h-5 rounded-full bg-[#2ee06e]/20 text-[#2ee06e] flex items-center justify-center flex-shrink-0 text-[10px] font-bold">1</span>
            <span>Пользователь видит список каналов в разделе "Бонусы"</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="w-5 h-5 rounded-full bg-[#2ee06e]/20 text-[#2ee06e] flex items-center justify-center flex-shrink-0 text-[10px] font-bold">2</span>
            <span>Подписывается на канал/группу через Telegram</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="w-5 h-5 rounded-full bg-[#2ee06e]/20 text-[#2ee06e] flex items-center justify-center flex-shrink-0 text-[10px] font-bold">3</span>
            <span>Нажимает "Проверить подписку" - бот проверяет через Telegram API</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="w-5 h-5 rounded-full bg-[#2ee06e]/20 text-[#2ee06e] flex items-center justify-center flex-shrink-0 text-[10px] font-bold">4</span>
            <span>При успешной проверке бонус начисляется на баланс</span>
          </li>
        </ol>
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl border border-border/50 w-full max-w-md overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border/50">
              <h3 className="font-semibold text-foreground">
                {editingChannel ? "Редактировать канал" : "Добавить канал"}
              </h3>
              <button 
                onClick={closeModal}
                className="p-2 rounded-lg hover:bg-secondary transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            {/* Form */}
            <div className="p-4 space-y-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Название</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Казино Новости"
                  className="w-full bg-secondary text-foreground px-3 py-2.5 rounded-lg outline-none border border-border/50 focus:border-[#2ee06e]/50"
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Username или ссылка</label>
                <input
                  type="text"
                  value={formUsername}
                  onChange={(e) => setFormUsername(e.target.value)}
                  placeholder="@channel_username"
                  className="w-full bg-secondary text-foreground px-3 py-2.5 rounded-lg outline-none border border-border/50 focus:border-[#2ee06e]/50"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Формат: @username или t.me/joinchat/xxx для приватных
                </p>
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Тип</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setFormType("channel")}
                    className={`py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      formType === "channel"
                        ? "bg-[#00b4d8] text-white"
                        : "bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Канал
                  </button>
                  <button
                    onClick={() => setFormType("group")}
                    className={`py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      formType === "group"
                        ? "bg-[#ffd93d] text-[#0f1923]"
                        : "bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Группа
                  </button>
                </div>
              </div>

              {formType === "group" && (
                <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg">
                  <input
                    type="checkbox"
                    id="joinRequest"
                    checked={formRequiresJoinRequest}
                    onChange={(e) => setFormRequiresJoinRequest(e.target.checked)}
                    className="w-4 h-4 rounded border-border accent-[#2ee06e]"
                  />
                  <label htmlFor="joinRequest" className="text-xs text-muted-foreground">
                    Требует заявку на вступление (приватная группа)
                  </label>
                </div>
              )}

              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Бонус за подписку (₽)</label>
                <input
                  type="number"
                  value={formReward}
                  onChange={(e) => setFormReward(Math.max(1, parseInt(e.target.value) || 0))}
                  min={1}
                  className="w-full bg-secondary text-foreground px-3 py-2.5 rounded-lg outline-none border border-border/50 focus:border-[#2ee06e]/50"
                />
                <div className="flex gap-2 mt-2">
                  {[10, 25, 50, 100].map((amount) => (
                    <button
                      key={amount}
                      onClick={() => setFormReward(amount)}
                      className={`flex-1 py-1.5 rounded text-xs font-medium transition-colors ${
                        formReward === amount
                          ? "bg-[#2ee06e] text-[#0f1923]"
                          : "bg-secondary text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {amount} ₽
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-border/50 flex gap-3">
              <button
                onClick={closeModal}
                className="flex-1 bg-secondary hover:bg-border text-foreground font-semibold py-2.5 rounded-lg transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={saveChannel}
                disabled={!formName || !formUsername || formReward <= 0}
                className="flex-1 bg-[#2ee06e] hover:bg-[#25c45c] disabled:opacity-50 text-[#0f1923] font-semibold py-2.5 rounded-lg transition-colors"
              >
                {editingChannel ? "Сохранить" : "Добавить"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
