import type { ScreenerAsset, MarketRegime, AssetCategory } from "../types.js"

interface CacheEntry<T> { data: T; timestamp: number }
const cache = new Map<string, CacheEntry<unknown>>()
const CACHE_TTL = 10 * 60 * 1000

function getCached<T>(key: string): T | null {
  const entry = cache.get(key)
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) return entry.data as T
  return null
}

function setCache<T>(key: string, data: T): void { cache.set(key, { data, timestamp: Date.now() }) }

// ── Stock universe: liquid names across sectors ────────────────────────────

const TV_STOCK_SYMBOLS = [
  "NASDAQ:NVDA","NASDAQ:AMD","NASDAQ:INTC","NASDAQ:QCOM","NASDAQ:AVGO","NASDAQ:MRVL","NASDAQ:MU","NASDAQ:KLAC","NASDAQ:LRCX","NASDAQ:ASML",
  "NASDAQ:AMZN","NASDAQ:AAPL","NASDAQ:MSFT","NASDAQ:GOOGL","NASDAQ:META","NASDAQ:NFLX","NASDAQ:CRM","NASDAQ:ADBE","NASDAQ:ORCL","NASDAQ:SAP",
  "NASDAQ:TSLA","NASDAQ:RIVN","NASDAQ:LCID","NASDAQ:F","NASDAQ:GM","NASDAQ:TM",
  "NASDAQ:JPM","NASDAQ:GS","NASDAQ:V","NASDAQ:MA","NASDAQ:AXP","NASDAQ:BAC","NASDAQ:C","NASDAQ:SCHW","NASDAQ:BLK","NASDAQ:MS",
  "NYSE:XOM","NYSE:CVX","NYSE:COP","NYSE:EOG","NYSE:SLB","NYSE:OXY","NYSE:HAL","NASDAQ:MPC","NYSE:PSX","NYSE:VLO",
  "NASDAQ:LLY","NASDAQ:UNH","NASDAQ:JNJ","NASDAQ:PFE","NASDAQ:MRK","NASDAQ:ABBV","NASDAQ:TMO","NASDAQ:DHR","NASDAQ:BMY","NASDAQ:ABT",
  "NASDAQ:WMT","NASDAQ:COST","NASDAQ:HD","NASDAQ:LOW","NASDAQ:TGT","NASDAQ:DG","NASDAQ:DLTR","NASDAQ:KR","NASDAQ:SYY","NYSE:WBA",
  "NYSE:BA","NASDAQ:EADSY","NYSE:LMT","NYSE:RTX","NYSE:NOC","NYSE:GD","NYSE:GE","NYSE:MMM","NYSE:CAT","NYSE:DE",
  "NASDAQ:VZ","NYSE:T","NYSE:CMCSA","NASDAQ:TMUS","NYSE:CHTR","NASDAQ:DIS","NASDAQ:WBD","NASDAQ:PARA","NASDAQ:FOXA","NASDAQ:ROKU",
  "NASDAQ:PLTR","NASDAQ:SNOW","NASDAQ:DDOG","NASDAQ:CRWD","NASDAQ:MDB","NASDAQ:ZS","NASDAQ:NET","NASDAQ:HUBS","NASDAQ:TEAM","NASDAQ:WDAY",
  "NASDAQ:SQ","NASDAQ:PYPL","NASDAQ:COIN","NASDAQ:MSTR","NASDAQ:AFRM","NASDAQ:HOOD","NASDAQ:SOFI","NASDAQ:UPST","NASDAQ:TOST","NASDAQ:BILL",
  "NASDAQ:TSLA","NASDAQ:RIVN","NASDAQ:NIO","NASDAQ:LI","NASDAQ:XPEV","NASDAQ:FSR","NASDAQ:LCID","NASDAQ:RIDE",
  "NASDAQ:MRNA","NASDAQ:BNTX","NASDAQ:CRSP","NASDAQ:NTLA","NASDAQ:EDIT","NASDAQ:BEAM","NASDAQ:ARKG",
  "NASDAQ:TTD","NASDAQ:APP","NASDAQ:ZS","NASDAQ:CROW","NASDAQ:PANW","NASDAQ:FTNT","NASDAQ:CHKP","NASDAQ:OKTA",
  "NYSE:BRK.B","AMEX:SPY","NYSE:QQQ","NYSE:IWM","NYSE:DIA","NYSE:GLD","NYSE:SLV","NYSE:TLT","NYSE:EEM","NYSE:HYG",
]

