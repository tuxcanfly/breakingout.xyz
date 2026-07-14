import { fetchAllAssets } from "../server/feeds/scraper.ts"
async function main() {
  const result = await fetchAllAssets()
  const stocks = result.stocks
  for (const t of ["TEM","SDGR","RLAY","GH","PACB","BNTX"]) {
    const a = stocks.find((s) => s.symbol === t)
    if (a) console.log(`${t}: ${a.sector}/${a.subsector} price=${a.price} venue=${a.venue}`)
    else console.log(`${t}: NOT FOUND`)
  }
}
main()
