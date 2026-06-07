# TradeAcademy

Your personal 8-week trading course — NSE equity, cryptocurrency, and forex.
56 lessons, 6 built-in tools, works offline with secure cloud sync, and an
AI doubt-bot (offline course knowledge + optional online Claude AI).

**Live:** https://prajwalkamble.github.io/TradeAcademy/

---

## Repo structure

```
TradeAcademy/
├── index.html                         # the entire app (single file) — served by GitHub Pages
├── README.md
├── .gitignore                         # keeps secrets out of git
└── supabase/
    ├── config.toml                    # Supabase project + function config
    └── functions/
        └── ask-tutor/
            └── index.ts               # Edge Function: holds your Anthropic key server-side
```

Only `index.html` is served by GitHub Pages. The `supabase/` folder is deployed
separately with the Supabase CLI (it is **not** part of the public website).

---

## A. Deploy the website (GitHub Pages)

1. Create a repo named **`TradeAcademy`** under your account.
2. Commit these files and push to the `main` branch.
3. In the repo: **Settings → Pages → Build and deployment → Source: "Deploy from a branch"**,
   pick **`main`** + **`/ (root)`**, save.
4. Wait ~1 minute. Your site goes live at **https://prajwalkamble.github.io/TradeAcademy/**.

That's the whole app. It works fully **offline-capable** and uses your Supabase
project for auth + progress sync (the Supabase **anon** key in `index.html` is
public by design and safe to commit — it's protected by Row-Level Security).

---

## B. Enable the online AI bot (one-time backend setup)

Your Anthropic key lives **only** on the backend as a Supabase secret — never in
`index.html`, never in git. Once set, the bot's online mode works on **every
device** with zero key entry.

```bash
npm i -g supabase                                          # 1. install CLI
supabase login                                             # 2. log in
supabase link --project-ref cxhbdeajbngfcqisyuds           # 3. link your project
supabase secrets set ANTHROPIC_API_KEY=sk-ant-YOUR_NEW_KEY # 4. store the key (SECRET)
supabase functions deploy ask-tutor                        # 5. deploy the function
```

> ⚠️ **Rotate your key first.** If you've ever shared your Anthropic key in chat,
> email, or a screenshot, generate a fresh one at **console.anthropic.com →
> Settings → API Keys**, revoke the old one, and use the new key in step 4.

### How online mode works
1. When you're signed in, the bot POSTs your question to
   `https://cxhbdeajbngfcqisyuds.supabase.co/functions/v1/ask-tutor`
   with your Supabase session token.
2. The Edge Function adds your **server-side** Anthropic key and calls Claude.
3. It returns the answer as `{ "text": "..." }`. **The key never reaches the browser.**

If the function isn't deployed yet, the bot simply answers from its built-in
**offline course knowledge** (56 lessons + glossary) — nothing breaks.

---

## Security notes
- **Anon key (Supabase):** public by design, safe in `index.html`. Keep RLS enabled.
- **Anthropic key:** server-side only, via `supabase secrets set`. Never commit it.
  Rotate by re-running step 4 — no site change, no HTML redeploy.
- **CORS** in `ask-tutor/index.ts` is locked to `https://prajwalkamble.github.io`.
- The function is **JWT-gated** (`verify_jwt = true`), so only signed-in users can
  spend your API credits.

---

## Tech
Single-file HTML/CSS/JS · Supabase (auth + Postgres + Edge Functions) ·
Anthropic Claude API · Chart-style canvas/SVG animations · zero build step.
