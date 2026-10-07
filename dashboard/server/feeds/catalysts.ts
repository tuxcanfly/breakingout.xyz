// Reverse-engineering a probable catalyst from free evidence.
//
// Evidence, in rough order of trustworthiness:
//   1. SEC filings     — an event demonstrably happened (8-K, 13D stake, 425 merger)
//   2. Earnings dates  — a scheduled event, with timing we can compare to the flow
//   3. Clinical trials — scheduled readouts/completions (biotech only)
//   4. News headlines  — weak: a headline rarely states the cause, so this only
//                        ever confirms, never leads
//
// The ranking is deliberately conservative: news keywords alone cap out at low
// confidence, and "nothing found" is a result we report rather than invent.
import type { CatalystEvent, CatalystKind, CatalystReport, IntelTweet } from "../types.js"
import { SEC_UA, cached, fetchJson, fetchText } from "./http.js"

const DAY = 86_400_000
const daysAway = (iso: string) => Math.round((Date.parse(iso + "T20:00:00Z") - Date.now()) / DAY)

// ── 1. SEC filings ─────────────────────────────────────────────────────────

const MATERIAL_FORMS: Record<string, { kind: CatalystKind; label: string }> = {
  "8-K": { kind: "filing", label: "8-K material event" },
  "8-K/A": { kind: "filing", label: "8-K/A material event (amended)" },
  "SC 13D": { kind: "stake", label: "13D active stake disclosure" },
  "SC 13D/A": { kind: "stake", label: "13D stake updated" },
  "SC 13G": { kind: "stake", label: "13G passive stake disclosure" },
  "425": { kind: "merger", label: "425 merger communication" },
  "S-1": { kind: "offering", label: "S-1 registration (possible offering)" },
  "S-3": { kind: "offering", label: "S-3 shelf registration" },
  "424B5": { kind: "offering", label: "424B5 prospectus (offering)" },
  "424B3": { kind: "offering", label: "424B3 prospectus" },
}

async function cikFor(ticker: string): Promise<{ cik: string; title: string } | null> {
  // company_tickers.json requires a descriptive UA; a bare one is 403'd.
  const map = await cached("sec-tickers", "all", 24 * 60 * 60 * 1000, async () =>
    fetchJson<Record<string, { cik_str: number; ticker: string; title: string }>>(
      "https://www.sec.gov/files/company_tickers.json",
      { ua: SEC_UA, timeoutMs: 20000 },
    ),
  )
  if (!map) return null
  const hit = Object.values(map).find((v) => v.ticker?.toUpperCase() === ticker.toUpperCase())
  return hit ? { cik: String(hit.cik_str).padStart(10, "0"), title: hit.title } : null
}

interface Submissions {
  filings?: { recent?: { form: string[]; filingDate: string[]; primaryDocDescription: string[]; accessionNumber: string[] } }
}

async function secEvents(ticker: string): Promise<CatalystEvent[]> {
  const id = await cikFor(ticker)
  if (!id) return []
  const subs = await cached("sec-subs", id.cik, 6 * 60 * 60 * 1000, () =>
    fetchJson<Submissions>(`https://data.sec.gov/submissions/CIK${id.cik}.json`, { ua: SEC_UA, timeoutMs: 20000 }),
  )
  const r = subs?.filings?.recent
  if (!r) return []

  const events: CatalystEvent[] = []
  const seenKind = new Set<CatalystKind>()
  let insiderCount = 0
  let insiderLatest = ""

  for (let i = 0; i < r.form.length && i < 200; i++) {
    const form = r.form[i]
    const date = r.filingDate[i]
    const days = daysAway(date) // negative = in the past
    const age = -days
    if (form === "4") {
      if (age <= 10) {
        insiderCount++
        if (date > insiderLatest) insiderLatest = date
      }
      continue
    }
    const meta = MATERIAL_FORMS[form]
    if (!meta || age > 21 || seenKind.has(meta.kind)) continue
    seenKind.add(meta.kind)
    events.push({
      kind: meta.kind,
      label: `${meta.label} filed ${date}`,
      date,
      daysAway: days,
      confidence: age <= 5 ? "high" : age <= 14 ? "medium" : "low",
      source: "SEC EDGAR",
      url: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${id.cik}&type=${encodeURIComponent(form)}&dateb=&owner=include&count=10`,
    })
  }

  // Insider selling is near-universal, so it needs a cluster to mean anything.
  if (insiderCount >= 3) {
    events.push({
      kind: "insider",
      label: `insider cluster — ${insiderCount} Form 4 filings in 10 days`,
      date: insiderLatest,
      daysAway: daysAway(insiderLatest),
      confidence: insiderCount >= 5 ? "medium" : "low",
      source: "SEC EDGAR",
      url: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${id.cik}&type=4&dateb=&owner=include&count=40`,
    })
  }
  return events
}

