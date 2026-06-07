import type { MarketRegime } from "../types"
import { TrendingUp, TrendingDown, Gauge, Bitcoin, BarChart3 } from "lucide-react"

interface Props {
  market: MarketRegime
  activeCategory?: string
}

export function MarketBar({ market, activeCategory = "stocks" }: Props) {
  return (
    <div
      className="rounded-lg border p-4 animate-fadeIn"
      style={{
        backgroundColor: "var(--sol-base2)",
        borderColor: "var(--sol-base1)",
      }}
    >
      <div className="flex items-center justify-between flex-wrap gap-4">
        {/* SPY Regime */}
        {activeCategory !== "crypto" && (
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold flex items-center gap-1.5" style={{ color: "var(--sol-base02)" }}>
              <BarChart3 className="w-4 h-4" style={{ color: "var(--sol-blue)" }} />
              SPY
            </span>
            <div className="flex gap-1.5">
              {[
                { label: "200", status: market.spy200SMA },
                { label: "50", status: market.spy50SMA },
                { label: "20", status: market.spy20SMA },
                { label: "10", status: market.spy10SMA },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium"
                  style={{
                    backgroundColor: item.status === "above"
                      ? "rgba(133, 153, 0, 0.1)" : "rgba(220, 50, 47, 0.1)",
                    color: item.status === "above" ? "var(--sol-green)" : "var(--sol-red)",
                  }}
                >
                  {item.status === "above" ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {item.label}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* BTC Regime */}
        {(activeCategory === "crypto" || activeCategory === "all") && (
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold flex items-center gap-1.5" style={{ color: "var(--sol-base02)" }}>
              <Bitcoin className="w-4 h-4" style={{ color: "var(--sol-orange)" }} />
              BTC
            </span>
            <div className="flex gap-1.5">
              {[
                { label: "200", status: market.btc200SMA || "above" },
                { label: "50", status: market.btc50SMA || "above" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium"
                  style={{
                    backgroundColor: item.status === "above"
                      ? "rgba(133, 153, 0, 0.1)" : "rgba(220, 50, 47, 0.1)",
                    color: item.status === "above" ? "var(--sol-green)" : "var(--sol-red)",
                  }}
                >
                  {item.status === "above" ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {item.label}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Gold Regime */}
        {(activeCategory === "commodities" || activeCategory === "all") && (
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold flex items-center gap-1.5" style={{ color: "var(--sol-base02)" }}>
              <TrendingUp className="w-4 h-4" style={{ color: "var(--sol-yellow)" }} />
              GLD
            </span>
            <div className="flex gap-1.5">
              <div
                className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium"
                style={{
                  backgroundColor: "rgba(133, 153, 0, 0.1)",
                  color: "var(--sol-green)",
                }}
              >
                <TrendingUp className="w-3 h-3" />200
              </div>
            </div>
          </div>
        )}

        {/* NAAIM */}
        <div className="flex items-center gap-3 ml-auto">
          <div className="flex items-center gap-1.5">
            <Gauge className="w-4 h-4" style={{ color: "var(--sol-violet)" }} />
            <span className="text-sm font-medium" style={{ color: "var(--sol-base01)" }}>NAAIM</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-32 h-2 rounded-full" style={{ backgroundColor: "var(--sol-base1)" }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(market.naaim, 100)}%`,
                  backgroundColor: market.naaim >= 70 && market.naaim <= 90
                    ? "var(--sol-green)" : market.naaim > 90 ? "var(--sol-orange)" : "var(--sol-blue)",
                }}
              />
            </div>
            <span className="text-sm font-bold" style={{ color: "var(--sol-violet)" }}>
              {market.naaim.toFixed(1)}
            </span>
          </div>
          <span className="text-xs" style={{ color: "var(--sol-base01)" }}>
            {market.naaimDate}
          </span>
        </div>
      </div>
    </div>
  )
}
