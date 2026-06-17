import type { AssetCategory, ScreenerAsset } from "../types.js"
import { classifyAsset } from "./taxonomy.js"
import { coilTightness, computeRsi } from "./indicators.js"

export interface YahooAssetSeed {
  symbol: string
  yahooSymbol?: string
  fallbackSymbols?: string[]
  name?: string
  category: AssetCategory
  displaySymbol?: string
  underlyingSymbol?: string
  tokenSymbol?: string
  venue?: string
  minBars?: number
}

interface YahooChartResult {
  chart?: {
    result?: Array<{
      timestamp?: number[]
      meta?: { regularMarketPrice?: number }
      indicators?: {
        quote?: Array<{
          close?: Array<number | null>
          high?: Array<number | null>
          low?: Array<number | null>
          volume?: Array<number | null>
        }>
      }
    }>
  }
}

export async function fetchYahooAssets(seeds: YahooAssetSeed[]): Promise<ScreenerAsset[]> {
  const assets: ScreenerAsset[] = []
  for (let i = 0; i < seeds.length; i += 20) {
    const settled = await Promise.allSettled(seeds.slice(i, i + 20).map((seed) => fetchYahooAsset(seed)))
    assets.push(...settled.flatMap((r) => r.status === "fulfilled" && r.value ? [r.value] : []))
  }
  return assets
}

async function fetchYahooAsset(seed: YahooAssetSeed): Promise<ScreenerAsset | null> {
  const symbols = [seed.yahooSymbol || seed.symbol, ...(seed.fallbackSymbols || [])]
  for (const yahooSymbol of symbols) {
    const result = await tryFetchYahoo(yahooSymbol, seed)
    if (result) return result
  }
  return null
}

async function tryFetchYahoo(yahooSymbol: string, seed: YahooAssetSeed): Promise<ScreenerAsset | null> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?range=18mo&interval=1d`
  const res = await fetch(url, {
    headers: { "User-Agent": "breakingout.xyz/1.0" },
    signal: AbortSignal.timeout(10000),
  })
  if (!res.ok) return null

  const data = await res.json() as YahooChartResult
  const result = data.chart?.result?.[0]
  const quote = result?.indicators?.quote?.[0]
  if (!result?.timestamp || !quote?.close) return null

  const bars = result.timestamp
    .map((timestamp, i) => ({
      timestamp,
      close: quote.close?.[i] ?? null,
      high: quote.high?.[i] ?? null,
      low: quote.low?.[i] ?? null,
      volume: quote.volume?.[i] ?? null,
    }))
    .filter((b): b is { timestamp: number; close: number; high: number; low: number; volume: number | null } =>
      typeof b.close === "number" && typeof b.high === "number" && typeof b.low === "number"
    )

  if (bars.length < (seed.minBars ?? 30)) return null

  const close = bars.at(-1)?.close || result.meta?.regularMarketPrice || 0
  if (close <= 0) return null

  const sma10 = sma(bars.map((b) => b.close), 10)
  const sma20 = sma(bars.map((b) => b.close), 20)
  const sma50 = sma(bars.map((b) => b.close), 50)
  const sma200 = sma(bars.map((b) => b.close), 200)
  const adrPercent = average(
    bars.slice(-14).map((b) => ((b.high - b.low) / b.close) * 100)
  )
  const high3M = Math.max(...bars.slice(-63).map((b) => b.high))
  const tightness = coilTightness(close, sma10, sma20, sma50, adrPercent)
  const rsi = computeRsi(bars.map((b) => b.close))
  const volume = average(bars.slice(-20).map((b) => b.volume || 0))
  const up = (s: number) => close >= s ? "up" as const : "down" as const
  const classification = classifyAsset(seed.underlyingSymbol || seed.symbol, seed.category, seed.name)

  return {
    symbol: seed.displaySymbol || seed.symbol,
    name: seed.name || seed.displaySymbol || seed.symbol,
    category: seed.category,
    industry: classification.subsector,
    sector: classification.sector,
    subsector: classification.subsector,
    avgVolume: formatVolume(volume),
    tightness: tightness !== undefined && tightness < 4 ? "tight" : "",
    coilTightness: tightness,
    distToHighPct: high3M > 0 ? round((close / high3M - 1) * 100) : undefined,
    adrPercent: round(adrPercent),
    ma10: up(sma10),
    ma20: up(sma20),
    ma50: up(sma50),
    ma200: up(sma200),
    pct1M: pctChange(bars, 21),
    pct3M: pctChange(bars, 63),
    pct6M: pctChange(bars, 126),
    pct1Y: pctChange(bars, 252),
    price: round(close),
    change24h: pctChange(bars, 1),
    rsi: rsi,
    underlyingSymbol: seed.underlyingSymbol,
    tokenSymbol: seed.tokenSymbol,
    venue: seed.venue || "Yahoo",
    chartSymbol: seed.yahooSymbol || seed.symbol,
  }
}

function sma(values: number[], length: number): number {
  const slice = values.slice(-length)
  if (slice.length === 0) return 0
  return average(slice)
}

function average(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

function pctChange(bars: { close: number }[], lookback: number): number {
  if (bars.length <= lookback) return 0
  const last = bars.at(-1)?.close || 0
  const prior = bars.at(-(lookback + 1))?.close || 0
  if (last <= 0 || prior <= 0) return 0
  return round(((last - prior) / prior) * 100)
}

function formatVolume(volume: number): string {
  if (volume >= 1e9) return `${(volume / 1e9).toFixed(1)}B`
  if (volume >= 1e6) return `${(volume / 1e6).toFixed(0)}M`
  if (volume >= 1e3) return `${(volume / 1e3).toFixed(0)}K`
  return `${volume.toFixed(0)}`
}

function round(value: number): number {
  return parseFloat(value.toFixed(1))
}
