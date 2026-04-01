# OilFlow Terminal

Bloomberg-style oil market intelligence terminal built with Next.js 15, TradingView Lightweight Charts, and AI-powered analysis.

## Features

- **Multi-benchmark price tracking** — WTI, Brent, OPEC Basket, Dubai/Oman, Urals, and more via EIA API
- **TradingView financial charts** — Interactive line and candlestick charts with zoom, pan, and crosshair
- **Interactive world map** — Oil production choropleth with clickable country details and major hub markers
- **AI-powered news feed** — Telegram channel aggregation with GPT-4o-mini summaries and sentiment analysis
- **AI market briefs** — Daily automated market analysis with outlook and key drivers
- **Analytics dashboard** — Brent-WTI spread, U.S. crude inventories, production rankings
- **Price alerts** — Configurable threshold alerts with Telegram push notifications
- **Terminal aesthetic** — JetBrains Mono, dark theme, Bloomberg-inspired data density

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Database**: Neon Postgres
- **Charts**: TradingView Lightweight Charts
- **Map**: react-simple-maps
- **AI**: OpenAI GPT-4o-mini
- **Auth**: Telegram OIDC
- **Data**: EIA API (free), Hyperliquid (WTI real-time)
- **Styling**: Tailwind CSS v4

## Setup

```bash
cp .env.example .env.local
# Fill in DATABASE_URL, EIA_API_KEY, etc.

npm install
npm run db:init
npm run dev
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Neon Postgres connection string |
| `EIA_API_KEY` | Yes | Free key from eia.gov/opendata |
| `AUTH_SESSION_SECRET` | Yes | Random 32+ char secret |
| `OPENAI_API_KEY` | No | For AI briefs and news summaries |
| `NEXT_PUBLIC_TELEGRAM_CLIENT_ID` | No | Telegram OIDC login |
| `CRON_SECRET` | No | Cron job authorization |
