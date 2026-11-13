import {describe,it,expect} from 'vitest';
import {resolveChiefManualDraft,type ChiefManualDraft} from '../src/lib/chief-manual-fees';
import {parseChiefManualEntries} from '../src/lib/broker-import';

const draft:ChiefManualDraft={key:'fill',feeMode:'chief',channel:'online',secScope:'sell',rounding:'nearest',entry:{reference:'AUTO-001',symbol:'AAPL',name:'Apple',exchange:'NASDAQ',currency:'USD',side:'buy',quantity:'10',price:'200',fees:'999',occurred_at:'2026-11-09T10:30',record_timezone:'Asia/Hong_Kong',notes:''}};

describe('Chief manual fee inputs and import preview',()=>{
 it('imports the current estimate rather than an earlier stored fee',async()=>{
  const resolved=resolveChiefManualDraft({...draft,entry:{...draft.entry,quantity:'1,000'}});
  const preview=await parseChiefManualEntries([resolved.entry],'11111111-1111-4111-8111-111111111111','致富美股');
  expect(resolved.entry.fees).toBe('11.00');
  expect(preview.trades[0]).toMatchObject({quantity:'1000',fees:'11',occurred_at:'2026-11-09T02:30:00Z'});
  expect(draft.entry.fees).toBe('999');
 });
 it('clears estimates for incomplete, unsupported or ambiguous inputs',()=>{
  for(const changes of [{price:''},{quantity:'0'},{exchange:'OTC'},{occurred_at:'2027-01-01T13:00'},{occurred_at:'2026-11-01T01:30',record_timezone:'America/New_York'}]){
   expect(resolveChiefManualDraft({...draft,entry:{...draft.entry,...changes}})).toMatchObject({entry:{fees:''},estimate:null,error:expect.any(String)});
  }
 });
 it('evaluates the fee schedule against the New York date of the selected record timezone',()=>{
  const entry={...draft.entry,occurred_at:'2027-01-01T02:00'};
  expect(resolveChiefManualDraft({...draft,entry}).estimate?.tradeDate).toBe('2026-12-31');
  expect(resolveChiefManualDraft({...draft,entry:{...entry,record_timezone:'America/New_York'}})).toMatchObject({entry:{fees:''},estimate:null});
 });
 it('preserves actual manual fees including zero on dates outside the estimate schedule',()=>{
  for(const fees of ['0','0.75'])expect(resolveChiefManualDraft({...draft,feeMode:'manual',entry:{...draft.entry,fees,occurred_at:'2027-01-01T13:00'}})).toMatchObject({entry:{fees},estimate:null});
 });
});
