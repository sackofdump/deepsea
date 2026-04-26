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
