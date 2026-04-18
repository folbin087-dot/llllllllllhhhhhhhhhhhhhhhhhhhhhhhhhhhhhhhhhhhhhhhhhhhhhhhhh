"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import GameLayout from "@/components/game-layout"

// 3D Dice Component with proper 3D rotation animation
function Dice3D({ 
  result, 
  isRolling, 
  phase 
}: { 
  result: number | null
  isRolling: boolean
  phase: "idle" | "spinning" | "revealing"
}) {
  const displayValue = result !== null ? result.toFixed(2) : "?"
  const [rotationX, setRotationX] = useState(0)
  const [rotationY, setRotationY] = useState(0)
  const [rotationZ, setRotationZ] = useState(0)
  const animRef = useRef<number>(0)
  const [showResult, setShowResult] = useState(true)
  
  // Spin animation with proper 3D rotation
  useEffect(() => {
    if (phase === "spinning") {
      setShowResult(false)
      let frame = 0
      let speedX = 15 + Math.random() * 8
      let speedY = 12 + Math.random() * 8
      let speedZ = 6 + Math.random() * 4
      
      const animate = () => {
        frame++
        
        // Gradually slow down for realistic effect
        const slowdown = Math.max(0.1, 1 - frame / 70)
        
        // 3D rotation with varying speeds
        setRotationX(prev => prev + speedX * slowdown)
        setRotationY(prev => prev + speedY * slowdown)
        setRotationZ(prev => prev + speedZ * slowdown)
        
        if (frame < 65) {
          animRef.current = requestAnimationFrame(animate)
        }
      }
      
      animRef.current = requestAnimationFrame(animate)
      
      return () => {
        cancelAnimationFrame(animRef.current)
      }
    } else if (phase === "revealing") {
      // Smoothly rotate to show front face with result
      setRotationX(0)
      setRotationY(0)
      setRotationZ(0)
      // Show result after transition
      setTimeout(() => setShowResult(true), 300)
    } else if (phase === "idle") {
      setRotationX(0)
      setRotationY(0)
      setRotationZ(0)
      setShowResult(true)
    }
  }, [phase])
  
  return (
    <div className="relative h-56 flex items-center justify-center" style={{ perspective: "1200px" }}>
      {/* 3D Dice container */}
      <div
        className="relative"
        style={{
          transformStyle: "preserve-3d",
          transform: `rotateX(${rotationX}deg) rotateY(${rotationY}deg) rotateZ(${rotationZ}deg)`,
          transition: phase === "revealing" 
            ? "transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)" 
            : phase === "idle" 
              ? "transform 0.3s ease-out"
              : "none",
        }}
      >
        {/* Dice cube */}
        <div 
          className="relative w-36 h-36 sm:w-40 sm:h-40"
          style={{
            transformStyle: "preserve-3d",
          }}
        >
          {/* Front face - shows result (faces us in idle state) */}
          <div 
            className="absolute inset-0 rounded-2xl flex items-center justify-center"
            style={{
              background: "linear-gradient(145deg, #ffffff 0%, #f5f5f5 50%, #ebebeb 100%)",
              transform: "translateZ(72px)",
              boxShadow: "inset 0 2px 15px rgba(255,255,255,0.9), inset 0 -3px 15px rgba(0,0,0,0.08), 0 8px 30px rgba(0,0,0,0.3)",
              border: "2px solid #e0e0e0",
            }}
          >
            {/* Corner dots for realistic dice look */}
            <div className="absolute top-4 left-4 w-4 h-4 rounded-full bg-gray-200/60" />
            <div className="absolute top-4 right-4 w-4 h-4 rounded-full bg-gray-200/60" />
            <div className="absolute bottom-4 left-4 w-4 h-4 rounded-full bg-gray-200/60" />
            <div className="absolute bottom-4 right-4 w-4 h-4 rounded-full bg-gray-200/60" />
            
            {/* Result number - bold black */}
            <span 
              className="text-4xl sm:text-5xl font-black text-[#1a1a1a] drop-shadow-sm"
              style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}
            >
              {showResult && !isRolling ? displayValue : "?"}
            </span>
          </div>

          {/* Back face */}
          <div 
            className="absolute inset-0 rounded-2xl flex items-center justify-center"
            style={{
              background: "linear-gradient(145deg, #f5f5f5 0%, #e8e8e8 100%)",
              transform: "translateZ(-72px) rotateY(180deg)",
              border: "2px solid #d5d5d5",
            }}
          >
            <div className="grid grid-cols-3 gap-2">
              {[1,2,3,4,5,6].map((n) => (
                <div key={n} className="w-5 h-5 rounded-full bg-[#1a1a1a]" />
              ))}
            </div>
          </div>

          {/* Right face */}
          <div 
            className="absolute inset-0 rounded-2xl flex items-center justify-center"
            style={{
              background: "linear-gradient(145deg, #f8f8f8 0%, #e5e5e5 100%)",
              transform: "rotateY(90deg) translateZ(72px)",
              border: "2px solid #d5d5d5",
            }}
          >
            <div className="grid grid-cols-2 gap-4">
              {[1,2,3,4].map((n) => (
                <div key={n} className="w-6 h-6 rounded-full bg-[#1a1a1a]" />
              ))}
            </div>
          </div>

          {/* Left face */}
          <div 
            className="absolute inset-0 rounded-2xl flex items-center justify-center"
            style={{
              background: "linear-gradient(145deg, #f0f0f0 0%, #e0e0e0 100%)",
              transform: "rotateY(-90deg) translateZ(72px)",
              border: "2px solid #d5d5d5",
            }}
          >
            <div className="grid grid-cols-2 gap-5">
              <div className="w-6 h-6 rounded-full bg-[#1a1a1a]" />
              <div className="w-6 h-6 rounded-full bg-[#1a1a1a]" />
            </div>
          </div>

          {/* Top face */}
          <div 
            className="absolute inset-0 rounded-2xl flex items-center justify-center"
            style={{
              background: "linear-gradient(145deg, #ffffff 0%, #f5f5f5 100%)",
              transform: "rotateX(90deg) translateZ(72px)",
              border: "2px solid #d5d5d5",
            }}
          >
            <div className="w-7 h-7 rounded-full bg-[#1a1a1a]" />
          </div>

          {/* Bottom face */}
          <div 
            className="absolute inset-0 rounded-2xl flex items-center justify-center"
            style={{
              background: "linear-gradient(145deg, #e8e8e8 0%, #d8d8d8 100%)",
              transform: "rotateX(-90deg) translateZ(72px)",
              border: "2px solid #d0d0d0",
            }}
          >
            <div className="flex flex-col gap-2">
              <div className="flex gap-8">
                <div className="w-5 h-5 rounded-full bg-[#1a1a1a]" />
                <div className="w-5 h-5 rounded-full bg-[#1a1a1a]" />
              </div>
              <div className="w-5 h-5 rounded-full bg-[#1a1a1a] mx-auto" />
              <div className="flex gap-8">
                <div className="w-5 h-5 rounded-full bg-[#1a1a1a]" />
                <div className="w-5 h-5 rounded-full bg-[#1a1a1a]" />
              </div>
            </div>
          </div>
        </div>

        {/* Shadow under dice */}
        <div 
          className={`absolute top-full mt-6 left-1/2 -translate-x-1/2 w-28 h-8 bg-black/25 rounded-full blur-xl transition-all duration-300 ${
            phase === "spinning" ? "scale-75 opacity-20" : "scale-100 opacity-35"
          }`}
        />
      </div>
    </div>
  )
}

