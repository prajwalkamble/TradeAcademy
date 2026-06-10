// Supabase Edge Function: ask-tutor
// ----------------------------------
// This is the ONE place your Anthropic API key lives — on the backend, as a
// secret. The browser never sees it. Every signed-in user (on any device) gets
// online answers with zero key entry.
//
// The TradeAcademy app POSTs { system, messages, max_tokens } here with the
// user's Supabase session token, and this function calls Anthropic and returns
// { text: "..." }.
//
// ── ONE-TIME DEPLOY (run in your project folder) ────────────────────────────
//   1. Install the CLI:        npm i -g supabase
//   2. Log in:                 supabase login
//   3. Link your project:      supabase link --project-ref cxhbdeajbngfcqisyuds
//   4. Store the key (SECRET): supabase secrets set ANTHROPIC_API_KEY=sk-ant-xxxxx
//   5. Deploy this function:   supabase functions deploy ask-tutor
//
//   That's it. The key is set once, server-side, forever. No device ever needs it.
//   To rotate the key later, just re-run step 4 — no app change, no redeploy of HTML.
// ────────────────────────────────────────────────────────────────────────────

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-20250514";

// Allow your site to call this function. For a personal project you can use "*",
// but locking it to your exact origin is safer.
const ALLOWED_ORIGIN = "https://prajwalkamble.github.io";
const CORS = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  if (!ANTHROPIC_API_KEY) {
    return json({ error: "Server is missing ANTHROPIC_API_KEY secret." }, 500);
  }

  // Parse the request from the app
  let payload: { system?: string; messages?: unknown; max_tokens?: number };
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid JSON body." }, 400);
  }

  const messages = Array.isArray(payload.messages) ? payload.messages : [];
  if (messages.length === 0) {
    return json({ error: "No messages provided." }, 400);
  }

  const system =
    typeof payload.system === "string" && payload.system
      ? payload.system
      : "You are a friendly, concise trading tutor inside the TradeAcademy course (Indian equities, crypto, forex). Answer the student's doubt clearly in 2-4 short paragraphs. Use simple language. This is educational only, not financial advice.";

  // Clamp max_tokens to keep costs predictable
  const maxTokens = Math.min(Math.max(Number(payload.max_tokens) || 600, 64), 1024);

  // Call Anthropic with the server-side key
  let aRes: Response;
  try {
    aRes = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: maxTokens,
        system,
        messages,
      }),
    });
  } catch (e) {
    return json({ error: "Upstream request failed: " + String(e) }, 502);
  }

  const data = await aRes.json().catch(() => null);
  if (!aRes.ok) {
    const msg = (data && (data.error?.message || data.message)) || ("Anthropic error " + aRes.status);
    return json({ error: msg }, aRes.status);
  }

  // Flatten Anthropic's content[] into a single string for the app
  let text = "";
  if (data && Array.isArray(data.content)) {
    for (const block of data.content) {
      if (block?.type === "text") text += block.text;
    }
  }

  return json({ text: text || "I didn't get a response. Try again." });
});
// Supabase Edge Function: ask-tutor
// ----------------------------------
// This is the ONE place your Anthropic API key lives — on the backend, as a
// secret. The browser never sees it. Every signed-in user (on any device) gets
// online answers with zero key entry.
//
// The TradeAcademy app POSTs { system, messages, max_tokens } here with the
// user's Supabase session token, and this function calls Anthropic and returns
// { text: "..." }.
//
// ── ONE-TIME DEPLOY (run in your project folder) ────────────────────────────
//   1. Install the CLI:        npm i -g supabase
//   2. Log in:                 supabase login
//   3. Link your project:      supabase link --project-ref cxhbdeajbngfcqisyuds
//   4. Store the key (SECRET): supabase secrets set ANTHROPIC_API_KEY=sk-ant-xxxxx
//   5. Deploy this function:   supabase functions deploy ask-tutor
//
//   That's it. The key is set once, server-side, forever. No device ever needs it.
//   To rotate the key later, just re-run step 4 — no app change, no redeploy of HTML.
// ────────────────────────────────────────────────────────────────────────────

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-20250514";

