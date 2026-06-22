import { memo, useRef, useState, useEffect, useCallback } from "react"
import { createPortal } from "react-dom"
import { MessageCircle } from "lucide-react"
import { fetchTweets } from "../lib/api"
import type { NitterTweet, AssetCategory } from "../types"

// Finviz only covers ~31 crypto tickers. For everything else we fall back to
// TradingView's free widget iframe.
const FINVIZ_CRYPTO_SYMBOLS = new Set([
  "AAVE","ADA","APT","ATOM","AVAX","BCH","BNB","BTC","DOGE","DOT","ETH","HBAR","ICP","LINK","LTC","NEAR","OP","POL","SHIB","SOL","SUI","S","TAO","TON","TRUMP","TRX","UNI","WLFI","XLM","XRP","ZEC",
])

interface ChartHoverProps {
  symbol: string
  name: string
  category?: AssetCategory
  chartSymbol?: string
  children: React.ReactNode
}

interface Pos {
  top: number
  left: number
  placement: "below" | "above"
}

function tradingViewUrl(symbol: string, exchange: string): string {
  return `https://www.tradingview.com/widgetembed/?frameElementId=tradingview_chart&symbol=${encodeURIComponent(
    `${exchange}:${symbol}`
  )}&interval=W&range=12M&hidesidetoolbar=1&hidetoptoolbar=1&symboledit=0&saveimage=0&toolbarbg=f1f3f6&hideideas=1&theme=Light&style=1&timezone=Etc/UTC&locale=en&withdateranges=0&hidevolume=1&enabled_features=[]&disabled_features=["header_symbol_search","header_settings","header_indicators","header_compare","header_undo_redo","header_screenshot","header_fullscreen","left_toolbar","timezone_menu","display_market_status","edit_buttons_in_legend","context_menus","control_bar","border_legend"]`
}

function yahooFinanceUrl(symbol: string): string {
  const s = symbol.toUpperCase().trim()
  if (s.endsWith("-USD")) return `https://ca.finance.yahoo.com/quote/${s}/chart`
  if (["BTC", "ETH", "SOL", "DOGE", "XRP", "ADA", "DOT", "AVAX"].includes(s)) {
    return `https://ca.finance.yahoo.com/quote/${s}-USD/chart`
  }
  if (s === "GOLD") return "https://ca.finance.yahoo.com/quote/GC=F/"
  if (s === "SILVER") return "https://ca.finance.yahoo.com/quote/SI=F/"
  if (s === "OIL") return "https://ca.finance.yahoo.com/quote/CL=F/"
  if (s === "COPPER") return "https://ca.finance.yahoo.com/quote/HG=F/"
  return `https://ca.finance.yahoo.com/quote/${s}/`
}

function useChartSource(symbol: string, category?: AssetCategory, chartSymbol?: string) {
  const isCrypto = category === "crypto"
  const displayChartSymbol = (chartSymbol || symbol).toUpperCase()
  const finvizSymbol = isCrypto ? displayChartSymbol.replace("-USD", "") : displayChartSymbol
  const finvizUrl = `https://finviz.com/chart.ashx?t=${finvizSymbol}&ty=c&ta=1&p=d&s=l`
  const yahooUrl = yahooFinanceUrl(isCrypto ? chartSymbol || `${symbol}-USD` : displayChartSymbol)

  if (!isCrypto) {
    return { type: "finviz" as const, finvizUrl, yahooUrl }
  }

  if (FINVIZ_CRYPTO_SYMBOLS.has(finvizSymbol)) {
    return { type: "finviz" as const, finvizUrl, yahooUrl }
  }

  // Altcoins not on Finviz — TradingView widget via Binance pair.
  return {
    type: "tradingview" as const,
    finvizUrl,
    yahooUrl,
    tradingViewUrl: tradingViewUrl(`${finvizSymbol}USDT`, "BINANCE"),
  }
}

export const ChartHover = memo(function ChartHover({
  symbol,
  name,
  category = "stocks",
  chartSymbol,
  children,
}: ChartHoverProps) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<Pos>({ top: 0, left: 0, placement: "below" })
  const [tweets, setTweets] = useState<NitterTweet[]>([])
  const [tweetLoading, setTweetLoading] = useState(false)
  const triggerRef = useRef<HTMLSpanElement>(null)
  const timerRef = useRef<TimeoutId | null>(null)

  const chart = useChartSource(symbol, category, chartSymbol)

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
    clearTimeout(timerRef.current)
    setOpen(true)
    setTweetLoading(true)
    fetchTweets(symbol)
      .then((res) => setTweets(res.tweets))
      .catch(() => setTweets([]))
      .finally(() => setTweetLoading(false))
  }

  const hide = () => {
    timerRef.current = setTimeout(() => setOpen(false), 150)
  }

  const keep = () => {
    clearTimeout(timerRef.current)
  }

  useEffect(() => {
    if (!open) return
    computePos()
    const onResize = () => computePos()
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [open, computePos])

  useEffect(() => {
    if (!open) return
    computePos()
    const onResize = () => computePos()
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [open, computePos])

  useEffect(
    () => () => {
      clearTimeout(timerRef.current)
    },
    []
  )

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
        {chart.type === "tradingview" ? (
          <iframe
            src={chart.tradingViewUrl}
            title={`${symbol} chart`}
            className="chart-hover-img"
            style={{ border: "none", width: "100%", height: 220 }}
            loading="eager"
          />
        ) : (
          <img
            src={chart.finvizUrl}
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
        )}
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
              className="block px-3 py-2 border-t"
              style={{
                borderColor: "rgba(147,161,161,0.12)",
                fontSize: "11px",
                color: "var(--sol-base01)",
                lineHeight: 1.4,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between" style={{ fontSize: "10px", color: "var(--sol-base1)", marginBottom: 2 }}>
                <span>@{t.author}</span>
                <span>{new Date(t.date).toLocaleDateString()}</span>
              </div>
              <div className="line-clamp-2">{t.text}</div>
            </a>
          ))
        )}
      </div>

      <div
        className="chart-hover-footer"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "8px 12px",
          borderTop: "1px solid var(--sol-base2)",
          backgroundColor: "var(--sol-base2)",
        }}
      >
        <a
          href={chart.yahooUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] font-semibold"
          style={{ color: "var(--sol-blue)" }}
          onClick={(e) => e.stopPropagation()}
        >
          Yahoo Finance →
        </a>
        <a
          href={`https://finviz.com/quote.ashx?t=${symbol.toUpperCase()}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] font-semibold"
          style={{ color: "var(--sol-blue)" }}
          onClick={(e) => e.stopPropagation()}
        >
          Finviz →
        </a>
      </div>
    </div>
  )

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={() => {
          computePos()
          show()
        }}
        onMouseLeave={hide}
      >
        {children}
      </span>
      {open && createPortal(popover, document.body)}
    </>
  )
})

type TimeoutId = ReturnType<typeof setTimeout>
