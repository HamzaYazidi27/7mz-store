# 7MZ Store — Deployment Guide (Railway + Vercel + BotFather)

This walkthrough takes the repo from GitHub to a Mini App running inside your
Telegram. Total hands-on time: **~10 minutes**. Everything that can be
pre-configured already lives in this repo (`railway.json`, `apps/api/Dockerfile`,
env templates).

---

## 0. Prerequisites

- The repo pushed to your GitHub (the build agent does this once GitHub is connected)
- A [Railway](https://railway.app) account (free trial credits are enough to start)
- A [Vercel](https://vercel.com) account (free Hobby plan is enough)
- Telegram on any device

---

## 1. Create the store bot (~2 min, in Telegram)

1. Open **@BotFather** → send `/newbot`
2. **Name:** `7MZ Store`
3. **Username:** something ending in `bot`, e.g. `SevenMZStoreBot`
4. BotFather replies with the **bot token** — keep that chat open;
   you will paste the token **only into Railway's Variables screen** (step 2).
   Never share it anywhere else.

Optional polish, also in BotFather:
- `/setuserpic` — upload a store logo
- `/setdescription` — "Premium digital goods. Instant delivery."

---

## 2. Deploy the API + databases on Railway (~4 min)

1. railway.app → **New Project** → **Deploy from GitHub repo** → pick `7mz-store`
   (authorize GitHub access if asked)
2. Railway detects `railway.json` and builds `apps/api/Dockerfile` automatically
3. In the project canvas click **+ New** → **Database** → **Add PostgreSQL**
4. **+ New** → **Database** → **Add Redis**
5. Open the API service → **Variables** → **Raw editor** → paste
   `apps/api/.env.production.example`, then fill in:
   - `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `ENCRYPTION_KEY` — run
     `openssl rand -hex 32` three times (any terminal, or an online generator you trust)
   - `TELEGRAM_BOT_TOKEN` — from step 1
   - `TELEGRAM_BOT_USERNAME` — e.g. `SevenMZStoreBot`
   - leave `CORS_ORIGINS` / `MINIAPP_URL` for step 3 (you'll know the Vercel URL then)
6. Service → **Settings** → **Networking** → **Generate Domain** → note the URL,
   e.g. `https://7mz-api.up.railway.app`
7. Deploy runs: the `preDeployCommand` applies database migrations automatically.
8. **One-time seed** (demo catalog): service → ⋯ → **Shell** (or `railway shell`):
   ```bash
   cd /repo/apps/api && pnpm db:seed
   ```
9. Verify: open `https://<your-api-domain>/api/v1/health` → `"status":"ok"`.

---

## 3. Deploy the Mini App on Vercel (~3 min)

1. vercel.com → **Add New… → Project** → import the `7mz-store` repo
2. **Root Directory:** `apps/miniapp`  ← important
3. Framework preset: **Next.js** (auto-detected; pnpm workspace handled automatically)
4. **Environment Variables** — from `apps/miniapp/.env.production.example`:
   - `NEXT_PUBLIC_API_URL` = your Railway domain (step 2.6)
   - `NEXT_PUBLIC_DEV_MODE` = `false`
   - `NEXT_PUBLIC_BOT_USERNAME` = your bot username
5. **Deploy** → note your URL, e.g. `https://7mz-store.vercel.app`
6. Back in **Railway Variables**: set
   `CORS_ORIGINS=https://7mz-store.vercel.app` and
   `MINIAPP_URL=https://7mz-store.vercel.app` → redeploy the API service.

---

## 4. Point the bot at the Mini App (~1 min, in BotFather)

1. @BotFather → `/mybots` → your bot → **Bot Settings** → **Menu Button**
   → **Configure Menu Button** → paste your Vercel URL → title: `Open Store`
2. (Recommended) also `/newapp` → select your bot → title `7MZ Store`,
   short name `store`, upload a 640×360 image → paste the same URL.
   This enables the direct link `https://t.me/<YourBot>/store`.

---

## 5. Open it 🎉

Open your bot in Telegram → tap **Open Store**. Real Telegram login (HMAC-verified
initData), your profile picture in the top bar, haptics on every tap.

## Continuous deployment

Every `git push` to `main` now auto-deploys both the API (Railway) and the
Mini App (Vercel). The remaining build milestones (checkout, payments, orders,
admin) appear at your URL as they ship.

## Troubleshooting

| Symptom | Fix |
|---|---|
| "Can't reach the store" in the app | Check `NEXT_PUBLIC_API_URL` on Vercel and API health endpoint |
| Login fails inside Telegram | `TELEGRAM_BOT_TOKEN` missing/wrong on Railway; must be the bot that opens the app |
| CORS errors in devtools | `CORS_ORIGINS` on Railway must exactly match your Vercel origin (https, no trailing slash) |
| Images missing | Product art ships inside the frontend build — hard-refresh; check Vercel build logs |
