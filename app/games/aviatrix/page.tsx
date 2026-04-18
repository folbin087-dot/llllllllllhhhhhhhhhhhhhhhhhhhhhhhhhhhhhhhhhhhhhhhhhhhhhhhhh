"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import GameLayout from "@/components/game-layout"
import Image from "next/image"
import { Users, Banknote, Clock, TrendingUp } from "lucide-react"

// Lucky Jet character with jetpack
const LUCKY_JET_CHARACTER = "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/40cc3303-569a034abe1f9a559396542ea7faa3e2-VQtJEHDcDkURpOuh5dYVNVh5fzrnH3.webp"

// Fake players for realistic feel
const FAKE_NAMES = [
  "Alex***", "Кирилл***", "Дима***", "Саша***", "Макс***", "Влад***", "Артём***", 
  "Денис***", "Игорь***", "Олег***", "Виктор***", "Руслан***", "Андрей***", "Костя***",
  "Марина***", "Света***", "Настя***", "Катя***", "Юля***", "Лена***"
]

// Generate seeded random stars for SSR consistency
const generateStars = () => {
  const stars = []
  for (let i = 0; i < 60; i++) {
    // Use deterministic positions based on index
    const seed = i * 7919 // Prime number for pseudo-randomness
    stars.push({
      width: 1 + (seed % 20) / 10,
      height: 1 + ((seed * 3) % 20) / 10,
      left: (seed % 100),
      top: ((seed * 13) % 100),
      opacity: 0.2 + ((seed * 7) % 60) / 100,
      duration: 2 + ((seed * 11) % 30) / 10,
    })
  }
  return stars
}

const STARS = generateStars()

interface FakePlayer {
  id: number
  name: string
  bet: number
  cashedOut: boolean
  cashOutAt: number
}

