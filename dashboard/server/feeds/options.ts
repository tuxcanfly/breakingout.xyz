// Unusual-options detection from free sources.
//   equities/ETFs → Cboe delayed quote chain (IV, greeks, volume, open interest)
//   crypto        → Deribit public book summary (volume_usd, open interest, mark_iv)
// Both are delayed snapshots, so this measures *unusual positioning and premium*,
// not sweeps or aggressor side — there is no trade-level data available free.
import type { OptionPrint, OptionsFlow } from "../types.js"
import { cached, fetchJson } from "./http.js"
import { recordIv } from "./iv-history.js"

const FLOW_TTL = 10 * 60 * 1000

// ── Thresholds ─────────────────────────────────────────────────────────────

// minDte 2 excludes 0–1 DTE, which is intraday churn/dealer hedging rather
// than a positioned bet, and is what otherwise dominates every scan.
// A fixed dollar bar doesn't transfer across names: $1M is routine in NVDA and
// enormous in a mid-cap. So a print must clear an absolute floor AND be a large
// multiple of that name's own median contract premium (see chainMedian below).
const EQUITY = { minDte: 2, maxDte: 60, minAbsDelta: 0.05, maxAbsDelta: 0.45, minVolume: 500, minRatio: 1.0, minPremium: 100_000, minNotability: 12 }
const CRYPTO = { minDte: 2, maxDte: 60, minOtmPct: 0.02, maxOtmPct: 0.5, minVolumeUsd: 20_000, minRatio: 0.03, minNotability: 8 }

// "Unusual" = this much premium in fresh out-of-the-money positioning.
export const UNUSUAL_PREMIUM = { equity: 400_000, crypto: 200_000 }

const MONTHS: Record<string, number> = { JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5, JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11 }

const daysTo = (expiryIso: string) => Math.round((Date.parse(expiryIso) - Date.now()) / 86_400_000)

// Median premium of the contracts that actually traded, used as the per-name
// yardstick for "large print".
function chainMedian(rows: ChainRow[]): number {
  const traded = rows.filter((r) => r.volume > 0).map((r) => r.premium).sort((a, b) => a - b)
  if (!traded.length) return 0
  return traded[Math.floor(traded.length / 2)] || 0
}
const round = (n: number, d = 2) => +n.toFixed(d)

interface ChainRow {
  type: "call" | "put"
  strike: number
  expiry: string
  dte: number
  volume: number
  openInterest: number
  iv: number
  delta: number | null
  /** Quoted mid normalised to a fraction of spot, so equity (USD per share)
   *  and Deribit (already quoted in the underlying coin) are comparable. */
  midFrac: number
  premium: number
  ratio: number
  otmPct: number
  contract: string
  /** Set during filtering: premium ÷ this chain's median traded premium. */
  notability?: number
}

// ── Equity / ETF: Cboe delayed chain ───────────────────────────────────────

function parseOcc(occ: string): { expiry: string; type: "call" | "put"; strike: number } | null {
  const m = occ.match(/^([A-Z0-9.\-/]+?)(\d{6})([CP])(\d{8})$/)
  if (!m) return null
  const [, , d, t, s] = m
  const year = 2000 + Number(d.slice(0, 2))
  const month = Number(d.slice(2, 4))
  const day = Number(d.slice(4, 6))
  if (!month || !day) return null
  // Expiry treated as end of session UTC; only used for coarse DTE buckets.
  return { expiry: new Date(Date.UTC(year, month - 1, day, 20)).toISOString().slice(0, 10), type: t === "C" ? "call" : "put", strike: Number(s) / 1000 }
}

interface CboeResp {
  data?: {
    current_price?: number
    iv30?: number
    iv30_change?: number
    last_trade_time?: string
    options?: Array<{
      option: string; bid: number; ask: number; volume: number; open_interest: number
      iv: number; delta: number; last_trade_price: number
    }>
  }
}

