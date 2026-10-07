// Rolling IV snapshots per symbol, so we can report a real IV rank/percentile
// instead of a hardcoded one. CBOE/Deribit only give today's level, so we
// accumulate our own history (persisted to disk, capped, best-effort).
import { mkdirSync, readFileSync, writeFileSync } from "fs"
import path from "path"
import { fileURLToPath } from "url"

const DATA_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../data")
const FILE = path.join(DATA_DIR, "iv-history.json")
const MAX_DAYS = 250

type Store = Record<string, Record<string, number>> // symbol -> YYYY-MM-DD -> IV

let store: Store | null = null
let dirty = false
let timer: NodeJS.Timeout | null = null

function load(): Store {
  if (store) return store
  try {
    store = JSON.parse(readFileSync(FILE, "utf8")) as Store
  } catch {
    store = {}
  }
  return store
}

function scheduleFlush() {
  if (timer) return
  timer = setTimeout(() => {
    timer = null
    if (!dirty || !store) return
    dirty = false
    try {
      mkdirSync(DATA_DIR, { recursive: true })
      writeFileSync(FILE, JSON.stringify(store))
    } catch {
      // Ephemeral FS — losing history only costs the IV rank, never the app.
    }
  }, 5000)
  timer.unref?.()
}

const today = () => new Date().toISOString().slice(0, 10)

// Record today's IV and return its percentile within the stored history.
// Returns null until there's enough history to be meaningful.
export function recordIv(symbol: string, iv: number | null | undefined): number | null {
  if (iv === null || iv === undefined || !Number.isFinite(iv) || iv <= 0) return null
  const s = load()
  const sym = symbol.toUpperCase()
  const series = (s[sym] ??= {})
  series[today()] = +iv.toFixed(2)
  const dates = Object.keys(series).sort()
  if (dates.length > MAX_DAYS) for (const d of dates.slice(0, dates.length - MAX_DAYS)) delete series[d]
  dirty = true
  scheduleFlush()
  return percentileOf(Object.values(series), iv, dates.length)
}

// Percentile of `iv` in `values`; requires a minimum sample to be honest.
function percentileOf(values: number[], iv: number, samples: number): number | null {
  if (samples < 10) return null
  const sorted = [...values].sort((a, b) => a - b)
  const below = sorted.filter((v) => v <= iv).length
  return Math.round((below / sorted.length) * 100)
}

export function ivHistoryDays(symbol: string): number {
  return Object.keys(load()[symbol.toUpperCase()] ?? {}).length
}
