-- Read-only administration. Existing owner-only RLS and write policies stay in force.
create table private.site_admins (
 user_id uuid primary key references auth.users(id) on delete cascade,
 granted_at timestamptz not null default now()
);
alter table private.site_admins enable row level security;
revoke all on private.site_admins from public, anon, authenticated;
grant select, insert, update, delete on private.site_admins to service_role;

create function private.is_site_admin() returns boolean
language sql stable security definer set search_path = '' as $$
 select auth.uid() is not null and exists(
  select 1 from private.site_admins a join auth.users u on u.id=a.user_id
  where a.user_id=(select auth.uid()) and u.email_confirmed_at is not null
   and u.deleted_at is null and (u.banned_until is null or u.banned_until<=now())
 )
$$;
revoke all on function private.is_site_admin() from public, anon, authenticated;
grant execute on function private.is_site_admin() to authenticated;

create function public.admin_status() returns boolean
language sql stable security invoker set search_path = '' as $$ select private.is_site_admin() $$;
revoke all on function public.admin_status() from public, anon;
grant execute on function public.admin_status() to authenticated;

create index trades_created_admin_idx on public.trades(created_at desc,id);

create function private.admin_overview(p_search text,p_offset integer) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare result jsonb;
begin
 if not private.is_site_admin() then raise exception 'ADMIN_FORBIDDEN' using errcode='42501'; end if;
 if p_offset is null or p_offset<0 or p_offset>1000000 or p_search is null or length(p_search)>200 then raise exception 'VALIDATION'; end if;
 select jsonb_build_object(
  'fetched_at',now(),
  'user_count',(select count(*) from auth.users where deleted_at is null),
  'watch_count',(select count(*) from public.watchlist),
  'trade_count',(select count(*) from public.trades),
  'filtered_count',(select count(*) from auth.users u where u.deleted_at is null and strpos(lower(coalesce(u.email,'')),lower(trim(p_search)))>0),
  'users',coalesce((select jsonb_agg(jsonb_build_object(
   'id',u.id,'email',u.email,'phone',nullif(u.phone,''),
   'display_name',coalesce(u.raw_user_meta_data->>'display_name',u.raw_user_meta_data->>'full_name',u.raw_user_meta_data->>'name',''),
   'created_at',u.created_at,'last_sign_in_at',u.last_sign_in_at,'email_confirmed_at',u.email_confirmed_at,
   'banned_until',u.banned_until,'is_admin',exists(select 1 from private.site_admins a where a.user_id=u.id),
   'watch_count',(select count(*) from public.watchlist w where w.user_id=u.id),
   'trade_count',(select count(*) from public.trades t where t.user_id=u.id)
  ) order by u.created_at desc,u.id) from (
   select * from auth.users where deleted_at is null and strpos(lower(coalesce(email,'')),lower(trim(p_search)))>0
   order by created_at desc,id limit 50 offset p_offset
  ) u),'[]'::jsonb),
  'recent_trades',coalesce((select jsonb_agg(to_jsonb(t)||jsonb_build_object('email',u.email) order by t.created_at desc,t.id)
   from (select * from public.trades order by created_at desc,id limit 30) t join auth.users u on u.id=t.user_id),'[]'::jsonb)
 ) into result;
 return result;
end $$;
revoke all on function private.admin_overview(text,integer) from public, anon, authenticated;
grant execute on function private.admin_overview(text,integer) to authenticated;

create function public.admin_overview(p_search text default '',p_offset integer default 0) returns jsonb
language sql stable security invoker set search_path = '' as $$ select private.admin_overview(p_search,p_offset) $$;
revoke all on function public.admin_overview(text,integer) from public, anon;
grant execute on function public.admin_overview(text,integer) to authenticated;

create function private.admin_user_detail(p_user_id uuid,p_trade_offset integer) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare result jsonb;
begin
 if not private.is_site_admin() then raise exception 'ADMIN_FORBIDDEN' using errcode='42501'; end if;
 if p_user_id is null or p_trade_offset is null or p_trade_offset<0 or p_trade_offset>1000000 then raise exception 'VALIDATION'; end if;
 if not exists(select 1 from auth.users where id=p_user_id and deleted_at is null) then raise exception 'USER_NOT_FOUND' using errcode='P0002'; end if;
 select jsonb_build_object(
  'fetched_at',now(),
  'user',(select jsonb_build_object('id',u.id,'email',u.email,'phone',nullif(u.phone,''),
   'display_name',coalesce(u.raw_user_meta_data->>'display_name',u.raw_user_meta_data->>'full_name',u.raw_user_meta_data->>'name',''),
   'created_at',u.created_at,'updated_at',u.updated_at,'last_sign_in_at',u.last_sign_in_at,'email_confirmed_at',u.email_confirmed_at,
   'banned_until',u.banned_until,'is_admin',exists(select 1 from private.site_admins a where a.user_id=u.id),
   'watch_count',(select count(*) from public.watchlist w where w.user_id=u.id),
   'trade_count',(select count(*) from public.trades t where t.user_id=u.id)
  ) from auth.users u where u.id=p_user_id),
  'profile',(select to_jsonb(p) from public.profiles p where p.user_id=p_user_id),
  'watchlist',coalesce((select jsonb_agg(to_jsonb(w) order by w.created_at,w.id) from public.watchlist w where w.user_id=p_user_id),'[]'::jsonb),
  'trade_count',(select count(*) from public.trades where user_id=p_user_id),
  'trades',coalesce((select jsonb_agg(to_jsonb(t) order by t.occurred_at desc,t.id) from (
   select * from public.trades where user_id=p_user_id order by occurred_at desc,id limit 100 offset p_trade_offset
  ) t),'[]'::jsonb),
  'positions',coalesce((select jsonb_agg(to_jsonb(p) order by p.symbol,p.exchange,p.currency) from (
   select symbol,exchange,currency,max(name) as name,
    trim_scale(coalesce(sum(quantity::numeric) filter(where side='buy'),0))::text as bought_quantity,
    trim_scale(coalesce(sum(quantity::numeric) filter(where side='sell'),0))::text as sold_quantity,
    trim_scale(sum(case when side='buy' then quantity::numeric else -quantity::numeric end))::text as quantity,
    count(*) as trade_count,max(occurred_at) as last_trade_at
   from public.trades where user_id=p_user_id group by symbol,exchange,currency
  ) p),'[]'::jsonb)
 ) into result;
 return result;
end $$;
revoke all on function private.admin_user_detail(uuid,integer) from public, anon, authenticated;
grant execute on function private.admin_user_detail(uuid,integer) to authenticated;

create function public.admin_user_detail(p_user_id uuid,p_trade_offset integer default 0) returns jsonb
language sql stable security invoker set search_path = '' as $$ select private.admin_user_detail(p_user_id,p_trade_offset) $$;
revoke all on function public.admin_user_detail(uuid,integer) from public, anon;
grant execute on function public.admin_user_detail(uuid,integer) to authenticated;
