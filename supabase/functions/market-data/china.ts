import {Decimal} from 'decimal.js';
import {Temporal} from '@js-temporal/polyfill';
import type {z} from 'zod';
import {instrument} from './core.ts';
type Instrument=z.infer<typeof instrument>;
const exchanges:Record<string,string>={OQ:'NASDAQ',N:'NYSE',AM:'AMEX'};
const symbolPattern=/^[A-Z0-9][A-Z0-9.-]{0,23}$/;
function number(value:string):string {
 if(!/^\d+(\.\d+)?$/.test(value)||new Decimal(value).lte(0))throw new Error('MARKET_UNAVAILABLE');
 return new Decimal(value).toFixed();
}
function code(value:string) {
 const m=value.toUpperCase().match(/^([A-Z0-9][A-Z0-9.-]*)\.(OQ|N|AM)$/);
 if(!m||!symbolPattern.test(m[1]))throw new Error('MARKET_UNAVAILABLE');
 return {symbol:m[1],exchange:exchanges[m[2]]};
}
function unescapeName(value:string) {return value.replace(/\\u([0-9a-fA-F]{4})/g,(_,hex)=>String.fromCharCode(parseInt(hex,16)));}
export function chinaSearch(text:string) {
 const match=text.match(/v_hint\s*=\s*"([^"\r\n]*)"/);
 if(!match)throw new Error('MARKET_UNAVAILABLE');
 const seen=new Set<string>();
 return {instruments:match[1].split('^').flatMap(row=>{
  const fields=row.split('~');if(fields[0]!=='us')return [];
  try{const c=code(fields[1]);const key=c.symbol+':'+c.exchange;if(seen.has(key))return [];
   const item=instrument.parse({...c,name:unescapeName(fields[2]||c.symbol),currency:'USD',timezone:'America/New_York'});seen.add(key);return [item];
  }catch{return [];}
 }).slice(0,20)};
}
export function chinaQuote(text:string,selected:Instrument,now=new Date().toISOString()) {
 const rows=Array.from(text.matchAll(/v_us([A-Za-z0-9.-]+)\s*=\s*"([^"\r\n]*)"/g));
 const row=rows.find(m=>m[1].toUpperCase()===selected.symbol);
 if(!row)throw new Error('MARKET_UNAVAILABLE');
 const fields=row[2].split('~');const actual=code(fields[2]||'');
 if(actual.symbol!==selected.symbol||actual.exchange!==selected.exchange||fields[35]!=='USD'||selected.currency!=='USD'||selected.timezone!=='America/New_York')throw new Error('IDENTITY_MISMATCH');
 const price=number(fields[3]),previous=number(fields[4]);
 const local=(fields[30]||'').trim();if(!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(local))throw new Error('MARKET_UNAVAILABLE');
 let asOf:string;
 try{asOf=Temporal.PlainDateTime.from(local.replace(' ','T')).toZonedDateTime('America/New_York',{disambiguation:'reject'}).toInstant().toString();}catch{throw new Error('MARKET_UNAVAILABLE');}
 const age=new Date(now).getTime()-new Date(asOf).getTime();if(age < -300000)throw new Error('MARKET_UNAVAILABLE');
 return {symbol:selected.symbol,exchange:selected.exchange,currency:selected.currency,price,
  change_percent:new Decimal(price).minus(previous).div(previous).times(100).toFixed(2),
  as_of:asOf,fetched_at:now,market_open:null,source:'腾讯财经 / 网页行情',stale:age>15*60000};
}
export function chinaHistory(text:string,selected:Instrument,start:string,now=new Date().toISOString()) {
 if(!symbolPattern.test(selected.symbol))throw new Error('VALIDATION');
 // JSONP is parsed as JSON only. Provider JavaScript is never executed.
 const match=text.match(/\bvar\s+_\s*=\s*\(\s*(\[[\s\S]*?\])\s*\)\s*;/);
 if(!match)throw new Error('HISTORY_EMPTY');
 let parsed:unknown;try{parsed=JSON.parse(match[1]);}catch{throw new Error('MARKET_UNAVAILABLE');}
 if(!Array.isArray(parsed)||parsed.length>50000)throw new Error('MARKET_UNAVAILABLE');
 const today=Temporal.Instant.from(now).toZonedDateTimeISO('America/New_York').toPlainDate().toString();
 const bars=parsed.flatMap(row=>{
  if(typeof row?.d!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(row.d))throw new Error('MARKET_UNAVAILABLE');
  try{Temporal.PlainDate.from(row.d,{overflow:'reject'});}catch{throw new Error('MARKET_UNAVAILABLE');}
  if(row.d<start||row.d>today)return [];
  return [{date:row.d,open:number(String(row.o)),close:number(String(row.c))}];
 }).sort((a,b)=>a.date.localeCompare(b.date));
 if(!bars.length)throw new Error('HISTORY_EMPTY');
 if(new Set(bars.map(b=>b.date)).size!==bars.length)throw new Error('MARKET_UNAVAILABLE');
 return {bars,currency:selected.currency,exchange:selected.exchange,source:'新浪财经 / 日线',fetched_at:now,price_adjustment:'provider_unspecified'};
}
async function content(url:URL|string,gbk=false) {
 const response=await fetch(url,{headers:{'User-Agent':'US-Equity-Monitor/1.0','Referer':gbk?'https://gu.qq.com/':'https://finance.sina.com.cn/'},signal:AbortSignal.timeout(10000)});
 if(response.status===429)throw new Error('RATE_LIMIT');
 if(!response.ok)throw new Error('MARKET_UNAVAILABLE');
 const bytes=await response.arrayBuffer();if(bytes.byteLength>8*1024*1024)throw new Error('MARKET_UNAVAILABLE');
 return new TextDecoder(gbk?'gb18030':'utf-8').decode(bytes);
}
export async function fetchChinaSearch(query:string) {
 const url=new URL('https://smartbox.gtimg.cn/s3/');url.searchParams.set('v','2');url.searchParams.set('q',query);url.searchParams.set('t','all');url.searchParams.set('c','1');
 return chinaSearch(await content(url,true));
}
export async function fetchChinaQuote(selected:Instrument) {
 if(!symbolPattern.test(selected.symbol))throw new Error('VALIDATION');
 const url=new URL('https://qt.gtimg.cn/');url.searchParams.set('q','us'+selected.symbol);
 return chinaQuote(await content(url,true),selected);
}
export function chinaQuotes(text:string,selected:Instrument[],now=new Date().toISOString()) {
 return {quotes:selected.map(item=>{
  try{return {symbol:item.symbol,exchange:item.exchange,quote:chinaQuote(text,item,now)};}
  catch(cause){const code=cause instanceof Error?cause.message:'MARKET_UNAVAILABLE';return {symbol:item.symbol,exchange:item.exchange,error:code==='IDENTITY_MISMATCH'?code:'MARKET_UNAVAILABLE'};}
 })};
}
export async function fetchChinaQuotes(selected:Instrument[]) {
 if(!selected.length||selected.length>25||selected.some(item=>!symbolPattern.test(item.symbol)))throw new Error('VALIDATION');
 const url=new URL('https://qt.gtimg.cn/');url.searchParams.set('q',Array.from(new Set(selected.map(item=>'us'+item.symbol))).join(','));
 return chinaQuotes(await content(url,true),selected);
}
export async function fetchChinaHistory(selected:Instrument,start:string,verifiedQuote?:ReturnType<typeof chinaQuote>) {
 // Validate the instrument against the quote source; a symbol can exist on multiple exchanges.
 if(verifiedQuote){
  if(verifiedQuote.symbol!==selected.symbol||verifiedQuote.exchange!==selected.exchange||verifiedQuote.currency!==selected.currency||selected.timezone!=='America/New_York')throw new Error('IDENTITY_MISMATCH');
 }else await fetchChinaQuote(selected);
 const url=new URL('https://stock.finance.sina.com.cn/usstock/api/jsonp.php/var%20_=/US_MinKService.getDailyK');url.searchParams.set('symbol',selected.symbol.toLowerCase());
 return chinaHistory(await content(url),selected,start);
}