function toRows(contracts: CboeResp["data"] extends undefined ? never : NonNullable<CboeResp["data"]>["options"], spot: number): ChainRow[] {
  const rows: ChainRow[] = []
  for (const c of contracts ?? []) {
    const p = parseOcc(c.option)
    if (!p) continue
    const dte = daysTo(p.expiry)
    const mid = (c.bid + c.ask) / 2 || c.last_trade_price || 0
    const premium = mid * 100 * Math.max(0, c.volume || 0)
    const oi = Math.max(0, c.open_interest || 0)
    rows.push({
      type: p.type,
      strike: p.strike,
      expiry: p.expiry,
      dte,
      volume: c.volume || 0,
      openInterest: oi,
      iv: c.iv || 0,
      delta: Number.isFinite(c.delta) ? c.delta : null,
      midFrac: spot > 0 ? mid / spot : 0,
      premium,
      ratio: oi > 0 ? (c.volume || 0) / oi : 0,
      otmPct: p.strike > 0 && spot > 0 ? Math.abs(p.strike / spot - 1) : 0,
      contract: c.option,
    })
  }
  return rows
}

// ATM straddle → expected move to the nearest near-dated expiry.
function impliedMove(rows: ChainRow[], spot: number) {
  const exps = [...new Set(rows.filter((r) => r.dte >= 2 && r.dte <= 20).map((r) => r.expiry))].sort()
  const expiry = exps[0]
  if (!expiry) return { pct: null, expiry: null }
  const atExpiry = rows.filter((r) => r.expiry === expiry)
  const atm = [...atExpiry].sort((a, b) => Math.abs(a.strike - spot) - Math.abs(b.strike - spot))[0]
  if (!atm || !spot) return { pct: null, expiry: null }
  const call = atExpiry.find((r) => r.strike === atm.strike && r.type === "call")
  const put = atExpiry.find((r) => r.strike === atm.strike && r.type === "put")
  if (!call || !put) return { pct: null, expiry: null }
  // midFrac is already spot-relative in both feeds, so the straddle sum is the
  // expected move as a fraction. (Was: premium/volume, which is meaningless for
  // crypto where premium is traded notional in USD.)
  const straddle = call.midFrac + put.midFrac
  if (!straddle) return { pct: null, expiry: null }
  return { pct: round(straddle * 100, 1), expiry }
}

// 25-delta risk reversal: put IV minus call IV on the nearest monthly-ish expiry.
function skew25(rows: ChainRow[]): number | null {
  const expiry = [...new Set(rows.filter((r) => r.dte >= 15 && r.dte <= 60 && r.iv > 0).map((r) => r.expiry))].sort()[0]
  if (!expiry) return null
  const at = rows.filter((r) => r.expiry === expiry && r.delta !== null && r.iv > 0)
  const nearest = (want: number) => at.reduce<ChainRow | null>((best, r) => (!best || Math.abs((r.delta as number) - want) < Math.abs((best.delta as number) - want) ? r : best), null)
  const put = nearest(-0.25)
  const call = nearest(0.25)
  if (!put || !call || Math.abs((put.delta as number) + 0.25) > 0.2 || Math.abs((call.delta as number) - 0.25) > 0.2) return null
  return round((put.iv - call.iv) * 100, 1)
}

export async function fetchEquityFlow(symbol: string): Promise<OptionsFlow | null> {
  return cached("flow-equity", symbol.toUpperCase(), FLOW_TTL, async () => {
    const url = `https://cdn.cboe.com/api/global/delayed_quotes/options/${encodeURIComponent(symbol.toUpperCase())}.json`
    const res = await fetchJson<CboeResp>(url, { timeoutMs: 15000 })
    const d = res?.data
    const spot = d?.current_price ?? 0
    if (!d?.options?.length || !spot) return null

    const rows = toRows(d.options, spot)
    const median = chainMedian(rows)
    const fresh = rows
      .map((r) => ({ ...r, notability: median > 0 ? r.premium / median : 0 }))
      .filter((r) => r.dte >= EQUITY.minDte && r.dte <= EQUITY.maxDte)
      .filter((r) => r.delta !== null && Math.abs(r.delta) >= EQUITY.minAbsDelta && Math.abs(r.delta) <= EQUITY.maxAbsDelta)
      .filter((r) => r.volume >= EQUITY.minVolume && r.ratio >= EQUITY.minRatio && r.premium >= EQUITY.minPremium)
      .filter((r) => r.notability >= EQUITY.minNotability)
      .sort((a, b) => b.premium - a.premium)

    return assemble(symbol, spot, d.iv30 ?? null, d.iv30_change ?? null, fresh, {
      skew: skew25(rows),
      implied: impliedMove(rows, spot),
      chain: rows,
      kind: "equity",
      source: "cboe",
      asOf: d.last_trade_time ?? new Date().toISOString(),
    })
  })
}

