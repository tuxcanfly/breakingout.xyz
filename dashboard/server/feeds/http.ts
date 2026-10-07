// Shared outbound HTTP helpers for the feed modules: browser-like UA (several
// public endpoints 403 without one), timeouts, small TTL cache, concurrency cap.

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

// SEC requires a descriptive UA identifying the tool; a bare/missing UA gets
// 403. A URL counts as contact info. Override with SEC_USER_AGENT.
export const SEC_UA = process.env.SEC_USER_AGENT || "breakingout.xyz https://breakingout.xyz"

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

interface FetchOpts {
  ua?: string
  accept?: string
  timeoutMs?: number
}

async function request(url: string, asJson: boolean, opts: FetchOpts = {}): Promise<unknown> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": opts.ua || UA,
        Accept: opts.accept || (asJson ? "application/json,text/plain,*/*" : "text/html,application/xhtml+xml,*/*"),
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(opts.timeoutMs ?? 15000),
    })
    if (!res.ok) return null
    return asJson ? await res.json() : await res.text()
  } catch {
    return null
  }
}

export function fetchJson<T>(url: string, opts?: FetchOpts): Promise<T | null> {
  return request(url, true, opts) as Promise<T | null>
}

export function fetchText(url: string, opts?: FetchOpts): Promise<string | null> {
  return request(url, false, opts) as Promise<string | null>
}

// Run `fn` over items with a bounded number of in-flight requests.
export async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length)
  let next = 0
  const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    while (true) {
      const i = next++
      if (i >= items.length) return
      out[i] = await fn(items[i], i)
    }
  })
  await Promise.all(workers)
  return out
}

interface Entry<T> { value: T; expires: number }
const stores = new Map<string, Map<string, Entry<unknown>>>()

function store(name: string) {
  let s = stores.get(name)
  if (!s) { s = new Map(); stores.set(name, s) }
  return s
}

// Tiny memoising cache: `cached("earnings", key, ttlMs, () => fetch(...))`.
// Returning null/undefined is never cached, so failures retry next cycle.
export async function cached<T>(name: string, key: string, ttlMs: number, fn: () => Promise<T | null>): Promise<T | null> {
  const s = store(name)
  const hit = s.get(key) as Entry<T> | undefined
  if (hit && hit.expires > Date.now()) return hit.value
  const value = await fn()
  if (value !== null && value !== undefined) s.set(key, { value, expires: Date.now() + ttlMs })
  return value
}
