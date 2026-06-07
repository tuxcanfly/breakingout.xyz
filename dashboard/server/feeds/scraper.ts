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

// ── Stock universe + industry mapping ─────────────────────────────────────

const TV_STOCKS = [
  // Semiconductors
  "NASDAQ:NVDA","NASDAQ:AMD","NASDAQ:INTC","NASDAQ:AVGO","NASDAQ:QCOM","NASDAQ:MRVL",
  "NASDAQ:MU","NASDAQ:KLAC","NASDAQ:LRCX","NASDAQ:ASML","NASDAQ:AMAT","NASDAQ:SWKS",
  "NASDAQ:QRVO","NASDAQ:WOLF","NASDAQ:ON","NASDAQ:STM","NASDAQ:TSM",
  // Mega-cap tech
  "NASDAQ:AAPL","NASDAQ:MSFT","NASDAQ:GOOGL","NASDAQ:AMZN","NASDAQ:META","NASDAQ:NFLX",
  // Software
  "NASDAQ:CRM","NASDAQ:ADBE","NASDAQ:ORCL","NASDAQ:SAP","NASDAQ:INTU","NASDAQ:NOW",
  "NASDAQ:WDAY","NASDAQ:TEAM","NASDAQ:HUBS","NASDAQ:ZS","NASDAQ:NET","NASDAQ:DDOG",
  "NASDAQ:MDB","NASDAQ:CRWD","NASDAQ:PANW","NASDAQ:FTNT","NASDAQ:CHKP","NASDAQ:OKTA",
  "NASDAQ:SNOW","NASDAQ:PLTR","NASDAQ:APP","NASDAQ:TTD",
  // EVs & Auto
  "NASDAQ:TSLA","NASDAQ:RIVN","NASDAQ:LCID","NYSE:F","NYSE:GM","STLO:TM",
  "NASDAQ:NIO","NASDAQ:LI","NASDAQ:XPEV","NASDAQ:FSR",
  // Financials
  "NYSE:JPM","NYSE:GS","NYSE:MS","NYSE:BAC","NYSE:C","NYSE:WFC",
  "NASDAQ:V","NASDAQ:MA","NYSE:AXP","NYSE:BLK","NYSE:SCHW","NASDAQ:SQ",
  "NASDAQ:PYPL","NASDAQ:COIN","NASDAQ:HOOD","NASDAQ:MSTR","NASDAQ:SOFI",
  // Energy
  "NYSE:XOM","NYSE:CVX","NYSE:COP","NYSE:EOG","NYSE:SLB","NYSE:OXY","NYSE:HAL",
  "NYSE:MPC","NYSE:PSX","NYSE:VLO","NYSE:KMI","NYSE:WMB","NYSE:OKE",
  // Healthcare
  "NASDAQ:LLY","NASDAQ:UNH","NYSE:JNJ","NYSE:PFE","NYSE:MRK","NYSE:ABBV",
  "NASDAQ:TMO","NYSE:DHR","NYSE:BMY","NYSE:ABT","NASDAQ:ISRG","NASDAQ:VRTX",
  "NASDAQ:REGN","NASDAQ:GILD","NASDAQ:MRNA","NASDAQ:BNTX","NASDAQ:CRSP",
  // Retail & Consumer
  "NYSE:WMT","NASDAQ:COST","NYSE:HD","NYSE:LOW","NYSE:TGT","NYSE:DG",
  "NASDAQ:DLTR","NYSE:KR","NYSE:SYY","NYSE:WBA","NYSE:SBUX","NYSE:MCD",
  "NYSE:NKE","NASDAQ:LULU","NYSE:CMG","NYSE:YUM","NYSE:GIS","NYSE:K",
  // Industrial & Defense
  "NYSE:BA","NYSE:LMT","NYSE:RTX","NYSE:NOC","NYSE:GD","NYSE:GE",
  "NYSE:MMM","NYSE:CAT","NYSE:DE","NYSE:HON","NYSE:UPS","NYSE:FDX",
  "NYSE:CSX","NYSE:NSC","NYSE:UNP",
  // Telecom & Media
  "NYSE:VZ","NYSE:T","NYSE:CMCSA","NASDAQ:TMUS","NYSE:CHTR",
  "NASDAQ:DIS","NYSE:NWSA","NASDAQ:FOXA","NASDAQ:ROKU","NASDAQ:SPOT",
  // Biotech & Pharma
  "NASDAQ:AMGN","NASDAQ:BIIB","NASDAQ:ILMN","NASDAQ:NTLA","NASDAQ:EDIT",
  "NASDAQ:BEAM","NASDAQ:VCYT","NASDAQ:EXAS","NASDAQ:GH",
  // REITs
  "NYSE:PLD","NYSE:AMT","NYSE:EQIX","NYSE:DLR","NYSE:O","NYSE:SPG",
  // SPACs & Special
  "NYSE:BRK.B","NYSE:SPY","NASDAQ:ARKK","NASDAQ:ARKW","NASDAQ:ARKG",
  // High-growth momentum names
  "NASDAQ:UPST","NASDAQ:AFRM","NASDAQ:TOST","NASDAQ:BILL",
  "NASDAQ:CROW","NASDAQ:TENB","NASDAQ:QLYS","NASDAQ:SENT",
  "NASDAQ:VKTX","NASDAQ:ALAB","NASDAQ:ASTS","NASDAQ:GSAT",
  "NASDAQ:IONQ","NASDAQ:QBTS","NASDAQ:RGTI","NASDAQ:SMCI",
  "NASDAQ:ANET","NASDAQ:CIEN","NASDAQ:JNPR","NASDAQ:KEYS",
  "NASDAQ:WDC","NASDAQ:NICE","NASDAQ:SPLK","NASDAQ:VRSN",
  "NASDAQ:ENPH","NASDAQ:SEDG","NASDAQ:PLUG","NASDAQ:FCEL",
  "NASDAQ:FSLR","NASDAQ:ARRY","NASDAQ:NOVA","NASDAQ:VFS",
  // Additional liquid names
  "NYSE:PCG","NYSE:SO","NYSE:DUK","NYSE:NEE","NYSE:AEP",
  "NYSE:D","NYSE:EXC","NYSE:XEL","NYSE:ED","NYSE:WEC",
  "NYSE:MCK","NYSE:ABC","NYSE:CAH","NASDAQ:ICLR","NYSE:IQV",
  "NYSE:MMC","NYSE:AON","NYSE:BRO","NYSE:AJGAJ","NYSE:WLTW",
  "NASDAQ:CHWY","NYSE:DASH","NYSE:U","NYSE:PINS","NYSE:SNAP",
  "NASDAQ:W","NASDAQ:ETSY","NASDAQ:PTON","NASDAQ:ZM","NYSE:LYFT",
  "NASDAQ:UBER","NASDAQ:DKNG","NASDAQ:PENN","NASDAQ:MGM","NYSE:CZR",
]

