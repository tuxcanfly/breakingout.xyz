// Probe each Nitter instance for one tracked handle; prints status + item count.
const INSTANCES = ["http://47.250.159.204:8080", "http://188.166.184.52:8080", "http://43.134.90.2:8080", "http://64.83.38.200:8080", "http://161.97.93.244:8080", "http://78.141.221.250:8080", "http://89.221.218.160:8080", "http://172.93.49.117:8080"]
const handle = process.argv[2] || "ChairmansLedger"
for (const inst of INSTANCES) {
  const url = `${inst}/search/rss?f=tweets&q=from%3A${handle}&e-replies=on&e-nativeretweets=on`
  const t0 = Date.now()
  try {
    const res = await fetch(url, { headers: { "User-Agent": "breakingout.xyz/1.0" }, signal: AbortSignal.timeout(8000) })
    const body = await res.text()
    console.log(inst, res.status, `${Date.now() - t0}ms`, "items:", (body.match(/<item>/g) || []).length, body.slice(0, 80).replace(/\s+/g, " "))
  } catch (e) {
    console.log(inst, "ERR", `${Date.now() - t0}ms`, e instanceof Error ? e.message : String(e))
  }
}
