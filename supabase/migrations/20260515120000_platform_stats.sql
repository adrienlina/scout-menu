-- Exposes anonymous, aggregated platform-usage statistics through a
-- SECURITY DEFINER function. Only aggregate counts and groupings are
-- returned — no row-level data, names, emails or other identifiers.

create or replace function public.get_platform_stats()
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  result jsonb;
begin
  select jsonb_build_object(
    'total_users', (select count(*) from auth.users),
    'total_camps', (select count(*) from public.camps),
    'total_menus', (select count(*) from public.menus),
    'default_menus', (select count(*) from public.menus where is_default = true),
    'shared_menus', (select count(*) from public.menus where is_shared = true and is_default = false),
    'private_menus', (select count(*) from public.menus where is_shared = false and is_default = false),
    'total_meals_planned', (select count(*) from public.camp_meals),
    'total_shopping_lists', (select count(*) from public.shopping_lists),
    'total_menu_ingredients', (select count(*) from public.menu_ingredients),
    'total_agribalyse_foods', (select count(*) from public.agribalyse_foods),
    'total_bookmarks', (select count(*) from public.menu_bookmarks),
    'total_participants_planned', (select coalesce(sum(participant_count)::bigint, 0) from public.camps),
    'total_portions_missing', (select coalesce(sum(portions_missing)::bigint, 0) from public.camp_meals),
    'total_portions_wasted', (select coalesce(sum(portions_wasted)::bigint, 0) from public.camp_meals),
    'avg_camp_duration_days', (select coalesce(round(avg((end_date - start_date) + 1)::numeric, 1), 0) from public.camps),
    'avg_camp_participants', (select coalesce(round(avg(participant_count)::numeric, 1), 0) from public.camps),
    'camps_by_month', coalesce((
      select jsonb_agg(jsonb_build_object('month', m, 'count', c) order by m)
      from (
        select to_char(date_trunc('month', created_at), 'YYYY-MM') as m,
               count(*)::bigint as c
        from public.camps
        group by 1
      ) sub
    ), '[]'::jsonb),
    'meals_by_type', coalesce((
      select jsonb_agg(jsonb_build_object('type', t, 'count', c) order by c desc)
      from (
        select meal_type as t, count(*)::bigint as c
        from public.camp_meals
        group by meal_type
      ) sub
    ), '[]'::jsonb),
    'menus_by_type', coalesce((
      select jsonb_agg(jsonb_build_object('type', t, 'count', c) order by c desc)
      from (
        select meal_type as t, count(*)::bigint as c
        from public.menus
        group by meal_type
      ) sub
    ), '[]'::jsonb),
    'top_ingredients', coalesce((
      select jsonb_agg(jsonb_build_object('name', n, 'count', c) order by c desc)
      from (
        select lower(btrim(name)) as n, count(*)::bigint as c
        from public.menu_ingredients
        where name is not null and btrim(name) <> ''
        group by 1
        order by 2 desc
        limit 15
      ) sub
    ), '[]'::jsonb),
    'generated_at', now()
  )
  into result;
  return result;
end;
$$;

revoke all on function public.get_platform_stats() from public;
grant execute on function public.get_platform_stats() to anon, authenticated;
