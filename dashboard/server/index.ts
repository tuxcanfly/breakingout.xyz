import { config as dotenvConfig } from "dotenv"
import { existsSync } from "fs"
import express from "express"
import cors from "cors"
import path from "path"
import { fileURLToPath } from "url"
import { fetchAllAssets } from "./feeds/scraper.js"
import { fetchTweetsForSymbol } from "./feeds/nitter.js"
import { generateInsight } from "./feeds/insights.js"
import { fetchFlow } from "./feeds/options.js"
import { buildCatalystReport } from "./feeds/catalysts.js"
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
    spy200SMA: "below",
    spy50SMA: "below",
    spy20SMA: "below",
    spy10SMA: "below",
    naaim: null,
    naaimDate: null,
  },
  // Epoch until the first refresh lands, so the client can tell "never
  // loaded" apart from "loaded just now".
  lastUpdated: new Date(0).toISOString(),
}

const REFRESH_MS = 15 * 60 * 1000
let isRefreshing = false
let refreshError: string | null = null
let nextRefreshAt: number | null = null

// Keep last-good arrays when an upstream returns nothing — a TradingView or
// Nitter blip used to blank whole categories until the next 15-min cycle.
function mergeKeepingLastGood(prev: DashboardData, next: Omit<DashboardData, "lastUpdated">): Omit<DashboardData, "lastUpdated"> {
  const keep = <T,>(n: T[] | undefined, p: T[] | undefined, min = 1) => (n && n.length >= min ? n : p ?? n ?? [])
  return {
    ...next,
    // Stocks under ~half the previous count is a partial TV failure, not reality.
    stocks: keep(next.stocks, prev.stocks, Math.max(1, Math.floor(prev.stocks.length * 0.5))),
    crypto: keep(next.crypto, prev.crypto),
    etfs: keep(next.etfs, prev.etfs),
    commodities: keep(next.commodities, prev.commodities),
    intel: keep(next.intel, prev.intel),
    intelHot: next.intel?.length ? next.intelHot : prev.intelHot ?? next.intelHot,
    // A failed options scan shouldn't wipe the board the user is reading.
    flow: next.flow?.length ? next.flow : prev.flow ?? next.flow,
  }
}

async function refreshData() {
  if (isRefreshing) return
  isRefreshing = true
  refreshError = null
  const start = Date.now()

  try {
    const data = await fetchAllAssets()
    dashboardData = { ...mergeKeepingLastGood(dashboardData, data), lastUpdated: new Date().toISOString() }
    const elapsed = ((Date.now() - start) / 1000).toFixed(1)
    console.log(
      `[${elapsed}s] Data refreshed: ${data.stocks.length} stocks, ${data.crypto.length} crypto, ${data.etfs.length} ETFs, ${data.commodities.length} commodities`
    )
  } catch (err) {
    refreshError = err instanceof Error ? err.message : String(err)
    console.error("Refresh failed:", refreshError)
  } finally {
    isRefreshing = false
    nextRefreshAt = Date.now() + REFRESH_MS
  }
}

// ── API routes ─────────────────────────────────────────────────────────────

app.get("/api/dashboard", (_req, res) => {
  const staleMs = Date.now() - new Date(dashboardData.lastUpdated).getTime()
  const stale = staleMs > 30 * 60 * 1000
  res.json({
    ...dashboardData,
    _meta: {
      stale,
      refreshing: isRefreshing,
      error: refreshError,
      nextRefresh: nextRefreshAt ? new Date(nextRefreshAt).toISOString() : null,
    },
  })
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
  const body = req.body as Partial<ScreenerAsset>
  if (!body?.symbol || body.symbol.length > 20) {
    return res.status(400).json({ error: "Invalid asset" })
  }
  // Prefer the server's own copy so the prompt can't be stuffed by clients
  // and always reflects current scores/tags/mentions.
  const asset =
    [...dashboardData.stocks, ...dashboardData.crypto, ...dashboardData.etfs, ...dashboardData.commodities]
      .find((a) => a.symbol === body.symbol && (!body.category || a.category === body.category))
  if (!asset) return res.status(404).json({ error: "Unknown asset" })
  try {
    const recentIntel = (dashboardData.intel ?? []).filter((t) => t.symbols.includes(asset.symbol)).slice(0, 4)
    const insight = await generateInsight(asset, dashboardData.market, recentIntel)
    res.json({ insight })
  } catch {
    res.status(500).json({ error: "Insight generation failed" })
  }
})

// On-demand flow + catalyst for any symbol (the dashboard board only covers a
// shortlist, so the detail sheet needs its own path).
app.get("/api/flow", async (req, res) => {
  const symbol = String(req.query.symbol || "").toUpperCase()
  const category = String(req.query.category || "stocks")
  if (!symbol || symbol.length > 12 || !/^[A-Z0-9.-]+$/.test(symbol)) {
    return res.status(400).json({ error: "Invalid symbol" })
  }
  try {
    const flow = await fetchFlow(symbol, category)
    if (!flow) return res.json({ flow: null, catalyst: null, reason: "No listed options chain for this symbol." })
    const asset = [...dashboardData.stocks, ...dashboardData.crypto, ...dashboardData.etfs, ...dashboardData.commodities]
      .find((a) => a.symbol === symbol)
    const catalyst = await buildCatalystReport(symbol, {
      category,
      name: asset?.name ?? symbol,
      sector: asset?.sector,
      subsector: asset?.subsector,
      intel: dashboardData.intel ?? [],
      toSymbol: asset?.underlyingSymbol || symbol,
      trending: !!asset?.tags?.includes("trending"),
      flowPremium: flow.unusualPremium,
    }).catch(() => undefined)
    res.json({ flow, catalyst: catalyst ?? null })
  } catch {
    res.status(500).json({ error: "Flow lookup failed" })
  }
})

app.get("/api/health", (_req, res) => {
  const staleMs = Date.now() - new Date(dashboardData.lastUpdated).getTime()
  const healthy = dashboardData.stocks.length > 100 && staleMs < 60 * 60 * 1000
  res.status(healthy ? 200 : 503).json({
    ok: healthy,
    stocks: dashboardData.stocks.length,
    flow: dashboardData.flow?.length ?? 0,
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
  // Dev used to never refresh after boot, so long-running dev servers drifted
  // silently stale. Set DISABLE_REFRESH=1 to opt out.
  if (!process.env.DISABLE_REFRESH) setInterval(refreshData, REFRESH_MS)
})