// ── Crypto: Deribit public options book ────────────────────────────────────

// Only these have a listed options market we can read for free. Everything
// else in the crypto universe (memecoins, alts) would be a wasted request.
const DERIBIT_CURRENCIES: Record<string, string> = { BTC: "BTC", ETH: "ETH" }

export function supportsOptions(symbol: string, category: string): boolean {
  if (category === "crypto") return symbol.toUpperCase() in DERIBIT_CURRENCIES
  // ETFs and commodities are excluded: index/sector flow dwarfs single names
  // (SPY alone shows ~$28M of "unusual" premium on an ordinary day).
  return category === "stocks"
}

function parseDeribit(name: string) {
  const m = name.match(/^([A-Z]+)-(\d{1,2})([A-Z]{3})(\d{2})-(\d+)-([CP])$/)
  if (!m) return null
  const month = MONTHS[m[3]]
  if (month === undefined) return null
  return {
    expiry: new Date(Date.UTC(2000 + Number(m[4]), month, Number(m[2]), 8)).toISOString().slice(0, 10),
    type: (m[6] === "C" ? "call" : "put") as "call" | "put",
    strike: Number(m[5]),
  }
}

interface DeribitItem {
  instrument_name: string; bid_price: number; ask_price: number; mid_price: number
  mark_iv: number; open_interest: number; volume: number; volume_usd: number
  underlying_price: number
}

export async function fetchCryptoFlow(symbol: string): Promise<OptionsFlow | null> {
  const currency = DERIBIT_CURRENCIES[symbol.toUpperCase()]
  if (!currency) return null // only BTC/ETH have listed options
  return cached("flow-crypto", currency, FLOW_TTL, async () => {
    const url = `https://www.deribit.com/api/v2/public/get_book_summary_by_currency?currency=${currency}&kind=option`
    const res = await fetchJson<{ result?: DeribitItem[] }>(url)
    const items = res?.result
    if (!items?.length) return null
    const spot = items.map((i) => i.underlying_price).filter((n) => n > 0).sort((a, b) => a - b)[Math.floor(items.length / 2)]
    if (!spot) return null

    const rows: ChainRow[] = []
    for (const i of items) {
      const p = parseDeribit(i.instrument_name)
      if (!p) continue
      const dte = daysTo(p.expiry)
      const oiUsd = (i.open_interest || 0) * spot
      const mid = i.mid_price || (i.bid_price + i.ask_price) / 2
      rows.push({
        type: p.type, strike: p.strike, expiry: p.expiry, dte,
        volume: i.volume || 0, openInterest: i.open_interest || 0,
        iv: (i.mark_iv || 0) / 100, delta: null,
        midFrac: mid, // Deribit quotes in the coin itself = already a fraction
        premium: i.volume_usd || 0, // Deribit reports daily traded notional in USD
        ratio: oiUsd > 0 ? (i.volume_usd || 0) / oiUsd : 0,
        otmPct: spot > 0 ? Math.abs(p.strike / spot - 1) : 0,
        contract: i.instrument_name,
      })
    }

    const median = chainMedian(rows)
    const fresh = rows
      .map((r) => ({ ...r, notability: median > 0 ? r.premium / median : 0 }))
      .filter((r) => r.dte >= CRYPTO.minDte && r.dte <= CRYPTO.maxDte)
      .filter((r) => r.otmPct >= CRYPTO.minOtmPct && r.otmPct <= CRYPTO.maxOtmPct)
      .filter((r) => r.premium >= CRYPTO.minVolumeUsd && r.ratio >= CRYPTO.minRatio)
      .filter((r) => r.notability >= CRYPTO.minNotability)
      .sort((a, b) => b.premium - a.premium)

    // Crypto has no delta in this feed; approximate 25-delta with 0.85/1.15 moneyness.
    const proxySkew = (() => {
      const expiry = [...new Set(rows.filter((r) => r.dte >= 15 && r.dte <= 60 && r.iv > 0).map((r) => r.expiry))].sort()[0]
      if (!expiry) return null
      const at = rows.filter((r) => r.expiry === expiry && r.iv > 0)
      const pick = (want: number, type: "call" | "put") => at.filter((r) => r.type === type).reduce<ChainRow | null>((b, r) => (!b || Math.abs(r.otmPct - want) < Math.abs(b.otmPct - want) ? r : b), null)
      const put = pick(0.15, "put")
      const call = pick(0.15, "call")
      return put && call ? round((put.iv - call.iv) * 100, 1) : null
    })()

    const atm = [...rows.filter((r) => r.dte >= 2 && r.dte <= 20 && r.iv > 0)].sort((a, b) => Math.abs(a.strike - spot) - Math.abs(b.strike - spot))[0]
    const iv = atm ? round(atm.iv * 100, 1) : null
    const implied = impliedMove(rows, spot)

    return assemble(symbol.toUpperCase(), spot, iv, null, fresh, {
      skew: proxySkew,
      implied,
      chain: rows,
      kind: "crypto",
      source: "deribit",
      asOf: new Date().toISOString(),
    })
  })
}

