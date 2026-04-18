"use client"

import { useState, useEffect } from "react"
import { TrendingUp, TrendingDown, Clock } from "lucide-react"

interface HistoryEntry {
  id: number
  username: string
  bet: number
  won: boolean
  payout: number
  timestamp: Date
}

// Generate random usernames
const usernames = [
  "Player_1847", "Player_9281", "Player_4562", "Player_7731", "Player_3349",
  "Player_5588", "Player_2203", "Player_8874", "Player_1122", "Player_6690",
  "Player_4412", "Player_7789", "Player_3321", "Player_9945", "Player_5567",
]

function generateRandomEntry(id: number): HistoryEntry {
  const won = Math.random() > 0.45
  const bet = [10, 25, 50, 100, 250, 500][Math.floor(Math.random() * 6)]
  const multiplier = won 
    ? 1 + Math.random() * 5
    : 0
  
  return {
    id,
    username: usernames[Math.floor(Math.random() * usernames.length)],
    bet,
    won,
    payout: won ? parseFloat((bet * multiplier).toFixed(2)) : 0,
    timestamp: new Date(),
  }
}

function formatTime(date: Date): string {
  const now = new Date()
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000)
  
  if (diff < 5) return "Сейчас"
  if (diff < 60) return `${diff} сек`
  if (diff < 3600) return `${Math.floor(diff / 60)} мин`
  return `${Math.floor(diff / 3600)} час`
}

interface GameHistoryProps {
  gameName: string
}

export default function GameHistory({ gameName }: GameHistoryProps) {
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [isExpanded, setIsExpanded] = useState(false)

  // Initialize with some history
  useEffect(() => {
    const initialHistory: HistoryEntry[] = []
    for (let i = 0; i < 10; i++) {
      const entry = generateRandomEntry(i)
      entry.timestamp = new Date(Date.now() - i * 5000) // Stagger timestamps
      initialHistory.push(entry)
    }
    setHistory(initialHistory)
  }, [])

  // Add new entries periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setHistory((prev) => {
        const newEntry = generateRandomEntry(Date.now())
        return [newEntry, ...prev.slice(0, 49)]
      })
    }, 3000 + Math.random() * 2000)

    return () => clearInterval(interval)
  }, [])

  // Update timestamps every second
  useEffect(() => {
    const interval = setInterval(() => {
      setHistory(prev => [...prev])
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const displayHistory = isExpanded ? history.slice(0, 20) : history.slice(0, 5)

  return (
    <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
      <div 
        className="flex items-center justify-between px-4 py-3 bg-secondary/30 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h3 className="text-sm font-semibold text-foreground">
          История игр - {gameName}
        </h3>
        <span className="text-xs text-muted-foreground">
          {isExpanded ? "Свернуть" : "Развернуть"}
        </span>
      </div>

      <div className="p-3">
        {/* Header - only 4 columns now: Player, Bet, Result, Time */}
        <div className="grid grid-cols-4 gap-2 px-2 pb-2 border-b border-border/50 mb-2">
          <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Игрок</span>
          <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider text-center">Ставка</span>
          <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider text-center">Результат</span>
          <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider text-right">Время</span>
        </div>

        {/* Entries */}
        <div className="flex flex-col gap-1.5 max-h-[300px] overflow-y-auto">
          {displayHistory.map((entry, index) => (
            <div
              key={entry.id}
              className={`grid grid-cols-4 gap-2 items-center px-2 py-1.5 rounded-lg transition-all ${
                index === 0 ? "animate-pulse bg-secondary/50" : "bg-secondary/20"
              }`}
            >
              {/* Username */}
              <div className="flex items-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full ${entry.won ? "bg-[#2ee06e]" : "bg-destructive"}`} />
                <span className="text-xs font-medium text-foreground truncate">{entry.username}</span>
              </div>
              
              {/* Bet amount */}
              <span className="text-xs text-muted-foreground text-center">{entry.bet} ₽</span>
              
              {/* Win/Loss result - shows amount won or lost */}
              <div className="flex items-center justify-center gap-1">
                {entry.won ? (
                  <>
                    <TrendingUp className="w-3 h-3 text-[#2ee06e]" />
                    <span className="text-xs font-bold text-[#2ee06e]">+{(entry.payout - entry.bet).toFixed(0)} ₽</span>
                  </>
                ) : (
                  <>
                    <TrendingDown className="w-3 h-3 text-destructive" />
                    <span className="text-xs font-bold text-destructive">-{entry.bet} ₽</span>
                  </>
                )}
              </div>
              
              {/* Time */}
              <div className="flex items-center justify-end gap-1 text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span className="text-[10px]">{formatTime(entry.timestamp)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
