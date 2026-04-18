import { useState, useEffect, useCallback } from "react"

interface TelegramWebApp {
  initDataUnsafe?: {
    user?: {
      id: number
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

interface UseUserBalanceReturn {
  balance: number
  setBalance: (balance: number) => void
  telegramId: string | null
  isLoading: boolean
  refetch: () => Promise<void>
  updateBalance: (amount: number, type: "add" | "subtract") => void
}

export function useUserBalance(): UseUserBalanceReturn {
  const [balance, setBalanceState] = useState(0)
  const [telegramId, setTelegramId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchBalance = useCallback(async () => {
    try {
      let tgId: string | null = null
      
      if (typeof window !== "undefined") {
        const tg = window.Telegram?.WebApp
        if (tg?.initDataUnsafe?.user?.id) {
          tgId = String(tg.initDataUnsafe.user.id)
        } else {
          tgId = localStorage.getItem("telegram_user_id")
        }
      }
      
      if (tgId) {
        setTelegramId(tgId)
        const response = await fetch(`/api/auth/telegram?telegramId=${tgId}`)
        const data = await response.json()
        
        if (data.success && data.user) {
          setBalanceState(data.user.balance || 0)
        }
      }
    } catch (error) {
      console.error("Failed to fetch balance:", error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchBalance()
  }, [fetchBalance])

  const setBalance = useCallback((newBalance: number) => {
    setBalanceState(newBalance)
    // Emit event for header
    window.dispatchEvent(new CustomEvent("balance-updated", { detail: { balance: newBalance } }))
  }, [])

  const updateBalance = useCallback((amount: number, type: "add" | "subtract") => {
    setBalanceState(prev => {
      const newBalance = type === "add" 
        ? prev + amount 
        : Math.max(0, prev - amount)
      
      // Emit event for header
      window.dispatchEvent(new CustomEvent("balance-updated", { detail: { balance: newBalance } }))
      
      return newBalance
    })
  }, [])

  return {
    balance,
    setBalance,
    telegramId,
    isLoading,
    refetch: fetchBalance,
    updateBalance,
  }
}
