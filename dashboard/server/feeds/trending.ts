export interface TrendingStock {
  symbol: string
  source: "apewisdom" | "yahoo"
  mentions?: number
  name?: string
}

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

const VALID_SYMBOL_RE = /^[A-Z]{1,5}(?:\.[A-Z])?$/

function htmlDecode(input: string): string {
  return input
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/")
    .replace(/&nbsp;/g, " ")
}

// ── ApeWisdom: Reddit-driven trending stocks ───────────────────────────────
// Public JSON endpoint. Returns top-mentioned tickers over the last 48h.
// We pull the first page (top 100). Pagination appears capped/ignored, so
// 100 is the practical limit.
export async function fetchApeWisdomTrending(limit = 100): Promise<TrendingStock[]> {
  const url = `https://apewisdom.io/api/v1.0/filter/all-stocks/order/mentions/48h`
  const res = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(15000),
  })
  if (!res.ok) {
    throw new Error(`ApeWisdom ${res.status}`)
  }
  const data = (await res.json()) as {
    results?: Array<{ ticker: string; mentions?: number; name?: string }>
  }
  const results = data.results ?? []
  return results
    .slice(0, limit)
    .map((r) => ({
      symbol: r.ticker,
      source: "apewisdom" as const,
      mentions: r.mentions,
      name: r.name ? htmlDecode(r.name) : undefined,
    }))
    .filter((r) => VALID_SYMBOL_RE.test(r.symbol))
}

// ── Yahoo Finance: trending stocks from HTML embed ─────────────────────────
// The raw /v1/finance/trending/US API 429s without a full session, but the
// trending page embeds the payload in a <script type="application/json"> tag.
// We decode HTML entities and extract the symbol list.
export async function fetchYahooTrending(): Promise<TrendingStock[]> {
  const url = "https://finance.yahoo.com/markets/stocks/trending/"
  const res = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.5",
      "Accept-Encoding": "identity",
    },
    signal: AbortSignal.timeout(15000),
  })
  if (!res.ok) {
    throw new Error(`Yahoo trending ${res.status}`)
  }
  const html = await res.text()

  // Find the embedded JSON payload for the trending API call.
  const marker = 'data-url="https://query1.finance.yahoo.com/v1/finance/trending/US'
  const idx = html.indexOf(marker)
  if (idx === -1) {
    throw new Error("Yahoo trending embed not found")
  }
  const start = html.indexOf(">", idx) + 1
  const end = html.indexOf("</script>", start)
  const raw = html.slice(start, end)

  const decoded = htmlDecode(raw)
  const parsed = JSON.parse(decoded) as {
    body?: string
  }
  const body = JSON.parse(parsed.body) as {
    finance?: {
      result?: Array<{
        count?: number
        quotes?: Array<{ symbol?: string }>
      }>
    }
  }
  const quotes = body.finance?.result?.[0]?.quotes ?? []
  return quotes
    .map((q) => q.symbol)
    .filter((s): s is string => !!s)
    .map((symbol) => ({ symbol, source: "yahoo" as const }))
    .filter((r) => VALID_SYMBOL_RE.test(r.symbol))
}

// ── Unified fetch with logging ─────────────────────────────────────────────
export async function fetchTrendingStocks(): Promise<{
  symbols: string[]
  results: TrendingStock[]
  bySource: Record<string, number>
  overlap: number
  errors: string[]
}> {
  const errors: string[] = []
  const results = new Map<string, TrendingStock>()

  let ape: TrendingStock[] = []
  try {
    ape = await fetchApeWisdomTrending(100)
    for (const r of ape) results.set(r.symbol, r)
  } catch (e) {
    errors.push(`apewisdom: ${e instanceof Error ? e.message : String(e)}`)
  }

  let yahoo: TrendingStock[] = []
  try {
    yahoo = await fetchYahooTrending()
    for (const r of yahoo) {
      if (!results.has(r.symbol)) results.set(r.symbol, r)
    }
  } catch (e) {
    errors.push(`yahoo: ${e instanceof Error ? e.message : String(e)}`)
  }

  const apeSet = new Set(ape.map((r) => r.symbol))
  const overlap = yahoo.filter((r) => apeSet.has(r.symbol)).length

  return {
    symbols: [...results.keys()],
    results: [...results.values()],
    bySource: {
      apewisdom: ape.length,
      yahoo: yahoo.length,
      unique: results.size,
    },
    overlap,
    errors,
  }
}