// ── Per-user rate limiting ──────────────────────────────────────────────────
// Caps how many AI questions ONE signed-in user can ask per rolling hour, so a
// single account can't burn through your Anthropic credits. Backed by the
// `ai_tutor_usage` table + `bump_ai_usage` RPC (see ai_tutor_usage.sql).
const RATE_LIMIT_PER_HOUR = 30;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

// Allow your site to call this function. For a personal project you can use "*",
// but locking it to your exact origin is safer.
const ALLOWED_ORIGIN = "https://prajwalkamble.github.io";
const CORS = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

// Returns { allowed, remaining }. Fails OPEN (allows) if the usage backend isn't
// configured, so the bot never breaks just because rate-limiting isn't set up.
async function checkRateLimit(authHeader: string | null): Promise<{ allowed: boolean; remaining: number }> {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !authHeader) {
    return { allowed: true, remaining: RATE_LIMIT_PER_HOUR };
  }
  try {
    const token = authHeader.replace(/^Bearer\s+/i, "");
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { data: userData } = await admin.auth.getUser(token);
    const uid = userData?.user?.id;
    if (!uid) return { allowed: true, remaining: RATE_LIMIT_PER_HOUR }; // can't identify → don't block
    // Atomic increment-and-count for the current hour bucket
    const { data, error } = await admin.rpc("bump_ai_usage", {
      p_user: uid,
      p_limit: RATE_LIMIT_PER_HOUR,
    });
    if (error) return { allowed: true, remaining: RATE_LIMIT_PER_HOUR }; // backend hiccup → fail open
    // RPC returns the new count for this hour
    const used = typeof data === "number" ? data : (data?.count ?? 0);
    return { allowed: used <= RATE_LIMIT_PER_HOUR, remaining: Math.max(0, RATE_LIMIT_PER_HOUR - used) };
  } catch {
    return { allowed: true, remaining: RATE_LIMIT_PER_HOUR };
  }
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  if (!ANTHROPIC_API_KEY) {
    return json({ error: "Server is missing ANTHROPIC_API_KEY secret." }, 500);
  }

  // Per-user hourly cap (protects your API credits)
  const rl = await checkRateLimit(req.headers.get("authorization"));
  if (!rl.allowed) {
    return json({ error: "Rate limit reached — you've hit the hourly question limit. Please try again later." }, 429);
  }

  // Parse the request from the app
  let payload: { system?: string; messages?: unknown; max_tokens?: number };
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid JSON body." }, 400);
  }

  const messages = Array.isArray(payload.messages) ? payload.messages : [];
  if (messages.length === 0) {
    return json({ error: "No messages provided." }, 400);
  }

  const system =
    typeof payload.system === "string" && payload.system
      ? payload.system
      : "You are a friendly, concise trading tutor inside the TradeAcademy course (Indian equities, crypto, forex). Answer the student's doubt clearly in 2-4 short paragraphs. Use simple language. This is educational only, not financial advice.";

  // Clamp max_tokens to keep costs predictable
  const maxTokens = Math.min(Math.max(Number(payload.max_tokens) || 600, 64), 1024);

  // Call Anthropic with the server-side key
  let aRes: Response;
  try {
    aRes = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: maxTokens,
        system,
        messages,
      }),
    });
  } catch (e) {
    return json({ error: "Upstream request failed: " + String(e) }, 502);
  }

  const data = await aRes.json().catch(() => null);
  if (!aRes.ok) {
    const msg = (data && (data.error?.message || data.message)) || ("Anthropic error " + aRes.status);
    return json({ error: msg }, aRes.status);
  }

  // Flatten Anthropic's content[] into a single string for the app
  let text = "";
  if (data && Array.isArray(data.content)) {
    for (const block of data.content) {
      if (block?.type === "text") text += block.text;
    }
  }

  return json({ text: text || "I didn't get a response. Try again." });
});
