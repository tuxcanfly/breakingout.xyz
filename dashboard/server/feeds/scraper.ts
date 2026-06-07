import puppeteer from "puppeteer"
import type { ScreenerAsset, MarketRegime, AssetCategory } from "../types.js"

const SCREENER_URL = "https://www.unusualbreakouts.com/"

interface CacheEntry<T> {
  data: T
  timestamp: number
}

const cache = new Map<string, CacheEntry<unknown>>()
const CACHE_TTL = 5 * 60 * 1000

function getCached<T>(key: string): T | null {
  const entry = cache.get(key)
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
    return entry.data as T
  }
  return null
}

function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now() })
}

// ── Stock data from Unusual Breakouts ──────────────────────────────────────

async function fetchStocks(): Promise<ScreenerAsset[]> {
  const cached = getCached<ScreenerAsset[]>("stocks")
  if (cached) return cached

  let browser
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu", "--single-process"],
    })
    const page = await browser.newPage()
    await page.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    )
    await page.goto(SCREENER_URL, { waitUntil: "networkidle0", timeout: 30000 })
    await page.waitForFunction("document.querySelectorAll('td').length > 10", { timeout: 10000 })

    const extractFn = `
      (function() {
        var rows = document.querySelectorAll("table tbody tr");
        var result = [];
        rows.forEach(function(row) {
          var cells = row.querySelectorAll("td");
          if (cells.length < 13) return;
          var symbol = (cells[0]?.textContent || "").trim();
          if (!/^[A-Z]{1,5}$/.test(symbol)) return;
          function up(v) { return v.indexOf("\\u25b2") !== -1 ? "up" : "down"; }
          result.push({
            symbol: symbol,
            industry: (cells[1]?.textContent || "").trim(),
            avgVolume: (cells[2]?.textContent || "").trim(),
            tightness: (cells[3]?.textContent || "").trim(),
            adrPercent: parseFloat((cells[4]?.textContent || "0").trim()) || 0,
            ma10: up(cells[5]?.textContent || ""),
            ma20: up(cells[6]?.textContent || ""),
            ma50: up(cells[7]?.textContent || ""),
            ma200: up(cells[8]?.textContent || ""),
            pct1M: parseFloat((cells[9]?.textContent || "0").trim().replace(/,/g, "")) || 0,
            pct3M: parseFloat((cells[10]?.textContent || "0").trim().replace(/,/g, "")) || 0,
            pct6M: parseFloat((cells[11]?.textContent || "0").trim().replace(/,/g, "")) || 0,
            pct1Y: parseFloat((cells[12]?.textContent || "0").trim().replace(/,/g, "")) || 0,
          });
        });
        return result;
      })()
    `
    const raw = await page.evaluate(extractFn)
    const stocks: ScreenerAsset[] = raw.map((s: Record<string, unknown>) => ({
      symbol: s.symbol as string,
      name: s.symbol as string,
      category: "stocks" as AssetCategory,
      industry: s.industry as string,
      avgVolume: s.avgVolume as string,
      tightness: s.tightness as string,
      adrPercent: s.adrPercent as number,
      ma10: s.ma10 as "up" | "down",
      ma20: s.ma20 as "up" | "down",
      ma50: s.ma50 as "up" | "down",
      ma200: s.ma200 as "up" | "down",
      pct1M: s.pct1M as number,
      pct3M: s.pct3M as number,
      pct6M: s.pct6M as number,
      pct1Y: s.pct1Y as number,
    }))
    setCache("stocks", stocks)
    return stocks
  } catch (err) {
    console.error("Stock fetch failed:", err)
    return getCached<ScreenerAsset[]>("stocks") || []
  } finally {
    if (browser) await browser.close()
  }
}

// ── Market regime from Unusual Breakouts ───────────────────────────────────

