"use client"

import { useState, useCallback, useEffect } from "react"
import GameLayout from "@/components/game-layout"

type CardSuit = "hearts" | "diamonds" | "clubs" | "spades"
type CardValue = "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K" | "A"

interface Card {
  suit: CardSuit
  value: CardValue
  hidden?: boolean
}

const SUITS: CardSuit[] = ["hearts", "diamonds", "clubs", "spades"]
const VALUES: CardValue[] = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"]

const suitSymbols: Record<CardSuit, string> = {
  hearts: "\u2665",
  diamonds: "\u2666",
  clubs: "\u2663",
  spades: "\u2660",
}

const suitColors: Record<CardSuit, string> = {
  hearts: "#e53935",
  diamonds: "#e53935",
  clubs: "#1a1a1a",
  spades: "#1a1a1a",
}

function createDeck(): Card[] {
  const deck: Card[] = []
  for (const suit of SUITS) {
    for (const value of VALUES) {
      deck.push({ suit, value })
    }
  }
  // Shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[deck[i], deck[j]] = [deck[j], deck[i]]
  }
  return deck
}

function getCardValue(card: Card): number[] {
  if (["J", "Q", "K"].includes(card.value)) return [10]
  if (card.value === "A") return [1, 11]
  return [parseInt(card.value)]
}

function getHandValue(cards: Card[]): number {
  const visibleCards = cards.filter((c) => !c.hidden)
  let total = 0
  let aces = 0

  for (const card of visibleCards) {
    const vals = getCardValue(card)
    if (vals.length === 2) {
      total += 11
      aces++
    } else {
      total += vals[0]
    }
  }

  while (total > 21 && aces > 0) {
    total -= 10
    aces--
  }
  return total
}

// Get pip positions for each card value
function getPipPositions(value: CardValue): { x: number; y: number; rotate?: boolean }[] {
  const positions: Record<string, { x: number; y: number; rotate?: boolean }[]> = {
    "A": [{ x: 50, y: 50 }],
    "2": [{ x: 50, y: 25 }, { x: 50, y: 75, rotate: true }],
    "3": [{ x: 50, y: 20 }, { x: 50, y: 50 }, { x: 50, y: 80, rotate: true }],
    "4": [{ x: 35, y: 25 }, { x: 65, y: 25 }, { x: 35, y: 75, rotate: true }, { x: 65, y: 75, rotate: true }],
    "5": [{ x: 35, y: 25 }, { x: 65, y: 25 }, { x: 50, y: 50 }, { x: 35, y: 75, rotate: true }, { x: 65, y: 75, rotate: true }],
    "6": [{ x: 35, y: 25 }, { x: 65, y: 25 }, { x: 35, y: 50 }, { x: 65, y: 50 }, { x: 35, y: 75, rotate: true }, { x: 65, y: 75, rotate: true }],
    "7": [{ x: 35, y: 22 }, { x: 65, y: 22 }, { x: 50, y: 36 }, { x: 35, y: 50 }, { x: 65, y: 50 }, { x: 35, y: 78, rotate: true }, { x: 65, y: 78, rotate: true }],
    "8": [{ x: 35, y: 20 }, { x: 65, y: 20 }, { x: 50, y: 35 }, { x: 35, y: 50 }, { x: 65, y: 50 }, { x: 50, y: 65, rotate: true }, { x: 35, y: 80, rotate: true }, { x: 65, y: 80, rotate: true }],
    "9": [{ x: 35, y: 18 }, { x: 65, y: 18 }, { x: 35, y: 36 }, { x: 65, y: 36 }, { x: 50, y: 50 }, { x: 35, y: 64, rotate: true }, { x: 65, y: 64, rotate: true }, { x: 35, y: 82, rotate: true }, { x: 65, y: 82, rotate: true }],
    "10": [{ x: 35, y: 16 }, { x: 65, y: 16 }, { x: 50, y: 28 }, { x: 35, y: 36 }, { x: 65, y: 36 }, { x: 35, y: 64, rotate: true }, { x: 65, y: 64, rotate: true }, { x: 50, y: 72, rotate: true }, { x: 35, y: 84, rotate: true }, { x: 65, y: 84, rotate: true }],
  }
  return positions[value] || []
}

