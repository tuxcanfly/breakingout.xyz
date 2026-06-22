import { useState, useMemo, useRef } from "react"
import type { ScreenerAsset } from "../types"
import { ChartHover } from "./ChartHover"
import {
  ChevronUp,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react"
import { Badge } from "./ui/badge"

interface Props {
  assets: ScreenerAsset[]
  getTightness?: (a: ScreenerAsset) => number
  dense?: boolean
  highlight?: string
  newSymbols?: Set<string>
  onRowClick?: (asset: ScreenerAsset) => void
}

type SortKey =
  | "symbol"
  | "adrPercent"
  | "pct1M"
  | "pct3M"
  | "pct6M"
  | "pct1Y"
  | "price"
  | "tightness"
  | "change24h"
  | "sector"
  | "momentumRank"
  | "setupScore"
  | "riskScore"
  | "coilScore"
  | "conviction"

type SortDir = "asc" | "desc"

interface SortHeaderProps {
  label: string
  sortId: SortKey
  sortKey: SortKey
  sortDir: SortDir
  onSort: (key: SortKey) => void
  className?: string
  title?: string
  goodDirection?: "up" | "down"
  align?: "left" | "center" | "right"
}

function SortHeader({
  label,
  sortId,
  sortKey,
  sortDir,
  onSort,
  className = "",
  title,
  goodDirection,
  align = "left",
}: SortHeaderProps) {
  const active = sortKey === sortId
  const alignClass = align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left"
  return (
    <th
      className={`px-2 ${alignClass} font-semibold cursor-pointer select-none whitespace-nowrap ${className}`}
      style={{ color: "var(--sol-base01)", fontSize: "11px", letterSpacing: "0.02em" }}
      onClick={() => onSort(sortId)}
      title={title}
    >
      <div className={`flex items-center gap-0.5 ${align === "center" ? "justify-center" : align === "right" ? "justify-end" : ""}`}>
        <span>
          {label}
          {goodDirection === "up" && (
            <span style={{ color: "var(--sol-green)", fontSize: "10px", marginLeft: "2px" }}>▲</span>
          )}
          {goodDirection === "down" && (
            <span style={{ color: "var(--sol-red)", fontSize: "10px", marginLeft: "2px" }}>▼</span>
          )}
        </span>
        {active &&
          (sortDir === "asc" ? (
            <ChevronUp className="w-3 h-3" />
          ) : (
            <ChevronDown className="w-3 h-3" />
          ))}
      </div>
    </th>
  )
}

function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>
  const q = query.toLowerCase()
  const t = text.toLowerCase()
  const parts: { str: string; match: boolean }[] = []
  let i = 0
  while (i < text.length) {
    const idx = t.indexOf(q, i)
    if (idx === -1) {
      parts.push({ str: text.slice(i), match: false })
      break
    }
    if (idx > i) parts.push({ str: text.slice(i, idx), match: false })
    parts.push({ str: text.slice(idx, idx + q.length), match: true })
    i = idx + q.length
  }
  return (
    <>
      {parts.map((p, idx) =>
        p.match ? (
          <mark
            key={idx}
            style={{
              backgroundColor: "rgba(38,139,210,0.20)",
              color: "var(--sol-base02)",
              borderRadius: "2px",
              padding: "0 1px",
            }}
          >
            {p.str}
          </mark>
        ) : (
          <span key={idx}>{p.str}</span>
        )
      )}
    </>
  )
}

