import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { X, TrendingUp, TrendingDown, Minus, MessageCircle, Sparkles } from "lucide-react"
import type { ScreenerAsset, NitterTweet } from "../types"
import { fetchTweets, fetchInsight } from "../lib/api"
import { Markdown } from "./Markdown"

interface Props {
  asset: ScreenerAsset | null
  onClose: () => void
}

export function AssetDetail({ asset, onClose }: Props) {
  const [tweets, setTweets] = useState<NitterTweet[]>([])
  const [tweetLoading, setTweetLoading] = useState(true)
  const [insight, setInsight] = useState<string>("")
  const [insightLoading, setInsightLoading] = useState(true)

  useEffect(() => {
    if (!asset) return
    let cancelled = false
    Promise.all([
      fetchTweets(asset.symbol).catch(() => ({ count: 0, tweets: [] })),
      fetchInsight(asset).catch(() => ({ insight: "" })),
    ]).then(([tweetRes, insightRes]) => {
      if (cancelled) return
      setTweets(tweetRes.tweets)
      setInsight(insightRes.insight)
      setTweetLoading(false)
      setInsightLoading(false)
    })
    return () => { cancelled = true }
  }, [asset])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    if (asset) {
      window.addEventListener("keydown", onKey)
      document.body.style.overflow = "hidden"
    }
    return () => {
      window.removeEventListener("keydown", onKey)
      document.body.style.overflow = ""
    }
  }, [asset, onClose])

  if (!asset) return null

  const isCrypto = asset.category === "crypto"
  const chartSymbol = asset.chartSymbol || asset.symbol
  const finvizSymbol = isCrypto ? chartSymbol.replace("-USD", "") : chartSymbol
  const finvizUrl = `https://finviz.com/chart.ashx?t=${finvizSymbol.toUpperCase()}&ty=c&ta=1&p=d&s=l`
  const yahooUrl = isCrypto
    ? `https://ca.finance.yahoo.com/quote/${chartSymbol.toUpperCase()}/chart`
    : `https://ca.finance.yahoo.com/quote/${chartSymbol.toUpperCase()}/`
  const tradingViewUrl = isCrypto
    ? `https://www.tradingview.com/chart/?symbol=BINANCE:${asset.symbol.toUpperCase()}USDT`
    : `https://www.tradingview.com/chart/?symbol=${asset.symbol.toUpperCase()}`
  const FINVIZ_CRYPTO_SYMBOLS = new Set([
    "AAVE","ADA","APT","ATOM","AVAX","BCH","BNB","BTC","DOGE","DOT","ETH","HBAR","ICP","LINK","LTC","NEAR","OP","POL","SHIB","SOL","SUI","S","TAO","TON","TRUMP","TRX","UNI","WLFI","XLM","XRP","ZEC",
  ])
  const cryptoChartUrl = FINVIZ_CRYPTO_SYMBOLS.has(finvizSymbol.toUpperCase())
    ? `https://finviz.com/crypto_charts.ashx?t=${finvizSymbol.toUpperCase()}USD&ty=c&ta=1&p=d&s=l`
    : yahooUrl
  const maIcons = [
  ]

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center overflow-y-auto"
      style={{
        backgroundColor: "rgba(0,43,54,0.55)",
        backdropFilter: "blur(3px)",
        padding: "24px 16px",
      }}
      onClick={onClose}
    >
      <div
        className="relative w-full rounded-xl shadow-2xl overflow-hidden animate-fadeIn"
        style={{
          maxWidth: 640,
          backgroundColor: "var(--sol-base3)",
          border: "1px solid var(--sol-base2)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-start justify-between px-5 py-4 border-b"
          style={{ borderColor: "var(--sol-base2)", backgroundColor: "var(--sol-base2)" }}
        >
          <div>
            <div className="flex items-center gap-2">
              <span
                className="font-bold"
                style={{
                  color: "var(--sol-base02)",
                  fontSize: "18px",
                  fontFamily: "ui-monospace, SFMono-Regular, monospace",
                }}
              >
                {asset.symbol}
              </span>
              {asset.tokenSymbol && (
                <span
                  className="px-1.5 py-0.5 rounded font-medium"
                  style={{
                    backgroundColor: "rgba(108,113,196,0.12)",
                    color: "var(--sol-violet)",
                    fontSize: "10px",
                  }}
                >
                  {asset.tokenSymbol}
                </span>
              )}
              {asset.analystRating && (
                <span
                  className="px-1.5 py-0.5 rounded font-medium"
                  style={{
                    backgroundColor:
                      asset.analystRating.consensus === "strong buy"
                        ? "rgba(133,153,0,0.12)"
                        : asset.analystRating.consensus === "buy"
                        ? "rgba(42,161,152,0.12)"
                        : asset.analystRating.consensus === "hold"
                        ? "rgba(181,137,0,0.12)"
                        : asset.analystRating.consensus === "sell"
                        ? "rgba(203,75,22,0.12)"
                        : "rgba(220,50,47,0.12)",
                    color:
                      asset.analystRating.consensus === "strong buy"
                        ? "var(--sol-green)"
                        : asset.analystRating.consensus === "buy"
                        ? "var(--sol-cyan)"
                        : asset.analystRating.consensus === "hold"
                        ? "var(--sol-yellow)"
                        : asset.analystRating.consensus === "sell"
                        ? "var(--sol-orange)"
                        : "var(--sol-red)",
                    fontSize: "10px",
                  }}
                  title={`Analyst consensus: ${asset.analystRating.consensus} (${asset.analystRating.strongBuy} strong buy, ${asset.analystRating.buy} buy, ${asset.analystRating.hold} hold, ${asset.analystRating.sell} sell, ${asset.analystRating.strongSell} strong sell)`}
                >
                  {asset.analystRating.consensus.toUpperCase()}
                </span>
              )}
            </div>
            <div style={{ color: "var(--sol-base01)", fontSize: "12px", marginTop: "2px" }}>
              {asset.name} · {asset.sector}
              {asset.subsector ? ` · ${asset.subsector}` : ""}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md cursor-pointer"
            style={{ color: "var(--sol-base01)" }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          {/* Price & returns */}
          <div className="flex items-center gap-4 flex-wrap">
            <div>
              <div
                className="font-bold tabular-nums"
                style={{ color: "var(--sol-base02)", fontSize: "22px" }}
              >
                {asset.price?.toFixed(2) ?? "—"}
              </div>
              <ReturnBadge value={asset.change24h ?? 0} label="24h" />
            </div>
            <div className="flex gap-3">
              <ReturnBadge value={asset.pct1M} label="1M" />
              <ReturnBadge value={asset.pct3M} label="3M" />
              <ReturnBadge value={asset.pct6M} label="6M" />
              <ReturnBadge value={asset.pct1Y} label="1Y" />
            </div>
          </div>

          {/* MA pills */}
          <div className="flex gap-2">
            {maIcons.map((ma) => (
              <span
                key={ma.label}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium"
                style={{
                  backgroundColor: ma.up
                    ? "rgba(133,153,0,0.10)"
                    : "rgba(220,50,47,0.10)",
                  color: ma.up ? "var(--sol-green)" : "var(--sol-red)",
                }}
              >
                {ma.up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {ma.label}
              </span>
            ))}
          </div>

          {/* COIL setup breakdown */}
          {asset.coilScore !== undefined && <CoilBreakdown asset={asset} />}

          {/* Chart */}
          <div
            className="rounded-lg border overflow-hidden"
            style={{ borderColor: "var(--sol-base2)" }}
          >
            <img
              src={isCrypto ? cryptoChartUrl : finvizUrl}
              alt={`${asset.symbol} chart`}
              className="w-full"
              style={{ height: 320, objectFit: "fill", background: "#fff" }}
              onError={(e) => {
                const img = e.target as HTMLImageElement
                img.style.display = "none"
              }}
            />
            <div
              className="flex justify-between items-center px-3 py-2 border-t"
              style={{ borderColor: "var(--sol-base2)", backgroundColor: "var(--sol-base2)" }}
            >
              <a
                href={yahooUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-semibold"
                style={{ color: "var(--sol-blue)" }}
              >
                {isCrypto ? "Yahoo Chart →" : "Yahoo Finance →"}
              </a>
              <a
                href={tradingViewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-semibold"
                style={{ color: "var(--sol-blue)" }}
              >
                TradingView →
              </a>
            </div>
          </div>

          {/* AI Insight */}
          <div
            className="rounded-lg border px-4 py-3"
            style={{
              borderColor: "rgba(38,139,210,0.25)",
              backgroundColor: "rgba(38,139,210,0.06)",
            }}
          >
            <div
              className="flex items-center gap-1.5 mb-2"
              style={{ fontSize: "10px", fontWeight: 600, color: "var(--sol-blue)", textTransform: "uppercase", letterSpacing: "0.04em" }}
            >
              <Sparkles size={10} />
              AI Insight
            </div>
            {insightLoading ? (
              <div className="shimmer h-4 rounded" style={{ width: "80%" }} />
            ) : (
              <div style={{ color: "var(--sol-base02)", fontSize: "13px", lineHeight: 1.6 }}>
                <Markdown text={insight || "No insight available."} />
              </div>
            )}
          </div>

          {/* Tweets */}
          <div>
            <div
              className="flex items-center gap-1.5 mb-2"
              style={{
                fontSize: "10px",
                fontWeight: 600,
                color: "var(--sol-base01)",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              <MessageCircle size={10} />
              Recent tweets
            </div>
            {tweetLoading ? (
              <div className="space-y-2">
                <div className="shimmer h-8 rounded" />
                <div className="shimmer h-8 rounded" />
              </div>
            ) : tweets.length === 0 ? (
              <div
                className="rounded-lg border px-3 py-2 text-center"
                style={{
                  borderColor: "var(--sol-base2)",
                  backgroundColor: "var(--sol-base2)",
                  color: "var(--sol-base01)",
                  fontSize: "12px",
                }}
              >
                No recent tweets found
              </div>
            ) : (
              <div className="space-y-2">
                {tweets.map((t, i) => (
                  <a
                    key={i}
                    href={t.link || `https://x.com/search?q=%24${asset.symbol}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-lg border px-3 py-2 transition-colors"
                    style={{
                      borderColor: "var(--sol-base2)",
                      backgroundColor: "var(--sol-base2)",
                      textDecoration: "none",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.backgroundColor = "var(--sol-base3)"
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.backgroundColor = "var(--sol-base2)"
                    }}
                  >
                    <div
                      style={{
                        fontSize: "10px",
                        fontWeight: 600,
                        color: "var(--sol-base02)",
                      }}
                    >
                      {t.author}
                    </div>
                    <div
                      style={{
                        fontSize: "12px",
                        color: "var(--sol-base01)",
                        lineHeight: 1.5,
                        marginTop: "2px",
                      }}
                    >
                      {t.text}
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

function CoilBreakdown({ asset }: { asset: ScreenerAsset }) {
  const dist = asset.distToHighPct
  const tight = asset.coilTightness
  const rank = asset.momentumRank ?? 0
  const checks = [
    {
      label: "Trigger",
      pass: dist !== undefined && dist >= -1,
      detail: dist !== undefined ? `${dist >= 0 ? "+" : ""}${dist.toFixed(1)}% vs 3M high` : "no data",
      hint: "Breakouts above the 50-day high are the entry event in the study",
    },
    {
      label: "Coil",
      pass: tight !== undefined && tight < 4,
      detail: tight !== undefined ? `tightness ${tight.toFixed(1)} (tight < 4)` : "no data",
      hint: "Tight consolidations beat loose ranges: +0.83% vs +0.53% avg 20-day forward return",
    },
    {
      label: "Lead",
      pass: rank >= 89,
      detail: `top ${100 - rank}% momentum (need top 11%)`,
      hint: "Momentum leadership was the strongest factor: +1.39% vs +0.52% for the rest",
    },
  ]
  const full = checks.every((c) => c.pass)
  return (
    <div
      className="rounded-lg border px-4 py-3"
      style={{
        borderColor: full ? "rgba(133,153,0,0.35)" : "var(--sol-base2)",
        backgroundColor: full ? "rgba(133,153,0,0.06)" : "var(--sol-base2)",
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <span
          style={{ fontSize: "10px", fontWeight: 600, color: full ? "var(--sol-green)" : "var(--sol-base01)", textTransform: "uppercase", letterSpacing: "0.04em" }}
        >
          COIL setup {full ? "— all conditions met" : ""}
        </span>
        <span className="font-bold tabular-nums" style={{ fontSize: "13px", color: full ? "var(--sol-green)" : "var(--sol-base02)" }}>
          {asset.coilScore}/100
        </span>
      </div>
      <div className="space-y-1">
        {checks.map((c) => (
          <div key={c.label} className="flex items-baseline gap-2" title={c.hint}>
            <span
              className="font-bold"
              style={{ fontSize: "11px", width: 14, color: c.pass ? "var(--sol-green)" : "var(--sol-red)" }}
            >
              {c.pass ? "✓" : "✗"}
            </span>
            <span className="font-semibold" style={{ fontSize: "11px", color: "var(--sol-base02)", width: 52 }}>
              {c.label}
            </span>
            <span className="tabular-nums" style={{ fontSize: "11px", color: "var(--sol-base01)" }}>
              {c.detail}
            </span>
          </div>
        ))}
      </div>
      <div style={{ fontSize: "10px", color: "var(--sol-base1)", marginTop: "6px", lineHeight: 1.4 }}>
        Stacking all three tripled 20-day forward returns vs unfiltered breakouts
        (S&amp;P 900 backtest, 2012–2026, survivorship-biased universe).
      </div>
    </div>
  )
}

function ReturnBadge({ value, label }: { value: number; label: string }) {
  const color = value > 0 ? "var(--sol-green)" : value < 0 ? "var(--sol-red)" : "var(--sol-base01)"
  const Icon = value > 0 ? TrendingUp : value < 0 ? TrendingDown : Minus
  return (
    <div className="inline-flex items-center gap-1" style={{ fontSize: "11px", color }}>
      <Icon size={10} />
      <span className="font-medium tabular-nums">
        {value >= 0 ? "+" : ""}
        {value.toFixed(1)}%
      </span>
      <span style={{ color: "var(--sol-base01)", fontSize: "10px" }}>{label}</span>
    </div>
  )
}
