import {describe,it,expect} from 'vitest';
import {baselineFromBars,returnSeries,validDate} from '../src/lib/baseline';
import {initialDemo} from '../src/lib/demo';
describe('original monitor baseline dates',()=>{
 it('uses first session OPEN rather than its close',()=>{expect(baselineFromBars('2026-07-01',[{date:'2026-07-01',open:'100',close:'110'}]).price).toBe('100');});
 it('makes a weekend rollover explicit',()=>{expect(baselineFromBars('2026-07-04',[{date:'2026-07-06',open:'101',close:'102'}])).toMatchObject({date:'2026-07-04',session:'2026-07-06',price:'101'});});
 it('rejects missing open prices instead of guessing',()=>{expect(()=>baselineFromBars('2026-07-01',[{date:'2026-07-01',close:'100'}])).toThrow('OPEN_MISSING');});
 it('matches dates and leaves missing sessions empty',()=>{const item={...initialDemo().watchlist[0],baseline_date:'2026-07-01',baseline_price:'100'};expect(returnSeries(item,[{date:'2026-07-01',close:'110'},{date:'2026-07-03',close:'90'}],['2026-06-30','2026-07-01','2026-07-02','2026-07-03'])).toEqual([null,10,null,-10]);});
 it('rejects invalid dates and future dates',()=>{expect(validDate('2026-02-30')).toBe(false);expect(validDate('2099-01-01')).toBe(false);});
});
