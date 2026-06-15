import type { AssetCategory } from "../types.js"
import { SECTOR_MAP } from "./sector-map.js"

interface Classification {
  sector: string
  subsector: string
}

const CRYPTO_SECTORS: Record<string, Classification> = {
  BTC: { sector: "Store of Value", subsector: "Bitcoin" },
  ETH: { sector: "L1", subsector: "Smart Contract Platform" },
  SOL: { sector: "L1", subsector: "High Throughput" },
  XRP: { sector: "Payments", subsector: "Settlement" },
  ADA: { sector: "L1", subsector: "Smart Contract Platform" },
  AVAX: { sector: "L1", subsector: "App Chain" },
  DOT: { sector: "L1", subsector: "Interoperability" },
  LINK: { sector: "Infrastructure", subsector: "Oracle" },
  DOGE: { sector: "Meme", subsector: "Large Cap" },
  SUI: { sector: "L1", subsector: "Move" },
  ARB: { sector: "L2", subsector: "Ethereum Scaling" },
  OP: { sector: "L2", subsector: "Ethereum Scaling" },
  ATOM: { sector: "Infrastructure", subsector: "Interoperability" },
  NEAR: { sector: "L1", subsector: "Smart Contract Platform" },
  APT: { sector: "L1", subsector: "Move" },
  FET: { sector: "AI", subsector: "Agents" },
  INJ: { sector: "DeFi", subsector: "Exchange" },
  SEI: { sector: "L1", subsector: "Trading" },
  TIA: { sector: "Infrastructure", subsector: "Data Availability" },
}

// Name-based fallback classification for symbols not in SECTOR_MAP
function classifyByName(normalizedName: string): Classification | null {
  if (normalizedName.includes("semiconductor")) return { sector: "Information Technology", subsector: "Semiconductors" }
  if (normalizedName.includes("bitcoin") || normalizedName.includes("crypto")) return { sector: "Digital Assets", subsector: "Crypto-Linked Equity" }
  if (normalizedName.includes("treasury") || normalizedName.includes("bond") || normalizedName.includes("income")) return { sector: "Fixed Income", subsector: "Yield ETF" }
  if (normalizedName.includes("gold") || normalizedName.includes("silver") || normalizedName.includes("uranium")) return { sector: "Commodities", subsector: "Commodity ETF" }
  if (normalizedName.includes("oil") || normalizedName.includes("natural gas")) return { sector: "Energy", subsector: "Commodity ETF" }
  if (normalizedName.includes("etf") || normalizedName.includes("index")) return { sector: "Broad Market", subsector: "Equity ETF" }
  if (normalizedName.includes("fund") || normalizedName.includes("trust")) return { sector: "Broad Market", subsector: "Fund" }
  return null
}

export function classifyAsset(symbol: string, category: AssetCategory, name = ""): Classification {
  const s = symbol.toUpperCase()
  const normalizedName = name.toLowerCase()

  // Crypto has its own sector taxonomy
  if (category === "crypto") {
    return CRYPTO_SECTORS[s] || { sector: "Crypto", subsector: "Unclassified" }
  }

  // Check the comprehensive SECTOR_MAP first (covers S&P 500 + ETFs + extras)
  const mapped = SECTOR_MAP[s]
  if (mapped) return { sector: mapped.sector, subsector: mapped.subsector }

  // Commodities use a direct categorization
  if (category === "commodities") {
    if (["GLD", "SLV", "PALL", "PPLT"].includes(s)) return { sector: "Precious Metals", subsector: s }
    if (["USO", "UNG"].includes(s)) return { sector: "Energy", subsector: s }
    if (["CORN", "SOYB", "WEAT", "CANE", "MOO"].includes(s)) return { sector: "Agriculture", subsector: s }
    return { sector: "Commodity Basket", subsector: s }
  }

  // Name-based fallback for unknown symbols
  if (normalizedName) {
    const byName = classifyByName(normalizedName)
    if (byName) return byName
  }

  // Default fallback per category
  if (category === "etfs") return { sector: "Broad Market", subsector: "Equity ETF" }
  if (category === "xstocks") return { sector: "Tokenized Equities", subsector: "Unclassified" }
  return { sector: "Other", subsector: "Unclassified" }
}
