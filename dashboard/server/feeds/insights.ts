import type { ScreenerAsset } from "../types.js"
import { fetchTweetsForSymbol } from "./nitter.js"

const DEEPSEEK_URL = "https://api.deepseek.com/chat/completions"
const CACHE_TTL = 60 * 60 * 1000
const insightCache = new Map<string, { text: string; timestamp: number }>()

function buildPrompt(asset: ScreenerAsset, tweets: string[]): string {
  const maStatus = [asset.ma10, asset.ma20, asset.ma50, asset.ma200]
    .map((m, i) => `${[10, 20, 50, 200][i]}: ${m === "up" ? "above" : "below"}`)
    .join(", ")

  const tweetBlock = tweets.length
    ? `\nRecent social signals:\n${tweets.map((t, i) => `${i + 1}. ${t}`).join("\n")}`
    : ""

  return `You are a concise technical analyst. Analyze ${asset.symbol} (${asset.name}) in 2-3 tight sentences.

Data:
- Category: ${asset.category}
- Price: ${asset.price ?? "N/A"}
- 24h: ${asset.change24h ?? "N/A"}%
- 1M: ${asset.pct1M}%
- 3M: ${asset.pct3M}%
- 6M: ${asset.pct6M}%
- 1Y: ${asset.pct1Y}%
- MAs: ${maStatus}
- ADR: ${asset.adrPercent}%
- Tight: ${asset.tightness ? "yes" : "no"}
- Tags: ${(asset.tags ?? []).join(", ")}${tweetBlock}

Focus on momentum, trend alignment, and whether the setup favors longs or caution. Factor in any relevant social signals. Be direct and actionable. Max 80 words.`
}

export async function generateInsight(asset: ScreenerAsset): Promise<string> {
  const cacheKey = `insight:${asset.symbol}`
  const cached = insightCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.text
  }

  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) {
    return "AI insights are unavailable. Set DEEPSEEK_API_KEY to enable."
  }

  try {
    // Fetch tweets in parallel with the API call prep
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
        messages: [{ role: "user", content: buildPrompt(asset, topTweets) }],
        max_tokens: 200,
        temperature: 0.5,
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
