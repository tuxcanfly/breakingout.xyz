import type { CatalystReport, DashboardData, MarketRegime, NitterResult, OptionsFlow, ScreenerAsset } from "../types"

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

export interface FlowResponse {
  flow: OptionsFlow | null
  catalyst: CatalystReport | null
  reason?: string
}

export async function fetchFlowDetail(symbol: string, category: string): Promise<FlowResponse> {
  const res = await fetch(`${BASE_URL}/flow?symbol=${encodeURIComponent(symbol)}&category=${encodeURIComponent(category)}`)
  if (!res.ok) throw new Error("Failed to fetch options flow")
  return res.json()
}

export async function fetchInsight(asset: ScreenerAsset): Promise<{ insight: string }> {
  const res = await fetch(`${BASE_URL}/insight`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // Server looks the asset up itself — send only the identity.
    body: JSON.stringify({ symbol: asset.symbol, category: asset.category }),
  })
  if (!res.ok) throw new Error("Failed to fetch insight")
  return res.json()
}
