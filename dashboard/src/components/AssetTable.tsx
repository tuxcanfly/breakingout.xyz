import { useState, useMemo, useRef } from "react"
import type { ScreenerAsset, AssetCategory } from "../types"
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
}

type SortKey = "symbol" | "adrPercent" | "pct1M" | "pct3M" | "pct6M" | "pct1Y" | "price" | "tightness" | "change24h"
type SortDir = "asc" | "desc"

const categoryColors: Record<AssetCategory, string> = {
  stocks: "var(--sol-blue)",
  crypto: "var(--sol-orange)",
  etfs: "var(--sol-cyan)",
  commodities: "var(--sol-yellow)",
}

export function AssetTable({ assets, getTightness }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("pct1M")
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

  const SortHeader = ({
    label,
    sortId,
    className = "",
  }: {
    label: string
    sortId: SortKey
    className?: string
  }) => (
    <th
      className={`px-2 py-2 text-left font-semibold cursor-pointer select-none whitespace-nowrap ${className}`}
      style={{ color: "var(--sol-base01)", fontSize: "11px", letterSpacing: "0.02em" }}
      onClick={() => handleSort(sortId)}
    >
      <div className="flex items-center gap-0.5">
        {label}
        {sortKey === sortId &&
          (sortDir === "asc" ? (
            <ChevronUp className="w-3 h-3" />
          ) : (
            <ChevronDown className="w-3 h-3" />
          ))}
      </div>
    </th>
  )

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
    <div className="rounded-lg border overflow-hidden" style={{
      backgroundColor: "var(--sol-base3)",
      borderColor: "var(--sol-base1)",
    }}>
      <div className="overflow-x-auto">
        <table className="w-full" style={{ fontSize: "12px", lineHeight: "1.4" }}>
          <thead>
            <tr style={{ backgroundColor: "var(--sol-base2)", borderBottom: "1px solid var(--sol-base1)" }}>
              <SortHeader label="Sym" sortId="symbol" />
              <SortHeader label="Tight" sortId="tightness" />
              <SortHeader label="ADR" sortId="adrPercent" />
              <th className="px-2 py-2 text-left font-semibold whitespace-nowrap" style={{ color: "var(--sol-base01)", fontSize: "11px" }}>MAs</th>
              <th className="px-2 py-2 text-left font-semibold whitespace-nowrap" style={{ color: "var(--sol-base01)", fontSize: "11px" }}>Tags</th>
              <SortHeader label="24h" sortId="change24h" />
              <SortHeader label="1M" sortId="pct1M" />
              <SortHeader label="3M" sortId="pct3M" />
              <SortHeader label="6M" sortId="pct6M" />
              <SortHeader label="1Y" sortId="pct1Y" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((asset, i) => (
              <tr
                key={`${asset.category}-${asset.symbol}`}
                className="stock-row"
                style={{
                  borderBottom: "1px solid rgba(147,161,161,0.15)",
                  animationDelay: `${Math.min(i * 15, 300)}ms`,
                }}
              >
                <td className="px-2 py-1.5">
                  <div className="flex items-center gap-1.5">
                    <ChartHover symbol={asset.symbol} name={asset.name}>
                      <span className="font-bold" style={{ color: "var(--sol-base02)", fontSize: "12px", fontFamily: "ui-monospace, SFMono-Regular, monospace" }}>
                        {asset.symbol}
                      </span>
                    </ChartHover>
                    {asset.tightness && asset.tightness.length > 0 && (
                      <Badge
                        variant="secondary"
                        className="px-1 py-0"
                        style={{
                          backgroundColor: "rgba(42, 161, 152, 0.1)",
                          color: "var(--sol-cyan)",
                          fontSize: "9px",
                          height: "14px",
                        }}
                      >
                        T
                      </Badge>
                    )}
                  </div>
                </td>
                <td className="px-2 py-1.5">
                  {getTightness ? <TightnessDot score={getTightness(asset)} /> : <span style={{ color: "var(--sol-base01)", fontSize: "11px" }}>--</span>}
                </td>
                <td className="px-2 py-1.5 font-medium tabular-nums" style={{ color: "var(--sol-base00)", fontSize: "11px" }}>
                  {asset.adrPercent.toFixed(1)}%
                </td>
                <td className="px-2 py-1.5">
                  <div className="flex gap-0.5">
                    {[asset.ma10, asset.ma20, asset.ma50, asset.ma200].map(
                      (ma, j) => (
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
                      )
                    )}
                  </div>
                </td>
                <td className="px-2 py-1.5">
                  <TagList tags={asset.tags} />
                </td>
                <td className="px-2 py-1.5">
                  <PctCell value={asset.change24h ?? 0} />
                </td>
                <td className="px-2 py-1.5">
                  <PctCell value={asset.pct1M} />
                </td>
                <td className="px-2 py-1.5">
                  <PctCell value={asset.pct3M} />
                </td>
                <td className="px-2 py-1.5">
                  <PctCell value={asset.pct6M} />
                </td>
                <td className="px-2 py-1.5">
                  <PctCell value={asset.pct1Y} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function PctCell({ value }: { value: number }) {
  const color =
    value > 0 ? "var(--sol-green)" : value < 0 ? "var(--sol-red)" : "var(--sol-base01)"
  const Icon = value > 0 ? TrendingUp : value < 0 ? TrendingDown : Minus

  return (
    <span
      className="inline-flex items-center gap-0.5 font-medium tabular-nums whitespace-nowrap"
      style={{ color, fontSize: "11px" }}
    >
      <Icon className="w-2.5 h-2.5" />
      {value >= 0 ? "+" : ""}
      {value.toFixed(1)}%
    </span>
  )
}

function TightnessDot({ score }: { score: number }) {
  const color =
    score >= 70 ? "var(--sol-green)" :
    score >= 40 ? "var(--sol-yellow)" :
    "var(--sol-base1)"
  return (
    <span
      className="inline-block w-2 h-2 rounded-full"
      style={{ backgroundColor: color, opacity: score >= 40 ? 0.9 : 0.3 }}
      title={`${score.toFixed(0)}`}
    />
  )
}

const tagStyles: Record<string, { bg: string; color: string; border: string }> = {
  "naaim":    { bg: "rgba(133,153,0,0.10)", color: "#859900", border: "rgba(133,153,0,0.25)" },
  "naaim-extreme":    { bg: "rgba(203,75,22,0.10)", color: "#cb4b16", border: "rgba(203,75,22,0.25)" },
  "naaim-caution":    { bg: "rgba(220,50,47,0.10)", color: "#dc322f", border: "rgba(220,50,47,0.25)" },
  "all-ma-up":        { bg: "rgba(133,153,0,0.10)", color: "#859900", border: "rgba(133,153,0,0.20)" },
  "all-ma-down":      { bg: "rgba(220,50,47,0.10)", color: "#dc322f", border: "rgba(220,50,47,0.20)" },
  "momentum-leader":  { bg: "rgba(38,139,210,0.10)", color: "#268bd2", border: "rgba(38,139,210,0.25)" },
  "strong-momentum":  { bg: "rgba(133,153,0,0.12)", color: "#859900", border: "rgba(133,153,0,0.25)" },
  "weak-momentum":    { bg: "rgba(220,50,47,0.12)", color: "#dc322f", border: "rgba(220,50,47,0.25)" },
  "high-volatility":  { bg: "rgba(181,137,0,0.10)", color: "#b58900", border: "rgba(181,137,0,0.20)" },
  "low-volatility":   { bg: "rgba(42,161,152,0.10)", color: "#2aa198", border: "rgba(42,161,152,0.20)" },
  "tight-base":       { bg: "rgba(108,113,196,0.10)", color: "#6c71c4", border: "rgba(108,113,196,0.20)" },
  "breakout":         { bg: "rgba(38,139,210,0.12)", color: "#268bd2", border: "rgba(38,139,210,0.25)" },
  "stage2":           { bg: "rgba(133,153,0,0.08)", color: "#859900", border: "rgba(133,153,0,0.15)" },
  "aleabitoreddit":   { bg: "rgba(211,54,130,0.10)", color: "#d33682", border: "rgba(211,54,130,0.25)" },
}

function TagList({ tags }: { tags?: string[] }) {
  if (!tags || tags.length === 0) return null
  const display = tags.slice(0, 3)
  const remaining = tags.length - display.length

  return (
    <div className="flex flex-wrap gap-1">
      {display.map((tag) => {
        const style = tagStyles[tag] || { bg: "var(--sol-base2)", color: "var(--sol-base01)", border: "var(--sol-base1)" }
        return (
          <span
            key={tag}
            className="inline-block px-1 rounded font-medium"
            style={{
              fontSize: "9px",
              lineHeight: "14px",
              backgroundColor: style.bg,
              color: style.color,
              border: `1px solid ${style.border}`,
            }}
            title={tag}
          >
            {tag}
          </span>
        )
      })}
      {remaining > 0 && <TagOverflow remaining={remaining} hiddenTags={tags.slice(3)} />}
    </div>
  )
}

function TagOverflow({ remaining, hiddenTags }: { remaining: number; hiddenTags: string[] }) {
  const [show, setShow] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const onEnter = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setShow(true)
  }
  const onLeave = () => {
    timerRef.current = setTimeout(() => setShow(false), 120)
  }

  return (
    <span
      className="relative inline-block"
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      <span
        className="inline-block px-1 rounded cursor-default"
        style={{ fontSize: "9px", color: "var(--sol-base1)", background: "var(--sol-base2)" }}
      >
        +{remaining}
      </span>
      {show && (
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
            {hiddenTags.map((tag) => {
              const s = tagStyles[tag] || { bg: "var(--sol-base2)", color: "var(--sol-base01)", border: "var(--sol-base1)" }
              return (
                <span
                  key={tag}
                  className="inline-block px-1 rounded font-medium whitespace-nowrap"
                  style={{
                    fontSize: "9px",
                    lineHeight: "14px",
                    backgroundColor: s.bg,
                    color: s.color,
                    border: `1px solid ${s.border}`,
                  }}
                >
                  {tag}
                </span>
              )
            })}
          </div>
        </span>
      )}
    </span>
  )
}
