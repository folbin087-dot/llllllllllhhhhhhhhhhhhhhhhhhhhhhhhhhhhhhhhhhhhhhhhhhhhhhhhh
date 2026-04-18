"use client"

import { useState } from "react"
import { Plus, Trash2 } from "lucide-react"

interface Promo {
  id: number
  code: string
  type: "percent" | "balance"
  value: number
  maxUses: number
  usedCount: number
  active: boolean
}

const initialPromos: Promo[] = [
  { id: 1, code: "BONUS50", type: "balance", value: 50, maxUses: 100, usedCount: 43, active: true },
  { id: 2, code: "START100", type: "balance", value: 100, maxUses: 50, usedCount: 12, active: true },
  { id: 3, code: "DEPO20", type: "percent", value: 20, maxUses: 200, usedCount: 87, active: true },
  { id: 4, code: "VIP50", type: "percent", value: 50, maxUses: 10, usedCount: 10, active: false },
]

export default function AdminPromos() {
  const [promos, setPromos] = useState<Promo[]>(initialPromos)
  const [showAdd, setShowAdd] = useState(false)
  const [newCode, setNewCode] = useState("")
  const [newType, setNewType] = useState<"percent" | "balance">("balance")
  const [newValue, setNewValue] = useState(0)
  const [newMaxUses, setNewMaxUses] = useState(100)

  const addPromo = () => {
    if (!newCode || newValue <= 0) return
    setPromos((prev) => [
      ...prev,
      {
        id: Date.now(),
        code: newCode.toUpperCase(),
        type: newType,
        value: newValue,
        maxUses: newMaxUses,
        usedCount: 0,
        active: true,
      },
    ])
    setNewCode("")
    setNewValue(0)
    setNewMaxUses(100)
    setShowAdd(false)
  }

  const removePromo = (id: number) => {
    setPromos((prev) => prev.filter((p) => p.id !== id))
  }

  const togglePromo = (id: number) => {
    setPromos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, active: !p.active } : p))
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Создание и управление промо-кодами
        </p>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-1.5 bg-[#2ee06e] hover:bg-[#25c45c] text-[#0f1923] font-semibold text-sm px-3 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Создать
        </button>
      </div>

      {/* Add Form */}
      {showAdd && (
        <div className="bg-card rounded-xl border border-[#2ee06e]/30 p-4 flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-foreground">Новый промо-код</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Код</label>
              <input
                type="text"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value)}
                placeholder="BONUS100"
                className="w-full bg-secondary text-sm text-foreground px-3 py-2.5 rounded-lg outline-none placeholder:text-muted-foreground/50 uppercase"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Тип</label>
              <div className="flex bg-secondary rounded-lg overflow-hidden h-[42px]">
                <button
                  onClick={() => setNewType("balance")}
                  className={`flex-1 text-xs font-semibold transition-colors ${
                    newType === "balance" ? "bg-[#2ee06e] text-[#0f1923]" : "text-muted-foreground"
                  }`}
                >
                  На баланс
                </button>
                <button
                  onClick={() => setNewType("percent")}
                  className={`flex-1 text-xs font-semibold transition-colors ${
                    newType === "percent" ? "bg-[#00b4d8] text-[#0f1923]" : "text-muted-foreground"
                  }`}
                >
                  % к депозиту
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                {newType === "balance" ? "Сумма (₽)" : "Процент (%)"}
              </label>
              <input
                type="number"
                value={newValue}
                onChange={(e) => setNewValue(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full bg-secondary text-sm text-foreground px-3 py-2.5 rounded-lg outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Макс. использований</label>
              <input
                type="number"
                value={newMaxUses}
                onChange={(e) => setNewMaxUses(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full bg-secondary text-sm text-foreground px-3 py-2.5 rounded-lg outline-none"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={addPromo}
              className="bg-[#2ee06e] hover:bg-[#25c45c] text-[#0f1923] font-semibold text-sm px-4 py-2 rounded-lg transition-colors"
            >
              Создать
            </button>
            <button
              onClick={() => setShowAdd(false)}
              className="bg-secondary hover:bg-border text-foreground font-semibold text-sm px-4 py-2 rounded-lg transition-colors"
            >
              Отмена
            </button>
          </div>
        </div>
      )}

      {/* Promos Table */}
      <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-secondary/50">
                <th className="text-left px-3 py-2.5 text-xs font-medium text-muted-foreground">Код</th>
                <th className="text-left px-3 py-2.5 text-xs font-medium text-muted-foreground">Тип</th>
                <th className="text-right px-3 py-2.5 text-xs font-medium text-muted-foreground">Значение</th>
                <th className="text-right px-3 py-2.5 text-xs font-medium text-muted-foreground">Использований</th>
                <th className="text-center px-3 py-2.5 text-xs font-medium text-muted-foreground">Статус</th>
                <th className="text-center px-3 py-2.5 text-xs font-medium text-muted-foreground">Действия</th>
              </tr>
            </thead>
            <tbody>
              {promos.map((promo) => (
                <tr key={promo.id} className="border-t border-border/50 hover:bg-secondary/30">
                  <td className="px-3 py-2.5 font-mono font-bold text-foreground">{promo.code}</td>
                  <td className="px-3 py-2.5">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        promo.type === "balance"
                          ? "bg-[#2ee06e]/20 text-[#2ee06e]"
                          : "bg-[#00b4d8]/20 text-[#00b4d8]"
                      }`}
                    >
                      {promo.type === "balance" ? "Баланс" : "% депозит"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right font-semibold text-foreground">
                    {promo.type === "balance" ? `${promo.value} ₽` : `${promo.value}%`}
                  </td>
                  <td className="px-3 py-2.5 text-right text-muted-foreground">
                    {promo.usedCount} / {promo.maxUses}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <button
                      onClick={() => togglePromo(promo.id)}
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                        promo.active
                          ? "bg-[#2ee06e]/20 text-[#2ee06e] hover:bg-[#2ee06e]/30"
                          : "bg-secondary text-muted-foreground hover:bg-border"
                      }`}
                    >
                      {promo.active ? "Активен" : "Выкл"}
                    </button>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <button
                      onClick={() => removePromo(promo.id)}
                      className="p-1 rounded bg-destructive/20 hover:bg-destructive/30 text-destructive transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
