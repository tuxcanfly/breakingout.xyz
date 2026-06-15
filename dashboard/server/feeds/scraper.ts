import type { ScreenerAsset, MarketRegime, AssetCategory, IntelTweet } from "../types.js"
import { classifyAsset } from "./taxonomy.js"
import {
  coilTightness,
  isLoadedSpring,
  isAccelerating,
  isQuietCoil,
  isRegimeAligned,
  isReversalWatch,
} from "./indicators.js"
import { fetchYahooAssets, type YahooAssetSeed } from "./yahoo.js"
import { XSTOCK_PRODUCTS } from "./xstocks.js"
import {
  fetchTrackedFeed,
  fetchTrackedMentionsMap,
} from "./nitter.js"
import { fetchTopCryptoSymbols } from "./binance.js"
import { SP500_STOCKS, EXTRA_STOCKS, ETF_UNIVERSE, CRYPTO_UNIVERSE, COMMODITY_UNIVERSE } from "./universe.js"

interface CacheEntry<T> { data: T; timestamp: number }
const cache = new Map<string, CacheEntry<unknown>>()
const CACHE_TTL = 10 * 60 * 1000

function getCached<T>(key: string): T | null {
  const entry = cache.get(key)
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) return entry.data as T
  return null
}

function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now() })
}

// ── TradingView scanner ────────────────────────────────────────────────────

const TV_COLS = ["name","close","volume","Perf.1M","Perf.3M","Perf.6M","Perf.Y","Volatility.D","SMA20","SMA50","SMA200","RSI","change","SMA10","High.3M"]

interface AssetMeta {
  displaySymbol?: string
  name?: string
  industry?: string
  underlyingSymbol?: string
  tokenSymbol?: string
  venue?: string
}

async function scanTV(endpoint: string, tickers: string[], batchSize = 80): Promise<{ symbol: string; v: number[] }[]> {
  const results: { symbol: string; v: number[] }[] = []
  for (let i = 0; i < tickers.length; i += batchSize) {
    const chunk = tickers.slice(i, i + batchSize)
    const chunkResults = await scanTVChunkWithRetry(endpoint, chunk)
    results.push(...chunkResults)
    if (i + batchSize < tickers.length) {
      await sleep(250)
    }
  }
  return results
}

async function scanTVChunkWithRetry(endpoint: string, tickers: string[], retries = 2): Promise<{ symbol: string; v: number[] }[]> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbols: { tickers, query: { types: [] } },
          columns: TV_COLS,
          range: [0, tickers.length],
        }),
        signal: AbortSignal.timeout(15000),
      })
      if (!res.ok) throw new Error(`TV ${endpoint} returned ${res.status}`)
      const data = await res.json()
      return (data.data as { s: string; d: unknown[] }[]).map((r) => ({
        symbol: r.s.split(":")[1] || r.s,
        v: r.d as number[],
      }))
    } catch (err) {
      if (attempt === retries) {
        console.error(`TV chunk failed after ${retries + 1} attempts:`, err instanceof Error ? err.message : String(err))
        return []
      }
      await sleep(1000 * (attempt + 1))
    }
  }
  return []
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function makeAsset(symbol: string, v: number[], cat: AssetCategory, meta: AssetMeta = {}): ScreenerAsset {
  const close = (v[1] as number) || 0
  const pct1M = (v[3] as number) || 0
  const pct3M = (v[4] as number) || 0
  const pct6M = (v[5] as number) || 0
  const pct1Y = (v[6] as number) || 0
  const adr = (v[7] as number) || 0
  const sma20 = (v[8] as number) || 0
  const sma50 = (v[9] as number) || 0
  const sma200 = (v[10] as number) || 0
  const vol = (v[2] as number) || 0
  const sma10 = (v[13] as number) || 0
  const high3M = (v[14] as number) || 0
  const rsi = (v[11] as number) || undefined
  const up = (s: number) => close >= s ? "up" as const : "down" as const
  const displaySymbol = meta.displaySymbol || symbol
  const classification = classifyAsset(meta.underlyingSymbol || symbol, cat, meta.name)
  const tightness = coilTightness(close, sma10, sma20, sma50, adr)
  const distToHighPct = high3M > 0 ? parseFloat(((close / high3M - 1) * 100).toFixed(1)) : undefined
  return {
    symbol: displaySymbol,
    name: meta.name || displaySymbol,
    category: cat,
    industry: meta.industry || classification.subsector,
    sector: classification.sector,
    subsector: classification.subsector,
    avgVolume: vol >= 1e9 ? `${(vol / 1e9).toFixed(1)}B` : `${(vol / 1e6).toFixed(0)}M`,
    tightness: tightness !== undefined && tightness < 4 ? "tight" : "",
    coilTightness: tightness,
    distToHighPct,
    adrPercent: parseFloat(adr.toFixed(1)),
    ma10: up(sma10 || sma20),
    ma20: up(sma20),
    ma50: up(sma50),
    ma200: up(sma200),
    pct1M: parseFloat(pct1M.toFixed(1)),
    pct3M: parseFloat(pct3M.toFixed(1)),
    pct6M: parseFloat(pct6M.toFixed(1)),
    pct1Y: parseFloat(pct1Y.toFixed(1)),
    price: close,
    change24h: parseFloat(((v[12] as number) || 0).toFixed(1)),
    rsi,
    underlyingSymbol: meta.underlyingSymbol,
    tokenSymbol: meta.tokenSymbol,
    venue: meta.venue,
  }
}

