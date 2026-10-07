import { useMemo, useState } from "react"
import type { IntelStatus, IntelSymbol, IntelTweet, ScreenerAsset } from "../types"
import { MessageCircle, Filter, Flame, ExternalLink, AlertTriangle, X } from "lucide-react"

interface Props {
  tweets: IntelTweet[]
  hot: IntelSymbol[]
  status?: IntelStatus
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
  tenet_research: "#2aa198",
  chairmansledger: "#b58900",
}

const colorFor = (tag: string) => TRACKED_TAG_COLORS[tag.toLowerCase()] || "var(--sol-base01)"

const CASHTAG_RE = /(?<![A-Za-z0-9])\$([A-Z]{1,5}(?:\.[A-Z])?)(?![A-Za-z0-9])/g

function convictionColor(c: number) {
  return c >= 80 ? "var(--sol-green)" : c >= 65 ? "var(--sol-blue)" : "var(--sol-yellow)"
}

function relativeDate(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ""
  const mins = Math.floor((Date.now() - d.getTime()) / 60000)
  if (mins < 1) return "now"
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d`
  return d.toLocaleDateString()
}

// Render tweet text with $CASHTAG spans as inline clickable chips.
function renderText(
  text: string,
  assetsBySymbol: Map<string, ScreenerAsset>,
  onCashtag: (symbol: string, asset?: ScreenerAsset) => void,
) {
  const out: React.ReactNode[] = []
  let last = 0
  for (const m of text.matchAll(CASHTAG_RE)) {
    const idx = m.index ?? 0
    if (idx > last) out.push(text.slice(last, idx))
    const sym = m[1]
    const known = assetsBySymbol.get(sym)
    out.push(
      <button
        key={`${idx}-${sym}`}
        type="button"
        onClick={() => onCashtag(sym, known)}
        className="inline cursor-pointer font-semibold rounded px-0.5"
        style={{
          fontSize: "11px",
          color: known ? "var(--sol-blue)" : "var(--sol-base01)",
          backgroundColor: known ? "rgba(38,139,210,0.10)" : "transparent",
          border: `1px solid ${known ? "rgba(38,139,210,0.25)" : "var(--sol-base1)"}`,
        }}
        title={known ? `${sym} — open detail` : `${sym} — not in universe, filter table`}
      >
        ${sym}
      </button>
    )
    last = idx + m[0].length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

function SymbolChip({
  sym,
  asset,
  onClick,
  extra,
}: {
  sym: string
  asset?: ScreenerAsset
  onClick: () => void
  extra?: React.ReactNode
}) {
  const c = asset?.conviction ?? 0
  const change = asset?.change24h ?? 0
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 px-2 py-1 rounded-md cursor-pointer transition-colors hover:brightness-95"
      style={{ backgroundColor: "var(--sol-base3)", border: "1px solid var(--sol-base1)" }}
      title={asset ? `${asset.name} — click for detail` : `$${sym} — filter table`}
    >
      <span
        className="font-bold"
        style={{
          color: asset ? "var(--sol-base02)" : "var(--sol-base01)",
          fontFamily: "ui-monospace, SFMono-Regular, monospace",
          fontSize: "10px",
        }}
      >
        {asset ? asset.symbol : `$${sym}`}
      </span>
      {asset && (
        <>
          <span className="tabular-nums" style={{ color: "var(--sol-base01)", fontSize: "10px" }}>
            {asset.price?.toFixed(2) ?? "—"}
          </span>
          <span
            className="tabular-nums font-medium"
            style={{ color: change >= 0 ? "var(--sol-green)" : "var(--sol-red)", fontSize: "10px" }}
          >
            {change >= 0 ? "+" : ""}
            {change.toFixed(1)}%
          </span>
          {c > 0 && (
            <span
              className="px-1 rounded tabular-nums font-bold"
              style={{ fontSize: "9px", color: convictionColor(c), backgroundColor: "var(--sol-base2)", border: `1px solid ${convictionColor(c)}` }}
              title={`Conviction ${c}/100`}
            >
              {c}
            </span>
          )}
        </>
      )}
      {extra}
    </button>
  )
}

export function IntelFeed({ tweets, hot, status, assetsBySymbol, onSymbolClick, onAssetOpen }: Props) {
  const [accountFilter, setAccountFilter] = useState<string | null>(null)
  const [symbolFilter, setSymbolFilter] = useState<string | null>(null)
  const [tickersOnly, setTickersOnly] = useState(false)

  const accounts = useMemo(() => {
    const map = new Map<string, { handle: string; tag: string; name: string; count: number }>()
    for (const t of tweets) {
      const e = map.get(t.authorHandle)
      if (e) e.count++
      else map.set(t.authorHandle, { handle: t.authorHandle, tag: t.authorTag ?? t.authorHandle.toLowerCase(), name: t.author, count: 1 })
    }
    return [...map.values()].sort((a, b) => b.count - a.count)
  }, [tweets])

  const filtered = tweets.filter(
    (t) =>
      (!accountFilter || t.authorHandle === accountFilter) &&
      (!symbolFilter || t.symbols.includes(symbolFilter)) &&
      (!tickersOnly || t.symbols.length > 0)
  )

  const open = (sym: string, asset?: ScreenerAsset) => (asset ? onAssetOpen(asset) : onSymbolClick(sym))

  const degraded = status && status.accountsTotal > 0 && status.accountsOk < status.accountsTotal

  if (tweets.length === 0) {
    return (
      <div
        className="rounded-lg border p-8 text-center"
        style={{ backgroundColor: "var(--sol-base2)", borderColor: "var(--sol-base1)" }}
      >
        <MessageCircle size={28} className="mx-auto mb-2" style={{ color: "var(--sol-base1)" }} />
        <p style={{ color: "var(--sol-base01)", fontSize: "13px" }}>
          Intel feed unavailable — Nitter instances are unreachable right now.
        </p>
        <p style={{ color: "var(--sol-base1)", fontSize: "11px", marginTop: 4 }}>
          {status?.accountsTotal ? `0/${status.accountsTotal} tracked accounts reachable. ` : ""}
          The server retries every refresh cycle.
        </p>
      </div>
    )
  }

  return (
    <div className="pt-3">
      {degraded && (
        <div
          className="flex items-center gap-1.5 mb-3 px-2 py-1 rounded-md"
          style={{ fontSize: "10px", color: "var(--sol-yellow)", backgroundColor: "rgba(181,137,0,0.08)", border: "1px solid rgba(181,137,0,0.25)" }}
          title={[
            status!.accountsStale.length ? `Cached (last good): ${status!.accountsStale.join(", ")}` : "",
            status!.accountsFailed.length ? `Unavailable: ${status!.accountsFailed.join(", ")}` : "",
          ].filter(Boolean).join("\n")}
        >
          <AlertTriangle size={11} />
          {status!.accountsOk}/{status!.accountsTotal} accounts live
          {status!.accountsStale.length > 0 && ` · ${status!.accountsStale.length} cached`}
          {status!.accountsFailed.length > 0 && ` · ${status!.accountsFailed.length} unavailable`}
        </div>
      )}

      {/* Hot: cashtags ranked by distinct-account consensus */}
      {hot.length > 0 && (
        <div className="mb-3">
          <div
            className="flex items-center gap-1 mb-1.5"
            style={{ fontSize: "10px", fontWeight: 600, color: "var(--sol-base01)", textTransform: "uppercase", letterSpacing: "0.04em" }}
            title={`Cashtags ranked by distinct tracked accounts, then mention count, over the last ${status?.windowDays ?? 14} days`}
          >
            <Flame size={11} style={{ color: "var(--sol-orange)" }} /> Hot · {status?.windowDays ?? 14}d
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {hot.slice(0, 16).map((h) => {
              const active = symbolFilter === h.symbol
              return (
                <div
                  key={h.symbol}
                  className="flex items-center rounded-md"
                  style={{ outline: active ? "2px solid var(--sol-blue)" : "none", outlineOffset: 1 }}
                >
                  <SymbolChip
                    sym={h.symbol}
                    asset={assetsBySymbol.get(h.symbol)}
                    onClick={() => open(h.symbol, assetsBySymbol.get(h.symbol))}
                    extra={
                      <span className="flex items-center gap-0.5" title={h.accounts.map((a) => `@${a}`).join(", ")}>
                        {h.accounts.slice(0, 4).map((a) => (
                          <span key={a} style={{ width: 6, height: 6, borderRadius: 999, backgroundColor: colorFor(a), display: "inline-block" }} />
                        ))}
                        <span className="tabular-nums" style={{ fontSize: "9px", color: "var(--sol-base01)", marginLeft: 2 }}>
                          {h.mentions}×
                        </span>
                      </span>
                    }
                  />
                  <button
                    type="button"
                    onClick={() => setSymbolFilter(active ? null : h.symbol)}
                    className="px-1 cursor-pointer"
                    style={{ fontSize: "9px", color: active ? "var(--sol-blue)" : "var(--sol-base1)" }}
                    title={active ? "Show all posts" : `Show only posts mentioning $${h.symbol}`}
                    aria-label={`Filter posts by ${h.symbol}`}
                  >
                    <Filter size={10} />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Account / content filters */}
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
          const color = colorFor(acc.tag)
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
        <label className="ml-auto flex items-center gap-1 cursor-pointer select-none" style={{ fontSize: "11px", color: "var(--sol-base01)" }}>
          <input type="checkbox" checked={tickersOnly} onChange={(e) => setTickersOnly(e.target.checked)} />
          With tickers only
        </label>
      </div>

      {symbolFilter && (
        <div className="flex items-center gap-2 mb-2" style={{ fontSize: "11px", color: "var(--sol-base01)" }}>
          Posts mentioning <strong style={{ color: "var(--sol-base02)" }}>${symbolFilter}</strong>
          <button
            onClick={() => setSymbolFilter(null)}
            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded cursor-pointer"
            style={{ backgroundColor: "var(--sol-base2)", fontSize: "10px" }}
          >
            <X size={10} /> Clear
          </button>
        </div>
      )}

      {/* Post stream */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="text-center py-6" style={{ fontSize: "12px", color: "var(--sol-base01)" }}>
            No posts match these filters.
          </div>
        )}
        {filtered.map((t) => {
          const color = colorFor(t.authorTag ?? t.authorHandle)
          const unique = [...new Set(t.symbols)]
          return (
            <article
              key={t.link || `${t.authorHandle}:${t.date}:${t.text.slice(0, 20)}`}
              className="rounded-lg border px-3 py-2.5"
              style={{ borderColor: "var(--sol-base1)", backgroundColor: "var(--sol-base2)", borderLeft: `3px solid ${color}` }}
            >
              <div className="flex items-center justify-between mb-1">
                <a
                  href={t.authorUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5"
                  style={{ textDecoration: "none" }}
                >
                  <span className="font-bold" style={{ color, fontSize: "12px" }}>
                    {t.author}
                  </span>
                  <span style={{ color: "var(--sol-base1)", fontSize: "10px" }}>@{t.authorHandle}</span>
                </a>
                <a
                  href={t.link || t.authorUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 tabular-nums"
                  style={{ color: "var(--sol-base1)", fontSize: "10px", textDecoration: "none" }}
                  title={t.date ? new Date(t.date).toLocaleString() : "Open on X"}
                >
                  {relativeDate(t.date)}
                  <ExternalLink size={10} />
                </a>
              </div>
              <div style={{ fontSize: "12px", color: "var(--sol-base02)", lineHeight: 1.55, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                {renderText(t.text, assetsBySymbol, open)}
              </div>
              {unique.length > 0 && (
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  {unique.map((sym) => (
                    <SymbolChip key={sym} sym={sym} asset={assetsBySymbol.get(sym)} onClick={() => open(sym, assetsBySymbol.get(sym))} />
                  ))}
                </div>
              )}
            </article>
          )
        })}
      </div>
    </div>
  )
}
