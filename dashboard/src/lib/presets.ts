import type { ScreenerAsset } from "../types"

export interface Preset {
  id: string
  label: string
  title: string
  test: (asset: ScreenerAsset) => boolean
}

export const PRESETS: Preset[] = [
  {
    id: "coil",
    label: "COIL setups",
    title: "Full COIL setup: trigger + tight base + momentum leadership",
    test: (a) => a.tags?.includes("coil") ?? false,
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
