import type { AssetCategory } from "../types.js"
import { SECTOR_MAP } from "./sector-map.js"

interface Classification {
  sector: string
  subsector: string
}

const CRYPTO_SECTORS: Record<string, Classification> = {
  // Store of Value
  BTC: { sector: "Store of Value", subsector: "Bitcoin" },
  // L1
  ETH: { sector: "L1", subsector: "Smart Contract Platform" },
  SOL: { sector: "L1", subsector: "High Throughput" },
  ADA: { sector: "L1", subsector: "Smart Contract Platform" },
  AVAX: { sector: "L1", subsector: "App Chain" },
  DOT: { sector: "L1", subsector: "Interoperability" },
  NEAR: { sector: "L1", subsector: "Smart Contract Platform" },
  SUI: { sector: "L1", subsector: "Move" },
  APT: { sector: "L1", subsector: "Move" },
  SEI: { sector: "L1", subsector: "Trading" },
  TRX: { sector: "L1", subsector: "Smart Contract Platform" },
  HBAR: { sector: "L1", subsector: "Hashgraph" },
  ICP: { sector: "L1", subsector: "Smart Contract Platform" },
  ALGO: { sector: "L1", subsector: "Smart Contract Platform" },
  XLM: { sector: "L1", subsector: "Payments" },
  XMR: { sector: "L1", subsector: "Privacy" },
  FLOW: { sector: "L1", subsector: "Smart Contract Platform" },
  EOS: { sector: "L1", subsector: "Smart Contract Platform" },
  KAS: { sector: "L1", subsector: "Proof of Work" },
  TON: { sector: "L1", subsector: "Smart Contract Platform" },
  FTM: { sector: "L1", subsector: "Smart Contract Platform" },
  CELO: { sector: "L1", subsector: "Mobile" },
  KAVA: { sector: "L1", subsector: "DeFi" },
  XTZ: { sector: "L1", subsector: "Smart Contract Platform" },
  NEO: { sector: "L1", subsector: "Smart Contract Platform" },
  VET: { sector: "L1", subsector: "Supply Chain" },
  // L2
  ARB: { sector: "L2", subsector: "Ethereum Scaling" },
  OP: { sector: "L2", subsector: "Ethereum Scaling" },
  METIS: { sector: "L2", subsector: "Ethereum Scaling" },
  MANTA: { sector: "L2", subsector: "Ethereum Scaling" },
  STRK: { sector: "L2", subsector: "Ethereum Scaling" },
  ZRO: { sector: "L2", subsector: "Interoperability" },
  IMX: { sector: "L2", subsector: "Gaming" },
  MNT: { sector: "L2", subsector: "Ethereum Scaling" },
  MATIC: { sector: "L2", subsector: "Ethereum Scaling" },
  POL: { sector: "L2", subsector: "Ethereum Scaling" },
  // Infrastructure
  LINK: { sector: "Infrastructure", subsector: "Oracle" },
  ATOM: { sector: "Infrastructure", subsector: "Interoperability" },
  TIA: { sector: "Infrastructure", subsector: "Data Availability" },
  GRT: { sector: "Infrastructure", subsector: "Indexing" },
  THETA: { sector: "Infrastructure", subsector: "Streaming" },
  ANKR: { sector: "Infrastructure", subsector: "Node Infrastructure" },
  AR: { sector: "Infrastructure", subsector: "Storage" },
  FIL: { sector: "Infrastructure", subsector: "Storage" },
  PYTH: { sector: "Infrastructure", subsector: "Oracle" },
  ONDO: { sector: "Infrastructure", subsector: "RWA" },
  STX: { sector: "Infrastructure", subsector: "Bitcoin L2" },
  LPT: { sector: "Infrastructure", subsector: "Streaming" },
  // DeFi
  UNI: { sector: "DeFi", subsector: "DEX" },
  AAVE: { sector: "DeFi", subsector: "Lending" },
  MKR: { sector: "DeFi", subsector: "Stablecoin" },
  LDO: { sector: "DeFi", subsector: "Liquid Staking" },
  SNX: { sector: "DeFi", subsector: "Synthetics" },
  CRV: { sector: "DeFi", subsector: "DEX" },
  COMP: { sector: "DeFi", subsector: "Lending" },
  DYDX: { sector: "DeFi", subsector: "Perpetuals" },
  PENDLE: { sector: "DeFi", subsector: "Yield" },
  INJ: { sector: "DeFi", subsector: "Exchange" },
  JUP: { sector: "DeFi", subsector: "DEX Aggregator" },
  JTO: { sector: "DeFi", subsector: "Liquid Staking" },
  GMX: { sector: "DeFi", subsector: "Perpetuals" },
  CAKE: { sector: "DeFi", subsector: "DEX" },
  "1INCH": { sector: "DeFi", subsector: "DEX Aggregator" },
  BAL: { sector: "DeFi", subsector: "DEX" },
  SUSHI: { sector: "DeFi", subsector: "DEX" },
  YFI: { sector: "DeFi", subsector: "Yield" },
  LRC: { sector: "DeFi", subsector: "DEX" },
  RAY: { sector: "DeFi", subsector: "DEX" },
  AERO: { sector: "DeFi", subsector: "DEX" },
  ENA: { sector: "DeFi", subsector: "Stablecoin" },
  ETHFI: { sector: "DeFi", subsector: "Liquid Staking" },
  EIGEN: { sector: "DeFi", subsector: "Restaking" },
  RPL: { sector: "DeFi", subsector: "Liquid Staking" },
  // Payments
  XRP: { sector: "Payments", subsector: "Settlement" },
  BCH: { sector: "Payments", subsector: "Digital Cash" },
  LTC: { sector: "Payments", subsector: "Digital Cash" },
  ZEC: { sector: "Payments", subsector: "Privacy" },
  DASH: { sector: "Payments", subsector: "Digital Cash" },
  // Meme
  DOGE: { sector: "Meme", subsector: "Large Cap" },
  SHIB: { sector: "Meme", subsector: "Large Cap" },
  PEPE: { sector: "Meme", subsector: "Large Cap" },
  WIF: { sector: "Meme", subsector: "Mid Cap" },
  BONK: { sector: "Meme", subsector: "Mid Cap" },
  FLOKI: { sector: "Meme", subsector: "Mid Cap" },
  POPCAT: { sector: "Meme", subsector: "Small Cap" },
  MEME: { sector: "Meme", subsector: "Small Cap" },
  TURBO: { sector: "Meme", subsector: "Small Cap" },
  BABYDOGE: { sector: "Meme", subsector: "Small Cap" },
  NEIRO: { sector: "Meme", subsector: "Small Cap" },
  // AI
  FET: { sector: "AI", subsector: "Agents" },
  TAO: { sector: "AI", subsector: "Compute" },
  ARKM: { sector: "AI", subsector: "Data" },
  WLD: { sector: "AI", subsector: "Identity" },
  RENDER: { sector: "AI", subsector: "Compute" },
  RNDR: { sector: "AI", subsector: "Compute" },
  IO: { sector: "AI", subsector: "Compute" },
  AKT: { sector: "AI", subsector: "Compute" },
  OCEAN: { sector: "AI", subsector: "Data" },
  AGIX: { sector: "AI", subsector: "Agents" },
  // Gaming / Metaverse
  SAND: { sector: "Gaming", subsector: "Metaverse" },
  MANA: { sector: "Gaming", subsector: "Metaverse" },
  AXS: { sector: "Gaming", subsector: "Play to Earn" },
  GALA: { sector: "Gaming", subsector: "Platform" },
  CHZ: { sector: "Gaming", subsector: "Fan Token" },
  ENJ: { sector: "Gaming", subsector: "Infrastructure" },
  // Exchange Tokens
  BNB: { sector: "Exchange", subsector: "Token" },
  // Other majors
  ETC: { sector: "L1", subsector: "Smart Contract Platform" },
  QNT: { sector: "Infrastructure", subsector: "Interoperability" },
  WAVES: { sector: "L1", subsector: "Smart Contract Platform" },
  MOVE: { sector: "L1", subsector: "Move" },
  KAITO: { sector: "AI", subsector: "Data" },
  OM: { sector: "DeFi", subsector: "RWA" },
  TRUMP: { sector: "Meme", subsector: "Political" },
  IP: { sector: "Infrastructure", subsector: "IP" },
  PI: { sector: "L1", subsector: "Mobile" },
  BERA: { sector: "L1", subsector: "Smart Contract Platform" },
}

