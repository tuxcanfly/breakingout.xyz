import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { X, TrendingUp, TrendingDown, Minus, MessageCircle, Sparkles } from "lucide-react"
import type { ScreenerAsset, NitterTweet } from "../types"
import { fetchTweets, fetchInsight } from "../lib/api"

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

  const finvizUrl = `https://finviz.com/chart.ashx?t=${asset.symbol.toUpperCase()}&ty=c&ta=1&p=d&s=l`
  const yahooUrl = `https://ca.finance.yahoo.com/quote/${asset.symbol.toUpperCase()}/`

  const maIcons = [asset.ma10, asset.ma20, asset.ma50, asset.ma200].map((ma, i) => ({
    label: ["10", "20", "50", "200"][i],
    up: ma === "up",
  }))

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

          {/* Chart */}
          <div
            className="rounded-lg border overflow-hidden"
            style={{ borderColor: "var(--sol-base2)" }}
          >
            <img
              src={finvizUrl}
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
                Yahoo Finance →
              </a>
              <a
                href={`https://finviz.com/quote.ashx?t=${asset.symbol.toUpperCase()}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-semibold"
                style={{ color: "var(--sol-blue)" }}
              >
                Finviz →
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
              <p style={{ color: "var(--sol-base02)", fontSize: "13px", lineHeight: 1.6 }}>
                {insight || "No insight available."}
              </p>
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
