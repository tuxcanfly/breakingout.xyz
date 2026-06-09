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

  for (const item of items.slice(0, 5)) {
    const titleMatch = item.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/)
    const linkMatch = item.match(/<link>(.*?)<\/link>/)
    const dateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/)
    const creatorMatch = item.match(/<dc:creator>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/dc:creator>/)
      || item.match(/<author>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/author>/)

    const text = titleMatch ? titleMatch[1].trim().replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">") : ""
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

const mentionCache = new Map<string, { data: Set<string>; timestamp: number }>()
const MENTION_CACHE_TTL = 30 * 60 * 1000

function extractSymbolsFromTweets(tweets: NitterTweet[]): Set<string> {
  const symbols = new Set<string>()
  const cashtagRegex = /\$([A-Z]{1,5}\.?[A-Z]?)/g
  for (const t of tweets) {
    let m: RegExpExecArray | null
    while ((m = cashtagRegex.exec(t.text)) !== null) {
      symbols.add(m[1])
    }
  }
  return symbols
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

async function fetchUserMentions(username: string): Promise<Set<string>> {
  const cacheKey = `${username}:mentions`
  const cached = mentionCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < MENTION_CACHE_TTL) {
    return cached.data
  }

  for (const instance of NITTER_INSTANCES) {
    const tweets = await fetchFromUser(instance, username)
    if (tweets.length > 0) {
      const symbols = extractSymbolsFromTweets(tweets)
      mentionCache.set(cacheKey, { data: symbols, timestamp: Date.now() })
      return symbols
    }
  }

  const empty = new Set<string>()
  mentionCache.set(cacheKey, { data: empty, timestamp: Date.now() })
  return empty
}

export async function fetchAleabitoMentions(): Promise<Set<string>> {
  return fetchUserMentions("aleabitoreddit")
}

export async function fetchAshenbrennerMentions(): Promise<Set<string>> {
  return fetchUserMentions("aschenbrenner")
}

export async function fetchRealSimpleArielMentions(): Promise<Set<string>> {
  return fetchUserMentions("realsimpleariel")
}

export async function fetchStamatoudismMentions(): Promise<Set<string>> {
  return fetchUserMentions("stamatoudism")
}

export async function fetchJfsrevMentions(): Promise<Set<string>> {
  return fetchUserMentions("jfsrev")
}

export async function fetchAsymTradingMentions(): Promise<Set<string>> {
  return fetchUserMentions("asymtrading")
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
