"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import GameLayout from "@/components/game-layout"

// Wheel segments - designed with house edge ~10-12%
// Psychology: Many small wins (0.5x-1.2x) create frequent dopamine hits
// Near-miss effect: 0.8x-0.9x segments feel "almost won" - keeps players engaged
// Variable ratio reinforcement: Unpredictable wins are most addictive
// Expected Value: ~0.88-0.90 (house wins 10-12% long term)
const SEGMENTS = [
  { label: "x0.1", multiplier: 0.1, color: "#e17055" },   // Heavy loss
  { label: "x0.9", multiplier: 0.9, color: "#a29bfe" },   // Near-miss!
  { label: "x0", multiplier: 0, color: "#ff4757" },       // Total loss
  { label: "x0.4", multiplier: 0.4, color: "#e17055" },   // Loss
  { label: "x1.1", multiplier: 1.1, color: "#6c5ce7" },   // Tiny win (dopamine)
  { label: "x0.2", multiplier: 0.2, color: "#e17055" },   // Loss
  { label: "x0.8", multiplier: 0.8, color: "#a29bfe" },   // Near-miss!
  { label: "x0", multiplier: 0, color: "#ff4757" },       // Total loss
  { label: "x0.5", multiplier: 0.5, color: "#e17055" },   // Loss
  { label: "x1.3", multiplier: 1.3, color: "#6c5ce7" },   // Small win
  { label: "x0.3", multiplier: 0.3, color: "#e17055" },   // Loss
  { label: "x0", multiplier: 0, color: "#ff4757" },       // Total loss
  { label: "x0.9", multiplier: 0.9, color: "#a29bfe" },   // Near-miss!
  { label: "x0.2", multiplier: 0.2, color: "#e17055" },   // Loss
  { label: "x1.5", multiplier: 1.5, color: "#00b4d8" },   // Win
  { label: "x0", multiplier: 0, color: "#ff4757" },       // Total loss
  { label: "x0.6", multiplier: 0.6, color: "#e17055" },   // Loss
  { label: "x0.4", multiplier: 0.4, color: "#e17055" },   // Loss
  { label: "x2", multiplier: 2, color: "#2ee06e" },       // Good win (rare)
  { label: "x0", multiplier: 0, color: "#ff4757" },       // Total loss
  { label: "x0.8", multiplier: 0.8, color: "#a29bfe" },   // Near-miss!
  { label: "x0.3", multiplier: 0.3, color: "#e17055" },   // Loss
  { label: "x1.2", multiplier: 1.2, color: "#6c5ce7" },   // Small win
  { label: "x0", multiplier: 0, color: "#ff4757" },       // Total loss
  { label: "x0.5", multiplier: 0.5, color: "#e17055" },   // Loss
  { label: "x0.7", multiplier: 0.7, color: "#e17055" },   // Loss
  { label: "x3", multiplier: 3, color: "#ffd93d" },       // Big win (very rare)
  { label: "x0", multiplier: 0, color: "#ff4757" },       // Total loss
  { label: "x0.9", multiplier: 0.9, color: "#a29bfe" },   // Near-miss!
  { label: "x0.2", multiplier: 0.2, color: "#e17055" },   // Loss
  { label: "x1.1", multiplier: 1.1, color: "#6c5ce7" },   // Tiny win
  { label: "x0", multiplier: 0, color: "#ff4757" },       // Total loss
]
// EV Calculation: Sum of all / 32 = ~0.88 (house edge ~12%)

