alter table public.visualizations
  add column if not exists category text;

update public.visualizations
set category = 'utility'
where category is null
   or category not in ('utility', 'game');

alter table public.visualizations
  alter column category set default 'utility';

alter table public.visualizations
  alter column category set not null;

alter table public.visualizations
  drop constraint if exists visualizations_category_check;

alter table public.visualizations
  add constraint visualizations_category_check
  check (category in ('utility', 'game'));

update public.visualizations
set category = 'game'
where url in ('/tetris', '/sudoku', '/animal-merge');

update public.visualizations
set category = 'utility'
where url = '/ladder';

create index if not exists visualizations_category_sort_order_idx
  on public.visualizations (category, sort_order);
