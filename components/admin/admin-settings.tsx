"use client"

import { useState, useEffect } from "react"
import { Save, RotateCcw, Percent, MessageCircle, ExternalLink, Link2, Gift, Plus, Trash2, ToggleLeft, ToggleRight } from "lucide-react"

// Game odds configuration
interface GameOdds {
  aviatrix: number
  plinko: number
  mines: number
  dice: number
  blackjack: number
  roulette: number
}

interface SiteSettings {
  siteName: string
  supportEmail: string
  minDeposit: number
  maxDeposit: number
  minWithdraw: number
  maxWithdraw: number
  maintenanceMode: boolean
  telegramChannel: string
  telegramSupport: string
}

interface BonusChannel {
  id: string
  name: string
  username: string
  type: "channel" | "group"
  reward: number
  isActive: boolean
}

const defaultOdds: GameOdds = {
  aviatrix: 5,
  plinko: 5,
  mines: 5,
  dice: 5,
  blackjack: 3,
  roulette: 5,
}

const defaultSettings: SiteSettings = {
  siteName: "PlaidCas",
  supportEmail: "support@plaidcas.live",
  telegramChannel: "@plaidcas_official",
  telegramSupport: "@plaidcas_support",
  minDeposit: 100,
  maxDeposit: 500000,
  minWithdraw: 500,
  maxWithdraw: 100000,
  maintenanceMode: false,
}

const gameNames: Record<keyof GameOdds, string> = {
  aviatrix: "Aviatrix",
  plinko: "Plinko",
  mines: "Mines",
  dice: "Dice",
  blackjack: "BlackJack",
  roulette: "Рулетка",
}

const gameDescriptions: Record<keyof GameOdds, string> = {
  aviatrix: "Процент дополнительного преимущества казино",
  plinko: "Влияет на частоту попадания в выгодные слоты",
  mines: "Вероятность расположения бомб",
  dice: "Дополнительное преимущество при высоких множителях",
  blackjack: "Преимущество дилера при раздаче карт",
  roulette: "Влияет на результат вращения",
}

