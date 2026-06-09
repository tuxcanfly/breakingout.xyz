import type { DashboardData, MarketRegime, NitterResult, ScreenerAsset } from "../types"

const BASE_URL = "/api"

export async function fetchDashboard(): Promise<DashboardData> {
  const res = await fetch(`${BASE_URL}/dashboard`)
  if (!res.ok) throw new Error("Failed to fetch dashboard")
  return res.json()
}

export async function fetchMarket(): Promise<MarketRegime> {
  const res = await fetch(`${BASE_URL}/market`)
  if (!res.ok) throw new Error("Failed to fetch market")
  return res.json()
}

export async function fetchTweets(symbol: string): Promise<NitterResult> {
  const res = await fetch(`${BASE_URL}/tweets?symbol=${encodeURIComponent(symbol)}`)
  if (!res.ok) throw new Error("Failed to fetch tweets")
  return res.json()
}

export async function fetchInsight(asset: ScreenerAsset): Promise<{ insight: string }> {
  const res = await fetch(`${BASE_URL}/insight`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(asset),
  })
  if (!res.ok) throw new Error("Failed to fetch insight")
  return res.json()
}
