import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts"
import type { ScreenerAsset } from "../types"

interface Props {
  assets: ScreenerAsset[]
}

const palette = [
  "#859900", "#268bd2", "#2aa198", "#6c71c4",
  "#cb4b16", "#d33682", "#b58900", "#dc322f",
]

export function Sparklines({ assets }: Props) {
  if (assets.length === 0) return null

  const chartData = assets.slice(0, 8).map((a, i) => ({
    name: a.symbol,
    pct: a.pct1M,
    fill: palette[i % palette.length],
  }))

  // Symmetric domain so negative bars don't clip
  const maxVal = Math.max(...chartData.map((d) => Math.abs(d.pct)), 1)
  const pad = maxVal * 1.15

  return (
    <div
      className="rounded-lg border p-3"
      style={{
        backgroundColor: "var(--sol-base2)",
        borderColor: "var(--sol-base1)",
      }}
    >
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 5, right: 5, bottom: 5, left: 0 }}
          >
            <XAxis
              dataKey="name"
              tick={{ fontSize: 10, fill: "var(--sol-base01)" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis domain={[-pad, pad]} hide />
            <ReferenceLine y={0} stroke="var(--sol-base1)" strokeWidth={1} />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--sol-base3)",
                border: "1px solid var(--sol-base1)",
                borderRadius: "6px",
                fontSize: "12px",
                color: "var(--sol-base00)",
              }}
              formatter={(value) => [
                `${Number(value) >= 0 ? "+" : ""}${Number(value).toFixed(1)}%`,
              ]}
            />
            <Bar dataKey="pct" radius={[2, 2, 0, 0]} maxBarSize={20}>
              {chartData.map((entry, i) => (
                <Cell
                  key={i}
                  fill={entry.fill}
                  fillOpacity={entry.pct >= 0 ? 1 : 0.7}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-wrap gap-2 mt-2">
        {chartData.map((d) => (
          <div key={d.name} className="flex items-center gap-1.5 text-xs">
            <div
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: d.fill }}
            />
            <span style={{ color: "var(--sol-base02)" }}>{d.name}</span>
            <span
              className="font-medium"
              style={{
                color: d.pct >= 0 ? "var(--sol-green)" : "var(--sol-red)",
              }}
            >
              {d.pct >= 0 ? "+" : ""}
              {d.pct.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
