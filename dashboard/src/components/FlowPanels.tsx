import { useEffect, useState } from "react"
import type { CatalystReport, OptionsFlow } from "../types"
import { fetchFlowDetail } from "../lib/api"
import { Zap, CalendarClock, TrendingUp, TrendingDown, MinusCircle, ExternalLink, Info } from "lucide-react"

interface Props {
  symbol: string
  category: string
}

const money = (n: number) => (n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : `$${Math.round(n / 1e3)}K`)

const TILT = {
  bullish: { color: "var(--sol-green)", icon: TrendingUp, label: "call-heavy" },
  bearish: { color: "var(--sol-red)", icon: TrendingDown, label: "put-heavy" },
  balanced: { color: "var(--sol-base01)", icon: MinusCircle, label: "two-sided" },
} as const

const CONFIDENCE_COLOR = { high: "var(--sol-green)", medium: "var(--sol-yellow)", low: "var(--sol-base01)" } as const

const SOURCE_NOTE: Record<string, string> = {
  cboe: "Cboe delayed chain — volume, open interest, greeks and IV per contract",
  deribit: "Deribit public options book (crypto)",
}

export function FlowPanels({ symbol, category }: Props) {
  const [flow, setFlow] = useState<OptionsFlow | null>(null)
  const [catalyst, setCatalyst] = useState<CatalystReport | null>(null)
  const [reason, setReason] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    // No synchronous setLoading here: AssetDetail is keyed by symbol, so this
    // component remounts per asset and `loading` already starts true.
    fetchFlowDetail(symbol, category)
      .then((r) => {
        if (cancelled) return
        setFlow(r.flow)
        setCatalyst(r.catalyst)
        setReason(r.reason ?? null)
      })
      .catch(() => { if (!cancelled) setReason("Options lookup failed.") })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [symbol, category])

  if (loading) {
    return (
      <div className="space-y-2">
        <div className="shimmer h-6 rounded" />
        <div className="shimmer h-16 rounded" />
      </div>
    )
  }

  if (!flow) {
    return (
      <div
        className="rounded-lg border px-3 py-2"
        style={{ borderColor: "var(--sol-base2)", backgroundColor: "var(--sol-base2)", fontSize: "11px", color: "var(--sol-base01)" }}
      >
        {reason ?? "No listed options chain for this symbol."}
      </div>
    )
  }

  const tilt = TILT[flow.tilt]
  const TiltIcon = tilt.icon
  const total = flow.callPremium + flow.putPremium
  const callShare = total > 0 ? (flow.callPremium / total) * 100 : 50

  return (
    <div className="space-y-3">
      {/* Options flow */}
      <div className="rounded-lg border px-4 py-3" style={{ borderColor: "var(--sol-base2)", backgroundColor: "var(--sol-base2)" }}>
        <div className="flex items-center justify-between mb-2">
          <span
            className="inline-flex items-center gap-1.5"
            style={{ fontSize: "10px", fontWeight: 600, color: "var(--sol-orange)", textTransform: "uppercase", letterSpacing: "0.04em" }}
          >
            <Zap size={10} /> Options flow
          </span>
          <span style={{ fontSize: "9px", color: "var(--sol-base1)" }} title={SOURCE_NOTE[flow.source]}>
            {flow.source} · {flow.asOf}
          </span>
        </div>

        <div className="flex items-center gap-3 flex-wrap mb-2">
          <span className="inline-flex items-center gap-1 font-semibold" style={{ fontSize: "12px", color: tilt.color }}>
            <TiltIcon size={13} /> {tilt.label}
            {flow.tiltRatio !== null && <span className="tabular-nums" style={{ fontWeight: 500, opacity: 0.85 }}>({flow.tiltRatio}:1)</span>}
          </span>
          <span style={{ fontSize: "11px", color: "var(--sol-base01)" }}>
            <strong style={{ color: "var(--sol-base02)" }}>{money(flow.unusualPremium)}</strong> fresh premium
            {flow.chainPremium > 0 && (
              <span style={{ color: "var(--sol-base1)" }}> · of {money(flow.chainPremium)} chain total</span>
            )}
          </span>
        </div>

        {/* call/put premium split */}
        <div className="h-1.5 rounded-full overflow-hidden flex mb-2" style={{ backgroundColor: "var(--sol-red)", opacity: 0.9 }}>
          <div style={{ width: `${callShare}%`, backgroundColor: "var(--sol-green)" }} />
        </div>
        <div className="flex justify-between tabular-nums mb-2" style={{ fontSize: "10px" }}>
          <span style={{ color: "var(--sol-green)" }}>calls {money(flow.callPremium)}</span>
          <span style={{ color: "var(--sol-red)" }}>puts {money(flow.putPremium)}</span>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-1" style={{ fontSize: "11px", color: "var(--sol-base01)" }}>
          <div title="Expected move to the nearest near-dated expiry, from the at-the-money straddle">
            implied move <strong style={{ color: "var(--sol-base02)" }}>±{flow.impliedMovePct ?? "—"}%</strong>
            {flow.impliedMoveExpiry && <span style={{ color: "var(--sol-base1)" }}> by {flow.impliedMoveExpiry}</span>}
          </div>
          <div title="30-day implied volatility. Rank is the percentile of stored history (needs ~10 sessions to build).">
            IV <strong style={{ color: "var(--sol-base02)" }}>{flow.iv ?? "—"}%</strong>
            {flow.ivChange !== null && (
              <span style={{ color: flow.ivChange >= 0 ? "var(--sol-orange)" : "var(--sol-cyan)" }}>
                {" "}{flow.ivChange >= 0 ? "+" : ""}{flow.ivChange}
              </span>
            )}
            {flow.ivRank !== null && <span style={{ color: "var(--sol-base1)" }}> · rank {flow.ivRank}</span>}
          </div>
          <div title="25-delta put IV minus call IV. Positive = puts bid over calls (defensive skew).">
            skew <strong style={{ color: "var(--sol-base02)" }}>{flow.skew ?? "—"}</strong>
          </div>
          <div>
            flagged <strong style={{ color: "var(--sol-base02)" }}>{flow.flagged}</strong> contract{flow.flagged === 1 ? "" : "s"}
            <span style={{ color: "var(--sol-base1)" }}> · {flow.maxNotability}× median</span>
          </div>
        </div>

        {flow.prints.length > 0 && (
          <div className="mt-3 pt-2" style={{ borderTop: "1px solid var(--sol-base1)" }}>
            <div className="mb-1" style={{ fontSize: "9px", color: "var(--sol-base1)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Largest fresh (volume ÷ open interest, out-of-the-money)
            </div>
            <table className="w-full tabular-nums" style={{ fontSize: "10px" }}>
              <thead>
                <tr style={{ color: "var(--sol-base1)", textAlign: "left" }}>
                  <th className="font-medium">expiry</th>
                  <th className="font-medium">type</th>
                  <th className="font-medium text-right">strike</th>
                  <th className="font-medium text-right">premium</th>
                  <th className="font-medium text-right">vol</th>
                  <th className="font-medium text-right">OI</th>
                  <th className="font-medium text-right">×</th>
                  <th className="font-medium text-right">IV</th>
                </tr>
              </thead>
              <tbody>
                {flow.prints.map((p) => (
                  <tr key={p.contract} style={{ color: "var(--sol-base01)" }}>
                    <td>{p.expiry}</td>
                    <td style={{ color: p.type === "call" ? "var(--sol-green)" : "var(--sol-red)" }}>{p.type}</td>
                    <td className="text-right">{p.strike}</td>
                    <td className="text-right font-semibold" style={{ color: "var(--sol-base02)" }}>{money(p.premium)}</td>
                    <td className="text-right">{p.volume}</td>
                    <td className="text-right">{p.openInterest}</td>
                    <td className="text-right" title="volume ÷ open interest — how much of this position is new today">{p.ratio}×</td>
                    <td className="text-right">{p.iv}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-2 inline-flex items-start gap-1" style={{ fontSize: "9px", color: "var(--sol-base1)", lineHeight: 1.4 }}>
          <Info size={9} style={{ marginTop: 2, flexShrink: 0 }} />
          Delayed snapshots — this measures unusual positioning and premium, not sweeps or which side initiated.
          {" "}"×" is premium ÷ this name's median contract premium.
        </div>
      </div>

      {/* Probable catalyst */}
      {catalyst && (
        <div
          className="rounded-lg border px-4 py-3"
          style={{
            borderColor: catalyst.probable ? "rgba(203,75,22,0.3)" : "var(--sol-base2)",
            backgroundColor: catalyst.probable ? "rgba(203,75,22,0.05)" : "var(--sol-base2)",
          }}
        >
          <div
            className="inline-flex items-center gap-1.5 mb-2"
            style={{ fontSize: "10px", fontWeight: 600, color: "var(--sol-base01)", textTransform: "uppercase", letterSpacing: "0.04em" }}
          >
            <CalendarClock size={10} /> Probable catalyst
          </div>

          {catalyst.probable ? (
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span
                className="px-1.5 py-0.5 rounded font-bold uppercase"
                style={{
                  fontSize: "9px",
                  color: CONFIDENCE_COLOR[catalyst.probable.confidence],
                  border: `1px solid ${CONFIDENCE_COLOR[catalyst.probable.confidence]}`,
                }}
              >
                {catalyst.probable.confidence}
              </span>
              <span className="font-semibold" style={{ fontSize: "12px", color: "var(--sol-base02)" }}>
                {catalyst.probable.kind}
              </span>
              <span style={{ fontSize: "11px", color: "var(--sol-base01)" }}>{catalyst.probable.label}</span>
            </div>
          ) : (
            <div className="font-semibold mb-1" style={{ fontSize: "12px", color: "var(--sol-base01)" }}>
              No dated catalyst found
            </div>
          )}

          <p style={{ fontSize: "11px", color: "var(--sol-base02)", lineHeight: 1.55 }}>{catalyst.rationale}</p>

          {catalyst.events.length > 0 && (
            <ul className="mt-2 space-y-0.5">
              {catalyst.events.map((e, i) => (
                <li key={i} className="flex items-baseline gap-1.5" style={{ fontSize: "10px", color: "var(--sol-base01)" }}>
                  <span style={{ color: CONFIDENCE_COLOR[e.confidence], fontWeight: 600, width: 44, flexShrink: 0 }}>{e.confidence}</span>
                  <span className="tabular-nums" style={{ color: "var(--sol-base02)" }}>{e.kind}</span>
                  {e.url ? (
                    <a
                      href={e.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-0.5"
                      style={{ color: "var(--sol-blue)" }}
                    >
                      {e.label} <ExternalLink size={8} />
                    </a>
                  ) : (
                    <span>{e.label}</span>
                  )}
                  <span style={{ color: "var(--sol-base1)" }}>· {e.source}</span>
                </li>
              ))}
            </ul>
          )}

          {catalyst.chatter.accounts.length > 0 && (
            <div className="mt-2" style={{ fontSize: "10px", color: "var(--sol-base01)" }}>
              Discussed by{" "}
              {catalyst.chatter.accounts.map((a, i) => (
                <span key={a}>
                  {i > 0 && ", "}
                  <a href={`https://x.com/${a}`} target="_blank" rel="noopener noreferrer" style={{ color: "var(--sol-blue)" }}>
                    @{a}
                  </a>
                </span>
              ))}
            </div>
          )}

          {catalyst.chatter.headlines.length > 0 && (
            <div className="mt-2 pt-2" style={{ borderTop: "1px solid var(--sol-base1)" }}>
              <div style={{ fontSize: "9px", color: "var(--sol-base1)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 3 }}>
                Recent headlines
              </div>
              {catalyst.chatter.headlines.map((h, i) => (
                <div key={i} className="truncate" style={{ fontSize: "10px", color: "var(--sol-base01)" }} title={h.title}>
                  <span className="tabular-nums" style={{ color: "var(--sol-base1)" }}>{h.date}</span>{" "}
                  {h.url ? (
                    <a href={h.url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--sol-base01)" }}>
                      {h.title}
                    </a>
                  ) : (
                    h.title
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
