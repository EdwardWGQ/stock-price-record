import {describe,it,expect,beforeAll,afterAll} from 'vitest';
import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';

const admin='11111111-1111-4111-8111-111111111111',member='22222222-2222-4222-8222-222222222222';
const migrations=['20261029075050_stock_atlas.sql','20261029085308_baseline_dates.sql','20261030043502_prepared_market_workspace.sql','20261112041023_admin_workspace.sql'];
let db:PGlite;
async function asUser<T>(id:string,work:()=>Promise<T>,role='authenticated'){
 await db.exec(`begin;set local role ${role};`);
 await db.query("select set_config('request.jwt.claim.sub',$1,true)",[id]);
 try{const result=await work();await db.exec('commit');return result;}catch(error){await db.exec('rollback');throw error;}
}
const overview=()=>db.query<{data:any}>("select public.admin_overview('',0) as data");
const detail=()=>db.query<{data:any}>('select public.admin_user_detail($1,0) as data',[member]);

describe('database-enforced read-only administration',()=>{
 beforeAll(async()=>{
  db=new PGlite();
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
   create schema auth;create table auth.users(id uuid primary key,email text,phone text,raw_user_meta_data jsonb default '{}',raw_app_meta_data jsonb default '{}',encrypted_password text,created_at timestamptz default now(),updated_at timestamptz default now(),last_sign_in_at timestamptz,email_confirmed_at timestamptz,deleted_at timestamptz,banned_until timestamptz);
   create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
   grant usage on schema auth to authenticated,service_role;grant execute on function auth.uid() to authenticated,service_role;
   insert into auth.users(id,email,email_confirmed_at,encrypted_password) values('${admin}','admin@example.com',now(),'PASSWORD_MUST_NOT_LEAK'),('${member}','member@example.com',now(),'PASSWORD_MUST_NOT_LEAK');`);
  for(const file of migrations)await db.exec(readFileSync(new URL('../supabase/migrations/'+file,import.meta.url),'utf8'));
  await db.query('insert into private.site_admins(user_id) values($1)',[admin]);
  await db.query(`insert into public.watchlist(id,user_id,symbol,name,exchange,currency,timezone,baseline_at,baseline_timezone,notes) values
   ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',$1,'AAPL','Apple','NASDAQ','USD','America/New_York','2026-06-01T04:00:00Z','America/New_York','Private watch note')`,[member]);
  await db.query(`insert into public.trades(id,user_id,symbol,name,exchange,currency,timezone,side,quantity,price,fees,occurred_at,record_timezone,notes) values
   ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',$1,'AAPL','Apple','NASDAQ','USD','America/New_York','buy','0.3','200','1','2026-11-09T14:30:00Z','Asia/Shanghai','Monthly DCA'),
   ('cccccccc-cccc-4ccc-8ccc-cccccccccccc',$1,'AAPL','Apple','NASDAQ','USD','America/New_York','sell','0.1','210','0.5','2026-11-10T14:30:00Z','Asia/Shanghai','Sold part')`,[member]);
 },30000);
 afterAll(async()=>{await db?.close();});
 it('returns role status from protected membership, without trusting editable metadata',async()=>{
  expect((await asUser(admin,()=>db.query('select public.admin_status() as allowed'))).rows).toEqual([{allowed:true}]);
  await db.query(`update auth.users set raw_user_meta_data='{"admin":true,"role":"admin"}',raw_app_meta_data='{"role":"admin"}' where id=$1`,[member]);
  expect((await asUser(member,()=>db.query('select public.admin_status() as allowed'))).rows).toEqual([{allowed:false}]);
  await expect(asUser(member,overview)).rejects.toThrow('ADMIN_FORBIDDEN');
 });
 it('lets the administrator read account and stock data through dedicated RPCs with explicit account fields',async()=>{
  const data=(await asUser(admin,overview)).rows[0].data;
  expect(data).toMatchObject({user_count:2,watch_count:1,trade_count:2});
  expect(data.users).toHaveLength(2);
  expect(data.recent_trades[0]).toMatchObject({email:'member@example.com',record_timezone:'Asia/Shanghai'});
  expect(JSON.stringify(data)).not.toContain('PASSWORD_MUST_NOT_LEAK');
  expect(JSON.stringify(data)).not.toContain('raw_app_meta_data');
  const user=(await asUser(admin,detail)).rows[0].data;
  expect(user.user.email).toBe('member@example.com');
  expect(user.watchlist[0].notes).toBe('Private watch note');
  expect(user.trades).toHaveLength(2);
  expect(user.positions[0]).toMatchObject({quantity:'0.2',bought_quantity:'0.3',sold_quantity:'0.1',trade_count:2});
 });
 it('rejects nonadmins and anonymous callers even when they invoke private implementations directly',async()=>{
  await expect(asUser(member,detail)).rejects.toThrow('ADMIN_FORBIDDEN');
  await expect(asUser(member,()=>db.query('select private.admin_overview(\'\',0)'))).rejects.toThrow('ADMIN_FORBIDDEN');
  await expect(asUser(member,()=>db.query('select private.admin_user_detail($1,0)',[member]))).rejects.toThrow('ADMIN_FORBIDDEN');
  await expect(asUser('',overview,'anon')).rejects.toThrow();
  await expect(asUser('',()=>db.query('select public.admin_status()'),'anon')).rejects.toThrow();
 });
 it('prevents self-promotion and preserves owner-only direct read, update and delete policies for administrators',async()=>{
  await expect(asUser(member,()=>db.query('insert into private.site_admins(user_id) values($1)',[member]))).rejects.toThrow();
  await expect(asUser(admin,()=>db.query('select * from private.site_admins'))).rejects.toThrow();
  expect((await asUser(admin,()=>db.query('select * from public.trades'))).rows).toHaveLength(0);
  expect((await asUser(admin,()=>db.query("update public.trades set notes='changed' returning id"))).rows).toHaveLength(0);
  expect((await asUser(admin,()=>db.query('delete from public.watchlist returning id'))).rows).toHaveLength(0);
  expect((await asUser(member,()=>db.query('select * from public.trades'))).rows).toHaveLength(2);
 });
 it('immediately denies a revoked, banned or unverified administrator',async()=>{
  await db.query('update auth.users set banned_until=now()+interval \'1 day\' where id=$1',[admin]);
  await expect(asUser(admin,overview)).rejects.toThrow('ADMIN_FORBIDDEN');
  await db.query('update auth.users set banned_until=null,email_confirmed_at=null where id=$1',[admin]);
  await expect(asUser(admin,detail)).rejects.toThrow('ADMIN_FORBIDDEN');
  await db.query('update auth.users set email_confirmed_at=now() where id=$1',[admin]);
  await db.query('delete from private.site_admins where user_id=$1',[admin]);
  await expect(asUser(admin,overview)).rejects.toThrow('ADMIN_FORBIDDEN');
  await db.query('insert into private.site_admins(user_id) values($1)',[admin]);
 });
 it('validates pagination, treats search as literal data and returns a clear missing-user error',async()=>{
  await expect(asUser(admin,()=>db.query('select public.admin_overview(\'\',-1)'))).rejects.toThrow('VALIDATION');
  const result=await asUser(admin,()=>db.query<{data:any}>('select public.admin_overview($1,0) as data',["%' OR true --"]));
  expect(result.rows[0].data.users).toEqual([]);
  await expect(asUser(admin,()=>db.query('select public.admin_user_detail($1,0)',['33333333-3333-4333-8333-333333333333']))).rejects.toThrow('USER_NOT_FOUND');
 });
 it('paginates long trade histories while computing positions from all records',async()=>{
  await db.query(`insert into public.trades(id,user_id,symbol,name,exchange,currency,timezone,side,quantity,price,fees,occurred_at,record_timezone)
   select md5('admin-page-'||n)::uuid,$1,'MSFT','Microsoft','NASDAQ','USD','America/New_York','buy','0.01','100','0','2026-11-11T14:30:00Z','Asia/Shanghai' from generate_series(1,101) n`,[member]);
  const first=(await asUser(admin,detail)).rows[0].data;
  const next=(await asUser(admin,()=>db.query<{data:any}>('select public.admin_user_detail($1,100) as data',[member]))).rows[0].data;
  expect(first.trade_count).toBe(103);expect(first.trades).toHaveLength(100);expect(next.trades).toHaveLength(3);
  expect(new Set([...first.trades,...next.trades].map((row:{id:string})=>row.id)).size).toBe(103);
  expect(first.positions.find((row:{symbol:string})=>row.symbol==='MSFT').quantity).toBe('1.01');
 });
});