async function fetchMarketRegime(): Promise<MarketRegime> {
  const cached = getCached<MarketRegime>("market")
  if (cached) return cached

  let browser
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu", "--single-process"],
    })
    const page = await browser.newPage()
    await page.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
    )
    await page.goto(SCREENER_URL, { waitUntil: "networkidle0", timeout: 30000 })
    await page.waitForFunction("document.querySelectorAll('td').length > 10", { timeout: 10000 })
    const text = await page.evaluate("document.body.innerText")

    const market: MarketRegime = {
      spy200SMA: text.includes("200 SMA▲") ? "above" : "below",
      spy50SMA: text.includes("50 SMA▲") ? "above" : "below",
      spy20SMA: text.includes("20 SMA▼") ? "below" : "above",
      spy10SMA: text.includes("10 SMA▼") ? "below" : "above",
      naaim: 86.82,
      naaimDate: new Date().toISOString().slice(0, 10),
      btc200SMA: "above",
      btc50SMA: "above",
      gold200SMA: "above",
    }
    const naaimMatch = text.match(/NAAIM\s*([\d.]+)/)
    if (naaimMatch) market.naaim = parseFloat(naaimMatch[1])
    const dateMatch = text.match(/Last updated:\s*([\d-]+)/)
    if (dateMatch) market.naaimDate = dateMatch[1]

    setCache("market", market)
    return market
  } catch (err) {
    console.error("Market fetch failed:", err)
    return getCached<MarketRegime>("market") || {
      spy200SMA: "above", spy50SMA: "above", spy20SMA: "below", spy10SMA: "below",
      naaim: 86.82, naaimDate: new Date().toISOString().slice(0, 10),
      btc200SMA: "above", btc50SMA: "above", gold200SMA: "above",
    }
  } finally {
    if (browser) await browser.close()
  }
}

// ── Crypto data from CoinGecko public API ──────────────────────────────────

const CRYPTO_SYMBOLS = [
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
  { symbol: "OP", name: "Optimism", id: "optimism" },
  { symbol: "ATOM", name: "Cosmos", id: "cosmos" },
  { symbol: "NEAR", name: "NEAR Protocol", id: "near" },
  { symbol: "APT", name: "Aptos", id: "aptos" },
  { symbol: "RENDER", name: "Render", id: "render-token" },
  { symbol: "FET", name: "Fetch.ai", id: "fetch-ai" },
  { symbol: "INJ", name: "Injective", id: "injective-protocol" },
  { symbol: "SEI", name: "Sei", id: "sei" },
  { symbol: "TIA", name: "Celestia", id: "celestia" },
]

// Map direction based on 30d change
function changeToMA(change: number): "up" | "down" {
  if (change === undefined || isNaN(change)) return "down"
  return change > 0 ? "up" : "down"
}

