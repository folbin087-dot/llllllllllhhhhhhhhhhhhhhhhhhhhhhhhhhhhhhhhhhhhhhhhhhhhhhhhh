"use client"

import { useState } from "react"

type LogType = "all" | "deposits" | "wins" | "losses"

const logs = [
  { id: 1, type: "deposit", user: "Player_4821", game: "СБП", amount: 5000, time: "2026-03-04 14:32" },
  { id: 2, type: "win", user: "Player_6629", game: "Dice", amount: 1200, time: "2026-03-04 14:28" },
  { id: 3, type: "loss", user: "Player_9103", game: "Mines", amount: -500, time: "2026-03-04 14:25" },
  { id: 4, type: "win", user: "Player_7788", game: "Wheel", amount: 3500, time: "2026-03-04 14:20" },
  { id: 5, type: "deposit", user: "Player_3345", game: "TON", amount: 2000, time: "2026-03-04 14:15" },
  { id: 6, type: "loss", user: "Player_2210", game: "Dice", amount: -300, time: "2026-03-04 14:10" },
  { id: 7, type: "win", user: "Player_5544", game: "BlackJack", amount: 800, time: "2026-03-04 14:05" },
  { id: 8, type: "loss", user: "Player_4821", game: "Roulette", amount: -1500, time: "2026-03-04 14:00" },
  { id: 9, type: "deposit", user: "Player_7788", game: "СБП", amount: 10000, time: "2026-03-04 13:55" },
  { id: 10, type: "win", user: "Player_9103", game: "Plinko", amount: 2200, time: "2026-03-04 13:50" },
  { id: 11, type: "loss", user: "Player_6629", game: "Mines", amount: -700, time: "2026-03-04 13:45" },
  { id: 12, type: "win", user: "Player_3345", game: "Bubbles", amount: 450, time: "2026-03-04 13:40" },
]

const filterTabs: { id: LogType; label: string }[] = [
  { id: "all", label: "Все" },
  { id: "deposits", label: "Пополнения" },
  { id: "wins", label: "Выигрыши" },
  { id: "losses", label: "Проигрыши" },
]

export default function AdminLogs() {
  const [filter, setFilter] = useState<LogType>("all")

  const filtered = logs.filter((log) => {
    if (filter === "all") return true
    if (filter === "deposits") return log.type === "deposit"
    if (filter === "wins") return log.type === "win"
    if (filter === "losses") return log.type === "loss"
    return true
  })

  return (
    <div className="flex flex-col gap-4">
      {/* Filter Tabs */}
      <div className="flex items-center gap-1 bg-card rounded-lg border border-border/50 p-1">
        {filterTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              filter === tab.id
                ? "bg-[#2ee06e] text-[#0f1923]"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Logs */}
      <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-secondary/50">
                <th className="text-left px-3 py-2.5 text-xs font-medium text-muted-foreground">Тип</th>
                <th className="text-left px-3 py-2.5 text-xs font-medium text-muted-foreground">Игрок</th>
                <th className="text-left px-3 py-2.5 text-xs font-medium text-muted-foreground">Игра/Метод</th>
                <th className="text-right px-3 py-2.5 text-xs font-medium text-muted-foreground">Сумма</th>
                <th className="text-right px-3 py-2.5 text-xs font-medium text-muted-foreground">Время</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((log) => (
                <tr key={log.id} className="border-t border-border/50 hover:bg-secondary/30">
                  <td className="px-3 py-2.5">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        log.type === "deposit"
                          ? "bg-[#00b4d8]/20 text-[#00b4d8]"
                          : log.type === "win"
                            ? "bg-[#2ee06e]/20 text-[#2ee06e]"
                            : "bg-destructive/20 text-destructive"
                      }`}
                    >
                      {log.type === "deposit" ? "Депозит" : log.type === "win" ? "Выигрыш" : "Проигрыш"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 font-medium text-foreground">{log.user}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{log.game}</td>
                  <td
                    className={`px-3 py-2.5 text-right font-semibold ${
                      log.amount > 0 ? "text-[#2ee06e]" : "text-destructive"
                    }`}
                  >
                    {log.amount > 0 ? "+" : ""}{log.amount} ₽
                  </td>
                  <td className="px-3 py-2.5 text-right text-muted-foreground text-xs">{log.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
