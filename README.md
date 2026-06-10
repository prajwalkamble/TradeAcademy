<div align="center">

<h1 align="center">📈 <span style="font-size:2.5em">TradeAcademy</span></h1>

**Offline-first trading-education platform — Indian equities, crypto & forex — shipped as a single static file with a serverless backend.**

[![Live Demo](https://img.shields.io/badge/demo-live-brightgreen)](https://prajwalkamble.github.io/TradeAcademy/)
![Build](https://img.shields.io/badge/build-none%20(zero%20dependencies)-blue)
![Frontend](https://img.shields.io/badge/frontend-HTML%20%7C%20CSS%20%7C%20JS-orange)
![Backend](https://img.shields.io/badge/backend-Supabase%20%2B%20Edge%20Functions-3ecf8e)
![AI](https://img.shields.io/badge/AI-Claude%20%2B%20offline%20fallback-8a2be2)
![License](https://img.shields.io/badge/license-MIT-lightgrey)

[Live demo](https://prajwalkamble.github.io/TradeAcademy/) · [Architecture](#architecture) · [Engineering decisions](#engineering-decisions) · [Deployment](#deployment)

</div>

---

## What it is

TradeAcademy takes a complete beginner from *"what is a stock?"* to executing risk-managed paper trades with a written plan — combining a 56-lesson curriculum, six practice tools, a live crypto data feed, and an AI tutor in one place.

The whole client is a **single `index.html`** (no framework, no build step) that runs **fully offline after first sign-in** and syncs progress to Postgres when online. Premium features degrade gracefully rather than break: the live feed falls back to synthetic data, and the online AI tutor falls back to an offline rule-based engine.

> **Live:** <span target="blank">https://prajwalkamble.github.io/TradeAcademy/</span>

---

## Highlights

- 🧩 **Single-file SPA** — HTML + CSS + vanilla JS, zero dependencies, instant cache, no bundler.
- 📡 **Offline-first sync** — `localStorage` is the source of truth; Postgres is an idempotent sync target with dirty-flag reconciliation on reconnect.
- 📈 **Live crypto feed** — real INR prices (CoinGecko, keyless/CORS) anchor the simulator; `● LIVE`/`● SIM` status badge; automatic synthetic fallback.
- 🤖 **Hybrid AI tutor** — Claude via a Supabase Edge Function (server-side key) with token-by-token streaming; offline rule-based answers over the course content.
- 🔐 **Secret-free client** — only the RLS-scoped anon key ships; the Anthropic key lives server-side; per-user hourly rate limiting caps API spend.
- 🛠️ **Six practice tools** — simulator, options Greeks, Monte Carlo, backtester/replay/scanner, trade journal, multi-jurisdiction tax hub.

---

## Architecture

```
        Browser (GitHub Pages)                 Managed backend (Supabase)
  ┌──────────────────────────────┐        ┌────────────────────────────────────┐
  │          index.html           │        │  Auth (bcrypt) · Postgres · RLS     │
  │  Landing → Auth Gate → Course │        │                                     │
  │                               │        │  Edge Function: ask-tutor           │
  │  localStorage (source of      │ async  │   ├─ rate limit (bump_ai_usage RPC) │
  │  truth) ──── idempotent upsert ───────► │   └─ server-side key → Claude API   │
  └───────────────┬──────────────┘        └────────────────────────────────────┘
                  │ keyless, CORS
                  ▼
        CoinGecko public API (live INR crypto quotes → SIM.prices)
```

**Invariants:** every mutation writes to `localStorage` first; cloud sync is best-effort and idempotent (keyed by user + record id); offline mutations are flagged *dirty* and flushed on reconnect; no client path reaches Claude directly — all AI traffic is proxied through `ask-tutor`, which alone holds the key.

---

## Engineering decisions

| Decision | Why | Trade-off accepted |
|----------|-----|--------------------|
| Single static file, no build | Max reach (shared PCs, low-end phones); instant load; trivial hosting. | Larger single payload; manual code organisation over module tooling. |
| Local-first state, async sync | Learning must never block on the network. | Eventual consistency; conflict policy is last-write-wins per record. |
| Secrets server-side only | A public static site cannot safely hold an API key. | Online AI requires an Edge Function deploy; degrades to offline otherwise. |
| Progressive enhancement | Premium features should degrade, not fail. | Two code paths (live/synthetic, online/offline) to maintain. |
| Per-user rate limit, fail-open | Bound API cost without hard-breaking UX. | A backend outage means the cap isn't enforced during that window. |

---

## Tech stack

**Frontend:** HTML5 · CSS3 (glassmorphism, responsive) · vanilla JS (single file, no build)
**Charts:** hand-rolled SVG/Canvas (candles, payoff diagrams, Monte Carlo curves)
**Backend:** Supabase — Postgres, Auth (bcrypt), Row-Level Security
**Serverless:** Supabase Edge Functions (Deno/TypeScript) — `ask-tutor`
**AI:** Anthropic Claude API (server-side) + offline rule-based fallback
**Market data:** CoinGecko public REST (keyless, CORS, INR)
**Hosting:** GitHub Pages (static) · Supabase (managed backend)

**Data model** (all tables RLS-scoped to `auth.uid() = user_id`): `profiles`, `progress`, `lesson_completions`, `trades` (normalised journal), `ai_tutor_usage` (rate-limit store).

---

## Feature reference

<details>
<summary><strong>Curriculum & learning</strong></summary>

- 56 lessons across 8 weeks (foundations, TA, patterns, risk, psychology; NSE equity, crypto, forex)
- Entry assessment with Beginner/Intermediate/Advanced levels and auto-promotion
- Dashboard, streaks, daily missions; psychology academy; 60+ term searchable glossary
</details>

<details>
<summary><strong>Practice tools</strong></summary>

- **Simulator** — Market/Limit/SL/Bracket orders, 36 instruments, 4 chart types, multi-timeframe (1m+15m+1h) confluence
- **Options Greeks** — Black-Scholes Δ/Γ/Θ/V/ρ, payoff diagram, sensitivity curves
- **Monte Carlo** — equity-path simulation → probability of profit, drawdown, risk of ruin
- **Backtester · Replay · Scanner**, **Trade Coach & Journal** (expectancy, R-multiples), **Risk View & Calculator**, **Multi-jurisdiction Tax Hub** (IN/US/UK)
</details>

<details>
<summary><strong>Platform</strong></summary>

- Cloud accounts (username or email sign-in; bcrypt-hashed)
- Offline-first sync with live status badge
- Live crypto feed; hybrid AI tutor with streaming + rate limiting
- Secure password-reset flow; auth-gated course with destination memory
</details>

---

## Getting started

No install — it's a hosted web app.

1. Open [`prajwalkamble.github.io/TradeAcademy`](https://prajwalkamble.github.io/TradeAcademy/) in any modern browser (desktop or mobile).
2. Create an account (username + email + password) — one online sign-in provisions your cloud profile.
3. Learn, practise in the simulator, and ask the AI tutor; progress saves automatically.
4. After first sign-in on a device, the full course works **offline** and re-syncs on reconnect.

---

## Deployment

**1 — Static site (GitHub Pages)**
```bash
git add . && git commit -m "Deploy TradeAcademy" && git push origin main
# GitHub → Settings → Pages → Source: "Deploy from a branch" → main / root
```
Serves `index.html`. Auth, sync, all tools, the live crypto feed, and the offline AI bot work immediately. The embedded Supabase **anon** key is public by design (RLS-enforced) and safe to commit.

**2 — AI backend (Supabase Edge Function)**
```bash
npm i -g supabase
supabase login
supabase link --project-ref <your-project-ref>
supabase secrets set ANTHROPIC_API_KEY=sk-ant-********   # server-side only
supabase functions deploy ask-tutor
# then run supabase/functions/ask-tutor/ai_tutor_usage.sql in the SQL Editor
```
Rotate the key anytime with `supabase secrets set` — no site redeploy needed. Until deployed, the tutor answers offline.

---

## Security model

- Passwords bcrypt-hashed (Supabase Auth); PBKDF2-SHA-256 for the local fallback — never stored in plaintext.
- Row-Level Security enforces `auth.uid() = user_id` on every table.
- Anon key is safe to ship (grants nothing beyond RLS); the Anthropic key is reachable only by the `ask-tutor` Edge Function.
- Per-user hourly rate limiting + origin-locked CORS protect API spend.
- No brokerage connection and no real orders — a purely educational simulator.

---

## Known limitations

- Account creation needs **one** online sign-in (credential hashing); offline thereafter.
- Username sign-in on a fresh device needs the local username↔email map — use **email** on a new device.
- Supabase's default mailer is rate-limited; custom SMTP recommended for production.
- Live data covers **crypto only**; equity and forex use synthetic data (no free, browser-safe real-time source).

---

## Disclaimer

TradeAcademy is an **educational tool only** and is not financial, investment, or tax advice. All trading carries risk. The simulator uses synthetic and/or delayed data and places no real orders.

---

<div align="center"><sub>Designed and built end-to-end — frontend, data model, serverless backend, and AI integration.</sub></div>

<div align="center"><em>Built as a personal, offline-capable trading-education platform.</em></div>