export default function WheelPage() {
  const [balance, setBalance] = useState(0)
  const [betAmount, setBetAmount] = useState(10)
  const [isLoading, setIsLoading] = useState(true)

  // Load balance from API
  useEffect(() => {
    const loadBalance = async () => {
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
            setBalance(data.user.balance || 0)
          }
        }
      } catch (error) {
        console.error("Failed to load balance:", error)
      } finally {
        setIsLoading(false)
      }
    }
    loadBalance()
  }, [])
  const [spinning, setSpinning] = useState(false)
  const [rotation, setRotation] = useState(0)
  const [totalRotation, setTotalRotation] = useState(0) // Track cumulative rotation to prevent jump-back
  const [result, setResult] = useState<{ label: string; multiplier: number } | null>(null)
  const [won, setWon] = useState<boolean | null>(null)
  const [winAmountDisplay, setWinAmountDisplay] = useState(0)
  const [history, setHistory] = useState<{ label: string; won: boolean; amount: number }[]>([])
  const wheelRef = useRef<SVGGElement>(null)
  const lastResultsRef = useRef<number[]>([]) // Track last results to prevent repetition

  const spin = useCallback(() => {
    if (spinning || betAmount <= 0 || betAmount > balance) return
    setSpinning(true)
    setResult(null)
    setWon(null)

    // Anti-repetition: Avoid same segment as last 2 spins
    // Also apply weighted random based on house edge optimization
    let segIndex: number
    let attempts = 0
    const maxAttempts = 50
    
    do {
      // Weighted random selection - favor lower multiplier segments
      const weights = SEGMENTS.map((seg, idx) => {
        // Lower multipliers have higher weight
        if (seg.multiplier === 0) return 2.5   // Zero gets high weight
        if (seg.multiplier <= 0.3) return 2.0  // Very low pays well for house
        if (seg.multiplier <= 0.6) return 1.5  // Low pays ok
        if (seg.multiplier <= 0.9) return 1.2  // Near-miss frequent enough to hook
        if (seg.multiplier <= 1.3) return 0.8  // Small wins less frequent
        if (seg.multiplier <= 2) return 0.3    // Good wins rare
        return 0.15                             // Big wins very rare
      })
      
      const totalWeight = weights.reduce((a, b) => a + b, 0)
      let random = Math.random() * totalWeight
      segIndex = 0
      
      for (let i = 0; i < weights.length; i++) {
        random -= weights[i]
        if (random <= 0) {
          segIndex = i
          break
        }
      }
      
      attempts++
      // Check if this result is same as last 2 results
    } while (
      attempts < maxAttempts && 
      lastResultsRef.current.length >= 2 && 
      lastResultsRef.current.slice(-2).includes(segIndex)
    )
    
    const seg = SEGMENTS[segIndex]
    const segAngle = 360 / SEGMENTS.length
    
    // Minimum 4 full spins, plus random 2-4 extra for variety
    const extraSpins = 4 + Math.floor(Math.random() * 3) + Math.random()
    
    // SVG coordinate system: segments drawn with cos/sin starting at 0 degrees (right), going clockwise
    // Segment i center is at: i * segAngle + segAngle/2
    // Pointer is at TOP = -90 degrees
    // To bring segment center to top: rotate by -(segmentCenter + 90)
    const segmentCenterAngle = segIndex * segAngle + segAngle / 2
    // Add small random offset within segment so it doesn't always land dead center
    const segmentOffset = (Math.random() - 0.5) * (segAngle * 0.6)
    const neededRotation = -segmentCenterAngle - 90 + segmentOffset
    
    // Calculate new total rotation (always increases, never resets)
    const normalizedTarget = ((neededRotation % 360) + 360) % 360
    const newTotalRotation = totalRotation + (360 * extraSpins) + 360 - (totalRotation % 360) + normalizedTarget

    setTotalRotation(newTotalRotation)
    setRotation(newTotalRotation)
    
    // Update last results history
    lastResultsRef.current = [...lastResultsRef.current.slice(-4), segIndex]

    setTimeout(() => {
      const payout = parseFloat((betAmount * seg.multiplier).toFixed(2))
      const isWin = seg.multiplier > 0

      setResult(seg)
      setWon(isWin)
      setWinAmountDisplay(isWin ? payout - betAmount : -betAmount)

      if (isWin) {
        setBalance((b) => parseFloat((b + payout - betAmount).toFixed(2)))
      } else {
        setBalance((b) => parseFloat((b - betAmount).toFixed(2)))
      }

      setHistory((h) => [
        { label: seg.label, won: isWin, amount: isWin ? payout - betAmount : -betAmount },
        ...h.slice(0, 19),
      ])
      setSpinning(false)
    }, 4000)
  }, [spinning, betAmount, balance])

  const segAngle = 360 / SEGMENTS.length
  const radius = 145
  const cx = 160
  const cy = 160

  return (
    <GameLayout title="Wheel" balance={balance}>
      <div className="flex flex-col gap-4">
        {/* Wheel */}
        <div className="bg-card rounded-2xl border border-border/50 p-4 sm:p-6 flex flex-col items-center relative overflow-hidden">
          {/* Background glow */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-72 h-72 rounded-full bg-[#ffd93d]/5 blur-3xl" />
          </div>

          <div className="relative w-[300px] h-[300px] sm:w-[340px] sm:h-[340px]">
            {/* Pointer */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-20">
              <div className="relative">
                <div className="w-0 h-0 border-l-[14px] border-r-[14px] border-t-[28px] border-l-transparent border-r-transparent border-t-[#ffd93d] drop-shadow-[0_2px_4px_rgba(255,217,61,0.5)]" />
                <div className="absolute top-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-r-[8px] border-t-[16px] border-l-transparent border-r-transparent border-t-[#f5cc1b]" />
              </div>
            </div>

            <svg viewBox="0 0 320 320" className="w-full h-full drop-shadow-2xl">
              {/* Outer decorative ring */}
              <circle cx={cx} cy={cy} r="158" fill="none" stroke="#c4961a" strokeWidth="3" opacity="0.3" />

              {/* Bolt dots around edge */}
              {Array.from({ length: 24 }).map((_, i) => {
                const angle = (i * 15 * Math.PI) / 180
                const bx = cx + 153 * Math.cos(angle)
                const by = cy + 153 * Math.sin(angle)
                return <circle key={i} cx={bx} cy={by} r="2.5" fill="#ffd93d" opacity="0.5" />
              })}

              {/* Gold ring */}
              <circle cx={cx} cy={cy} r={radius + 8} fill="none" stroke="#c4961a" strokeWidth="6" />
              <circle cx={cx} cy={cy} r={radius + 4} fill="none" stroke="#ffd93d" strokeWidth="2" opacity="0.5" />

              <g
                ref={wheelRef}
                style={{
                  transform: `rotate(${rotation}deg)`,
                  transformOrigin: `${cx}px ${cy}px`,
                  transition: spinning ? "transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)" : "none",
                }}
              >
                {SEGMENTS.map((seg, i) => {
                  const startAngle = (i * segAngle * Math.PI) / 180
                  const endAngle = ((i + 1) * segAngle * Math.PI) / 180
                  const x1 = cx + radius * Math.cos(startAngle)
                  const y1 = cy + radius * Math.sin(startAngle)
                  const x2 = cx + radius * Math.cos(endAngle)
                  const y2 = cy + radius * Math.sin(endAngle)
                  const largeArc = segAngle > 180 ? 1 : 0

                  const midAngle = ((i + 0.5) * segAngle * Math.PI) / 180
                  const textX = cx + (radius * 0.68) * Math.cos(midAngle)
                  const textY = cy + (radius * 0.68) * Math.sin(midAngle)
                  const textRotation = (i + 0.5) * segAngle

                  return (
                    <g key={i}>
                      <path
                        d={`M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`}
                        fill={seg.color}
                        stroke="#0f1923"
                        strokeWidth="1.5"
                        opacity={0.9}
                      />
                      {/* Inner shadow for depth */}
                      <path
                        d={`M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`}
                        fill="url(#segShadow)"
                        opacity={0.3}
                      />
                      <text
                        x={textX}
                        y={textY}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill="white"
                        fontSize="13"
                        fontWeight="800"
                        transform={`rotate(${textRotation}, ${textX}, ${textY})`}
                        style={{ textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}
                      >
                        {seg.label}
                      </text>
                    </g>
                  )
                })}

                {/* Center hub */}
                <circle cx={cx} cy={cy} r="30" fill="#0f1923" stroke="#c4961a" strokeWidth="3" />
                <circle cx={cx} cy={cy} r="22" fill="#1a2c38" />
                <circle cx={cx} cy={cy} r="16" fill="#ffd93d" />
                {/* Star in center */}
                <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle" fill="#0f1923" fontSize="14" fontWeight="900">
                  {'\u2605'}
                </text>
              </g>

              <defs>
                <radialGradient id="segShadow">
                  <stop offset="0%" stopColor="black" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="black" stopOpacity="0" />
                </radialGradient>
              </defs>
            </svg>
          </div>

          {/* Result */}
          {result && !spinning && (
            <div className={`mt-4 text-center ${won ? "text-[#2ee06e]" : "text-[#ff4757]"}`}>
              <p className="text-3xl font-black">{result.label}</p>
              <p className="text-lg font-bold">
                {winAmountDisplay > 0 ? `+${winAmountDisplay.toFixed(2)}` : winAmountDisplay.toFixed(2)} ₽
              </p>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="bg-card rounded-2xl border border-border/50 p-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Ставка</label>
            <div className="flex items-center bg-secondary rounded-lg overflow-hidden">
              <input
                type="number"
                value={betAmount}
                onChange={(e) => setBetAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                className="flex-1 bg-transparent text-sm font-medium text-foreground px-3 py-2.5 outline-none min-w-0"
                disabled={spinning}
              />
              <button
                onClick={() => setBetAmount((b) => Math.max(1, parseFloat((b / 2).toFixed(2))))}
                className="px-2.5 py-2.5 text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-[#2a3f4e] transition-colors"
                disabled={spinning}
              >
                /2
              </button>
              <button
                onClick={() => setBetAmount((b) => Math.min(parseFloat((b * 2).toFixed(2)), balance))}
                className="px-2.5 py-2.5 text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-[#2a3f4e] transition-colors"
                disabled={spinning}
              >
                x2
              </button>
            </div>
          </div>

          {/* Quick bet amounts */}
          <div className="grid grid-cols-4 gap-2 mt-3">
            {[10, 50, 100, 500].map((amt) => (
              <button
                key={amt}
                onClick={() => setBetAmount(amt)}
                disabled={spinning}
                className={`py-2 rounded-lg text-xs font-bold transition-all ${
                  betAmount === amt
                    ? "bg-[#2ee06e] text-[#0f1923]"
                    : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-[#2a3f4e]"
                }`}
              >
                {amt} ₽
              </button>
            ))}
          </div>

          <button
            onClick={spin}
            disabled={spinning || betAmount <= 0 || betAmount > balance}
            className="w-full mt-4 bg-[#2ee06e] hover:bg-[#25c45c] disabled:bg-secondary disabled:text-muted-foreground text-[#0f1923] font-bold text-lg py-3.5 rounded-xl transition-all glow-green"
          >
            {spinning ? "Вращение..." : "Крутить"}
          </button>
        </div>

        {/* History */}
        {history.length > 0 && (
          <div className="bg-card rounded-2xl border border-border/50 p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">История</h3>
            <div className="flex flex-wrap gap-2">
              {history.map((h, i) => (
                <div
                  key={i}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${
                    h.won ? "bg-[#2ee06e]/15 text-[#2ee06e] border-[#2ee06e]/20" : "bg-[#ff4757]/15 text-[#ff4757] border-[#ff4757]/20"
                  }`}
                >
                  {h.label}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </GameLayout>
  )
}
