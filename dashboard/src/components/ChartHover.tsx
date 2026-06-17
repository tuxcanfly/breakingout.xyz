import { memo, useRef, useState, useEffect, useCallback } from "react"
import { createPortal } from "react-dom"
import { ExternalLink, MessageCircle } from "lucide-react"
import { fetchTweets } from "../lib/api"
import type { NitterTweet } from "../types"

interface ChartHoverProps {
  symbol: string
  name: string
  children: React.ReactNode
}

interface Pos {
  top: number
  left: number
  placement: "below" | "above"
}

export const ChartHover = memo(function ChartHover({ symbol, name, children }: ChartHoverProps) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<Pos>({ top: 0, left: 0, placement: "below" })
  const [tweets, setTweets] = useState<NitterTweet[]>([])
  const [tweetLoading, setTweetLoading] = useState(false)
  const triggerRef = useRef<HTMLSpanElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const chartSymbol = symbol.endsWith("-USD") ? symbol : `${symbol}-USD`
  const finvizUrl = `https://finviz.com/chart.ashx?t=${chartSymbol.toUpperCase()}&ty=c&ta=1&p=d&s=l`
  const yahooUrl = yahooFinanceUrl(chartSymbol)

  const computePos = useCallback(() => {
    const el = triggerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const popW = 380
    const popH = 420
    const margin = 10

    const spaceBelow = window.innerHeight - rect.bottom
    const spaceAbove = rect.top
    const placement = spaceBelow < popH + margin && spaceAbove > spaceBelow ? "above" : "below"

    const top =
      placement === "below" ? rect.bottom + margin : rect.top - popH - margin

    let left = rect.left + rect.width / 2 - popW / 2
    left = Math.max(margin, Math.min(left, window.innerWidth - popW - margin))

    setPos({ top, left, placement })
  }, [])

  const show = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    computePos()
    setOpen(true)
    // Lazy load tweets
    if (tweets.length === 0 && !tweetLoading) {
      setTweetLoading(true)
      fetchTweets(symbol)
        .then((res) => setTweets(res.tweets))
        .catch(() => setTweets([]))
        .finally(() => setTweetLoading(false))
    }
  }

  const hide = () => {
    timerRef.current = setTimeout(() => setOpen(false), 150)
  }

  const keep = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
  }

  useEffect(() => {
    if (!open) return
    const onHide = () => setOpen(false)
    window.addEventListener("scroll", onHide, { passive: true })
    window.addEventListener("resize", onHide)
    return () => {
      window.removeEventListener("scroll", onHide)
      window.removeEventListener("resize", onHide)
    }
  }, [open])

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current)
  }, [])

  const popover = (
    <div
      className={`chart-hover-popover chart-hover-popover--${pos.placement}`}
      style={{
        position: "fixed",
        top: pos.top,
        left: pos.left,
        width: 380,
        zIndex: 9999,
      }}
      onMouseEnter={keep}
      onMouseLeave={hide}
    >
      <div className="chart-hover-arrow" data-placement={pos.placement} />

      <div className="chart-hover-header">
        <div>
          <div className="chart-hover-symbol">{symbol}</div>
          <div className="chart-hover-name">{name}</div>
        </div>
        <span className="chart-hover-tag">Live</span>
      </div>

      <div className="chart-hover-body">
        <img
          src={finvizUrl}
          alt={`${symbol} chart`}
          className="chart-hover-img"
          loading="eager"
          onError={(e) => {
            const img = e.target as HTMLImageElement
            img.style.display = "none"
            const fallback = img.parentElement?.querySelector(
              ".chart-hover-fallback"
            ) as HTMLElement | null
            if (fallback) fallback.style.display = "flex"
          }}
        />
        <div className="chart-hover-fallback" style={{ display: "none" }}>
          <span>Chart unavailable for {symbol}</span>
        </div>
      </div>

      {/* Tweet panel */}
      <div
        className="chart-hover-tweets"
        style={{
          borderTop: "1px solid var(--sol-base2)",
          backgroundColor: "var(--sol-base2)",
          maxHeight: 120,
          overflowY: "auto",
        }}
      >
        <div
          className="flex items-center gap-1.5 px-3 py-1.5"
          style={{ fontSize: "10px", fontWeight: 600, color: "var(--sol-base01)", textTransform: "uppercase", letterSpacing: "0.04em" }}
        >
          <MessageCircle size={10} />
          Recent tweets
        </div>
        {tweetLoading ? (
          <div className="px-3 py-2" style={{ fontSize: "11px", color: "var(--sol-base01)" }}>
            Loading...
          </div>
        ) : tweets.length === 0 ? (
          <div className="px-3 py-2" style={{ fontSize: "11px", color: "var(--sol-base01)" }}>
            No recent tweets found
          </div>
        ) : (
          tweets.slice(0, 3).map((t, i) => (
            <a
              key={i}
              href={t.link || `https://x.com/search?q=%24${symbol}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block px-3 py-1.5 transition-colors"
              style={{
                borderTop: i > 0 ? "1px solid rgba(147,161,161,0.12)" : "none",
                textDecoration: "none",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = "var(--sol-base3)"
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"
              }}
            >
              <div style={{ fontSize: "10px", fontWeight: 600, color: "var(--sol-base02)" }}>
                {t.author}
              </div>
              <div
                className="truncate"
                style={{ fontSize: "11px", color: "var(--sol-base01)", lineHeight: 1.4 }}
                title={t.text}
              >
                {t.text}
              </div>
            </a>
          ))
        )}
      </div>

      <div className="chart-hover-footer">
        <a href={yahooUrl} target="_blank" rel="noopener noreferrer" className="chart-hover-link">
          <ExternalLink size={10} />
          Yahoo
        </a>
        <a
          href={`https://finviz.com/quote.ashx?t=${symbol.toUpperCase()}`}
          target="_blank"
          rel="noopener noreferrer"
          className="chart-hover-link"
        >
          Finviz →
        </a>
      </div>
    </div>
  )

  return (
    <>
      <span ref={triggerRef} className="chart-hover-trigger" onMouseEnter={show} onMouseLeave={hide}>
        {children}
      </span>
      {open && createPortal(popover, document.body)}
    </>
  )
})

function yahooFinanceUrl(symbol: string): string {
  const s = symbol.toUpperCase().trim()
  if (["BTC", "ETH", "SOL", "DOGE", "XRP", "ADA", "DOT", "AVAX"].includes(s)) {
    return `https://ca.finance.yahoo.com/quote/${s}-USD/`
  }
  if (s === "GOLD") return "https://ca.finance.yahoo.com/quote/GC=F/"
  if (s === "SILVER") return "https://ca.finance.yahoo.com/quote/SI=F/"
  if (s === "OIL") return "https://ca.finance.yahoo.com/quote/CL=F/"
  if (s === "COPPER") return "https://ca.finance.yahoo.com/quote/HG=F/"
  return `https://ca.finance.yahoo.com/quote/${s}/`
}
