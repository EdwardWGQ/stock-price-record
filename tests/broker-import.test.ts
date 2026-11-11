import {describe,it,expect} from 'vitest';
import {chiefColumns,parseDelimited,parseChiefTemplate,chiefTradeId,sameImportedTrade} from '../src/lib/broker-import';

const user='11111111-1111-4111-8111-111111111111';
const headers=chiefColumns.join(',');
const line='FILL-001,AAPL,Apple,NASDAQ,USD,买入,10,200.50,1,2026-11-09 10:30:00,Asia/Hong_Kong,长期配置';
const csv=headers+'\n'+line;

describe('reviewable Chief template imports',()=>{
 it('preserves amounts and the original timezone instead of guessing the broker clock',async()=>{
  const result=await parseChiefTemplate(csv,user,'致富美股');
  expect(result.trades[0]).toMatchObject({symbol:'AAPL',quantity:'10',price:'200.5',fees:'1',side:'buy',occurred_at:'2026-11-09T02:30:00Z',record_timezone:'Asia/Hong_Kong'});
  expect(result.trades[0].notes).toContain('FILL-001');
  expect(result.references).toEqual(['FILL-001']);
 });
 it('keeps each account and user’s execution identity separate',async()=>{
  const a=await chiefTradeId(user,'致富美股','FILL-001');
  expect(await chiefTradeId(user,'致富美股','FILL-001')).toBe(a);
  expect(await chiefTradeId(user,'另一账户','FILL-001')).not.toBe(a);
  expect(await chiefTradeId('22222222-2222-4222-8222-222222222222','致富美股','FILL-001')).not.toBe(a);
  expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-a[0-9a-f]{3}-[0-9a-f]{12}$/);
 });
 it('parses quoted commas, newlines, escaped quotes, BOM and TSV without executing content',()=>{
  expect(parseDelimited('\uFEFFa,b\r\n"x,y","line\n""quoted"""')).toEqual([['a','b'],['x,y','line\n"quoted"']]);
  expect(parseDelimited('a\tb\nx\ty')).toEqual([['a','b'],['x','y']]);
  expect(()=>parseDelimited('a,b\n"broken')).toThrow('引号');
 });
 it('requires verified fill identifiers, fees and full timestamps',async()=>{
  await expect(parseChiefTemplate(csv+'\n'+line,user,'致富美股')).rejects.toThrow('成交编号重复');
  await expect(parseChiefTemplate(csv.replace(',1,2026',',,2026'),user,'致富美股')).rejects.toThrow('手续费不能留空');
  await expect(parseChiefTemplate(csv.replace('2026-11-09 10:30:00','2026-11-09'),user,'致富美股')).rejects.toThrow('真实日期与时间');
  await expect(parseChiefTemplate(csv.replace('2026-11-09 10:30:00','2026-02-30 10:30:00'),user,'致富美股')).rejects.toThrow();
 });
 it('rejects unsupported currencies, nonexecutions and guessed column mapping',async()=>{
  await expect(parseChiefTemplate(csv.replace('USD','HKD'),user,'致富美股')).rejects.toThrow('仅支持美元');
  await expect(parseChiefTemplate(csv.replace('买入','撤单'),user,'致富美股')).rejects.toThrow('交易方向');
  await expect(parseChiefTemplate('Order,Stock\n1,AAPL',user,'致富美股')).rejects.toThrow('缺少模板字段');
 });
 it('blocks changed economics under the same execution ID while accepting decimal normalization',async()=>{
  const [trade]=(await parseChiefTemplate(csv,user,'致富美股')).trades;
  expect(sameImportedTrade(trade,{...trade,price:'200.50000000'})).toBe(true);
  expect(sameImportedTrade(trade,{...trade,quantity:'11'})).toBe(false);
 });
});
