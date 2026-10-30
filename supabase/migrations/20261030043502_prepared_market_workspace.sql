-- Prepared public market data; account records remain isolated by auth.uid().
create table private.prepared_market (
  market_key text primary key,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);
alter table private.prepared_market enable row level security;
grant all on private.prepared_market to service_role;

create function public.market_prepared_put(p_entries jsonb) returns void
language sql security definer set search_path = '' as $$
  insert into private.prepared_market(market_key,payload)
  select value->>'key',value->'payload' from jsonb_array_elements(p_entries)
  where length(value->>'key') between 1 and 300 and jsonb_typeof(value->'payload')='object'
  on conflict(market_key) do update set payload=excluded.payload,updated_at=now()
$$;
revoke all on function public.market_prepared_put(jsonb) from public, anon, authenticated;
grant execute on function public.market_prepared_put(jsonb) to service_role;

create function public.monitor_workspace() returns jsonb
language sql stable security definer set search_path = '' as $$
 select jsonb_build_object(
  'watchlist',coalesce((select jsonb_agg(to_jsonb(w) order by w.created_at,w.id) from public.watchlist w where w.user_id=(select auth.uid())),'[]'::jsonb),
  'trades',coalesce((select jsonb_agg(to_jsonb(t) order by t.occurred_at desc,t.id) from (select * from public.trades where user_id=(select auth.uid()) order by occurred_at desc,id limit 100) t),'[]'::jsonb),
  'profile',(select to_jsonb(p) from public.profiles p where p.user_id=(select auth.uid())),
  'quotes',coalesce((select jsonb_object_agg(w.id,q.payload || '{"stale":true,"cached":true}'::jsonb)
    from public.watchlist w join private.prepared_market q on q.market_key='quote:'||w.symbol||':'||w.exchange||':'||w.currency||':'||w.timezone
    where w.user_id=(select auth.uid())),'{}'::jsonb),
  'histories',coalesce((select jsonb_object_agg(w.id,h.payload->'bars')
    from public.watchlist w join private.prepared_market h on h.market_key='history:'||w.symbol||':'||w.exchange||':'||w.currency||':'||w.timezone||':'||w.baseline_date
    where w.user_id=(select auth.uid())),'{}'::jsonb),
  'volatility',coalesce((select jsonb_object_agg(replace(market_key,'volatility:',''),payload || '{"cached":true}'::jsonb) from private.prepared_market where market_key in ('volatility:VIX','volatility:VXN')),'{}'::jsonb)
 ) where (select auth.uid()) is not null
$$;
revoke all on function public.monitor_workspace() from public, anon;
grant execute on function public.monitor_workspace() to authenticated;

create function public.market_warm_instruments() returns jsonb
language sql stable security definer set search_path = '' as $$
 select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from (
  select distinct symbol,name,exchange,currency,timezone,baseline_date as start
  from public.watchlist order by symbol,exchange,baseline_date limit 100
 ) t
$$;
revoke all on function public.market_warm_instruments() from public, anon, authenticated;
grant execute on function public.market_warm_instruments() to service_role;