export function AssetTable({ assets, getTightness, dense = false, highlight = "", newSymbols, onRowClick }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("conviction")
  const [sortDir, setSortDir] = useState<SortDir>("desc")

  const sorted = useMemo(() => {
    return [...assets].sort((a, b) => {
      let aVal: string | number = a[sortKey] ?? 0
      let bVal: string | number = b[sortKey] ?? 0
      if (sortKey === "tightness" && getTightness) {
        aVal = getTightness(a)
        bVal = getTightness(b)
      }
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDir === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal)
      }
      return sortDir === "asc"
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number)
    })
  }, [assets, sortKey, sortDir, getTightness])

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDir("desc")
    }
  }

  const cellV = dense ? "py-0.5" : "py-1.5"
  const thV = dense ? "py-1" : "py-2"

  if (assets.length === 0) {
    return (
      <div
        className="rounded-lg border p-6 text-center"
        style={{
          backgroundColor: "var(--sol-base2)",
          borderColor: "var(--sol-base1)",
        }}
      >
        <p style={{ color: "var(--sol-base01)", fontSize: "12px" }}>
          No assets match your filter
        </p>
      </div>
    )
  }

  return (
    <div
      className="rounded-lg border overflow-hidden"
      style={{
        backgroundColor: "var(--sol-base3)",
        borderColor: "var(--sol-base1)",
      }}
    >
      <div className="overflow-x-auto">
        <table className="w-full" style={{ fontSize: "12px", lineHeight: "1.4" }}>
          <thead>
            <tr
              style={{
                backgroundColor: "var(--sol-base2)",
                borderBottom: "1px solid var(--sol-base1)",
              }}
            >
              <SortHeader
                label="Sym"
                sortId="symbol"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={handleSort}
                className={thV}
              />
              <SortHeader
                label="Sector"
                sortId="sector"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={handleSort}
                className={thV}
              />
              <SortHeader
                label="Conv"
                sortId="conviction"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={handleSort}
                className={thV}
                goodDirection="up"
                title="Conviction — the actionable composite. Blends COIL, relative strength, and setup, gated by SPY regime and risk. Surfaces in the Top Conviction strip. Higher is better."
              />
              <SortHeader
                label="COIL"
                sortId="coilScore"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={handleSort}
                className={thV}
                goodDirection="up"
                title="COIL setup score — blends proximity to the 50-day high (trigger), base tightness in ADR units (coil), and blended momentum rank (leadership). Backtested 2012–2026: stacking all three roughly tripled 20-day forward returns vs unfiltered breakouts."
              />
              <SortHeader
                label="RS"
                sortId="momentumRank"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={handleSort}
                className={thV}
                goodDirection="up"
                title="Relative Strength — blended percentile rank across 1M, 3M, 6M, and 1Y momentum. The strongest single factor in the breakout backtest. Higher is better."
              />
              <SortHeader
                label="Setup"
                sortId="setupScore"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={handleSort}
                className={thV}
                goodDirection="up"
                title="Setup Score — blend of MA alignment, tightness, and momentum rank. Higher is better."
              />
              <SortHeader
                label="Risk"
                sortId="riskScore"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={handleSort}
                className={thV}
                goodDirection="down"
                title="Risk Score — blend of ADR, trend weakness, and volatility. Lower is better."
              />
              <SortHeader
                label="ADR"
                sortId="adrPercent"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={handleSort}
                className={thV}
                title="Average Daily Range % — typical daily high-low swing. Lower = tighter."
              />
              <th
                className={`px-2 ${thV} text-left font-semibold whitespace-nowrap`}
                style={{ color: "var(--sol-base01)", fontSize: "11px" }}
                title="Moving Average directions: 10, 20, 50, 200-day SMA"
              >
                MAs
              </th>
              <th
                className={`px-2 ${thV} text-left font-semibold whitespace-nowrap`}
                style={{ color: "var(--sol-base01)", fontSize: "11px" }}
              >
                Tags
              </th>
              <SortHeader
                label="24h"
                sortId="change24h"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={handleSort}
                className={thV}
                align="center"
              />
              <SortHeader
                label="1M"
                sortId="pct1M"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={handleSort}
                className={thV}
                align="center"
              />
              <SortHeader
                label="3M"
                sortId="pct3M"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={handleSort}
                className={thV}
                align="center"
              />
              <SortHeader
                label="6M"
                sortId="pct6M"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={handleSort}
                className={thV}
                align="center"
              />
              <SortHeader
                label="1Y"
                sortId="pct1Y"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={handleSort}
                className={thV}
                align="center"
              />
            </tr>
          </thead>
          <tbody>
            {sorted.map((asset, i) => (
              <tr
                key={`${asset.category}-${asset.symbol}`}
                className="stock-row"
                onClick={() => onRowClick?.(asset)}
                style={{
                  borderBottom: "1px solid rgba(147,161,161,0.12)",
                  animationDelay: `${Math.min(i * 8, 300)}ms`,
                  cursor: onRowClick ? "pointer" : "default",
                }}
              >
                <td className={`px-2 ${cellV} sticky-col`}>
                  <div className="flex items-center gap-1.5">
                    <ChartHover
                      symbol={asset.symbol}
                      name={asset.name}
                      category={asset.category}
                      chartSymbol={asset.chartSymbol}
                    >
                      <span
                        className="font-bold"
                        style={{
                          color: "var(--sol-base02)",
                          fontSize: dense ? "11px" : "12px",
                          fontFamily: "ui-monospace, SFMono-Regular, monospace",
                        }}
                      >
                        <HighlightText text={asset.symbol} query={highlight} />
                      </span>
                    </ChartHover>
                    {asset.tokenSymbol && (
                      <Badge
                        variant="secondary"
                        className="px-1 py-0 cursor-pointer"
                        style={{
                          backgroundColor: "rgba(108, 113, 196, 0.12)",
                          color: "var(--sol-violet)",
                          fontSize: "9px",
                          height: "14px",
                        }}
                        title={`Tokenized: ${asset.tokenSymbol} on ${asset.venue || "xStocks"}`}
                        onClick={() => {
                          navigator.clipboard.writeText(asset.tokenSymbol!)
                        }}
                      >
                        {asset.tokenSymbol}
                      </Badge>
                    )}
                    {asset.tightness && asset.tightness.length > 0 && (
                      <Badge
                        variant="secondary"
                        className="px-1 py-0"
                        style={{
                          backgroundColor: "rgba(42, 161, 152, 0.10)",
                          color: "var(--sol-cyan)",
                          fontSize: "9px",
                          height: "14px",
                        }}
                        title={`Tight base — MA compression ${asset.coilTightness !== undefined ? asset.coilTightness.toFixed(1) : "<4"} ADR units (research threshold: 4)`}
                      >
                        T
                      </Badge>
                    )}
                    {newSymbols?.has(asset.symbol) && (
                      <Badge
                        variant="secondary"
                        className="px-1 py-0"
                        style={{
                          backgroundColor: "rgba(220, 50, 47, 0.12)",
                          color: "var(--sol-red)",
                          fontSize: "9px",
                          height: "14px",
                        }}
                        title="New since your last visit — coil setup or top setup score"
                      >
                        New
                      </Badge>
                    )}
                    <AnalystRatingPill rating={asset.analystRating} />
                  </div>
                </td>
                <td className={`px-2 ${cellV}`}>
                  <div className="leading-tight">
                    <div
                      style={{
                        color: "var(--sol-base02)",
                        fontSize: dense ? "10px" : "11px",
                        fontWeight: 600,
                      }}
                    >
                      <HighlightText text={asset.sector} query={highlight} />
                    </div>
                    <div
                      className="truncate max-w-[120px]"
                      style={{
                        color: "var(--sol-base01)",
                        fontSize: dense ? "9px" : "9px",
                      }}
                    >
                      {asset.subsector || asset.industry}
                    </div>
                  </div>
                </td>
                <td className={`px-2 ${cellV}`}>
                  <ConvictionPill asset={asset} />
                </td>
                <td className={`px-2 ${cellV}`}>
                  <CoilPill asset={asset} />
                </td>
                <td className={`px-2 ${cellV}`}>
                  <ScorePill value={asset.momentumRank ?? 50} kind="rank" />
                </td>
                <td className={`px-2 ${cellV}`}>
                  <ScorePill
                    value={asset.setupScore ?? (getTightness ? getTightness(asset) : 0)}
                    kind="setup"
                  />
                </td>
                <td className={`px-2 ${cellV}`}>
                  <ScorePill value={asset.riskScore ?? 0} kind="risk" />
                </td>
                <td
                  className={`px-2 ${cellV} font-medium tabular-nums`}
                  style={{ color: "var(--sol-base00)", fontSize: dense ? "10px" : "11px" }}
                >
                  {asset.adrPercent.toFixed(1)}%
                </td>
                <td className={`px-2 ${cellV}`}>
                  <div className="flex gap-0.5">
                    {[asset.ma10, asset.ma20, asset.ma50, asset.ma200].map((ma, j) => (
                      <span
                        key={j}
                        className="inline-flex items-center"
                        style={{
                          color: ma === "up" ? "var(--sol-green)" : "var(--sol-red)",
                          opacity: 0.75,
                        }}
                        title={["10", "20", "50", "200"][j]}
                      >
                        {ma === "up" ? (
                          <TrendingUp className="w-2.5 h-2.5" />
                        ) : (
                          <TrendingDown className="w-2.5 h-2.5" />
                        )}
                      </span>
                    ))}
                  </div>
                </td>
                <td className={`px-2 ${cellV}`}>
                  <TagList tags={asset.tags} />
                </td>
                <td className={`px-2 ${cellV} text-center`}>
                  <PctCell value={asset.change24h ?? 0} dense={dense} />
                </td>
                <td className={`px-2 ${cellV} text-center`}>
                  <PctCell value={asset.pct1M} dense={dense} />
                </td>
                <td className={`px-2 ${cellV} text-center`}>
                  <PctCell value={asset.pct3M} dense={dense} />
                </td>
                <td className={`px-2 ${cellV} text-center`}>
                  <PctCell value={asset.pct6M} dense={dense} />
                </td>
                <td className={`px-2 ${cellV} text-center`}>
                  <PctCell value={asset.pct1Y} dense={dense} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function PctCell({ value, dense }: { value: number; dense?: boolean }) {
  const color =
    value > 0 ? "var(--sol-green)" : value < 0 ? "var(--sol-red)" : "var(--sol-base01)"
  const Icon = value > 0 ? TrendingUp : value < 0 ? TrendingDown : Minus

  return (
    <span
      className="inline-flex items-center gap-0.5 font-medium tabular-nums whitespace-nowrap"
      style={{ color, fontSize: dense ? "10px" : "11px" }}
    >
      <Icon className="w-2.5 h-2.5" />
      {value >= 0 ? "+" : ""}
      {value.toFixed(1)}%
    </span>
  )
}

function ScorePill({ value, kind }: { value: number; kind: "rank" | "setup" | "risk" }) {
  const highGood = kind !== "risk"
  const label =
    kind === "rank"
      ? `RS: ${value} of 100 — top ${100 - value}% momentum`
      : kind === "setup"
        ? `Setup: ${value} of 100 — higher is better`
        : `Risk: ${value} of 100 — lower is better`
  const color = highGood
    ? value >= 80
      ? "var(--sol-green)"
      : value >= 50
        ? "var(--sol-blue)"
        : value >= 25
          ? "var(--sol-yellow)"
          : "var(--sol-red)"
    : value >= 70
      ? "var(--sol-red)"
      : value >= 45
        ? "var(--sol-yellow)"
        : "var(--sol-green)"
  return (
    <span
      className="inline-flex items-center justify-center rounded tabular-nums font-bold"
      title={label}
      style={{
        minWidth: 28,
        height: 18,
        color,
        backgroundColor: "var(--sol-base2)",
        border: "1px solid rgba(147,161,161,0.25)",
        fontSize: "10px",
      }}
    >
      {value.toFixed(0)}
    </span>
  )
}

function ConvictionPill({ asset }: { asset: ScreenerAsset }) {
  const value = asset.conviction
  if (value === undefined) {
    return (
      <span style={{ color: "var(--sol-base1)", fontSize: "10px" }}>—</span>
    )
  }
  const color =
    value >= 80 ? "var(--sol-green)" :
    value >= 65 ? "var(--sol-blue)" :
    value >= 45 ? "var(--sol-yellow)" :
    "var(--sol-red)"
  const actionable = value >= 70 && (asset.riskScore ?? 100) <= 55
  return (
    <span
      className="inline-flex items-center justify-center gap-0.5 rounded tabular-nums font-bold"
      title={`Conviction ${value}/100 — blends COIL, RS, and setup, gated by regime and risk.${actionable ? " Actionable." : ""}`}
      style={{
        minWidth: 28,
        height: 18,
        padding: "0 3px",
        color,
        backgroundColor: actionable ? "rgba(133,153,0,0.10)" : "var(--sol-base2)",
        border: actionable ? `1px solid rgba(133,153,0,0.45)` : "1px solid rgba(147,161,161,0.25)",
        fontSize: "10px",
      }}
    >
      {value.toFixed(0)}
      {actionable && <span style={{ fontSize: "8px" }}>●</span>}
    </span>
  )
}

function CoilPill({ asset }: { asset: ScreenerAsset }) {
  const value = asset.coilScore
  if (value === undefined) {
    return (
      <span style={{ color: "var(--sol-base1)", fontSize: "10px" }} title="COIL score unavailable — missing MA or range data">
        —
      </span>
    )
  }
  const dist = asset.distToHighPct
  const tight = asset.coilTightness
  const rank = asset.momentumRank ?? 0
  const triggerOk = dist !== undefined && dist >= -1
  const tightOk = tight !== undefined && tight < 4
  const leadOk = rank >= 89
  const full = triggerOk && tightOk && leadOk
  const lines = [
    `COIL ${value} of 100${full ? " — full setup" : ""}`,
    dist !== undefined
      ? `${triggerOk ? "✓" : "✗"} Trigger: ${dist.toFixed(1)}% from 3M high`
      : "✗ Trigger: no high data",
    tight !== undefined
      ? `${tightOk ? "✓" : "✗"} Coil: tightness ${tight.toFixed(1)} ADR units (tight < 4)`
      : "✗ Coil: no tightness data",
    `${leadOk ? "✓" : "✗"} Lead: top ${100 - rank}% blended momentum (need top 11%)`,
  ]
  const color =
    value >= 80 ? "var(--sol-green)" : value >= 60 ? "var(--sol-blue)" : value >= 40 ? "var(--sol-yellow)" : "var(--sol-red)"
  return (
    <span
      className="inline-flex items-center justify-center gap-0.5 rounded tabular-nums font-bold"
      title={lines.join("\n")}
      style={{
        minWidth: 28,
        height: 18,
        padding: "0 3px",
        color,
        backgroundColor: full ? "rgba(133,153,0,0.10)" : "var(--sol-base2)",
        border: full ? "1px solid rgba(133,153,0,0.45)" : "1px solid rgba(147,161,161,0.25)",
        fontSize: "10px",
      }}
    >
      {value.toFixed(0)}
      {full && <span style={{ fontSize: "8px" }}>●</span>}
    </span>
  )
}
function AnalystRatingPill({ rating }: { rating?: ScreenerAsset["analystRating"] }) {
  if (!rating) return null
  const color =
    rating.consensus === "strong buy"
      ? "var(--sol-green)"
      : rating.consensus === "buy"
      ? "var(--sol-cyan)"
      : rating.consensus === "hold"
      ? "var(--sol-yellow)"
      : rating.consensus === "sell"
      ? "var(--sol-orange)"
      : "var(--sol-red)"
  return (
    <Badge
      variant="secondary"
      className="px-1 py-0"
      style={{
        backgroundColor: color.replace(")", ", 0.12)").replace("rgb", "rgba"),
        color,
        fontSize: "9px",
        height: "14px",
      }}
      title={`Analyst consensus: ${rating.consensus} (${rating.strongBuy} strong buy, ${rating.buy} buy, ${rating.hold} hold, ${rating.sell} sell, ${rating.strongSell} strong sell)`}
    >
      {rating.consensus.toUpperCase()}
    </Badge>
  )
}

const tagStyles: Record<string, { bg: string; color: string; border: string }> = {
  naaim: { bg: "rgba(133,153,0,0.10)", color: "#859900", border: "rgba(133,153,0,0.25)" },
  "naaim-extreme": { bg: "rgba(203,75,22,0.10)", color: "#cb4b16", border: "rgba(203,75,22,0.25)" },
  "naaim-caution": { bg: "rgba(220,50,47,0.10)", color: "#dc322f", border: "rgba(220,50,47,0.25)" },
  "all-ma-up": { bg: "rgba(133,153,0,0.10)", color: "#859900", border: "rgba(133,153,0,0.20)" },
  "all-ma-down": { bg: "rgba(220,50,47,0.10)", color: "#dc322f", border: "rgba(220,50,47,0.20)" },
  "momentum-leader": { bg: "rgba(38,139,210,0.10)", color: "#268bd2", border: "rgba(38,139,210,0.25)" },
  "strong-momentum": { bg: "rgba(133,153,0,0.12)", color: "#859900", border: "rgba(133,153,0,0.25)" },
  "weak-momentum": { bg: "rgba(220,50,47,0.12)", color: "#dc322f", border: "rgba(220,50,47,0.25)" },
  "high-volatility": { bg: "rgba(181,137,0,0.10)", color: "#b58900", border: "rgba(181,137,0,0.20)" },
  "low-volatility": { bg: "rgba(42,161,152,0.10)", color: "#2aa198", border: "rgba(42,161,152,0.20)" },
  "tight-base": { bg: "rgba(108,113,196,0.10)", color: "#6c71c4", border: "rgba(108,113,196,0.20)" },
  breakout: { bg: "rgba(38,139,210,0.12)", color: "#268bd2", border: "rgba(38,139,210,0.25)" },
  coil: { bg: "rgba(133,153,0,0.14)", color: "#859900", border: "rgba(133,153,0,0.35)" },
  stage2: { bg: "rgba(133,153,0,0.08)", color: "#859900", border: "rgba(133,153,0,0.15)" },
  "rs-90": { bg: "rgba(38,139,210,0.12)", color: "#268bd2", border: "rgba(38,139,210,0.25)" },
  "clean-setup": { bg: "rgba(42,161,152,0.12)", color: "#2aa198", border: "rgba(42,161,152,0.25)" },
  "bottom-decile": { bg: "rgba(220,50,47,0.12)", color: "#dc322f", border: "rgba(220,50,47,0.25)" },
  transition: { bg: "rgba(181,137,0,0.10)", color: "#b58900", border: "rgba(181,137,0,0.25)" },
  avoid: { bg: "rgba(220,50,47,0.12)", color: "#dc322f", border: "rgba(220,50,47,0.25)" },
  // Unusual / hidden signals
  actionable: { bg: "rgba(133,153,0,0.16)", color: "#859900", border: "rgba(133,153,0,0.40)" },
  "loaded-spring": { bg: "rgba(203,75,22,0.10)", color: "#cb4b16", border: "rgba(203,75,22,0.30)" },
  accelerating: { bg: "rgba(38,139,210,0.12)", color: "#268bd2", border: "rgba(38,139,210,0.30)" },
  "quiet-coil": { bg: "rgba(42,161,152,0.12)", color: "#2aa198", border: "rgba(42,161,152,0.30)" },
  "regime-aligned": { bg: "rgba(133,153,0,0.10)", color: "#859900", border: "rgba(133,153,0,0.25)" },
  "reversal-watch": { bg: "rgba(181,137,0,0.12)", color: "#b58900", border: "rgba(181,137,0,0.30)" },
  "rsi-overbought": { bg: "rgba(220,50,47,0.10)", color: "#dc322f", border: "rgba(220,50,47,0.25)" },
  "rsi-oversold": { bg: "rgba(42,161,152,0.12)", color: "#2aa198", border: "rgba(42,161,152,0.30)" },
  trending: { bg: "rgba(211,54,130,0.12)", color: "#d33682", border: "rgba(211,54,130,0.30)" },
  aleabitoreddit: { bg: "rgba(211,54,130,0.10)", color: "#d33682", border: "rgba(211,54,130,0.25)" },
  realsimpleariel: { bg: "rgba(38,139,210,0.10)", color: "#268bd2", border: "rgba(38,139,210,0.25)" },
  stamatoudism: { bg: "rgba(108,113,196,0.10)", color: "#6c71c4", border: "rgba(108,113,196,0.25)" },
  jfsrev: { bg: "rgba(203,75,22,0.10)", color: "#cb4b16", border: "rgba(203,75,22,0.25)" },
  asymtrading: { bg: "rgba(133,153,0,0.10)", color: "#859900", border: "rgba(133,153,0,0.25)" },
  tenet_research: { bg: "rgba(38,139,210,0.10)", color: "#268bd2", border: "rgba(38,139,210,0.25)" },
  chairmansledger: { bg: "rgba(181,137,0,0.10)", color: "#b58900", border: "rgba(181,137,0,0.25)" },
}

const TAG_LINKS: Record<string, string> = {
  aleabitoreddit: "https://x.com/aleabitoreddit",
  realsimpleariel: "https://x.com/realsimpleariel",
  stamatoudism: "https://x.com/stamatoudism",
  jfsrev: "https://x.com/jfsrev",
  tenet_research: "https://x.com/tenet_research",
  chairmansledger: "https://x.com/ChairmansLedger",
}

function TagList({ tags }: { tags?: string[] }) {
  const [hoverOpen, setHoverOpen] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  if (!tags || tags.length === 0) return null
  // Filter out xstock tag — shown as badge next to symbol instead
  const allVisible = tags.filter((t) => t !== "xstock")
  const display = allVisible.slice(0, 3)
  const hidden = allVisible.slice(3)
  const remaining = hidden.length

  const onEnter = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setHoverOpen(true)
  }
  const onLeave = () => {
    timerRef.current = setTimeout(() => setHoverOpen(false), 120)
  }

  return (
    <div className="flex flex-wrap gap-1">
      {display.map((tag) => {
        const style =
          tagStyles[tag] || {
            bg: "var(--sol-base2)",
            color: "var(--sol-base01)",
            border: "var(--sol-base1)",
          }
        const link = TAG_LINKS[tag]
        const TagEl = link ? "a" : "span"
        return (
          <TagEl
            key={tag}
            className="inline-block px-1 rounded font-medium"
            style={{
              fontSize: "9px",
              lineHeight: "14px",
              backgroundColor: style.bg,
              color: style.color,
              border: `1px solid ${style.border}`,
              textDecoration: "none",
              cursor: link ? "pointer" : "default",
            }}
            title={tag}
            href={link}
            target={link ? "_blank" : undefined}
            rel={link ? "noopener noreferrer" : undefined}
          >
            {tag}
          </TagEl>
        )
      })}
      {remaining > 0 && (
        <span
          className="relative inline-block px-1 rounded cursor-default"
          style={{
            fontSize: "9px",
            color: "var(--sol-base1)",
            background: "var(--sol-base2)",
          }}
          onMouseEnter={onEnter}
          onMouseLeave={onLeave}
        >
          +{remaining}
          {hoverOpen && (
            <span
              className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1.5 rounded-md shadow-lg"
              style={{
                background: "var(--sol-base3)",
                border: "1px solid var(--sol-base2)",
                boxShadow: "0 6px 20px rgba(0,0,0,0.12)",
                minWidth: "80px",
                animation: "fadeIn 0.12s ease-out",
              }}
              onMouseEnter={onEnter}
              onMouseLeave={onLeave}
            >
              <span
                className="absolute left-1/2 -translate-x-1/2 top-full"
                style={{
                  width: 0,
                  height: 0,
                  borderLeft: "4px solid transparent",
                  borderRight: "4px solid transparent",
                  borderTop: "4px solid var(--sol-base2)",
                }}
              />
              <div className="flex flex-wrap gap-1">
                {hidden.map((tag) => {
                  const s =
                    tagStyles[tag] || {
                      bg: "var(--sol-base2)",
                      color: "var(--sol-base01)",
                      border: "var(--sol-base1)",
                    }
                  const link = TAG_LINKS[tag]
                  const TagEl = link ? "a" : "span"
                  return (
                    <TagEl
                      key={tag}
                      className="inline-block px-1 rounded font-medium whitespace-nowrap"
                      style={{
                        fontSize: "9px",
                        lineHeight: "14px",
                        backgroundColor: s.bg,
                        color: s.color,
                        border: `1px solid ${s.border}`,
                        textDecoration: "none",
                        cursor: link ? "pointer" : "default",
                      }}
                      href={link}
                      target={link ? "_blank" : undefined}
                      rel={link ? "noopener noreferrer" : undefined}
                    >
                      {tag}
                    </TagEl>
                  )
                })}
              </div>
            </span>
          )}
        </span>
      )}
    </div>
  )
}
