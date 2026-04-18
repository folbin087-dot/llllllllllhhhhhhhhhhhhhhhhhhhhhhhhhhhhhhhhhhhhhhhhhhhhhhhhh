import { NextRequest, NextResponse } from "next/server"

// Crypto rates API with caching and multiple provider fallback
// Supports: TON, BTC, ETH, USDT

interface CryptoRates {
  TON: number
  BTC: number
  ETH: number
  USDT: number
  timestamp: number
  source: string
}

// Cache rates for 30 seconds to avoid rate limiting
let cachedRates: CryptoRates | null = null
let cacheTimestamp = 0
const CACHE_DURATION = 30000 // 30 seconds

// Fetch rates from CoinGecko (primary)
async function fetchFromCoinGecko(): Promise<CryptoRates | null> {
  try {
    const response = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=the-open-network,bitcoin,ethereum,tether&vs_currencies=rub",
      { 
        headers: { "Accept": "application/json" },
        next: { revalidate: 30 }
      }
    )
    
    if (!response.ok) throw new Error(`CoinGecko: ${response.status}`)
    
    const data = await response.json()
    
    return {
      TON: data["the-open-network"]?.rub || 0,
      BTC: data["bitcoin"]?.rub || 0,
      ETH: data["ethereum"]?.rub || 0,
      USDT: data["tether"]?.rub || 0,
      timestamp: Date.now(),
      source: "coingecko"
    }
  } catch (error) {
    console.error("CoinGecko fetch error:", error)
    return null
  }
}

// Fetch rates from CoinCap (fallback)
async function fetchFromCoinCap(): Promise<CryptoRates | null> {
  try {
    // CoinCap uses USD, so we need to convert
    const [cryptoResponse, usdRubResponse] = await Promise.all([
      fetch("https://api.coincap.io/v2/assets?ids=toncoin,bitcoin,ethereum,tether"),
      fetch("https://api.exchangerate-api.com/v4/latest/USD")
    ])
    
    if (!cryptoResponse.ok || !usdRubResponse.ok) {
      throw new Error("CoinCap/ExchangeRate API error")
    }
    
    const cryptoData = await cryptoResponse.json()
    const usdData = await usdRubResponse.json()
    const usdToRub = usdData.rates?.RUB || 92 // Fallback rate
    
    const assets = cryptoData.data || []
    const getPrice = (id: string) => {
      const asset = assets.find((a: { id: string }) => a.id === id)
      return asset ? parseFloat(asset.priceUsd) * usdToRub : 0
    }
    
    return {
      TON: getPrice("toncoin"),
      BTC: getPrice("bitcoin"),
      ETH: getPrice("ethereum"),
      USDT: usdToRub, // USDT ~ 1 USD
      timestamp: Date.now(),
      source: "coincap"
    }
  } catch (error) {
    console.error("CoinCap fetch error:", error)
    return null
  }
}

// Get rates with caching and fallback
async function getRates(): Promise<CryptoRates> {
  // Return cached if fresh
  if (cachedRates && Date.now() - cacheTimestamp < CACHE_DURATION) {
    return cachedRates
  }
  
  // Try primary provider
  let rates = await fetchFromCoinGecko()
  
  // Fallback to secondary
  if (!rates) {
    rates = await fetchFromCoinCap()
  }
  
  // Use fallback rates if all APIs fail
  if (!rates) {
    rates = {
      TON: 280, // Approximate fallback rates
      BTC: 8500000,
      ETH: 350000,
      USDT: 92,
      timestamp: Date.now(),
      source: "fallback"
    }
  }
  
  // Update cache
  cachedRates = rates
  cacheTimestamp = Date.now()
  
  return rates
}

// Convert RUB to crypto amount
function rubToCrypto(rubAmount: number, cryptoRate: number): number {
  if (cryptoRate <= 0) return 0
  return parseFloat((rubAmount / cryptoRate).toFixed(8))
}

// Convert crypto to RUB amount
function cryptoToRub(cryptoAmount: number, cryptoRate: number): number {
  return parseFloat((cryptoAmount * cryptoRate).toFixed(2))
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const currency = searchParams.get("currency")?.toUpperCase()
    const rubAmount = searchParams.get("rub") ? parseFloat(searchParams.get("rub")!) : null
    const cryptoAmount = searchParams.get("crypto") ? parseFloat(searchParams.get("crypto")!) : null
    
    const rates = await getRates()
    
    // If specific currency requested with conversion
    if (currency && (currency === "TON" || currency === "BTC" || currency === "ETH" || currency === "USDT")) {
      const rate = rates[currency]
      
      const response: Record<string, unknown> = {
        currency,
        rate,
        rateFormatted: `1 ${currency} = ${rate.toLocaleString("ru-RU")} ₽`,
        timestamp: rates.timestamp,
        source: rates.source,
      }
      
      if (rubAmount !== null && !isNaN(rubAmount)) {
        response.conversion = {
          rub: rubAmount,
          crypto: rubToCrypto(rubAmount, rate),
          currency,
        }
      }
      
      if (cryptoAmount !== null && !isNaN(cryptoAmount)) {
        response.conversion = {
          crypto: cryptoAmount,
          rub: cryptoToRub(cryptoAmount, rate),
          currency,
        }
      }
      
      return NextResponse.json(response)
    }
    
    // Return all rates
    return NextResponse.json({
      rates: {
        TON: {
          rub: rates.TON,
          formatted: `${rates.TON.toLocaleString("ru-RU")} ₽`,
        },
        BTC: {
          rub: rates.BTC,
          formatted: `${rates.BTC.toLocaleString("ru-RU")} ₽`,
        },
        ETH: {
          rub: rates.ETH,
          formatted: `${rates.ETH.toLocaleString("ru-RU")} ₽`,
        },
        USDT: {
          rub: rates.USDT,
          formatted: `${rates.USDT.toLocaleString("ru-RU")} ₽`,
        },
      },
      timestamp: rates.timestamp,
      source: rates.source,
      cached: Date.now() - cacheTimestamp < CACHE_DURATION,
    })
    
  } catch (error) {
    console.error("Crypto rates API error:", error)
    return NextResponse.json(
      { error: "Failed to fetch rates" },
      { status: 500 }
    )
  }
}
