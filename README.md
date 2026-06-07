# 📈 TradeAcademy

> Your personal 8-week trading course — NSE equity, cryptocurrency, and forex. **Works offline with secure cloud sync.**

TradeAcademy is a complete, self-contained trading-education platform delivered as a **single HTML file**. It teaches a complete beginner how to trade — and then lets them *practice* with professional-grade tools — all in one place, with no installation, no subscription, and no dependency on a server to keep learning.

---

## 📑 Table of Contents

- [📈 TradeAcademy](#-tradeacademy)
  - [📑 Table of Contents](#-table-of-contents)
  - [💡 Why This Project Exists](#-why-this-project-exists)
  - [📦 What It Is](#-what-it-is)
  - [🧩 Which Features It Includes](#-which-features-it-includes)
    - [📚 Learning](#-learning)
    - [🛠️ Practice Tools](#️-practice-tools)
    - [🔐 Platform](#-platform)
  - [🏗️ Architecture](#️-architecture)
  - [🧱 Tech Stack](#-tech-stack)
  - [🚀 Getting Started](#-getting-started)
  - [🔌 Backend Setup (Supabase)](#-backend-setup-supabase)
  - [🔒 Security \& Privacy](#-security--privacy)
  - [⚠️ Known Limitations](#️-known-limitations)
  - [🗺️ Roadmap](#️-roadmap)
  - [⚖️ Disclaimer](#️-disclaimer)

---

## 💡 Why This Project Exists

Most retail traders lose money in their first year — not from lack of information, but from lack of **structured practice and discipline**. Free content is scattered across YouTube and blogs; professional tools (simulators, options analyzers, risk engines) are locked behind expensive broker platforms or paid SaaS.

**TradeAcademy was built to close that gap:**

1. **Motivation** — to give a self-directed learner one structured path from "what is a stock?" to placing risk-managed trades with a written strategy.
2. **The problem it solves** — fragmented learning, no safe place to practice, and no feedback loop. It combines a curriculum, a realistic paper-trading simulator, and analytics into a single coherent journey.
3. **Why single-file & offline-first** — so it works anywhere (a laptop with poor connectivity, a phone, a shared computer) without installs, while still syncing progress to the cloud when a connection is available.

---

## 📦 What It Is

TradeAcademy is a **single-page web application** (one `.html` file, ~628 KB) that runs entirely in the browser. It pairs an **8-week, 56-lesson curriculum** covering Indian equities, crypto, and forex with a suite of **built-in interactive tools** that let learners apply each concept immediately.

It is *not* a live brokerage and places no real orders — it is a risk-free educational environment. Accounts and progress are backed by a cloud database (Supabase) with a full **offline fallback**, so a learner is never locked out by a dropped connection.

---

## 🧩 Which Features It Includes

### 📚 Learning
| Feature | Description |
|---|---|
| **56-Lesson Curriculum** | 8 structured weeks covering foundations, technical analysis, patterns, risk, psychology, and the three markets (NSE equity, crypto, forex). |
| **Skill Levels & Entry Assessment** | A placement quiz sets a starting level (Beginner / Intermediate / Advanced) with automatic promotion as lessons complete. |
| **Roadmap & Dashboard** | Visual progress tracking with scores, streaks, and daily missions. |
| **Psychology Academy** | Dedicated modules on the mental game — fear, greed, FOMO, and discipline. |
| **Searchable Glossary** | 140+ trading terms with inline links from within lessons. |

### 🛠️ Practice Tools
| Tool | Description |
|---|---|
| **Trading Simulator** | Real order types (Market, Limit, Stop-Loss, Bracket), 36 instruments, 4 chart types, swipe-to-confirm orders, and **multi-timeframe analysis** (1m + 15m + 1h with confluence verdicts). |
| **Options Greeks Visualizer** | A Black-Scholes engine showing Delta, Gamma, Theta, Vega & Rho, an interactive payoff diagram, and Greek-vs-spot sensitivity curves. |
| **Monte Carlo Projection** | Runs your edge statistics through thousands of simulated equity paths to reveal probability of profit, drawdowns, and **risk of ruin**. |
| **Backtester, Replay & Scanner** | Test strategies on historical bars, replay markets candle-by-candle, and scan for setups. |
| **Trade Coach & Journal** | Score proposed trades out of 10; log trades with an AI rule-based reviewer that computes win rate, expectancy, and R-multiples. |
| **Risk View & Calculator** | Portfolio risk, sector heat, correlation alerts, and a position-size calculator. |
| **Multi-Jurisdiction Tax Hub** | Tax & compliance guidance across India, USA, UK, and a general profile, with a built-in tax calculator. |

### 🔐 Platform
| Feature | Description |
|---|---|
| **Cloud Accounts** | Sign up with username + email; sign in with **either** username or email. Credentials are bcrypt-hashed by Supabase Auth. |
| **Offline-First Sync** | Full course access with no network; progress is saved locally and **auto-syncs on reconnect**, with a live sync-status badge. |
| **Password Reset** | A secure reset-link email flow (passwords are never emailed — they're hashed). |
| **Auth Gate** | The course is sign-in protected; entry points route through a single gate that remembers the user's intended destination. |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────┐
│            TradeAcademy.html                 │
│  (single file: HTML + CSS + JS, ~628 KB)     │
│                                              │
│   Landing → Auth Gate → Course App           │
│                                              │
│   ┌──────────────┐   ┌────────────────────┐  │
│   │ localStorage  │  │  Supabase (cloud)   │  │
│   │ (offline-first)│◄─►│  Auth + Postgres   │  │
│   └──────────────┘   │  + Row-Level Security│  │
│                       └────────────────────┘  │
└─────────────────────────────────────────────┘
```

- **Offline-first sync**: every change writes to `localStorage` immediately; when signed in and online, it also upserts to Supabase. Offline changes are flagged "dirty" and flushed automatically when connectivity returns.
- **Build-time generation**: the HTML is produced by a Python build script that assembles templates, injects lesson data, and applies a color-rebrand transformation pass.

---

## 🧱 Tech Stack

- **Frontend**: Vanilla HTML, CSS, and JavaScript (no framework) — keeps it dependency-free and single-file.
- **Charts/Graphics**: Hand-rolled SVG rendering for candlesticks, payoff diagrams, and Monte Carlo curves.
- **Backend**: [Supabase](https://supabase.com) — Postgres database, Auth (bcrypt), and Row-Level Security.
- **Build**: Python build script (`build_pro.py`) generating the final `.html`.
- **Persistence**: `localStorage` (offline) mirrored to Supabase tables (`profiles`, `progress`, `trades`, `lesson_completions`).

---

## 🚀 Getting Started

1. **Download** `TradeAcademy.html`.
2. **Open** it in any modern browser (Chrome, Edge, Firefox, Safari) — desktop or mobile. No server or install required.
3. **Sign up** with a username, email, and password (requires internet the first time).
4. **Start learning** — complete lessons, practice in the simulator, and your progress syncs automatically.

> After the first online sign-in on a device, the full course works offline; progress syncs the next time you reconnect.

---

## 🔌 Backend Setup (Supabase)

1. Create a project at [supabase.com](https://supabase.com) and copy your **Project URL** and **anon/public key**.
2. In the **SQL Editor**, run the provided `supabase_schema.sql` to create the four RLS-protected tables and the auto-provisioning trigger.
3. In **Authentication → Email**, disable "Confirm email" so course users can sign in immediately (optional).
4. (Recommended for production) Connect a custom **SMTP** provider so password-reset emails deliver reliably.

---

## 🔒 Security & Privacy

- Passwords are **never stored in plaintext** — Supabase Auth hashes them with bcrypt; the local fallback uses PBKDF2-SHA-256.
- **Row-Level Security** ensures each user can only read or write their own data.
- The anon key shipped in the client is safe to expose by design — RLS enforces access at the database layer.
- No real money, no real brokerage connection — it is a purely educational simulator.

---

## ⚠️ Known Limitations

- A **brand-new account must be created while online** once (Supabase needs to register and hash the credential); afterward the device works offline.
- **Sign-in by username on a new device** requires the local username↔email map; on a fresh device, use your email.
- Supabase's built-in email sender is rate-limited and may land in spam — custom SMTP is recommended for production.
- The simulator uses **synthetic price data** for education; it is not live market data.

---

## 🗺️ Roadmap

- Custom SMTP for reliable transactional email
- Optional trader-certification badge on curriculum completion
- Server-side edge analytics from the normalized `trades` table
- Live (read-only) market data feed for the simulator

---

## ⚖️ Disclaimer

TradeAcademy is an **educational tool only** and does not constitute financial, investment, or tax advice. All trading involves risk. The simulator uses synthetic data and places no real orders. Always consult a qualified professional before making financial decisions.

---

*Built as a personal, offline-capable trading-education platform.*
>>>>>>> 0bc7999b2d3cd0280a41d081877daa2534ac07b7
