import { useEffect, useState, useCallback, useRef } from "react"
import { fetchDashboard } from "./lib/api"
import type { DashboardData, AssetCategory, ScreenerAsset } from "./types"
import { AssetTable } from "./components/AssetTable"
import { AssetDetail } from "./components/AssetDetail"
import { SectorHeatmap } from "./components/SectorHeatmap"
import { MarketBar } from "./components/MarketBar"
import { PresetFilters } from "./components/PresetFilters"
import { PRESETS } from "./lib/presets"
import { useNewSymbols } from "./lib/useNewSymbols"
import { Input } from "./components/ui/input"
import {
  Search,
  HelpCircle,
  X,
  RefreshCw,
  LayoutList,
  LayoutGrid,
} from "lucide-react"

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

const ExternalLink = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    style={{ color: "var(--sol-blue)", textDecoration: "underline" }}
  >
    {children}
  </a>
)

const HELP_SECTIONS = [
  {
    title: "COIL",
    body: "Breakout setup score (0–100) from a\n2012–2026 backtest of 293k breakouts.\nThree stacked conditions:\n• Trigger — at/near the 50-day high\n• Coil — tight base (MA compression < 4\n  in units of the stock's daily range)\n• Lead — top ~11% blended momentum\nAll three together ≈ tripled 20-day\nforward returns vs unfiltered breakouts.\nGreen dot = full setup (coil tag).",
  },
  {
    title: "Tight",
    body: "MA compression + distance from the\n20-day SMA, measured in ADR units.\nBelow 4 = coiled base. Tight bases beat\nloose ranges (+0.83% vs +0.53% fwd20)\nin the backtest.",
  },
  {
    title: "Regime",
    body: "Risk-On/Off = SPY above/below its\n140-day EMA. Use as an exposure dial,\nnot an entry filter — throttling new\npositions when Risk-Off roughly halved\nmax drawdown in the backtest.",
  },
  {
    title: "ADR",
    body: "Average Daily Range — the typical\nprice swing between high and\nlow over the last 14 days.",
  },
  {
    title: "MAs",
    body: "Moving Average direction for\n10, 20, 50, and 200-period SMAs.\nGreen = price above MA (uptrend).",
  },
  {
    title: "NAAIM",
    body: (
      <>
        National Association of Active Investment Managers exposure index.
        {"\n"}70–90 = favorable risk-on regime.
        {"\n"}Learn more: <ExternalLink href="https://www.naaim.org">naaim.org</ExternalLink>
      </>
    ),
  },
  {
    title: "Tags",
    body: (
      <>
        Algorithmic signal tags:
        {"\n"}• naaim — favorable NAAIM regime
        {"\n"}• all-ma-up — all MAs aligned bullish
        {"\n"}• coil — full COIL setup (trigger + tight + leader)
        {"\n"}• momentum-leader — top 5% 1M return
        {"\n"}• breakout — strong + MA aligned
        {"\n"}• stage2 — up across 1M 3M 6M
        {"\n"}• tight-base — consolidation
        {"\n"}• xstock — tokenized equity available
        {"\n"}• aleabitoreddit — mentioned by{" "}
        <ExternalLink href="https://x.com/aleabitoreddit">@aleabitoreddit</ExternalLink>
        {"\n"}• aschenbrenner — mentioned by{" "}
        <ExternalLink href="https://x.com/leopoldasch">@leopoldasch</ExternalLink>
        {"\n"}• realsimpleariel — mentioned by{" "}
        <ExternalLink href="https://x.com/realsimpleariel">@RealSimpleAriel</ExternalLink>
        {"\n"}• stamatoudism — mentioned by{" "}
        <ExternalLink href="https://x.com/stamatoudism">@stamatoudism</ExternalLink>
        {"\n"}• jfsrev — mentioned by{" "}
        <ExternalLink href="https://x.com/jfsrev">@jfsrev</ExternalLink>
        {"\n"}• asymtrading — mentioned by{" "}
        <ExternalLink href="https://x.com/asymtrading">@AsymTrading</ExternalLink>
        {"\n"}• tenet_research — mentioned by{" "}
        <ExternalLink href="https://x.com/tenet_research">@tenet_research</ExternalLink>
      </>
    ),
  },
  {
    title: "Ranks",
    body: "RS ranks every asset by blended\n1M/3M/6M/1Y momentum across the universe —\nthe strongest factor in the backtest.\nSetup blends RS, MA alignment, and tightness.\nRisk blends ADR, trend state, and weakness.",
  },
  {
    title: "Returns",
    body: "24h, 1M, 3M, 6M, 1Y — trailing\npercentage return over each period.\nGreen = positive, Red = negative.",
  },
]

