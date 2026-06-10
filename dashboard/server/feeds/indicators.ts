// COIL tightness from the breakout study: MA compression + distance from the
// 20-day SMA, measured in units of the stock's own average daily range.
// Lower = tighter; < 4.0 marks a coiled base (the backtested threshold).
export function coilTightness(close: number, sma10: number, sma20: number, sma50: number, adrPercent: number): number | undefined {
  if (close <= 0 || sma10 <= 0 || sma20 <= 0 || sma50 <= 0 || adrPercent <= 0) return undefined
  const maSpread = (Math.max(sma10, sma20, sma50) - Math.min(sma10, sma20, sma50)) / close
  const maDist = Math.abs(close / sma20 - 1)
  return parseFloat(((maSpread + maDist) / (adrPercent / 100)).toFixed(1))
}
