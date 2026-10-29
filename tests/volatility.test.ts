import {describe,it,expect} from 'vitest';
import {officialVolatility} from '../supabase/functions/market-data/volatility';
describe('official index histories',()=>{
 it('calculates daily, five-session and average data without requiring an equity API key',()=>{
  const data=officialVolatility('VXN','DATE,OPEN,HIGH,LOW,CLOSE\n10/27/2026,0,0,0,24.91\n10/28/2026,0,0,0,23.78','2026-10-29T01:00:00Z');
  expect(data.value).toBe('23.78');expect(data.change_percent).toBe('-4.54');expect(data.as_of).toBe('2026-10-28');expect(data.stale).toBe(false);expect(data.source).toContain('Cboe');
 });
 it('rejects missing/invalid data instead of returning zero',()=>{expect(()=>officialVolatility('VIX','DATE,CLOSE\n10/28/2026,NaN')).toThrow('MARKET_UNAVAILABLE');});
 it('marks outdated official closes stale',()=>{expect(officialVolatility('VIX','DATE,CLOSE\n10/20/2026,20\n10/21/2026,21','2026-10-29T01:00:00Z').stale).toBe(true);});
});
