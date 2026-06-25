import { useState, useCallback, useEffect } from "react"

const STORAGE_KEY = "breakingout_starred_symbols"

function loadStarred(): Set<string> {
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

function saveStarred(symbols: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...symbols]))
  } catch {
    // ignore storage errors
  }
}

/**
 * Tracks user-starred tickers persisted in localStorage.
 * Returns the current starred Set and a toggle function.
 */
export function useStarredSymbols(): [Set<string>, (symbol: string) => void] {
  const [starred, setStarred] = useState<Set<string>>(() => loadStarred())

  useEffect(() => {
    saveStarred(starred)
  }, [starred])

  const toggle = useCallback((symbol: string) => {
    setStarred((prev) => {
      const next = new Set(prev)
      if (next.has(symbol)) next.delete(symbol)
      else next.add(symbol)
      return next
    })
  }, [])

  return [starred, toggle]
}
