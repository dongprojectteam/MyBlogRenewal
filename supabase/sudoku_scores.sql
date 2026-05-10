create extension if not exists pgcrypto;

create table if not exists public.sudoku_scores (
  id uuid primary key default gen_random_uuid(),
  player_name text not null check (char_length(trim(player_name)) between 2 and 18),
  level_id integer not null check (level_id between 1 and 10),
  time_ms integer not null check (time_ms >= 0),
  seed integer not null check (seed >= 0),
  puzzle text not null check (char_length(puzzle) = 81 and puzzle ~ '^[0-9]{81}$'),
  created_at timestamptz not null default now()
);

create index if not exists sudoku_scores_level_time_idx
  on public.sudoku_scores (level_id, time_ms asc, created_at asc);

alter table public.sudoku_scores enable row level security;

insert into public.visualizations (id, title, description, url, image_url, visible, sort_order)
values (
  '9b1d2f0c-2d1f-4f2e-9b42-c9e9a5f0c004',
  'Sudoku',
  '레벨별 자동 생성 퍼즐, Canvas 입력, 클리어 시간 글로벌 리더보드를 갖춘 스도쿠 게임입니다.',
  '/sudoku',
  '/images/utilities/sudoku-preview.svg',
  true,
  13
)
on conflict (id) do update
set
  title = excluded.title,
  description = excluded.description,
  url = excluded.url,
  image_url = excluded.image_url,
  visible = excluded.visible,
  sort_order = excluded.sort_order;
