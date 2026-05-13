create extension if not exists pgcrypto;

create table if not exists public.phase_dual_scores (
  id uuid primary key default gen_random_uuid(),
  player_name text not null,
  daily_key text not null,
  puzzle_id text not null,
  score integer not null,
  moves integer not null,
  time_ms integer not null,
  undos integer not null,
  created_at timestamptz not null default now()
);

alter table public.phase_dual_scores
  drop constraint if exists phase_dual_scores_player_name_check,
  drop constraint if exists phase_dual_scores_daily_key_check,
  drop constraint if exists phase_dual_scores_puzzle_id_check,
  drop constraint if exists phase_dual_scores_puzzle_matches_daily_key_check,
  drop constraint if exists phase_dual_scores_score_check,
  drop constraint if exists phase_dual_scores_moves_check,
  drop constraint if exists phase_dual_scores_time_ms_check,
  drop constraint if exists phase_dual_scores_undos_check,
  drop constraint if exists phase_dual_scores_daily_key_player_name_key,
  drop constraint if exists phase_dual_scores_daily_player_unique;

alter table public.phase_dual_scores
  add constraint phase_dual_scores_player_name_check
    check (char_length(trim(player_name)) between 2 and 18),
  add constraint phase_dual_scores_daily_key_check
    check (daily_key ~ '^\d{4}-\d{2}-\d{2}$'),
  add constraint phase_dual_scores_puzzle_id_check
    check (puzzle_id ~ '^daily-\d{4}-\d{2}-\d{2}$'),
  add constraint phase_dual_scores_puzzle_matches_daily_key_check
    check (puzzle_id = 'daily-' || daily_key),
  add constraint phase_dual_scores_score_check
    check (score between 0 and 2000),
  add constraint phase_dual_scores_moves_check
    check (moves between 1 and 500),
  add constraint phase_dual_scores_time_ms_check
    check (time_ms between 1000 and 180000),
  add constraint phase_dual_scores_undos_check
    check (undos between 0 and 200),
  add constraint phase_dual_scores_daily_player_unique
    unique (daily_key, player_name);

create index if not exists phase_dual_scores_daily_rank_idx
  on public.phase_dual_scores (daily_key, score desc, time_ms asc, created_at asc);

alter table public.phase_dual_scores enable row level security;

drop policy if exists "phase_dual_scores_read_all" on public.phase_dual_scores;
create policy "phase_dual_scores_read_all"
  on public.phase_dual_scores
  for select
  using (true);

insert into public.visualizations (id, title, description, url, image_url, category, visible, sort_order)
values (
  '9b1d2f0c-2d1f-4f2e-9b42-c9e9a5f0c015',
  'Phase Dual',
  '두 격자, 6종 연동 규칙, 캠페인 퍼즐과 데일리 리더보드를 갖춘 브라우저 슬라이딩 퍼즐 게임입니다.',
  '/phase-dual',
  '/images/utilities/phase-dual-preview.svg',
  'game',
  true,
  15
)
on conflict (id) do update
set
  title = excluded.title,
  description = excluded.description,
  url = excluded.url,
  image_url = excluded.image_url,
  category = excluded.category,
  visible = excluded.visible,
  sort_order = excluded.sort_order;