// ── 2. Earnings date ───────────────────────────────────────────────────────

const US_DATE = /(\d{1,2})\/(\d{1,2})\/(\d{4})/

async function earningsEvent(ticker: string): Promise<CatalystEvent | null> {
  const res = await cached("earnings-date", ticker.toUpperCase(), 6 * 60 * 60 * 1000, async () =>
    fetchJson<{ data?: { reportText?: string } }>(`https://api.nasdaq.com/api/analyst/${encodeURIComponent(ticker)}/earnings-date`),
  )
  const text = res?.data?.reportText
  const m = text?.match(US_DATE)
  if (!m) return null
  const iso = `${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`
  const days = daysAway(iso)
  if (days < -5) return null
  return {
    kind: "earnings",
    label: `earnings ${iso}${days >= 0 ? ` (in ${days}d)` : ` (${-days}d ago)`}`,
    date: iso,
    daysAway: days,
    // Only a near-term print can explain today's positioning.
    confidence: days >= -1 && days <= 3 ? "high" : days > 3 && days <= 10 ? "medium" : "low",
    source: "Nasdaq / Zacks estimate",
    url: `https://www.nasdaq.com/market-activity/stocks/${ticker.toLowerCase()}/earnings`,
  }
}

// ── 3. Clinical trials (biotech only) ──────────────────────────────────────

const BIOTECH = /biotech|pharma|therapeut|drug|biolog|medical|medicine|health/i

async function clinicalEvents(companyName: string): Promise<CatalystEvent[]> {
  const sponsor = companyName.split(/[,.\s]+/).filter((w) => w.length > 3)[0]
  if (!sponsor) return []
  const res = await cached("clinical", sponsor.toLowerCase(), 12 * 60 * 60 * 1000, async () =>
    fetchJson<{ studies?: Array<{ protocolSection?: { statusModule?: { primaryCompletionDateStruct?: { date?: string } }; identificationModule?: { nctId?: string; briefTitle?: string } } }> }>(
      `https://clinicaltrials.gov/api/v2/studies?query.spons=${encodeURIComponent(sponsor)}&filter.overallStatus=RECRUITING,ACTIVE_NOT_RECRUITING&pageSize=10`,
    ),
  )
  const out: CatalystEvent[] = []
  for (const s of res?.studies ?? []) {
    const date = s.protocolSection?.statusModule?.primaryCompletionDateStruct?.date
    const nct = s.protocolSection?.identificationModule?.nctId
    if (!date || !nct) continue
    const days = daysAway(date)
    if (days < 0 || days > 120) continue
    out.push({
      kind: "clinical",
      label: `trial ${nct} primary completion ${date} (in ${days}d)`,
      date,
      daysAway: days,
      confidence: "low",
      source: "ClinicalTrials.gov",
      url: `https://clinicaltrials.gov/study/${nct}`,
    })
  }
  return out.sort((a, b) => (a.daysAway ?? 0) - (b.daysAway ?? 0)).slice(0, 1)
}

// ── 4. News headlines (confirmation only) ──────────────────────────────────

