import type { Instrument, WatchItem, Trade, Quote, Bar } from './types';
import snapshot from './monitor-snapshot.json';
export const demoInstruments: Instrument[] = snapshot.map(row => ({symbol:row.symbol,name:row.symbol,exchange:['TSM','KO','VOO','SPCX','MCD','OXY'].includes(row.symbol)?'NYSE':'NASDAQ',currency:'USD',timezone:'America/New_York'}));
export function initialDemo() {
 const watchlist: WatchItem[] = snapshot.map((row,i) => ({...demoInstruments[i],id:`00000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`,user_id:'demo',baseline_at:'2026-06-01T04:00:00Z',baseline_timezone:'America/New_York',baseline_date:'2026-06-01',baseline_session:'2026-06-01',baseline_price:row.baseline,alert_percent:'-30',notes:'',revision:1,created_at:'2026-06-01T04:00:00Z',updated_at:'2026-10-28T20:00:00Z'}));
 const trades: Trade[] = [{...demoInstruments[3],id:'00000000-0000-4000-9000-000000000001',user_id:'demo',side:'buy',quantity:'0.1',price:'309.63',fees:'0.01',occurred_at:'2026-06-01T13:30:00Z',record_timezone:'America/New_York',notes:'Demo',revision:1,created_at:'2026-06-01T13:30:00Z',updated_at:'2026-06-01T13:30:00Z'}];
 return {watchlist,trades};
}
export function demoBars(item: Instrument, start='2026-06-01'): Bar[] { return snapshot.find(row=>row.symbol===item.symbol)?.bars.filter(bar=>bar.date>=start)??[]; }
export function demoQuote(item: Instrument): Quote {
 const row=snapshot.find(row=>row.symbol===item.symbol); if(!row)throw new Error('HISTORY_EMPTY');
 return {symbol:item.symbol,exchange:item.exchange,currency:item.currency,price:row.price,change_percent:row.change_percent,as_of:'2026-10-28T20:00:00Z',fetched_at:new Date().toISOString(),market_open:false,source:'DEMO / historical snapshot',stale:true,bars:demoBars(item)};
}