export default function AviatrixPage() {
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
  const [gameState, setGameState] = useState<"countdown" | "flying" | "crashed" | "cashed_out">("countdown")
  const [multiplier, setMultiplier] = useState(1.0)
  const [crashPoint, setCrashPoint] = useState(0)
  const [hasCashedOut, setHasCashedOut] = useState(false)
  const [cashOutMultiplier, setCashOutMultiplier] = useState(0)
  const [history, setHistory] = useState<{ crashPoint: number; cashedOut: boolean; cashOutAt: number; amount: number }[]>([])
  const [planeX, setPlaneX] = useState(5)
  const [planeY, setPlaneY] = useState(5)
  const [pathPoints, setPathPoints] = useState<{x: number, y: number}[]>([{x: 5, y: 5}])
  const [characterFlyingAway, setCharacterFlyingAway] = useState(false)
  const [multiplierBlinking, setMultiplierBlinking] = useState(false)
  const [blinkCount, setBlinkCount] = useState(0)
  const [characterOpacity, setCharacterOpacity] = useState(1)
  const [flyAwayPosition, setFlyAwayPosition] = useState({ x: 5, y: 5 })
  
  // Timer and players state
  const [countdown, setCountdown] = useState(8)
  const [hasPlacedBet, setHasPlacedBet] = useState(false)
  const [totalBank, setTotalBank] = useState(0)
  const [fakePlayers, setFakePlayers] = useState<FakePlayer[]>([])
  
  const animRef = useRef<number>(0)
  const startTimeRef = useRef(0)
  const countdownRef = useRef<NodeJS.Timeout | null>(null)
  const flyAwayIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Generate crash point with house edge (~8-12%)
  // Psychology: Many low crashes, occasional high multipliers for dopamine
  // Uses exponential distribution favoring lower values
  const generateCrashPoint = useCallback(() => {
    const random = Math.random()
    
    // 5% chance of instant crash (1.00x) - creates urgency
    if (random < 0.05) return 1.0
    
    // 15% chance of very early crash (1.01-1.20x) - punishes late cashouts
    if (random < 0.20) return parseFloat((1.01 + Math.random() * 0.19).toFixed(2))
    
    // 25% chance of early crash (1.20-1.50x)
    if (random < 0.45) return parseFloat((1.20 + Math.random() * 0.30).toFixed(2))
    
    // 30% chance of mid crash (1.50-2.50x) - where most players cash out
    if (random < 0.75) return parseFloat((1.50 + Math.random() * 1.00).toFixed(2))
    
    // 15% chance of good crash (2.50-5.00x)
    if (random < 0.90) return parseFloat((2.50 + Math.random() * 2.50).toFixed(2))
    
    // 8% chance of high crash (5.00-15.00x) - keeps players hooked
    if (random < 0.98) return parseFloat((5.00 + Math.random() * 10.00).toFixed(2))
    
    // 2% chance of jackpot (15.00-50.00x) - rare big wins
    return parseFloat((15.00 + Math.random() * 35.00).toFixed(2))
  }, [])

  // Generate fake players
  const generateFakePlayers = useCallback(() => {
    const count = 5 + Math.floor(Math.random() * 8)
    const players: FakePlayer[] = []
    let bank = 0
    
    for (let i = 0; i < count; i++) {
      const bet = Math.floor((50 + Math.random() * 950) / 10) * 10
      bank += bet
      players.push({
        id: i,
        name: FAKE_NAMES[Math.floor(Math.random() * FAKE_NAMES.length)],
        bet,
        cashedOut: false,
        cashOutAt: 0,
      })
    }
    
    setFakePlayers(players)
    setTotalBank(bank)
    return players
  }, [])

  // Start countdown timer
  const startCountdown = useCallback(() => {
    setGameState("countdown")
    setCountdown(8)
    setHasPlacedBet(false)
    setMultiplier(1.0)
    setPlaneX(5)
    setPlaneY(5)
    setPathPoints([{x: 5, y: 5}])
    setCharacterFlyingAway(false)
    setCharacterOpacity(1)
    setMultiplierBlinking(false)
    
    generateFakePlayers()
    
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current)
          // Start the flight
          startFlight()
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }, [generateFakePlayers])

  // Place bet during countdown
  const placeBet = useCallback(() => {
    if (gameState !== "countdown" || hasPlacedBet || betAmount <= 0 || betAmount > balance) return
    
    setBalance(b => parseFloat((b - betAmount).toFixed(2)))
    setHasPlacedBet(true)
    setTotalBank(prev => prev + betAmount)
    setHasCashedOut(false)
    setCashOutMultiplier(0)
  }, [gameState, hasPlacedBet, betAmount, balance])

  // Start the actual flight
  const startFlight = useCallback(() => {
    const cp = generateCrashPoint()
    setCrashPoint(cp)
    setGameState("flying")
    setPlaneX(5)
    setPlaneY(5)
    setPathPoints([{x: 5, y: 5}])
    startTimeRef.current = Date.now()
  }, [generateCrashPoint])

  // Flight animation with curve path
  useEffect(() => {
    if (gameState !== "flying") return

    let running = true
    let lastPx = planeX
    let lastPy = planeY
    
    const animate = () => {
      if (!running) return
      const elapsed = (Date.now() - startTimeRef.current) / 1000
      // Much slower multiplier growth - more realistic flight
      const newMult = parseFloat((1 + elapsed * 0.12 + (elapsed * elapsed) * 0.015).toFixed(2))

      // Update plane position - slower movement for longer flights
      const progress = Math.min(elapsed / 25, 1)
      const px = 5 + progress * 85
      const py = 5 + Math.min(progress * 60 + Math.sin(progress * Math.PI) * 25, 75)
      lastPx = px
      lastPy = py
      
      setPlaneX(px)
      setPlaneY(py)
      
      // Update path points for trail
      setPathPoints(prev => {
        const newPoints = [...prev, {x: px, y: py}]
        return newPoints.slice(-50)
      })

      // Simulate fake player cash outs
      if (newMult > 1.2) {
        setFakePlayers(prev => prev.map(p => {
          if (!p.cashedOut && Math.random() < 0.02) {
            return { ...p, cashedOut: true, cashOutAt: newMult }
          }
          return p
        }))
      }

      if (newMult >= crashPoint) {
        // Crash! - save position BEFORE setting state
        setMultiplier(crashPoint)
        setFlyAwayPosition({ x: lastPx, y: lastPy })
        setGameState("crashed")
        setCharacterFlyingAway(true)
        setMultiplierBlinking(true)
        setBlinkCount(0)
        
        // Animate character flying away smoothly
        let flyFrame = 0
        flyAwayIntervalRef.current = setInterval(() => {
          flyFrame++
          setFlyAwayPosition(prev => ({
            x: prev.x + 3,
            y: prev.y + 4
          }))
          setCharacterOpacity(prev => Math.max(0, prev - 0.035))
          if (flyFrame >= 35) {
            if (flyAwayIntervalRef.current) clearInterval(flyAwayIntervalRef.current)
          }
        }, 30)
        
        // Blink multiplier
        let blinks = 0
        const blinkInterval = setInterval(() => {
          blinks++
          setBlinkCount(blinks)
          if (blinks >= 12) {
            clearInterval(blinkInterval)
            setMultiplierBlinking(false)
            // Auto restart after crash
            setTimeout(() => startCountdown(), 2000)
          }
        }, 150)

        if (hasPlacedBet && !hasCashedOut) {
          setHistory(h => [
            { crashPoint, cashedOut: false, cashOutAt: 0, amount: -betAmount },
            ...h.slice(0, 19),
          ])
        } else if (!hasPlacedBet) {
          setHistory(h => [
            { crashPoint, cashedOut: false, cashOutAt: 0, amount: 0 },
            ...h.slice(0, 19),
          ])
        }
        return
      }

      setMultiplier(newMult)
      animRef.current = requestAnimationFrame(animate)
    }

    animRef.current = requestAnimationFrame(animate)
    return () => {
      running = false
      cancelAnimationFrame(animRef.current)
    }
  }, [gameState, crashPoint, hasPlacedBet, hasCashedOut, betAmount, startCountdown])

  const cashOut = useCallback(() => {
    if (gameState !== "flying" || hasCashedOut || !hasPlacedBet) return
    
    const payout = parseFloat((betAmount * multiplier).toFixed(2))
    setBalance(b => parseFloat((b + payout).toFixed(2)))
    setHasCashedOut(true)
    setCashOutMultiplier(multiplier)
    setGameState("cashed_out")
    setCharacterFlyingAway(true)
    setMultiplierBlinking(true)
    setBlinkCount(0)
    
    // Save current position for fly away
    setFlyAwayPosition({ x: planeX, y: planeY })
    
    // Animate character flying away smoothly
    let flyFrame = 0
    flyAwayIntervalRef.current = setInterval(() => {
      flyFrame++
      setFlyAwayPosition(prev => ({
        x: prev.x + 3,
        y: prev.y + 4
      }))
      setCharacterOpacity(prev => Math.max(0, prev - 0.035))
      if (flyFrame >= 35) {
        if (flyAwayIntervalRef.current) clearInterval(flyAwayIntervalRef.current)
      }
    }, 30)
    
    // Blink multiplier then restart
    let blinks = 0
    const blinkInterval = setInterval(() => {
      blinks++
      setBlinkCount(blinks)
      if (blinks >= 12) {
        clearInterval(blinkInterval)
        setMultiplierBlinking(false)
        setTimeout(() => startCountdown(), 2000)
      }
    }, 150)
    
    setHistory(h => [
      { crashPoint, cashedOut: true, cashOutAt: multiplier, amount: payout - betAmount },
      ...h.slice(0, 19),
    ])
  }, [gameState, hasCashedOut, hasPlacedBet, betAmount, multiplier, crashPoint, planeX, planeY, startCountdown])

  // Initialize game on mount
  useEffect(() => {
    startCountdown()
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current)
      if (flyAwayIntervalRef.current) clearInterval(flyAwayIntervalRef.current)
      cancelAnimationFrame(animRef.current)
    }
  }, [])

  const getMultiplierColor = () => {
    if (gameState === "crashed") return "#ff4757"
    if (hasCashedOut) return "#ffd93d"
    if (multiplier < 2) return "#2ee06e"
    if (multiplier < 5) return "#ffd93d"
    return "#ff6b6b"
  }

  // Generate path string for SVG (curved arc)
  const generatePathString = () => {
    if (pathPoints.length < 2) return ""
    return pathPoints.map((p, i) => 
      i === 0 ? `M ${p.x} ${100 - p.y}` : `L ${p.x} ${100 - p.y}`
    ).join(" ")
  }

  // Generate filled area under the curve
  const generateFilledArea = () => {
    if (pathPoints.length < 2) return ""
    const pathStr = pathPoints.map((p, i) => 
      i === 0 ? `M ${p.x} 100` : ``
    ).join("") + pathPoints.map((p) => 
      `L ${p.x} ${100 - p.y}`
    ).join("") + ` L ${pathPoints[pathPoints.length - 1].x} 100 Z`
    return pathStr
  }

  return (
    <GameLayout title="Aviatrix" balance={balance}>
      <div className="flex flex-col gap-3">
        {/* Bank and Players Info */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-card/80 rounded-xl border border-border/50 p-3 flex flex-col items-center">
            <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
              <Banknote className="w-3.5 h-3.5" />
              <span className="text-[10px] uppercase tracking-wide">Банк</span>
            </div>
            <span className="text-sm font-bold text-[#2ee06e]">{totalBank.toLocaleString()} ₽</span>
          </div>
          <div className="bg-card/80 rounded-xl border border-border/50 p-3 flex flex-col items-center">
            <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
              <Users className="w-3.5 h-3.5" />
              <span className="text-[10px] uppercase tracking-wide">Игроки</span>
            </div>
            <span className="text-sm font-bold text-foreground">{fakePlayers.length + (hasPlacedBet ? 1 : 0)}</span>
          </div>
          <div className="bg-card/80 rounded-xl border border-border/50 p-3 flex flex-col items-center">
            <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
              <Clock className="w-3.5 h-3.5" />
              <span className="text-[10px] uppercase tracking-wide">Раунд</span>
            </div>
            <span className="text-sm font-bold text-foreground">#{history.length + 1}</span>
          </div>
        </div>

        {/* Flight Area */}
        <div className="bg-gradient-to-b from-[#1a0a2e] via-[#0f1923] to-[#0a0f1a] rounded-2xl border border-border/50 relative overflow-hidden" style={{ height: 340 }}>
          {/* Stars background - deterministic */}
          <div className="absolute inset-0">
            {STARS.map((star, i) => (
              <div
                key={i}
                className="absolute rounded-full bg-white"
                style={{
                  width: star.width,
                  height: star.height,
                  left: `${star.left}%`,
                  top: `${star.top}%`,
                  opacity: star.opacity,
                  animation: `pulse ${star.duration}s ease-in-out infinite`,
                }}
              />
            ))}
          </div>

          {/* Flight path curve - SVG */}
          <svg 
            className="absolute inset-0 w-full h-full" 
            viewBox="0 0 100 100" 
            preserveAspectRatio="none"
          >
            {/* Grid lines */}
            {[20, 40, 60, 80].map((y) => (
              <line key={`h${y}`} x1="0" y1={y} x2="100" y2={y} stroke="#2a3f4e" strokeWidth="0.15" strokeDasharray="2,2" opacity="0.3" />
            ))}
            {[20, 40, 60, 80].map((x) => (
              <line key={`v${x}`} x1={x} y1="0" x2={x} y2="100" stroke="#2a3f4e" strokeWidth="0.15" strokeDasharray="2,2" opacity="0.3" />
            ))}
            
            {/* Filled area under curve - green gradient */}
            {pathPoints.length > 1 && (
              <path
                d={generateFilledArea()}
                fill="url(#areaGradient)"
                opacity="0.4"
              />
            )}
            
            {/* Flight path trail - glowing curve */}
            {pathPoints.length > 1 && (
              <>
                {/* Outer glow */}
                <path
                  d={generatePathString()}
                  fill="none"
                  stroke="#2ee06e"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity="0.3"
                  style={{ filter: "blur(3px)" }}
                />
                {/* Main bright path */}
                <path
                  d={generatePathString()}
                  fill="none"
                  stroke="url(#pathGradient)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </>
            )}
            
            {/* Gradient definitions */}
            <defs>
              <linearGradient id="pathGradient" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#2ee06e" stopOpacity="0.5" />
                <stop offset="50%" stopColor="#2ee06e" stopOpacity="1" />
                <stop offset="100%" stopColor="#ffd93d" />
              </linearGradient>
              <linearGradient id="areaGradient" x1="0%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="#2ee06e" stopOpacity="0" />
                <stop offset="100%" stopColor="#2ee06e" stopOpacity="0.5" />
              </linearGradient>
            </defs>
          </svg>

          {/* Lucky Jet Character - flying */}
          {(gameState === "flying" || gameState === "crashed" || gameState === "cashed_out") && (
            <div
              className="absolute z-20"
              style={{
                left: characterFlyingAway ? `${flyAwayPosition.x}%` : `${planeX}%`,
                bottom: characterFlyingAway ? `${flyAwayPosition.y}%` : `${planeY}%`,
                transform: `translate(-50%, 50%) rotate(${characterFlyingAway ? "-45deg" : "-20deg"}) scale(${characterFlyingAway ? 0.7 : 1})`,
                opacity: characterOpacity,
                filter: gameState === "crashed" ? "grayscale(1) brightness(0.7)" : "drop-shadow(0 0 20px rgba(46, 224, 110, 0.5))",
                transition: characterFlyingAway ? "transform 0.3s ease-out" : "left 0.1s ease-out, bottom 0.1s ease-out",
              }}
            >
              <div className="relative">
                <Image
                  src={LUCKY_JET_CHARACTER}
                  alt="Lucky Jet"
                  width={90}
                  height={90}
                  className="drop-shadow-2xl"
                  priority
                />
                
                {/* Jetpack flame effect */}
                {!characterFlyingAway && (gameState === "flying" || gameState === "cashed_out") && (
                  <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex flex-col items-center">
                    <div
                      className="w-8 h-14 rounded-full"
                      style={{
                        background: "linear-gradient(to bottom, #ffd93d 0%, #ff6b6b 40%, #ff4757 70%, transparent 100%)",
                        opacity: 0.9,
                        animation: "flameFlicker 0.1s ease-in-out infinite",
                        filter: "blur(2px)",
                      }}
                    />
                    <div
                      className="absolute top-0 w-5 h-8 rounded-full"
                      style={{
                        background: "linear-gradient(to bottom, white 0%, #ffd93d 50%, transparent 100%)",
                        opacity: 0.8,
                        animation: "flameFlicker 0.08s ease-in-out infinite",
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Waiting state - character on ground */}
          {gameState === "countdown" && (
            <div className="absolute left-8 bottom-8 z-20">
              <Image
                src={LUCKY_JET_CHARACTER}
                alt="Lucky Jet"
                width={70}
                height={70}
                className="drop-shadow-xl opacity-80"
                priority
              />
            </div>
          )}

          {/* Multiplier / Countdown Display */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 text-center">
            {gameState === "countdown" && (
              <div>
                <p className="text-muted-foreground text-sm mb-2">Делайте ставки!</p>
                <div 
                  className="text-6xl font-black text-[#ffd93d] tabular-nums"
                  style={{ textShadow: "0 0 40px rgba(255, 217, 61, 0.5)" }}
                >
                  {countdown}
                </div>
                <p className="text-xs text-muted-foreground mt-2">до взлёта</p>
              </div>
            )}
            {gameState === "flying" && (
              <div>
                <p
                  className="text-5xl sm:text-6xl font-black tabular-nums"
                  style={{ color: getMultiplierColor(), textShadow: `0 0 30px ${getMultiplierColor()}50` }}
                >
                  {multiplier.toFixed(2)}x
                </p>
              </div>
            )}
            {gameState === "cashed_out" && (
              <div>
                <p
                  className="text-5xl sm:text-6xl font-black tabular-nums transition-all duration-150"
                  style={{ 
                    color: "#ffd93d", 
                    textShadow: "0 0 30px rgba(255, 217, 61, 0.5)",
                    opacity: multiplierBlinking && blinkCount % 2 === 1 ? 0.3 : 1,
                    transform: multiplierBlinking && blinkCount % 2 === 1 ? "scale(0.95)" : "scale(1)",
                  }}
                >
                  {cashOutMultiplier.toFixed(2)}x
                </p>
                <p className="text-lg font-bold text-[#ffd93d] mt-2">
                  Забрано! +{(betAmount * cashOutMultiplier - betAmount).toFixed(2)} ₽
                </p>
              </div>
            )}
            {gameState === "crashed" && (
              <div>
                <p 
                  className="text-5xl sm:text-6xl font-black transition-all duration-150"
                  style={{ 
                    color: "#ff4757",
                    textShadow: "0 0 30px rgba(255, 71, 87, 0.5)",
                    opacity: multiplierBlinking && blinkCount % 2 === 1 ? 0.3 : 1,
                    transform: multiplierBlinking && blinkCount % 2 === 1 ? "scale(0.95)" : "scale(1)",
                  }}
                >
                  {crashPoint.toFixed(2)}x
                </p>
                <p className="text-lg font-bold text-[#ff4757] mt-2">Улетел!</p>
              </div>
            )}
          </div>
        </div>

        {/* Live Players Panel - Like roulette */}
        <div className="bg-card/80 rounded-xl border border-border/50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 bg-secondary/50 border-b border-border/50">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[#2ee06e]" />
              <span className="text-xs font-semibold text-foreground uppercase tracking-wide">Все ставки</span>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="text-muted-foreground">
                Играют: <span className="text-foreground font-bold">{fakePlayers.length + (hasPlacedBet ? 1 : 0)}</span>
              </span>
              <span className="text-[#2ee06e]">
                Забрали: <span className="font-bold">{fakePlayers.filter(p => p.cashedOut).length + (hasCashedOut ? 1 : 0)}</span>
              </span>
            </div>
          </div>
          
          {/* Players list */}
          <div className="max-h-40 overflow-y-auto p-2 space-y-1">
            {/* Your bet - always on top if placed */}
            {hasPlacedBet && (
              <div className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium ${
                hasCashedOut 
                  ? "bg-[#2ee06e]/20 text-[#2ee06e] border border-[#2ee06e]/30" 
                  : gameState === "crashed" 
                    ? "bg-[#ff4757]/20 text-[#ff4757] border border-[#ff4757]/30"
                    : "bg-[#ffd93d]/20 text-[#ffd93d] border border-[#ffd93d]/30"
              }`}>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-[#2ee06e] flex items-center justify-center text-[10px] font-bold text-[#0f1923]">
                    ВЫ
                  </div>
                  <span>Вы</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold">{betAmount} ₽</span>
                  {hasCashedOut && (
                    <span className="px-2 py-0.5 rounded bg-[#2ee06e]/30 text-[#2ee06e] font-bold">
                      {cashOutMultiplier.toFixed(2)}x
                    </span>
                  )}
                  {!hasCashedOut && gameState === "crashed" && (
                    <span className="px-2 py-0.5 rounded bg-[#ff4757]/30 text-[#ff4757] font-bold">
                      0x
                    </span>
                  )}
                </div>
              </div>
            )}
            
            {/* Other players */}
            {fakePlayers.map(player => (
              <div 
                key={player.id} 
                className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-xs transition-all duration-300 ${
                  player.cashedOut 
                    ? "bg-[#2ee06e]/10 text-[#2ee06e]" 
                    : gameState === "crashed"
                      ? "bg-[#ff4757]/10 text-[#ff4757]"
                      : "bg-secondary/30 text-muted-foreground"
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-secondary flex items-center justify-center text-[8px] font-bold">
                    {player.name.charAt(0)}
                  </div>
                  <span>{player.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>{player.bet} ₽</span>
                  {player.cashedOut && (
                    <span className="px-1.5 py-0.5 rounded bg-[#2ee06e]/20 font-bold">
                      {player.cashOutAt.toFixed(2)}x
                    </span>
                  )}
                  {!player.cashedOut && gameState === "crashed" && (
                    <span className="px-1.5 py-0.5 rounded bg-[#ff4757]/20 font-bold">
                      0x
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent crashes strip */}
        {history.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto pb-1 px-1">
            {history.slice(0, 20).map((h, i) => (
              <div
                key={i}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold flex-shrink-0 ${
                  h.crashPoint < 2
                    ? "bg-[#ff4757]/20 text-[#ff4757]"
                    : h.crashPoint < 5
                      ? "bg-[#ffd93d]/20 text-[#ffd93d]"
                      : "bg-[#2ee06e]/20 text-[#2ee06e]"
                }`}
              >
                {h.crashPoint.toFixed(2)}x
              </div>
            ))}
          </div>
        )}

        {/* Controls */}
        <div className="bg-card rounded-xl border border-border/50 p-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Ставка</label>
            <div className="flex items-center bg-secondary rounded-lg overflow-hidden">
              <input
                type="number"
                value={betAmount}
                onChange={(e) => setBetAmount(Math.max(1, parseFloat(e.target.value) || 0))}
                className="flex-1 bg-transparent text-sm font-medium text-foreground px-3 py-2.5 outline-none min-w-0"
                disabled={gameState !== "countdown" || hasPlacedBet}
              />
              <button
                onClick={() => setBetAmount(b => Math.max(1, parseFloat((b / 2).toFixed(2))))}
                className="px-2 py-2.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
                disabled={gameState !== "countdown" || hasPlacedBet}
              >
                /2
              </button>
              <button
                onClick={() => setBetAmount(b => Math.min(parseFloat((b * 2).toFixed(2)), balance))}
                className="px-2 py-2.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
                disabled={gameState !== "countdown" || hasPlacedBet}
              >
                x2
              </button>
            </div>
          </div>

          {gameState === "countdown" && !hasPlacedBet ? (
            <button
              onClick={placeBet}
              disabled={betAmount <= 0 || betAmount > balance}
              className="w-full mt-4 bg-[#2ee06e] hover:bg-[#25c45c] disabled:bg-secondary disabled:text-muted-foreground text-[#0f1923] font-bold text-base py-3 rounded-xl transition-all glow-green"
            >
              Поставить {betAmount} ₽
            </button>
          ) : gameState === "countdown" && hasPlacedBet ? (
            <button
              disabled
              className="w-full mt-4 bg-[#ffd93d]/50 text-[#0f1923] font-bold text-base py-3 rounded-xl"
            >
              Ставка принята - {betAmount} ₽
            </button>
          ) : gameState === "flying" && hasPlacedBet && !hasCashedOut ? (
            <button
              onClick={cashOut}
              className="w-full mt-4 bg-[#ffd93d] hover:bg-[#f5cc1b] text-[#0f1923] font-bold text-base py-3 rounded-xl transition-all animate-pulse"
            >
              Забрать {(betAmount * multiplier).toFixed(2)} ₽ ({multiplier.toFixed(2)}x)
            </button>
          ) : (
            <button
              disabled
              className="w-full mt-4 bg-secondary text-muted-foreground font-bold text-base py-3 rounded-xl"
            >
              {gameState === "flying" ? "В полёте..." : hasCashedOut ? "Забрано!" : "Ожидание..."}
            </button>
          )}
        </div>

        {/* History table */}
        {history.length > 0 && (
          <div className="bg-card rounded-xl border border-border/50 p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">История</h3>
            <div className="flex flex-col gap-2">
              {history.filter(h => h.amount !== 0).slice(0, 10).map((h, i) => (
                <div
                  key={i}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm ${
                    h.cashedOut ? "bg-[#2ee06e]/10 text-[#2ee06e]" : "bg-destructive/10 text-destructive"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{h.crashPoint.toFixed(2)}x</span>
                    {h.cashedOut && <span className="text-xs opacity-70">({h.cashOutAt.toFixed(2)}x)</span>}
                  </div>
                  <span className="font-bold">
                    {h.amount > 0 ? "+" : ""}{h.amount.toFixed(2)} ₽
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* CSS for animations */}
      <style jsx>{`
        @keyframes flameFlicker {
          0%, 100% { transform: scaleY(1) scaleX(1); }
          50% { transform: scaleY(1.1) scaleX(0.9); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.8; }
        }
        .glow-green {
          box-shadow: 0 0 20px rgba(46, 224, 110, 0.4);
        }
      `}</style>
    </GameLayout>
  )
}
