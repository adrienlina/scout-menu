create table if not exists public.menu_bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  menu_id uuid not null references public.menus(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, menu_id)
);

alter table public.menu_bookmarks enable row level security;

create policy "Users can manage their own bookmarks"
  on public.menu_bookmarks
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
