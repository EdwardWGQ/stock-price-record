alter table public.watchlist add column baseline_date date not null default '2026-06-01';
alter table public.watchlist add column baseline_session date;
alter table public.watchlist add constraint baseline_date_bounds check (baseline_date between date '1900-01-01' and date '2100-12-31');
alter table public.watchlist add constraint baseline_session_bounds check (baseline_session is null or baseline_session between baseline_date and date '2100-12-31');
alter table public.profiles add column baseline_date date not null default '2026-06-01' check (baseline_date between date '1900-01-01' and date '2100-12-31');

-- All stock updates and the account's default date commit together or roll back together.
create function public.update_baseline_dates(p_updates jsonb, p_default_date date default null)
returns setof public.watchlist language plpgsql security invoker set search_path = '' as $$
declare entry jsonb; updated_row public.watchlist; ids uuid[] := '{}'; actor uuid := auth.uid();
begin
  if actor is null then raise exception 'AUTH'; end if;
  if jsonb_typeof(p_updates) <> 'array' or jsonb_array_length(p_updates) > 100 then raise exception 'VALIDATION'; end if;
  -- Consistent row order avoids deadlocks between concurrent bulk date editors.
  for entry in select value from jsonb_array_elements(p_updates) order by value->>'id' loop
    if (entry->>'id')::uuid = any(ids) then raise exception 'VALIDATION'; end if;
    ids := array_append(ids,(entry->>'id')::uuid);
    if (entry->>'baseline_date')::date > current_date then raise exception 'DATE_INVALID'; end if;
    update public.watchlist set
      baseline_date = (entry->>'baseline_date')::date,
      baseline_session = (entry->>'baseline_session')::date,
      baseline_at = (entry->>'baseline_at')::timestamptz,
      baseline_timezone = entry->>'baseline_timezone',
      baseline_price = entry->>'baseline_price'
    where id = (entry->>'id')::uuid and user_id = actor and revision = (entry->>'revision')::integer
    returning * into updated_row;
    if not found then raise exception 'CONFLICT'; end if;
    return next updated_row;
  end loop;
  if p_default_date is not null then
    if p_default_date > current_date then raise exception 'DATE_INVALID'; end if;
    insert into public.profiles(user_id,baseline_date) values(actor,p_default_date)
    on conflict(user_id) do update set baseline_date = excluded.baseline_date;
  end if;
end $$;
revoke all on function public.update_baseline_dates(jsonb,date) from public, anon;
grant execute on function public.update_baseline_dates(jsonb,date) to authenticated;
