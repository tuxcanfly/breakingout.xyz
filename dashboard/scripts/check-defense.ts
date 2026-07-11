import { fetchAllAssets } from "../server/feeds/scraper.ts"

async function main() {
  const result = await fetchAllAssets()
  const stocks = result.stocks
  const targets = ["KRKNF","MDA","EH"]
  for (const t of targets) {
    const a = stocks.find((s) => s.symbol === t)
    if (a) {
      console.log(`${t}: sector=${a.sector} subsector=${a.subsector} price=${a.price} venue=${a.venue}`)
    } else {
      console.log(`${t}: NOT FOUND`)
    }
  }
  console.log("Total stocks:", stocks.length)
}
main()