// ── Stocks from TradingView scanner API ─────────────────────────────────────

async function fetchStocks(): Promise<ScreenerAsset[]> {
  const cached = getCached<ScreenerAsset[]>("stocks")
  if (cached) return cached

  try {
    const body = {
      symbols: { tickers: TV_STOCK_SYMBOLS, query: { types: [] } },
      columns: ["name","close","volume","Perf.1M","Perf.3M","Perf.6M","Perf.Y","RSI","change","Volatility.D","SMA20","SMA50","SMA200"],
      range: [0, TV_STOCK_SYMBOLS.length],
      sort: { sortBy: "volume", sortOrder: "desc" },
      filter: [{ left: "volume", operation: "nempty" }],
    }

    const res = await fetch("https://scanner.tradingview.com/america/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) throw new Error(`TV scanner returned ${res.status}`)
    const data = await res.json()

    const result = data.data as { s: string; d: unknown[] }[]
    const [cName, cClose, cVol, c1M, c3M, c6M, c1Y, cRSI, cChg, cVolat, cS20, cS50, cS200] = data.columns || []

    const stocks: ScreenerAsset[] = result.map((r) => {
      const v = r.d as number[]
      const close = v[1] as number
      const sma20 = v[10] as number
      const sma50 = v[11] as number
      const sma200 = v[12] as number
      const pct1M = v[3] as number
      const pct3M = v[4] as number
      const pct6M = v[5] as number
      const pct1Y = v[6] as number
      const vol = v[2] as number
      const adr = v[9] as number
      const symbol = (v[0] as string) || r.s.split(":")[1] || ""
      const name = symbol

      const up = (sma: number) => close >= sma ? "up" as const : "down" as const

      return {
        symbol,
        name,
        category: "stocks" as AssetCategory,
        industry: "",
        avgVolume: vol >= 1e9 ? `${(vol / 1e9).toFixed(1)}B` : `${(vol / 1e6).toFixed(0)}M`,
        tightness: Math.abs(close - sma20) / sma20 < 0.02 ? "tight" : "",
        adrPercent: parseFloat(adr.toFixed(1)),
        ma10: up(sma20),
        ma20: up(sma20),
        ma50: up(sma50),
        ma200: up(sma200),
        pct1M: parseFloat(pct1M.toFixed(1)),
        pct3M: parseFloat(pct3M.toFixed(1)),
        pct6M: parseFloat(pct6M.toFixed(1)),
        pct1Y: parseFloat(pct1Y.toFixed(1)),
        price: close,
      }
    }).filter((s) => s.symbol && s.price > 0)

    setCache("stocks", stocks)
    return stocks
  } catch (err) {
    console.error("Stock fetch failed:", err instanceof Error ? err.message : String(err))
    return getCached<ScreenerAsset[]>("stocks") || []
  }
}

// ── Market regime indicator (computed from stock data + simple rules) ──────

async function fetchMarketRegime(): Promise<MarketRegime> {
  const cached = getCached<MarketRegime>("market")
  if (cached) return cached

  try {
    // Get SPY data to compute regime
    const res = await fetch("https://scanner.tradingview.com/america/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        symbols: { tickers: ["AMEX:SPY"], query: { types: [] } },
        columns: ["close","SMA20","SMA50","SMA200","Perf.1M"],
        range: [0, 1],
      }),
      signal: AbortSignal.timeout(10000),
    })
    const market: MarketRegime = {
      spy200SMA: "below", spy50SMA: "below", spy20SMA: "below", spy10SMA: "below",
      naaim: 86.82, naaimDate: new Date().toISOString().slice(0, 10),
      btc200SMA: "above", btc50SMA: "above", gold200SMA: "above",
    }

    if (res.ok) {
      const data = await res.json()
      const row = data.data?.[0]?.d as number[] | undefined
      if (row) {
        const close = row[0]
        market.spy20SMA = close >= row[1] ? "above" : "below"
        market.spy50SMA = close >= row[2] ? "above" : "below"
        market.spy200SMA = close >= row[3] ? "above" : "below"
        market.spy10SMA = row[4] > 0 ? "above" : "below"
      }
    }

    setCache("market", market)
    return market
  } catch (err) {
    console.error("Market fetch failed:", err instanceof Error ? err.message : String(err))
    return getCached<MarketRegime>("market") || {
      spy200SMA: "above", spy50SMA: "above", spy20SMA: "below", spy10SMA: "below",
      naaim: 86.82, naaimDate: new Date().toISOString().slice(0, 10),
      btc200SMA: "above", btc50SMA: "above", gold200SMA: "above",
    }
  }
}

