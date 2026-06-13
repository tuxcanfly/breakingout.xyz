import { useMemo } from "react"
import type { DashboardData, ScreenerAsset } from "../types"

const STORAGE_KEY = "breakingout_seen_symbols"

function loadSeen(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return new Set(parsed)
  } catch {
    // ignore corrupt storage
  }
  return new Set()
}

function saveSeen(symbols: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...symbols]))
  } catch {
    // ignore storage errors
  }
}

function isNotable(asset: ScreenerAsset): boolean {
  return (
    (asset.tags?.includes("coil") ?? false) ||
    (asset.setupScore ?? 0) >= 80
  )
}

function getAllAssets(data: DashboardData | null): ScreenerAsset[] {
  if (!data) return []
  return [
    ...data.stocks,
    ...data.crypto,
    ...data.etfs,
    ...data.commodities,
  ]
}

/**
 * Tracks which notable (coil or top-setup) assets the user has already seen.
 * Returns a Set of symbol strings that are NEW in the current dashboard data.
 * After computing, stores the current notable symbols so they are no longer
 * flagged as new on the next visit/refresh.
 */
export function useNewSymbols(data: DashboardData | null): Set<string> {
  return useMemo(() => {
    const assets = getAllAssets(data)
    if (assets.length === 0) return new Set()
    const seen = loadSeen()
    const notable = assets.filter(isNotable).map((a) => a.symbol)
    const currentNew = new Set(notable.filter((s) => !seen.has(s)))
    saveSeen(new Set(notable))
    return currentNew
  }, [data])
}
