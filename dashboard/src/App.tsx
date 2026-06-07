import { useEffect, useState, useCallback } from "react"
import { fetchDashboard } from "./lib/api"
import type { DashboardData, AssetCategory, ScreenerAsset } from "./types"
import { AssetTable } from "./components/AssetTable"
import { Input } from "./components/ui/input"
import { Search, LineChart } from "lucide-react"

function tightnessScore(a: ScreenerAsset): number {
  const mas = [a.ma10, a.ma20, a.ma50, a.ma200]
  const aligned = mas.every((m) => m === "up") || mas.every((m) => m === "down")
  const alignPts = aligned ? 50 : 0
  const adrPts = Math.max(0, 50 - (a.adrPercent / 20) * 50)
  return alignPts + adrPts
}

type TabId = AssetCategory | "all"

const tabs: { id: TabId; label: string }[] = [
  { id: "all", label: "All" },
  { id: "stocks", label: "Stocks" },
  { id: "crypto", label: "Crypto" },
  { id: "etfs", label: "ETFs" },
  { id: "commodities", label: "Commodities" },
]

function App() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabId>("all")
  const [filter, setFilter] = useState("")

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const d = await fetchDashboard()
      setData(d)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load data")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
    const interval = setInterval(() => loadData(), 10 * 60 * 1000)
    return () => clearInterval(interval)
  }, [loadData])

  if (loading && !data) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "var(--sol-base3)" }}>
        <div className="text-center">
          <div className="w-8 h-8 border-2 rounded-full mx-auto mb-3"
            style={{ borderColor: "var(--sol-base2)", borderTopColor: "var(--sol-blue)", animation: "spin 0.8s linear infinite" }}
          />
          <p style={{ color: "var(--sol-base01)", fontSize: "12px" }}>Loading screener...</p>
        </div>
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "var(--sol-base3)" }}>
        <div className="text-center p-6 rounded-lg" style={{ backgroundColor: "var(--sol-base2)" }}>
          <p className="mb-3" style={{ color: "var(--sol-red)", fontSize: "13px" }}>{error}</p>
          <button onClick={() => loadData()} className="cursor-pointer px-3 py-1.5 rounded-md text-xs font-medium" style={{ background: "var(--sol-blue)", color: "#fff" }}>Retry</button>
        </div>
      </div>
    )
  }

  if (!data) return null

  const allAssets = [...data.stocks, ...data.crypto, ...data.etfs, ...data.commodities]
  const activeAssets = activeTab === "all" ? allAssets : data[activeTab]

  const filtered = activeAssets.filter((a) =>
    a.symbol.toLowerCase().includes(filter.toLowerCase()) ||
    a.name.toLowerCase().includes(filter.toLowerCase()) ||
    a.industry.toLowerCase().includes(filter.toLowerCase()) ||
    (a.tags?.some((t) => t.toLowerCase().includes(filter.toLowerCase())) ?? false)
  )

  const counts = {
    all: allAssets.length,
    stocks: data.stocks.length,
    crypto: data.crypto.length,
    etfs: data.etfs.length,
    commodities: data.commodities.length,
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--sol-base3)" }}>
      {/* Compact header bar */}
      <header
        className="sticky top-0 z-50 border-b"
        style={{ backgroundColor: "var(--sol-base3)", borderColor: "var(--sol-base2)" }}
      >
        <div className="mx-auto px-3 py-2 flex items-center gap-4" style={{ maxWidth: "1440px" }}>
          {/* Brand */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="p-1.5 rounded-md" style={{ backgroundColor: "var(--sol-blue)" }}>
              <LineChart className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="font-bold" style={{ color: "var(--sol-base02)", fontSize: "14px", lineHeight: 1.2 }}>
                breakingout.xyz
              </h1>
              <p style={{ color: "var(--sol-base01)", fontSize: "10px" }}>
                NAAIM {data.market.naaim.toFixed(1)} · {new Date(data.lastUpdated).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>

          {/* Category tabs */}
          <div className="flex gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="px-2 py-0.5 rounded font-medium transition-all cursor-pointer"
                style={{
                  backgroundColor: activeTab === tab.id ? "var(--sol-blue)" : "transparent",
                  color: activeTab === tab.id ? "white" : "var(--sol-base01)",
                  fontSize: "11px",
                }}
              >
                {tab.label}
                <span
                  className="ml-0.5 px-1 py-0 rounded-full"
                  style={{
                    fontSize: "9px",
                    backgroundColor: activeTab === tab.id ? "rgba(255,255,255,0.2)" : "var(--sol-base2)",
                    color: activeTab === tab.id ? "white" : "var(--sol-base00)",
                  }}
                >
                  {counts[tab.id]}
                </span>
              </button>
            ))}
          </div>

          {/* Filter */}
          <div className="relative ml-auto w-56">
            <Search className="absolute left-2 top-1.5 w-3.5 h-3.5" style={{ color: "var(--sol-base01)" }} />
            <Input
              placeholder="Filter symbol, name, tag..."
              value={filter}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFilter(e.target.value)}
              className="pl-7 h-7 text-xs"
            />
          </div>
        </div>
      </header>

      {/* Table only */}
      <main className="mx-auto px-3 py-3" style={{ maxWidth: "1440px" }}>
        <AssetTable assets={filtered} getTightness={tightnessScore} />
      </main>
    </div>
  )
}

export default App