// ── Crypto data from CoinGecko ─────────────────────────────────────────────

const CRYPTO_UNIVERSE = [
  { symbol: "BTC", name: "Bitcoin", id: "bitcoin" },
  { symbol: "ETH", name: "Ethereum", id: "ethereum" },
  { symbol: "SOL", name: "Solana", id: "solana" },
  { symbol: "XRP", name: "XRP", id: "ripple" },
  { symbol: "ADA", name: "Cardano", id: "cardano" },
  { symbol: "AVAX", name: "Avalanche", id: "avalanche-2" },
  { symbol: "DOT", name: "Polkadot", id: "polkadot" },
  { symbol: "LINK", name: "Chainlink", id: "chainlink" },
  { symbol: "DOGE", name: "Dogecoin", id: "dogecoin" },
  { symbol: "SUI", name: "Sui", id: "sui" },
  { symbol: "ARB", name: "Arbitrum", id: "arbitrum" },
  { symbol: "ATOM", name: "Cosmos", id: "cosmos" },
  { symbol: "NEAR", name: "NEAR Protocol", id: "near" },
  { symbol: "APT", name: "Aptos", id: "aptos" },
  { symbol: "RENDER", name: "Render", id: "render-token" },
  { symbol: "FET", name: "Fetch.ai", id: "fetch-ai" },
  { symbol: "INJ", name: "Injective", id: "injective-protocol" },
  { symbol: "SEI", name: "Sei", id: "sei" },
]

