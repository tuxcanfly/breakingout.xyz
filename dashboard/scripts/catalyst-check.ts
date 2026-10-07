// Dev check: probable-catalyst evidence for given symbols.
// Usage: npx tsx scripts/catalyst-check.ts NVDA,MRNA,IREN,TSLA
import { buildCatalystReport } from "../server/feeds/catalysts.js"

const names: Record<string, { name: string; sector: string; subsector: string }> = {
  NVDA: { name: "NVIDIA Corp", sector: "Information Technology", subsector: "Semiconductors" },
  MRNA: { name: "Moderna Inc", sector: "Health Care", subsector: "Biotechnology" },
  IREN: { name: "IREN Ltd", sector: "Information Technology", subsector: "Data Centers" },
  TSLA: { name: "Tesla Inc", sector: "Consumer Discretionary", subsector: "Automobiles" },
  AAPL: { name: "Apple Inc", sector: "Information Technology", subsector: "Hardware" },
}

const syms = (process.argv[2] || "NVDA,MRNA,IREN,TSLA").split(",").map((s) => s.trim().toUpperCase())
for (const sym of syms) {
  const meta = names[sym] ?? { name: sym, sector: "", subsector: "" }
  const t0 = Date.now()
  const r = await buildCatalystReport(sym, { category: "stocks", ...meta, flowPremium: 3_000_000 })
  console.log(`\n=== ${sym} (${Date.now() - t0}ms) probable: ${r.probable ? `${r.probable.kind} (${r.probable.confidence})` : "none"}`)
  console.log(`  ${r.rationale}`)
  for (const e of r.events) console.log(`   · [${e.confidence}] ${e.kind}: ${e.label} (${e.source})`)
  for (const h of r.chatter.headlines.slice(0, 3)) console.log(`   news- ${h.date} ${h.title.slice(0, 90)}`)
}
