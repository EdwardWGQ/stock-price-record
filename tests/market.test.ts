import { describe, it, expect } from 'vitest';
import { normalizeQuote, normalizeHistory, requestSchema } from '../supabase/functions/market-data/core';
import { configuredOrigins } from '../supabase/functions/market-data/config';
const selected = { symbol:'AAPL', name:'Apple', exchange:'NASDAQ', currency:'USD', timezone:'America/New_York' };
const now = '2026-10-29T14:00:00Z';
const raw = { ...selected, close:'0.12345678', percent_change:'1.25', timestamp: new Date(now).getTime()/1000, is_market_open:true };
describe('provider validation', () => {
  it('allows only the deployed origin by default and honors an explicit override', () => {
    expect(configuredOrigins('')).toEqual(['https://stock-atlas.pages.dev']);
    expect(configuredOrigins('https://stocks.example.com, https://test.example.com')).toEqual(['https://stocks.example.com','https://test.example.com']);
    expect(configuredOrigins('')).not.toContain('https://evil.example.com');
  });
  it('preserves decimal strings and quote timestamp', () => { const q = normalizeQuote(raw,selected,now); expect(q.price).toBe('0.12345678'); expect(q.as_of).toBe(now.replace('Z','.000Z')); expect(q.stale).toBe(false); });
  it('rejects exchange and currency collisions', () => { expect(() => normalizeQuote({ ...raw, exchange:'LSE' },selected,now)).toThrow('IDENTITY_MISMATCH'); expect(() => normalizeQuote({ ...raw, currency:'EUR' },selected,now)).toThrow('IDENTITY_MISMATCH'); });
  it('rejects invalid/missing prices and future provider clocks', () => { expect(() => normalizeQuote({ ...raw, close:null },selected,now)).toThrow(); expect(() => normalizeQuote({ ...raw, timestamp: raw.timestamp+3600 },selected,now)).toThrow(); });
  it('marks older data as stale', () => { expect(normalizeQuote({ ...raw, timestamp: raw.timestamp-3600 },selected,now).stale).toBe(true); });
  it('uses last actual quote time instead of the opening candle', () => { expect(normalizeQuote({ ...raw, timestamp: raw.timestamp-3600, last_quote_at: raw.timestamp },selected,now).stale).toBe(false); });
  it('sorts daily bars with explicit dates, without shifting weekends', () => { const history = normalizeHistory({ meta:selected, values:[{datetime:'2026-06-02',close:'103'},{datetime:'2026-06-01',close:'100'}] },selected,'2026-05-31'); expect(history.bars[0]).toEqual({date:'2026-06-01',close:'100'}); });
  it('rejects invalid calendar dates', () => { expect(requestSchema.safeParse({ action:'history', instrument:selected, start:'2026-02-30' }).success).toBe(false); });
});