function mergeAssets(primary: ScreenerAsset[], fallback: ScreenerAsset[]): ScreenerAsset[] {
  const seen = new Set(primary.map((a) => a.symbol))
  return [...primary, ...fallback.filter((a) => !seen.has(a.symbol))]
}

function yahooSeeds(symbols: string[], category: AssetCategory): YahooAssetSeed[] {
  return [...new Set(symbols)].map((symbol) => ({ symbol, category }))
}

// ── Stock fetcher (S&P 500 + extras + xStock metadata) ─────────────────────

async function fetchStocks(): Promise<{ stocks: ScreenerAsset[]; xstocks: ScreenerAsset[] }> {
  const cached = getCached<{ stocks: ScreenerAsset[]; xstocks: ScreenerAsset[] }>("stocks")
  if (cached) return cached

  try {
    // Build unique ticker list: S&P 500 + extras + xStock underlyings
    const allStockSymbols = [...new Set([...SP500_STOCKS, ...EXTRA_STOCKS, ...XSTOCK_PRODUCTS.map((p) => p.underlyingSymbol)])]

    let assets: ScreenerAsset[] = []
    try {
      const rows = await scanTV("https://scanner.tradingview.com/america/scan", allStockSymbols)
      assets = rows.filter((r) => r.v[1] > 0).map((r) => makeAsset(r.symbol, r.v, "stocks"))
    } catch (err) {
      console.error("Stocks TradingView fetch:", err instanceof Error ? err.message : String(err))
    }

    // Yahoo fallback for any missing xStock underlyings or failed TV fetches
    const tvSymbols = new Set(assets.map((a) => a.symbol))
    const missingFromTV = allStockSymbols.filter((s) => !tvSymbols.has(s))
    if (missingFromTV.length > 0) {
      const yahooFallback = await fetchYahooAssets(yahooSeeds(missingFromTV, "stocks"))
      assets = mergeAssets(assets, yahooFallback)
    }

    // Merge xStock metadata into underlying stocks
    const xstockMap = new Map(XSTOCK_PRODUCTS.map((p) => [p.underlyingSymbol, p]))
    const mergedStocks: ScreenerAsset[] = []
    const standaloneXStocks: ScreenerAsset[] = []

    for (const asset of assets) {
      const xProduct = xstockMap.get(asset.symbol)
      if (xProduct) {
        mergedStocks.push({
          ...asset,
          tokenSymbol: xProduct.tokenSymbol,
          venue: "xStocks",
        })
      } else {
        mergedStocks.push(asset)
      }
    }

    // If any xStock underlying is completely missing, fetch it standalone
    const presentUnderlyings = new Set(mergedStocks.map((a) => a.symbol))
    for (const p of XSTOCK_PRODUCTS) {
      if (!presentUnderlyings.has(p.underlyingSymbol)) {
        const yahoo = await fetchYahooAssets([{
          symbol: p.underlyingSymbol,
          displaySymbol: p.tokenSymbol,
          tokenSymbol: p.tokenSymbol,
          underlyingSymbol: p.underlyingSymbol,
          name: p.name,
          category: "stocks",
          venue: "xStocks",
        }])
        if (yahoo.length > 0) {
          mergedStocks.push(yahoo[0])
        }
      }
    }

    const result = { stocks: mergedStocks, xstocks: standaloneXStocks }
    setCache("stocks", result)
    return result
  } catch (err) {
    console.error("Stocks fetch:", err instanceof Error ? err.message : String(err))
    return getCached<{ stocks: ScreenerAsset[]; xstocks: ScreenerAsset[] }>("stocks") || { stocks: [], xstocks: [] }
  }
}

