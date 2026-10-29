import {Decimal} from 'decimal.js';
import {Temporal} from '@js-temporal/polyfill';
export function officialVolatility(name:'VIX'|'VXN',csv:string,now=new Date().toISOString()) {
 const lines=csv.trim().replace(/^\uFEFF/,'').split(/\r?\n/);
 const headers=lines.shift()?.split(',').map(x=>x.trim())??[];
 const dateIndex=headers.indexOf('DATE'),closeIndex=headers.indexOf('CLOSE');
 if(dateIndex<0||closeIndex<0)throw new Error('MARKET_UNAVAILABLE');
 const today=now.slice(0,10);
 const bars=lines.flatMap(line=>{
  const row=line.split(',');const match=row[dateIndex]?.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if(!match)return [];
  try{const date=`${match[3]}-${match[1]}-${match[2]}`;Temporal.PlainDate.from(date,{overflow:'reject'});
   const value=row[closeIndex]?.trim();if(!/^\d+(\.\d+)?$/.test(value)||new Decimal(value).lte(0)||date>today)return [];
   return [{date,close:new Decimal(value).toFixed()}];
  }catch{return [];}
 }).sort((a,b)=>a.date.localeCompare(b.date)).slice(-65);
 if(bars.length<2||new Set(bars.map(b=>b.date)).size!==bars.length)throw new Error('MARKET_UNAVAILABLE');
 const current=bars.at(-1)!,previous=bars.at(-2)!,week=bars.at(-6)??bars[0];
 const change=(previousPrice:string)=>new Decimal(current.close).minus(previousPrice).div(previousPrice).times(100).toFixed(2);
 return {name,bars,value:current.close,change_percent:change(previous.close),week_change_percent:change(week.close),
  average20:bars.slice(-20).reduce((s,b)=>s.plus(b.close),new Decimal(0)).div(Math.min(20,bars.length)).toFixed(2),
  as_of:current.date,fetched_at:now,source:'Cboe official / daily close',stale:Temporal.PlainDate.from(current.date).until(Temporal.PlainDate.from(today)).days>4};
}
