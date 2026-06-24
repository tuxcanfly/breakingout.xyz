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
