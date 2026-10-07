import type { FlowEntry, ScreenerAsset } from "../types"
import { Zap, TrendingUp, TrendingDown, MinusCircle, HelpCircle, CalendarClock } from "lucide-react"

interface Props {
  entries: FlowEntry[]
  assetsBySymbol: Map<string, ScreenerAsset>
  onPick: (asset: ScreenerAsset) => void
}

const money = (n: number) => (n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : `$${Math.round(n / 1e3)}K`)

const TILT = {
  bullish: { color: "var(--sol-green)", icon: TrendingUp, label: "call-heavy" },
  bearish: { color: "var(--sol-red)", icon: TrendingDown, label: "put-heavy" },
  balanced: { color: "var(--sol-base01)", icon: MinusCircle, label: "two-sided" },
} as const

const CONFIDENCE_COLOR = { high: "var(--sol-green)", medium: "var(--sol-yellow)", low: "var(--sol-base01)" } as const

export function FlowStrip({ entries, assetsBySymbol, onPick }: Props) {
  if (entries.length === 0) return null

  return (
    <div className="mb-3">
      <div
        className="flex items-center gap-1.5 mb-2"
        style={{ fontSize: "10px", fontWeight: 600, color: "var(--sol-base01)", textTransform: "uppercase", letterSpacing: "0.04em" }}
      >
        <Zap size={11} style={{ color: "var(--sol-orange)" }} />
        Unusual options
        <span style={{ textTransform: "none", letterSpacing: 0, fontWeight: 500 }}>({entries.length})</span>
        <span
          className="inline-flex items-center gap-0.5 px-1 rounded font-medium"
          style={{ textTransform: "none", letterSpacing: 0, fontSize: "9px", backgroundColor: "var(--sol-base2)", color: "var(--sol-base1)" }}
          title="Flow is measured from delayed chain snapshots (Cboe for equities, Deribit for crypto). '×' is how large the biggest print is versus that name's own median contract — a $1M print is routine in NVDA and enormous elsewhere."
        >
          <HelpCircle size={9} /> delayed · × vs own median
        </span>
      </div>

      <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(185px, 1fr))" }}>
        {entries.map((e) => {
          const asset = assetsBySymbol.get(e.symbol)
          const tilt = TILT[e.flow.tilt]
          const TiltIcon = tilt.icon
          const probable = e.catalyst?.probable
          return (
            <button
              key={`${e.category}-${e.symbol}`}
              onClick={() => asset && onPick(asset)}
              className="text-left rounded-lg border px-3 py-2.5 transition-all cursor-pointer hover:-translate-y-0.5"
              style={{ backgroundColor: "var(--sol-base2)", borderColor: "var(--sol-base1)" }}
              title={e.catalyst?.rationale ?? "Click for full detail"}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <span
                    className="font-bold"
                    style={{ color: "var(--sol-base02)", fontSize: "13px", fontFamily: "ui-monospace, SFMono-Regular, monospace" }}
                  >
                    {e.symbol}
                  </span>
                  <span
                    className="px-1 rounded tabular-nums font-semibold"
                    style={{ fontSize: "9px", color: "var(--sol-base01)", backgroundColor: "var(--sol-base3)" }}
                    title={`Largest print is ${e.flow.maxNotability}× this name's median contract premium`}
                  >
                    {e.flow.maxNotability}×
                  </span>
                </div>
                <span className="inline-flex items-center gap-0.5 font-semibold" style={{ fontSize: "9px", color: tilt.color }}>
                  <TiltIcon size={10} />
                  {tilt.label}
                </span>
              </div>

              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold tabular-nums" style={{ color: "var(--sol-base02)", fontSize: "13px" }}>
                  {money(e.flow.unusualPremium)}
                </span>
                <span style={{ fontSize: "9px", color: "var(--sol-base1)" }}>fresh premium</span>
              </div>

              <div className="flex items-center gap-2 mb-1.5 tabular-nums" style={{ fontSize: "10px", color: "var(--sol-base01)" }}>
                <span title="Implied move to the nearest near-dated expiry, from the ATM straddle">
                  ±{e.flow.impliedMovePct ?? "—"}% move
                </span>
                <span title="30-day implied volatility, and today's change">IV {e.flow.iv ?? "—"}%</span>
                {e.flow.ivRank !== null && <span title="IV percentile vs stored history">rank {e.flow.ivRank}</span>}
              </div>

              {probable ? (
                <div className="flex items-center gap-1" style={{ fontSize: "10px" }}>
                  <CalendarClock size={10} style={{ color: CONFIDENCE_COLOR[probable.confidence], flexShrink: 0 }} />
                  <span style={{ color: CONFIDENCE_COLOR[probable.confidence], fontWeight: 600 }}>{probable.kind}</span>
                  <span className="truncate" style={{ color: "var(--sol-base01)" }} title={probable.label}>
                    {probable.label.replace(/ (filed|chatter)/, "")}
                  </span>
                </div>
              ) : (
                <div style={{ fontSize: "10px", color: "var(--sol-base1)" }}>no dated catalyst found</div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
