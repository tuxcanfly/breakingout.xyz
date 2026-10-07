// Picks a shortlist worth spending options-feed requests on, detects unusual
// flow, then spends a second, smaller round of requests reverse-engineering a
// probable catalyst for only the names that actually lit up.
//
// ETFs are deliberately excluded: index/sector flow is enormous and would
// swamp every board (SPY alone shows ~$28M of "unusual" premium on a normal day).
import type { FlowEntry, IntelTweet, ScreenerAsset } from "../types.js"
import { fetchFlow, isUnusual, supportsOptions } from "./options.js"
import { buildCatalystReport } from "./catalysts.js"
import { mapLimit } from "./http.js"

const MAX_SCAN = 48
const MAX_CATALYSTS = 10
const MAX_BOARD = 15
const CONCURRENCY = 5

// "12M"/"1.2B" → number. Used as a liquidity proxy for who has an active chain.
function volumeNum(avgVolume: string): number {
  const m = avgVolume?.match(/^([\d.]+)([MB])$/)
  if (!m) return 0
  return parseFloat(m[1]) * (m[2] === "B" ? 1e9 : 1e6)
}

function shortlist(assets: ScreenerAsset[], intel: IntelTweet[], trending: Set<string>): ScreenerAsset[] {
  // Only symbols that can actually have a chain we can read. Scanning the rest
  // (memecoins, most crypto) burns requests on guaranteed-empty lookups.
  const candidates = assets.filter((a) => supportsOptions(a.symbol, a.category))
  const picked = new Map<string, ScreenerAsset>()
  const add = (a?: ScreenerAsset) => { if (a && !picked.has(a.symbol)) picked.set(a.symbol, a) }

  // 1. BTC/ETH always — the only crypto with listed options.
  for (const a of candidates.filter((a) => a.category === "crypto")) add(a)

  const equity = candidates.filter((a) => a.category === "stocks")

  // 2. Highest conviction — the names the app already believes in.
  for (const a of [...equity].sort((x, y) => (y.conviction ?? 0) - (x.conviction ?? 0)).slice(0, 16)) add(a)

  // 3. Most liquid. Crypto's scanner volume reads 0 here, and a conviction-only
  //    list skews to quiet mid-caps, so this tier matters.
  for (const a of [...equity].filter((a) => volumeNum(a.avgVolume) > 0).sort((x, y) => volumeNum(y.avgVolume) - volumeNum(x.avgVolume)).slice(0, 14)) add(a)

  // 4. Anything the tracked accounts are discussing.
  const mentioned = new Set(intel.flatMap((t) => t.symbols.map((s) => s.toUpperCase())))
  for (const a of candidates.filter((a) => mentioned.has(a.symbol.toUpperCase())).slice(0, 12)) add(a)

  // 5. Retail trending names.
  for (const a of candidates.filter((a) => trending.has(a.symbol.toUpperCase())).slice(0, 8)) add(a)

  return [...picked.values()].slice(0, MAX_SCAN)
}

export async function scanFlow(
  assets: ScreenerAsset[],
  ctx: { intel: IntelTweet[]; trending: Set<string> },
): Promise<FlowEntry[]> {
  const targets = shortlist(assets, ctx.intel, ctx.trending)
  if (targets.length === 0) return []

  const results = await mapLimit(targets, CONCURRENCY, async (asset) => {
    try {
      const flow = await fetchFlow(asset.symbol, asset.category)
      return flow && isUnusual(flow) ? { asset, flow } : null
    } catch {
      return null
    }
  })

  const unusual = results.filter((r): r is { asset: ScreenerAsset; flow: NonNullable<typeof r>["flow"] } => r !== null)
  unusual.sort((a, b) => b.flow.unusualPremium - a.flow.unusualPremium)
  const board = unusual.slice(0, MAX_BOARD)

  // Catalysts only for the top of the board — these are the expensive lookups.
  const withCatalyst = await mapLimit(board.slice(0, MAX_CATALYSTS), 3, async (row) => {
    try {
      const catalyst = await buildCatalystReport(row.asset.symbol, {
        category: row.asset.category,
        name: row.asset.name,
        sector: row.asset.sector,
        subsector: row.asset.subsector,
        intel: ctx.intel,
        toSymbol: row.asset.underlyingSymbol || row.asset.symbol,
        trending: ctx.trending.has(row.asset.symbol.toUpperCase()),
        flowPremium: row.flow.unusualPremium,
      })
      return { key: row.asset.symbol, catalyst }
    } catch {
      return null
    }
  })
  const catalysts = new Map(withCatalyst.filter((c) => c !== null).map((c) => [c!.key, c!.catalyst]))

  console.log(
    `Options flow: scanned ${targets.length}, unusual ${unusual.length}` +
      (board.length
        ? ` — top: ${board.slice(0, 6).map((b) => `${b.asset.symbol} $${(b.flow.unusualPremium / 1e6).toFixed(1)}M ${b.flow.tilt} ${b.flow.maxNotability}x`).join(", ")}`
        : ""),
  )

  return board.map<FlowEntry>((row) => ({
    symbol: row.asset.symbol,
    name: row.asset.name,
    category: row.asset.category,
    sector: row.asset.sector,
    conviction: row.asset.conviction,
    flow: row.flow,
    catalyst: catalysts.get(row.asset.symbol),
  }))
}
