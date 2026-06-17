import { fetchAllAssets } from "../server/feeds/scraper.js"

const data = await fetchAllAssets()
const unclassified = data.stocks.filter(
  (a) => a.sector === "Other" || a.subsector === "Unclassified"
)
console.log("Unclassified stocks:", unclassified.length)
for (const a of unclassified) {
  console.log(`${a.symbol},${a.name}`)
}
