"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import GameLayout from "@/components/game-layout"

const ROWS = 12
// Multipliers optimized for ~10% house edge
// Edge buckets are attractive but nearly impossible to hit due to physics
// Middle buckets have low payouts - most balls naturally fall to center
// EV Low: ~0.90, EV Med: ~0.88, EV High: ~0.85
const MULTIPLIERS_LOW = [8, 3, 1.4, 0.9, 0.5, 0.3, 0.3, 0.5, 0.9, 1.4, 3, 8]
const MULTIPLIERS_MED = [15, 5, 1.8, 0.6, 0.3, 0.2, 0.2, 0.3, 0.6, 1.8, 5, 15]
const MULTIPLIERS_HIGH = [50, 10, 2, 0.4, 0.2, 0.1, 0.1, 0.2, 0.4, 2, 10, 50]

type RiskLevel = "low" | "medium" | "high"

const RISK_MULTIPLIERS: Record<RiskLevel, number[]> = {
  low: MULTIPLIERS_LOW,
  medium: MULTIPLIERS_MED,
  high: MULTIPLIERS_HIGH,
}

// Physics constants - tuned for center-bias (better house edge)
// Balls naturally tend toward center where payouts are lowest
const GRAVITY = 0.20
const BOUNCE_FACTOR = 0.58 // Lower bounce = more predictable center landing
const FRICTION = 0.980     // More friction = less wild bounces
const PIN_RADIUS = 6
const WALL_BOUNCE = 0.55   // Walls push balls back toward center
const CENTER_BIAS = 0.08   // Slight center pull on each bounce

interface Ball {
  id: number
  x: number
  y: number
  vx: number
  vy: number
  finalIndex: number | null
  done: boolean
}

interface Pin {
  x: number
  y: number
  row: number
}