// ── ETF fetcher ────────────────────────────────────────────────────────────

async function fetchETFs(): Promise<ScreenerAsset[]> {
  const cached = getCached<ScreenerAsset[]>("etfs")
  if (cached) return cached

  try {
    let assets: ScreenerAsset[] = []
    try {
      const rows = await scanTV("https://scanner.tradingview.com/america/scan", ETF_UNIVERSE)
      assets = rows.filter((r) => r.v[1] > 0).map((r) => makeAsset(r.symbol, r.v, "etfs"))
    } catch (err) {
      console.error("ETFs TradingView fetch:", err instanceof Error ? err.message : String(err))
    }

    const tvSymbols = new Set(assets.map((a) => a.symbol))
    const missing = ETF_UNIVERSE.filter((s) => !tvSymbols.has(s))
    if (missing.length > 0) {
      const fallback = await fetchYahooAssets(yahooSeeds(missing, "etfs"))
      assets = mergeAssets(assets, fallback)
    }

    setCache("etfs", assets)
    return assets
  } catch (err) {
    console.error("ETFs fetch:", err instanceof Error ? err.message : String(err))
    return getCached<ScreenerAsset[]>("etfs") || []
  }
}

// ── Commodity fetcher ──────────────────────────────────────────────────────

async function fetchCommodities(): Promise<ScreenerAsset[]> {
  const cached = getCached<ScreenerAsset[]>("commodities")
  if (cached) return cached

  try {
    const rows = await scanTV("https://scanner.tradingview.com/america/scan", COMMODITY_UNIVERSE)
    const assets = rows.filter((r) => r.v[1] > 0).map((r) => makeAsset(r.symbol, r.v, "commodities"))
    setCache("commodities", assets)
    return assets
  } catch (err) {
    console.error("Commodities fetch:", err instanceof Error ? err.message : String(err))
    return getCached<ScreenerAsset[]>("commodities") || []
  }
}

// ── Crypto fetcher (TradingView crypto scanner + Binance top-N) ────────────

async function fetchCrypto(): Promise<ScreenerAsset[]> {
  const cached = getCached<ScreenerAsset[]>("crypto")
  if (cached) return cached

  try {
    // Dynamic universe: top USDT pairs by Binance 24h volume, merged with the
    // static baseline so majors are always present even if Binance is down.
    const dynamicSymbols = await fetchTopCryptoSymbols(120)
    const cryptoTickers = [...new Set([...CRYPTO_UNIVERSE, ...dynamicSymbols])]

    let assets: ScreenerAsset[] = []
    try {
      const tvTickers = cryptoTickers.map((s) => `BINANCE:${s}`)
      const rows = await scanTV("https://scanner.tradingview.com/crypto/scan", tvTickers)
      assets = rows.filter((r) => r.v[1] > 0).map((r) => {
        const raw = r.symbol.replace("USDT", "").replace("PERP", "")
        return makeAsset(raw, r.v, "crypto", { name: raw })
      })
    } catch (err) {
      console.error("Crypto TradingView fetch:", err instanceof Error ? err.message : String(err))
    }

    // Yahoo fallback for extra crypto coverage
    const extraCrypto: YahooAssetSeed[] = [
      { symbol: "LEO", yahooSymbol: "LEO-USD", name: "UNUS SED LEO", category: "crypto" },
      { symbol: "BGB", yahooSymbol: "BGB-USD", name: "Bitget Token", category: "crypto" },
      { symbol: "TON", yahooSymbol: "TON114-USD", name: "Toncoin", category: "crypto" },
    ]
    const yahooFallback = await fetchYahooAssets(extraCrypto)
    assets = mergeAssets(assets, yahooFallback)

    setCache("crypto", assets)
    return assets
  } catch (err) {
    console.error("Crypto fetch:", err instanceof Error ? err.message : String(err))
    return getCached<ScreenerAsset[]>("crypto") || []
  }
}