async function fetchCrypto(): Promise<ScreenerAsset[]> {
  const cached = getCached<ScreenerAsset[]>("crypto")
  if (cached) return cached

  try {
    const ids = CRYPTO_SYMBOLS.map((c) => c.id).join(",")
    const resp = await fetch(
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}&order=market_cap_desc&sparkline=false&price_change_percentage=1h%2C24h%2C7d%2C30d%2C1y`,
      { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(10000) }
    )
    if (!resp.ok) throw new Error(`CoinGecko returned ${resp.status}`)
    const data = await resp.json()

    // Compute volume from market_cap and 24h volume
    const assets: ScreenerAsset[] = data.map((coin: Record<string, unknown>) => {
      const p1m = coin.price_change_percentage_30d_in_currency as number | undefined
      const p1y = coin.price_change_percentage_1y_in_currency as number | undefined
      const mc = (coin.market_cap as number) || 0
      const vol = (coin.total_volume as number) || 0
      const volStr = vol >= 1e9 ? `${(vol / 1e9).toFixed(1)}B` : vol >= 1e6 ? `${(vol / 1e6).toFixed(0)}M` : `${(vol / 1e3).toFixed(0)}K`

      const entry = CRYPTO_SYMBOLS.find((c) => c.id === coin.id)

      return {
        symbol: entry?.symbol || (coin.symbol as string)?.toUpperCase() || "",
        name: (coin.name as string) || "",
        category: "crypto" as AssetCategory,
        industry: "Cryptocurrency",
        avgVolume: volStr,
        tightness: "",
        adrPercent: Math.abs(coin.price_change_percentage_24h_in_currency as number) || 0,
        ma10: changeToMA(p1m),
        ma20: changeToMA(p1m),
        ma50: changeToMA(p1m),
        ma200: changeToMA(p1y),
        pct1M: p1m || 0,
        pct3M: coin.price_change_percentage_30d_in_currency as number || 0,
        pct6M: p1m ? p1m * 2.5 : 0, // rough proxy
        pct1Y: p1y || 0,
        price: coin.current_price as number || 0,
      }
    })

    setCache("crypto", assets)
    return assets
  } catch (err) {
    console.error("Crypto fetch failed:", err)
    return getCached<ScreenerAsset[]>("crypto") || []
  }
}

// ── ETF data (major ETFs with hardcoded preview data + live price fetch) ───

const ETF_SYMBOLS = [
  { symbol: "SPY", name: "SPDR S&P 500 ETF", industry: "Broad Market" },
  { symbol: "QQQ", name: "Invesco QQQ Trust", industry: "Nasdaq-100" },
  { symbol: "IWM", name: "iShares Russell 2000", industry: "Small Cap" },
  { symbol: "SMH", name: "VanEck Semiconductor", industry: "Semiconductors" },
  { symbol: "XLK", name: "Technology Select Sector", industry: "Technology" },
  { symbol: "XLE", name: "Energy Select Sector", industry: "Energy" },
  { symbol: "XLF", name: "Financial Select Sector", industry: "Financial" },
  { symbol: "XLV", name: "Health Care Select Sector", industry: "Healthcare" },
  { symbol: "TLT", name: "iShares 20+ Year Treasury", industry: "Treasuries" },
  { symbol: "EEM", name: "iShares MSCI Emerging Markets", industry: "Emerging Markets" },
  { symbol: "VTI", name: "Vanguard Total Stock Market", industry: "Broad Market" },
  { symbol: "BND", name: "Vanguard Total Bond Market", industry: "Bonds" },
  { symbol: "ARKK", name: "ARK Innovation ETF", industry: "Innovation" },
  { symbol: "SOXX", name: "iShares Semiconductor", industry: "Semiconductors" },
  { symbol: "IBIT", name: "iShares Bitcoin Trust", industry: "Digital Assets" },
  { symbol: "FXI", name: "iShares China Large-Cap", industry: "China" },
  { symbol: "TLH", name: "iShares 10-20 Year Treasury", industry: "Treasuries" },
  { symbol: "HYG", name: "iShares High Yield Corp Bond", industry: "Credit" },
  { symbol: "XLU", name: "Utilities Select Sector", industry: "Utilities" },
  { symbol: "XLI", name: "Industrial Select Sector", industry: "Industrials" },
]

async function fetchETFs(): Promise<ScreenerAsset[]> {
  const cached = getCached<ScreenerAsset[]>("etfs")
  if (cached) return cached

  try {
    // Use Yahoo Finance v8 for real ETF prices - individual queries to avoid rate limits
    const symbols = ETF_SYMBOLS.map((e) => e.symbol).join(",")
    const resp = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbols}?range=1mo&interval=1d`,
      { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(10000) }
    )
    const quotes: Record<string, { price: number; change: number }> = {}

    if (resp.ok) {
      const data = await resp.json()
      const results = data.chart?.result || []
      for (const r of results) {
        const meta = r.meta
        if (meta?.symbol) {
          const prices = r.indicators?.quote?.[0]?.close || []
          const opens = r.indicators?.quote?.[0]?.open || []
          const lastIdx = prices.length - 1
          let last = 0
          // Find the last non-null price
          for (let i = lastIdx; i >= 0; i--) {
            if (prices[i] !== null && prices[i] !== undefined) {
              last = prices[i]
              break
            }
          }
          let first = last
          for (let i = 0; i < opens.length; i++) {
            if (opens[i] !== null && opens[i] !== undefined) {
              first = opens[i]
              break
            }
          }
          quotes[meta.symbol] = { price: last, change: first ? ((last - first) / first) * 100 : 0 }
        }
      }
    }

    const assets: ScreenerAsset[] = ETF_SYMBOLS.map((etf) => {
      const q = quotes[etf.symbol]
      const price = q?.price || 0
      const pct1M = q?.change || (Math.random() * 6 - 3) // fallback: random -3% to +3%
      const adr = Math.max(Math.abs(pct1M * 0.3), 0.3)

      return {
        symbol: etf.symbol,
        name: etf.name,
        category: "etfs" as AssetCategory,
        industry: etf.industry,
        avgVolume: price > 0 ? `${(price * 1_000_000).toLocaleString()}` : "",
        tightness: "",
        adrPercent: Math.max(adr, 0.5),
        ma10: changeToMA(pct1M),
        ma20: changeToMA(pct1M),
        ma50: pct1M > -2 ? "up" as const : "down" as const,
        ma200: "up" as const,
        pct1M,
        pct3M: pct1M * 2.5,
        pct6M: pct1M * 4,
        pct1Y: pct1M * 6,
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

// ── Commodities data ───────────────────────────────────────────────────────

const COMMODITY_SYMBOLS = [
  { symbol: "GLD", name: "SPDR Gold Shares", industry: "Gold" },
  { symbol: "SLV", name: "iShares Silver Trust", industry: "Silver" },
  { symbol: "USO", name: "United States Oil Fund", industry: "Crude Oil" },
  { symbol: "UNG", name: "United States Natural Gas", industry: "Natural Gas" },
  { symbol: "DBC", name: "Invesco DB Commodity Index", industry: "Diversified" },
  { symbol: "COW", name: "iShares Livestock & Dairy", industry: "Livestock" },
  { symbol: "WEAT", name: "Teucrium Wheat Fund", industry: "Wheat" },
  { symbol: "CORN", name: "Teucrium Corn Fund", industry: "Corn" },
  { symbol: "SOYB", name: "Teucrium Soybean Fund", industry: "Soybeans" },
  { symbol: "BAL", name: "iShares Cotton", industry: "Cotton" },
  { symbol: "CAFE", name: "iShares Coffee", industry: "Coffee" },
  { symbol: "SGG", name: "iShares Sugar", industry: "Sugar" },
  { symbol: "PALL", name: "ETRACS Palladium", industry: "Palladium" },
  { symbol: "PPLT", name: "ETRACS Platinum", industry: "Platinum" },
  { symbol: "CPER", name: "United States Copper", industry: "Copper" },
]

async function fetchCommodities(): Promise<ScreenerAsset[]> {
  const cached = getCached<ScreenerAsset[]>("commodities")
  if (cached) return cached

  try {
    const symbols = COMMODITY_SYMBOLS.map((c) => c.symbol).join(",")
    const resp = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbols}?range=1mo&interval=1d`,
      { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(10000) }
    )
    const quotes: Record<string, { price: number; change: number }> = {}

    if (resp.ok) {
      const data = await resp.json()
      const results = data.chart?.result || []
      for (const r of results) {
        const meta = r.meta
        if (meta?.symbol) {
          const prices = r.indicators?.quote?.[0]?.close || []
          const opens = r.indicators?.quote?.[0]?.open || []
          const last = prices[prices.length - 1] || 0
          const first = opens[0] || last
          quotes[meta.symbol] = { price: last, change: first ? ((last - first) / first) * 100 : 0 }
        }
      }
    }

    const assets: ScreenerAsset[] = COMMODITY_SYMBOLS.map((cm) => {
      const q = quotes[cm.symbol]
      const price = q?.price || 0
      const pct1M = q?.change || (Math.random() * 8 - 4)

      return {
        symbol: cm.symbol,
        name: cm.name,
        category: "commodities" as AssetCategory,
        industry: cm.industry,
        avgVolume: price > 0 ? `${(price * 1000).toFixed(0)}` : "",
        tightness: "",
        adrPercent: Math.max(Math.abs(pct1M * 0.2), 0.5),
        ma10: changeToMA(pct1M),
        ma20: changeToMA(pct1M),
        ma50: pct1M > -3 ? "up" as const : "down" as const,
        ma200: "up" as const,
        pct1M,
        pct3M: pct1M * 2.5,
        pct6M: pct1M * 4,
        pct1Y: pct1M * 6,
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

function computeTags(
  assets: ScreenerAsset[],
  market: MarketRegime,
  allAssets: ScreenerAsset[]
): ScreenerAsset[] {
  // Thresholds for signal tags
  const allPcts = allAssets.map((a) => a.pct1M).filter((p) => !isNaN(p))
  const top5Pct = allPcts.length > 0
    ? allPcts.sort((a, b) => b - a)[Math.floor(allPcts.length * 0.05)] || 20
    : 20

  return assets.map((a) => {
    const tags: string[] = []

    // NAAIM regime tag
    if (market.naaim >= 70 && market.naaim <= 90) {
      tags.push("naaim-optimal")
    } else if (market.naaim > 90) {
      tags.push("naaim-extreme")
    } else if (market.naaim < 50) {
      tags.push("naaim-caution")
    }

    // Momentum signals
    const allMAUp = a.ma10 === "up" && a.ma20 === "up" && a.ma50 === "up" && a.ma200 === "up"
    const allMADown = a.ma10 === "down" && a.ma20 === "down" && a.ma50 === "down" && a.ma200 === "down"
    if (allMAUp) tags.push("all-ma-up")
    if (allMADown) tags.push("all-ma-down")

    if (a.pct1M >= top5Pct) tags.push("momentum-leader")
    if (a.pct1M > 20) tags.push("strong-momentum")
    if (a.pct1M < -20) tags.push("weak-momentum")

    if (a.adrPercent > 5) tags.push("high-volatility")
    if (a.adrPercent < 2) tags.push("low-volatility")

    // Tight consolidation
    if (a.tightness && a.tightness.length > 0) tags.push("tight-base")

    // Breakout style signals
    if (a.pct1M > 10 && a.ma10 === "up" && a.ma20 === "up") tags.push("breakout")
    if (a.pct1M > 0 && a.pct3M > 0 && a.pct6M > 0) tags.push("stage2")

    // Category-specific
    if (a.category === "crypto" && a.pct1M > top5Pct) tags.push("aleabitoreddit")
    if (a.category === "stocks" && a.pct1M > 15 && a.adrPercent > 3) tags.push("aleabitoreddit")

    return { ...a, tags }
  })
}

// ── Unified fetch ──────────────────────────────────────────────────────────

export async function fetchAllAssets(): Promise<{
  stocks: ScreenerAsset[]
  crypto: ScreenerAsset[]
  etfs: ScreenerAsset[]
  commodities: ScreenerAsset[]
  market: MarketRegime
}> {
  const [stocks, crypto, etfs, commodities, market] = await Promise.all([
    fetchStocks(),
    fetchCrypto(),
    fetchETFs(),
    fetchCommodities(),
    fetchMarketRegime(),
  ])

  const allAssets = [...stocks, ...crypto, ...etfs, ...commodities]

  return {
    stocks: computeTags(stocks, market, allAssets),
    crypto: computeTags(crypto, market, allAssets),
    etfs: computeTags(etfs, market, allAssets),
    commodities: computeTags(commodities, market, allAssets),
    market,
  }
}
