import type { ScreenerAsset } from "../types"

export interface Preset {
  id: string
  label: string
  title: string
  test: (asset: ScreenerAsset) => boolean
}

export const PRESETS: Preset[] = [
  {
    id: "actionable",
    label: "Actionable",
    title: "Conviction ≥ 70 and risk ≤ 55 — regime-aware top trades",
    test: (a) => (a.conviction ?? 0) >= 70 && (a.riskScore ?? 100) <= 55,
  },
  {
    id: "coil",
    label: "COIL setups",
    title: "Full COIL setup: trigger + tight base + momentum leadership",
    test: (a) => a.tags?.includes("coil") ?? false,
  },
  {
    id: "loaded-spring",
    label: "Loaded spring",
    title: "Tight base near 3M high, MA10 up, hasn't broken out yet",
    test: (a) => a.tags?.includes("loaded-spring") ?? false,
  },
  {
    id: "accelerating",
    label: "Accelerating",
    title: "1M return beating the 3M pace — momentum speeding up",
    test: (a) => a.tags?.includes("accelerating") ?? false,
  },
  {
    id: "quiet-coil",
    label: "Quiet coil",
    title: "Low ADR + near 3M high — volatility contraction before breakout",
    test: (a) => a.tags?.includes("quiet-coil") ?? false,
  },
  {
    id: "regime-aligned",
    label: "Regime-aligned",
    title: "Trend matches the SPY risk-on/off exposure dial",
    test: (a) => a.tags?.includes("regime-aligned") ?? false,
  },
  {
    id: "reversal-watch",
    label: "Reversal watch",
    title: "Weak momentum but MA10 turning up off oversold RSI",
    test: (a) => a.tags?.includes("reversal-watch") ?? false,
  },
  {
    id: "rsi-oversold",
    label: "RSI oversold",
    title: "RSI ≤ 30",
    test: (a) => a.tags?.includes("rsi-oversold") ?? false,
  },
  {
    id: "trending",
    label: "Trending",
    title: "Stocks trending on Yahoo Finance and ApeWisdom",
    test: (a) => a.tags?.includes("trending") ?? false,
  },
  {
    id: "all-ma-up",
    label: "All MA up",
    title: "All 10/20/50/200 SMAs aligned bullish",
    test: (a) => a.tags?.includes("all-ma-up") ?? false,
  },
  {
    id: "momentum-leader",
    label: "Momentum leaders",
    title: "Top 5% blended 1M momentum",
    test: (a) => a.tags?.includes("momentum-leader") ?? false,
  },
  {
    id: "top-setup",
    label: "Top setups",
    title: "Setup score 80+",
    test: (a) => (a.setupScore ?? 0) >= 80,
  },
  {
    id: "tight-base",
    label: "Tight base",
    title: "Consolidation / tight range",
    test: (a) => a.tags?.includes("tight-base") ?? false,
  },
  {
    id: "breakout",
    label: "Breakouts",
    title: "Strong momentum + MA aligned",
    test: (a) => a.tags?.includes("breakout") ?? false,
  },
]
