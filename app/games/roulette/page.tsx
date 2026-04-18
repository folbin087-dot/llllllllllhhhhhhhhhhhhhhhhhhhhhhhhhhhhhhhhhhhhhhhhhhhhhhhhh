"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import GameLayout from "@/components/game-layout"
import { Clock, Users, TrendingUp } from "lucide-react"

// Balance loading helper
const loadBalanceFromAPI = async (): Promise<number> => {
  try {
    let telegramId: string | null = null
    if (typeof window !== "undefined") {
      const tg = (window as unknown as { Telegram?: { WebApp?: { initDataUnsafe?: { user?: { id: number } } } } }).Telegram?.WebApp
      if (tg?.initDataUnsafe?.user?.id) {
        telegramId = String(tg.initDataUnsafe.user.id)
      } else {
        telegramId = localStorage.getItem("telegram_user_id")
      }
    }
    if (telegramId) {
      const response = await fetch(`/api/auth/telegram?telegramId=${telegramId}`)
      const data = await response.json()
      if (data.success && data.user) {
        return data.user.balance || 0
      }
    }
  } catch (error) {
    console.error("Failed to load balance:", error)
  }
  return 0
}

type BetType = "red" | "black" | "green" | "odd" | "even" | "1-18" | "19-36" | "1-12" | "13-24" | "25-36" | number

const ROULETTE_NUMBERS = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5,
  24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
]

const RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]

function getNumberColor(num: number): "red" | "black" | "green" {
  if (num === 0) return "green"
  return RED_NUMBERS.includes(num) ? "red" : "black"
}

const colorMap = {
  red: "#ff4757",
  black: "#1a1a2e",
  green: "#2ee06e",
}

interface LiveBet {
  id: number
  username: string
  type: BetType
  amount: number
  timestamp: Date
}

const usernames = [
  "Player_1847", "Player_9281", "Player_4562", "Player_7731", "Player_3349",
  "Player_5588", "Player_2203", "Player_8874", "Player_1122", "Player_6690",
]

const ROUND_DURATION = 30

