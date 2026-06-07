# ── Build stage ──────────────────────────────────────────────────────────────
FROM node:20-slim AS builder

WORKDIR /app

# Install chrome deps (needed only for puppeteer during npm install)
RUN apt-get update && apt-get install -y \
  chromium \
  libnss3 libnspr4 libatk-bridge2.0-0 libdrm2 libxkbcommon0 \
  libxcomposite1 libxdamage1 libxrandr2 libgbm1 libpango-1.0-0 \
  libcairo2 libasound2 \
  --no-install-recommends && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

COPY package*.json ./
RUN npm install       # all deps (dev kept for vite build)

COPY . .
RUN npm run build     # vite → dist/

# ── Run stage ────────────────────────────────────────────────────────────────
FROM node:20-slim

WORKDIR /app

# Chrome deps again for runtime puppeteer
RUN apt-get update && apt-get install -y \
  chromium \
  libnss3 libnspr4 libatk-bridge2.0-0 libdrm2 libxkbcommon0 \
  libxcomposite1 libxdamage1 libxrandr2 libgbm1 libpango-1.0-0 \
  libcairo2 libasound2 \
  --no-install-recommends && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    NODE_ENV=production \
    PORT=8080

# Copy built assets + production dependencies
COPY --from=builder /app/dist /app/dist
COPY --from=builder /app/package*.json /app/
COPY --from=builder /app/server /app/server
COPY --from=builder /app/node_modules /app/node_modules

EXPOSE 8080
CMD ["npm", "start"]
