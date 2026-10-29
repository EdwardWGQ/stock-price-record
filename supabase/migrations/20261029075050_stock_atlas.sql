-- Stock Atlas: isolated user data, exact decimals, UTC instants and optimistic locking.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create function private.valid_timezone(value text) returns boolean
language sql stable security invoker set search_path = ''
as $$ select exists(select 1 from pg_catalog.pg_timezone_names where name = value) $$;

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  language text not null default 'en' check (language in ('en', 'zh')),
  timezone text not null default 'UTC' check (length(timezone) between 1 and 100),
  updated_at timestamptz not null default now()
);

create table public.watchlist (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  symbol text not null check (symbol ~ '^[A-Z0-9^.=_/-]{1,24}$'),
  name text not null check (length(name) between 1 and 160),
  exchange text not null check (exchange ~ '^[A-Za-z0-9 _.-]{1,64}$'),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  timezone text not null,
  baseline_at timestamptz not null check (isfinite(baseline_at) and baseline_at between '1900-01-01T00:00:00Z' and '2100-12-31T23:59:59Z'),
  baseline_timezone text not null,
  -- Text decimals avoid precision loss through JSON/JavaScript. Numeric checks are exact.
  baseline_price text check (baseline_price is null or (baseline_price ~ '^(0|[1-9][0-9]{0,11})(\.[0-9]{1,8})?$' and baseline_price::numeric > 0)),
  alert_percent text not null default '-30' check (alert_percent ~ '^-[0-9]{1,3}(\.[0-9]{1,2})?$' and alert_percent::numeric >= -100 and alert_percent::numeric < 0),
  notes text not null default '' check (length(notes) <= 2000),
  revision integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, symbol, exchange)
);
create index watchlist_user_created_idx on public.watchlist(user_id, created_at);

create table public.trades (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  symbol text not null check (symbol ~ '^[A-Z0-9^.=_/-]{1,24}$'),
  name text not null check (length(name) between 1 and 160),
  exchange text not null check (exchange ~ '^[A-Za-z0-9 _.-]{1,64}$'),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  timezone text not null,
  side text not null check (side in ('buy', 'sell')),
  quantity text not null check (quantity ~ '^(0|[1-9][0-9]{0,11})(\.[0-9]{1,8})?$' and quantity::numeric > 0),
  price text not null check (price ~ '^(0|[1-9][0-9]{0,11})(\.[0-9]{1,8})?$' and price::numeric > 0),
  fees text not null default '0' check (fees ~ '^(0|[1-9][0-9]{0,11})(\.[0-9]{1,8})?$' and fees::numeric >= 0),
  occurred_at timestamptz not null check (isfinite(occurred_at) and occurred_at between '1900-01-01T00:00:00Z' and '2100-12-31T23:59:59Z'),
  record_timezone text not null,
  notes text not null default '' check (length(notes) <= 2000),
  revision integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index trades_user_time_idx on public.trades(user_id, occurred_at desc, id);

create table private.record_audit (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  table_name text not null,
  record_id uuid not null,
  operation text not null,
  old_record jsonb,
  new_record jsonb,
  changed_at timestamptz not null default now()
);
create index record_audit_owner_idx on private.record_audit(user_id, changed_at desc);
alter table private.record_audit enable row level security;

create function private.prepare_record() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if not private.valid_timezone(new.timezone) then raise exception 'TIMEZONE'; end if;
  if tg_table_name = 'watchlist' then
    if not private.valid_timezone(new.baseline_timezone) then raise exception 'TIMEZONE'; end if;
    -- A transaction-scoped advisory lock serializes account-level quota checks.
    if tg_op = 'INSERT' then
      perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.user_id::text, 0));
      if (select count(*) from public.watchlist where user_id = new.user_id) >= 100 then raise exception 'WATCHLIST_LIMIT'; end if;
    end if;
  elsif not private.valid_timezone(new.record_timezone) then raise exception 'TIMEZONE'; end if;
  if tg_op = 'UPDATE' then
    if new.id <> old.id or new.user_id <> old.user_id then raise exception 'IMMUTABLE_OWNER'; end if;
    new.created_at := old.created_at;
    new.revision := old.revision + 1;
  else new.revision := 1; new.created_at := now(); end if;
  new.updated_at := now();
  return new;
end $$;

create function private.prepare_profile() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if not private.valid_timezone(new.timezone) then raise exception 'TIMEZONE'; end if;
  if tg_op = 'UPDATE' and new.user_id <> old.user_id then raise exception 'IMMUTABLE_OWNER'; end if;
  new.updated_at := now(); return new;