// ── Shared assembly ────────────────────────────────────────────────────────

function assemble(
  symbol: string,
  spot: number,
  iv: number | null,
  ivChange: number | null,
  fresh: ChainRow[],
  meta: {
    skew: number | null
    implied: { pct: number | null; expiry: string | null }
    kind: "equity" | "crypto"
    source: "cboe" | "deribit"
    asOf: string
    /** Whole chain, used for the "share of session flow" figure. */
    chain?: ChainRow[]
  },
): OptionsFlow {
  const allRows = meta.chain ?? fresh
  const callPremium = fresh.filter((r) => r.type === "call").reduce((s, r) => s + r.premium, 0)
  const putPremium = fresh.filter((r) => r.type === "put").reduce((s, r) => s + r.premium, 0)
  const tiltRatio = putPremium > 0 ? callPremium / putPremium : callPremium > 0 ? Infinity : null
  const tilt: OptionsFlow["tilt"] = tiltRatio === null ? "balanced" : tiltRatio >= 1.5 ? "bullish" : tiltRatio <= 0.67 ? "bearish" : "balanced"

  const prints: OptionPrint[] = fresh.slice(0, 6).map((r) => ({
    contract: r.contract,
    type: r.type,
    strike: r.strike,
    expiry: r.expiry,
    dte: r.dte,
    volume: r.volume,
    openInterest: r.openInterest,
    iv: round(r.iv * 100, 1),
    delta: r.delta === null ? null : round(r.delta, 2),
    premium: Math.round(r.premium),
    ratio: round(r.ratio, 2),
    otmPct: round(r.otmPct * 100, 1),
  }))

  return {
    symbol,
    kind: meta.kind,
    source: meta.source,
    asOf: meta.asOf,
    spot: round(spot, spot >= 100 ? 2 : 4),
    iv: iv === null ? null : round(iv, 1),
    ivChange: ivChange === null ? null : round(ivChange, 2),
    ivRank: recordIv(symbol, iv),
    callPremium: Math.round(callPremium),
    putPremium: Math.round(putPremium),
    tiltRatio: tiltRatio === null || !Number.isFinite(tiltRatio) ? null : round(tiltRatio, 2),
    tilt,
    impliedMovePct: meta.implied.pct,
    impliedMoveExpiry: meta.implied.expiry,
    skew: meta.skew,
    unusualPremium: Math.round(fresh.slice(0, 8).reduce((s, r) => s + r.premium, 0)),
    maxNotability: round(fresh.reduce((m, r) => Math.max(m, r.notability ?? 0), 0), 1),
    chainPremium: Math.round(allRows.reduce((s, r) => s + r.premium, 0)),
    flagged: fresh.length,
    prints,
  }
}

export async function fetchFlow(symbol: string, category: string): Promise<OptionsFlow | null> {
  return category === "crypto" ? fetchCryptoFlow(symbol) : fetchEquityFlow(symbol)
}

export function isUnusual(flow: OptionsFlow): boolean {
  return flow.flagged > 0 && flow.unusualPremium >= UNUSUAL_PREMIUM[flow.kind]
}