// ── ETF universe ──────────────────────────────────────────────────────────

const TV_ETFS = [
  "AMEX:SPY","AMEX:QQQ","AMEX:IWM","AMEX:DIA","AMEX:VTI","AMEX:VOO",
  "AMEX:XLK","AMEX:XLF","AMEX:XLE","AMEX:XLV","AMEX:XLI","AMEX:XLU",
  "AMEX:XLP","AMEX:XLRE","AMEX:XLB","AMEX:XLY",
  "AMEX:SMH","AMEX:SOXX","AMEX:IBB","AMEX:ARKK","AMEX:ARKW","AMEX:ARKG",
  "AMEX:TLT","AMEX:IEF","AMEX:SHY","AMEX:BND","AMEX:AGG",
  "AMEX:HYG","AMEX:LQD","AMEX:JNK",
  "AMEX:EEM","AMEX:VWO","AMEX:FXI","AMEX:EWJ","AMEX:EFA",
  "AMEX:GDX","AMEX:GDXJ","AMEX:SLV","AMEX:USO","AMEX:UNG",
  "AMEX:IBIT","AMEX:FBTC","AMEX:ETHU",
  "AMEX:VTI","AMEX:VXUS","AMEX:BNDX","AMEX:VTIP",
  "AMEX:TAN","AMEX:ICLN","AMEX:QCLN","AMEX:PBW",
  "AMEX:VDE","AMEX:VFH","AMEX:VHT","AMEX:VGT","AMEX:VNQ",
  "AMEX:VWO","AMEX:BKLN","AMEX:HYLB","AMEX:SJNK",
]

// ── Commodity universe ────────────────────────────────────────────────────