const NEWS_HINTS: Array<{ re: RegExp; kind: CatalystKind; label: string }> = [
  { re: /\b(acqui\w*|merger|takeover|buyout|tender offer|stake|13d|talks to (buy|sell))\b/i, kind: "stake", label: "M&A / stake chatter" },
  { re: /\b(fda|pdufa|phase [123]|topline|data readout|approval|complete response|clinical hold)\b/i, kind: "clinical", label: "regulatory / clinical chatter" },
  { re: /\b(earnings|guidance|preliminary results|beats|misses|reaffirm)\b/i, kind: "earnings", label: "earnings / guidance chatter" },
  { re: /\b(offering|raise|placement|convertible|dilut\w*|shelf)\b/i, kind: "offering", label: "financing chatter" },
  { re: /\b(contract|order|award|partnership|wins|selected|agreement)\b/i, kind: "news", label: "commercial win chatter" },
  { re: /\b(short (interest|sellers)|squeeze|halted|circuit breaker)\b/i, kind: "squeeze", label: "squeeze / microstructure chatter" },
  { re: /\b(upgrade|downgrade|price target|initiat\w+ coverage)\b/i, kind: "news", label: "analyst action chatter" },
  { re: /\b(ceo|cfo|resign\w*|steps down|departs|board shake)\b/i, kind: "news", label: "management change chatter" },
]

