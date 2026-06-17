import { fetchTrendingStocks } from "../server/feeds/trending.js"
import { fetchYahooAssets } from "../server/feeds/yahoo.js"

const trending = await fetchTrendingStocks()
console.log("Trending symbols:", trending.symbols.length)
console.log("SPCX in symbols:", trending.symbols.includes("SPCX"))
const spcx = trending.results.find((r) => r.symbol === "SPCX")
console.log("SPCX result:", spcx)

const resolved = await fetchYahooAssets([{ symbol: "SPCX", category: "stocks" as const, minBars: 5 }])
console.log("Resolved SPCX:", resolved[0])