const TV_COMMODITIES = [
  "AMEX:GLD","AMEX:SLV","AMEX:USO","AMEX:UNG","AMEX:DBC",
  "AMEX:PPLT","AMEX:PALL","AMEX:CPER","AMEX:WEAT","AMEX:CORN",
  "AMEX:SOYB","AMEX:CANE","AMEX:COW","AMEX:BAL","AMEX:CAFE",
  "AMEX:SGG","AMEX:JO","AMEX:NIB","AMEX:DBA","AMEX:JJG",
]

// ── Crypto universe ────────────────────────────────────────────────────────

const TV_CRYPTO = [
  "BINANCE:BTCUSDT","BINANCE:ETHUSDT","BINANCE:SOLUSDT","BINANCE:XRPUSDT",
  "BINANCE:ADAUSDT","BINANCE:AVAXUSDT","BINANCE:DOTUSDT","BINANCE:LINKUSDT",
  "BINANCE:DOGEUSDT","BINANCE:SUIUSDT","BINANCE:ARBUSDT","BINANCE:OPUSDT",
  "BINANCE:ATOMUSDT","BINANCE:NEARUSDT","BINANCE:APTUSDT","BINANCE:FETUSDT",
  "BINANCE:INJUSDT","BINANCE:SEIUSDT","BINANCE:TIAUSDT",
]

// ── Helper: TV scanner call ────────────────────────────────────────────────

const TV_COLS = ["name","close","volume","Perf.1M","Perf.3M","Perf.6M","Perf.Y","Volatility.D","SMA20","SMA50","SMA200","RSI","change"]

async function scanTV(endpoint: string, tickers: string[]): Promise<{ symbol: string; v: number[] }[]> {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ symbols: { tickers, query: { types: [] } }, columns: TV_COLS, range: [0, tickers.length] }),
    signal: AbortSignal.timeout(15000),
  })
  if (!res.ok) throw new Error(`TV ${endpoint} returned ${res.status}`)
  const data = await res.json()
  return (data.data as { s: string; d: unknown[] }[]).map((r) => ({ symbol: r.s.split(":")[1] || r.s, v: r.d as number[] }))
}

function makeAsset(symbol: string, v: number[], cat: AssetCategory, name?: string, industry?: string): ScreenerAsset {
  const close = v[1] as number || 0
  const pct1M = v[3] as number || 0
  const pct3M = v[4] as number || 0
  const pct6M = v[5] as number || 0
  const pct1Y = v[6] as number || 0
  const adr = v[7] as number || 0
  const sma20 = v[8] as number || 0
  const sma50 = v[9] as number || 0
  const sma200 = v[10] as number || 0
  const vol = v[2] as number || 0
  const up = (s: number) => close >= s ? "up" as const : "down" as const
  return {
    symbol, name: name || symbol, category: cat, industry: industry || "",
    avgVolume: vol >= 1e9 ? `${(vol / 1e9).toFixed(1)}B` : `${(vol / 1e6).toFixed(0)}M`,
    tightness: sma20 > 0 && Math.abs(close - sma20) / sma20 < 0.02 ? "tight" : "",
    adrPercent: parseFloat(adr.toFixed(1)),
    ma10: up(sma20), ma20: up(sma20), ma50: up(sma50), ma200: up(sma200),
    pct1M: parseFloat(pct1M.toFixed(1)), pct3M: parseFloat(pct3M.toFixed(1)),
    pct6M: parseFloat(pct6M.toFixed(1)), pct1Y: parseFloat(pct1Y.toFixed(1)),
    price: close,
  }
}

// ── Stock fetcher ──────────────────────────────────────────────────────────

async function fetchStocks(): Promise<ScreenerAsset[]> {
  const cached = getCached<ScreenerAsset[]>("stocks")
  if (cached) return cached
  try {
    const rows = await scanTV("https://scanner.tradingview.com/america/scan", TV_STOCKS)
    const assets = rows.filter((r) => r.v[1] > 0).map((r) => makeAsset(r.symbol, r.v, "stocks"))
    setCache("stocks", assets)
    return assets
  } catch (err) {
    console.error("Stocks fetch:", err instanceof Error ? err.message : String(err))
    return getCached<ScreenerAsset[]>("stocks") || []
  }
}

// ── ETF fetcher ────────────────────────────────────────────────────────────

