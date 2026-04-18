"use client"

import { useState, useCallback, useEffect } from "react"
import Image from "next/image"
import GameLayout from "@/components/game-layout"

const GRID_SIZE = 25

const GEM_ICON = "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/gem-mine-mnwyZjfhKNdF4lsClwtXpHER1c0sY4.png"
const BOMB_ICON = "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/bomb-mine-lsPufl62d6buX6vghQJ5tWF32rdcdW.png"

type CellState = "hidden" | "gem" | "bomb"

export default function MinesPage() {
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
  const [minesCount, setMinesCount] = useState(5)
  const [gameActive, setGameActive] = useState(false)
  const [grid, setGrid] = useState<CellState[]>(Array(GRID_SIZE).fill("hidden"))
  const [minePositions, setMinePositions] = useState<Set<number>>(new Set())
  const [revealed, setRevealed] = useState<Set<number>>(new Set())
  const [gameOver, setGameOver] = useState(false)
  const [currentMultiplier, setCurrentMultiplier] = useState(1)
  const [hitBomb, setHitBomb] = useState<number | null>(null)
  const [history, setHistory] = useState<{ won: boolean; amount: number; gems: number }[]>([])

  const calculateMultiplier = useCallback(
    (gemsFound: number) => {
      let mult = 1
      for (let i = 0; i < gemsFound; i++) {
        const safeLeft = GRID_SIZE - minesCount - i
        const totalLeft = GRID_SIZE - i
        mult *= totalLeft / safeLeft
      }
      return parseFloat(mult.toFixed(4))
    },
    [minesCount]
  )

  const startGame = useCallback(() => {
    if (betAmount <= 0 || betAmount > balance) return

    const mines = new Set<number>()
    while (mines.size < minesCount) {
      mines.add(Math.floor(Math.random() * GRID_SIZE))
    }

    setMinePositions(mines)
    setGrid(Array(GRID_SIZE).fill("hidden"))
    setRevealed(new Set())
    setGameActive(true)
    setGameOver(false)
    setHitBomb(null)
    setCurrentMultiplier(1)
    setBalance((b) => parseFloat((b - betAmount).toFixed(2)))
  }, [betAmount, balance, minesCount])

  const revealCell = useCallback(
    (index: number) => {
      if (!gameActive || gameOver || revealed.has(index)) return

      const newRevealed = new Set(revealed)
      newRevealed.add(index)
      setRevealed(newRevealed)

      if (minePositions.has(index)) {
        const newGrid = [...grid]
        for (let i = 0; i < GRID_SIZE; i++) {
          if (minePositions.has(i)) newGrid[i] = "bomb"
          else if (newRevealed.has(i)) newGrid[i] = "gem"
        }
        newGrid[index] = "bomb"
        setGrid(newGrid)
        setGameOver(true)
        setGameActive(false)
        setHitBomb(index)
        setHistory((h) => [{ won: false, amount: -betAmount, gems: newRevealed.size - 1 }, ...h.slice(0, 19)])
      } else {
        const newGrid = [...grid]
        newGrid[index] = "gem"
        setGrid(newGrid)
        const gemsFound = newRevealed.size
        const mult = calculateMultiplier(gemsFound)
        setCurrentMultiplier(mult)

        if (gemsFound === GRID_SIZE - minesCount) {
          const payout = parseFloat((betAmount * mult).toFixed(2))
          setBalance((b) => parseFloat((b + payout).toFixed(2)))
          setGameActive(false)
          setGameOver(true)
          // Reveal all bombs
          const finalGrid = [...newGrid]
          for (let i = 0; i < GRID_SIZE; i++) {
            if (minePositions.has(i)) finalGrid[i] = "bomb"
          }
          setGrid(finalGrid)
          setHistory((h) => [{ won: true, amount: payout, gems: gemsFound }, ...h.slice(0, 19)])
        }
      }
    },
    [gameActive, gameOver, revealed, minePositions, grid, betAmount, calculateMultiplier, minesCount]
  )

  const cashOut = useCallback(() => {
    if (!gameActive || revealed.size === 0) return
    const payout = parseFloat((betAmount * currentMultiplier).toFixed(2))
    setBalance((b) => parseFloat((b + payout).toFixed(2)))
    setGameActive(false)
    setGameOver(true)

    const newGrid = [...grid]
    for (let i = 0; i < GRID_SIZE; i++) {
      if (minePositions.has(i)) newGrid[i] = "bomb"
    }
    setGrid(newGrid)
    setHistory((h) => [{ won: true, amount: payout, gems: revealed.size }, ...h.slice(0, 19)])
  }, [gameActive, revealed, betAmount, currentMultiplier, grid, minePositions])

  return (
    <GameLayout title="Mines" balance={balance}>
      <div className="flex flex-col gap-4">
        {/* Game Grid */}
        <div className="bg-card rounded-2xl border border-border/50 p-3 sm:p-5 relative overflow-hidden">
          {/* Background */}
          <div className="absolute inset-0 opacity-5" style={{ backgroundImage: "repeating-linear-gradient(45deg, #2ee06e 0, #2ee06e 1px, transparent 0, transparent 50%)", backgroundSize: "15px 15px" }} />

          <div className="grid grid-cols-5 gap-2 sm:gap-2.5 max-w-[420px] mx-auto relative z-10">
            {grid.map((cell, i) => (
              <button
                key={i}
                onClick={() => revealCell(i)}
                disabled={!gameActive || cell !== "hidden"}
                className={`aspect-square rounded-xl flex items-center justify-center transition-all duration-200 relative overflow-hidden ${
                  cell === "hidden"
                    ? gameActive
                      ? "bg-[#213743] hover:bg-[#2a4a5a] hover:scale-[1.03] cursor-pointer border border-[#2a3f4e] shadow-inner"
                      : "bg-[#1a2c38] border border-[#213743] cursor-default"
                    : cell === "gem"
                      ? "bg-[#2ee06e]/15 border-2 border-[#2ee06e]/40 scale-[0.97]"
                      : hitBomb === i
                        ? "bg-[#ff4757]/30 border-2 border-[#ff4757]/60 scale-[0.97] animate-pulse"
                        : "bg-[#ff4757]/10 border border-[#ff4757]/20 scale-[0.97]"
                }`}
              >
                {cell === "gem" && (
                  <Image 
                    src={GEM_ICON} 
                    alt="Gem" 
                    width={56} 
                    height={56} 
                    className="w-full h-full object-contain p-1.5 drop-shadow-lg" 
                  />
                )}
                {cell === "bomb" && (
                  <Image
                    src={BOMB_ICON}
                    alt="Bomb"
                    width={56}
                    height={56}
                    className="w-full h-full object-contain p-1.5 drop-shadow-lg"
                  />
                )}
                {cell === "hidden" && gameActive && (
                  <div className="w-3 h-3 rounded-sm bg-[#2a3f4e] rotate-45" />
                )}
                {cell === "hidden" && !gameActive && !gameOver && (
                  <div className="w-2.5 h-2.5 rounded-full bg-[#213743]" />
                )}
              </button>
            ))}
          </div>

          {/* Current multiplier */}
          {gameActive && revealed.size > 0 && (
            <div className="text-center mt-4 relative z-10">
              <div className="inline-block bg-[#0f1923]/80 backdrop-blur-sm rounded-xl px-5 py-3 border border-[#2ee06e]/30">
                <span className="text-3xl font-black text-[#2ee06e] animate-pulse">x{currentMultiplier}</span>
                <div className="text-sm text-muted-foreground mt-1">
                  Выигрыш: <span className="text-[#2ee06e] font-bold">{(betAmount * currentMultiplier).toFixed(2)} ₽</span>
                </div>
              </div>
            </div>
          )}

          {/* Game over result */}
          {gameOver && !gameActive && (
            <div className="text-center mt-4 relative z-10">
              <div className={`inline-block backdrop-blur-sm rounded-xl px-5 py-3 border ${
                hitBomb !== null 
                  ? "bg-[#ff4757]/20 border-[#ff4757]/30" 
                  : "bg-[#2ee06e]/20 border-[#2ee06e]/30"
              }`}>
                {hitBomb !== null ? (
                  <>
                    <span className="text-2xl font-black text-[#ff4757]">БОМБА!</span>
                    <div className="text-sm text-[#ff4757] mt-1">-{betAmount.toFixed(2)} ₽</div>
                  </>
                ) : (
                  <>
                    <span className="text-3xl font-black text-[#2ee06e]">x{currentMultiplier}</span>
                    <div className="text-sm text-[#2ee06e] mt-1">+{(betAmount * currentMultiplier - betAmount).toFixed(2)} ₽</div>
                  </>
                )}
              </div>
            </div>
          )}
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
                  disabled={gameActive}
                />
                <button
                  onClick={() => setBetAmount((b) => parseFloat((b / 2).toFixed(2)))}
                  className="px-2.5 py-2.5 text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-[#2a3f4e] transition-colors"
                  disabled={gameActive}
                >
                  /2
                </button>
                <button
                  onClick={() => setBetAmount((b) => Math.min(parseFloat((b * 2).toFixed(2)), balance))}
                  className="px-2.5 py-2.5 text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-[#2a3f4e] transition-colors"
                  disabled={gameActive}
                >
                  x2
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Мины: {minesCount}</label>
              <div className="flex items-center bg-secondary rounded-lg overflow-hidden gap-0.5 px-0.5">
                {[1, 3, 5, 10, 15].map((count) => (
                  <button
                    key={count}
                    onClick={() => setMinesCount(count)}
                    className={`flex-1 py-2.5 text-xs font-bold rounded transition-all ${
                      minesCount === count
                        ? "bg-[#ff4757] text-white shadow-md"
                        : "text-muted-foreground hover:text-foreground hover:bg-[#2a3f4e]"
                    }`}
                    disabled={gameActive}
                  >
                    {count}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Info row */}
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div className="bg-secondary rounded-lg px-3 py-2 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Камней</p>
              <p className="text-sm font-bold text-[#2ee06e]">{GRID_SIZE - minesCount}</p>
            </div>
            <div className="bg-secondary rounded-lg px-3 py-2 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Найдено</p>
              <p className="text-sm font-bold text-foreground">{revealed.size}</p>
            </div>
          </div>

          {!gameActive ? (
            <button
              onClick={startGame}
              disabled={betAmount <= 0 || betAmount > balance}
              className="w-full mt-4 bg-[#2ee06e] hover:bg-[#25c45c] disabled:bg-secondary disabled:text-muted-foreground text-[#0f1923] font-bold text-lg py-3.5 rounded-xl transition-all glow-green"
            >
              Играть
            </button>
          ) : (
            <button
              onClick={cashOut}
              disabled={revealed.size === 0}
              className="w-full mt-4 bg-[#ffd93d] hover:bg-[#f5cc1b] disabled:bg-secondary disabled:text-muted-foreground text-[#0f1923] font-bold text-lg py-3.5 rounded-xl transition-all"
            >
              Забрать {(betAmount * currentMultiplier).toFixed(2)} ₽
            </button>
          )}
        </div>

        {/* History */}
        {history.length > 0 && (
          <div className="bg-card rounded-2xl border border-border/50 p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">История</h3>
            <div className="flex flex-col gap-2">
              {history.slice(0, 10).map((h, i) => (
                <div
                  key={i}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm ${
                    h.won
                      ? "bg-[#2ee06e]/10 text-[#2ee06e] border border-[#2ee06e]/10"
                      : "bg-[#ff4757]/10 text-[#ff4757] border border-[#ff4757]/10"
                  }`}
                >
                  <span>{h.gems} камней</span>
                  <span className="font-bold">
                    {h.won ? "+" : ""}{h.amount.toFixed(2)} ₽
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </GameLayout>
  )
}