// ── Market regime ──────────────────────────────────────────────────────────

// SPY vs its 140-day EMA — the exposure dial from the breakout study.
// Backtested as a portfolio-level throttle (cuts drawdown roughly in half),
// not a per-trade entry filter.
async function fetchSpyEma140(): Promise<{ regime: "risk-on" | "risk-off"; vsEmaPct: number } | null> {
  try {
    const url = "https://query1.finance.yahoo.com/v8/finance/chart/SPY?range=2y&interval=1d"
    const res = await fetch(url, {
      headers: { "User-Agent": "breakingout.xyz/1.0" },
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return null
    const data = await res.json() as { chart?: { result?: Array<{ indicators?: { quote?: Array<{ close?: Array<number | null> }> } }> } }
    const closes = (data.chart?.result?.[0]?.indicators?.quote?.[0]?.close || []).filter((c): c is number => typeof c === "number")
    if (closes.length < 150) return null
    const alpha = 2 / (140 + 1)
    let ema = closes[0]
    for (const c of closes) ema = c * alpha + ema * (1 - alpha)
    const last = closes[closes.length - 1]
    return {
      regime: last > ema ? "risk-on" : "risk-off",
      vsEmaPct: parseFloat(((last / ema - 1) * 100).toFixed(1)),
    }
  } catch {
    return null
  }
}

async function fetchMarketRegime(): Promise<MarketRegime> {
  const cached = getCached<MarketRegime>("market")
  if (cached) return cached

  try {
    const [rows, ema140] = await Promise.all([
      scanTV("https://scanner.tradingview.com/america/scan", ["AMEX:SPY"]),
      fetchSpyEma140(),
    ])
    const m: MarketRegime = {
      spy200SMA: "below",
      spy50SMA: "below",
      spy20SMA: "below",
      spy10SMA: "below",
      naaim: 86.82,
      naaimDate: new Date().toISOString().slice(0, 10),
      btc200SMA: "above",
      btc50SMA: "above",
      gold200SMA: "above",
    }
    if (rows.length) {
      const v = rows[0].v
      const close = v[1] as number
      m.spy20SMA = close >= (v[8] as number) ? "above" : "below"
      m.spy50SMA = close >= (v[9] as number) ? "above" : "below"
      m.spy200SMA = close >= (v[10] as number) ? "above" : "below"
      m.spy10SMA = (v[3] as number) > 0 ? "above" : "below"
    }
    if (ema140) {
      m.spyRegime = ema140.regime
      m.spyVsEma140 = ema140.vsEmaPct
    } else {
      m.spyRegime = m.spy200SMA === "above" ? "risk-on" : "risk-off"
    }
    setCache("market", m)
    return m
  } catch (err) {
    console.error("Market fetch:", err instanceof Error ? err.message : String(err))
    return getCached<MarketRegime>("market") || {
      spy200SMA: "above",
      spy50SMA: "above",
      spy20SMA: "below",
      spy10SMA: "below",
      naaim: 86.82,
      naaimDate: new Date().toISOString().slice(0, 10),
      btc200SMA: "above",
      btc50SMA: "above",
      gold200SMA: "above",
    }
  }
}

// ── Signals ────────────────────────────────────────────────────────────────

function percentile(value: number, values: number[]): number {
  const clean = values.filter((v) => !Number.isNaN(v)).sort((a, b) => a - b)
  if (clean.length <= 1) return 50
  const below = clean.filter((v) => v <= value).length - 1
  return Math.round(Math.max(0, Math.min(100, (below / (clean.length - 1)) * 100)))
}

function trendState(a: ScreenerAsset): ScreenerAsset["trendState"] {
  const longUp = a.ma20 === "up" && a.ma50 === "up" && a.ma200 === "up"
  const longDown = a.ma20 === "down" && a.ma50 === "down" && a.ma200 === "down"
  if (longUp && a.pct1M > 0) return "uptrend"
  if (longDown && a.pct1M < 0) return "downtrend"
  if ((a.pct1M > 0 && a.ma200 === "down") || (a.pct1M < 0 && a.ma200 === "up")) return "transition"
  return "chop"
}

function scoreSetup(a: ScreenerAsset): number {
  const maScore = [a.ma10, a.ma20, a.ma50, a.ma200].filter((m) => m === "up").length * 10
  const tightScore = a.tightness ? 20 : Math.max(0, 20 - a.adrPercent * 2)
  const momentumScore = (a.momentumRank || 0) * 0.4
  return Math.round(Math.min(100, maScore + tightScore + momentumScore))
}

function scoreRisk(a: ScreenerAsset): number {
  const volatility = Math.min(50, a.adrPercent * 6)
  const trendPenalty = a.trendState === "downtrend" ? 30 : a.trendState === "transition" ? 18 : 6
  const weakness = a.pct1M < 0 ? Math.min(20, Math.abs(a.pct1M)) : 0
  return Math.round(Math.min(100, volatility + trendPenalty + weakness))
}

// Conviction (0–100): the actionable composite. Blends COIL, relative strength,
// and setup quality, then applies regime and risk gates so the surfaced names
// are the ones actually tradeable in the current market. This is what the hero
// strip ranks on — deliberately not the same as COIL or RS alone.
function scoreConviction(a: ScreenerAsset, market: MarketRegime): number {
  const coil = a.coilScore ?? 0
  const rs = a.momentumRank ?? 50
  const setup = a.setupScore ?? 0
  let raw = coil * 0.4 + rs * 0.3 + setup * 0.3
  const riskOn = (market.spyRegime ?? "risk-on") === "risk-on"
  // Regime gate: in risk-off, only uptrending names hold conviction.
  if (!riskOn && a.trendState !== "uptrend") raw *= 0.5
  // Risk gate: genuinely risky setups can't score top conviction.
  if ((a.riskScore ?? 0) > 60) raw *= 0.6
  if (a.trendState === "downtrend") raw *= 0.4
  // Small lift for the about-to-move setups.
  if (isLoadedSpring(a)) raw += 5
  return Math.round(Math.min(100, Math.max(0, raw)))
}

// Blended cross-sectional momentum over 1/3/6/12-month horizons — the
// strongest factor in the breakout study (fwd60 spread 4.8% vs 2.5% for
// top-ranked names vs the rest).
function blendedMomentum(a: ScreenerAsset, pool: ScreenerAsset[]): number {
  const horizons: Array<"pct1M" | "pct3M" | "pct6M" | "pct1Y"> = ["pct1M", "pct3M", "pct6M", "pct1Y"]
  const ranks = horizons.map((h) => percentile(a[h], pool.map((x) => x[h])))
  return Math.round(ranks.reduce((s, r) => s + r, 0) / ranks.length)
}

// COIL composite (0-100): proximity to the 50d-high trigger, base tightness,
// and momentum leadership, weighted by effect size in the backtest.
function scoreCoil(a: ScreenerAsset): number {
  const lead = (a.momentumRank || 0) * 0.4
  const tight = a.coilTightness !== undefined
    ? 25 * Math.max(0, Math.min(1, (12 - a.coilTightness) / 8))
    : 0
  const trigger = a.distToHighPct !== undefined
    ? 35 * Math.max(0, Math.min(1, 1 + a.distToHighPct / 10))
    : 0
  return Math.round(Math.min(100, lead + tight + trigger))
}

function computeSignals(assets: ScreenerAsset[], market: MarketRegime): ScreenerAsset[] {
  return assets.map((a) => {
    const sectorPool = assets.filter((x) => x.sector === a.sector)
    const categoryPool = assets.filter((x) => x.category === a.category)
    const withRanks: ScreenerAsset = {
      ...a,
      momentumRank: blendedMomentum(a, assets),
      categoryRank: blendedMomentum(a, categoryPool),
      sectorRank: blendedMomentum(a, sectorPool),
      trendState: trendState(a),
    }
    return {
      ...withRanks,
      setupScore: scoreSetup(withRanks),
      riskScore: scoreRisk(withRanks),
      coilScore: scoreCoil(withRanks),
      conviction: scoreConviction(withRanks, market),
    }
  })
}

function computeTags(
  assets: ScreenerAsset[],
  market: MarketRegime,
  allAssets: ScreenerAsset[],
  mentionsBySymbol: Map<string, string[]>,
  adrP25ByCategory: Record<string, number>,
): ScreenerAsset[] {
  const pcts = allAssets.map((a) => a.pct1M).filter((p) => !isNaN(p))
  const top5 = pcts.length ? pcts.sort((a, b) => b - a)[Math.floor(pcts.length * 0.05)] || 20 : 20
  return assets.map((a) => {
    const t: string[] = []
    if (market.naaim >= 70 && market.naaim <= 90) t.push("naaim")
    else if (market.naaim > 90) t.push("naaim-extreme")
    else if (market.naaim < 50) t.push("naaim-caution")
    const allUp = a.ma10 === "up" && a.ma20 === "up" && a.ma50 === "up" && a.ma200 === "up"
    const allDn = a.ma10 === "down" && a.ma20 === "down" && a.ma50 === "down" && a.ma200 === "down"
    if (allUp) t.push("all-ma-up")
    if (allDn) t.push("all-ma-down")
    if (a.pct1M >= top5) t.push("momentum-leader")
    if (a.pct1M > 20) t.push("strong-momentum")
    if (a.pct1M < -20) t.push("weak-momentum")
    if (a.adrPercent > 5) t.push("high-volatility")
    if (a.adrPercent < 2) t.push("low-volatility")
    if (a.tightness) t.push("tight-base")
    if (a.pct1M > 10 && a.ma10 === "up" && a.ma20 === "up") t.push("breakout")
    if (a.pct1M > 0 && a.pct3M > 0 && a.pct6M > 0) t.push("stage2")
    if ((a.momentumRank || 0) >= 90) t.push("rs-90")
    if ((a.momentumRank || 0) <= 10) t.push("bottom-decile")
    if ((a.setupScore || 0) >= 80 && (a.riskScore || 100) <= 45) t.push("clean-setup")
    // Full COIL stack: at/near the 50d-high trigger + tight base + momentum
    // leader. Stacked, these tripled forward returns in the backtest.
    if (
      a.distToHighPct !== undefined && a.distToHighPct >= -1 &&
      a.coilTightness !== undefined && a.coilTightness < 4 &&
      (a.momentumRank || 0) >= 89
    ) t.push("coil")
    if (a.trendState === "transition") t.push("transition")
    if (a.trendState === "downtrend") t.push("avoid")

    // ── Unusual / hidden signals ─────────────────────────────────────────
    if (a.rsi !== undefined) {
      if (a.rsi >= 70) t.push("rsi-overbought")
      else if (a.rsi <= 30) t.push("rsi-oversold")
    }
    if (isLoadedSpring(a)) t.push("loaded-spring")
    if (isAccelerating(a)) t.push("accelerating")
    if (isQuietCoil(a, adrP25ByCategory[a.category] ?? 0)) t.push("quiet-coil")
    if (isRegimeAligned(a, market)) t.push("regime-aligned")
    if (isReversalWatch(a)) t.push("reversal-watch")
    if ((a.conviction || 0) >= 70 && (a.riskScore || 100) <= 55) t.push("actionable")
    if (a.xSurfaced) t.push("x-surfaced")

    // Mention tags based on tracked X accounts
    const mentioners = mentionsBySymbol.get(a.symbol)
    if (mentioners && mentioners.length > 0) {
      for (const tag of mentioners) t.push(tag)
    }
    if (a.tokenSymbol) t.push("xstock")
    return { ...a, tags: t, mentionedBy: mentioners }
  })
}

// ── Unified fetch ──────────────────────────────────────────────────────────

export async function fetchAllAssets() {
  const [{ stocks, xstocks }, crypto, etfs, commodities, market, mentionsMap, intel] = await Promise.all([
    fetchStocks(),
    fetchCrypto(),
    fetchETFs(),
    fetchCommodities(),
    fetchMarketRegime(),
    fetchTrackedMentionsMap(),
    fetchTrackedFeed(40).catch((err): IntelTweet[] => {
      console.error("Intel feed fetch:", err instanceof Error ? err.message : String(err))
      return []
    }),
  ])

  // ── X-surfaced auto-add ────────────────────────────────────────────────
  // Strict gate: cashtag form only, from tracked accounts, Yahoo-resolved,
  // capped. Resolved names land in stocks with xSurfaced=true and inherit a
  // 24h mention cache from the mentions map.
  const knownSymbols = new Set(
    [...stocks, ...crypto, ...etfs, ...commodities].map((a) => a.symbol.toUpperCase())
  )
  const xCandidates: string[] = []
  for (const [sym] of mentionsMap.bySymbol) {
    const s = sym.toUpperCase()
    if (knownSymbols.has(s)) continue
    if (!/^[A-Z]{1,5}(\.[A-Z])?$/.test(s)) continue
    xCandidates.push(s)
    knownSymbols.add(s)
    if (xCandidates.length >= 40) break
  }
  let xSurfacedAssets: ScreenerAsset[] = []
  if (xCandidates.length > 0) {
    xSurfacedAssets = (await fetchYahooAssets(
      xCandidates.map((s) => ({ symbol: s, category: "stocks" as AssetCategory }))
    )).map((a) => ({ ...a, xSurfaced: true }))
      // Only auto-add tickers with a known sector classification.
      // Cashtags that resolve to unclassified Yahoo symbols (not in
      // SECTOR_MAP) are excluded to keep the universe clean.
      .filter((a) => a.subsector !== "Unclassified")
  }

  const baseStocks = [...stocks, ...xSurfacedAssets]
  const allForSignals = [...baseStocks, ...crypto, ...etfs, ...commodities]
  const signaled = computeSignals(allForSignals, market)
  const byKey = new Map(signaled.map((a) => [`${a.category}:${a.symbol}`, a]))
  const pick = (items: ScreenerAsset[]) => items.map((a) => byKey.get(`${a.category}:${a.symbol}`) || a)
  const all = signaled

  // Per-category ADR 25th percentile — the threshold for the quiet-coil signal.
  const adrP25ByCategory: Record<string, number> = {}
  for (const cat of ["stocks", "crypto", "etfs", "commodities"] as AssetCategory[]) {
    const adrs = all
      .filter((a) => a.category === cat)
      .map((a) => a.adrPercent)
      .filter((n) => Number.isFinite(n))
      .sort((a, b) => a - b)
    adrP25ByCategory[cat] = adrs.length ? adrs[Math.floor(adrs.length * 0.25)] : 0
  }

  return {
    stocks: computeTags(pick(baseStocks), market, all, mentionsMap.bySymbol, adrP25ByCategory),
    xstocks: computeTags(pick(xstocks), market, all, mentionsMap.bySymbol, adrP25ByCategory),
    crypto: computeTags(pick(crypto), market, all, mentionsMap.bySymbol, adrP25ByCategory),
    etfs: computeTags(pick(etfs), market, all, mentionsMap.bySymbol, adrP25ByCategory),
    commodities: computeTags(pick(commodities), market, all, mentionsMap.bySymbol, adrP25ByCategory),
    market,
    intel,
  }
}