export default function RoulettePage() {
  const [balance, setBalance] = useState(0)
  const [betAmount, setBetAmount] = useState(10)

  // Load balance from API on mount
  useEffect(() => {
    loadBalanceFromAPI().then(setBalance)
  }, [])
  const [spinning, setSpinning] = useState(false)
  const [result, setResult] = useState<number | null>(null)
  const [rotation, setRotation] = useState(0)
  const [bets, setBets] = useState<{ type: BetType; amount: number }[]>([])
  const [lastWin, setLastWin] = useState<number | null>(null)
  const [lastBetAmount, setLastBetAmount] = useState(0)
  const [history, setHistory] = useState<{ number: number; color: string }[]>([])
  const [selectedBetType, setSelectedBetType] = useState<BetType>("red")
  
  const betsRef = useRef<{ type: BetType; amount: number }[]>([])
  
  useEffect(() => {
    betsRef.current = bets
  }, [bets])
  
  const [timeLeft, setTimeLeft] = useState(ROUND_DURATION)
  const [gamePhase, setGamePhase] = useState<"betting" | "spinning" | "result">("betting")
  const [liveBets, setLiveBets] = useState<LiveBet[]>([])
  const [totalPool, setTotalPool] = useState(0)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const isSpinningRef = useRef(false) // Prevents double spin bug

  // Generate fake live bets
  useEffect(() => {
    if (gamePhase !== "betting") return
    
    const addFakeBet = () => {
      const types: BetType[] = ["red", "black", "green", "odd", "even", "1-18", "19-36"]
      const amounts = [10, 25, 50, 100, 250]
      
      const newBet: LiveBet = {
        id: Date.now() + Math.floor(Math.random() * 1000),
        username: usernames[Math.floor(Math.random() * usernames.length)],
        type: types[Math.floor(Math.random() * types.length)],
        amount: amounts[Math.floor(Math.random() * amounts.length)],
        timestamp: new Date(),
      }
      
      setLiveBets((prev) => {
        if (prev.length >= 20) return prev
        return [newBet, ...prev]
      })
      setTotalPool((prev) => prev + newBet.amount)
    }
    
    const interval = setInterval(() => {
      if (Math.random() > 0.4) {
        addFakeBet()
      }
    }, 2000)
    
    return () => clearInterval(interval)
  }, [gamePhase])

  const placeBet = useCallback(() => {
    if (betAmount <= 0 || betAmount > balance || gamePhase !== "betting") return
    if (bets.length > 0) return
    
    setBets([{ type: selectedBetType, amount: betAmount }])
    
    const newBet: LiveBet = {
      id: Date.now(),
      username: "Вы",
      type: selectedBetType,
      amount: betAmount,
      timestamp: new Date(),
    }
    setLiveBets((prev) => [newBet, ...prev.slice(0, 14)])
    setTotalPool((prev) => prev + betAmount)
  }, [betAmount, balance, gamePhase, selectedBetType, bets.length])

  const totalBet = bets.reduce((sum, b) => sum + b.amount, 0)

  // Define startSpin BEFORE it's used in useEffect
  const startSpin = useCallback(() => {
    // Prevent double spin bug
    if (isSpinningRef.current) return
    isSpinningRef.current = true
    
    if (intervalRef.current) clearInterval(intervalRef.current)
    
    const currentBets = betsRef.current
    const currentTotalBet = currentBets.reduce((sum, b) => sum + b.amount, 0)
    
    setGamePhase("spinning")
    setSpinning(true)
    setResult(null)
    setLastWin(null)
    setLastBetAmount(currentTotalBet)
    
    if (currentTotalBet > 0) {
      setBalance((b) => parseFloat((b - currentTotalBet).toFixed(2)))
    }

    // Pick winning number with house edge bias
    // Zero has extra weight (2.7% base + 3% extra = ~5.7% house edge)
    // When players bet big, slightly bias toward unfavorable outcomes
    let winIndex: number
    let winNumber: number
    
    const currentBets = betsRef.current
    const hasBigBet = currentBets.some(b => b.amount >= 100)
    
    // 8% chance of zero (normal is ~2.7%) - primary house edge source
    if (Math.random() < 0.08) {
      winNumber = 0
      winIndex = 0
    } 
    // For big bets, 15% chance to land on opposite color
    else if (hasBigBet && currentBets.length > 0 && Math.random() < 0.15) {
      const mainBet = currentBets[0]
      if (mainBet.type === "red") {
        // Pick a black number
        const blackNumbers = ROULETTE_NUMBERS.filter(n => n !== 0 && !RED_NUMBERS.includes(n))
        winNumber = blackNumbers[Math.floor(Math.random() * blackNumbers.length)]
        winIndex = ROULETTE_NUMBERS.indexOf(winNumber)
      } else if (mainBet.type === "black") {
        // Pick a red number
        const redNumbers = ROULETTE_NUMBERS.filter(n => RED_NUMBERS.includes(n))
        winNumber = redNumbers[Math.floor(Math.random() * redNumbers.length)]
        winIndex = ROULETTE_NUMBERS.indexOf(winNumber)
      } else {
        // Fair random for other bet types
        winIndex = Math.floor(Math.random() * ROULETTE_NUMBERS.length)
        winNumber = ROULETTE_NUMBERS[winIndex]
      }
    }
    // Normal fair spin
    else {
      winIndex = Math.floor(Math.random() * ROULETTE_NUMBERS.length)
      winNumber = ROULETTE_NUMBERS[winIndex]
    }
    const segAngle = 360 / ROULETTE_NUMBERS.length
    const spins = 5 + Math.floor(Math.random() * 3)
    
    // SVG coordinate system: segments drawn with cos/sin starting at 0 degrees (right), going clockwise
    // Segment i occupies angles from i*segAngle to (i+1)*segAngle
    // Center of segment i is at: i * segAngle + segAngle/2
    // Pointer is at TOP = -90 degrees in standard coords
    // CSS rotate is clockwise positive
    // To bring segment center to top: rotate by -(segmentCenter + 90)
    // Which equals: -segmentCenter - 90 = -(winIndex * segAngle + segAngle/2) - 90
    const segmentCenterAngle = winIndex * segAngle + segAngle / 2
    const neededRotation = -segmentCenterAngle - 90
    // Normalize and add full spins
    const normalizedAngle = ((neededRotation % 360) + 360) % 360
    const targetAngle = 360 * spins + normalizedAngle

    setRotation(targetAngle)

    setTimeout(() => {
      setResult(winNumber)
      setGamePhase("result")
      const winColor = getNumberColor(winNumber)

      // Calculate winnings
      let totalWinnings = 0
      for (const bet of currentBets) {
        if (typeof bet.type === "number") {
          if (bet.type === winNumber) totalWinnings += bet.amount * 36
        } else if (bet.type === "red") {
          if (winColor === "red") totalWinnings += bet.amount * 2
        } else if (bet.type === "black") {
          if (winColor === "black") totalWinnings += bet.amount * 2
        } else if (bet.type === "green") {
          if (winNumber === 0) totalWinnings += bet.amount * 36
        } else if (bet.type === "odd") {
          if (winNumber !== 0 && winNumber % 2 !== 0) totalWinnings += bet.amount * 2
        } else if (bet.type === "even") {
          if (winNumber !== 0 && winNumber % 2 === 0) totalWinnings += bet.amount * 2
        } else if (bet.type === "1-18") {
          if (winNumber >= 1 && winNumber <= 18) totalWinnings += bet.amount * 2
        } else if (bet.type === "19-36") {
          if (winNumber >= 19 && winNumber <= 36) totalWinnings += bet.amount * 2
        } else if (bet.type === "1-12") {
          if (winNumber >= 1 && winNumber <= 12) totalWinnings += bet.amount * 3
        } else if (bet.type === "13-24") {
          if (winNumber >= 13 && winNumber <= 24) totalWinnings += bet.amount * 3
        } else if (bet.type === "25-36") {
          if (winNumber >= 25 && winNumber <= 36) totalWinnings += bet.amount * 3
        }
      }

      if (totalWinnings > 0) {
        setBalance((b) => parseFloat((b + totalWinnings).toFixed(2)))
      }
      setLastWin(totalWinnings)
      setHistory((h) => [{ number: winNumber, color: winColor }, ...h.slice(0, 29)])
      
      setTimeout(() => {
        setBets([])
        setSpinning(false)
        setTimeLeft(ROUND_DURATION)
        setGamePhase("betting")
        setTotalPool(0)
        setLiveBets([])
        isSpinningRef.current = false // Reset spin lock
      }, 5000)
    }, 4500)
  }, [])

  // Timer countdown - AFTER startSpin is defined
  useEffect(() => {
    if (gamePhase !== "betting") return
    
    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setTimeout(() => startSpin(), 0)
          return ROUND_DURATION
        }
        return prev - 1
      })
    }, 1000)
    
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [gamePhase, startSpin])

  const segAngle = 360 / ROULETTE_NUMBERS.length

  const betOptions: { type: BetType; label: string; color: string; payout: string }[] = [
    { type: "red", label: "Красное", color: "#ff4757", payout: "x2" },
    { type: "black", label: "Чёрное", color: "#1a1a2e", payout: "x2" },
    { type: "green", label: "Зеро (0)", color: "#2ee06e", payout: "x36" },
    { type: "odd", label: "Нечёт", color: "#7b8fa3", payout: "x2" },
    { type: "even", label: "Чёт", color: "#7b8fa3", payout: "x2" },
    { type: "1-18", label: "1-18", color: "#7b8fa3", payout: "x2" },
    { type: "19-36", label: "19-36", color: "#7b8fa3", payout: "x2" },
    { type: "1-12", label: "1-12", color: "#ffd93d", payout: "x3" },
    { type: "13-24", label: "13-24", color: "#ffd93d", payout: "x3" },
    { type: "25-36", label: "25-36", color: "#ffd93d", payout: "x3" },
  ]

  const getBetTypeLabel = (type: BetType): string => {
    const option = betOptions.find((o) => o.type === type)
    return option ? option.label : String(type)
  }

  return (
    <GameLayout title="Roulette" balance={balance}>
      <div className="flex flex-col gap-4">
        {/* Timer & Pool Info */}
        <div className="grid grid-cols-3 gap-3">
          <div className={`bg-card rounded-xl border p-3 text-center ${
            gamePhase === "betting" && timeLeft <= 10 ? "border-[#ff4757] animate-pulse" : "border-border/50"
          }`}>
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Таймер</span>
            </div>
            <p className={`text-xl font-black tabular-nums ${
              gamePhase !== "betting" ? "text-muted-foreground" : timeLeft <= 10 ? "text-[#ff4757]" : "text-foreground"
            }`}>
              {gamePhase === "betting" ? `00:${timeLeft.toString().padStart(2, "0")}` : gamePhase === "spinning" ? "..." : "WIN"}
            </p>
          </div>
          
          <div className="bg-card rounded-xl border border-border/50 p-3 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <TrendingUp className="w-4 h-4 text-[#2ee06e]" />
              <span className="text-xs text-muted-foreground">Общий банк</span>
            </div>
            <p className="text-xl font-black text-[#2ee06e]">{totalPool} ₽</p>
          </div>
          
          <div className="bg-card rounded-xl border border-border/50 p-3 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <Users className="w-4 h-4 text-[#00b4d8]" />
              <span className="text-xs text-muted-foreground">Игроков</span>
            </div>
            <p className="text-xl font-black text-[#00b4d8]">{new Set(liveBets.map((b) => b.username)).size + 1}</p>
          </div>
        </div>

        {/* Roulette Wheel */}
        <div className="bg-[#0d2818] rounded-2xl border-4 border-[#1a4528] p-4 sm:p-6 flex flex-col items-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-5" style={{ backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "24px 24px" }} />

          <div className="relative w-[260px] h-[260px] sm:w-[300px] sm:h-[300px]">
            {/* Pointer */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 z-20">
              <div className="w-0 h-0 border-l-[12px] border-r-[12px] border-t-[24px] border-l-transparent border-r-transparent border-t-[#ffd93d] drop-shadow-lg" />
            </div>

            <svg viewBox="0 0 320 320" className="w-full h-full drop-shadow-2xl">
              <circle cx="160" cy="160" r="155" fill="none" stroke="#c4961a" strokeWidth="6" />
              <circle cx="160" cy="160" r="152" fill="none" stroke="#ffd93d" strokeWidth="1" opacity="0.3" />

              <g
                style={{
                  transform: `rotate(${rotation}deg)`,
                  transformOrigin: "160px 160px",
                  transition: spinning ? "transform 4.5s cubic-bezier(0.15, 0.65, 0.08, 0.98)" : "none",
                }}
              >
                {ROULETTE_NUMBERS.map((num, i) => {
                  const startAngle = (i * segAngle * Math.PI) / 180
                  const endAngle = ((i + 1) * segAngle * Math.PI) / 180
                  const r = 148
                  const x1 = Math.round(160 + r * Math.cos(startAngle))
                  const y1 = Math.round(160 + r * Math.sin(startAngle))
                  const x2 = Math.round(160 + r * Math.cos(endAngle))
                  const y2 = Math.round(160 + r * Math.sin(endAngle))

                  const midAngle = ((i + 0.5) * segAngle * Math.PI) / 180
                  const textR = r * 0.78
                  const tx = Math.round(160 + textR * Math.cos(midAngle))
                  const ty = Math.round(160 + textR * Math.sin(midAngle))
                  const textRot = Math.round((i + 0.5) * segAngle + 90)

                  return (
                    <g key={i}>
                      <path
                        d={`M 160 160 L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} Z`}
                        fill={colorMap[getNumberColor(num)]}
                        stroke="#0d2818"
                        strokeWidth="0.5"
                      />
                      <text
                        x={tx}
                        y={ty}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill="white"
                        fontSize="8"
                        fontWeight="700"
                        transform={`rotate(${textRot}, ${tx}, ${ty})`}
                      >
                        {num}
                      </text>
                    </g>
                  )
                })}
                <circle cx="160" cy="160" r="45" fill="#0d2818" stroke="#1a4528" strokeWidth="3" />
                <circle cx="160" cy="160" r="30" fill="#1a4528" />
                <text x="160" y="160" textAnchor="middle" dominantBaseline="middle" fill="#2ee06e" fontSize="11" fontWeight="800">
                  PLAID
                </text>
              </g>
            </svg>
          </div>

          {/* Result */}
          {result !== null && gamePhase === "result" && (
            <div className="mt-4 flex flex-col items-center gap-2">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-black text-white border-4"
                style={{
                  backgroundColor: colorMap[getNumberColor(result)],
                  borderColor: getNumberColor(result) === "green" ? "#2ee06e" : getNumberColor(result) === "red" ? "#ff4757" : "#555",
                }}
              >
                {result}
              </div>
              {lastBetAmount > 0 && (
                <div className="flex flex-col items-center">
                  {lastWin !== null && lastWin > 0 && (
                    <span className="text-3xl font-black text-[#2ee06e] animate-pulse">
                      x{Math.round(lastWin / lastBetAmount)}
                    </span>
                  )}
                  <span className={`text-lg font-bold ${lastWin !== null && lastWin > 0 ? "text-[#2ee06e]" : "text-[#ff4757]"}`}>
                    {lastWin !== null && lastWin > 0 ? `+${(lastWin - lastBetAmount).toFixed(2)} ₽` : `-${lastBetAmount.toFixed(2)} ₽`}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Live Bets Feed */}
        <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
          <div className="bg-secondary/50 px-4 py-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground">Ставки в реальном времени</span>
            <span className="text-xs text-muted-foreground">{liveBets.length} ставок</span>
          </div>
          <div className="max-h-32 overflow-y-auto">
            {liveBets.length > 0 ? (
              <div className="flex flex-col">
                {liveBets.map((bet, i) => (
                  <div
                    key={bet.id}
                    className={`flex items-center justify-between px-4 py-2 text-xs ${
                      i === 0 ? "bg-[#2ee06e]/10 animate-pulse" : i % 2 === 0 ? "bg-secondary/20" : ""
                    } ${bet.username === "Вы" ? "bg-[#00b4d8]/10" : ""}`}
                  >
                    <span className={`font-medium ${bet.username === "Вы" ? "text-[#00b4d8]" : "text-foreground"}`}>
                      {bet.username}
                    </span>
                    <span className="text-muted-foreground">{getBetTypeLabel(bet.type)}</span>
                    <span className="font-bold text-[#2ee06e]">{bet.amount} ₽</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-4 py-6 text-center text-xs text-muted-foreground">
                Ставок пока нет...
              </div>
            )}
          </div>
        </div>

        {/* History Strip */}
        {history.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto pb-1 px-1">
            {history.slice(0, 20).map((h, i) => (
              <div
                key={i}
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                style={{ backgroundColor: colorMap[h.color as keyof typeof colorMap] }}
              >
                {h.number}
              </div>
            ))}
          </div>
        )}

        {/* Bet Selection */}
        <div className="bg-card rounded-xl border border-border/50 p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-foreground">Ваши ставки</p>
            {bets.length > 0 && (
              <span className="text-xs text-muted-foreground">Ставка сделана</span>
            )}
          </div>

          <div className="grid grid-cols-5 gap-2 mb-3">
            {betOptions.map((opt) => (
              <button
                key={String(opt.type)}
                onClick={() => setSelectedBetType(opt.type)}
                disabled={gamePhase !== "betting"}
                className={`flex flex-col items-center gap-0.5 p-2 rounded-lg border-2 transition-all text-center ${
                  selectedBetType === opt.type
                    ? "border-[#2ee06e] bg-[#2ee06e]/10"
                    : "border-border hover:border-border/80 bg-secondary"
                } ${gamePhase !== "betting" ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                {(opt.type === "red" || opt.type === "black" || opt.type === "green") && (
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: opt.color }} />
                )}
                <span className="text-[10px] font-medium text-foreground leading-tight">{opt.label}</span>
                <span className="text-[9px] text-muted-foreground">{opt.payout}</span>
              </button>
            ))}
          </div>

          {/* Active Bets */}
          {bets.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3 p-2 bg-secondary/50 rounded-lg">
              {bets.map((bet, i) => (
                <div key={i} className="flex items-center gap-2 bg-card px-3 py-1.5 rounded-lg text-sm">
                  <span className="text-foreground font-medium">{getBetTypeLabel(bet.type)}</span>
                  <span className="text-[#2ee06e] font-bold">{bet.amount} ₽</span>
                </div>
              ))}
            </div>
          )}

          {/* Bet Amount */}
          <div className="flex gap-2">
            <div className="flex-1 flex items-center bg-secondary rounded-lg overflow-hidden">
              <input
                type="number"
                value={betAmount}
                onChange={(e) => setBetAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                className="flex-1 bg-transparent text-sm font-medium text-foreground px-3 py-2.5 outline-none min-w-0"
                disabled={gamePhase !== "betting"}
              />
              <button
                onClick={() => setBetAmount((b) => parseFloat((b / 2).toFixed(2)))}
                className="px-2.5 py-2.5 text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-[#2a3f4e] transition-colors"
                disabled={gamePhase !== "betting"}
              >
                /2
              </button>
              <button
                onClick={() => setBetAmount((b) => Math.min(parseFloat((b * 2).toFixed(2)), balance))}
                className="px-2.5 py-2.5 text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-[#2a3f4e] transition-colors"
                disabled={gamePhase !== "betting"}
              >
                x2
              </button>
            </div>
            <button
              onClick={placeBet}
              disabled={gamePhase !== "betting" || betAmount <= 0 || betAmount > balance || bets.length > 0}
              className="px-6 bg-[#2ee06e] hover:bg-[#25c45c] disabled:bg-secondary disabled:text-muted-foreground text-[#0f1923] font-bold rounded-lg transition-all"
            >
              {bets.length > 0 ? "Ставка сделана" : "Ставка"}
            </button>
          </div>

          {totalBet > 0 && (
            <p className="text-center text-sm text-muted-foreground mt-2">
              Общая ставка: <span className="text-[#2ee06e] font-bold">{totalBet} ₽</span>
            </p>
          )}
        </div>
      </div>
    </GameLayout>
  )
}
