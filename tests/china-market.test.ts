import {describe,it,expect} from 'vitest';
import {chinaSearch,chinaQuote,chinaQuotes,chinaHistory} from '../supabase/functions/market-data/china';
const item={symbol:'AAPL',name:'Apple',exchange:'NASDAQ',currency:'USD',timezone:'America/New_York'};
function quote(){const f=Array(40).fill('');f[2]='AAPL.OQ';f[3]='110.12345678';f[4]='100';f[30]='2026-10-28 16:00:01';f[35]='USD';return 'v_usAAPL="'+f.join('~')+'";';}
describe('domestic public web quote adapter',()=>{
 it('maps batch quotes by stock identity and isolates missing or mismatched results',()=>{
  const results=chinaQuotes(quote(),[{...item,symbol:'MISSING'},item,{...item,exchange:'NYSE'}],'2026-10-28T20:01:00Z').quotes;
  expect(results[0]).toMatchObject({symbol:'MISSING',error:'MARKET_UNAVAILABLE'});
  expect(results[1]).toMatchObject({symbol:'AAPL',quote:{price:'110.12345678',exchange:'NASDAQ'}});
  expect(results[2]).toMatchObject({symbol:'AAPL',exchange:'NYSE',error:'IDENTITY_MISMATCH'});
 });
 it('splits Tencent search records and decodes Chinese names without eval',()=>{const r=chinaSearch('v_hint="us~aapl.oq~\\u82f9\\u679c~pg~GP^us~voo.am~Vanguard~GP^sh~600000~bank"');expect(r.instruments[0]).toMatchObject({symbol:'AAPL',name:'苹果',exchange:'NASDAQ'});expect(r.instruments[1].exchange).toBe('AMEX');expect(r.instruments).toHaveLength(2);});
 it('preserves price decimals and converts exchange-local time to UTC',()=>{const r=chinaQuote(quote(),item,'2026-10-28T20:01:00Z');expect(r.price).toBe('110.12345678');expect(r.as_of).toBe('2026-10-28T20:00:01Z');expect(r.change_percent).toBe('10.12');expect(r.market_open).toBeNull();});
 it('rejects symbol/exchange collisions rather than guessing a market',()=>{expect(()=>chinaQuote(quote(),{...item,exchange:'NYSE'})).toThrow('IDENTITY_MISMATCH');});
 it('does not create a quote when upstream data is missing or zero',()=>{expect(()=>chinaQuote('v_pv_none_match="1"',item)).toThrow();expect(()=>chinaQuote(quote().replace('110.12345678','0'),item)).toThrow();});
 it('retains open and close and filters by complete dates',()=>{const text='/* comment */ var _=([{ "d":"2026-06-01", "o":"100.12345678", "c":"101" },{ "d":"2026-06-02", "o":"101", "c":"99" }]);';const r=chinaHistory(text,item,'2026-06-01','2026-10-29T00:00:00Z');expect(r.bars[0].open).toBe('100.12345678');expect(r.bars).toHaveLength(2);expect(r.price_adjustment).toBe('provider_unspecified');});
 it('rejects executable/malformed JSONP, duplicates and missing opens',()=>{expect(()=>chinaHistory('var _=(evil());',item,'2026-06-01')).toThrow();expect(()=>chinaHistory('var _=([{ "d":"2026-06-01", "c":"100" }]);',item,'2026-06-01')).toThrow();const row='{ "d":"2026-06-01", "o":"100", "c":"100" }';expect(()=>chinaHistory('var _=(['+row+','+row+']);',item,'2026-06-01')).toThrow();});
});
