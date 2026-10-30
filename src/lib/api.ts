import { supabase } from './client';
import { watchSchema, tradeSchema, instrumentSchema } from './validation';
import type { WatchItem, Trade, Profile, WatchInput, TradeInput, Instrument, Quote, Bar, Volatility, HistoryResult } from './types';
import {parallelEach} from './parallel';
const client = () => { if (!supabase) throw new Error('CONFIG'); if (!navigator.onLine) throw new Error('OFFLINE'); return supabase; };
function unwrap<T>(result: { data: T | null; error: { message: string } | null }): T { if (result.error) throw new Error(result.error.message); return result.data as T; }
export async function loadRecords() {
  const db = client();
  const results = await Promise.allSettled([
    db.from('watchlist').select('*').order('created_at', { ascending: true }),
    db.from('trades').select('*').order('occurred_at', { ascending: false }).order('id').range(0, 99),
    db.from('profiles').select('*').maybeSingle(),
  ]);
  const values = results.map(result => { if (result.status === 'rejected') throw result.reason; return unwrap(result.value); });
  return { watchlist: values[0] as WatchItem[], trades: values[1] as Trade[], profile: values[2] as Profile | null };
}
export async function saveWatch(input: WatchInput, userId: string, revision?: number): Promise<WatchItem> {
  const data = watchSchema.parse(input); const db = client();
  const query = revision === undefined ? db.from('watchlist').insert({ ...data, user_id: userId }) : db.from('watchlist').update(data).eq('id', input.id).eq('revision', revision);
  const rows = unwrap(await query.select('*')) as WatchItem[];
  if (rows.length !== 1) throw new Error('CONFLICT'); return rows[0];
}
export async function saveTrade(input: TradeInput, userId: string, revision?: number): Promise<Trade> {
  const data = tradeSchema.parse(input); const db = client();
  const query = revision === undefined ? db.from('trades').insert({ ...data, user_id: userId }) : db.from('trades').update(data).eq('id', input.id).eq('revision', revision);
  const rows = unwrap(await query.select('*')) as Trade[];
  if (rows.length !== 1) throw new Error('CONFLICT'); return rows[0];
}
export async function deleteRecord(table: 'watchlist' | 'trades', id: string, revision: number) {
  const rows = unwrap(await client().from(table).delete().eq('id', id).eq('revision', revision).select('id'));
  if (!rows || rows.length !== 1) throw new Error('CONFLICT');
}
export async function saveProfile(profile: Pick<Profile, 'user_id' | 'language' | 'timezone'>) { unwrap(await client().from('profiles').upsert(profile)); }
export async function olderTrades(last: Pick<Trade, 'id' | 'occurred_at'>): Promise<Trade[]> {
  const id = tradeSchema.shape.id.parse(last.id);
  const time = tradeSchema.shape.occurred_at.parse(last.occurred_at);
  // Stable keyset pagination avoids duplicates/skips when newer rows are added.
  return unwrap(await client().from('trades').select('*')
    .or(`occurred_at.lt.${time},and(occurred_at.eq.${time},id.gt.${id})`)
    .order('occurred_at', { ascending: false }).order('id').limit(100));
}
export async function exportAll() {
  const db = client(); const watchlist = unwrap(await db.from('watchlist').select('*').order('id')) as WatchItem[];
  const trades: Trade[] = []; let after: string | null = null;
  for (;;) {
    let query = db.from('trades').select('*').order('id').limit(500);
    if (after) query = query.gt('id', after);
    const batch = unwrap(await query) as Trade[]; trades.push(...batch);
    if (batch.length < 500) break; after = batch[batch.length - 1].id;
  }
  return { version: 1, exported_at: new Date().toISOString(), watchlist, trades };
}
export async function marketRequest<T>(body: Record<string, unknown>): Promise<T> {
  const result = await client().functions.invoke('market-data', { body, timeout: 25000 });
  if (result.error) {
    const context = (result.error as { context?: Response }).context;
    if (context instanceof Response) { const detail = await context.json().catch(() => null); throw new Error(detail?.error ?? 'MARKET_UNAVAILABLE'); }
    throw new Error('MARKET_UNAVAILABLE');
  }
  if (result.data?.error) throw new Error(result.data.error);
  return result.data as T;
}
export async function searchInstruments(query: string): Promise<Instrument[]> {
  const result = await marketRequest<{ instruments: unknown[] }>({ action: 'search', query });
  return result.instruments.flatMap(value => { const parsed = instrumentSchema.safeParse(value); return parsed.success ? [parsed.data] : []; });
}
export async function fetchQuote(instrument: Instrument): Promise<Quote> { return marketRequest({ action: 'quote', instrument }); }
export interface QuoteResult {symbol:string;exchange:string;quote?:Quote;error?:string}
export async function fetchQuotes(instruments:Instrument[]):Promise<QuoteResult[]> {
 try {
  const data=await marketRequest<{quotes:QuoteResult[]}>({action:'quotes',instruments:instruments.map(({symbol,name,exchange,currency,timezone})=>({symbol,name,exchange,currency,timezone}))});
  if(!Array.isArray(data.quotes))throw new Error('MARKET_UNAVAILABLE');
  return data.quotes;
 }catch(cause) {
  // The configured paid provider uses its existing single-instrument endpoint.
  if(!(cause instanceof Error)||cause.message!=='MARKET_CONFIG')throw cause;
  const results:QuoteResult[]=[];
  await parallelEach(instruments,4,async item=>{
   try{results.push({symbol:item.symbol,exchange:item.exchange,quote:await fetchQuote(item)});}
   catch(error){results.push({symbol:item.symbol,exchange:item.exchange,error:error instanceof Error?error.message:'MARKET_UNAVAILABLE'});}
  });
  return results;
 }
}
export async function fetchVolatility(symbol:'VIX'|'VXN'):Promise<Volatility>{return marketRequest({action:'volatility',symbol});}
export async function fetchHistory(instrument: Instrument, start: string) { return marketRequest<HistoryResult>({ action: 'history', instrument, start }); }
export interface BaselineUpdate { id: string; revision: number; baseline_date: string; baseline_session: string; baseline_at: string; baseline_timezone: string; baseline_price: string }
export async function updateBaselines(updates: BaselineUpdate[], defaultDate: string | null): Promise<WatchItem[]> {
  return unwrap(await client().rpc('update_baseline_dates',{p_updates:updates,p_default_date:defaultDate}));
}
