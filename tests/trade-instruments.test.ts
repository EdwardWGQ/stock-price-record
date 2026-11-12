import {describe,it,expect} from 'vitest';
import {instrumentKey,tradeInstruments} from '../src/lib/trade-instruments';
import type {Trade} from '../src/lib/types';

const instrument={symbol:'AAPL',name:'Apple',exchange:'NASDAQ',currency:'USD',timezone:'America/New_York'};

describe('existing instruments for additional purchases',()=>{
 it('groups identical stock identities while retaining distinct exchanges and currencies',()=>{
  expect(instrumentKey(instrument)).toBe(instrumentKey({...instrument,symbol:' aapl ',exchange:'nasdaq'}));
  const instruments=tradeInstruments([instrument,instrument,{...instrument,exchange:'NYSE'},{...instrument,currency:'HKD'}]);
  expect(instruments).toHaveLength(3);
  expect(new Set(instruments.map(instrumentKey)).size).toBe(3);
 });
 it('reuses only stock fields, excluding prior purchase ID, time, amounts and import notes',()=>{
  const previous:Trade={...instrument,id:'33333333-3333-4333-8333-333333333333',user_id:'owner',side:'buy',quantity:'5',price:'190',fees:'1',occurred_at:'2026-11-01T13:30:00Z',record_timezone:'Asia/Shanghai',notes:'[CHIEF-IMPORT-v1]old-execution',revision:3,created_at:'2026-11-01T13:30:00Z',updated_at:'2026-11-01T13:30:00Z'};
  expect(tradeInstruments([previous])).toEqual([instrument]);
 });
});