export default function AdminSettings() {
  const [odds, setOdds] = useState<GameOdds>(defaultOdds)
  const [settings, setSettings] = useState<SiteSettings>(defaultSettings)
  const [saved, setSaved] = useState(false)
  const [globalEdge, setGlobalEdge] = useState(5)
  const [activeSection, setActiveSection] = useState<"odds" | "telegram" | "limits" | "channels">("odds")
  const [bonusChannels, setBonusChannels] = useState<BonusChannel[]>([
    { id: "1", name: "PlaidCas Новости", username: "@plaidcas_news", type: "channel", reward: 50, isActive: true },
    { id: "2", name: "Чат игроков", username: "@plaidcas_chat", type: "group", reward: 30, isActive: true },
  ])
  const [newChannel, setNewChannel] = useState<Partial<BonusChannel>>({
    name: "",
    username: "",
    type: "channel",
    reward: 50,
  })

  // Load saved settings from localStorage
  useEffect(() => {
    const savedOdds = localStorage.getItem("casino_game_odds")
    const savedSettings = localStorage.getItem("casino_site_settings")
    
    if (savedOdds) {
      try {
        setOdds(JSON.parse(savedOdds))
      } catch {
        setOdds(defaultOdds)
      }
    }
    
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings))
      } catch {
        setSettings(defaultSettings)
      }
    }
  }, [])

  const handleOddsChange = (game: keyof GameOdds, value: number) => {
    setOdds((prev) => ({
      ...prev,
      [game]: Math.max(0, Math.min(50, value)),
    }))
    setSaved(false)
  }

  const handleSettingsChange = (key: keyof SiteSettings, value: string | number) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }))
    setSaved(false)
  }

  const applyGlobalEdge = () => {
    const newOdds: GameOdds = {
      aviatrix: globalEdge,
      plinko: globalEdge,
      mines: globalEdge,
      dice: globalEdge,
      blackjack: Math.max(1, globalEdge - 2),
      roulette: globalEdge,
    }
    setOdds(newOdds)
    setSaved(false)
  }

  const saveAll = () => {
    localStorage.setItem("casino_game_odds", JSON.stringify(odds))
    localStorage.setItem("casino_site_settings", JSON.stringify(settings))
    
    if (typeof window !== "undefined") {
      (window as typeof window & { casinoOdds: GameOdds; casinoSettings: SiteSettings }).casinoOdds = odds
      ;(window as typeof window & { casinoSettings: SiteSettings }).casinoSettings = settings
    }
    
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const resetToDefault = () => {
    if (confirm("Сбросить все настройки к значениям по умолчанию?")) {
      setOdds(defaultOdds)
      setSettings(defaultSettings)
      setSaved(false)
    }
  }

  const getEdgeColor = (value: number) => {
    if (value <= 3) return "text-[#2ee06e]"
    if (value <= 7) return "text-[#ffd93d]"
    if (value <= 15) return "text-[#ff9f43]"
    return "text-[#ff4757]"
  }

  const getEdgeBg = (value: number) => {
    if (value <= 3) return "bg-[#2ee06e]/20"
    if (value <= 7) return "bg-[#ffd93d]/20"
    if (value <= 15) return "bg-[#ff9f43]/20"
    return "bg-[#ff4757]/20"
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Section Tabs */}
      <div className="flex items-center gap-1 bg-card rounded-xl border border-border/50 p-1">
        <button
          onClick={() => setActiveSection("odds")}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeSection === "odds"
              ? "bg-[#ff4757] text-white"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary"
          }`}
        >
          <Percent className="w-4 h-4" />
          Подкрутка
        </button>
        <button
          onClick={() => setActiveSection("telegram")}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeSection === "telegram"
              ? "bg-[#2aabee] text-white"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary"
          }`}
        >
          <MessageCircle className="w-4 h-4" />
          Telegram
        </button>
        <button
          onClick={() => setActiveSection("limits")}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeSection === "limits"
              ? "bg-[#ffd93d] text-[#0f1923]"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary"
          }`}
        >
<Link2 className="w-4 h-4" />
  Лимиты
  </button>
  <button
  onClick={() => setActiveSection("channels")}
  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
  activeSection === "channels"
  ? "bg-[#6c5ce7] text-white"
  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
  }`}
  >
  <Gift className="w-4 h-4" />
  Бонусы
  </button>
  </div>

      {/* Odds Section */}
      {activeSection === "odds" && (
        <>
          {/* Header */}
          <div className="bg-[#ff4757]/10 border border-[#ff4757]/30 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Percent className="w-5 h-5 text-[#ff4757]" />
              <span className="text-sm font-semibold text-[#ff4757]">Подкрутка шансов</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Настройте преимущество казино для каждой игры. Большее значение = меньше шансов на выигрыш у игроков.
            </p>
          </div>

          {/* Global Edge Control */}
          <div className="bg-card rounded-xl border border-border/50 p-4">
            <label className="text-sm font-medium text-foreground mb-3 block">
              Установить общий % для всех игр
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={0}
                max={30}
                value={globalEdge}
                onChange={(e) => setGlobalEdge(parseInt(e.target.value))}
                className="flex-1 h-2 bg-secondary rounded-lg appearance-none cursor-pointer"
              />
              <span className={`text-lg font-bold w-16 text-center ${getEdgeColor(globalEdge)}`}>
                {globalEdge}%
              </span>
              <button
                onClick={applyGlobalEdge}
                className="px-4 py-2 bg-[#00b4d8] hover:bg-[#0096b7] text-white text-sm font-semibold rounded-lg transition-colors"
              >
                Применить
              </button>
            </div>
          </div>

          {/* Individual Game Settings */}
          <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
            <div className="px-4 py-3 bg-secondary/30 border-b border-border/50">
              <h3 className="text-sm font-semibold text-foreground">Настройки по играм</h3>
            </div>
            
            <div className="p-4 flex flex-col gap-4">
              {(Object.keys(odds) as (keyof GameOdds)[]).map((game) => (
                <div key={game} className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">{gameNames[game]}</p>
                      <p className="text-xs text-muted-foreground">{gameDescriptions[game]}</p>
                    </div>
                    <div className={`px-3 py-1.5 rounded-lg ${getEdgeBg(odds[game])}`}>
                      <span className={`text-lg font-bold ${getEdgeColor(odds[game])}`}>
                        {odds[game]}%
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={0}
                      max={50}
                      value={odds[game]}
                      onChange={(e) => handleOddsChange(game, parseInt(e.target.value))}
                      className="flex-1 h-2 bg-secondary rounded-lg appearance-none cursor-pointer"
                    />
                    <input
                      type="number"
                      min={0}
                      max={50}
                      value={odds[game]}
                      onChange={(e) => handleOddsChange(game, parseInt(e.target.value) || 0)}
                      className="w-16 bg-secondary text-foreground text-center text-sm font-medium py-1.5 rounded-lg outline-none border border-border/50 focus:border-[#2ee06e]/50"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Edge Levels Guide */}
          <div className="bg-card rounded-xl border border-border/50 p-4">
            <h4 className="text-sm font-medium text-foreground mb-3">Уровни подкрутки</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#2ee06e]" />
                <span className="text-muted-foreground">0-3%: Честная игра</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#ffd93d]" />
                <span className="text-muted-foreground">4-7%: Стандартное казино</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#ff9f43]" />
                <span className="text-muted-foreground">8-15%: Агрессивная подкрутка</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#ff4757]" />
                <span className="text-muted-foreground">16%+: Максимальная подкрутка</span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Telegram Section */}
      {activeSection === "telegram" && (
        <>
          <div className="bg-[#2aabee]/10 border border-[#2aabee]/30 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <MessageCircle className="w-5 h-5 text-[#2aabee]" />
              <span className="text-sm font-semibold text-[#2aabee]">Telegram ссылки</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Настройте ссылки на Telegram канал и поддержку проекта.
            </p>
          </div>

          <div className="bg-card rounded-xl border border-border/50 p-4 space-y-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Канал проекта</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={settings.telegramChannel}
                  onChange={(e) => handleSettingsChange("telegramChannel", e.target.value)}
                  placeholder="@casino_official"
                  className="flex-1 bg-secondary text-foreground px-3 py-2.5 rounded-lg outline-none border border-border/50 focus:border-[#2aabee]/50"
                />
                <a
                  href={`https://t.me/${settings.telegramChannel.replace("@", "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 bg-[#2aabee]/20 hover:bg-[#2aabee]/30 text-[#2aabee] rounded-lg transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                Ссылка отображается в футере и разделе поддержки
              </p>
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Поддержка</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={settings.telegramSupport}
                  onChange={(e) => handleSettingsChange("telegramSupport", e.target.value)}
                  placeholder="@casino_support"
                  className="flex-1 bg-secondary text-foreground px-3 py-2.5 rounded-lg outline-none border border-border/50 focus:border-[#2aabee]/50"
                />
                <a
                  href={`https://t.me/${settings.telegramSupport.replace("@", "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 bg-[#2aabee]/20 hover:bg-[#2aabee]/30 text-[#2aabee] rounded-lg transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                Ссылка на аккаунт/бота поддержки
              </p>
            </div>
          </div>
        </>
      )}

      {/* Limits Section */}
{/* Bonus Channels Section */}
  {activeSection === "channels" && (
  <>
  <div className="bg-[#6c5ce7]/10 border border-[#6c5ce7]/30 rounded-xl p-4">
  <div className="flex items-center gap-2 mb-2">
  <Gift className="w-5 h-5 text-[#6c5ce7]" />
  <span className="text-sm font-semibold text-[#6c5ce7]">Бонусные каналы</span>
  </div>
  <p className="text-xs text-muted-foreground">
  Управляйте каналами и группами, за подписку на которые игроки получают бонус.
  </p>
  </div>
  
  {/* Add New Channel Form */}
  <div className="bg-card rounded-xl border border-border/50 p-4">
  <h4 className="text-sm font-semibold text-foreground mb-3">Добавить канал</h4>
  <div className="space-y-3">
  <div className="grid grid-cols-2 gap-3">
  <div>
  <label className="text-xs text-muted-foreground mb-1 block">Название</label>
  <input
  type="text"
  value={newChannel.name || ""}
  onChange={(e) => setNewChannel({ ...newChannel, name: e.target.value })}
  placeholder="PlaidCas VIP"
  className="w-full bg-secondary text-foreground px-3 py-2 rounded-lg outline-none border border-border/50 text-sm"
  />
  </div>
  <div>
  <label className="text-xs text-muted-foreground mb-1 block">Username</label>
  <input
  type="text"
  value={newChannel.username || ""}
  onChange={(e) => setNewChannel({ ...newChannel, username: e.target.value })}
  placeholder="@channel_name"
  className="w-full bg-secondary text-foreground px-3 py-2 rounded-lg outline-none border border-border/50 text-sm"
  />
  </div>
  </div>
  <div className="grid grid-cols-2 gap-3">
  <div>
  <label className="text-xs text-muted-foreground mb-1 block">Тип</label>
  <select
  value={newChannel.type || "channel"}
  onChange={(e) => setNewChannel({ ...newChannel, type: e.target.value as "channel" | "group" })}
  className="w-full bg-secondary text-foreground px-3 py-2 rounded-lg outline-none border border-border/50 text-sm"
  >
  <option value="channel">Канал</option>
  <option value="group">Группа</option>
  </select>
  </div>
  <div>
  <label className="text-xs text-muted-foreground mb-1 block">Награда (₽)</label>
  <input
  type="number"
  value={newChannel.reward || 50}
  onChange={(e) => setNewChannel({ ...newChannel, reward: parseInt(e.target.value) || 0 })}
  className="w-full bg-secondary text-foreground px-3 py-2 rounded-lg outline-none border border-border/50 text-sm"
  />
  </div>
  </div>
  <button
  onClick={() => {
  if (newChannel.name && newChannel.username) {
  setBonusChannels([...bonusChannels, {
  id: Date.now().toString(),
  name: newChannel.name,
  username: newChannel.username.startsWith("@") ? newChannel.username : `@${newChannel.username}`,
  type: newChannel.type || "channel",
  reward: newChannel.reward || 50,
  isActive: true,
  }])
  setNewChannel({ name: "", username: "", type: "channel", reward: 50 })
  }
  }}
  className="w-full flex items-center justify-center gap-2 bg-[#6c5ce7] hover:bg-[#5b4cdb] text-white py-2 rounded-lg text-sm font-semibold transition-colors"
  >
  <Plus className="w-4 h-4" />
  Добавить канал
  </button>
  </div>
  </div>
  
  {/* Channels List */}
  <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
  <div className="px-4 py-3 bg-secondary/30 border-b border-border/50">
  <h3 className="text-sm font-semibold text-foreground">Активные каналы</h3>
  </div>
  <div className="p-4 space-y-3">
  {bonusChannels.length === 0 ? (
  <p className="text-sm text-muted-foreground text-center py-4">Нет добавленных каналов</p>
  ) : (
  bonusChannels.map((channel) => (
  <div key={channel.id} className={`flex items-center gap-3 p-3 rounded-lg ${channel.isActive ? "bg-secondary" : "bg-secondary/50 opacity-60"}`}>
  <div className="flex-1 min-w-0">
  <div className="flex items-center gap-2">
  <span className="text-sm font-medium text-foreground truncate">{channel.name}</span>
  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
  channel.type === "channel" ? "bg-[#2aabee]/20 text-[#2aabee]" : "bg-[#ffd93d]/20 text-[#ffd93d]"
  }`}>
  {channel.type === "channel" ? "КАНАЛ" : "ГРУППА"}
  </span>
  </div>
  <span className="text-xs text-muted-foreground">{channel.username}</span>
  </div>
  <span className="text-sm font-bold text-[#2ee06e]">+{channel.reward} ₽</span>
  <button
  onClick={() => {
  setBonusChannels(bonusChannels.map(ch =>
  ch.id === channel.id ? { ...ch, isActive: !ch.isActive } : ch
  ))
  }}
  className="p-1.5 rounded-lg hover:bg-background/50 transition-colors"
  title={channel.isActive ? "Отключить" : "Включить"}
  >
  {channel.isActive ? (
  <ToggleRight className="w-5 h-5 text-[#2ee06e]" />
  ) : (
  <ToggleLeft className="w-5 h-5 text-muted-foreground" />
  )}
  </button>
  <button
  onClick={() => setBonusChannels(bonusChannels.filter(ch => ch.id !== channel.id))}
  className="p-1.5 rounded-lg hover:bg-[#ff4757]/20 text-muted-foreground hover:text-[#ff4757] transition-colors"
  title="Удалить"
  >
  <Trash2 className="w-4 h-4" />
  </button>
  </div>
  ))
  )}
  </div>
  </div>
  </>
  )}
  
  {activeSection === "limits" && (
  <>
  <div className="bg-[#ffd93d]/10 border border-[#ffd93d]/30 rounded-xl p-4">
  <div className="flex items-center gap-2 mb-2">
  <Link2 className="w-5 h-5 text-[#ffd93d]" />
  <span className="text-sm font-semibold text-[#ffd93d]">Лимиты операций</span>
  </div>
  <p className="text-xs text-muted-foreground">
  Установите минимальные и максимальные суммы для пополнения и вывода.
  </p>
  </div>

          <div className="bg-card rounded-xl border border-border/50 p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Мин. депозит</label>
                <div className="flex items-center bg-secondary rounded-lg overflow-hidden border border-border/50">
                  <input
                    type="number"
                    value={settings.minDeposit}
                    onChange={(e) => handleSettingsChange("minDeposit", parseInt(e.target.value) || 0)}
                    className="flex-1 bg-transparent text-foreground px-3 py-2.5 outline-none min-w-0"
                  />
                  <span className="px-3 text-muted-foreground text-sm">₽</span>
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Макс. депозит</label>
                <div className="flex items-center bg-secondary rounded-lg overflow-hidden border border-border/50">
                  <input
                    type="number"
                    value={settings.maxDeposit}
                    onChange={(e) => handleSettingsChange("maxDeposit", parseInt(e.target.value) || 0)}
                    className="flex-1 bg-transparent text-foreground px-3 py-2.5 outline-none min-w-0"
                  />
                  <span className="px-3 text-muted-foreground text-sm">₽</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Мин. вывод</label>
                <div className="flex items-center bg-secondary rounded-lg overflow-hidden border border-border/50">
                  <input
                    type="number"
                    value={settings.minWithdraw}
                    onChange={(e) => handleSettingsChange("minWithdraw", parseInt(e.target.value) || 0)}
                    className="flex-1 bg-transparent text-foreground px-3 py-2.5 outline-none min-w-0"
                  />
                  <span className="px-3 text-muted-foreground text-sm">₽</span>
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Макс. вывод</label>
                <div className="flex items-center bg-secondary rounded-lg overflow-hidden border border-border/50">
                  <input
                    type="number"
                    value={settings.maxWithdraw}
                    onChange={(e) => handleSettingsChange("maxWithdraw", parseInt(e.target.value) || 0)}
                    className="flex-1 bg-transparent text-foreground px-3 py-2.5 outline-none min-w-0"
                  />
                  <span className="px-3 text-muted-foreground text-sm">₽</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={resetToDefault}
          className="flex-1 flex items-center justify-center gap-2 bg-secondary hover:bg-border text-foreground font-semibold py-3 rounded-xl transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          Сбросить
        </button>
        <button
          onClick={saveAll}
          className={`flex-1 flex items-center justify-center gap-2 font-semibold py-3 rounded-xl transition-colors ${
            saved 
              ? "bg-[#2ee06e] text-[#0f1923]" 
              : "bg-[#2ee06e] hover:bg-[#25c45c] text-[#0f1923]"
          }`}
        >
          <Save className="w-4 h-4" />
          {saved ? "Сохранено!" : "Сохранить"}
        </button>
      </div>
    </div>
  )
}
