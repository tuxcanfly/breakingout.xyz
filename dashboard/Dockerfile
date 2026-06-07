FROM node:20-slim

WORKDIR /app

# Chromium deps for Puppeteer
RUN apt-get update && apt-get install -y \
  chromium \
  libnss3 libnspr4 libatk-bridge2.0-0 libdrm2 libxkbcommon0 \
  libxcomposite1 libxdamage1 libxrandr2 libgbm1 libpango-1.0-0 \
  libcairo2 libasound2 \
  --no-install-recommends \
  && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

COPY package*.json ./
RUN npm install --omit=dev

COPY . .
RUN npm run build

ENV NODE_ENV=production PORT=8080
EXPOSE 8080
CMD ["npm", "start"]
