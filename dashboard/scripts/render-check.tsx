// Dev check: render the flow UI with live payload data to catch runtime errors
// that type-checking can't (the browser tool can't reach localhost).
// Usage: npx tsx scripts/render-check.tsx
import { renderToString } from "react-dom/server"
import { createElement as h } from "react"
import { FlowStrip } from "../src/components/FlowStrip"
import { FlowPanels } from "../src/components/FlowPanels"
import type { DashboardData, ScreenerAsset } from "../src/types"

const data = (await (await fetch("http://localhost:3099/api/dashboard")).json()) as DashboardData
const all: ScreenerAsset[] = [...data.stocks, ...data.crypto, ...data.etfs, ...data.commodities]
const bySym = new Map(all.map((a) => [a.symbol, a]))
const empty = new Map<string, ScreenerAsset>()

const strip = renderToString(h(FlowStrip, { entries: data.flow ?? [], assetsBySymbol: bySym, onPick: () => {} }))
const stripEmpty = renderToString(h(FlowStrip, { entries: [], assetsBySymbol: empty, onPick: () => {} }))
// Unmapped symbols exercise the "asset missing" branch.
const stripUnmapped = renderToString(h(FlowStrip, { entries: data.flow ?? [], assetsBySymbol: empty, onPick: () => {} }))
const panels = renderToString(h(FlowPanels, { symbol: "NVDA", category: "stocks" }))

const text = (s: string) => s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
const ok: Array<[string, boolean]> = [
  ["entries present", (data.flow?.length ?? 0) > 0],
  ["strip renders a card per entry", (strip.match(/fresh premium/g) || []).length === (data.flow?.length ?? 0)],
  ["empty input returns null (hidden section)", stripEmpty === ""],
  // Unmapped symbols must still render (catalyst is on the entry, not the asset).
  ["unmapped symbols still render cards", (stripUnmapped.match(/fresh premium/g) || []).length === (data.flow?.length ?? 0)],
  ["FlowPanels loading branch renders", panels.includes("shimmer")],
  ["every entry reports a catalyst or none-found", (data.flow ?? []).every((e) => !!e.catalyst)],
]
console.log("flow entries:", data.flow?.length ?? 0)
console.log("strip:", text(strip).slice(0, 200))
for (const [label, pass] of ok) console.log(`  ${pass ? "PASS" : "FAIL"}  ${label}`)
if (ok.some(([, pass]) => !pass)) process.exit(1)
