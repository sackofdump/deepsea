-- Run this once in your Supabase project's SQL Editor (Dashboard → SQL → +New query).
-- Creates the scores table, the indexes the leaderboard fetch needs, and the
-- public Row-Level Security policies so the publishable (anon) key can read
-- and upsert without a backend.

create extension if not exists "pgcrypto";

create table if not exists public.scores (
  id             uuid        primary key default gen_random_uuid(),
  player_id      text        not null unique,
  display_name   text        not null,
  total_earned   bigint      not null default 0,
  level          int         not null default 1,
  prestige_count int         not null default 0,
  pearls         bigint      not null default 0,
  jackpots       int         not null default 0,
  chests         int         not null default 0,
  total_dives    int         not null default 0,
  updated_at     timestamptz not null default now()
);

create index if not exists scores_total_earned_idx on public.scores (total_earned desc);
create index if not exists scores_level_idx        on public.scores (level desc);
create index if not exists scores_prestige_idx     on public.scores (prestige_count desc);
create index if not exists scores_jackpots_idx     on public.scores (jackpots desc);
create index if not exists scores_pearls_idx       on public.scores (pearls desc);
create index if not exists scores_dives_idx        on public.scores (total_dives desc);

alter table public.scores enable row level security;

drop policy if exists "scores read"   on public.scores;
drop policy if exists "scores insert" on public.scores;
drop policy if exists "scores update" on public.scores;

create policy "scores read"   on public.scores for select using (true);
create policy "scores insert" on public.scores for insert with check (true);
create policy "scores update" on public.scores for update using (true) with check (true);

-- Touch updated_at on every update.
create or replace function public.touch_scores_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists scores_touch on public.scores;
create trigger scores_touch
  before update on public.scores
  for each row execute function public.touch_scores_updated_at();

-- ===== Cloud saves ========================================================
-- One row per authenticated user. The full game state goes in `state` as
-- JSONB. RLS makes a user's save readable/writable only by themselves.
--
-- Dashboard step (do this once, manually):
--   1. Authentication → Providers → Anonymous → toggle ON.
--      Without this, supabase.auth.signInAnonymously() fails and the game
--      can't auto-create accounts for new players.
--   2. Authentication → Sign In / Providers → Email → "Confirm email" → OFF.
--      With it ON, anonymous-to-permanent upgrade leaves the email "pending"
--      until the player clicks a confirmation link, blocking sign-in on
--      another device until then. OFF gives the smoother cross-device UX
--      this game's Account modal expects.

create table if not exists public.saves (
  user_id    uuid        primary key references auth.users(id) on delete cascade,
  state      jsonb       not null,
  updated_at timestamptz not null default now()
);

alter table public.saves enable row level security;

drop policy if exists "saves read self"   on public.saves;
drop policy if exists "saves insert self" on public.saves;
drop policy if exists "saves update self" on public.saves;

create policy "saves read self"   on public.saves for select using (auth.uid() = user_id);
create policy "saves insert self" on public.saves for insert with check (auth.uid() = user_id);
create policy "saves update self" on public.saves for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.touch_saves_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists saves_touch on public.saves;
create trigger saves_touch
  before update on public.saves
  for each row execute function public.touch_saves_updated_at();

-- ===== Limited-time events (Spring Bloom etc.) ===========================
-- Run this block ONLY when you're ready to deploy a themed event page
-- (event.html). It swaps the single-column unique on player_id for a
-- composite (player_id, event_key) so each player can hold one row per
-- event AND one for the main game (event_key = '').
--
-- Main-game-only deployments don't need this — the original schema above
-- is what production uses today.

alter table public.scores
  add column if not exists event_key text not null default '';

do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'scores_player_id_key'
      and conrelid = 'public.scores'::regclass
  ) then
    alter table public.scores drop constraint scores_player_id_key;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'scores_player_event_key'
      and conrelid = 'public.scores'::regclass
  ) then
    alter table public.scores
      add constraint scores_player_event_key unique (player_id, event_key);
  end if;
end $$;

-- Composite indexes so per-event leaderboard queries stay cheap.
create index if not exists scores_event_total_earned_idx on public.scores (event_key, total_earned   desc);
create index if not exists scores_event_level_idx        on public.scores (event_key, level          desc);
create index if not exists scores_event_prestige_idx     on public.scores (event_key, prestige_count desc);
create index if not exists scores_event_jackpots_idx     on public.scores (event_key, jackpots       desc);
create index if not exists scores_event_pearls_idx       on public.scores (event_key, pearls         desc);
create index if not exists scores_event_dives_idx        on public.scores (event_key, total_dives    desc);

-- Drop the original single-column indexes once the composites are in place.
drop index if exists public.scores_total_earned_idx;
drop index if exists public.scores_level_idx;
drop index if exists public.scores_prestige_idx;
drop index if exists public.scores_jackpots_idx;
drop index if exists public.scores_pearls_idx;
drop index if exists public.scores_dives_idx;
