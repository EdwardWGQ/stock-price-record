import type {Bar,Volatility} from '../../src/lib/types';

const dates=['2026-10-13','2026-10-14','2026-10-15','2026-10-16','2026-10-19','2026-10-20','2026-10-21','2026-10-22','2026-10-23','2026-10-26','2026-10-27','2026-10-28','2026-10-29','2026-10-30','2026-11-02','2026-11-03','2026-11-04','2026-11-05','2026-11-06','2026-11-09'];
export const barsFrom=(closes:number[]):Bar[]=>closes.map((close,index)=>({date:dates[index],close:String(close)}));
const vxnLast=[30.89,30.53,25.08,38.26,34.02,28.97];
// Fixed fixtures match the screenshot's closing, change and average metrics.
export const sentimentFixture={
 VIX:barsFrom([15.27,16.87,16.46,19.99,18.44,17.31,16.68,19.03,19.45,18.39,17.52,16.91,17.2,19.42,21.15,20.83,16.61,28.18,25.64,19.92]),
 VXN:barsFrom([...Array<number>(14).fill((27.13*20-vxnLast.reduce((a,b)=>a+b,0))/14),...vxnLast]),
};
export function fixtureIndex(name:'VIX'|'VXN',bars=sentimentFixture[name]):Volatility {
 return {name,bars,value:bars.at(-1)!.close,change_percent:'0',week_change_percent:'0',average20:'0',as_of:bars.at(-1)!.date,fetched_at:'2026-11-10T00:00:00Z',source:'Cboe official / daily close',stale:false};
}
