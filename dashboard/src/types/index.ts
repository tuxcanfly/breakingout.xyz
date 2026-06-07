export type AssetCategory = "stocks" | "crypto" | "etfs" | "commodities"

export interface ScreenerAsset {
  symbol: string
  name: string
  category: AssetCategory
  industry: string
  avgVolume: string
  tightness: string
  adrPercent: number
  ma10: "up" | "down"
  ma20: "up" | "down"
  ma50: "up" | "down"
  ma200: "up" | "down"
  pct1M: number
  pct3M: number
  pct6M: number
  pct1Y: number
  price?: number
  change24h?: number
  tags?: string[]
}

export interface MarketRegime {
  spy200SMA: "above" | "below"
  spy50SMA: "above" | "below"
  spy20SMA: "above" | "below"
  spy10SMA: "above" | "below"
  naaim: number
  naaimDate: string
  btc200SMA?: "above" | "below"
  btc50SMA?: "above" | "below"
  gold200SMA?: "above" | "below"
}

export interface DashboardData {
  stocks: ScreenerAsset[]
  crypto: ScreenerAsset[]
  etfs: ScreenerAsset[]
  commodities: ScreenerAsset[]
  market: MarketRegime
  lastUpdated: string
}
