import type { DashboardData, MarketRegime, ScreenerAsset } from "../types"

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
