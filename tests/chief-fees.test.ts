import {describe,it,expect} from 'vitest';
import {calculateChiefStockFees,chiefFeesForRecord} from '../src/lib/chief-fees';

const base={quantity:'10',price:'200',side:'buy' as const,tradeDate:'2026-11-09'};
describe('Chief ordinary stock fee estimates',()=>{
 it('calculates a small online purchase including platform and clearing minimums',()=>{
  expect(calculateChiefStockFees(base)).toMatchObject({gross:'2000',commission:'0.00',platform:'0.99',clearing:'0.03',sec:'0.00',finra:'0.00',total:'1.02',cashAmount:'2001.02'});
 });
 it('adds the supplied SEC rate only to a sale by default',()=>{
  expect(calculateChiefStockFees({...base,side:'sell'})).toMatchObject({sec:'0.04',total:'1.06',cashAmount:'1998.94'});
  expect(calculateChiefStockFees({...base,quantity:'1',price:'1',side:'sell'})).toMatchObject({sec:'0.01',platform:'0.99',clearing:'0.01',total:'1.01'});
 });
 it('allows the SEC direction and rounding conventions to match a customer’s statement',()=>{
  expect(calculateChiefStockFees({...base,secScope:'both'})).toMatchObject({sec:'0.04',total:'1.06'});
  expect(calculateChiefStockFees({...base,secScope:'both',rounding:'up'})).toMatchObject({sec:'0.05',total:'1.07'});
  expect(calculateChiefStockFees({...base,quantity:'11',rounding:'nearest'}).clearing).toBe('0.03');
  expect(calculateChiefStockFees({...base,quantity:'11',rounding:'up'}).clearing).toBe('0.04');
 });
 it('applies each 3% cap independently and honors minimum charges first',()=>{
  expect(calculateChiefStockFees({...base,quantity:'1000',price:'0.01'})).toMatchObject({platform:'0.99',clearing:'0.30',total:'1.29'});
  expect(calculateChiefStockFees({...base,quantity:'1000',price:'0.20'})).toMatchObject({platform:'6.00',clearing:'3.00',total:'9.00'});
  expect(calculateChiefStockFees({...base,quantity:'1000',price:'0.05'})).toMatchObject({platform:'1.50',clearing:'1.50',total:'3.00'});
 });
 it('charges telephone commission rather than the online platform fee',()=>{
  expect(calculateChiefStockFees({...base,channel:'phone'})).toMatchObject({commission:'20.00',platform:'0.00',clearing:'0.03',total:'20.03'});
  expect(calculateChiefStockFees({...base,quantity:'1000',channel:'phone'}).commission).toBe('30.00');
 });
 it('does not keep the FINRA waiver or other snapshot rates past the bounded fee schedule',()=>{
  for(const tradeDate of ['2026-10-01','2026-12-31'])expect(calculateChiefStockFees({...base,side:'sell',tradeDate}).finra).toBe('0.00');
  for(const tradeDate of ['2026-09-30','2027-01-01','2026-02-30','bad'])expect(()=>calculateChiefStockFees({...base,tradeDate})).toThrow();
 });
 it('uses the New York session date even when record time is entered in Hong Kong',()=>{
  const record={...base,occurredAt:'2026-10-01T00:30:00+08:00',currency:'USD',exchange:'NASDAQ'};
  expect(()=>chiefFeesForRecord(record)).toThrow('2026-10-01');
  expect(chiefFeesForRecord({...record,occurredAt:'2027-01-01T02:00:00+08:00'}).tradeDate).toBe('2026-12-31');
  expect(()=>chiefFeesForRecord({...record,occurredAt:'2027-01-01T13:00:00+08:00'})).toThrow('2026-12-31');
 });
 it('rejects invalid amounts and unsupported instruments without fabricating a zero fee',()=>{
  for(const quantity of ['0','-1','NaN','1e3','0.123456789'])expect(()=>calculateChiefStockFees({...base,quantity})).toThrow();
  const record={...base,occurredAt:'2026-11-09T16:00:00Z',currency:'HKD',exchange:'HKEX'};
  expect(()=>chiefFeesForRecord(record)).toThrow('仅支持普通美股');
  expect(()=>chiefFeesForRecord({...record,currency:'USD',exchange:'CBOE'})).toThrow();
 });
 it('keeps fractional quantities precise and total fees equal to the sum of rounded lines',()=>{
  const result=calculateChiefStockFees({...base,quantity:'0.1',price:'0.2'});
  expect(result).toMatchObject({gross:'0.02',platform:'0.99',clearing:'0.01',total:'1.00',cashAmount:'1.02'});
 });
});
