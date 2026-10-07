import type { IntelTweet, IntelSymbol, IntelStatus } from "../types.js"

export interface NitterTweet {
  author: string
  text: string
  date: string
  link: string
}

export interface NitterResult {
  count: number
  tweets: NitterTweet[]
}

export interface TrackedAccount {
  handle: string
  tag: string
  name: string
  xUrl: string
}

// High-signal accounts whose mentions feed both the per-asset tags and the
// Intel tab. Keep this curated — every handle adds a per-refresh Nitter hit.
export const TRACKED_ACCOUNTS: TrackedAccount[] = [
  { handle: "aleabitoreddit", tag: "aleabitoreddit", name: "AleabitoReddit", xUrl: "https://x.com/aleabitoreddit" },
  { handle: "realsimpleariel", tag: "realsimpleariel", name: "RealSimpleAriel", xUrl: "https://x.com/realsimpleariel" },
  { handle: "stamatoudism", tag: "stamatoudism", name: "Michael Stamatoudis", xUrl: "https://x.com/stamatoudism" },
  { handle: "jfsrev", tag: "jfsrev", name: "JFSRev", xUrl: "https://x.com/jfsrev" },
  { handle: "asymtrading", tag: "asymtrading", name: "AsymTrading", xUrl: "https://x.com/asymtrading" },
  { handle: "tenet_research", tag: "tenet_research", name: "Tenet Research", xUrl: "https://x.com/tenet_research" },
  { handle: "ChairmansLedger", tag: "chairmansledger", name: "ChairmansLedger", xUrl: "https://x.com/ChairmansLedger" },
]

const NITTER_INSTANCES = (process.env.NITTER_INSTANCES || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean)
  .concat([
    "http://47.250.159.204:8080",
    "http://188.166.184.52:8080",
    "http://43.134.90.2:8080",
    "http://64.83.38.200:8080",
    "http://161.97.93.244:8080",
    "http://78.141.221.250:8080",
    "http://89.221.218.160:8080",
    "http://172.93.49.117:8080",
  ])
  .filter((v, i, arr) => arr.indexOf(v) === i)

const USER_AGENT = "breakingout.xyz/1.0"

// Only mentions inside this window count toward per-asset tags / hot list.
// Older posts still show in the feed but don't keep stamping assets forever.
const MENTION_WINDOW_MS = 14 * 24 * 60 * 60 * 1000

const tweetCache = new Map<string, { data: NitterResult; timestamp: number }>()
const TWEET_CACHE_TTL = 10 * 60 * 1000
const EMPTY_CACHE_TTL = 2 * 60 * 1000

// Last good per-account result. When every instance fails for an account we
// serve this instead of dropping the account from the feed entirely.
const accountCache = new Map<string, { tweets: NitterTweet[]; timestamp: number }>()
const ACCOUNT_STALE_MAX = 24 * 60 * 60 * 1000

function sanitizeSymbol(symbol: string): string {
  return symbol.replace(/^(NASDAQ|NYSE|AMEX|BINANCE):/, "").replace(/USDT$/, "")
}

function buildQuery(symbol: string): string {
  const s = sanitizeSymbol(symbol)
  if (s.length <= 5 && s.match(/^[A-Z.]+$/)) {
    return encodeURIComponent(`$${s}`)
  }
  return encodeURIComponent(s)
}

const ENTITIES: Record<string, string> = {
  "&quot;": '"', "&amp;": "&", "&lt;": "<", "&gt;": ">", "&apos;": "'", "&#39;": "'", "&#x27;": "'", "&nbsp;": " ",
}

