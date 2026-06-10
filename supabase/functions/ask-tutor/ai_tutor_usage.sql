-- ai_tutor_usage.sql
-- Per-user hourly rate limiting for the ask-tutor Edge Function.
-- Run this once in Supabase → SQL Editor.

-- 1. Usage table: one row per user per hour bucket.
create table if not exists public.ai_tutor_usage (
  user_id     uuid        not null references auth.users(id) on delete cascade,
  hour_bucket timestamptz not null,           -- truncated to the hour
  count       integer     not null default 0,
  primary key (user_id, hour_bucket)
);

-- Lock it down: only the service role (the Edge Function) touches this table.
alter table public.ai_tutor_usage enable row level security;
-- (No policies for anon/authenticated → clients cannot read or write it directly.)

-- 2. Atomic "increment and return new count" for the current hour.
--    SECURITY DEFINER so the Edge Function (service role) can run it.
create or replace function public.bump_ai_usage(p_user uuid, p_limit integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bucket timestamptz := date_trunc('hour', now());
  v_count  integer;
begin
  insert into public.ai_tutor_usage (user_id, hour_bucket, count)
  values (p_user, v_bucket, 1)
  on conflict (user_id, hour_bucket)
  do update set count = public.ai_tutor_usage.count + 1
  returning count into v_count;

  return v_count;   -- the function compares this against p_limit
end;
$$;

-- 3. Tidy-up: keep the table small by removing usage rows older than 2 days.
--    (Old hour buckets are useless once the rolling window has passed.)

-- 3a. Reusable cleanup function.
create or replace function public.purge_old_ai_usage()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted integer;
begin
  delete from public.ai_tutor_usage
   where hour_bucket < now() - interval '2 days';
  get diagnostics v_deleted = row_count;
  return v_deleted;   -- number of rows removed
end;
$$;

-- 3b. Run it ONCE manually anytime:
--     select public.purge_old_ai_usage();

-- 3c. (Recommended) Schedule it to run automatically every day at 03:00 UTC.
--     Requires the pg_cron extension. In Supabase: Database → Extensions → enable "pg_cron".
create extension if not exists pg_cron;

-- Remove any existing job with the same name, then (re)create it. Safe to re-run.
select cron.unschedule('purge_ai_tutor_usage')
  where exists (select 1 from cron.job where jobname = 'purge_ai_tutor_usage');

select cron.schedule(
  'purge_ai_tutor_usage',                 -- job name
  '0 3 * * *',                            -- every day at 03:00 (cron syntax)
  $$ select public.purge_old_ai_usage(); $$
);

-- To inspect or remove the schedule later:
--   select * from cron.job;                          -- list jobs
--   select cron.unschedule('purge_ai_tutor_usage');  -- stop auto-cleanup

