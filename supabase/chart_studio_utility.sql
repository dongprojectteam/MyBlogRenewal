insert into public.visualizations (id, title, description, url, image_url, category, visible, sort_order)
values (
  '9b1d2f0c-2d1f-4f2e-9b42-c9e9a5f0c106'::uuid,
  'Chart Studio',
  'Create polished 3D-style bar and line charts from manual data, CSV, TSV, or JSON.',
  '/chart-studio',
  '/images/utilities/chart-studio-preview.svg',
  'utility',
  true,
  16
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