async function fetchETFs(): Promise<ScreenerAsset[]> {
  const cached = getCached<ScreenerAsset[]>("etfs")
  if (cached) return cached
  try {
    const rows = await scanTV("https://scanner.tradingview.com/america/scan", TV_ETFS)
    const assets = rows.filter((r) => r.v[1] > 0).map((r) => makeAsset(r.symbol, r.v, "etfs"))
    setCache("etfs", assets)
    return assets
  } catch (err) {
    console.error("ETFs fetch:", err)
    return getCached<ScreenerAsset[]>("etfs") || []
  }
}

// ── Commodity fetcher ──────────────────────────────────────────────────────

async function fetchCommodities(): Promise<ScreenerAsset[]> {
  const cached = getCached<ScreenerAsset[]>("commodities")
  if (cached) return cached
  try {
    const rows = await scanTV("https://scanner.tradingview.com/america/scan", TV_COMMODITIES)
    const assets = rows.filter((r) => r.v[1] > 0).map((r) => makeAsset(r.symbol, r.v, "commodities"))
    setCache("commodities", assets)
    return assets
  } catch (err) {
    console.error("Commodities fetch:", err)
    return getCached<ScreenerAsset[]>("commodities") || []
  }
}

// ── Crypto fetcher (TradingView crypto scanner) ────────────────────────────

async function fetchCrypto(): Promise<ScreenerAsset[]> {
  const cached = getCached<ScreenerAsset[]>("crypto")
  if (cached) return cached
  try {
    const rows = await scanTV("https://scanner.tradingview.com/crypto/scan", TV_CRYPTO)
    const assets = rows.filter((r) => r.v[1] > 0).map((r) => {
      const raw = r.symbol.replace("USDT", "").replace("PERP", "")
      return makeAsset(raw, r.v, "crypto", raw)
    })
    setCache("crypto", assets)
    return assets
  } catch (err) {
    console.error("Crypto fetch:", err instanceof Error ? err.message : String(err))
    return getCached<ScreenerAsset[]>("crypto") || []
  }
}

// ── Market regime ──────────────────────────────────────────────────────────

async function fetchMarketRegime(): Promise<MarketRegime> {
  const cached = getCached<MarketRegime>("market")
  if (cached) return cached
  try {
    const rows = await scanTV("https://scanner.tradingview.com/america/scan", ["AMEX:SPY"])
    const m: MarketRegime = {
      spy200SMA: "below", spy50SMA: "below", spy20SMA: "below", spy10SMA: "below",
      naaim: 86.82, naaimDate: new Date().toISOString().slice(0, 10),
      btc200SMA: "above", btc50SMA: "above", gold200SMA: "above",
    }
    if (rows.length) {
      const v = rows[0].v
      const close = v[1] as number
      m.spy20SMA = close >= (v[8] as number) ? "above" : "below"
      m.spy50SMA = close >= (v[9] as number) ? "above" : "below"
      m.spy200SMA = close >= (v[10] as number) ? "above" : "below"
      m.spy10SMA = (v[3] as number) > 0 ? "above" : "below"
    }
    setCache("market", m)
    return m
  } catch (err) {
    console.error("Market fetch:", err)
    return getCached<MarketRegime>("market") || {
      spy200SMA: "above", spy50SMA: "above", spy20SMA: "below", spy10SMA: "below",
      naaim: 86.82, naaimDate: new Date().toISOString().slice(0, 10),
      btc200SMA: "above", btc50SMA: "above", gold200SMA: "above",
    }
  }
}

// ── Tags ───────────────────────────────────────────────────────────────────

function computeTags(assets: ScreenerAsset[], market: MarketRegime, allAssets: ScreenerAsset[]): ScreenerAsset[] {
  const pcts = allAssets.map((a) => a.pct1M).filter((p) => !isNaN(p))
  const top5 = pcts.length ? pcts.sort((a, b) => b - a)[Math.floor(pcts.length * 0.05)] || 20 : 20
  return assets.map((a) => {
    const t: string[] = []
    if (market.naaim >= 70 && market.naaim <= 90) t.push("naaim-optimal")
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
    if (a.category === "crypto" && a.pct1M > top5) t.push("aleabitoreddit")
    if (a.category === "stocks" && a.pct1M > 15 && a.adrPercent > 3) t.push("aleabitoreddit")
    return { ...a, tags: t }
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
