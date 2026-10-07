// Dev check: print detected options flow for a few symbols.
// Usage: npx tsx scripts/flow-check.ts NVDA,TSLA,BTC,ETH,SPY
import { fetchFlow, isUnusual, UNUSUAL_PREMIUM } from "../server/feeds/options.js"

const syms = (process.argv[2] || "NVDA,TSLA,BTC,ETH,SPY").split(",").map((s) => s.trim().toUpperCase())

for (const sym of syms) {
  const category = ["BTC", "ETH"].includes(sym) ? "crypto" : "stocks"
  const t0 = Date.now()
  const flow = await fetchFlow(sym, category)
  if (!flow) {
    console.log(`\n=== ${sym}: no options chain (${Date.now() - t0}ms)`)
    continue
  }
  const money = (n: number) => `$${(n / 1e6).toFixed(2)}M`
  console.log(`\n=== ${flow.symbol} (${flow.source}, ${Date.now() - t0}ms) spot ${flow.spot} · IV ${flow.iv}% (chg ${flow.ivChange}, rank ${flow.ivRank})`)
  console.log(`  ${isUnusual(flow) ? "UNUSUAL" : "normal"} — flagged ${flow.flagged}, premium ${money(flow.unusualPremium)} (threshold ${money(UNUSUAL_PREMIUM[flow.kind])}), notability ${flow.maxNotability}x, chain ${money(flow.chainPremium)}`)
  console.log(`  calls ${money(flow.callPremium)} vs puts ${money(flow.putPremium)} → tilt ${flow.tilt} (${flow.tiltRatio})`)
  console.log(`  implied move ±${flow.impliedMovePct}% by ${flow.impliedMoveExpiry} · skew ${flow.skew}`)
  for (const p of flow.prints.slice(0, 4)) {
    console.log(`   · ${p.expiry} ${p.type} ${p.strike} | vol ${p.volume} oi ${p.openInterest} (${p.ratio}x) ${money(p.premium)} iv ${p.iv}% dte ${p.dte} otm ${p.otmPct}%`)
  }
}
