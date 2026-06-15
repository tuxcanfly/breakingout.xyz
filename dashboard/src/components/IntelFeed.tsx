import { useMemo, useState } from "react"
import type { IntelTweet, ScreenerAsset } from "../types"
import { MessageCircle, ExternalLink, Filter } from "lucide-react"

interface Props {
  tweets: IntelTweet[]
  assetsBySymbol: Map<string, ScreenerAsset>
  onSymbolClick: (symbol: string) => void
  onAssetOpen: (asset: ScreenerAsset) => void
}

const TRACKED_TAG_COLORS: Record<string, string> = {
  aleabitoreddit: "#d33682",
  realsimpleariel: "#268bd2",
  stamatoudism: "#6c71c4",
  jfsrev: "#cb4b16",
  asymtrading: "#859900",
  tenet_research: "#268bd2",
}

// Render tweet text with $CASHTAG spans turned into clickable chips. Clicking
// either opens the asset detail (if the symbol is in the universe) or jumps to
// the table with that symbol as the active filter.
function renderText(
  text: string,
  assetsBySymbol: Map<string, ScreenerAsset>,
  onSymbolClick: (symbol: string) => void,
  onAssetOpen: (asset: ScreenerAsset) => void,
) {
  const parts: Array<{ kind: "text" | "cashtag"; value: string }> = []
  const re = /\$([A-Z]{1,5}(?:\.[A-Z])?)/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push({ kind: "text", value: text.slice(last, m.index) })
    parts.push({ kind: "cashtag", value: m[1] })
    last = m.index + m[0].length
  }
  if (last < text.length) parts.push({ kind: "text", value: text.slice(last) })

  return parts.map((p, i) => {
    if (p.kind === "text") return <span key={i}>{p.value}</span>
    const known = assetsBySymbol.get(p.value)
    return (
      <span
        key={i}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          if (known) onAssetOpen(known)
          else onSymbolClick(p.value)
        }}
        className="inline-flex items-center cursor-pointer font-semibold rounded px-0.5"
        style={{
          fontSize: "11px",
          color: "var(--sol-blue)",
          backgroundColor: "rgba(38,139,210,0.10)",
          border: "1px solid rgba(38,139,210,0.25)",
        }}
        title={known ? `${p.value} — in universe, click for detail` : `${p.value} — filter table`}
      >
        ${p.value}
      </span>
    )
  })
}

function relativeDate(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ""
  const diffMs = Date.now() - d.getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return "now"
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d`
  return d.toLocaleDateString()
}

export function IntelFeed({ tweets, assetsBySymbol, onSymbolClick, onAssetOpen }: Props) {
  const [accountFilter, setAccountFilter] = useState<string | null>(null)

  const accounts = useMemo(() => {
    const map = new Map<string, { handle: string; name: string; url: string; count: number }>()
    for (const t of tweets) {
      const existing = map.get(t.authorHandle)
      if (existing) existing.count++
      else map.set(t.authorHandle, { handle: t.authorHandle, name: t.author, url: t.authorUrl, count: 1 })
    }
    return [...map.values()].sort((a, b) => b.count - a.count)
  }, [tweets])

  const filtered = accountFilter
    ? tweets.filter((t) => t.authorHandle === accountFilter)
    : tweets

  if (tweets.length === 0) {
    return (
      <div
        className="rounded-lg border p-8 text-center"
        style={{ backgroundColor: "var(--sol-base2)", borderColor: "var(--sol-base1)" }}
      >
        <MessageCircle size={28} className="mx-auto mb-2" style={{ color: "var(--sol-base1)" }} />
        <p style={{ color: "var(--sol-base01)", fontSize: "13px" }}>
          Intel feed unavailable — Nitter instances may be unreachable.
        </p>
        <p style={{ color: "var(--sol-base1)", fontSize: "11px", marginTop: 4 }}>
          Mention tags on assets are still computed when possible.
        </p>
      </div>
    )
  }

  return (
    <div>
      {/* Account filter chips */}
      <div className="flex items-center gap-1.5 mb-3 flex-wrap">
        <span
          className="inline-flex items-center gap-1"
          style={{ fontSize: "10px", fontWeight: 600, color: "var(--sol-base01)", textTransform: "uppercase", letterSpacing: "0.04em" }}
        >
          <Filter size={11} /> Tracked
        </span>
        <button
          onClick={() => setAccountFilter(null)}
          className="px-2 py-0.5 rounded-full font-medium cursor-pointer transition-colors"
          style={{
            fontSize: "11px",
            backgroundColor: accountFilter === null ? "var(--sol-blue)" : "var(--sol-base2)",
            color: accountFilter === null ? "white" : "var(--sol-base01)",
            border: "1px solid var(--sol-base1)",
          }}
        >
          All ({tweets.length})
        </button>
        {accounts.map((acc) => {
          const active = accountFilter === acc.handle
          const color = TRACKED_TAG_COLORS[acc.handle] || "var(--sol-base01)"
          return (
            <button
              key={acc.handle}
              onClick={() => setAccountFilter(active ? null : acc.handle)}
              className="px-2 py-0.5 rounded-full font-medium cursor-pointer transition-colors"
              style={{
                fontSize: "11px",
                backgroundColor: active ? color : "var(--sol-base2)",
                color: active ? "white" : color,
                border: `1px solid ${active ? color : "var(--sol-base1)"}`,
              }}
            >
              @{acc.handle} ({acc.count})
            </button>
          )
        })}
      </div>

      {/* Tweet stream */}
      <div className="space-y-2">
        {filtered.map((t, i) => {
          const color = TRACKED_TAG_COLORS[t.authorHandle] || "var(--sol-base01)"
          return (
            <a
              key={i}
              href={t.link || t.authorUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-lg border px-3 py-2.5 transition-colors"
              style={{
                borderColor: "var(--sol-base1)",
                backgroundColor: "var(--sol-base2)",
                textDecoration: "none",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = color }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--sol-base1)" }}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <span
                    className="font-bold"
                    style={{ color, fontSize: "12px" }}
                  >
                    {t.author}
                  </span>
                  <span style={{ color: "var(--sol-base1)", fontSize: "10px" }}>
                    @{t.authorHandle}
                  </span>
                </div>
                <span style={{ color: "var(--sol-base1)", fontSize: "10px" }} className="tabular-nums">
                  {relativeDate(t.date)}
                </span>
              </div>
              <div
                style={{
                  fontSize: "12px",
                  color: "var(--sol-base02)",
                  lineHeight: 1.55,
                }}
              >
                {renderText(t.text, assetsBySymbol, onSymbolClick, onAssetOpen)}
              </div>
              {t.symbols.length > 0 && (
                <div className="flex items-center gap-1.5 mt-1.5">
                  <ExternalLink size={9} style={{ color: "var(--sol-base1)" }} />
                  <span style={{ fontSize: "10px", color: "var(--sol-base1)" }}>
                    {t.symbols.length} ticker{t.symbols.length === 1 ? "" : "s"}
                  </span>
                </div>
              )}
            </a>
          )
        })}
      </div>
    </div>
  )
}