function decodeEntities(s: string): string {
  return s
    .replace(/&(quot|amp|lt|gt|apos|nbsp|#39|#x27);/g, (m) => ENTITIES[m] ?? m)
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
}

function parseRSS(xml: string, max = 20): NitterTweet[] {
  const tweets: NitterTweet[] = []
  const items = xml.match(/<item>[\s\S]*?<\/item>/g) || []

  for (const item of items.slice(0, max)) {
    const titleMatch = item.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/)
    const linkMatch = item.match(/<link>(.*?)<\/link>/)
    const dateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/)
    const creatorMatch = item.match(/<dc:creator>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/dc:creator>/)
      || item.match(/<author>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/author>/)

    const text = titleMatch ? decodeEntities(titleMatch[1].trim()) : ""
    if (!text) continue

    let link = linkMatch ? linkMatch[1].trim() : ""
    if (link) {
      try {
        const url = new URL(link)
        link = `https://x.com${url.pathname.replace(/#m$/, "")}`
      } catch {
        link = ""
      }
    }

    // Normalise to ISO so the client and sort comparisons are reliable —
    // RFC-822 strings ("Tue, 06 Oct …") don't sort lexicographically.
    const parsed = dateMatch ? new Date(dateMatch[1].trim()) : null
    const date = parsed && !isNaN(parsed.getTime()) ? parsed.toISOString() : ""

    tweets.push({
      author: creatorMatch ? creatorMatch[1].trim() : "unknown",
      text,
      date,
      link,
    })
  }

  return tweets
}

async function fetchRSS(url: string, timeoutMs = 8000): Promise<NitterTweet[] | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(timeoutMs),
    })
    if (!res.ok) return null
    const xml = await res.text()
    if (!xml.includes("<item>")) return null
    const tweets = parseRSS(xml)
    return tweets.length ? tweets : null
  } catch {
    return null
  }
}

// Try instances in order; first non-empty answer wins. Kept sequential on
// purpose — racing all instances × all accounts tripped public-instance rate
// limits. The real load cut is fetchTrackedIntel doing one pass, not two.
async function raceInstances(pathAndQuery: string): Promise<NitterTweet[] | null> {
  for (const instance of NITTER_INSTANCES) {
    const tweets = await fetchRSS(`${instance}${pathAndQuery}`)
    if (tweets) return tweets
  }
  return null
}

// Cashtag extraction. Strict: only $TICKER form (1–5 uppercase letters,
// optional trailing .B for share classes). Anything looser risks flooding the
// universe with noise. The lookbehind skips "$5" prices and URL fragments.
const CASHTAG_RE = /(?<![A-Za-z0-9])\$([A-Z]{1,5}(?:\.[A-Z])?)(?![A-Za-z0-9])/g

// Macro tickers that show up constantly in commentary but aren't picks.
const CASHTAG_NOISE = new Set(["USD", "SPX", "NDX", "VIX", "DXY", "CPI", "FOMC", "GDP", "AI", "IPO", "CEO"])

export function extractSymbolsFromText(text: string): string[] {
  const out = new Set<string>()
  for (const m of text.matchAll(CASHTAG_RE)) {
    if (!CASHTAG_NOISE.has(m[1])) out.add(m[1])
  }
  return [...out]
}

export function extractSymbolsFromTweets(tweets: NitterTweet[]): Set<string> {
  const symbols = new Set<string>()
  for (const t of tweets) for (const s of extractSymbolsFromText(t.text)) symbols.add(s)
  return symbols
}

interface AccountFetch {
  account: TrackedAccount
  tweets: NitterTweet[]
  ok: boolean
  stale: boolean
}

async function fetchAccountTweets(account: TrackedAccount): Promise<AccountFetch> {
  const fresh = await raceInstances(
    `/search/rss?f=tweets&q=from%3A${encodeURIComponent(account.handle)}&e-replies=on&e-nativeretweets=on`
  )
  if (fresh) {
    accountCache.set(account.handle, { tweets: fresh, timestamp: Date.now() })
    return { account, tweets: fresh, ok: true, stale: false }
  }
  const prev = accountCache.get(account.handle)
  if (prev && Date.now() - prev.timestamp < ACCOUNT_STALE_MAX) {
    return { account, tweets: prev.tweets, ok: false, stale: true }
  }
  return { account, tweets: [], ok: false, stale: false }
}

