import { config as dotenvConfig } from "dotenv"
import { existsSync } from "fs"
import express from "express"
import cors from "cors"
import path from "path"
import { fileURLToPath } from "url"
import { fetchAllAssets } from "./feeds/scraper.js"
import { fetchTweetsForSymbol } from "./feeds/nitter.js"
import { generateInsight } from "./feeds/insights.js"
import type { DashboardData, ScreenerAsset } from "./types.js"

if (existsSync("/etc/secrets/.env")) {
  dotenvConfig({ path: "/etc/secrets/.env" })
}

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const app = express()
app.use(cors())
app.use(express.json())

let dashboardData: DashboardData = {
  stocks: [],
  crypto: [],
  etfs: [],
  commodities: [],
  market: {
    spy200SMA: "above",
    spy50SMA: "above",
    spy20SMA: "below",
    spy10SMA: "below",
    naaim: 86.82,
    naaimDate: new Date().toISOString().slice(0, 10),
    btc200SMA: "above",
    btc50SMA: "above",
    gold200SMA: "above",
  },
  lastUpdated: new Date().toISOString(),
}

let isRefreshing = false
let refreshError: string | null = null

async function refreshData() {
  if (isRefreshing) return
  isRefreshing = true
  refreshError = null
  const start = Date.now()

  try {
    const data = await fetchAllAssets()
    dashboardData = { ...data, lastUpdated: new Date().toISOString() }
    const elapsed = ((Date.now() - start) / 1000).toFixed(1)
    console.log(
      `[${elapsed}s] Data refreshed: ${data.stocks.length} stocks, ${data.crypto.length} crypto, ${data.etfs.length} ETFs, ${data.commodities.length} commodities`
    )
  } catch (err) {
    refreshError = err instanceof Error ? err.message : String(err)
    console.error("Refresh failed:", refreshError)
  } finally {
    isRefreshing = false
  }
}

// ── API routes ─────────────────────────────────────────────────────────────

app.get("/api/dashboard", (_req, res) => {
  const staleMs = Date.now() - new Date(dashboardData.lastUpdated).getTime()
  const stale = staleMs > 30 * 60 * 1000
  res.json({ ...dashboardData, _meta: { stale, refreshing: isRefreshing, error: refreshError } })
})

app.get("/api/market", (_req, res) => res.json(dashboardData.market))

app.get("/api/tweets", async (req, res) => {
  const symbol = req.query.symbol as string
  if (!symbol || symbol.length > 20) {
    return res.status(400).json({ error: "Invalid symbol" })
  }
  try {
    const result = await fetchTweetsForSymbol(symbol)
    res.json(result)
  } catch {
    res.status(500).json({ error: "Failed to fetch tweets", count: 0, tweets: [] })
  }
})

app.post("/api/insight", async (req, res) => {
  const asset = req.body as ScreenerAsset
  if (!asset?.symbol || asset.symbol.length > 20) {
    return res.status(400).json({ error: "Invalid asset" })
  }
  try {
    const insight = await generateInsight(asset)
    res.json({ insight })
  } catch {
    res.status(500).json({ error: "Insight generation failed" })
  }
})

app.get("/api/health", (_req, res) => {
  const staleMs = Date.now() - new Date(dashboardData.lastUpdated).getTime()
  const healthy = dashboardData.stocks.length > 100 && staleMs < 60 * 60 * 1000
  res.status(healthy ? 200 : 503).json({
    ok: healthy,
    stocks: dashboardData.stocks.length,
    lastUpdated: dashboardData.lastUpdated,
    refreshing: isRefreshing,
  })
})

// ── Static frontend ────────────────────────────────────────────────────────

const distPath = path.resolve(__dirname, "../dist")
app.use(express.static(distPath))

app.use((req, res, next) => {
  if (req.path.startsWith("/api") || req.path.includes(".")) return next()
  res.sendFile(path.join(distPath, "index.html"))
})

const PORT = parseInt(process.env.PORT || "3001")

// ── Startup + scheduled refresh ────────────────────────────────────────────
// Start listening immediately so the dev-server proxy works; refresh data in
// the background. The dashboard endpoint serves stale/cached data until the
// first refresh completes.

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
  console.log(`Frontend: http://localhost:${PORT}`)
})

refreshData().then(() => {
  if (process.env.NODE_ENV === "production") {
    setInterval(refreshData, 15 * 60 * 1000)
  }
})
