import { fetchAllAssets } from "../server/feeds/scraper.js"

const data = await fetchAllAssets()
const symbols = data.crypto.map((a) => a.symbol)
const finvizSupported = [
  "AAVE","ADA","APT","ATOM","AVAX","BCH","BNB","BTC","DOGE","DOT","ETH","HBAR","ICP","LINK","LTC","NEAR","OP","POL","SHIB","SOL","SUI","S","TAO","TON","TRUMP","TRX","UNI","WLFI","XLM","XRP","ZEC",
]
const supported = symbols.filter((s) => finvizSupported.includes(s))
const unsupported = symbols.filter((s) => !finvizSupported.includes(s))
console.log("Total crypto:", symbols.length)
console.log("Finviz supported:", supported.length)
console.log("Unsupported:", unsupported.length)
console.log("Unsupported sample:", unsupported.slice(0, 50))
