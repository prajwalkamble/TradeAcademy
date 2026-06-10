-- =====================================================================
--  TradeAcademy — Supabase schema
--
--  HOW TO APPLY:
--    1. Open your Supabase dashboard
--    2. Go to:  SQL Editor  ->  + New query
--    3. Paste this ENTIRE file and click "Run"
--    4. (Optional but recommended) Authentication -> Providers -> Email
--       -> turn OFF "Confirm email" so course users can sign in instantly.
--
--  What this stores (everything EXCEPT the password, which Supabase Auth
--  hashes with bcrypt and keeps in the managed auth.users table):
--    - profiles          : skill level, assessment score, current lesson, strategy, prefs
--    - progress          : the full app state JSON blob (drop-in for localStorage)
--    - trades            : normalized simulator/journal trade log (one row per trade)
--    - lesson_completions: normalized lesson progress (one row per completed lesson)
--
--  Security: Row Level Security (RLS) is ON for every table. A logged-in
--  user can only ever read or write THEIR OWN rows. The anon/public key is
--  safe to ship in the browser because RLS enforces this at the database.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. PROFILES  (1 row per user, keyed to auth.users.id)
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id               uuid primary key references auth.users(id) on delete cascade,
  username         text,
  skill_level      text    not null default 'Beginner',   -- Beginner | Intermediate | Advanced
  assessment_score integer,                                -- 0-100, null until taken
  assessment_date  timestamptz,
  current_lesson   integer not null default 0,             -- index into the 56-lesson list
  strategy         jsonb   not null default '{}'::jsonb,   -- saved trading strategy
  prefs            jsonb   not null default '{}'::jsonb,   -- largeText, tourDone, etc.
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "profiles_delete_own" on public.profiles;
create policy "profiles_delete_own" on public.profiles
  for delete using (auth.uid() = id);


-- ---------------------------------------------------------------------
-- 2. PROGRESS  (1 row per user — the full app-state blob)
--    This is the easiest migration target: your app already serializes
--    one JSON object to localStorage. Store that exact object in `state`.
-- ---------------------------------------------------------------------
create table if not exists public.progress (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  state      jsonb not null default '{}'::jsonb,  -- { done, cur, sim, risk, level, strategy, psych, missions, streaks }
  updated_at timestamptz not null default now()
);

alter table public.progress enable row level security;

drop policy if exists "progress_all_own" on public.progress;
create policy "progress_all_own" on public.progress
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);


-- ---------------------------------------------------------------------
-- 3. TRADES  (normalized journal — one row per closed/placed trade)
--    Optional but powerful: lets you compute edge stats with SQL and
--    feed the Monte Carlo / journal analytics from the server later.
-- ---------------------------------------------------------------------
create table if not exists public.trades (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  side       text not null,                 -- BUY | SELL | SL HIT
  symbol     text not null,
  qty        numeric not null,
  price      numeric not null,              -- execution price
  entry      numeric,                       -- entry price (for closes)
  pl         numeric,                       -- realized P&L (for closes)
  traded_at  timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists trades_user_idx on public.trades(user_id, traded_at desc);

alter table public.trades enable row level security;

drop policy if exists "trades_all_own" on public.trades;
create policy "trades_all_own" on public.trades
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);


-- ---------------------------------------------------------------------
-- 4. LESSON_COMPLETIONS  (normalized lesson progress)
-- ---------------------------------------------------------------------
create table if not exists public.lesson_completions (
  user_id      uuid not null references auth.users(id) on delete cascade,
  lesson_idx   integer not null,            -- 0-55
  completed_at timestamptz not null default now(),
  primary key (user_id, lesson_idx)
);

alter table public.lesson_completions enable row level security;

drop policy if exists "lessons_all_own" on public.lesson_completions;
create policy "lessons_all_own" on public.lesson_completions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);


-- ---------------------------------------------------------------------
-- 5. AUTO-PROVISION: create a profile + progress row when a user signs up
--    Runs with definer rights so it can write rows for the new user.
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username)
    values (new.id, coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)))
    on conflict (id) do nothing;
  insert into public.progress (user_id, state)
    values (new.id, '{}'::jsonb)
    on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ---------------------------------------------------------------------
-- 6. updated_at auto-touch on profiles & progress
-- ---------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists progress_touch on public.progress;
create trigger progress_touch before update on public.progress
  for each row execute function public.touch_updated_at();

-- =====================================================================
--  Done. Verify under  Table Editor  — you should see 4 tables, each
--  showing a green "RLS enabled" shield.
-- =====================================================================
