import { useMemo } from "react"
import type { ScreenerAsset, MarketRegime } from "../types"
import { TrendingUp, Flame, ShieldAlert } from "lucide-react"

interface Props {
  assets: ScreenerAsset[]
  market: MarketRegime
  onPick: (asset: ScreenerAsset) => void
}

// "Why" line: pick the single most explanatory signal for display under the
// score. Order matters — coil > actionable > loaded-spring > quiet-coil >
// accelerating > breakout > momentum-leader > all-ma-up.
function why(asset: ScreenerAsset): string {
  const tags = asset.tags ?? []
  if (tags.includes("coil")) return "Full COIL setup"
  if (tags.includes("loaded-spring")) return "Loaded spring — coiled, hasn't run"
  if (tags.includes("quiet-coil")) return "Quiet coil — ADR contracting at highs"
  if (tags.includes("accelerating")) return "Accelerating momentum"
  if (tags.includes("breakout")) return "Breaking out"
  if (tags.includes("momentum-leader")) return "Top 5% momentum"
  if (tags.includes("all-ma-up")) return "Full MA alignment"
  if ((asset.conviction ?? 0) >= 70) return "High conviction"
  return "Setup"
}

export function ConvictionStrip({ assets, market, onPick }: Props) {
  const top = useMemo(() => {
    const riskOn = (market.spyRegime ?? "risk-on") === "risk-on"
    return assets
      .filter((a) => (a.conviction ?? 0) >= 55)
      .filter((a) => (a.riskScore ?? 100) <= 60)
      .filter((a) => a.trendState !== "downtrend")
      .filter((a) => a.subsector !== "Unclassified")
      .sort((a, b) => (b.conviction ?? 0) - (a.conviction ?? 0))
      .slice(0, riskOn ? 6 : 4)
  }, [assets, market.spyRegime])

  if (top.length === 0) return null

  const riskOn = (market.spyRegime ?? "risk-on") === "risk-on"

  return (
    <div className="mb-3">
      <div className="flex items-center gap-1.5 mb-2" style={{ fontSize: "10px", fontWeight: 600, color: "var(--sol-base01)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
        <Flame size={11} style={{ color: "var(--sol-orange)" }} />
        Top conviction
        {!riskOn && (
          <span
            className="inline-flex items-center gap-1 ml-1 px-1.5 py-0 rounded-full font-semibold"
            style={{ fontSize: "9px", textTransform: "none", letterSpacing: 0, backgroundColor: "rgba(220,50,47,0.10)", color: "var(--sol-red)" }}
            title="SPY is below its 140-day EMA. The strip is throttled to uptrending names only — exposure dial, not entry filter."
          >
            <ShieldAlert size={9} /> Risk-Off — throttled
          </span>
        )}
      </div>
      <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))" }}>
        {top.map((asset) => {
          const conviction = asset.conviction ?? 0
          const color =
            conviction >= 80 ? "var(--sol-green)" :
            conviction >= 65 ? "var(--sol-blue)" :
            "var(--sol-yellow)"
          const isCoil = asset.tags?.includes("coil")
          return (
            <button
              key={`${asset.category}-${asset.symbol}`}
              onClick={() => onPick(asset)}
              className="text-left rounded-lg border px-3 py-2.5 transition-all cursor-pointer hover:-translate-y-0.5"
              style={{
                backgroundColor: "var(--sol-base2)",
                borderColor: isCoil ? "rgba(133,153,0,0.35)" : "var(--sol-base1)",
                boxShadow: isCoil ? "0 1px 4px rgba(133,153,0,0.12)" : "none",
              }}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <span
                    className="font-bold"
                    style={{ color: "var(--sol-base02)", fontSize: "13px", fontFamily: "ui-monospace, SFMono-Regular, monospace" }}
                  >
                    {asset.symbol}
                  </span>
                  {asset.tokenSymbol && (
                    <span
                      className="px-1 rounded font-medium"
                      style={{ backgroundColor: "rgba(108,113,196,0.12)", color: "var(--sol-violet)", fontSize: "8px" }}
                    >
                      {asset.tokenSymbol}
                    </span>
                  )}
                </div>
                <span
                  className="inline-flex items-center justify-center rounded tabular-nums font-bold"
                  title={`Conviction ${conviction}/100 — blends COIL, relative strength, and setup, gated by regime and risk.`}
                  style={{
                    minWidth: 28,
                    height: 18,
                    fontSize: "10px",
                    color,
                    backgroundColor: "var(--sol-base3)",
                    border: `1px solid ${color}`,
                  }}
                >
                  {conviction}
                </span>
              </div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="font-bold tabular-nums" style={{ color: "var(--sol-base02)", fontSize: "13px" }}>
                  {asset.price?.toFixed(2) ?? "—"}
                </span>
                <span
                  className="inline-flex items-center gap-0.5 font-medium tabular-nums"
                  style={{
                    fontSize: "10px",
                    color: (asset.change24h ?? 0) >= 0 ? "var(--sol-green)" : "var(--sol-red)",
                  }}
                >
                  <TrendingUp size={9} />
                  {(asset.change24h ?? 0) >= 0 ? "+" : ""}{(asset.change24h ?? 0).toFixed(1)}%
                </span>
              </div>
              <div style={{ fontSize: "10px", color: "var(--sol-base01)", marginBottom: 4 }}>
                {why(asset)}
              </div>
              <div className="flex items-center justify-between" style={{ fontSize: "9px", color: "var(--sol-base1)" }}>
                <span>{asset.sector}</span>
                <span className="tabular-nums">
                  RS {asset.momentumRank ?? "—"} · {(asset.rsi ?? 0) > 0 ? `RSI ${asset.rsi}` : ""}
                </span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
