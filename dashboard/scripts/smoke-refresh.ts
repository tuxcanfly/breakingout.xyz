import { fetchAllAssets } from "../server/feeds/scraper.js"

const data = await fetchAllAssets()
console.log("\n=== Smoke test results ===")
console.log(`stocks: ${data.stocks.length}`)
console.log(`crypto: ${data.crypto.length}`)
console.log(`etfs: ${data.etfs.length}`)
console.log(`commodities: ${data.commodities.length}`)
console.log(`trending-tagged: ${data.stocks.filter((a) => a.tags?.includes("trending")).length}`)
console.log(`xstock-tagged: ${data.stocks.filter((a) => a.tags?.includes("xstock")).length}`)
const sampleTrending = data.stocks.find((a) => a.tags?.includes("trending"))
if (sampleTrending) {
  console.log(`sample trending: ${sampleTrending.symbol} — ${sampleTrending.name} (${sampleTrending.sector})`)
}
