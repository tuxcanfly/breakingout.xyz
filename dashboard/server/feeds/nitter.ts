import type { IntelTweet } from "../types.js"

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

const NITTER_INSTANCES = [
  "http://167.179.82.187:8085",
  "http://195.32.104.64:8081",
  "http://79.85.161.133:8081",
]

const tweetCache = new Map<string, { data: NitterResult; timestamp: number }>()
const TWEET_CACHE_TTL = 10 * 60 * 1000

function sanitizeSymbol(symbol: string): string {
  // Remove exchange prefixes and common suffixes
  return symbol.replace(/^(NASDAQ|NYSE|AMEX|BINANCE):/, "").replace(/USDT$/, "")
}

function buildQuery(symbol: string): string {
  const s = sanitizeSymbol(symbol)
  // Use $ prefix for stocks, plain for crypto
  if (s.length <= 5 && s.match(/^[A-Z.]+$/)) {
    return encodeURIComponent(`$${s}`)
  }
  return encodeURIComponent(s)
}

function parseRSS(xml: string): NitterTweet[] {
  const tweets: NitterTweet[] = []
  const itemRegex = /<item>[\s\S]*?<\/item>/g
  const items = xml.match(itemRegex) || []

  for (const item of items.slice(0, 8)) {
    const titleMatch = item.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/)
    const linkMatch = item.match(/<link>(.*?)<\/link>/)
    const dateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/)
    const creatorMatch = item.match(/<dc:creator>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/dc:creator>/)
      || item.match(/<author>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/author>/)

    const text = titleMatch ? titleMatch[1].trim().replace(/&(quot|amp|lt|gt|apos|#39);/g, (m) => ({ "&quot;": '"', "&amp;": "&", "&lt;": "<", "&gt;": ">", "&apos;": "'", "&#39;": "'" }[m] ?? m)) : ""
    if (!text) continue

    let link = linkMatch ? linkMatch[1].trim() : ""
    // Convert Nitter link to x.com link
    if (link) {
      try {
        const url = new URL(link)
        link = `https://x.com${url.pathname}`
      } catch {
        link = ""
      }
    }

    tweets.push({
      author: creatorMatch ? creatorMatch[1].trim() : "unknown",
      text,
      date: dateMatch ? dateMatch[1].trim() : "",
      link,
    })
  }

  return tweets
}

async function fetchFromInstance(instance: string, symbol: string): Promise<NitterResult | null> {
  const query = buildQuery(symbol)
  const url = `${instance}/search/rss?f=tweets&q=${query}&e-replies=on&e-nativeretweets=on&min_faves=5`

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "breakingout.xyz/1.0" },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return null
    const xml = await res.text()
    if (!xml.includes("<item>")) return null
    const tweets = parseRSS(xml)
    return { count: tweets.length, tweets }
  } catch {
    return null
  }
}

// Cashtag extraction. Strict: only $TICKER form (1–5 uppercase letters,
// optional trailing .B for share classes). Anything looser risks flooding the
// universe with noise.
const CASHTAG_RE = /\$([A-Z]{1,5}(?:\.[A-Z])?)/g

export function extractSymbolsFromTweets(tweets: NitterTweet[]): Set<string> {
  const symbols = new Set<string>()
  for (const t of tweets) {
    let m: RegExpExecArray | null
    CASHTAG_RE.lastIndex = 0
    while ((m = CASHTAG_RE.exec(t.text)) !== null) {
      symbols.add(m[1])
    }
  }
  return symbols
}

function extractSymbolsFromText(text: string): string[] {
  const out: string[] = []
  let m: RegExpExecArray | null
  CASHTAG_RE.lastIndex = 0
  while ((m = CASHTAG_RE.exec(text)) !== null) {
    out.push(m[1])
  }
  return out
}

async function fetchFromUser(instance: string, username: string): Promise<NitterTweet[]> {
  const url = `${instance}/search/rss?f=tweets&q=from%3A${username}&e-replies=on&e-nativeretweets=on`
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "breakingout.xyz/1.0" },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return []
    const xml = await res.text()
    if (!xml.includes("<item>")) return []
    return parseRSS(xml)
  } catch {
    return []
  }
}

// Fetch recent tweets from a single tracked handle, trying instances in order.
async function fetchAccountTweets(account: TrackedAccount): Promise<NitterTweet[]> {
  for (const instance of NITTER_INSTANCES) {
    const tweets = await fetchFromUser(instance, account.handle)
    if (tweets.length > 0) return tweets
  }
  return []
}

// Strict-gated mentions map: tag -> Set of cashtags mentioned recently by that
// account. Used for per-asset mention tags.
export async function fetchTrackedMentionsMap(): Promise<{
  byTag: Record<string, Set<string>>
  bySymbol: Map<string, string[]>
}> {
  const byTag: Record<string, Set<string>> = {}
  const bySymbol = new Map<string, string[]>()

  const results = await Promise.all(
    TRACKED_ACCOUNTS.map(async (acc) => {
      const tweets = await fetchAccountTweets(acc)
      return { acc, symbols: extractSymbolsFromTweets(tweets) }
    })
  )

  for (const { acc, symbols } of results) {
    byTag[acc.tag] = symbols
    for (const sym of symbols) {
      const existing = bySymbol.get(sym)
      if (existing) {
        if (!existing.includes(acc.tag)) existing.push(acc.tag)
      } else {
        bySymbol.set(sym, [acc.tag])
      }
    }
  }

  return { byTag, bySymbol }
}

// Union of recent tweets from all tracked accounts, annotated with the
// author handle and any cashtags mentioned in the body. Powers the Intel tab.
export async function fetchTrackedFeed(limit = 40): Promise<IntelTweet[]> {
  const perAccount = await Promise.all(
    TRACKED_ACCOUNTS.map(async (acc) => {
      const tweets = await fetchAccountTweets(acc)
      return tweets.map<IntelTweet>((t) => ({
        author: acc.name,
        authorHandle: acc.handle,
        authorUrl: acc.xUrl,
        text: t.text,
        date: t.date,
        link: t.link,
        symbols: extractSymbolsFromText(t.text),
      }))
    })
  )

  const flat = perAccount.flat()
  // Dedup by link (same tweet from different instance paths), keep most recent
  const seen = new Set<string>()
  const deduped = flat
    .filter((t) => {
      const key = t.link || `${t.authorHandle}:${t.text.slice(0, 60)}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
    .slice(0, limit)

  return deduped
}

export async function fetchTweetsForSymbol(symbol: string): Promise<NitterResult> {
  const cacheKey = `tweets:${symbol.toUpperCase()}`
  const cached = tweetCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < TWEET_CACHE_TTL) {
    return cached.data
  }

  for (const instance of NITTER_INSTANCES) {
    const result = await fetchFromInstance(instance, symbol)
    if (result && result.count > 0) {
      tweetCache.set(cacheKey, { data: result, timestamp: Date.now() })
      return result
    }
  }

  // Return empty but cache to avoid hammering dead instances
  const empty: NitterResult = { count: 0, tweets: [] }
  tweetCache.set(cacheKey, { data: empty, timestamp: Date.now() })
  return empty
}
