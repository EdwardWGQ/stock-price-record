import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
const migration = readFileSync(new URL('../supabase/migrations/20261029075050_stock_atlas.sql', import.meta.url),'utf8');
const datesMigration = readFileSync(new URL('../supabase/migrations/20261029085308_baseline_dates.sql', import.meta.url),'utf8');
const preparedMigration = readFileSync(new URL('../supabase/migrations/20261030043502_prepared_market_workspace.sql', import.meta.url),'utf8');
const alice = '11111111-1111-4111-8111-111111111111'; const bob = '22222222-2222-4222-8222-222222222222';
let db: PGlite;
async function asUser<T>(id: string, callback: () => Promise<T>): Promise<T> {
  await db.exec('begin; set local role authenticated;'); await db.query("select set_config('request.jwt.claim.sub', $1, true)",[id]);
  try { const result = await callback(); await db.exec('commit'); return result; } catch(e) { await db.exec('rollback'); throw e; }
}
async function insertWatch(userId: string, id: string, symbol = 'AAPL') {
  return db.query(`insert into public.watchlist(id,user_id,symbol,name,exchange,currency,timezone,baseline_at,baseline_timezone,baseline_price)
    values($1,$2,$3,'Apple','NASDAQ','USD','America/New_York','2026-11-01T06:30:00Z','America/New_York','0.12345678') returning *`,[id,userId,symbol]);
}
describe('real Postgres migration and authorization', () => {
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth; create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      grant usage on schema auth to authenticated, service_role; grant execute on function auth.uid() to authenticated, service_role;
      insert into auth.users values('${alice}'),('${bob}');`);
    await db.exec(migration);
    await db.exec(datesMigration);
    await db.exec(preparedMigration);
  },30000);
  afterAll(async () => { await db?.close(); });
  it('allows owner insert and preserves UTC and full decimal precision', async () => {
    const result = await asUser(alice, () => insertWatch(alice,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'));
    expect(result.rows[0]).toMatchObject({baseline_price:'0.12345678', revision:1, baseline_timezone:'America/New_York'});
  });
  it('hides Alice records from Bob and blocks reassignment on insert', async () => {
    const rows = await asUser(bob, () => db.query('select * from public.watchlist')); expect(rows.rows).toHaveLength(0);
    await expect(asUser(bob, () => insertWatch(alice,'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'))).rejects.toThrow();
  });
  it('returns prepared data only for the current account and the exact start date',async()=>{
    await db.exec('begin; set local role service_role;');
    await db.query('select public.market_prepared_put($1::jsonb)',[JSON.stringify([
      {key:'quote:AAPL:NASDAQ:USD:America/New_York',payload:{symbol:'AAPL',price:'123.456789'}},
      {key:'history:AAPL:NASDAQ:USD:America/New_York:2026-06-01',payload:{bars:[{date:'2026-06-01',close:'100'}]}},
    ])]);await db.exec('commit');
    const aliceResult=await asUser(alice,()=>db.query<{data:any}>('select public.monitor_workspace() as data'));
    expect(aliceResult.rows[0].data.watchlist).toHaveLength(1);
    expect(Object.values(aliceResult.rows[0].data.quotes)[0]).toMatchObject({price:'123.456789',cached:true,stale:true});
    const bobResult=await asUser(bob,()=>db.query<{data:any}>('select public.monitor_workspace() as data'));
    expect(bobResult.rows[0].data.watchlist).toHaveLength(0);
    expect(bobResult.rows[0].data.quotes).toEqual({});
    await expect(asUser(alice,()=>db.query('select public.market_prepared_put(\'[]\'::jsonb)'))).rejects.toThrow();
    await expect(asUser(alice,()=>db.query('select public.market_warm_instruments()'))).rejects.toThrow();
  });
  it('blocks cross-user update and delete', async () => {
    expect((await asUser(bob, () => db.query("update public.watchlist set notes='hacked' returning id"))).rows).toHaveLength(0);
    expect((await asUser(bob, () => db.query('delete from public.watchlist returning id'))).rows).toHaveLength(0);
  });
  it('increments server revision and rejects a stale editor', async () => {
    expect((await asUser(alice, () => db.query("update public.watchlist set notes='changed' where revision=1 returning revision"))).rows).toEqual([{revision:2}]);
    expect((await asUser(alice, () => db.query("update public.watchlist set notes='stale' where revision=1 returning id"))).rows).toHaveLength(0);
  });
  it('makes id and owner immutable', async () => { await expect(asUser(alice, () => db.query('update public.watchlist set user_id=$1',[bob]))).rejects.toThrow(); });
  it('rejects invalid time zones at the database boundary', async () => { await expect(asUser(alice, () => db.query("update public.watchlist set baseline_timezone='Mars/City'"))).rejects.toThrow('TIMEZONE'); });
  it('requires exact positive decimal syntax and calendar bounds', async () => {
    await expect(asUser(alice, () => db.query("update public.watchlist set baseline_price='NaN'"))).rejects.toThrow();
    await expect(asUser(alice, () => db.query("update public.watchlist set baseline_at='infinity'"))).rejects.toThrow();
  });
  it('blocks anonymous clients and access to private audit', async () => {
    await expect(db.exec('begin; set local role anon; select * from public.watchlist;')).rejects.toThrow(); await db.exec('rollback');
    await expect(asUser(alice, () => db.query('select * from private.record_audit'))).rejects.toThrow();
    expect((await db.query<{count:number}>('select count(*)::integer as count from private.record_audit')).rows[0].count).toBe(2);
  });
  it('protects shared cache RPCs from users', async () => { await expect(asUser(alice, () => db.query("select public.market_cache_get('secret')"))).rejects.toThrow(); });
  it('persists shared cache and performs atomic rate limiting for backend', async () => {
    await db.exec('begin; set local role service_role;');
    await db.query("select public.market_cache_put('test','{\"price\":\"1.23\"}',60)");
    expect((await db.query("select public.market_cache_get('test') as payload")).rows[0]).toEqual({payload:{price:'1.23'}});
    expect((await db.query("select public.market_rate_limit('test',1) as allowed")).rows[0]).toEqual({allowed:true});
    expect((await db.query("select public.market_rate_limit('test',1) as allowed")).rows[0]).toEqual({allowed:false});
    await db.exec('commit');
  });
  it('stores edits to exact trade quantities and repeated local times', async () => {
    const rows = await asUser(alice, () => db.query(`insert into public.trades(id,user_id,symbol,name,exchange,currency,timezone,side,quantity,price,fees,occurred_at,record_timezone)
      values('cccccccc-cccc-4ccc-8ccc-cccccccccccc',$1,'AAPL','Apple','NASDAQ','USD','America/New_York','buy','999999999999.12345678','0.00000001','0','2026-11-01T06:30:00Z','America/New_York') returning quantity`,[alice]));
    expect(rows.rows[0]).toEqual({quantity:'999999999999.12345678'});
    await asUser(alice, () => db.exec("update public.trades set occurred_at='2026-11-01T05:30:00Z' where revision=1"));
    expect((await asUser(bob, () => db.query('select * from public.trades'))).rows).toHaveLength(0);
  });
  it('updates a baseline atomically and rolls back a batch on conflict', async () => {
    const update = {id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',revision:2,baseline_date:'2026-07-01',baseline_session:'2026-07-01',baseline_at:'2026-07-01T04:00:00Z',baseline_timezone:'America/New_York',baseline_price:'100.12345678'};
    await asUser(alice,()=>db.query('select * from public.update_baseline_dates($1::jsonb,$2::date)',[JSON.stringify([update]),'2026-07-01']));
    expect((await asUser(alice,()=>db.query('select baseline_price,revision from public.watchlist'))).rows[0]).toMatchObject({baseline_price:'100.12345678',revision:3});
    const next={...update,revision:3,baseline_price:'200'};
    const missing={...next,id:'ffffffff-ffff-4fff-8fff-ffffffffffff'};
    await expect(asUser(alice,()=>db.query('select * from public.update_baseline_dates($1::jsonb,null)',[JSON.stringify([next,missing])]))).rejects.toThrow('CONFLICT');
    expect((await asUser(alice,()=>db.query('select baseline_price from public.watchlist'))).rows[0]).toMatchObject({baseline_price:'100.12345678'});
    await expect(asUser(bob,()=>db.query('select * from public.update_baseline_dates($1::jsonb,null)',[JSON.stringify([next])]))).rejects.toThrow('CONFLICT');
  });
});
