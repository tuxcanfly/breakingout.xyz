export type AssetCategory = "stocks" | "crypto" | "etfs" | "commodities"

export type TrendState = "uptrend" | "downtrend" | "transition" | "chop"

export interface ScreenerAsset {
  symbol: string
  name: string
  category: AssetCategory
  industry: string
  sector: string
  subsector?: string
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
  tokenSymbol?: string
  venue?: string
  chartSymbol?: string
  momentumRank?: number
  categoryRank?: number
  sectorRank?: number
  setupScore?: number
  riskScore?: number
  coilScore?: number
  coilTightness?: number
  distToHighPct?: number
  trendState?: TrendState
  rsi?: number
  conviction?: number
  mentionedBy?: string[]
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
  spyRegime?: "risk-on" | "risk-off"
  spyVsEma140?: number
}

export interface DashboardMeta {
  stale?: boolean
  refreshing?: boolean
  error?: string | null
}

export interface DashboardData {
  stocks: ScreenerAsset[]
  crypto: ScreenerAsset[]
  etfs: ScreenerAsset[]
  commodities: ScreenerAsset[]
  market: MarketRegime
  lastUpdated: string
  intel?: IntelTweet[]
  _meta?: DashboardMeta
}

export interface IntelTweet {
  author: string
  authorHandle: string
  authorUrl: string
  text: string
  date: string
  link: string
  symbols: string[]
}

export interface NitterTweet {
  author: string
  text: string
  date: string
  link: string
}

export interface NitterResult {
  count: number
  tweets: NitterTweet[]
}