export default function DicePage() {
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
  const [targetNumber, setTargetNumber] = useState(50)
  const [isOver, setIsOver] = useState(true)
  const [rolling, setRolling] = useState(false)
  const [result, setResult] = useState<number | null>(null)
  const [won, setWon] = useState<boolean | null>(null)
  const [winAmount, setWinAmount] = useState(0)
  const [history, setHistory] = useState<{ result: number; won: boolean; amount: number }[]>([])
  const [dicePhase, setDicePhase] = useState<"idle" | "spinning" | "revealing">("idle")

  const multiplier = isOver
    ? (99 / (100 - targetNumber)).toFixed(4)
    : (99 / targetNumber).toFixed(4)

  const winChance = isOver ? 100 - targetNumber : targetNumber

  // Improved odds logic - ensures consistent ~8-12% house edge
  // The theoretical payout is reduced to create edge
  // Higher multipliers = higher house edge (players get greedy)
  const generateResult = useCallback((target: number, over: boolean, mult: number) => {
    // Base house edge 5%, increases with multiplier
    // At 2x mult = 7% edge, at 10x mult = 15% edge
    const baseHouseEdge = 0.05
    const multiplierEdge = Math.min(0.10, (mult - 1) * 0.012)
    const houseEdge = baseHouseEdge + multiplierEdge
    
    // Calculate true win probability based on target
    const theoreticalWinChance = over ? (100 - target) / 100 : target / 100
    
    // Apply house edge - reduce actual win chance
    const actualWinChance = theoreticalWinChance * (1 - houseEdge)
    
    // For very high multipliers (>8x), add extra anti-win bias
    // Players chasing big wins should lose more often
    let finalWinChance = actualWinChance
    if (mult >= 8) {
      finalWinChance *= 0.5 // Cut win chance in half for greedy plays
    } else if (mult >= 5) {
      finalWinChance *= 0.75 // 25% harder to win at medium-high mults
    }
    
    // Decide if player wins
    const wins = Math.random() < finalWinChance
    
    if (wins) {
      // Generate a winning result within the winning range
      if (over) {
        // Need result > target
        return parseFloat((target + 0.01 + Math.random() * (99.99 - target)).toFixed(2))
      } else {
        // Need result < target
        return parseFloat((Math.random() * (target - 0.01)).toFixed(2))
      }
    } else {
      // Generate a losing result within the losing range
      if (over) {
        // Need result <= target (loss)
        return parseFloat((Math.random() * target).toFixed(2))
      } else {
        // Need result >= target (loss)
        return parseFloat((target + Math.random() * (100 - target)).toFixed(2))
      }
    }
  }, [])

  const roll = useCallback(() => {
    if (rolling || betAmount <= 0 || betAmount > balance) return
    setRolling(true)
    setResult(null)
    setWon(null)
    setDicePhase("spinning")

    // Spinning animation then reveal
    setTimeout(() => {
      setDicePhase("revealing")

      const mult = parseFloat(multiplier)
      const rolled = generateResult(targetNumber, isOver, mult)
      const isWin = isOver ? rolled > targetNumber : rolled < targetNumber
      const payout = isWin ? betAmount * mult : 0

      setResult(rolled)
      setWon(isWin)
      setWinAmount(payout)

      if (isWin) {
        setBalance((b) => parseFloat((b + payout - betAmount).toFixed(2)))
      } else {
        setBalance((b) => parseFloat((b - betAmount).toFixed(2)))
      }

      setHistory((h) => [{ result: rolled, won: isWin, amount: isWin ? payout : -betAmount }, ...h.slice(0, 19)])
      
      setTimeout(() => {
        setDicePhase("idle")
        setRolling(false)
      }, 600)
    }, 1200)
  }, [rolling, betAmount, balance, targetNumber, isOver, multiplier, generateResult])

  return (
    <GameLayout title="Dice" balance={balance}>
      <div className="flex flex-col gap-4">
        {/* Result Display with 3D Dice */}
        <div className="bg-card rounded-2xl border border-border/50 p-6 relative overflow-hidden">
          {/* Background pattern */}
          <div className="absolute inset-0 opacity-5" style={{ backgroundImage: "radial-gradient(circle, #2ee06e 1px, transparent 1px)", backgroundSize: "30px 30px" }} />

          {/* 3D Dice */}
          <Dice3D 
            result={result} 
            isRolling={rolling && dicePhase === "spinning"} 
            phase={dicePhase}
          />

          {/* Win/Loss display with multiplier */}
          {won !== null && !rolling && (
            <div className={`text-center mt-4 ${won ? "text-[#2ee06e]" : "text-[#ff4757]"}`}>
              {won && (
                <p className="text-3xl font-black mb-1 animate-pulse">
                  x{parseFloat(multiplier).toFixed(2)}
                </p>
              )}
              <p className="text-2xl font-black">
                {won ? `+${(winAmount - betAmount).toFixed(2)} ₽` : `-${betAmount.toFixed(2)} ₽`}
              </p>
            </div>
          )}

          {/* Slider visualization */}
          <div className="mt-6 px-2 relative z-10">
            <div className="relative h-4 rounded-full overflow-hidden bg-[#0f1923] border border-[#2a3f4e]">
              <div
                className="absolute top-0 h-full rounded-l-full transition-all duration-200"
                style={{
                  width: `${targetNumber}%`,
                  backgroundColor: isOver ? "rgba(255, 71, 87, 0.5)" : "rgba(46, 224, 110, 0.5)",
                }}
              />
              <div
                className="absolute top-0 h-full rounded-r-full transition-all duration-200"
                style={{
                  left: `${targetNumber}%`,
                  width: `${100 - targetNumber}%`,
                  backgroundColor: isOver ? "rgba(46, 224, 110, 0.5)" : "rgba(255, 71, 87, 0.5)",
                }}
              />
              {/* Target line */}
              <div
                className="absolute top-0 w-0.5 h-full bg-white z-10"
                style={{ left: `${targetNumber}%` }}
              />
              {/* Result marker */}
              {result !== null && !rolling && (
                <div
                  className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full z-20 border-2 border-white transition-all ${
                    won ? "bg-[#2ee06e]" : "bg-[#ff4757]"
                  }`}
                  style={{ left: `calc(${result}% - 6px)` }}
                />
              )}
            </div>
            <input
              type="range"
              min={2}
              max={98}
              value={targetNumber}
              onChange={(e) => setTargetNumber(parseInt(e.target.value))}
              className="w-full mt-3"
              disabled={rolling}
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>0</span>
              <span className="text-foreground font-bold text-sm">{targetNumber}</span>
              <span>100</span>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-card rounded-2xl border border-border/50 p-4">
          <div className="grid grid-cols-2 gap-3">
            {/* Bet Amount */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Ставка</label>
              <div className="flex items-center bg-secondary rounded-lg overflow-hidden">
                <input
                  type="number"
                  value={betAmount}
                  onChange={(e) => setBetAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="flex-1 bg-transparent text-sm font-medium text-foreground px-3 py-2.5 outline-none min-w-0"
                  disabled={rolling}
                />
                <button
                  onClick={() => setBetAmount((b) => parseFloat((b / 2).toFixed(2)))}
                  className="px-2.5 py-2.5 text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-[#2a3f4e] transition-colors"
                  disabled={rolling}
                >
                  /2
                </button>
                <button
                  onClick={() => setBetAmount((b) => Math.min(parseFloat((b * 2).toFixed(2)), balance))}
                  className="px-2.5 py-2.5 text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-[#2a3f4e] transition-colors"
                  disabled={rolling}
                >
                  x2
                </button>
              </div>
            </div>

            {/* Direction */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Режим</label>
              <div className="flex bg-secondary rounded-lg overflow-hidden h-[42px]">
                <button
                  onClick={() => setIsOver(true)}
                  className={`flex-1 text-sm font-semibold transition-all ${
                    isOver ? "bg-[#2ee06e] text-[#0f1923] shadow-lg" : "text-muted-foreground hover:text-foreground"
                  }`}
                  disabled={rolling}
                >
                  Б��льше
                </button>
                <button
                  onClick={() => setIsOver(false)}
                  className={`flex-1 text-sm font-semibold transition-all ${
                    !isOver ? "bg-[#ff4757] text-white shadow-lg" : "text-muted-foreground hover:text-foreground"
                  }`}
                  disabled={rolling}
                >
                  Меньше
                </button>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mt-3">
            <div className="bg-secondary rounded-lg px-3 py-2.5 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Множитель</p>
              <p className="text-sm font-bold text-foreground">{parseFloat(multiplier).toFixed(4)}x</p>
            </div>
            <div className="bg-secondary rounded-lg px-3 py-2.5 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Шанс</p>
              <p className="text-sm font-bold text-foreground">{winChance.toFixed(2)}%</p>
            </div>
            <div className="bg-secondary rounded-lg px-3 py-2.5 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Выигрыш</p>
              <p className="text-sm font-bold text-[#2ee06e]">
                {(betAmount * parseFloat(multiplier)).toFixed(2)} ₽
              </p>
            </div>
          </div>

          {/* Roll Button */}
          <button
            onClick={roll}
            disabled={rolling || betAmount <= 0 || betAmount > balance}
            className="w-full mt-4 bg-[#2ee06e] hover:bg-[#25c45c] disabled:bg-secondary disabled:text-muted-foreground text-[#0f1923] font-bold text-lg py-3.5 rounded-xl transition-all glow-green"
          >
            {rolling ? "Бросок..." : "Бросить"}
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
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    h.won
                      ? "bg-[#2ee06e]/20 text-[#2ee06e] border border-[#2ee06e]/20"
                      : "bg-[#ff4757]/20 text-[#ff4757] border border-[#ff4757]/20"
                  }`}
                >
                  {h.result.toFixed(2)}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </GameLayout>
  )
}
