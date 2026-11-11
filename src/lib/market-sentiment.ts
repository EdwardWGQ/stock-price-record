import type {Bar} from './types';

export interface SentimentInput {bars:Bar[];stale?:boolean}
export interface SentimentMetrics {date:string;value:number;daily:number|null;fiveDay:number|null;average20:number|null;aboveAverage:number|null}
export type SentimentRegime='unavailable'|'stale'|'mismatched'|'insufficient'|'easing-elevated'|'easing'|'rising'|'mixed'|'neutral';
export interface MarketSentiment {regime:SentimentRegime;vix:SentimentMetrics|null;vxn:SentimentMetrics|null}
export type IndexSentimentRegime=Exclude<SentimentRegime,'mismatched'>;

export function sentimentMetrics(input?:SentimentInput):SentimentMetrics|null {
 const bars=input?.bars.slice(-20);
 if(!bars?.length||bars.some((bar,index)=>!/^\d{4}-\d{2}-\d{2}$/.test(bar.date)||!Number.isFinite(Number(bar.close))||Number(bar.close)<=0||(index>0&&bar.date<=bars[index-1].date)))return null;
 const latest=bars.at(-1)!;
 const value=Number(latest.close);
 const change=(offset:number)=>bars.length>offset?(value/Number(bars.at(-1-offset)!.close)-1)*100:null;
 const average20=bars.length===20?bars.reduce((sum,bar)=>sum+Number(bar.close),0)/20:null;
 return {date:latest.date,value,daily:change(1),fiveDay:change(5),average20,aboveAverage:average20===null?null:(value/average20-1)*100};
}

/** Assess one index independently of the availability or level of the other. */
export function indexSentiment(input?:SentimentInput):{regime:IndexSentimentRegime;metrics:SentimentMetrics|null} {
 const metrics=sentimentMetrics(input);
 const result=(regime:IndexSentimentRegime)=>({regime,metrics});
 if(!metrics)return result('unavailable');
 if(input?.stale)return result('stale');
 if(metrics.average20===null)return result('insufficient');
 if(metrics.daily!<0&&metrics.fiveDay!<0)return result(metrics.aboveAverage!>0?'easing-elevated':'easing');
 if(metrics.daily!>0&&metrics.fiveDay!>0)return result('rising');
 if(metrics.daily!*metrics.fiveDay!<0)return result('mixed');
 return result('neutral');
}

/** Interpret each index against its own history; never derive price forecasts. */
export function marketSentiment(vixInput?:SentimentInput,vxnInput?:SentimentInput):MarketSentiment {
 const vix=sentimentMetrics(vixInput),vxn=sentimentMetrics(vxnInput);
 const result=(regime:SentimentRegime)=>({regime,vix,vxn});
 if(!vix||!vxn)return result('unavailable');
 if(vixInput?.stale||vxnInput?.stale)return result('stale');
 if(vix.date!==vxn.date)return result('mismatched');
 if(vix.average20===null||vxn.average20===null)return result('insufficient');
 const metrics=[vix,vxn];
 if(metrics.every(item=>item.daily!<0&&item.fiveDay!<0))return result(metrics.some(item=>item.aboveAverage!>0)?'easing-elevated':'easing');
 if(metrics.every(item=>item.daily!>0&&item.fiveDay!>0))return result('rising');
 if(metrics.some(item=>item.daily!>0)&&metrics.some(item=>item.daily!<0)||metrics.some(item=>item.daily!*item.fiveDay!<0))return result('mixed');
 return result('neutral');
}
