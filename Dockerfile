# --- Build SPA (Vite is a devDependency) ---
FROM node:20-bookworm-slim AS web-build
WORKDIR /app/web
COPY web/package.json web/package-lock.json* ./
RUN npm ci
COPY web/ ./
# Vite resolves ../../config from web/src (repo root config/)
COPY config /app/config
RUN npm run build

# --- API + Puppeteer (system Chromium) ---
FROM node:20-bookworm-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        chromium \
        ca-certificates \
        fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV NODE_ENV=production

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

COPY server ./server
COPY scraper ./scraper
# Required at runtime: scraper/constants.js reads config/businessUnits.json for BU validation + badges
COPY config ./config
COPY --from=web-build /app/web/dist ./web/dist

EXPOSE 3001

CMD ["node", "server/index.js"]
