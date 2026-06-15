// Dynamic crypto universe expansion: pulls Binance's 24h ticker and returns
// the top USDT pairs by quote volume, filtered for stablecoins and leveraged
// tokens. Merged with the static CRYPTO_UNIVERSE so we always have majors even
// if Binance is unreachable.

const STABLECOIN_BASES = new Set([
  "USDC", "FDUSD", "TUSD", "BUSD", "DAI", "USDP", "EUR", "GBP", "AEUR",
  "USDD", "USTC", "PAXG", "CFT", "USD1", "BFUSD", "USDS",
])

const LEVERAGED_RE = /(UP|DOWN|BULL|BEAR)USDT$/

const cache: { data: string[]; ts: number } | null = { data: [], ts: 0 }
const CACHE_TTL = 10 * 60 * 1000

export async function fetchTopCryptoSymbols(limit = 100): Promise<string[]> {
  if (cache && Date.now() - cache.ts < CACHE_TTL) return cache.data

  try {
    const res = await fetch("https://api.binance.com/api/v3/ticker/24hr?type=MINI", {
      headers: { "User-Agent": "breakingout.xyz/1.0" },
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) throw new Error(`Binance 24h returned ${res.status}`)
    const rows = (await res.json()) as Array<{ symbol: string; q: string }>
    const clean = rows
      .filter((r) => r.symbol.endsWith("USDT"))
      .filter((r) => {
        const base = r.symbol.slice(0, -4)
        if (STABLECOIN_BASES.has(base)) return false
        if (LEVERAGED_RE.test(r.symbol)) return false
        // Skip obvious noise / pinned proxies
        if (base.includes("_")) return false
        return true
      })
      .map((r) => ({ symbol: r.symbol, vol: Number(r.q) || 0 }))
      .filter((r) => Number.isFinite(r.vol) && r.vol > 0)
      .sort((a, b) => b.vol - a.vol)
      .slice(0, limit)
      .map((r) => r.symbol)

    cache.data = clean
    cache.ts = Date.now()
    return clean
  } catch (err) {
    console.error("Binance top-N fetch:", err instanceof Error ? err.message : String(err))
    return cache?.data ?? []
  }
}