function CardComponent({ card, animDelay = 0, isNew = false }: { card: Card; animDelay?: number; isNew?: boolean }) {
  if (card.hidden) {
    // Card back - classic blue ornate design like Bicycle cards
    return (
      <div
        className={`w-16 h-24 sm:w-20 sm:h-28 rounded-xl relative overflow-hidden shadow-lg ${isNew ? "animate-deal" : ""}`}
        style={{
          animationDelay: `${animDelay}ms`,
          background: "#1a365d",
          border: "3px solid white",
          boxShadow: "0 4px 15px rgba(0,0,0,0.3)",
        }}
      >
        {/* Card back pattern - diamond/checkered ornate pattern */}
        <div className="absolute inset-2 rounded-lg overflow-hidden" style={{ border: "2px solid #2a4a7d" }}>
          <div 
            className="w-full h-full relative"
            style={{
              background: `
                repeating-linear-gradient(
                  45deg,
                  #1a365d 0px,
                  #1a365d 3px,
                  #234578 3px,
                  #234578 6px
                )
              `,
            }}
          >
            {/* Center ornament */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-10 h-12 rounded-full border-2 border-white/20 flex items-center justify-center bg-[#1a365d]">
                <div className="w-6 h-8 border border-white/30 rounded flex items-center justify-center">
                  <span className="text-white/40 text-[8px] font-serif">PLAID</span>
                </div>
              </div>
            </div>
            {/* Corner decorations */}
            <div className="absolute top-1 left-1 w-2 h-2 border-t border-l border-white/20" />
            <div className="absolute top-1 right-1 w-2 h-2 border-t border-r border-white/20" />
            <div className="absolute bottom-1 left-1 w-2 h-2 border-b border-l border-white/20" />
            <div className="absolute bottom-1 right-1 w-2 h-2 border-b border-r border-white/20" />
          </div>
        </div>
      </div>
    )
  }

  const color = suitColors[card.suit]
  const symbol = suitSymbols[card.suit]
  const isFaceCard = ["J", "Q", "K"].includes(card.value)
  const isAce = card.value === "A"

  return (
    <div
      className={`w-16 h-24 sm:w-20 sm:h-28 rounded-xl relative overflow-hidden select-none ${isNew ? "animate-deal" : ""}`}
      style={{ 
        animationDelay: `${animDelay}ms`,
        background: "#ffffff",
        border: "1px solid #c0c0c0",
        boxShadow: "0 4px 15px rgba(0,0,0,0.2)",
      }}
    >
      {/* Card shine effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-transparent pointer-events-none" />
      
      {/* Top left corner */}
      <div className="absolute top-1 left-1.5 flex flex-col items-center">
        <span className="text-sm sm:text-base font-bold leading-none" style={{ color }}>{card.value}</span>
        <span className="text-sm sm:text-base leading-none mt-0.5" style={{ color }}>{symbol}</span>
      </div>

      {/* Center content */}
      <div className="absolute inset-0 flex items-center justify-center">
        {isFaceCard ? (
          // Face card - stylized letter with decorative border
          <div className="relative">
            <div 
              className="w-10 h-14 sm:w-12 sm:h-16 rounded border-2 flex items-center justify-center"
              style={{ 
                borderColor: color,
                background: `linear-gradient(135deg, ${color}10 0%, ${color}05 100%)`,
              }}
            >
              <span className="text-2xl sm:text-3xl font-serif font-bold" style={{ color }}>{card.value}</span>
            </div>
            {/* Small suit symbols in corners of face card box */}
            <span className="absolute -top-1 -left-1 text-[8px]" style={{ color }}>{symbol}</span>
            <span className="absolute -top-1 -right-1 text-[8px]" style={{ color }}>{symbol}</span>
            <span className="absolute -bottom-1 -left-1 text-[8px] rotate-180" style={{ color }}>{symbol}</span>
            <span className="absolute -bottom-1 -right-1 text-[8px] rotate-180" style={{ color }}>{symbol}</span>
          </div>
        ) : isAce ? (
          // Ace - large center suit symbol
          <span className="text-4xl sm:text-5xl" style={{ color }}>{symbol}</span>
        ) : (
          // Number cards - proper pip layout
          <div className="relative w-full h-full px-3 py-6 sm:px-4 sm:py-8">
            {getPipPositions(card.value).map((pos, i) => (
              <span
                key={i}
                className="absolute text-base sm:text-lg"
                style={{ 
                  color,
                  left: `${pos.x}%`,
                  top: `${pos.y}%`,
                  transform: `translate(-50%, -50%) ${pos.rotate ? 'rotate(180deg)' : ''}`,
                }}
              >
                {symbol}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Bottom right corner (rotated) */}
      <div className="absolute bottom-1 right-1.5 flex flex-col items-center rotate-180">
        <span className="text-sm sm:text-base font-bold leading-none" style={{ color }}>{card.value}</span>
        <span className="text-sm sm:text-base leading-none mt-0.5" style={{ color }}>{symbol}</span>
      </div>
    </div>
  )
}

export default function BlackJackPage() {
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
  const [originalBet, setOriginalBet] = useState(10) // Track original bet for multiplier display
  const [deck, setDeck] = useState<Card[]>([])
  const [playerHand, setPlayerHand] = useState<Card[]>([])
  const [dealerHand, setDealerHand] = useState<Card[]>([])
  const [gameState, setGameState] = useState<"betting" | "playing" | "dealerTurn" | "finished">("betting")
  const [message, setMessage] = useState("")
  const [winAmount, setWinAmount] = useState(0)
  const [history, setHistory] = useState<{ won: boolean; amount: number; playerScore: number; dealerScore: number }[]>([])

  const drawCard = useCallback(
    (currentDeck: Card[]): [Card, Card[]] => {
      const newDeck = [...currentDeck]
      const card = newDeck.pop()!
      return [card, newDeck]
    },
    []
  )

  const deal = useCallback(() => {
    if (betAmount <= 0 || betAmount > balance) return

    const newDeck = createDeck()
    const [p1, d1] = [newDeck.pop()!, newDeck.pop()!]
    const [p2, d2] = [newDeck.pop()!, newDeck.pop()!]
    d2.hidden = true

    const pHand = [p1, p2]
    const dHand = [d1, d2]

    setDeck(newDeck)
    setPlayerHand(pHand)
    setDealerHand(dHand)
    setOriginalBet(betAmount) // Save original bet
    setBalance((b) => parseFloat((b - betAmount).toFixed(2)))
    setGameState("playing")
    setMessage("")
    setWinAmount(0)

    // Check for blackjack
    if (getHandValue(pHand) === 21) {
      d2.hidden = false
      const dealerVal = getHandValue(dHand)
      if (dealerVal === 21) {
        setMessage("Ничья! Оба блэкджека")
        setBalance((b) => parseFloat((b + betAmount).toFixed(2)))
        setHistory((h) => [{ won: false, amount: 0, playerScore: 21, dealerScore: 21 }, ...h.slice(0, 19)])
      } else {
        const payout = betAmount * 2.5
        setWinAmount(payout)
        setMessage("Блэкджек! Вы выиграли!")
        setBalance((b) => parseFloat((b + payout).toFixed(2)))
        setHistory((h) => [{ won: true, amount: payout, playerScore: 21, dealerScore: dealerVal }, ...h.slice(0, 19)])
      }
      setGameState("finished")
    }
  }, [betAmount, balance])

  const hit = useCallback(() => {
    if (gameState !== "playing") return
    const [card, newDeck] = drawCard(deck)
    const newHand = [...playerHand, card]
    setPlayerHand(newHand)
    setDeck(newDeck)

    const val = getHandValue(newHand)
    if (val > 21) {
      // Bust - reveal dealer card
      const revealedDealer = dealerHand.map((c) => ({ ...c, hidden: false }))
      setDealerHand(revealedDealer)
      setMessage("Перебор! Вы проиграли")
      setGameState("finished")
      setHistory((h) => [{ won: false, amount: -betAmount, playerScore: val, dealerScore: getHandValue(revealedDealer) }, ...h.slice(0, 19)])
    } else if (val === 21) {
      stand(newHand, newDeck)
    }
  }, [gameState, deck, playerHand, dealerHand, betAmount])

  const stand = useCallback(
    (currentPlayerHand?: Card[], currentDeck?: Card[]) => {
      const pHand = currentPlayerHand || playerHand
      const dDeck = currentDeck || deck
      const currentBet = betAmount // Capture current bet amount

      // Reveal dealer's hidden card
      let dHand = dealerHand.map((c) => ({ ...c, hidden: false }))
      let dDeckCopy = [...dDeck]

      // Dealer draws until 17+
      while (getHandValue(dHand) < 17) {
        const card = dDeckCopy.pop()!
        dHand = [...dHand, card]
      }

      setDealerHand(dHand)
      setDeck(dDeckCopy)

      const playerVal = getHandValue(pHand)
      const dealerVal = getHandValue(dHand)

      let msg = ""
      let payout = 0

      if (dealerVal > 21) {
        msg = "Дилер перебрал! Вы выиграли!"
        payout = currentBet * 2
      } else if (playerVal > dealerVal) {
        msg = "Вы выиграли!"
        payout = currentBet * 2
      } else if (playerVal === dealerVal) {
        msg = "Ничья!"
        payout = currentBet
      } else {
        msg = "Дилер выиграл!"
        payout = 0
      }

      setMessage(msg)
      setWinAmount(payout)
      if (payout > 0) {
        setBalance((b) => parseFloat((b + payout).toFixed(2)))
      }
      setGameState("finished")
      setHistory((h) => [
        { won: payout > currentBet, amount: payout > 0 ? payout - currentBet : -currentBet, playerScore: playerVal, dealerScore: dealerVal },
        ...h.slice(0, 19),
      ])
    },
    [playerHand, deck, dealerHand, betAmount]
  )

  const doubleDown = useCallback(() => {
    if (gameState !== "playing" || betAmount > balance) return
    const doubleBet = betAmount * 2
    setBalance((b) => parseFloat((b - betAmount).toFixed(2)))
    setBetAmount(doubleBet)
    setOriginalBet(doubleBet) // Update originalBet for correct multiplier display

    const [card, newDeck] = drawCard(deck)
    const newHand = [...playerHand, card]
    setPlayerHand(newHand)
    setDeck(newDeck)

    const val = getHandValue(newHand)
    if (val > 21) {
      const revealedDealer = dealerHand.map((c) => ({ ...c, hidden: false }))
      setDealerHand(revealedDealer)
      setMessage("Перебор! Вы проиграли")
      setGameState("finished")
      setHistory((h) => [{ won: false, amount: -doubleBet, playerScore: val, dealerScore: getHandValue(revealedDealer) }, ...h.slice(0, 19)])
    } else {
      stand(newHand, newDeck)
    }
  }, [gameState, betAmount, balance, deck, playerHand, dealerHand, stand, drawCard])

  return (
    <GameLayout title="BlackJack" balance={balance}>
      <div className="flex flex-col gap-4">
        {/* Casino Table */}
        <div 
          className="rounded-2xl relative overflow-hidden min-h-[420px] flex flex-col justify-between"
          style={{
            background: `
              radial-gradient(ellipse at 50% 0%, #1a5c2e 0%, #0d3d1a 50%, #082912 100%)
            `,
            border: "6px solid #8b5a2b",
            boxShadow: "inset 0 0 60px rgba(0,0,0,0.4), 0 4px 20px rgba(0,0,0,0.5)",
          }}
        >
          {/* Table edge decoration */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-b from-[#2a7d3d] to-transparent opacity-30" />
            <div className="absolute bottom-0 left-0 right-0 h-2 bg-gradient-to-t from-[#052208] to-transparent opacity-50" />
          </div>

          {/* Felt texture */}
          <div 
            className="absolute inset-0 opacity-20" 
            style={{ 
              backgroundImage: `radial-gradient(circle at 1px 1px, rgba(0,0,0,0.15) 1px, transparent 0)`,
              backgroundSize: "16px 16px",
            }} 
          />

          {/* Table marking arc */}
          <div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] h-[70%] rounded-full border-2 border-[#ffd700]/20 pointer-events-none"
            style={{
              borderStyle: "dashed",
            }}
          />

          {/* Dealer Section */}
          <div className="relative z-10 p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="bg-[#0a1f0d]/60 backdrop-blur-sm px-3 py-1 rounded-lg border border-[#2ee06e]/20">
                <span className="text-sm font-semibold text-[#ffd700]">Дилер</span>
                {dealerHand.length > 0 && (
                  <span className="ml-2 text-sm font-bold text-white">
                    {getHandValue(dealerHand)}
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-2 flex-wrap justify-center">
              {dealerHand.map((card, i) => (
                <CardComponent key={i} card={card} animDelay={i * 150} isNew={gameState === "playing" && i >= dealerHand.length - 1} />
              ))}
              {dealerHand.length === 0 && (
                <div className="w-16 h-24 sm:w-20 sm:h-28 rounded-xl border-2 border-dashed border-white/20 flex items-center justify-center">
                  <span className="text-white/30 text-xs">Карты</span>
                </div>
              )}
            </div>
          </div>

          {/* Message with x2 multiplier display */}
          {message && (
            <div className="relative z-10 text-center py-4">
              <div className={`inline-block px-6 py-3 rounded-xl font-bold text-lg backdrop-blur-sm ${
                winAmount > 0 && winAmount > originalBet
                  ? "bg-[#2ee06e]/30 text-[#2ee06e] border border-[#2ee06e]/60"
                  : winAmount > 0 && winAmount === originalBet
                    ? "bg-[#ffd93d]/30 text-[#ffd93d] border border-[#ffd93d]/60"
                    : "bg-[#ff4757]/30 text-[#ff4757] border border-[#ff4757]/60"
              }`}>
                {/* Win multiplier display - show only when actually won */}
                {winAmount > originalBet && (
                  <div className="text-3xl font-black mb-1 animate-pulse">
                    x{(winAmount / originalBet).toFixed(1)}
                  </div>
                )}
                {message}
                {winAmount > originalBet && (
                  <div className="text-sm mt-1 font-semibold">+{(winAmount - originalBet).toFixed(2)} ₽</div>
                )}
                {winAmount === originalBet && winAmount > 0 && (
                  <div className="text-sm mt-1 font-semibold">Ставка возвращена</div>
                )}
                {winAmount === 0 && gameState === "finished" && (
                  <div className="text-sm mt-1 font-semibold">-{originalBet.toFixed(2)} ₽</div>
                )}
              </div>
            </div>
          )}

          {/* BLACKJACK PAYS 3:2 text */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
            {!message && gameState !== "playing" && (
              <div className="text-center opacity-30">
                <p className="text-[#ffd700] text-lg font-serif tracking-widest">BLACKJACK</p>
                <p className="text-white/60 text-xs tracking-wider">PAYS 3 TO 2</p>
              </div>
            )}
          </div>

          {/* Player Section */}
          <div className="relative z-10 p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-3 justify-center">
              <div className="bg-[#0a1f0d]/60 backdrop-blur-sm px-3 py-1 rounded-lg border border-[#2ee06e]/40">
                <span className="text-sm font-semibold text-white">Вы</span>
                {playerHand.length > 0 && (
                  <span className={`ml-2 text-sm font-bold ${getHandValue(playerHand) === 21 ? "text-[#ffd700]" : "text-[#2ee06e]"}`}>
                    {getHandValue(playerHand)}
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-2 flex-wrap justify-center">
              {playerHand.map((card, i) => (
                <CardComponent key={i} card={card} animDelay={i * 150} isNew={i === playerHand.length - 1 && gameState === "playing"} />
              ))}
              {playerHand.length === 0 && (
                <div className="w-16 h-24 sm:w-20 sm:h-28 rounded-xl border-2 border-dashed border-white/20 flex items-center justify-center">
                  <span className="text-white/30 text-xs">Карты</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-card rounded-xl border border-border/50 p-4">
          {gameState === "betting" || gameState === "finished" ? (
            <>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Ставка</label>
                <div className="flex items-center bg-secondary rounded-lg overflow-hidden">
                  <input
                    type="number"
                    value={betAmount}
                    onChange={(e) => setBetAmount(Math.max(1, parseFloat(e.target.value) || 0))}
                    className="flex-1 bg-transparent text-sm font-medium text-foreground px-3 py-2.5 outline-none min-w-0"
                  />
                  <button
                    onClick={() => setBetAmount((b) => Math.max(1, parseFloat((b / 2).toFixed(2))))}
                    className="px-2 py-2.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
                  >
                    /2
                  </button>
                  <button
                    onClick={() => setBetAmount((b) => Math.min(parseFloat((b * 2).toFixed(2)), balance))}
                    className="px-2 py-2.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
                  >
                    x2
                  </button>
                </div>
              </div>
              <button
                onClick={deal}
                disabled={betAmount <= 0 || betAmount > balance}
                className="w-full mt-4 bg-[#2ee06e] hover:bg-[#25c45c] disabled:bg-secondary disabled:text-muted-foreground text-[#0f1923] font-bold text-base py-3 rounded-xl transition-all glow-green"
              >
                Раздать
              </button>
            </>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={hit}
                className="bg-[#2ee06e] hover:bg-[#25c45c] text-[#0f1923] font-bold text-sm py-3 rounded-xl transition-all"
              >
                Ещё
              </button>
              <button
                onClick={() => stand()}
                className="bg-[#ff4757] hover:bg-[#ee3a4a] text-white font-bold text-sm py-3 rounded-xl transition-all"
              >
                Стоп
              </button>
              <button
                onClick={doubleDown}
                disabled={betAmount > balance}
                className="bg-[#ffd93d] hover:bg-[#f5cc1b] disabled:bg-secondary disabled:text-muted-foreground text-[#0f1923] font-bold text-sm py-3 rounded-xl transition-all"
              >
                x2
              </button>
            </div>
          )}
        </div>

        {/* History */}
        {history.length > 0 && (
          <div className="bg-card rounded-xl border border-border/50 p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">История</h3>
            <div className="flex flex-col gap-2">
              {history.slice(0, 10).map((h, i) => (
                <div
                  key={i}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm ${
                    h.won ? "bg-[#2ee06e]/10 text-[#2ee06e]" : h.amount === 0 ? "bg-[#ffd93d]/10 text-[#ffd93d]" : "bg-destructive/10 text-destructive"
                  }`}
                >
                  <span>Вы: {h.playerScore} | Дилер: {h.dealerScore}</span>
                  <span className="font-bold">
                    {h.amount > 0 ? "+" : ""}{h.amount.toFixed(2)} ₽
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Animation styles */}
      <style jsx>{`
        @keyframes deal {
          from {
            opacity: 0;
            transform: translateY(-30px) rotateY(90deg);
          }
          to {
            opacity: 1;
            transform: translateY(0) rotateY(0deg);
          }
        }
        
        :global(.animate-deal) {
          animation: deal 0.4s ease-out forwards;
        }
      `}</style>
    </GameLayout>
  )
}
