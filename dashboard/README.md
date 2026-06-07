# breakingout.xyz

Momentum breakout screener bridging [Unusual Breakouts](https://www.unusualbreakouts.com/learn) and [@0xaporia](https://x.com/0xaporia).

Live at **https://breakingout.xyz**

---

## Tech

React 19 + TypeScript + Tailwind CSS v4 (Solarized Light)  
Express + Puppeteer (screener scraper)  
Recharts · Finviz embeds · NAAIM regime filter

## Local dev

```bash
cd dashboard
npm install
npm run dev
```

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