end $$;

-- Only trigger invocation can write audit rows. Never expose this definer as an RPC.
create function private.audit_record() returns trigger
language plpgsql security definer set search_path = '' as $$
declare actor uuid;
begin
  actor := case when tg_op = 'DELETE' then old.user_id else new.user_id end;
  -- ON DELETE CASCADE from account deletion should not re-create personal audit data.
  if not exists(select 1 from auth.users where id = actor) then return null; end if;
  if auth.uid() is not null and auth.uid() <> actor then raise exception 'AUDIT_OWNER'; end if;
  insert into private.record_audit(user_id, table_name, record_id, operation, old_record, new_record)
  values(actor, tg_table_name, case when tg_op = 'DELETE' then old.id else new.id end, tg_op,
    case when tg_op <> 'INSERT' then to_jsonb(old) else null end,
    case when tg_op <> 'DELETE' then to_jsonb(new) else null end);
  return null;
end $$;

create trigger prepare_watch before insert or update on public.watchlist for each row execute function private.prepare_record();
create trigger prepare_trade before insert or update on public.trades for each row execute function private.prepare_record();
create trigger prepare_profile before insert or update on public.profiles for each row execute function private.prepare_profile();
create trigger audit_watch after insert or update or delete on public.watchlist for each row execute function private.audit_record();
create trigger audit_trade after insert or update or delete on public.trades for each row execute function private.audit_record();

alter table public.profiles enable row level security;
alter table public.watchlist enable row level security;
alter table public.trades enable row level security;

create policy profiles_select on public.profiles for select to authenticated using ((select auth.uid()) = user_id);
create policy profiles_insert on public.profiles for insert to authenticated with check ((select auth.uid()) = user_id);
create policy profiles_update on public.profiles for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy watch_select on public.watchlist for select to authenticated using ((select auth.uid()) = user_id);
create policy watch_insert on public.watchlist for insert to authenticated with check ((select auth.uid()) = user_id);
create policy watch_update on public.watchlist for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy watch_delete on public.watchlist for delete to authenticated using ((select auth.uid()) = user_id);
create policy trades_select on public.trades for select to authenticated using ((select auth.uid()) = user_id);
create policy trades_insert on public.trades for insert to authenticated with check ((select auth.uid()) = user_id);
create policy trades_update on public.trades for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy trades_delete on public.trades for delete to authenticated using ((select auth.uid()) = user_id);

revoke all on public.profiles, public.watchlist, public.trades from anon, authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.watchlist, public.trades to authenticated;
grant usage on schema private to authenticated;
revoke all on all functions in schema private from public, anon, authenticated;
grant execute on function private.valid_timezone(text) to authenticated;

-- Persistent shared cache. Only the backend secret-key client can access it.
create table private.market_cache (cache_key text primary key, payload jsonb not null, expires_at timestamptz not null);
create table private.market_buckets (bucket_key text primary key, window_start timestamptz not null, hits integer not null);
alter table private.market_cache enable row level security;
alter table private.market_buckets enable row level security;

create function public.market_cache_get(p_key text) returns jsonb
language sql security definer set search_path = '' as $$ select payload from private.market_cache where cache_key = p_key and expires_at > now() $$;
create function public.market_cache_put(p_key text, p_payload jsonb, p_ttl integer) returns void
language sql security definer set search_path = '' as $$
  insert into private.market_cache values(p_key, p_payload, now() + pg_catalog.make_interval(secs => greatest(1, least(p_ttl, 86400))))
  on conflict(cache_key) do update set payload = excluded.payload, expires_at = excluded.expires_at
$$;
create function public.market_rate_limit(p_key text, p_limit integer) returns boolean
language plpgsql security definer set search_path = '' as $$
declare count_now integer;
begin
  insert into private.market_buckets values(p_key, pg_catalog.date_trunc('minute', now()), 1)
  on conflict(bucket_key) do update set
    hits = case when private.market_buckets.window_start = pg_catalog.date_trunc('minute', now()) then private.market_buckets.hits + 1 else 1 end,
    window_start = pg_catalog.date_trunc('minute', now())
  returning hits into count_now;
  return count_now <= p_limit;
end $$;

revoke all on function public.market_cache_get(text), public.market_cache_put(text,jsonb,integer), public.market_rate_limit(text,integer) from public, anon, authenticated;
grant execute on function public.market_cache_get(text), public.market_cache_put(text,jsonb,integer), public.market_rate_limit(text,integer) to service_role;
grant usage on schema private to service_role;
grant all on all tables in schema private to service_role;
grant all on all sequences in schema private to service_role;
