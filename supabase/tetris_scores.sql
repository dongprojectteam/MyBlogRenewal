create extension if not exists pgcrypto;

create table if not exists public.tetris_scores (
  id uuid primary key default gen_random_uuid(),
  player_name text not null check (char_length(trim(player_name)) between 2 and 18),
  mode text not null check (mode in ('marathon', 'sprint', 'ultra', 'survival', 'daily')),
  score integer not null default 0 check (score >= 0),
  lines integer not null default 0 check (lines >= 0),
  level integer not null default 1 check (level >= 1),
  time_ms integer not null default 0 check (time_ms >= 0),
  pieces integer not null default 0 check (pieces >= 0),
  seed integer not null default 0 check (seed >= 0),
  daily_key text check (daily_key is null or daily_key ~ '^\d{4}-\d{2}-\d{2}$'),
  created_at timestamptz not null default now()
);

create index if not exists tetris_scores_mode_score_idx
  on public.tetris_scores (mode, score desc, lines desc, time_ms asc);

create index if not exists tetris_scores_mode_time_idx
  on public.tetris_scores (mode, time_ms asc, score desc)
  where mode = 'sprint';

create index if not exists tetris_scores_daily_idx
  on public.tetris_scores (daily_key, score desc, lines desc, time_ms asc)
  where mode = 'daily';

alter table public.tetris_scores enable row level security;

insert into public.visualizations (id, title, description, url, image_url, category, visible, sort_order)
values (
  '9b1d2f0c-2d1f-4f2e-9b42-c9e9a5f0c003',
  'Tetris',
  '고스트 블록, Hold, Next 큐, 여러 게임 모드와 글로벌 리더보드를 지원하는 브라우저 테트리스 게임입니다.',
  '/tetris',
  '/images/utilities/tetris-preview.svg',
  'game',
  true,
  4
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
