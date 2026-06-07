import { useEffect, useState, useCallback, useRef } from "react"
import { fetchDashboard } from "./lib/api"
import type { DashboardData, AssetCategory, ScreenerAsset } from "./types"
import { AssetTable } from "./components/AssetTable"
import { Input } from "./components/ui/input"
import { Search, LineChart, HelpCircle, X } from "lucide-react"

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

const HELP_SECTIONS = [
  {
    title: "Tight",
    body: "Price within 2% of its 20-day SMA —\nindicates low-volatility consolidation\nand potential breakout setup.",
  },
  {
    title: "ADR",
    body: "Average Daily Range — the typical\nprice swing between high and\nlow over the last 14 days.",
  },
  {
    title: "MAs", body: "Moving Average direction for\n10, 20, 50, and 200-period SMAs.\nGreen = price above MA (uptrend).",
  },
  {
    title: "Tags",
    body: "Algorithmic signal tags:\n• naaim — favorable NAAIM regime\n• all-ma-up — all MAs aligned bullish\n• momentum-leader — top 5% 1M return\n• breakout — strong + MA aligned\n• stage2 — up across 1M 3M 6M\n• tight-base — consolidation\n• aleabitoreddit — high momentum + vol",
  },
  {
    title: "Returns",
    body: "24h, 1M, 3M, 6M, 1Y — trailing\npercentage return over each period.\nGreen = positive, Red = negative.",
  },
]

function App() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabId>("all")
  const [filter, setFilter] = useState("")
  const [helpOpen, setHelpOpen] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)
  const helpRef = useRef<HTMLDivElement>(null)

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

  const lastLoadRef = useRef(0)

  useEffect(() => {
    loadData().then(() => { lastLoadRef.current = Date.now() })
    const onFocus = () => {
      if (Date.now() - lastLoadRef.current > 30 * 60 * 1000) {
        loadData().then(() => { lastLoadRef.current = Date.now() })
      }
    }
    document.addEventListener("visibilitychange", onFocus)
    window.addEventListener("focus", onFocus)
    return () => {
      document.removeEventListener("visibilitychange", onFocus)
      window.removeEventListener("focus", onFocus)
    }
  }, [loadData])

  // Keyboard shortcuts: / = search, ? = help, Escape = close help
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement)?.tagName)) {
        e.preventDefault()
        searchRef.current?.focus()
      }
      if (e.key === "?") { setHelpOpen((v) => !v) }
      if (e.key === "Escape") { setHelpOpen(false) }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  // Trap focus in help
  useEffect(() => {
    if (!helpOpen) return
    const el = helpRef.current
    if (!el) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setHelpOpen(false)
    }
    el.addEventListener("keydown", onKey)
    return () => el.removeEventListener("keydown", onKey)
  }, [helpOpen])

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
      {/* Help overlay */}
      {helpOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center"
          style={{ backgroundColor: "rgba(0,43,54,0.4)", backdropFilter: "blur(2px)" }}
          onClick={() => setHelpOpen(false)}
        >
          <div
            ref={helpRef}
            className="rounded-xl shadow-2xl w-[380px] max-h-[80vh] overflow-y-auto animate-fadeIn"
            style={{ backgroundColor: "var(--sol-base3)", border: "1px solid var(--sol-base2)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: "var(--sol-base2)" }}>
              <h2 className="font-bold" style={{ color: "var(--sol-base02)", fontSize: "14px" }}>Legend</h2>
              <button onClick={() => setHelpOpen(false)} className="p-1 rounded hover:bg-solar-base02/50 cursor-pointer" style={{ color: "var(--sol-base01)" }}>
                <X size={16} />
              </button>
            </div>
            <div className="p-4 space-y-3">
              {HELP_SECTIONS.map((s) => (
                <div key={s.title}>
                  <div className="font-bold" style={{ color: "var(--sol-blue)", fontSize: "12px" }}>{s.title}</div>
                  <pre style={{ color: "var(--sol-base01)", fontSize: "11px", lineHeight: 1.5, fontFamily: "system-ui, -apple-system, sans-serif", margin: 0, whiteSpace: "pre-wrap" }}>{s.body}</pre>
                </div>
              ))}
              <div className="pt-2 border-t" style={{ borderColor: "var(--sol-base2)" }}>
                <div className="font-bold" style={{ color: "var(--sol-base02)", fontSize: "12px" }}>Shortcuts</div>
                <div className="flex justify-between text-xs mt-1" style={{ color: "var(--sol-base01)" }}>
                  <span><kbd className="px-1 py-0.5 rounded" style={{ background: "var(--sol-base2)", fontFamily: "monospace" }}>/</kbd> Search</span>
                  <span><kbd className="px-1 py-0.5 rounded" style={{ background: "var(--sol-base2)", fontFamily: "monospace" }}>?</kbd> This panel</span>
                  <span><kbd className="px-1 py-0.5 rounded" style={{ background: "var(--sol-base2)", fontFamily: "monospace" }}>Esc</kbd> Close</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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

          {/* Help button */}
          <button
            onClick={() => setHelpOpen(true)}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded font-medium cursor-pointer"
            style={{ color: "var(--sol-base01)", fontSize: "11px" }}
            title="Help (?)"
          >
            <HelpCircle size={14} />
          </button>

          {/* Filter */}
          <div className="relative ml-auto w-56">
            <Search className="absolute left-2 top-1.5 w-3.5 h-3.5" style={{ color: "var(--sol-base01)" }} />
            <Input
              ref={searchRef}
              placeholder="Filter symbol, name, tag... (/)"
              value={filter}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFilter(e.target.value)}
              className="pl-7 h-7 text-xs"
            />
          </div>
        </div>
      </header>

      {/* Table */}
      <main className="mx-auto px-3 py-3" style={{ maxWidth: "1440px" }}>
        <AssetTable assets={filtered} getTightness={tightnessScore} />
      </main>
    </div>
  )
}

export default App
