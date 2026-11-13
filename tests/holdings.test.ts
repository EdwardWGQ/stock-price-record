import {describe,it,expect} from 'vitest';
import {calculatePositions,valuePositions,holdingTotals} from '../src/lib/holdings';
import type {Trade,Quote} from '../src/lib/types';

const base:Trade={id:'trade',user_id:'user',symbol:'AAPL',name:'Apple',exchange:'NASDAQ',currency:'USD',timezone:'America/New_York',side:'buy',quantity:'10',price:'100',fees:'10',occurred_at:'2026-11-01T15:00:00Z',record_timezone:'UTC',notes:'',revision:1,created_at:'2026-11-01T15:00:00Z',updated_at:'2026-11-01T15:00:00Z'};
const trade=(id:string,changes:Partial<Trade>={}):Trade=>({...base,id,...changes});
const quote=(changes:Partial<Quote>={}):Quote=>({symbol:'AAPL',exchange:'NASDAQ',currency:'USD',price:'150',change_percent:'1',as_of:'2026-11-13T15:00:00Z',fetched_at:'2026-11-13T15:01:00Z',market_open:true,source:'fixture',stale:false,...changes});

describe('current holdings and unrealized returns',()=>{
 it('processes chronological trades, includes buy fees, removes sold cost and averages later purchases',()=>{
  const trades=[trade('four',{quantity:'5',price:'50',fees:'5',occurred_at:'2026-11-04T15:00:00Z'}),trade('two',{price:'200',occurred_at:'2026-11-02T15:00:00Z'}),trade('three',{side:'sell',quantity:'5',fees:'100',occurred_at:'2026-11-03T15:00:00Z'}),trade('one')];
  const holdings=valuePositions(calculatePositions(trades),{latest:quote()});
  expect(holdings[0]).toMatchObject({quantity:'20',cost:'2520',averageCost:'126',marketValue:'3000',profit:'480',returnPercent:'19.05'});
  expect(holdingTotals(holdings)[0]).toMatchObject({currency:'USD',cost:'2520',marketValue:'3000',profit:'480',returnPercent:'19.05'});
  expect(trades[0].id).toBe('four');
 });
 it('omits fully closed positions and starts a fresh cost basis on a subsequent buy',()=>{
  const closed=[trade('buy'),trade('sell',{side:'sell',occurred_at:'2026-11-02T15:00:00Z'})];
  expect(calculatePositions(closed)).toEqual([]);
  expect(calculatePositions([...closed,trade('again',{quantity:'2',price:'50',fees:'1',occurred_at:'2026-11-03T15:00:00Z'})])[0]).toMatchObject({quantity:'2',cost:'101',incomplete:false});
 });
 it('keeps fractional quantities and all currency amounts in exact decimals',()=>{
  const holdings=valuePositions(calculatePositions([trade('fraction',{quantity:'0.1',price:'0.2',fees:'0.01'})]),{latest:quote({price:'0.4'})});
  expect(holdings[0]).toMatchObject({quantity:'0.1',cost:'0.03',averageCost:'0.3',marketValue:'0.04',profit:'0.01',returnPercent:'33.33'});
 });
 it('keeps exchanges and currencies distinct and selects the newest matching quote',()=>{
  const positions=calculatePositions([trade('us'),trade('eu',{currency:'EUR'}),trade('ny',{exchange:'NYSE'})]);
  const holdings=valuePositions(positions,{old:quote({price:'100',as_of:'2026-11-12T15:00:00Z'}),latest:quote(),eu:quote({currency:'EUR',price:'200'}),wrong:quote({exchange:'HKEX',price:'999'})});
  expect(holdings.find(row=>row.exchange==='NYSE')).toMatchObject({marketValue:null,profit:null});
  expect(holdings.find(row=>row.currency==='USD'&&row.exchange==='NASDAQ')).toMatchObject({marketValue:'1500'});
  expect(holdingTotals(holdings)).toEqual(expect.arrayContaining([expect.objectContaining({currency:'USD',marketValue:null,profit:null,missingQuotes:1}),expect.objectContaining({currency:'EUR',marketValue:'2000',profit:'990'})]));
 });
 it('does not invent zero valuations when quotes are absent or invalid',()=>{
  const positions=calculatePositions([trade('buy')]);
  const scenarios:Record<string,Quote>[]=[{},{bad:quote({price:'NaN'})}];
  for(const quotes of scenarios){
   const holdings=valuePositions(positions,quotes);
   expect(holdings[0]).toMatchObject({cost:'1010',averageCost:'101',marketValue:null,profit:null,returnPercent:null});
   expect(holdingTotals(holdings)[0]).toMatchObject({cost:'1010',marketValue:null,profit:null,missingQuotes:1});
  }
 });
 it('marks incomplete sell histories and cannot infer their remaining cost',()=>{
  const holdings=valuePositions(calculatePositions([trade('sell',{side:'sell',quantity:'2'}),trade('later',{quantity:'5',occurred_at:'2026-11-02T15:00:00Z'})]),{latest:quote()});
  expect(holdings[0]).toMatchObject({quantity:'3',cost:null,averageCost:null,marketValue:'450',profit:null,incomplete:true});
  expect(holdingTotals(holdings)[0]).toMatchObject({cost:null,profit:null,incomplete:1});
 });
 it('retains cached quote identity and marks it for presentation',()=>{
  const holdings=valuePositions(calculatePositions([trade('buy')]),{cached:quote({stale:true,cached:true})});
  expect(holdings[0]).toMatchObject({marketValue:'1500',profit:'490',quote:{stale:true,cached:true}});
 });
});
