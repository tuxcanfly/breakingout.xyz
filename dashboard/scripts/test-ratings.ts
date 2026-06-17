import { fetchAnalystRatings, mergeAnalystRatings } from "../server/feeds/finnhub.js"
import type { ScreenerAsset } from "../server/types.js"

const assets: ScreenerAsset[] = [
  {
    symbol: "AAPL",
    name: "Apple",
    category: "stocks",
    industry: "Software",
    sector: "Information Technology",
    subsector: "Application Software",
    avgVolume: "1M",
    tightness: "",
    adrPercent: 1,
    ma10: "up",
    ma20: "up",
    ma50: "up",
    ma200: "up",
    pct1M: 1,
    pct3M: 1,
    pct6M: 1,
    pct1Y: 1,
  },
]

const ratings = await fetchAnalystRatings(assets)
console.log("ratings size", ratings.size)
console.log("keys", [...ratings.keys()])
const merged = mergeAnalystRatings(assets, ratings)
console.log("merged has rating?", !!merged[0].analystRating)
console.log("merged", merged[0].analystRating)
