import express from "express"
import cors from "cors"
import path from "path"
import { fileURLToPath } from "url"
import { fetchAllAssets } from "./feeds/scraper.js"
import type { DashboardData } from "./types.js"

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

async function refreshData() {
  try {
    const data = await fetchAllAssets()
    dashboardData = { ...data, lastUpdated: new Date().toISOString() }
    console.log(
      `Data refreshed: ${data.stocks.length} stocks, ${data.crypto.length} crypto, ${data.etfs.length} ETFs, ${data.commodities.length} commodities`
    )
  } catch (err) {
    console.error("Refresh failed:", err)
  }
}

app.get("/api/dashboard", (_req, res) => res.json(dashboardData))
app.get("/api/market", (_req, res) => res.json(dashboardData.market))

// Debug: check Puppeteer
app.get("/api/debug", async (_req, res) => {
  const info: Record<string, unknown> = {
    node: process.version,
    platform: process.platform,
    puppeteer: true,
    errors: [] as string[],
  }
  // Check if puppeteer can find chrome
  try {
    const puppeteer = await import("puppeteer")
    info["puppeteerPath"] = puppeteer.executablePath()
  } catch (e: unknown) {
    info["puppeteerError"] = String(e)
    info["errors"].push(String(e))
  }
  // Check node_modules
  const fs = await import("fs")
  const path = await import("path")
  const nm = path.resolve("node_modules")
  info["nodeModules"] = fs.readdirSync(nm).filter((d: string) => d.startsWith("puppeteer") || d.startsWith("chrome"))
  // Check if chrome binary exists
  const chromePaths = ["/usr/bin/chromium", "/usr/bin/chromium-browser", "/usr/bin/google-chrome", "/usr/bin/google-chrome-stable"]
  for (const p of chromePaths) {
    try {
      await fs.promises.access(p)
      info["chromeFound"] = p
    } catch { /* not found */ }
  }
  res.json(info)
})

// Serve static frontend
const distPath = path.resolve(__dirname, "../dist")
app.use(express.static(distPath))

// SPA fallback
app.use((req, res, next) => {
  if (req.path.startsWith("/api") || req.path.includes(".")) return next()
  res.sendFile(path.join(distPath, "index.html"))
})

const PORT = parseInt(process.env.PORT || "3001")

// Fetch data on startup, then start serving
await refreshData()

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
  console.log(`Frontend: http://localhost:${PORT}`)
})
