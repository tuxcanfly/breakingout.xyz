import type { ScreenerAsset, MarketRegime, IntelTweet } from "../types.js"
import { fetchTweetsForSymbol } from "./nitter.js"

const DEEPSEEK_URL = "https://api.deepseek.com/chat/completions"
const CACHE_TTL = 60 * 60 * 1000
const insightCache = new Map<string, { text: string; timestamp: number }>()

const fmt = (v: number | undefined, suffix = "") => (v === undefined || Number.isNaN(v) ? "N/A" : `${v}${suffix}`)

function buildPrompt(asset: ScreenerAsset, market: MarketRegime, intel: IntelTweet[], tweets: string[]): string {
  const maStatus = [asset.ma10, asset.ma20, asset.ma50, asset.ma200]
    .map((m, i) => `${[10, 20, 50, 200][i]}: ${m === "up" ? "above" : "below"}`)
    .join(", ")

  const regime = market.spyRegime
    ? `SPY ${market.spyRegime}${market.spyVsEma140 !== undefined ? ` (${market.spyVsEma140}% vs 140EMA)` : ""}`
    : "unknown"

  // Tracked-account posts are curated, higher-signal than the open search.
  const intelBlock = intel.length
    ? `\nTracked analyst posts mentioning it:\n${intel
        .map((t, i) => `${i + 1}. @${t.authorHandle} (${t.date.slice(0, 10)}): ${t.text.slice(0, 220)}`)
        .join("\n")}`
    : ""
  const tweetBlock = tweets.length
    ? `\nOther recent social chatter:\n${tweets.map((t, i) => `${i + 1}. ${t}`).join("\n")}`
    : ""

  return `You are a concise momentum/breakout technical analyst. Analyze ${asset.symbol} (${asset.name}) in 2-3 tight sentences.

Data:
- Category: ${asset.category} · Sector: ${asset.sector}${asset.subsector ? ` / ${asset.subsector}` : ""}
- Price: ${fmt(asset.price)} · 24h: ${fmt(asset.change24h, "%")}
- Returns 1M/3M/6M/1Y: ${asset.pct1M}% / ${asset.pct3M}% / ${asset.pct6M}% / ${asset.pct1Y}%
- MAs: ${maStatus} · Trend state: ${asset.trendState ?? "N/A"}
- ADR: ${asset.adrPercent}% · RSI: ${fmt(asset.rsi)} · ATR ext vs 50SMA: ${fmt(asset.atrExtension)}
- Dist to 3M high: ${fmt(asset.distToHighPct, "%")} · Coil tightness: ${fmt(asset.coilTightness)} (tight < 4)
- Scores (0-100): Conviction ${fmt(asset.conviction)}, COIL ${fmt(asset.coilScore)}, RS ${fmt(asset.momentumRank)}, Setup ${fmt(asset.setupScore)}, Risk ${fmt(asset.riskScore)}
- Market regime: ${regime}
- Analyst consensus: ${asset.analystRating ? `${asset.analystRating.consensus} (${asset.analystRating.total} analysts)` : "N/A"}
- Tags: ${(asset.tags ?? []).join(", ") || "none"}${intelBlock}${tweetBlock}

State whether the setup favors longs, a wait-for-trigger, or caution, and name the single level/condition that would change that view. Factor in the regime and any tracked-analyst posts. Be direct. No disclaimers. Max 80 words.`
}

export async function generateInsight(asset: ScreenerAsset, market: MarketRegime, intel: IntelTweet[] = []): Promise<string> {
  const cacheKey = `insight:${asset.category}:${asset.symbol}`
  const cached = insightCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.text
  }

  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) {
    return "AI insights are unavailable. Set DEEPSEEK_API_KEY to enable."
  }

  try {
    const tweetRes = await fetchTweetsForSymbol(asset.symbol)
    const topTweets = tweetRes.tweets
      .filter((t) => t.text.length > 10)
      .slice(0, 3)
      .map((t) => `${t.author}: ${t.text.slice(0, 180)}${t.text.length > 180 ? "…" : ""}`)

    const res = await fetch(DEEPSEEK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [{ role: "user", content: buildPrompt(asset, market, intel, topTweets) }],
        max_tokens: 220,
        temperature: 0.4,
      }),
      signal: AbortSignal.timeout(15000),
    })

    if (!res.ok) {
      const err = await res.text().catch(() => "")
      console.error("DeepSeek error:", res.status, err)
      return "Insight temporarily unavailable."
    }

    const data = await res.json() as {
      choices?: Array<{ message?: { content?: string } }>
    }
    const text = data.choices?.[0]?.message?.content?.trim() || "No insight generated."
    insightCache.set(cacheKey, { text, timestamp: Date.now() })
    return text
  } catch (err) {
    console.error("Insight fetch failed:", err instanceof Error ? err.message : String(err))
    return "Insight temporarily unavailable."
  }
}