export interface TrackedIntel {
  feed: IntelTweet[]
  bySymbol: Map<string, string[]>
  hot: IntelSymbol[]
  status: IntelStatus
}

// One pass over every tracked account → feed, per-symbol mention map, and a
// ranked "hot" list. Previously the feed and the mention map each fetched
// every account independently, doubling Nitter load and rate-limit failures.
export async function fetchTrackedIntel(limit = 60): Promise<TrackedIntel> {
  const results = await Promise.all(TRACKED_ACCOUNTS.map(fetchAccountTweets))
  const now = Date.now()

  const flat: IntelTweet[] = results.flatMap(({ account, tweets }) =>
    tweets.map((t) => ({
      author: account.name,
      authorHandle: account.handle,
      authorTag: account.tag,
      authorUrl: account.xUrl,
      text: t.text,
      date: t.date,
      link: t.link,
      symbols: extractSymbolsFromText(t.text),
    }))
  )

  const seen = new Set<string>()
  const feed = flat
    .filter((t) => {
      const key = t.link || `${t.authorHandle}:${t.text.slice(0, 60)}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .sort((a, b) => (Date.parse(b.date) || 0) - (Date.parse(a.date) || 0))

  // Mention aggregation over the recency window only.
  const agg = new Map<string, { accounts: Set<string>; count: number; last: number }>()
  for (const t of feed) {
    const ts = Date.parse(t.date)
    if (!ts || now - ts > MENTION_WINDOW_MS) continue
    for (const sym of t.symbols) {
      const e = agg.get(sym) ?? { accounts: new Set<string>(), count: 0, last: 0 }
      e.accounts.add(t.authorTag)
      e.count++
      e.last = Math.max(e.last, ts)
      agg.set(sym, e)
    }
  }

  const bySymbol = new Map<string, string[]>()
  const hot: IntelSymbol[] = []
  for (const [symbol, e] of agg) {
    bySymbol.set(symbol, [...e.accounts])
    hot.push({
      symbol,
      accounts: [...e.accounts],
      mentions: e.count,
      lastMention: new Date(e.last).toISOString(),
    })
  }
  // Rank: distinct accounts (consensus) > mention count > recency.
  hot.sort((a, b) =>
    b.accounts.length - a.accounts.length ||
    b.mentions - a.mentions ||
    Date.parse(b.lastMention) - Date.parse(a.lastMention)
  )

  const status: IntelStatus = {
    accountsTotal: TRACKED_ACCOUNTS.length,
    accountsOk: results.filter((r) => r.ok).length,
    accountsStale: results.filter((r) => r.stale).map((r) => r.account.handle),
    accountsFailed: results.filter((r) => !r.ok && !r.stale).map((r) => r.account.handle),
    windowDays: MENTION_WINDOW_MS / 86_400_000,
  }

  return { feed: feed.slice(0, limit), bySymbol, hot: hot.slice(0, 30), status }
}

export async function fetchTweetsForSymbol(symbol: string): Promise<NitterResult> {
  const cacheKey = `tweets:${symbol.toUpperCase()}`
  const cached = tweetCache.get(cacheKey)
  if (cached) {
    const ttl = cached.data.count > 0 ? TWEET_CACHE_TTL : EMPTY_CACHE_TTL
    if (Date.now() - cached.timestamp < ttl) return cached.data
  }

  const tweets = await raceInstances(
    `/search/rss?f=tweets&q=${buildQuery(symbol)}&e-replies=on&e-nativeretweets=on&min_faves=5`
  )
  const result: NitterResult = tweets
    ? { count: Math.min(tweets.length, 8), tweets: tweets.slice(0, 8) }
    : cached?.data ?? { count: 0, tweets: [] }
  // Cache empties briefly to avoid hammering dead instances, but don't let
  // a transient failure blank a symbol for the full TTL.
  tweetCache.set(cacheKey, { data: result, timestamp: Date.now() })
  return result
}
