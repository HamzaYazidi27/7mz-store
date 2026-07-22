# 7MZ Store — Go-Live Plan (connect to real Telegram)

> Status: awaiting approval · Inserted into the master build plan on 2026-07-21

## Why deployment is required now

A Telegram Mini App is loaded by Telegram clients from a **public HTTPS URL**. The build
sandbox cannot serve one — it accepts no inbound traffic and its processes stop between
work sessions. "Use it normally from Telegram" therefore means deploying the app to real
hosting now (this was always the final milestone; it moves forward).

## Recommended architecture (free-tier friendly)

| Piece | Host | Why |
|---|---|---|
| Mini App (Next.js) | **Vercel** | First-class Next.js hosting, instant HTTPS, deploys on every git push |
| API (NestJS) + PostgreSQL + Redis | **Railway** | One project runs all three from the GitHub repo, built-in Postgres/Redis plugins |
| Code | **GitHub** | Single source of truth; both hosts auto-deploy from it (you chose GitHub delivery anyway) |

Alternative: if you have a **VPS**, I ship Docker Compose + Nginx and we deploy everything there instead.

## Steps

1. **Push the monorepo to your GitHub** — needs either your GitHub connected to this
   platform or a fine-grained personal access token added as a credential (never pasted in chat).
2. **Production configs (I build):** API Dockerfile, Railway service config, Vercel project
   settings, production env templates, strict CORS locked to your Vercel domain.
3. **You create the store bot** with @BotFather (guided, ~2 minutes): `/newbot` → name it
   (e.g. `7MZ Store`, username like `SevenMZStoreBot`). **The token goes only into the
   Railway dashboard env var — never into this chat.**
4. **Deploy API on Railway:** import the repo, add Postgres + Redis plugins, set env vars
   from my template (JWT secrets, ENCRYPTION_KEY, TELEGRAM_BOT_TOKEN, `AUTH_DEV_BYPASS=false`),
   run migrations + seed.
5. **Deploy Mini App on Vercel:** import the same repo (`apps/miniapp`),
   set `NEXT_PUBLIC_API_URL` to the Railway API URL, `NEXT_PUBLIC_DEV_MODE=false`.
6. **Register with BotFather:** set the bot's Menu Button / Mini App URL to the Vercel
   domain, then open the bot in your Telegram → the store opens natively, real initData
   HMAC login, haptics and all.
7. **Verify end-to-end** from your Telegram and lock in.

## What works on day one vs. later

- **Day one after go-live:** open from Telegram, real login, browse home/categories/search,
  product pages, notifications — everything built so far, at the real URL.
- **Ships with the next milestones to the same URL:** checkout & payments (Stars, crypto,
  cards), orders with instant delivery, wallet, referrals, missions, admin panel.
  Every future `git push` auto-deploys.

## What I need from you

1. **Hosting choice:** Vercel + Railway (recommended) — or your own VPS — or another host you prefer.
2. **GitHub:** the account/org name to create the repo under (and whether your GitHub is
   connected to this platform, or you'll add a token).
3. **Bot:** do you already have a bot from @BotFather, or should I include the 2-minute
   creation walkthrough at the start?