function SkeletonTable() {
  return (
    <div className="rounded-lg border overflow-hidden" style={{ borderColor: "var(--sol-base1)" }}>
      <div className="h-8" style={{ backgroundColor: "var(--sol-base2)" }} />
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="h-10 shimmer"
          style={{
            borderBottom: "1px solid rgba(147,161,161,0.08)",
            animationDelay: `${i * 40}ms`,
          }}
        />
      ))}
    </div>
  )
}

function App() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabId>("all")
  const [filter, setFilter] = useState("")
  const [sectorFilter, setSectorFilter] = useState<string | null>(null)
  const [presetFilter, setPresetFilter] = useState<string | null>(null)
  const [helpOpen, setHelpOpen] = useState(false)
  const [dense, setDense] = useState(false)
  const [selectedAsset, setSelectedAsset] = useState<ScreenerAsset | null>(null)
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
    const refresh = () => {
      loadData().then(() => {
        lastLoadRef.current = Date.now()
      })
    }
    const initialLoad = window.setTimeout(refresh, 0)
    const onFocus = () => {
      if (Date.now() - lastLoadRef.current > 30 * 60 * 1000) {
        refresh()
      }
    }
    document.addEventListener("visibilitychange", onFocus)
    window.addEventListener("focus", onFocus)
    return () => {
      window.clearTimeout(initialLoad)
      document.removeEventListener("visibilitychange", onFocus)
      window.removeEventListener("focus", onFocus)
    }
  }, [loadData])

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        e.key === "/" &&
        !["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement)?.tagName)
      ) {
        e.preventDefault()
        searchRef.current?.focus()
      }
      if (e.key === "?") setHelpOpen((v) => !v)
      if (e.key === "Escape") setHelpOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

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

  const newSymbols = useNewSymbols(data)

  if (loading && !data) {
    return (
      <div
        className="min-h-screen"
        style={{ backgroundColor: "var(--sol-base3)" }}
      >
        <header
          className="sticky top-0 z-50 border-b"
          style={{ backgroundColor: "var(--sol-base3)", borderColor: "var(--sol-base2)" }}
        >
          <div className="mx-auto px-4" style={{ maxWidth: "1440px" }}>
            <div className="flex items-center gap-2.5 py-2.5">
              <div
                className="flex items-center justify-center w-8 h-8 rounded-lg font-bold text-white"
                style={{
                  backgroundColor: "var(--sol-blue)",
                  fontSize: "13px",
                  fontFamily: "ui-monospace, SFMono-Regular, monospace",
                }}
              >
                BO
              </div>
              <div>
                <div className="flex items-baseline gap-1">
                  <span className="font-bold" style={{ color: "var(--sol-base02)", fontSize: "15px" }}>
                    Breaking Out
                  </span>
                  <span style={{ color: "var(--sol-base1)", fontSize: "13px", fontWeight: 500 }}>
                    .xyz
                  </span>
                </div>
              </div>
            </div>
          </div>
        </header>
        <main className="mx-auto px-3 py-3" style={{ maxWidth: "1440px" }}>
          <SkeletonTable />
        </main>
      </div>
    )
  }

  if (error && !data) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "var(--sol-base3)" }}
      >
        <div
          className="text-center p-6 rounded-lg"
          style={{ backgroundColor: "var(--sol-base2)" }}
        >
          <p className="mb-3" style={{ color: "var(--sol-red)", fontSize: "13px" }}>
            {error}
          </p>
          <button
            onClick={() => loadData()}
            className="cursor-pointer px-3 py-1.5 rounded-md text-xs font-medium"
            style={{ background: "var(--sol-blue)", color: "#fff" }}
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!data) return null

  const stale = data._meta?.stale
  const allAssets = [
    ...data.stocks,
    ...data.crypto,
    ...data.etfs,
    ...data.commodities,
  ]
  const activeAssets = activeTab === "all" ? allAssets : data[activeTab]

  let filtered = activeAssets.filter((a) => {
    const q = filter.toLowerCase()
    return (
      a.symbol.toLowerCase().includes(q) ||
      a.name.toLowerCase().includes(q) ||
      a.industry.toLowerCase().includes(q) ||
      a.sector.toLowerCase().includes(q) ||
      (a.subsector?.toLowerCase().includes(q) ?? false) ||
      (a.underlyingSymbol?.toLowerCase().includes(q) ?? false) ||
      (a.tags?.some((t) => t.toLowerCase().includes(q)) ?? false)
    )
  })

  if (sectorFilter) {
    filtered = filtered.filter((a) => a.sector === sectorFilter)
  }

  const presetCounts = PRESETS.reduce(
    (acc, p) => {
      acc[p.id] = filtered.filter(p.test).length
      return acc
    },
    {} as Record<string, number>
  )

  if (presetFilter) {
    const preset = PRESETS.find((p) => p.id === presetFilter)
    if (preset) {
      filtered = filtered.filter(preset.test)
    }
  }

  const counts: Record<TabId, number> = {
    all: allAssets.length,
    stocks: data.stocks.length,
    xstocks: data.xstocks.length,
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
            <div
              className="flex items-center justify-between px-5 py-3 border-b"
              style={{ borderColor: "var(--sol-base2)" }}
            >
              <h2 className="font-bold" style={{ color: "var(--sol-base02)", fontSize: "14px" }}>
                Legend
              </h2>
              <button
                onClick={() => setHelpOpen(false)}
                className="p-1 rounded hover:bg-solar-base02/50 cursor-pointer"
                style={{ color: "var(--sol-base01)" }}
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-4 space-y-3">
              {HELP_SECTIONS.map((s) => (
                <div key={s.title}>
                  <div className="font-bold" style={{ color: "var(--sol-blue)", fontSize: "12px" }}>
                    {s.title}
                  </div>
                  <div
                    style={{
                      color: "var(--sol-base01)",
                      fontSize: "11px",
                      lineHeight: 1.5,
                      fontFamily: "system-ui, -apple-system, sans-serif",
                      margin: 0,
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {s.body}
                  </div>
                </div>
              ))}
              <div className="pt-2 border-t" style={{ borderColor: "var(--sol-base2)" }}>
                <div className="font-bold" style={{ color: "var(--sol-base02)", fontSize: "12px" }}>
                  Shortcuts
                </div>
                <div className="flex justify-between text-xs mt-1" style={{ color: "var(--sol-base01)" }}>
                  <span>
                    <kbd
                      className="px-1 py-0.5 rounded"
                      style={{ background: "var(--sol-base2)", fontFamily: "monospace" }}
                    >
                      /
                    </kbd>{" "}
                    Search
                  </span>
                  <span>
                    <kbd
                      className="px-1 py-0.5 rounded"
                      style={{ background: "var(--sol-base2)", fontFamily: "monospace" }}
                    >
                      ?
                    </kbd>{" "}
                    This panel
                  </span>
                  <span>
                    <kbd
                      className="px-1 py-0.5 rounded"
                      style={{ background: "var(--sol-base2)", fontFamily: "monospace" }}
                    >
                      Esc
                    </kbd>{" "}
                    Close
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header
        className="sticky top-0 z-50 border-b"
        style={{ backgroundColor: "var(--sol-base3)", borderColor: "var(--sol-base2)" }}
      >
        <div className="mx-auto px-4" style={{ maxWidth: "1440px" }}>
          {/* Top row: brand + controls */}
          <div className="flex items-center justify-between py-2.5">
            {/* Brand */}
            <div className="flex items-center gap-2.5">
              <div
                className="flex items-center justify-center w-8 h-8 rounded-lg font-bold text-white"
                style={{
                  backgroundColor: "var(--sol-blue)",
                  fontSize: "13px",
                  fontFamily: "ui-monospace, SFMono-Regular, monospace",
                  letterSpacing: "-0.02em",
                }}
              >
                BO
              </div>
              <div>
                <div className="flex items-baseline gap-1">
                  <span
                    className="font-bold"
                    style={{
                      color: "var(--sol-base02)",
                      fontSize: "15px",
                      letterSpacing: "-0.01em",
                    }}
                  >
                    Breaking Out
                  </span>
                  <span
                    style={{
                      color: "var(--sol-base1)",
                      fontSize: "13px",
                      fontWeight: 500,
                    }}
                  >
                    .xyz
                  </span>
                </div>
                <div
                  style={{
                    color: "var(--sol-base01)",
                    fontSize: "10px",
                    fontWeight: 500,
                    letterSpacing: "0.03em",
                    textTransform: "uppercase",
                  }}
                >
                  Momentum Breakout Screener
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2">
              {/* Search */}
              <div className="relative">
                <Search
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5"
                  style={{ color: "var(--sol-base01)" }}
                />
                <Input
                  ref={searchRef}
                  placeholder="Filter symbol, name, tag... (/)"
                  value={filter}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setFilter(e.target.value)
                    setSectorFilter(null)
                  }}
                  className="pl-8 h-8 text-xs w-64"
                />
              </div>

              {/* Utility buttons */}
              <div
                className="flex items-center gap-0.5 rounded-lg border p-0.5"
                style={{ borderColor: "var(--sol-base2)", backgroundColor: "var(--sol-base2)" }}
              >
                <button
                  onClick={() => loadData()}
                  disabled={loading}
                  className="flex items-center justify-center w-7 h-7 rounded-md cursor-pointer disabled:opacity-50 transition-colors"
                  style={{ color: "var(--sol-base01)" }}
                  title="Refresh data"
                >
                  <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                </button>
                <button
                  onClick={() => setDense((v) => !v)}
                  className="flex items-center justify-center w-7 h-7 rounded-md cursor-pointer transition-colors"
                  style={{
                    color: dense ? "var(--sol-blue)" : "var(--sol-base01)",
                    backgroundColor: dense ? "var(--sol-base3)" : "transparent",
                  }}
                  title={dense ? "Compact view" : "Normal view"}
                >
                  {dense ? <LayoutGrid size={14} /> : <LayoutList size={14} />}
                </button>
                <button
                  onClick={() => setHelpOpen(true)}
                  className="flex items-center justify-center w-7 h-7 rounded-md cursor-pointer transition-colors"
                  style={{ color: "var(--sol-base01)" }}
                  title="Help (?)"
                >
                  <HelpCircle size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* Bottom row: tabs */}
          <div className="flex items-center gap-1 pb-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id)
                  setSectorFilter(null)
                  setPresetFilter(null)
                }}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer"
                style={{
                  backgroundColor: activeTab === tab.id ? "var(--sol-blue)" : "transparent",
                  color: activeTab === tab.id ? "white" : "var(--sol-base01)",
                  fontSize: "12px",
                  boxShadow: activeTab === tab.id ? "0 1px 3px rgba(38,139,210,0.3)" : "none",
                }}
              >
                {tab.label}
                <span
                  className="inline-flex items-center justify-center px-1.5 py-0 rounded-full tabular-nums"
                  style={{
                    fontSize: "10px",
                    minWidth: 18,
                    height: 16,
                    backgroundColor: activeTab === tab.id ? "rgba(255,255,255,0.2)" : "var(--sol-base2)",
                    color: activeTab === tab.id ? "white" : "var(--sol-base00)",
                  }}
                >
                  {counts[tab.id]}
                </span>
              </button>
            ))}
            {stale && (
              <span
                className="ml-auto flex items-center gap-1 px-2 py-0.5 rounded-md font-medium"
                style={{
                  fontSize: "10px",
                  color: "var(--sol-red)",
                  backgroundColor: "rgba(220,50,47,0.08)",
                  border: "1px solid rgba(220,50,47,0.15)",
                }}
              >
                Cached data
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto px-3 py-3" style={{ maxWidth: "1440px" }}>
        <MarketBar market={data.market} activeCategory={activeTab} />

        <div className="mt-3">
          <SectorHeatmap
            assets={filtered}
            onSelectSector={(s) => setSectorFilter((prev) => (prev === s ? null : s))}
            activeSector={sectorFilter}
          />
        </div>

        {sectorFilter && (
          <div
            className="mb-2 flex items-center gap-2"
            style={{ fontSize: "11px", color: "var(--sol-base01)" }}
          >
            <span>
              Filtering by <strong style={{ color: "var(--sol-base02)" }}>{sectorFilter}</strong>
            </span>
            <button
              onClick={() => setSectorFilter(null)}
              className="px-1.5 py-0.5 rounded cursor-pointer"
              style={{ backgroundColor: "var(--sol-base2)", fontSize: "10px" }}
            >
              Clear
            </button>
          </div>
        )}

        <div className="mb-3">
          <PresetFilters active={presetFilter} onChange={setPresetFilter} counts={presetCounts} />
        </div>

        {loading && <SkeletonTable />}

        {!loading && (
          <AssetTable
            assets={filtered}
            getTightness={tightnessScore}
            dense={dense}
            highlight={filter}
            newSymbols={newSymbols}
            onRowClick={(asset) => setSelectedAsset(asset)}
          />
        )}
      </main>

      <AssetDetail key={selectedAsset?.symbol} asset={selectedAsset} onClose={() => setSelectedAsset(null)} />
    </div>
  )
}

export default App
