# breakingout.xyz

Momentum breakout screener bridging [Unusual Breakouts](https://www.unusualbreakouts.com/learn) and [@0xaporia](https://x.com/0xaporia).

Live at **https://breakingout.xyz**

---

## Tech

React 19 + TypeScript + Tailwind CSS v4 (Solarized Light)  
Express + Puppeteer (screener scraper)  
Recharts · Finviz embeds · NAAIM regime filter

## Data sources

All free, no API key required.

| Source | Used for |
| --- | --- |
| TradingView scanner | Quotes, moving averages, RSI, volume |
| Yahoo Finance | Fallback quotes, EU listings, trending |
| ApeWisdom | Retail trending tickers |
| Nitter (public instances) | Tracked X accounts → Intel feed. Override with `NITTER_INSTANCES` |
| Cboe delayed quotes | Equity/ETF option chains — IV, greeks, volume, open interest |
| Deribit public API | BTC/ETH options (the only free crypto options feed) |
| Nasdaq | Per-symbol earnings dates |
| SEC EDGAR | Filings: 8-K, 13D/G stakes, 425 mergers, Form 4. Set `SEC_USER_AGENT` to a descriptive string including a contact URL/email |
| Google News RSS | Headlines (catalyst confirmation only) |
| ClinicalTrials.gov | Trial milestones for biotech |

Optional environment variables: `DEEPSEEK_API_KEY` (AI insight), `FINNHUB_API_KEY`
(analyst ratings), `NAAIM_VALUE` / `NAAIM_DATE` (NAAIM exposure — now
subscription-only, so it is hidden unless set), `SEC_USER_AGENT`,
`NITTER_INSTANCES`, `DISABLE_REFRESH=1` to stop the 15-minute server refresh.

## Local dev

```bash
cd dashboard
npm install
npm run dev
```

## Production with PM2

```bash
cd dashboard
npm install
npm run build
npm run pm2:start
```

Other PM2 commands:

```bash
npm run pm2:restart   # restart the process
npm run pm2:stop      # stop the process
npm run pm2:logs      # tail logs
npm run pm2:delete    # remove from pm2
```

Logs are written to `dashboard/logs/`.

## Deploy to Fly.io


```bash
# Install Fly CLI
curl -fsSL https://fly.io/install.sh | sh

# Login
fly auth login

# Launch (first time)
fly launch --no-deploy

# Deploy
fly deploy

# Add domain
fly certs add breakingout.xyz
```

Then set a CNAME at your registrar pointing to `breakingout.fly.dev`.
