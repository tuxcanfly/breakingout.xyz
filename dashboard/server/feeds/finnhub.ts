import type { ScreenerAsset } from "../types.js"

const API_KEY = process.env.FINNHUB_API_KEY
const BASE_URL = "https://finnhub.io/api/v1"
const CACHE_TTL = 24 * 60 * 60 * 1000
const FETCH_DELAY_MS = 1_000
const PER_REFRESH_CAP = 30

interface CacheEntry {
  data: AnalystRating
  timestamp: number
}

const cache = new Map<string, CacheEntry>()

export interface AnalystRating {
  consensus: "strong buy" | "buy" | "hold" | "sell" | "strong sell"
  score: number
  strongBuy: number
  buy: number
  hold: number
  sell: number
  strongSell: number
  total: number
}

interface FinnhubRecommendation {
  symbol: string
  period: string
  strongBuy: number
  buy: number
  hold: number
  sell: number
  strongSell: number
}

function buildRating(rows: FinnhubRecommendation[]): AnalystRating | null {
  if (!rows || rows.length === 0) return null
  const latest = rows.sort((a, b) => b.period.localeCompare(a.period))[0]
  const { strongBuy, buy, hold, sell, strongSell } = latest
  const total = strongBuy + buy + hold + sell + strongSell
  if (total === 0) return null

  const score = (strongBuy * 2 + buy * 1 - sell * 1 - strongSell * 2) / total

  let consensus: AnalystRating["consensus"]
  if (score >= 1.2) consensus = "strong buy"
  else if (score >= 0.4) consensus = "buy"
  else if (score > -0.4) consensus = "hold"
  else if (score > -1.2) consensus = "sell"
  else consensus = "strong sell"

  return {
    consensus,
    score: parseFloat(score.toFixed(2)),
    strongBuy,
    buy,
    hold,
    sell,
    strongSell,
    total,
  }
}

async function fetchSymbolRecommendations(symbol: string): Promise<AnalystRating | null> {
  if (!API_KEY) return null
  const url = `${BASE_URL}/stock/recommendation?symbol=${encodeURIComponent(symbol)}&token=${API_KEY}`
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "breakingout.xyz/1.0" },
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) {
      if (res.status === 429) console.warn(`Finnhub rate limit for ${symbol}`)
      return null
    }
    const data = (await res.json()) as FinnhubRecommendation[]
    return buildRating(data)
  } catch (err) {
    console.error(`Finnhub ${symbol}:`, err instanceof Error ? err.message : String(err))
    return null
  }
}

function getCachedRating(symbol: string): AnalystRating | null {
  const entry = cache.get(symbol)
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) return entry.data
  return null
}

function setCachedRating(symbol: string, rating: AnalystRating): void {
  cache.set(symbol, { data: rating, timestamp: Date.now() })
}

async function sleep(ms: number): Promise<void> {
  const { promise, resolve } = Promise.withResolvers<void>()
  setTimeout(resolve, ms)
  await promise
}

export async function fetchAnalystRatings(assets: ScreenerAsset[]): Promise<Map<string, AnalystRating>> {
  const result = new Map<string, AnalystRating>()
  if (!API_KEY) {
    console.log("Finnhub API key not set; skipping analyst ratings")
    return result
  }

  for (const a of assets) {
    const cached = getCachedRating(a.symbol)
    if (cached) result.set(a.symbol, cached)
  }

  const candidates = assets
    .filter((a) => /^[A-Z]{1,5}(?:\.[A-Z])?$/.test(a.symbol))
    .sort((a, b) => {
      const pa =
        (a.tags?.includes("trending") ? 1000 : 0) +
        (a.tags?.includes("actionable") ? 500 : 0) +
        (a.conviction ?? 0) * 2 +
        (a.setupScore ?? 0)
      const pb =
        (b.tags?.includes("trending") ? 1000 : 0) +
        (b.tags?.includes("actionable") ? 500 : 0) +
        (b.conviction ?? 0) * 2 +
        (b.setupScore ?? 0)
      return pb - pa
    })
    .map((a) => a.symbol)
    .filter((s, i, arr) => arr.indexOf(s) === i && !getCachedRating(s))
    .slice(0, PER_REFRESH_CAP)

  if (candidates.length === 0) return result

  console.log(`Fetching Finnhub ratings for ${candidates.length} symbols`)
  let fetched = 0
  for (const symbol of candidates) {
    const rating = await fetchSymbolRecommendations(symbol)
    if (rating) {
      setCachedRating(symbol, rating)
      result.set(symbol, rating)
    }
    fetched++
    if (fetched < candidates.length) await sleep(FETCH_DELAY_MS)
  }

  console.log(`Resolved Finnhub ratings: ${result.size}/${assets.length} (fetched ${fetched})`)
  return result
}

export function mergeAnalystRatings(assets: ScreenerAsset[], ratings: Map<string, AnalystRating>): ScreenerAsset[] {
  return assets.map((a) => {
    const rating = ratings.get(a.symbol)
    if (!rating) return a
    return { ...a, analystRating: rating }
  })
}
