create extension if not exists pgcrypto;

-- Animal Merge global leaderboard.
-- Inserts are handled by the Next.js API route with the service role key.
create table if not exists public.animal_merge_ranks (
  id uuid primary key default gen_random_uuid(),
  nickname text not null check (char_length(trim(nickname)) between 2 and 10),
  mode text not null check (mode in ('endless', 'whale-rush', 'time-attack')),
  score integer not null default 0 check (score >= 0),
  max_level integer not null default 1 check (max_level between 1 and 10),
  elapsed_sec integer not null default 0 check (elapsed_sec >= 0),
  pieces integer not null default 0 check (pieces >= 0),
  seed integer not null default 0 check (seed >= 0),
  result text not null default 'lose' check (result in ('win', 'lose', 'timeout', 'idle')),
  created_at timestamptz not null default now()
);

alter table public.animal_merge_ranks
  add column if not exists mode text not null default 'endless';

alter table public.animal_merge_ranks
  drop constraint if exists animal_merge_ranks_mode_check;

alter table public.animal_merge_ranks
  add constraint animal_merge_ranks_mode_check
  check (mode in ('endless', 'whale-rush', 'time-attack'));

alter table public.animal_merge_ranks
  add column if not exists elapsed_sec integer not null default 0 check (elapsed_sec >= 0);

alter table public.animal_merge_ranks
  add column if not exists pieces integer not null default 0 check (pieces >= 0);

alter table public.animal_merge_ranks
  add column if not exists seed integer not null default 0 check (seed >= 0);

alter table public.animal_merge_ranks
  add column if not exists result text not null default 'lose' check (result in ('win', 'lose', 'timeout', 'idle'));

alter table public.animal_merge_ranks
  drop constraint if exists animal_merge_ranks_result_check;

alter table public.animal_merge_ranks
  add constraint animal_merge_ranks_result_check
  check (result in ('win', 'lose', 'timeout', 'idle'));

create index if not exists animal_merge_ranks_mode_score_idx
  on public.animal_merge_ranks (mode, score desc, max_level desc, created_at asc);

create index if not exists animal_merge_ranks_endless_score_idx
  on public.animal_merge_ranks (score desc, max_level desc, created_at asc)
  where mode = 'endless';

create index if not exists animal_merge_ranks_time_attack_score_idx
  on public.animal_merge_ranks (score desc, max_level desc, created_at asc)
  where mode = 'time-attack';

create index if not exists animal_merge_ranks_whale_rush_idx
  on public.animal_merge_ranks (mode, result, elapsed_sec asc, score desc)
  where mode = 'whale-rush';

alter table public.animal_merge_ranks enable row level security;

drop policy if exists "Animal Merge ranks are publicly readable" on public.animal_merge_ranks;

create policy "Animal Merge ranks are publicly readable"
  on public.animal_merge_ranks
  for select
  using (true);

grant select on public.animal_merge_ranks to anon, authenticated;

insert into public.visualizations (id, title, description, url, image_url, category, visible, sort_order)
values (
  '9b1d2f0c-2d1f-4f2e-9b42-c9e9a5f0c005',
  'Animal Merge',
  'Drop matching animals into a physics board, merge them into higher levels, and chase combo scores.',
  '/animal-merge',
  '/images/utilities/animal-merge-preview.svg',
  'game',
  true,
  14
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
