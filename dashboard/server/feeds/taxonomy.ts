import type { AssetCategory } from "../types.js"

interface Classification {
  sector: string
  subsector: string
}

const SEMIS = new Set(["AMD", "AMAT", "ASML", "AVGO", "INTC", "KLAC", "LRCX", "MRVL", "MU", "NVDA", "QCOM", "SMCI", "SOXX", "SMH", "SOXL", "TER", "TSM"])
const SOFTWARE = new Set(["ADBE", "AI", "APP", "BB", "BBAI", "CRM", "CRWD", "DDOG", "DUOL", "HUBS", "IONQ", "IOT", "MDB", "MSFT", "NET", "NOW", "OKTA", "ORCL", "PANW", "PLTR", "QBTS", "QUBT", "RGTI", "SHOP", "SNOW", "SOUN", "TEAM", "U", "ZS"])
const DIGITAL_ASSETS = new Set(["APLD", "BTBT", "BMNR", "CLSK", "COIN", "CORZ", "CRCL", "DFDV", "GLXY", "HOOD", "HUT", "IREN", "MARA", "MSTR", "RIOT", "SBET", "WULF", "HIVE"])
const HEALTHCARE = new Set(["ABBV", "ABT", "AZN", "BMY", "DHR", "GILD", "HIMS", "JNJ", "LLY", "MDT", "MEDP", "MRK", "NVO", "PFE", "TMO", "UNH", "VRTX"])
const FINANCIALS = new Set(["AFRM", "AXP", "BAC", "BLK", "BRK.B", "GS", "JPM", "MA", "MS", "NU", "PYPL", "SCHW", "SOFI", "V", "UPST"])
const ENERGY = new Set(["BWXT", "CCJ", "COP", "CVX", "DNN", "EOG", "LEU", "LNG", "OKLO", "OXY", "SMR", "SLB", "UEC", "XLE", "XOM", "XOP"])
const CONSUMER = new Set(["AMC", "AMZN", "ANF", "COST", "ELF", "GME", "HD", "KO", "MCD", "NKE", "PEP", "PG", "PM", "SBUX", "TGT", "TSLA", "WING", "WMT"])
const COMMUNICATIONS = new Set(["CMCSA", "GOOGL", "META", "NFLX", "RBLX", "TMUS", "WBD"])
const INDUSTRIALS = new Set(["ACN", "ANET", "BA", "ETN", "GE", "GEV", "HON", "LIN", "MOD", "PWR", "UBER", "VRT"])
const DEFENSE_SPACE = new Set(["ACHR", "ASTS", "ITA", "JOBY", "KTOS", "LMT", "LUNR", "NOC", "PL", "RCAT", "RKLB", "RTX", "SPCE"])
const MATERIALS = new Set(["COPX", "GDX", "GLD", "NLR", "PALL", "PPLT", "SLV", "URA", "USAR", "UUUU"])
const BROAD_ETFS = new Set(["DAX", "EEM", "EWG", "EWQ", "EWU", "EWY", "FEZ", "IEMG", "IJR", "IWM", "QQQ", "SCHF", "SPY", "USPX", "VGK", "VOO", "VT", "VTI", "VUG", "VXUS"])
const INCOME_ETFS = new Set(["BND", "FAAA", "FLBL", "HYG", "JAAA", "JPST", "LQD", "SGOV", "SHY", "TBLL", "TLT"])
const COMMODITY_FUNDS = new Set(["BITX", "CPER", "DBC", "GLD", "GDX", "MOO", "PALL", "PPLT", "SLV", "URA", "USO"])

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

export function classifyAsset(symbol: string, category: AssetCategory, name = ""): Classification {
  const s = symbol.toUpperCase()
  const normalizedName = name.toLowerCase()

  if (category === "crypto") {
    return CRYPTO_SECTORS[s] || { sector: "Crypto", subsector: "Other" }
  }

  if (category === "commodities") {
    if (["GLD", "SLV", "PALL", "PPLT"].includes(s)) return { sector: "Precious Metals", subsector: s }
    if (["USO", "UNG"].includes(s)) return { sector: "Energy", subsector: s }
    if (["CORN", "SOYB", "WEAT", "CANE", "MOO"].includes(s)) return { sector: "Agriculture", subsector: s }
    return { sector: "Commodity Basket", subsector: s }
  }

  if (category === "etfs" || category === "xstocks") {
    if (BROAD_ETFS.has(s)) return { sector: "Broad Market", subsector: "Equity ETF" }
    if (INCOME_ETFS.has(s)) return { sector: "Fixed Income", subsector: "Yield ETF" }
    if (COMMODITY_FUNDS.has(s)) return { sector: "Commodities", subsector: "Commodity ETF" }
  }

  if (SEMIS.has(s)) return { sector: "Technology", subsector: "Semiconductors" }
  if (SOFTWARE.has(s)) return { sector: "Technology", subsector: "Software" }
  if (DIGITAL_ASSETS.has(s)) return { sector: "Digital Assets", subsector: "Crypto-Linked Equity" }
  if (HEALTHCARE.has(s)) return { sector: "Healthcare", subsector: "Healthcare" }
  if (FINANCIALS.has(s)) return { sector: "Financials", subsector: "Financial Services" }
  if (ENERGY.has(s)) return { sector: "Energy", subsector: "Oil & Gas" }
  if (CONSUMER.has(s)) return { sector: "Consumer", subsector: "Consumer Products" }
  if (COMMUNICATIONS.has(s)) return { sector: "Communication Services", subsector: "Media & Internet" }
  if (DEFENSE_SPACE.has(s)) return { sector: "Industrials", subsector: "Defense & Space" }
  if (INDUSTRIALS.has(s)) return { sector: "Industrials", subsector: "Industrial Technology" }
  if (MATERIALS.has(s)) return { sector: "Materials", subsector: "Metals & Mining" }

  if (normalizedName.includes("semiconductor")) return { sector: "Technology", subsector: "Semiconductors" }
  if (normalizedName.includes("bitcoin")) return { sector: "Digital Assets", subsector: "Bitcoin Exposure" }
  if (normalizedName.includes("treasury") || normalizedName.includes("income")) return { sector: "Fixed Income", subsector: "Yield ETF" }
  if (normalizedName.includes("gold") || normalizedName.includes("silver") || normalizedName.includes("uranium")) return { sector: "Commodities", subsector: "Commodity ETF" }

  return { sector: category === "xstocks" ? "Tokenized Equities" : "Other", subsector: "Unclassified" }
}