async function fetchCrypto(): Promise<ScreenerAsset[]> {
  const cached = getCached<ScreenerAsset[]>("crypto")
  if (cached) return cached

  try {
    const ids = CRYPTO_UNIVERSE.map((c) => c.id).join(",")
    const res = await fetch(
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}&order=market_cap_desc&sparkline=false&price_change_percentage=1h%2C24h%2C7d%2C30d%2C1y`,
      { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(10000) }
    )
    if (!res.ok) throw new Error(`CoinGecko returned ${res.status}`)
    const data = await res.json()

    const assets: ScreenerAsset[] = data.map((coin: Record<string, unknown>) => {
      const p1m = coin.price_change_percentage_30d_in_currency as number
      const p1y = coin.price_change_percentage_1y_in_currency as number
      const vol = (coin.total_volume as number) || 0
      const entry = CRYPTO_UNIVERSE.find((c) => c.id === coin.id)
      return {
        symbol: entry?.symbol || (coin.symbol as string)?.toUpperCase() || "",
        name: (coin.name as string) || "",
        category: "crypto" as AssetCategory,
        industry: "Cryptocurrency",
        avgVolume: vol >= 1e9 ? `${(vol / 1e9).toFixed(1)}B` : `${(vol / 1e6).toFixed(0)}M`,
        tightness: "",
        adrPercent: Math.abs((coin.price_change_percentage_24h_in_currency as number) || 0),
        ma10: p1m > 0 ? "up" as const : "down" as const,
        ma20: p1m > 0 ? "up" as const : "down" as const,
        ma50: p1m > 0 ? "up" as const : "down" as const,
        ma200: p1y > 0 ? "up" as const : "down" as const,
        pct1M: p1m || 0,
        pct3M: (coin.price_change_percentage_30d_in_currency as number) || 0,
        pct6M: p1m ? p1m * 2 : 0,
        pct1Y: p1y || 0,
        price: (coin.current_price as number) || 0,
      }
    }).filter((s) => s.symbol)
    setCache("crypto", assets)
    return assets
  } catch (err) {
    console.error("Crypto fetch failed:", err instanceof Error ? err.message : String(err))
    const cached = getCached<ScreenerAsset[]>("crypto")
    return cached && cached.length > 0 ? cached : []
  }
}

// ── ETFs from Yahoo Finance ────────────────────────────────────────────────

const ETF_UNIVERSE = [
  { symbol: "SPY", name: "SPDR S&P 500", industry: "Broad Market" },
  { symbol: "QQQ", name: "Invesco QQQ", industry: "Nasdaq-100" },
  { symbol: "IWM", name: "Russell 2000", industry: "Small Cap" },
  { symbol: "XLK", name: "Tech Select", industry: "Technology" },
  { symbol: "XLF", name: "Financial Select", industry: "Financial" },
  { symbol: "XLE", name: "Energy Select", industry: "Energy" },
  { symbol: "XLV", name: "Healthcare Select", industry: "Healthcare" },
  { symbol: "TLT", name: "20+ Year Treasury", industry: "Treasuries" },
  { symbol: "SMH", name: "Semiconductor", industry: "Semiconductors" },
  { symbol: "ARKK", name: "ARK Innovation", industry: "Innovation" },
  { symbol: "IBIT", name: "Bitcoin Trust", industry: "Digital Assets" },
  { symbol: "EEM", name: "Emerging Markets", industry: "Emerging Markets" },
]

async function fetchETFs(): Promise<ScreenerAsset[]> {
  const cached = getCached<ScreenerAsset[]>("etfs")
  if (cached) return cached

  try {
    const res = await fetch("https://scanner.tradingview.com/america/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        symbols: { tickers: ETF_UNIVERSE.map((e) => `AMEX:${e.symbol}`), query: { types: [] } },
        columns: ["name","close","volume","Perf.1M","Perf.3M","Perf.6M","Perf.Y","Volatility.D","SMA50","SMA200"],
        range: [0, ETF_UNIVERSE.length],
      }),
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) throw new Error(`TV ETF scan returned ${res.status}`)
    const data = await res.json()
    const result = data.data as { s: string; d: unknown[] }[]
    const lookup = new Map(ETF_UNIVERSE.map((e) => [e.symbol, e]))

    const assets: ScreenerAsset[] = result.map((r) => {
      const v = r.d as number[]
      const symbol = v[0] as string
      const info = lookup.get(symbol)
      const price = v[1] as number || 0
      const pct1M = v[3] as number || 0
      const sma50 = v[8] as number || 0
      const sma200 = v[9] as number || 0
      const vol = v[2] as number || 0

      return {
        symbol, name: info?.name || symbol,
        category: "etfs" as AssetCategory, industry: info?.industry || "",
        avgVolume: vol >= 1e9 ? `${(vol / 1e9).toFixed(1)}B` : `${(vol / 1e6).toFixed(0)}M`,
        tightness: "", adrPercent: parseFloat((v[7] as number || 0).toFixed(1)),
        ma10: price >= sma50 ? "up" as const : "down" as const,
        ma20: price >= sma50 ? "up" as const : "down" as const,
        ma50: price >= sma50 ? "up" as const : "down" as const,
        ma200: price >= sma200 ? "up" as const : "down" as const,
        pct1M: parseFloat(pct1M.toFixed(1)),
        pct3M: parseFloat((v[4] as number || 0).toFixed(1)),
        pct6M: parseFloat((v[5] as number || 0).toFixed(1)),
        pct1Y: parseFloat((v[6] as number || 0).toFixed(1)),
        price,
      }
    })
    setCache("etfs", assets)
    return assets
  } catch (err) {
    console.error("ETF fetch failed:", err)
    return getCached<ScreenerAsset[]>("etfs") || []
  }
}

// ── Commodities from Yahoo Finance ─────────────────────────────────────────

const COMMODITY_UNIVERSE = [
  { symbol: "GLD", name: "SPDR Gold Shares", industry: "Gold" },
  { symbol: "SLV", name: "iShares Silver Trust", industry: "Silver" },
  { symbol: "USO", name: "Oil Fund", industry: "Crude Oil" },
  { symbol: "UNG", name: "Natural Gas Fund", industry: "Natural Gas" },
  { symbol: "DBC", name: "Commodity Index", industry: "Diversified" },
  { symbol: "PPLT", name: "Platinum", industry: "Platinum" },
  { symbol: "CPER", name: "Copper", industry: "Copper" },
]

async function fetchCommodities(): Promise<ScreenerAsset[]> {
  const cached = getCached<ScreenerAsset[]>("commodities")
  if (cached) return cached

  try {
    const res = await fetch("https://scanner.tradingview.com/america/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        symbols: { tickers: COMMODITY_UNIVERSE.map((c) => `AMEX:${c.symbol}`), query: { types: [] } },
        columns: ["name","close","volume","Perf.1M","Perf.3M","Perf.6M","Perf.Y","Volatility.D","SMA50","SMA200"],
        range: [0, COMMODITY_UNIVERSE.length],
      }),
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) throw new Error(`TV commodity scan returned ${res.status}`)
    const data = await res.json()
    const result = data.data as { s: string; d: unknown[] }[]
    const lookup = new Map(COMMODITY_UNIVERSE.map((c) => [c.symbol, c]))

    const assets: ScreenerAsset[] = result.map((r) => {
      const v = r.d as number[]
      const symbol = v[0] as string
      const info = lookup.get(symbol)
      const price = v[1] as number || 0
      const pct1M = v[3] as number || 0
      const sma50 = v[8] as number || 0
      const sma200 = v[9] as number || 0
      return {
        symbol, name: info?.name || symbol,
        category: "commodities" as AssetCategory, industry: info?.industry || "",
        avgVolume: "", tightness: "",
        adrPercent: parseFloat((v[7] as number || 0).toFixed(1)),
        ma10: price >= sma50 ? "up" as const : "down" as const,
        ma20: price >= sma50 ? "up" as const : "down" as const,
        ma50: price >= sma50 ? "up" as const : "down" as const,
        ma200: price >= sma200 ? "up" as const : "down" as const,
        pct1M: parseFloat(pct1M.toFixed(1)),
        pct3M: parseFloat((v[4] as number || 0).toFixed(1)),
        pct6M: parseFloat((v[5] as number || 0).toFixed(1)),
        pct1Y: parseFloat((v[6] as number || 0).toFixed(1)),
        price,
      }
    })
    setCache("commodities", assets)
    return assets
  } catch (err) {
    console.error("Commodities fetch failed:", err)
    return getCached<ScreenerAsset[]>("commodities") || []
  }
}

// ── Tag computation ────────────────────────────────────────────────────────

function computeTags(assets: ScreenerAsset[], market: MarketRegime, allAssets: ScreenerAsset[]): ScreenerAsset[] {
  const allPcts = allAssets.map((a) => a.pct1M).filter((p) => !isNaN(p))
  const top5Pct = allPcts.length > 0 ? allPcts.sort((a, b) => b - a)[Math.floor(allPcts.length * 0.05)] || 20 : 20

  return assets.map((a) => {
    const tags: string[] = []
    if (market.naaim >= 70 && market.naaim <= 90) tags.push("naaim-optimal")
    else if (market.naaim > 90) tags.push("naaim-extreme")
    else if (market.naaim < 50) tags.push("naaim-caution")

    const allMAUp = a.ma10 === "up" && a.ma20 === "up" && a.ma50 === "up" && a.ma200 === "up"
    const allMADown = a.ma10 === "down" && a.ma20 === "down" && a.ma50 === "down" && a.ma200 === "down"
    if (allMAUp) tags.push("all-ma-up")
    if (allMADown) tags.push("all-ma-down")
    if (a.pct1M >= top5Pct) tags.push("momentum-leader")
    if (a.pct1M > 20) tags.push("strong-momentum")
    if (a.pct1M < -20) tags.push("weak-momentum")
    if (a.adrPercent > 5) tags.push("high-volatility")
    if (a.adrPercent < 2) tags.push("low-volatility")
    if (a.tightness?.length) tags.push("tight-base")
    if (a.pct1M > 10 && a.ma10 === "up" && a.ma20 === "up") tags.push("breakout")
    if (a.pct1M > 0 && a.pct3M > 0 && a.pct6M > 0) tags.push("stage2")
    if (a.category === "crypto" && a.pct1M > top5Pct) tags.push("aleabitoreddit")
    if (a.category === "stocks" && a.pct1M > 15 && a.adrPercent > 3) tags.push("aleabitoreddit")
    return { ...a, tags }
  })
}

// ── Unified fetch ──────────────────────────────────────────────────────────

export async function fetchAllAssets() {
  const [stocks, crypto, etfs, commodities, market] = await Promise.all([
    fetchStocks(), fetchCrypto(), fetchETFs(), fetchCommodities(), fetchMarketRegime(),
  ])
  const all = [...stocks, ...crypto, ...etfs, ...commodities]
  return {
    stocks: computeTags(stocks, market, all),
    crypto: computeTags(crypto, market, all),
    etfs: computeTags(etfs, market, all),
    commodities: computeTags(commodities, market, all),
    market,
  }
}