function decode(s: string) {
  return s.replace(/&#39;|&amp;|&quot;|&lt;|&gt;/g, (x) => ({ "&#39;": "'", "&amp;": "&", "&quot;": '"', "&lt;": "<", "&gt;": ">" })[x] ?? x)
}

async function headlines(ticker: string): Promise<Array<{ title: string; date: string; url?: string }>> {
  return (
    (await cached("news", ticker.toUpperCase(), 30 * 60 * 1000, async () => {
      const xml = await fetchText(
        `https://news.google.com/rss/search?q=%24${encodeURIComponent(ticker)}+stock+when:3d&hl=en-US&gl=US&ceid=US:en`,
        { timeoutMs: 12000 },
      )
      if (!xml) return null
      return [...xml.matchAll(/<item>[\s\S]*?<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>[\s\S]*?(?:<link>(.*?)<\/link>)?[\s\S]*?<pubDate>(.*?)<\/pubDate>/g)]
        .slice(0, 8)
        .map((m) => ({ title: decode(m[1].trim()), date: new Date(m[3]).toISOString().slice(0, 10), url: m[2]?.trim() }))
    })) ?? []
  )
}

function newsEvents(heads: Array<{ title: string; date: string }>): CatalystEvent[] {
  const byLabel = new Map<string, number>()
  for (const h of heads) {
    for (const { re, label } of NEWS_HINTS) {
      if (re.test(h.title)) byLabel.set(label, (byLabel.get(label) ?? 0) + 1)
    }
  }
  // Always kind "news": a headline suggests a theme but does not establish a
  // dated event, so it must never be ranked as (or labelled) a real catalyst.
  return [...byLabel.entries()].map(([label, count]) => ({
    kind: "news" as const,
    label: `${label} — ${count} headline${count > 1 ? "s" : ""} in 3d`,
    confidence: "low" as const,
    source: "Google News",
  }))
}

// ── Ranking ────────────────────────────────────────────────────────────────

// Base trust per kind: a dated filing beats a headline by a wide margin.
const WEIGHT: Record<CatalystKind, number> = {
  stake: 4, merger: 3, earnings: 2.6, filing: 2.4, offering: 1.8, clinical: 1.6, insider: 1.2, squeeze: 1, news: 0.8,
}
const CONFIDENCE_BONUS = { high: 1.5, medium: 1.1, low: 0.7 }

function score(e: CatalystEvent): number {
  let s = WEIGHT[e.kind] * CONFIDENCE_BONUS[e.confidence]
  const d = e.daysAway
  if (d !== undefined) {
    const near = Math.abs(d)
    if (near <= 3) s *= 1.6
    else if (near <= 7) s *= 1.25
    else if (near > 21) s *= 0.5
  }
  return s
}

function rationaleFor(probable: CatalystEvent | null, events: CatalystEvent[], chatter: CatalystReport["chatter"], flowPremium: number): string {
  const premium = `$${(flowPremium / 1e6).toFixed(1)}M`
  if (!probable) {
    const next = [...events].filter((e) => (e.daysAway ?? -999) >= 0).sort((a, b) => (a.daysAway ?? 0) - (b.daysAway ?? 0))[0]
    return (
      `No dated catalyst found in free sources for this ${premium} of fresh positioning.` +
      (next ? ` Nearest known event is ${next.label}.` : "") +
      (chatter.accounts.length ? ` Tracked accounts have discussed it (${chatter.accounts.map((a) => "@" + a).join(", ")}).` : "") +
      ` Treat the driver as unknown — possibly an unannounced event or index/flow-driven.`
    )
  }
  const parts: string[] = []
  switch (probable.kind) {
    case "earnings":
      parts.push(
        probable.confidence === "high"
          ? `Earnings ${probable.date} lines up squarely with today's ${premium} of positioning — the classic pre-print setup.`
          : `Earnings ${probable.date} is the nearest scheduled event, though the timing is loose for today's ${premium} of flow.`,
      )
      break
    case "news":
      parts.push(`Only headline-level evidence points to ${probable.label.replace(/ — \d+ headlines? in 3d/, "")}; this is a hypothesis, not a confirmed driver.`)
      break
    case "stake":
      parts.push(`A 13D/stake disclosure is the strongest free signal of a deliberate position: ${probable.label}.`)
      break
    case "merger":
      parts.push(`A 425 merger communication is on file (${probable.label}) — deal-related positioning.`)
      break
    case "filing":
      parts.push(`An ${probable.label} is the most recent hard event, giving the flow a concrete anchor.`)
      break
    case "offering":
      parts.push(`A registration/offering filing (${probable.label}) raises dilution risk, a common reason for defensive put flow.`)
      break
    case "insider":
      parts.push(`Insider filings cluster (${probable.label}) — worth weighting, though insider selling is common and weak on its own.`)
      break
    case "clinical":
      parts.push(`A trial milestone is due (${probable.label}) — a scheduled binary event.`)
      break
    default:
      parts.push(`Evidence points to ${probable.label}, but nothing here confirms it as the driver.`)
  }
  if (chatter.accounts.length) parts.push(`Tracked accounts are also discussing it (${chatter.accounts.map((a) => "@" + a).join(", ")}).`)
  else if (chatter.trending) parts.push(`It is also on the retail trending list.`)
  return parts.join(" ")
}

export async function buildCatalystReport(
  ticker: string,
  opts: { category: string; name: string; sector?: string; subsector?: string; intel?: IntelTweet[]; toSymbol?: string; trending?: boolean; flowPremium?: number },
): Promise<CatalystReport> {
  const lookup = opts.toSymbol || ticker
  const isBiotech = BIOTECH.test(`${opts.sector ?? ""} ${opts.subsector ?? ""} ${opts.name}`)

  const [heads, earnings, sec, clinical] = await Promise.all([
    headlines(lookup),
    earningsEvent(lookup),
    secEvents(lookup).catch(() => [] as CatalystEvent[]),
    isBiotech ? clinicalEvents(opts.name).catch(() => [] as CatalystEvent[]) : Promise.resolve([] as CatalystEvent[]),
  ])

  const accounts = [...new Set((opts.intel ?? []).filter((t) => t.symbols.includes(ticker.toUpperCase())).map((t) => t.authorTag))]
  const chatter: CatalystReport["chatter"] = { accounts, trending: !!opts.trending, headlines: heads.slice(0, 5) }

  const events: CatalystEvent[] = [
    ...(earnings ? [earnings] : []),
    ...sec,
    ...clinical,
    ...newsEvents(heads),
  ].sort((a, b) => score(b) - score(a))

  const probable = events[0] ?? null
  return {
    symbol: ticker.toUpperCase(),
    probable,
    rationale: rationaleFor(probable, events, chatter, opts.flowPremium ?? 0),
    events: events.slice(0, 6),
    chatter,
  }
}
