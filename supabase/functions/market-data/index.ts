import { createClient } from '@supabase/supabase-js';
import { requestSchema, normalizeQuote, normalizeHistory, searchResults } from './core.ts';
import { configuredOrigins } from './config.ts';
import { officialVolatility } from './volatility.ts';

const env = (name: string) => Deno.env.get(name) ?? '';
function platformKey(kind: 'PUBLISHABLE' | 'SECRET') {
  const explicit = env(kind === 'PUBLISHABLE' ? 'APP_SUPABASE_PUBLISHABLE_KEY' : 'APP_SUPABASE_SECRET_KEY');
  if (explicit) return explicit;
  const json = env(`SUPABASE_${kind}_KEYS`);
  if (json) { try { return JSON.parse(json).default ?? ''; } catch { return ''; } }
  return env(kind === 'PUBLISHABLE' ? 'SUPABASE_ANON_KEY' : 'SUPABASE_SERVICE_ROLE_KEY');
}
const allowedOrigins = configuredOrigins(env('ALLOWED_ORIGINS'));
const admin = createClient(env('SUPABASE_URL'), platformKey('SECRET'), { auth: { persistSession: false, autoRefreshToken: false } });
async function rpc<T>(name: string, params: Record<string, unknown>): Promise<T> {
  const { data, error } = await admin.rpc(name, params); if (error) throw new Error('BACKEND'); return data as T;
}
async function allowed(key: string, limit: number) { return rpc<boolean>('market_rate_limit', { p_key: key, p_limit: limit }); }
function response(value: unknown, status: number, origin: string | null) {
  const headers: Record<string,string> = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Vary': 'Origin' };
  if (origin && allowedOrigins.includes(origin)) { headers['Access-Control-Allow-Origin'] = origin; headers['Access-Control-Allow-Headers'] = 'authorization, apikey, content-type, x-client-info'; headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS'; }
  if (status === 429) headers['Retry-After'] = '60';
  return new Response(JSON.stringify(value), { status, headers });
}

Deno.serve(async req => {
  const origin = req.headers.get('Origin');
  if (origin && !allowedOrigins.includes(origin)) return response({ error: 'ORIGIN' }, 403, null);
  if (req.method === 'OPTIONS') return response({}, 200, origin);
  if (req.method !== 'POST') return response({ error: 'METHOD' }, 405, origin);
  if (Number(req.headers.get('content-length')) > 8192) return response({ error: 'BODY_LIMIT' }, 413, origin);
  const authorization = req.headers.get('Authorization') ?? '';
  if (!/^Bearer [A-Za-z0-9_.-]+$/.test(authorization)) return response({ error: 'AUTH' }, 401, origin);
  const userClient = createClient(env('SUPABASE_URL'), platformKey('PUBLISHABLE'), { global: { headers: { Authorization: authorization } }, auth: { persistSession: false, autoRefreshToken: false } });
  const auth = await userClient.auth.getUser(authorization.slice(7));
  if (auth.error || !auth.data.user || auth.data.user.is_anonymous) return response({ error: 'AUTH' }, 401, origin);
  try {
    // Streaming body size bound also covers chunked requests.
    const reader = req.body?.getReader(); if (!reader) return response({ error: 'VALIDATION' }, 400, origin);
    let bytes = 0; const chunks: Uint8Array[] = [];
    for (;;) { const chunk = await reader.read(); if (chunk.done) break; bytes += chunk.value.length; if (bytes > 8192) { await reader.cancel(); return response({ error: 'BODY_LIMIT' }, 413, origin); } chunks.push(chunk.value); }
    const all = new Uint8Array(bytes); let offset = 0; for (const c of chunks) { all.set(c, offset); offset += c.length; }
    const parsed = requestSchema.safeParse(JSON.parse(new TextDecoder().decode(all)));
    if (!parsed.success) return response({ error: 'VALIDATION' }, 400, origin);
    if (!await allowed(`user:${auth.data.user.id}`, 120)) return response({ error: 'RATE_LIMIT' }, 429, origin);
    const input = parsed.data;
    if (input.action === 'volatility') {
      const cacheKey='cboe:daily:'+input.symbol;
      const cached=await rpc<unknown>('market_cache_get',{p_key:cacheKey});
      if(cached)return response(cached,200,origin);
      if(!await allowed('upstream:cboe',12))return response({error:'RATE_LIMIT'},429,origin);
      const provider=await fetch('https://cdn.cboe.com/api/global/us_indices/daily_prices/'+input.symbol+'_History.csv',{signal:AbortSignal.timeout(15000)});
      if(!provider.ok)throw new Error('MARKET_UNAVAILABLE');
      const data=officialVolatility(input.symbol,await provider.text());
      await rpc('market_cache_put',{p_key:cacheKey,p_payload:data,p_ttl:3600});
      return response(data,200,origin);
    }
    const cacheKey = 'v2:' + (input.action === 'search'
      ? JSON.stringify({ action: input.action, query: input.query.toUpperCase() })
      : JSON.stringify({ action: input.action, symbol: input.instrument.symbol, exchange: input.instrument.exchange, currency: input.instrument.currency, ...(input.action === 'history' ? { start: input.start } : {}) }));
    const cached = await rpc<unknown>('market_cache_get', { p_key: cacheKey });
    if (cached) return response(cached, 200, origin);
    if (!env('TWELVE_DATA_API_KEY')) return response({ error: 'MARKET_CONFIG' }, 503, origin);
    const budget = Math.min(10000, Math.max(1, Number(env('MARKET_UPSTREAM_PER_MINUTE') || '8')));
    if (!Number.isInteger(budget)) throw new Error('MARKET_CONFIG');
    if (!await allowed('upstream:all', budget)) return response({ error: 'RATE_LIMIT' }, 429, origin);
    const url = new URL(`https://api.twelvedata.com/${input.action === 'search' ? 'symbol_search' : input.action === 'quote' ? 'quote' : 'time_series'}`);
    url.searchParams.set('apikey', env('TWELVE_DATA_API_KEY'));
    if (input.action === 'search') { url.searchParams.set('symbol', input.query); url.searchParams.set('outputsize', '30'); }
    else {
      url.searchParams.set('symbol', input.instrument.symbol); url.searchParams.set('exchange', input.instrument.exchange);
      if (input.action === 'quote') url.searchParams.set('timezone', 'UTC');
      else { url.searchParams.set('interval', '1day'); url.searchParams.set('start_date', input.start); url.searchParams.set('outputsize', '5000'); url.searchParams.set('order', 'asc'); url.searchParams.set('timezone', 'Exchange'); url.searchParams.set('adjust', 'none'); }
    }
    const provider = await fetch(url, { signal: AbortSignal.timeout(12000) });
    if (provider.status === 429) throw new Error('RATE_LIMIT');
    if (!provider.ok) throw new Error('MARKET_UNAVAILABLE');
    const raw = await provider.json();
    if (raw.status === 'error') throw new Error(raw.code === 429 ? 'RATE_LIMIT' : 'MARKET_UNAVAILABLE');
    const data = input.action === 'search' ? searchResults(raw) : input.action === 'quote' ? normalizeQuote(raw, input.instrument) : normalizeHistory(raw, input.instrument, input.start);
    await rpc('market_cache_put', { p_key: cacheKey, p_payload: data, p_ttl: input.action === 'search' ? 3600 : input.action === 'quote' ? 60 : 1800 });
    return response(data, 200, origin);
  } catch (e) {
    const code = e instanceof Error ? e.message : 'BACKEND';
    const safeCodes = ['RATE_LIMIT','MARKET_CONFIG','MARKET_UNAVAILABLE','IDENTITY_MISMATCH','HISTORY_EMPTY'];
    const safe = safeCodes.includes(code) ? code : 'BACKEND';
    // Do not log provider URL/body: URLs contain the provider key.
    console.error(JSON.stringify({ event: 'market_request_failed', code: safe }));
    return response({ error: safe }, safe === 'RATE_LIMIT' ? 429 : safe === 'HISTORY_EMPTY' ? 404 : 503, origin);
  }
});