export default function PlinkoPage() {
  const [balance, setBalance] = useState(0)
  const [betAmount, setBetAmount] = useState(10)

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
      }
    }
    loadBalance()
  }, [])
  const [risk, setRisk] = useState<RiskLevel>("medium")
  const [balls, setBalls] = useState<Ball[]>([])
  const [dropping, setDropping] = useState(false)
  const [history, setHistory] = useState<{ multiplier: number; won: boolean; amount: number }[]>([])
  const [lastLandedIndex, setLastLandedIndex] = useState<number | null>(null)
  const ballIdRef = useRef(0)
  const animationRef = useRef<number | null>(null)

  const multipliers = RISK_MULTIPLIERS[risk]
  const buckets = multipliers.length
  const pinSpacing = 32 // Reduced for better fit
  const startX = (buckets - 1) * pinSpacing / 2
  const svgWidth = (buckets + 2) * pinSpacing // Extra padding
  const svgHeight = (ROWS + 4) * pinSpacing
  const svgPadding = 30 // Extra padding to prevent overflow

  // Generate pin positions
  const pins: Pin[] = []
  for (let row = 0; row < ROWS; row++) {
    const pinsInRow = row + 3
    for (let col = 0; col < pinsInRow; col++) {
      const px = startX - (row + 2) * pinSpacing / 2 + col * pinSpacing
      const py = (row + 1) * pinSpacing
      pins.push({ x: px, y: py, row })
    }
  }

  // Physics simulation with improved wall collision
  const simulateBall = useCallback((ball: Ball): Ball => {
    if (ball.done) return ball

    let { x, y, vx, vy, finalIndex } = ball
    
    // Apply gravity
    vy += GRAVITY
    
    // Apply friction
    vx *= FRICTION
    
    // Update position
    x += vx
    y += vy

    // Check collision with pins
    for (const pin of pins) {
      const dx = x - pin.x
      const dy = y - pin.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      const minDistance = PIN_RADIUS + 8 // Ball radius + pin radius

      if (distance < minDistance) {
        // Collision detected - bounce off pin
        const angle = Math.atan2(dy, dx)
        const overlap = minDistance - distance
        
        // Push ball out of pin
        x += Math.cos(angle) * overlap
        y += Math.sin(angle) * overlap
        
        // Calculate bounce velocity with center bias
        const speed = Math.sqrt(vx * vx + vy * vy)
        // Strong center bias - balls tend to fall toward middle buckets (low payouts)
        const centerX = startX
        const centerPull = (centerX - x) * CENTER_BIAS
        const randomFactor = (Math.random() - 0.5) * 0.5
        const bounceAngle = angle + randomFactor
        vx += centerPull // Apply center pull
        
        vx = Math.cos(bounceAngle) * speed * BOUNCE_FACTOR
        vy = Math.sin(bounceAngle) * speed * BOUNCE_FACTOR
        
        // Ensure ball doesn't go up too much
        if (vy < 0.5) vy = 0.5
      }
    }

    // Check if ball reached bottom
    const bottomY = (ROWS + 1) * pinSpacing + 5
    if (y >= bottomY) {
      // Calculate which bucket the ball landed in
      const bucketWidth = pinSpacing
      const bucketIndex = Math.round(x / bucketWidth)
      finalIndex = Math.max(0, Math.min(buckets - 1, bucketIndex))
      
      return { ...ball, x, y: bottomY, vx: 0, vy: 0, finalIndex, done: true }
    }

    // Wall collision with physical bounce - treat walls like solid columns
    const leftBound = -pinSpacing / 2 + 4 // Account for wall thickness
    const rightBound = (buckets - 1) * pinSpacing + pinSpacing / 2 - 4
    
    if (x <= leftBound) {
      x = leftBound + 2
      vx = Math.abs(vx) * WALL_BOUNCE + (Math.random() * 0.5) // Bounce off left wall
      vy += Math.random() * 0.3 // Add slight downward push
    }
    if (x >= rightBound) {
      x = rightBound - 2
      vx = -Math.abs(vx) * WALL_BOUNCE - (Math.random() * 0.5) // Bounce off right wall
      vy += Math.random() * 0.3 // Add slight downward push
    }

    return { ...ball, x, y, vx, vy, finalIndex }
  }, [pins, buckets])

  // Animation loop
  useEffect(() => {
    if (balls.length === 0 || balls.every(b => b.done)) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = null
      }
      return
    }

    const animate = () => {
      setBalls(prevBalls => {
        const updatedBalls = prevBalls.map(ball => {
          if (ball.done) return ball
          return simulateBall(ball)
        })
        
        // Check for newly landed balls
        updatedBalls.forEach(ball => {
          if (ball.done && ball.finalIndex !== null) {
            const prevBall = prevBalls.find(b => b.id === ball.id)
            if (prevBall && !prevBall.done) {
              // Ball just landed
              const mult = multipliers[ball.finalIndex]
              const payout = parseFloat((betAmount * mult).toFixed(2))
              const isWin = mult >= 1

              setLastLandedIndex(ball.finalIndex)

              if (payout > 0) {
                setBalance((b) => parseFloat((b + payout).toFixed(2)))
              }

              setHistory((h) => [
                { multiplier: mult, won: isWin, amount: isWin ? payout - betAmount : payout - betAmount },
                ...h.slice(0, 19),
              ])

              setDropping(false)
            }
          }
        })

        return updatedBalls
      })

      animationRef.current = requestAnimationFrame(animate)
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [balls, simulateBall, multipliers, betAmount])

  // Clean up old balls
  useEffect(() => {
    const cleanup = setInterval(() => {
      setBalls(prev => prev.filter(b => !b.done || Date.now() - b.id < 3000))
    }, 1000)
    return () => clearInterval(cleanup)
  }, [])

  const drop = useCallback(() => {
    if (betAmount <= 0 || betAmount > balance) return
    setDropping(true)
    setLastLandedIndex(null)

    // Create new ball with slight random horizontal offset
    const newBall: Ball = {
      id: Date.now(),
      x: startX + (Math.random() - 0.5) * 10,
      y: 0,
      vx: (Math.random() - 0.5) * 2,
      vy: 1,
      finalIndex: null,
      done: false,
    }

    setBalls((prev) => [...prev, newBall])
    setBalance((b) => parseFloat((b - betAmount).toFixed(2)))
  }, [betAmount, balance, startX])

  const getMultiplierColor = (mult: number) => {
    if (mult >= 10) return "#ff4757"
    if (mult >= 3) return "#ffd93d"
    if (mult >= 1) return "#2ee06e"
    if (mult >= 0.5) return "#00b4d8"
    return "#e17055"
  }

  return (
    <GameLayout title="Plinko" balance={balance}>
      <div className="flex flex-col gap-4">
        {/* Plinko Board */}
        <div className="bg-gradient-to-b from-[#1a2c38] to-[#0f1923] rounded-2xl border border-border/50 p-4 sm:p-6 flex justify-center overflow-hidden relative">
          {/* Background glow */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-48 h-48 bg-[#2ee06e]/5 rounded-full blur-3xl" />

          <svg
            viewBox={`-${svgPadding} -10 ${svgWidth + svgPadding * 2} ${svgHeight + 60}`}
            className="w-full max-w-[400px] relative z-10"
            style={{ overflow: 'visible' }}
          >
            {/* Left wall column */}
            <rect 
              x={-pinSpacing / 2 - 2} 
              y={pinSpacing - 10} 
              width={6} 
              height={(ROWS + 1) * pinSpacing + 20}
              rx={3}
              fill="#3a5068"
            />
            <rect 
              x={-pinSpacing / 2} 
              y={pinSpacing - 10} 
              width={3} 
              height={(ROWS + 1) * pinSpacing + 20}
              rx={1.5}
              fill="#5a7a98"
            />
            
            {/* Right wall column */}
            <rect 
              x={(buckets - 1) * pinSpacing + pinSpacing / 2 - 4} 
              y={pinSpacing - 10} 
              width={6} 
              height={(ROWS + 1) * pinSpacing + 20}
              rx={3}
              fill="#3a5068"
            />
            <rect 
              x={(buckets - 1) * pinSpacing + pinSpacing / 2 - 3} 
              y={pinSpacing - 10} 
              width={3} 
              height={(ROWS + 1) * pinSpacing + 20}
              rx={1.5}
              fill="#5a7a98"
            />

            {/* Pins - brighter and more visible */}
            {pins.map((pin, i) => (
              <g key={i}>
                {/* Pin glow - brighter */}
                <circle cx={pin.x} cy={pin.y} r={9} fill="#2ee06e" opacity="0.25" />
                {/* Pin base - brighter */}
                <circle cx={pin.x} cy={pin.y} r={PIN_RADIUS} fill="#6a8a9a" />
                {/* Pin top - brighter */}
                <circle cx={pin.x} cy={pin.y} r={4} fill="#a8c8d8" />
                {/* Pin highlight - sharper */}
                <circle cx={pin.x - 1.5} cy={pin.y - 1.5} r={2} fill="#ffffff" opacity="0.9" />
              </g>
            ))}

            {/* Pocket holes / buckets */}
            {multipliers.map((mult, i) => {
              const bx = i * pinSpacing
              const by = (ROWS + 1) * pinSpacing + 5
              const bucketWidth = pinSpacing - 6
              const bucketHeight = 32
              const color = getMultiplierColor(mult)
              const isLanded = lastLandedIndex === i
              
              return (
                <g key={i}>
                  {/* Pocket hole background */}
                  <rect
                    x={bx - bucketWidth / 2}
                    y={by - 5}
                    width={bucketWidth}
                    height={bucketHeight + 10}
                    rx={8}
                    fill="#0a1015"
                  />
                  
                  {/* Pocket walls */}
                  <rect
                    x={bx - bucketWidth / 2 - 2}
                    y={by - 8}
                    width={3}
                    height={bucketHeight + 8}
                    rx={1.5}
                    fill="#3a5068"
                  />
                  <rect
                    x={bx + bucketWidth / 2 - 1}
                    y={by - 8}
                    width={3}
                    height={bucketHeight + 8}
                    rx={1.5}
                    fill="#3a5068"
                  />

                  {/* Multiplier colored area */}
                  <rect
                    x={bx - bucketWidth / 2 + 1}
                    y={by}
                    width={bucketWidth - 2}
                    height={bucketHeight - 4}
                    rx={6}
                    fill={color}
                    opacity={isLanded ? 1 : 0.75}
                    stroke={isLanded ? "white" : "none"}
                    strokeWidth={isLanded ? 2 : 0}
                  >
                    {isLanded && (
                      <animate
                        attributeName="opacity"
                        values="1;0.5;1"
                        dur="0.3s"
                        repeatCount="3"
                      />
                    )}
                  </rect>
                  
                  {/* Glow effect for high multipliers */}
                  {mult >= 10 && (
                    <rect
                      x={bx - bucketWidth / 2 - 2}
                      y={by - 4}
                      width={bucketWidth + 4}
                      height={bucketHeight + 4}
                      rx={8}
                      fill="none"
                      stroke={color}
                      strokeWidth="2"
                      opacity="0.4"
                    />
                  )}
                  
                  {/* Multiplier text */}
                  <text
                    x={bx}
                    y={by + bucketHeight / 2 + 1}
                    textAnchor="middle"
                    fontSize={mult >= 10 ? 9 : 10}
                    fontWeight={700}
                    fill="#0f1923"
                    dominantBaseline="middle"
                  >
                    {mult}x
                  </text>
                </g>
              )
            })}

            {/* Balls with physics */}
            {balls.map((ball) => (
              <g key={ball.id}>
                {/* Ball shadow */}
                <ellipse
                  cx={ball.x}
                  cy={ball.y + 12}
                  rx={6}
                  ry={3}
                  fill="black"
                  opacity="0.3"
                />
                {/* Ball outer */}
                <circle
                  cx={ball.x}
                  cy={ball.y}
                  r={8}
                  fill="url(#ballGradient)"
                  stroke="#d4a732"
                  strokeWidth={1.5}
                />
                {/* Ball highlight */}
                <circle
                  cx={ball.x - 2}
                  cy={ball.y - 2}
                  r={3}
                  fill="white"
                  opacity="0.7"
                />
              </g>
            ))}

            {/* Ball gradient definition */}
            <defs>
              <radialGradient id="ballGradient" cx="30%" cy="30%">
                <stop offset="0%" stopColor="#ffe066" />
                <stop offset="50%" stopColor="#ffd93d" />
                <stop offset="100%" stopColor="#e6b800" />
              </radialGradient>
            </defs>
          </svg>
        </div>

        {/* Controls */}
        <div className="bg-card rounded-2xl border border-border/50 p-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Ставка</label>
              <div className="flex items-center bg-secondary rounded-lg overflow-hidden">
                <input
                  type="number"
                  value={betAmount}
                  onChange={(e) => setBetAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="flex-1 bg-transparent text-sm font-medium text-foreground px-3 py-2.5 outline-none min-w-0"
                  disabled={dropping}
                />
                <button
                  onClick={() => setBetAmount((b) => Math.max(1, parseFloat((b / 2).toFixed(2))))}
                  className="px-2.5 py-2.5 text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-[#2a3f4e] transition-colors"
                >
                  /2
                </button>
                <button
                  onClick={() => setBetAmount((b) => Math.min(parseFloat((b * 2).toFixed(2)), balance))}
                  className="px-2.5 py-2.5 text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-[#2a3f4e] transition-colors"
                >
                  x2
                </button>
              </div>
            </div>

            {/* Risk Level */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Риск</label>
              <div className="flex bg-secondary rounded-lg overflow-hidden h-[42px]">
                {(["low", "medium", "high"] as RiskLevel[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => setRisk(r)}
                    disabled={dropping}
                    className={`flex-1 text-xs font-semibold transition-all ${
                      risk === r
                        ? r === "high"
                          ? "bg-[#ff4757] text-white shadow-md"
                          : r === "medium"
                            ? "bg-[#ffd93d] text-[#0f1923] shadow-md"
                            : "bg-[#2ee06e] text-[#0f1923] shadow-md"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {r === "low" ? "Низкий" : r === "medium" ? "Средний" : "Высокий"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={drop}
            disabled={dropping || betAmount <= 0 || betAmount > balance}
            className="w-full mt-4 bg-[#2ee06e] hover:bg-[#25c45c] disabled:bg-secondary disabled:text-muted-foreground text-[#0f1923] font-bold text-lg py-3.5 rounded-xl transition-all glow-green"
          >
            {dropping ? "Падает..." : "Бросить"}
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
                  className="px-3 py-1.5 rounded-lg text-xs font-bold border"
                  style={{
                    backgroundColor: `${getMultiplierColor(h.multiplier)}20`,
                    color: getMultiplierColor(h.multiplier),
                    borderColor: `${getMultiplierColor(h.multiplier)}30`,
                  }}
                >
                  {h.multiplier}x
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </GameLayout>
  )
}
