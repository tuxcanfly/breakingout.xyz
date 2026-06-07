import puppeteer from "puppeteer"
import type { ScreenerStock, MarketRegime } from "../types.js"

const SCREENER_URL = "https://www.unusualbreakouts.com/"

let cachedStocks: ScreenerStock[] = []
let cachedMarket: MarketRegime | null = null
let lastFetch = 0
const CACHE_TTL = 5 * 60 * 1000

function parseMarketFromHTML(text: string): MarketRegime {
  const market: MarketRegime = {
    spy200SMA: text.includes("200 SMA▲") ? "above" : "below",
    spy50SMA: text.includes("50 SMA▲") ? "above" : "below",
    spy20SMA: text.includes("20 SMA▼") ? "below" : "above",
    spy10SMA: text.includes("10 SMA▼") ? "below" : "above",
    naaim: 86.82,
    naaimDate: "2026-06-06",
  }

  const naaimMatch = text.match(/NAAIM\s*([\d.]+)/)
  if (naaimMatch) {
    market.naaim = parseFloat(naaimMatch[1])
  }

  const dateMatch = text.match(/Last updated:\s*([\d-]+)/)
  if (dateMatch) {
    market.naaimDate = dateMatch[1]
  }

  return market
}

function parseStocksFromText(text: string): ScreenerStock[] {
  const stocks: ScreenerStock[] = []

  // Pattern: find rows in the markdown-like table
  // Each row looks like: | AAOI | Semiconductors | 2.16B | | 14.05 | ▼ | ▼ | ▲ | ▲ | 12.35 | 77.51 | 592.22 | 934.48 |
  const lines = text.split("\n")
  let inTable = false

  for (const line of lines) {
    if (line.includes("| symbol | industry |")) {
      inTable = true
      continue
    }
    if (!inTable) continue
    if (line.trim() === "" || line.includes("|---")) continue
    if (line.includes("We use cookies")) break

    const cells = line
      .split("|")
      .map((c) => c.trim())
      .filter(Boolean)

    if (cells.length < 12) continue

    const symbol = cells[0].trim()
    // Skip if not a valid ticker
    if (!/^[A-Z]{1,5}$/.test(symbol)) continue

    const maMap = (v: string): "up" | "down" =>
      v.trim() === "▲" || v.trim().includes("▲") ? "up" : "down"

    const stock: ScreenerStock = {
      symbol,
      industry: cells[1]?.trim() || "",
      avgVolume: cells[2]?.trim() || "",
      tightness: cells[3]?.trim() || "",
      adrPercent: parseFloat(cells[4]?.trim()) || 0,
      ma10: maMap(cells[5] || ""),
      ma20: maMap(cells[6] || ""),
      ma50: maMap(cells[7] || ""),
      ma200: maMap(cells[8] || ""),
      pct1M: parseFloat(cells[9]?.trim().replace(/,/g, "")) || 0,
      pct3M: parseFloat(cells[10]?.trim().replace(/,/g, "")) || 0,
      pct6M: parseFloat(cells[11]?.trim().replace(/,/g, "")) || 0,
      pct1Y: parseFloat(cells[12]?.trim().replace(/,/g, "")) || 0,
    }
    stocks.push(stock)
  }

  return stocks
}

export async function fetchScreenerData(): Promise<{
  stocks: ScreenerStock[]
  market: MarketRegime
}> {
  const now = Date.now()
  if (cachedStocks.length > 0 && cachedMarket && now - lastFetch < CACHE_TTL) {
    return { stocks: cachedStocks, market: cachedMarket }
  }

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    })
    const page = await browser.newPage()
    await page.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    )

    // Navigate and wait for the table to render
    await page.goto(SCREENER_URL, { waitUntil: "networkidle0", timeout: 30000 })

    // Wait for the table body to have actual data (not skeleton)
    await page.waitForFunction(
      "document.querySelectorAll('td').length > 10",
      { timeout: 10000 }
    )

    // Get the full text content
    const text = await page.evaluate("document.body.innerText")

    // Get the table as structured data - use string to avoid tsx transform
    const extractFn = `
      (function() {
        var rows = document.querySelectorAll("table tbody tr");
        var result = [];
        rows.forEach(function(row) {
          var cells = row.querySelectorAll("td");
          if (cells.length < 13) return;
          var symbol = (cells[0]?.textContent || "").trim();
          if (!/^[A-Z]{1,5}$/.test(symbol)) return;
          function up(v) { return v.indexOf("▲") !== -1 ? "up" : "down"; }
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
    const stocksRaw = await page.evaluate(extractFn)

    const stocks: ScreenerStock[] = stocksRaw.map((s) => ({
      ...s,
      ma10: s.ma10 as "up" | "down",
      ma20: s.ma20 as "up" | "down",
      ma50: s.ma50 as "up" | "down",
      ma200: s.ma200 as "up" | "down",
    }))

    const market = parseMarketFromHTML(text)

    cachedStocks = stocks
    cachedMarket = market
    lastFetch = now

    console.log(
      `Screener data: ${stocks.length} stocks, NAAIM: ${market.naaim}`
    )
    return { stocks, market }
  } catch (err) {
    console.error("Failed to fetch screener data:", err)
    return {
      stocks: cachedStocks.length > 0 ? cachedStocks : [],
      market: cachedMarket || {
        spy200SMA: "above",
        spy50SMA: "above",
        spy20SMA: "below",
        spy10SMA: "below",
        naaim: 86.82,
        naaimDate: "2026-06-06",
      },
    }
  } finally {
    if (browser) await browser.close()
  }
}
