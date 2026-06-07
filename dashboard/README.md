# breakingout.xyz

A momentum breakout screener bridging [Unusual Breakouts](https://www.unusualbreakouts.com/learn) research and [@0xaporia](https://x.com/0xaporia) insights.

Live at **https://breakingout.xyz**

---

## What it does

- **Screener**: 200+ assets (stocks, crypto, ETFs, commodities) ranked by momentum, ADR, and MA alignment
- **Tags**: Per-asset signal tags — `naaim-optimal`, `aleabitoreddit`, `momentum-leader`, `breakout`, `stage2`, `tight-base`
- **Charts**: Hover any symbol for a live Finviz chart popup; click footer links for Yahoo Finance / Finviz
- **Regime**: NAAIM exposure gauge updated every 10 minutes

## Data sources

| Source | What |
|--------|------|
| Unusual Breakouts | Stock screener, market regime (SPY MAs), NAAIM |
| CoinGecko | Crypto prices & 30d/1y changes |
| Yahoo Finance | ETF & commodity prices |
| @0xaporia (Nitter) | Curated tweets on risk, momentum psychology, liquidity |

## Tech stack

- React 19 + TypeScript + Tailwind CSS v4 (Solarized Light)
- Express + Puppeteer (server-side scraping)
- Recharts (momentum bar chart)
- Finviz embeds (chart popups)

## Local dev

```bash
cd dashboard
npm install
npm run dev        # client + server
```

## Deploy

```bash
git push origin main
railway up
```

Custom domain: `breakingout.xyz` → Railway CNAME
