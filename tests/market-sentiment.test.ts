import {describe,it,expect} from 'vitest';
import {indexSentiment,marketSentiment,sentimentMetrics} from '../src/lib/market-sentiment';
import {barsFrom,sentimentFixture} from './fixtures/sentiment';

const vix={bars:sentimentFixture.VIX},vxn={bars:sentimentFixture.VXN};
describe('individual index sentiment',()=>{
 it('uses each index’s own screenshot metrics',()=>{
  expect(indexSentiment(vix).regime).toBe('easing-elevated');
  expect(indexSentiment(vxn).regime).toBe('easing-elevated');
  expect(indexSentiment(vxn).metrics!.aboveAverage).toBeCloseTo(6.782,2);
 });
 it('allows independent rising and easing assessments when the combined signal is mixed',()=>{
  const rising={bars:barsFrom(Array.from({length:20},(_,i)=>15+i))};
  expect(indexSentiment(rising).regime).toBe('rising');
  expect(indexSentiment(vxn).regime).toBe('easing-elevated');
  expect(marketSentiment(rising,vxn).regime).toBe('mixed');
 });
 it('assesses a high absolute VXN level relative to its own history',()=>{
  const falling={bars:barsFrom(Array.from({length:20},(_,i)=>80-i))};
  expect(indexSentiment(falling).regime).toBe('easing');
  expect(indexSentiment(falling).metrics!.value).toBeGreaterThan(30);
 });
 it('withholds only the unavailable or stale index’s assessment',()=>{
  expect(indexSentiment().regime).toBe('unavailable');
  expect(indexSentiment({...vix,stale:true}).regime).toBe('stale');
  expect(indexSentiment(vxn).regime).toBe('easing-elevated');
  expect(indexSentiment({bars:vix.bars.slice(-6)}).regime).toBe('insufficient');
 });
 it('identifies an individual reversal and a flat trend',()=>{
  const reversal={bars:barsFrom([...Array<number>(19).fill(15),14])};
  reversal.bars[14].close='13';
  expect(indexSentiment(reversal).regime).toBe('mixed');
  expect(indexSentiment({bars:barsFrom(Array<number>(20).fill(20))}).regime).toBe('neutral');
 });
});
describe('market sentiment',()=>{
 it('interprets the screenshot as easing while still above each index’s own average',()=>{
  const result=marketSentiment(vix,vxn);
  expect(result.regime).toBe('easing-elevated');
  expect(result.vix!.daily).toBeCloseTo(-22.3089,3);
  expect(result.vix!.aboveAverage).toBeCloseTo(4.493,2);
  expect(result.vxn!.aboveAverage).toBeCloseTo(6.782,2);
 });
 it('does not compare the absolute VXN level with VIX to assess sentiment',()=>{
  const scaled={bars:sentimentFixture.VIX.map(bar=>({...bar,close:String(Number(bar.close)*2)}))};
  const result=marketSentiment(vix,scaled);
  expect(result.regime).toBe('easing-elevated');
  expect(result.vxn!.aboveAverage).toBeCloseTo(result.vix!.aboveAverage!);
 });
 it('withholds a combined assessment for missing or invalid data',()=>{
  expect(marketSentiment(vix).regime).toBe('unavailable');
  for(const value of ['NaN','Infinity','0','-1',''])expect(sentimentMetrics({bars:[{date:'2026-11-09',close:value}]})).toBeNull();
  expect(sentimentMetrics({bars:[...vix.bars,{date:'2026-11-09',close:'20'}]})).toBeNull();
 });
 it('does not present stale or mismatched closes as current sentiment',()=>{
  expect(marketSentiment({...vix,stale:true},vxn).regime).toBe('stale');
  expect(marketSentiment(vix,{bars:vxn.bars.slice(0,-1)}).regime).toBe('mismatched');
 });
 it('does not invent a 20-session baseline from a short sample',()=>{
  const short={bars:vix.bars.slice(-6)};
  expect(sentimentMetrics(short)!.average20).toBeNull();
  expect(marketSentiment(short,short).regime).toBe('insufficient');
 });
 it('recognizes jointly rising volatility and reversals',()=>{
  const rising={bars:barsFrom(Array.from({length:20},(_,i)=>15+i))};
  expect(marketSentiment(rising,rising).regime).toBe('rising');
  expect(marketSentiment(vix,rising).regime).toBe('mixed');
  const reversal={bars:barsFrom([...Array<number>(19).fill(15),14])};
  reversal.bars[14].close='13';
  expect(marketSentiment(reversal,reversal).regime).toBe('mixed');
 });
 it('recognizes easing below the baseline and a flat market',()=>{
  const falling={bars:barsFrom(Array.from({length:20},(_,i)=>35-i))};
  expect(marketSentiment(falling,falling).regime).toBe('easing');
  const flat={bars:barsFrom(Array<number>(20).fill(20))};
  expect(marketSentiment(flat,flat).regime).toBe('neutral');
 });
});
