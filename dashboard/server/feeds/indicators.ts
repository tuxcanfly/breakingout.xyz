import type { ScreenerAsset, MarketRegime } from "../types.js"

// COIL tightness from the breakout study: MA compression + distance from the
// 20-day SMA, measured in units of the stock's own average daily range.
// Lower = tighter; < 4.0 marks a coiled base (the backtested threshold).
export function coilTightness(close: number, sma10: number, sma20: number, sma50: number, adrPercent: number): number | undefined {
  if (close <= 0 || sma10 <= 0 || sma20 <= 0 || sma50 <= 0 || adrPercent <= 0) return undefined
  const maSpread = (Math.max(sma10, sma20, sma50) - Math.min(sma10, sma20, sma50)) / close
  const maDist = Math.abs(close / sma20 - 1)
  return parseFloat(((maSpread + maDist) / (adrPercent / 100)).toFixed(1))
}

// Wilder's RSI. Standard 14-period. Returns undefined if not enough clean data.
export function computeRsi(closes: number[], period = 14): number | undefined {
  if (closes.length < period + 1) return undefined
  const slice = closes.slice(-(period + 1))
  let gains = 0
  let losses = 0
  for (let i = 1; i < slice.length; i++) {
    const diff = slice[i] - slice[i - 1]
    if (diff >= 0) gains += diff
    else losses -= diff
  }
  // Seed with simple averages; with only period+1 samples this is effectively
  // the classic first-step RSI. Good enough for tagging.
  const avgGain = gains / period
  const avgLoss = losses / period
  if (avgLoss === 0) return 100
  const rs = avgGain / avgLoss
  return parseFloat((100 - 100 / (1 + rs)).toFixed(0))
}

// ── Unusual / hidden-signal predicates ─────────────────────────────────────
// Each flags a condition that often precedes a move but isn't captured by the
// headline COIL/RS scores. Kept deliberately distinct so they surface as
// independent, explainable tags.

// Loaded spring: tight base + within ~5% of the 3M high + MA10 up, but the
// breakout hasn't fired yet (modest 1M return). A coiled name that hasn't run.
export function isLoadedSpring(a: ScreenerAsset): boolean {
  if (a.distToHighPct === undefined || a.coilTightness === undefined) return false
  return (
    a.coilTightness < 4 &&
    a.distToHighPct >= -5 &&
    a.ma10 === "up" &&
    a.pct1M < 12
  )
}

// Accelerating: 1M return is growing faster than the 3M average pace —
// momentum is speeding up, not just elevated. Filters out steady grinders.
export function isAccelerating(a: ScreenerAsset): boolean {
  if (a.pct1M <= 0 || a.pct3M <= 0) return false
  const monthly3MPace = a.pct3M / 3
  return monthly3MPace > 0 && a.pct1M > monthly3MPace * 1.5
}

// Quiet coil: ADR in the bottom quartile of the category AND sitting within
// 3% of the 3M high. The "calm before the breakout" — volatility contraction
// at the top of a range. Pool must be the asset's category peers.
export function isQuietCoil(a: ScreenerAsset, categoryAdrP25: number): boolean {
  if (a.distToHighPct === undefined) return false
  return a.adrPercent <= categoryAdrP25 && a.distToHighPct >= -3
}

// Regime-aligned: trend direction matches the SPY exposure dial. Long names in
// risk-on, defensive posture in risk-off. Flags assets likely to get macro
// tailwind (or, in risk-off, the few that still belong on the radar).
export function isRegimeAligned(a: ScreenerAsset, market: MarketRegime): boolean {
  const riskOn = (market.spyRegime ?? "risk-on") === "risk-on"
  const allMaUp = a.ma10 === "up" && a.ma20 === "up" && a.ma50 === "up" && a.ma200 === "up"
  if (riskOn) return allMaUp
  // In risk-off, alignment means defensive: still own the uptrend but small.
  return a.trendState === "uptrend" && (a.riskScore ?? 100) < 45
}

// Reversal watch: bottom-decile momentum but MA10 just turned up and RSI is
// sub-40 — possible early reversal off an oversold wash-out. Speculative.
export function isReversalWatch(a: ScreenerAsset): boolean {
  if ((a.momentumRank ?? 50) > 15) return false
  if (a.ma10 !== "up") return false
  return a.rsi !== undefined && a.rsi < 40
}

// ATR extension: distance from the 50 SMA measured in average daily range units.
// Jeff Sun's 50 SMA ATR extension heuristic, backtested by Trading Time Machine
// on Nasdaq 100 data, flags when price has moved into statistically stretched
// territory relative to its recent volatility. Positive = above the SMA.
export function atrExtensionState(a: ScreenerAsset): "extended-up" | "extended-down" | null {
  if (a.atrExtension === undefined) return null
  if (a.atrExtension >= 2.5) return "extended-up"
  if (a.atrExtension <= -2.5) return "extended-down"
  return null
}
