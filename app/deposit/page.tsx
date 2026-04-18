"use client"

import { useState, useEffect } from "react"
import Header from "@/components/header"
import Footer from "@/components/footer"
import { ArrowLeft, Copy, Check, ExternalLink, Shield, Zap, RefreshCw } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

const SBP_LOGO = "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/sbp-logo-AFrVCisQm4LhFX1AXWwZreggQxYE4r.png"
const TONKEEPER_LOGO = "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/images-FmFBTj8ziuH7dcDyZCXh1sQ88mMaJ6.png"

// TON Wallet for direct payments
const CASINO_TON_WALLET = process.env.NEXT_PUBLIC_CASINO_TON_WALLET || "EQxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

interface TelegramWebApp {
  initData: string
  initDataUnsafe: {
    user?: {
      id: number
      first_name: string
      username?: string
    }
  }
}

declare global {
  interface Window {
    Telegram?: {
      WebApp?: TelegramWebApp
    }
  }
}

export default function DepositPage() {
  const [amount, setAmount] = useState(500)
  const [method, setMethod] = useState<"sbp" | "ton">("sbp")
  const [promoCode, setPromoCode] = useState("")
  const [promoApplied, setPromoApplied] = useState(false)
  const [promoBonus, setPromoBonus] = useState(0)
  const [showPaymentDetails, setShowPaymentDetails] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "pending" | "success" | "error">("idle")
  const [telegramId, setTelegramId] = useState<string | null>(null)
  const [currentPaymentId, setCurrentPaymentId] = useState<string | null>(null)
  
  // Real-time TON rate
  const [tonRate, setTonRate] = useState(250)
  const [rateLoading, setRateLoading] = useState(false)
  const [lastRateUpdate, setLastRateUpdate] = useState<Date | null>(null)
  
  const tonAmount = (amount / tonRate).toFixed(4)

  const presets = [100, 250, 500, 1000, 2500, 5000]

  // Fetch TON rate from our cached API endpoint with fallback
  const fetchTonRate = async () => {
    setRateLoading(true)
    try {
      // First try our internal API (has caching and fallback)
      const response = await fetch("/api/crypto/rates?currency=TON")
      const data = await response.json()
      
      if (data.rate && data.rate > 0) {
        setTonRate(data.rate)
        setLastRateUpdate(new Date())
      } else {
        // Fallback to direct CoinGecko API
        const cgResponse = await fetch(
          "https://api.coingecko.com/api/v3/simple/price?ids=the-open-network&vs_currencies=rub"
        )
        const cgData = await cgResponse.json()
        if (cgData["the-open-network"]?.rub) {
          setTonRate(cgData["the-open-network"].rub)
          setLastRateUpdate(new Date())
        }
      }
    } catch (error) {
      console.error("Failed to fetch TON rate:", error)
      // Keep previous rate on error, or use reasonable fallback
      if (tonRate === 250) {
        // Default wasn't updated, try to get a reasonable rate
        setTonRate(280) // Approximate fallback
      }
    }
    setRateLoading(false)
  }

  // Fetch rate on mount and every 60 seconds
  useEffect(() => {
    fetchTonRate()
    const interval = setInterval(fetchTonRate, 60000)
    return () => clearInterval(interval)
  }, [])
  
  // Get Telegram user ID on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Check Telegram WebApp
      if (window.Telegram?.WebApp?.initDataUnsafe?.user?.id) {
        setTelegramId(String(window.Telegram.WebApp.initDataUnsafe.user.id))
      } else {
        // Fallback to localStorage
        const savedId = localStorage.getItem("telegram_user_id")
        if (savedId) {
          setTelegramId(savedId)
        }
      }
    }
  }, [])

  const applyPromo = () => {
    if (promoCode.toUpperCase() === "BONUS50") {
      setPromoBonus(50)
      setPromoApplied(true)
    } else if (promoCode.toUpperCase() === "START100") {
      setPromoBonus(100)
      setPromoApplied(true)
    } else if (promoCode.toUpperCase() === "WELCOME") {
      setPromoBonus(Math.floor(amount * 0.1)) // 10% bonus
      setPromoApplied(true)
    }
  }

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text)
    setCopied(type)
    setTimeout(() => setCopied(null), 2000)
  }

  // PLAIDEX Payment via SBP
  const handleSBPPayment = async () => {
    if (!telegramId) {
      setPaymentStatus("error")
      alert("Пожалуйста, откройте приложение через Telegram для оплаты")
      return
    }
    
    setIsProcessing(true)
    setPaymentStatus("pending")
    
    try {
      const response = await fetch("/api/payments/plaidex", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          currency: "RUB",
          description: `Пополнение баланса ${amount} руб.`,
          method: "sbp",
          telegramId,
        })
      })
      
      const data = await response.json()
      
      if (data.success && data.paymentUrl) {
        // Open PLAIDEX payment page
        window.open(data.paymentUrl, "_blank")
        setShowPaymentDetails(true)
      } else if (data.qrCode || data.paymentDetails) {
        // Show payment details
        setShowPaymentDetails(true)
      } else {
        setPaymentStatus("error")
      }
    } catch (error) {
      console.error("Payment error:", error)
      setPaymentStatus("error")
    }
    
    setIsProcessing(false)
  }

  // TON Payment via Tonkeeper
  const handleTonPayment = async () => {
    if (!telegramId) {
      alert("Пожалуйста, откройте приложение через Telegram для оплаты")
      return
    }
    
    setIsProcessing(true)
    
    try {
      // Create payment record in database
      const response = await fetch("/api/ton/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telegramId,
          tonAmount: parseFloat(tonAmount),
          rubAmount: amount,
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        setCurrentPaymentId(data.paymentId)
        
        // Open Tonkeeper with payment details
        window.open(data.tonkeeperLink, "_blank")
        setShowPaymentDetails(true)
        setPaymentStatus("pending")
      } else {
        alert(data.error || "Ошибка создания платежа")
      }
    } catch (error) {
      console.error("TON payment error:", error)
      alert("Ошибка при создании платежа")
    }
    
    setIsProcessing(false)
  }

  const handlePayment = () => {
    if (method === "sbp") {
      handleSBPPayment()
    } else {
      handleTonPayment()
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-4 flex flex-col gap-4">
        {/* Back */}
        <Link href="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Назад
        </Link>

        <h1 className="text-xl font-bold text-foreground">Пополнение баланса</h1>

        {/* Payment Method */}
        <div className="bg-card rounded-xl border border-border/50 p-4">
          <p className="text-sm font-medium text-foreground mb-3">Способ оплаты</p>
          <div className="grid grid-cols-2 gap-3">
            {/* SBP via PLAIDEX */}
            <button
              onClick={() => { setMethod("sbp"); setShowPaymentDetails(false) }}
              className={`relative overflow-hidden rounded-xl border-2 transition-all h-24 ${
                method === "sbp"
                  ? "border-[#2ee06e] shadow-lg shadow-[#2ee06e]/20"
                  : "border-border hover:border-border/80"
              }`}
            >
              <Image
                src={SBP_LOGO}
                alt="СБП"
                fill
                className="object-contain p-3 bg-white"
              />
              {method === "sbp" && (
                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#2ee06e] flex items-center justify-center">
                  <Check className="w-3 h-3 text-[#0f1923]" />
                </div>
              )}
            </button>

            {/* Tonkeeper */}
            <button
              onClick={() => { setMethod("ton"); setShowPaymentDetails(false) }}
              className={`relative overflow-hidden rounded-xl border-2 transition-all h-24 ${
                method === "ton"
                  ? "border-[#00b4d8] shadow-lg shadow-[#00b4d8]/20"
                  : "border-border hover:border-border/80"
              }`}
            >
              <Image
                src={TONKEEPER_LOGO}
                alt="Tonkeeper"
                fill
                className="object-cover"
              />
              {method === "ton" && (
                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#00b4d8] flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
            </button>
          </div>
          
          {/* Method description */}
          <div className="mt-3 p-3 bg-secondary rounded-lg">
            {method === "sbp" ? (
              <div className="flex items-start gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#2ee06e]/20 flex items-center justify-center flex-shrink-0">
                  <Zap className="w-4 h-4 text-[#2ee06e]" />
                </div>
                <div>
                  <p className="text-xs font-medium text-foreground">Система быстрых платежей (СБП)</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Мгновенное зачисление через PLAIDEX. Все банки РФ. Комиссия 0%</p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#00b4d8]/20 flex items-center justify-center flex-shrink-0">
                  <Shield className="w-4 h-4 text-[#00b4d8]" />
                </div>
                <div>
                  <p className="text-xs font-medium text-foreground">Tonkeeper Wallet (TON)</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Криптовалюта TON. Курс обновляется автоматически
                  </p>
                </div>
              </div>
            )}
          </div>
          
          {/* TON Rate Display */}
          {method === "ton" && (
            <div className="mt-3 p-3 bg-[#00b4d8]/10 rounded-lg border border-[#00b4d8]/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Текущий курс TON</p>
                  <p className="text-lg font-bold text-[#00b4d8]">1 TON = {tonRate.toFixed(2)} ₽</p>
                </div>
                <button
                  onClick={fetchTonRate}
                  disabled={rateLoading}
                  className="p-2 rounded-lg bg-[#00b4d8]/20 hover:bg-[#00b4d8]/30 transition-colors"
                >
                  <RefreshCw className={`w-4 h-4 text-[#00b4d8] ${rateLoading ? "animate-spin" : ""}`} />
                </button>
              </div>
              {lastRateUpdate && (
                <p className="text-[10px] text-muted-foreground mt-1">
                  Обновлено: {lastRateUpdate.toLocaleTimeString()}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Amount */}
        <div className="bg-card rounded-xl border border-border/50 p-4">
          <p className="text-sm font-medium text-foreground mb-3">Сумма</p>
          <div className="flex items-center bg-secondary rounded-lg overflow-hidden mb-3">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(Math.max(100, parseFloat(e.target.value) || 0))}
              className="flex-1 bg-transparent text-lg font-bold text-foreground px-4 py-3 outline-none min-w-0"
            />
            <span className="px-3 text-sm text-muted-foreground font-medium">₽</span>
          </div>
          {method === "ton" && (
            <p className="text-sm text-[#00b4d8] mb-3 text-center font-semibold">
              = {tonAmount} TON
            </p>
          )}
          <div className="grid grid-cols-3 gap-2">
            {presets.map((p) => (
              <button
                key={p}
                onClick={() => setAmount(p)}
                className={`py-2 rounded-lg text-sm font-semibold transition-colors ${
                  amount === p
                    ? "bg-[#2ee06e] text-[#0f1923]"
                    : "bg-secondary text-foreground hover:bg-secondary/80"
                }`}
              >
                {p} ₽
              </button>
            ))}
          </div>
        </div>

        {/* Payment Details (TON) */}
        {showPaymentDetails && method === "ton" && (
          <div className="bg-card rounded-xl border border-[#00b4d8]/30 p-4">
            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground text-center">Отправьте TON на кошелек</p>
              
              <div className="bg-secondary rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-1">Адрес кошелька</p>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-foreground break-all flex-1">{CASINO_TON_WALLET}</span>
                  <button
                    onClick={() => copyToClipboard(CASINO_TON_WALLET, "wallet")}
                    className="p-2 rounded bg-background hover:bg-border transition-colors flex-shrink-0"
                  >
                    {copied === "wallet" ? <Check className="w-4 h-4 text-[#2ee06e]" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
                  </button>
                </div>
              </div>

              <div className="bg-secondary rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-1">Сумма к отправке</p>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#00b4d8] text-xl">{tonAmount} TON</span>
                  <button
                    onClick={() => copyToClipboard(tonAmount, "amount")}
                    className="p-2 rounded bg-background hover:bg-border transition-colors"
                  >
                    {copied === "amount" ? <Check className="w-4 h-4 text-[#2ee06e]" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
                  </button>
                </div>
                <span className="text-muted-foreground text-xs">({amount} ₽ по курсу {tonRate.toFixed(2)} ₽/TON)</span>
              </div>

              <a
                href={`https://app.tonkeeper.com/transfer/${CASINO_TON_WALLET}?amount=${Math.floor(parseFloat(tonAmount) * 1e9)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full bg-[#00b4d8] hover:bg-[#0097b2] text-white font-bold py-3 rounded-xl transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Открыть в Tonkeeper
              </a>

              <p className="text-[10px] text-muted-foreground text-center">
                После подтверждения транзакции в блокчейне, средства зачислятся автоматически (1-3 минуты)
              </p>
            </div>
          </div>
        )}
        
        {/* Payment Details (SBP) - PLAIDEX redirects to their page */}
        {showPaymentDetails && method === "sbp" && (
          <div className="bg-card rounded-xl border border-[#2ee06e]/30 p-4">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-[#2ee06e]/20 flex items-center justify-center mx-auto">
                <Zap className="w-8 h-8 text-[#2ee06e]" />
              </div>
              <p className="text-sm font-medium text-foreground">Переход к оплате через СБП</p>
              <p className="text-xs text-muted-foreground">
                Вы будете перенаправлены на страницу оплаты PLAIDEX. 
                После оплаты средства зачислятся автоматически.
              </p>
              <div className="bg-secondary rounded-lg p-3">
                <p className="text-xs text-muted-foreground">Сумма к оплате</p>
                <p className="text-2xl font-bold text-[#2ee06e]">{amount} ₽</p>
              </div>
              {paymentStatus === "pending" && (
                <div className="flex items-center justify-center gap-2 text-[#ffd93d]">
                  <div className="w-4 h-4 border-2 border-[#ffd93d] border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm">Ожидание оплаты...</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Promo Code */}
        <div className="bg-card rounded-xl border border-border/50 p-4">
          <p className="text-sm font-medium text-foreground mb-3">Промо-код</p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={promoCode}
              onChange={(e) => {
                setPromoCode(e.target.value)
                setPromoApplied(false)
                setPromoBonus(0)
              }}
              placeholder="Введите промо-код"
              className="flex-1 bg-secondary text-sm text-foreground px-3 py-2.5 rounded-lg outline-none placeholder:text-muted-foreground/50"
            />
            <button
              onClick={applyPromo}
              className="bg-secondary border border-border hover:bg-border text-foreground font-semibold text-sm px-4 py-2.5 rounded-lg transition-colors"
            >
              Применить
            </button>
          </div>
          {promoApplied && (
            <p className="text-xs text-[#2ee06e] mt-2">
              Промо-код применен! Бонус: +{promoBonus} ₽
            </p>
          )}
          <p className="text-[10px] text-muted-foreground mt-2">
            Попробуйте: BONUS50, START100, WELCOME
          </p>
        </div>

        {/* Total */}
        <div className="bg-card rounded-xl border border-[#2ee06e]/30 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">К оплате:</span>
            <span className="text-lg font-bold text-foreground">
              {method === "ton" ? `${tonAmount} TON` : `${amount} ₽`}
            </span>
          </div>
          {promoBonus > 0 && (
            <div className="flex items-center justify-between mt-1">
              <span className="text-sm text-muted-foreground">Бонус:</span>
              <span className="text-sm font-bold text-[#2ee06e]">+{promoBonus} ₽</span>
            </div>
          )}
          <div className="flex items-center justify-between mt-1 pt-2 border-t border-border">
            <span className="text-sm font-medium text-foreground">На баланс:</span>
            <span className="text-lg font-black text-[#2ee06e]">{amount + promoBonus} ₽</span>
          </div>
        </div>

        {/* Pay Button */}
        {!showPaymentDetails && (
          <button 
            onClick={handlePayment}
            disabled={isProcessing || amount < 100}
            className={`w-full font-bold text-base py-3.5 rounded-xl transition-all disabled:opacity-50 ${
              method === "sbp" 
                ? "bg-[#2ee06e] hover:bg-[#25c45c] text-[#0f1923] glow-green"
                : "bg-[#00b4d8] hover:bg-[#0097b2] text-white"
            }`}
          >
            {isProcessing ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Загрузка...
              </span>
            ) : method === "sbp" ? (
              "Оплатить через СБП"
            ) : (
              "Оплатить через Tonkeeper"
            )}
          </button>
        )}

        {/* Security note */}
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Shield className="w-4 h-4" />
          <span>Безопасные платежи с шифрованием</span>
        </div>
      </main>
      <Footer />
    </div>
  )
}
