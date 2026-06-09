import type { ScreenerAsset } from "../types"

interface Props {
  assets: ScreenerAsset[]
  onSelectSector?: (sector: string) => void
  activeSector?: string | null
}

interface SectorSummary {
  sector: string
  count: number
  avgPct1M: number
  avgRank: number
  leaders: ScreenerAsset[]
}

export function SectorHeatmap({ assets, onSelectSector, activeSector }: Props) {
  const sectors = summarizeSectors(assets)
  if (sectors.length === 0) return null

  return (
    <section className="mb-3">
      <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
        {sectors.slice(0, 12).map((s) => {
          const tone = sectorTone(s.avgRank)
          const isActive = activeSector === s.sector
          return (
            <button
              key={s.sector}
              type="button"
              onClick={() => onSelectSector?.(s.sector)}
              className="text-left rounded-md border px-2.5 py-2 transition-all"
              style={{
                backgroundColor: isActive ? tone.bg.replace("0.13", "0.22") : tone.bg,
                borderColor: isActive ? tone.fg : tone.border,
                minHeight: 74,
                cursor: onSelectSector ? "pointer" : "default",
                transform: isActive ? "scale(0.98)" : "scale(1)",
              }}
              title={`${s.sector}: ${s.count} assets · click to filter`}
            >
              <div className="flex items-start justify-between gap-2">
                <div
                  className="font-bold leading-tight"
                  style={{ color: "var(--sol-base02)", fontSize: "11px" }}
                >
                  {s.sector}
                </div>
                <div
                  className="font-bold tabular-nums"
                  style={{ color: tone.fg, fontSize: "12px" }}
                >
                  {s.avgRank.toFixed(0)}
                </div>
              </div>
              <div className="mt-1 flex items-center justify-between gap-2">
                <span
                  className="tabular-nums"
                  style={{ color: pctColor(s.avgPct1M), fontSize: "11px" }}
                >
                  {s.avgPct1M >= 0 ? "+" : ""}
                  {s.avgPct1M.toFixed(1)}% 1M
                </span>
                <span style={{ color: "var(--sol-base01)", fontSize: "10px" }}>{s.count}</span>
              </div>
              <div
                className="mt-1 truncate"
                style={{ color: "var(--sol-base01)", fontSize: "10px" }}
              >
                {s.leaders.map((a) => a.symbol).join(" · ")}
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}

function summarizeSectors(assets: ScreenerAsset[]): SectorSummary[] {
  const groups = new Map<string, ScreenerAsset[]>()
  for (const asset of assets) {
    const sector = asset.sector || "Other"
    groups.set(sector, [...(groups.get(sector) || []), asset])
  }

  return [...groups.entries()]
    .map(([sector, items]) => {
      const avgPct1M = average(items.map((a) => a.pct1M))
      const avgRank = average(items.map((a) => a.momentumRank || 50))
      const leaders = [...items]
        .sort((a, b) => (b.momentumRank || 0) - (a.momentumRank || 0))
        .slice(0, 3)
      return { sector, count: items.length, avgPct1M, avgRank, leaders }
    })
    .sort((a, b) => b.avgRank - a.avgRank)
}

function average(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

function sectorTone(rank: number) {
  if (rank >= 75) {
    return {
      bg: "rgba(133,153,0,0.13)",
      border: "rgba(133,153,0,0.30)",
      fg: "var(--sol-green)",
    }
  }
  if (rank >= 50) {
    return {
      bg: "rgba(38,139,210,0.10)",
      border: "rgba(38,139,210,0.24)",
      fg: "var(--sol-blue)",
    }
  }
  if (rank >= 25) {
    return {
      bg: "rgba(181,137,0,0.10)",
      border: "rgba(181,137,0,0.24)",
      fg: "var(--sol-yellow)",
    }
  }
  return {
    bg: "rgba(220,50,47,0.10)",
    border: "rgba(220,50,47,0.24)",
    fg: "var(--sol-red)",
  }
}

function pctColor(value: number): string {
  if (value > 0) return "var(--sol-green)"
  if (value < 0) return "var(--sol-red)"
  return "var(--sol-base01)"
}
