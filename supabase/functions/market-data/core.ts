import { z } from 'zod';
import { Decimal } from 'decimal.js';
import { Temporal } from '@js-temporal/polyfill';

const zoneValid = (v: string) => { try { new Intl.DateTimeFormat('en', { timeZone: v }); return true; } catch { return false; } };
export const instrument = z.object({ symbol: z.string().regex(/^[A-Z0-9^.=_/-]{1,24}$/), name: z.string().min(1).max(160), exchange: z.string().regex(/^[A-Za-z0-9 _.-]{1,64}$/), currency: z.string().regex(/^[A-Z]{3}$/), timezone: z.string().refine(zoneValid) });
export const requestSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('volatility'), symbol: z.enum(['VIX','VXN']) }),
  z.object({ action: z.literal('search'), query: z.string().trim().min(1).max(80) }),
  z.object({ action: z.literal('quote'), instrument }),
  z.object({ action: z.literal('history'), instrument, start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v => { try { Temporal.PlainDate.from(v, { overflow: 'reject' }); return v >= '1900-01-01' && v <= '2100-12-31'; } catch { return false; } }) }),
]);
export type MarketRequest = z.infer<typeof requestSchema>;
function decimal(v: unknown, positive = true): string {
  if (typeof v !== 'string' && typeof v !== 'number') throw new Error('MARKET_UNAVAILABLE');
  if (!/^-?\d+(\.\d+)?$/.test(String(v))) throw new Error('MARKET_UNAVAILABLE');
  const d = new Decimal(v); if (!d.isFinite() || (positive && d.lte(0))) throw new Error('MARKET_UNAVAILABLE'); return d.toFixed();
}
function identity(data: Record<string, unknown>, selected: z.infer<typeof instrument>) {
  const exchange = String(data.exchange ?? '');
  // Refuse same-symbol collisions instead of making an exchange/currency guess.
  if (data.symbol !== selected.symbol || exchange !== selected.exchange || data.currency !== selected.currency) throw new Error('IDENTITY_MISMATCH');
}
export function normalizeQuote(raw: Record<string, unknown>, selected: z.infer<typeof instrument>, now = new Date().toISOString()) {
  identity(raw, selected);
  const providerTime = raw.last_quote_at ?? raw.timestamp;
  const timestamp = typeof providerTime === 'number' || typeof providerTime === 'string' ? Number(providerTime) : NaN;
  if (!Number.isFinite(timestamp) || timestamp < 0) throw new Error('MARKET_UNAVAILABLE');
  const asOf = new Date(timestamp * 1000).toISOString();
  if (new Date(asOf).getTime() > new Date(now).getTime() + 300000) throw new Error('MARKET_UNAVAILABLE');
  return { symbol: selected.symbol, exchange: selected.exchange, currency: selected.currency,
    price: decimal(raw.close), change_percent: decimal(raw.percent_change, false), as_of: asOf,
    fetched_at: now, market_open: typeof raw.is_market_open === 'boolean' ? raw.is_market_open : null,
    source: 'Twelve Data', stale: new Date(now).getTime() - new Date(asOf).getTime() > 15 * 60000 };
}
export function normalizeHistory(raw: Record<string, unknown>, selected: z.infer<typeof instrument>, start: string) {
  const meta = raw.meta as Record<string, unknown> | undefined; if (!meta) throw new Error('MARKET_UNAVAILABLE'); identity(meta, selected);
  if (!Array.isArray(raw.values)) throw new Error('HISTORY_EMPTY');
  const bars = raw.values.map((v: Record<string, unknown>) => {
    const date = String(v.datetime ?? ''); if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('MARKET_UNAVAILABLE');
    Temporal.PlainDate.from(date, { overflow: 'reject' }); return { date, ...(v.open !== undefined ? {open:decimal(v.open)} : {}), close: decimal(v.close) };
  }).filter(b => b.date >= start).sort((a,b) => a.date.localeCompare(b.date));
  if (new Set(bars.map(b => b.date)).size !== bars.length) throw new Error('MARKET_UNAVAILABLE');
  return { bars, currency: selected.currency, exchange: selected.exchange };
}
export function searchResults(raw: Record<string, unknown>) {
  if (!Array.isArray(raw.data)) throw new Error('MARKET_UNAVAILABLE');
  return { instruments: raw.data.slice(0,30).flatMap(row => {
    const parsed = instrument.safeParse({ symbol: row.symbol, name: row.instrument_name, exchange: row.exchange, currency: row.currency, timezone: row.exchange_timezone });
    return parsed.success && ['Common Stock','ETF','Index','Preferred Stock','Depositary Receipt'].includes(row.instrument_type) ? [parsed.data] : [];
  }) };
}
