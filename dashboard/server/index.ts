import express from "express"
import cors from "cors"
import cron from "node-cron"
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
    dashboardData = {
      ...data,
      lastUpdated: new Date().toISOString(),
    }
    const totalAssets =
      data.stocks.length +
      data.crypto.length +
      data.etfs.length +
      data.commodities.length
    console.log(
      `Data refreshed: ${data.stocks.length} stocks, ${data.crypto.length} crypto, ${data.etfs.length} ETFs, ${data.commodities.length} commodities`
    )
  } catch (err) {
    console.error("Refresh failed:", err)
  }
}

// Refresh every 10 minutes
cron.schedule("*/10 * * * *", refreshData)

app.get("/api/dashboard", (_req, res) => {
  res.json(dashboardData)
})

app.get("/api/market", (_req, res) => {
  res.json(dashboardData.market)
})

// Serve static frontend in production
const distPath = path.resolve(__dirname, "../dist")
app.use(express.static(distPath))
app.get("*", (_req, res) => {
  res.sendFile(path.join(distPath, "index.html"))
})

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001

// Wait for initial data before starting server
await refreshData()

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
  console.log(`Frontend: http://localhost:${PORT}`)
})