// Name-based fallback classification for symbols not in SECTOR_MAP
function classifyByName(normalizedName: string): Classification | null {
  // Digital Assets / Crypto-linked — check first; names like
  // "Marathon Digital" or "Riot Blockchain" are crypto plays, not tech.
  if (normalizedName.includes("bitcoin") || normalizedName.includes("crypto") || normalizedName.includes("blockchain") || normalizedName.includes("digital asset")) return { sector: "Digital Assets", subsector: "Crypto-Linked Equity" }
  if (normalizedName.includes("mining") && (normalizedName.includes("bitcoin") || normalizedName.includes("crypto") || normalizedName.includes("digital"))) return { sector: "Digital Assets", subsector: "Crypto-Linked Equity" }
  // Tech
  if (normalizedName.includes("semiconductor") || normalizedName.includes("microchip") || normalizedName.includes("silicon") || normalizedName.includes("photonics") || normalizedName.includes("laser") || normalizedName.includes("optoelectronic") || normalizedName.includes("wafer")) return { sector: "Information Technology", subsector: "Semiconductors" }
  if (normalizedName.includes("software") || normalizedName.includes("technologies") || normalizedName.includes("technology") || normalizedName.includes("cloud") || normalizedName.includes("cyber") || normalizedName.includes("saas")) return { sector: "Information Technology", subsector: "Application Software" }
  if (normalizedName.includes("network") || normalizedName.includes("telecom") || normalizedName.includes("communication") || normalizedName.includes("5g")) return { sector: "Information Technology", subsector: "Communications Equipment" }
  if (normalizedName.includes("data") || normalizedName.includes("analytics") || normalizedName.includes("database")) return { sector: "Information Technology", subsector: "IT Consulting & Other Services" }
  if (normalizedName.includes("computer") || normalizedName.includes("hardware") || normalizedName.includes("electronics") || normalizedName.includes("server")) return { sector: "Information Technology", subsector: "Technology Hardware, Storage & Peripherals" }
  if (normalizedName.includes("tech") || normalizedName.includes("digital") || normalizedName.includes("internet") || normalizedName.includes("online")) return { sector: "Information Technology", subsector: "Internet Services & Infrastructure" }
  if (normalizedName.includes("quantum") || normalizedName.includes("computing") || normalizedName.includes("artificial") || normalizedName.includes("robot") || normalizedName.includes("drone") || normalizedName.includes("automation")) return { sector: "Information Technology", subsector: "Application Software" }
  // Healthcare
  if (normalizedName.includes("pharma") || normalizedName.includes("biotherapeutics") || normalizedName.includes("therapeutics") || normalizedName.includes("biotech") || normalizedName.includes("bioscience") || normalizedName.includes("biopharma") || normalizedName.includes("immuno")) return { sector: "Health Care", subsector: "Biotechnology" }
  if (normalizedName.includes("health") || normalizedName.includes("medical") || normalizedName.includes("diagnostic") || normalizedName.includes("surgical") || normalizedName.includes("clinical") || normalizedName.includes("patient")) return { sector: "Health Care", subsector: "Health Care Equipment & Supplies" }
  // Financials
  if (normalizedName.includes("bank") || normalizedName.includes("bancorp")) return { sector: "Financials", subsector: "Diversified Banks" }
  if (normalizedName.includes("capital") || normalizedName.includes("financial") || normalizedName.includes("finance")) return { sector: "Financials", subsector: "Asset Management & Custody Banks" }
  if (normalizedName.includes("insurance") || normalizedName.includes("annuity")) return { sector: "Financials", subsector: "Insurance" }
  if (normalizedName.includes("invest") || normalizedName.includes("holdings")) return { sector: "Financials", subsector: "Asset Management & Custody Banks" }
  // Energy
  if (normalizedName.includes("oil") || normalizedName.includes("natural gas") || normalizedName.includes("petroleum") || normalizedName.includes("pipeline") || normalizedName.includes("midstream")) return { sector: "Energy", subsector: "Oil & Gas Exploration & Production" }
  if (normalizedName.includes("energy") || normalizedName.includes("power") || normalizedName.includes("renewable") || normalizedName.includes("solar") || normalizedName.includes("wind") || normalizedName.includes("utility") || normalizedName.includes("electric")) return { sector: "Energy", subsector: "Renewable Electricity" }
  // Materials
  if (normalizedName.includes("mining") || normalizedName.includes("minerals") || normalizedName.includes("metals") || normalizedName.includes("steel") || normalizedName.includes("copper") || normalizedName.includes("lithium") || normalizedName.includes("rare earth")) return { sector: "Materials", subsector: "Diversified Metals & Mining" }
  if (normalizedName.includes("chemical") || normalizedName.includes("material")) return { sector: "Materials", subsector: "Specialty Chemicals" }
  // Real Estate
  if (normalizedName.includes("real estate") || normalizedName.includes("reit") || normalizedName.includes("property")) return { sector: "Real Estate", subsector: "Other Specialized REITs" }
  // Consumer
  if (normalizedName.includes("retail") || normalizedName.includes("restaurant") || normalizedName.includes("coffee") || normalizedName.includes("stores") || normalizedName.includes("apparel") || normalizedName.includes("auto") || normalizedName.includes("vehicle") || normalizedName.includes("gaming") || normalizedName.includes("entertainment") || normalizedName.includes("hotel") || normalizedName.includes("travel") || normalizedName.includes("leisure") || normalizedName.includes("casino")) return { sector: "Consumer Discretionary", subsector: "Other Specialty Retail" }
  if (normalizedName.includes("consumer") || normalizedName.includes("food") || normalizedName.includes("beverage") || normalizedName.includes("household") || normalizedName.includes("personal care")) return { sector: "Consumer Staples", subsector: "Household Products" }
  // Crypto / blockchain-related names that don't include "bitcoin" explicitly
  if (
    normalizedName.includes("coin") ||
    normalizedName.includes("token") ||
    normalizedName.includes("chain") ||
    normalizedName.includes("defi") ||
    normalizedName.includes("stake") ||
    normalizedName.includes("swap") ||
    normalizedName.includes("crypto")
  ) return { sector: "Digital Assets", subsector: "Crypto-Linked Equity" }
  // Catch-all tech / software / digital names
  if (
    normalizedName.includes("app") ||
    normalizedName.includes("platform") ||
    normalizedName.includes("software") ||
    normalizedName.includes("technology") ||
    normalizedName.includes("tech") ||
    normalizedName.includes("digital") ||
    normalizedName.includes("ai") ||
    normalizedName.includes("artificial intelligence") ||
    normalizedName.includes("data") ||
    normalizedName.includes("cloud") ||
    normalizedName.includes("cyber") ||
    normalizedName.includes("internet") ||
    normalizedName.includes("online") ||
    normalizedName.includes("saas")
  ) return { sector: "Information Technology", subsector: "Application Software" }
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
  if (category === "stocks" && normalizedName.toLowerCase().includes("xstock")) {
    return { sector: "Tokenized Equities", subsector: "Unclassified" }
  }
  return { sector: "Other", subsector: "Unclassified" }
}
