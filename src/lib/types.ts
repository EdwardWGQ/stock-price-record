export type Language = 'en' | 'zh';
export interface Instrument { symbol: string; name: string; exchange: string; currency: string; timezone: string }
export interface WatchItem extends Instrument {
  id: string; user_id: string; baseline_at: string; baseline_timezone: string;
  baseline_price: string | null; alert_percent: string; notes: string;
  revision: number; created_at: string; updated_at: string;
  baseline_date?: string; baseline_session?: string | null;
}
export interface Trade extends Instrument {
  id: string; user_id: string; side: 'buy' | 'sell'; quantity: string;
  price: string; fees: string; occurred_at: string; record_timezone: string;
  notes: string; revision: number; created_at: string; updated_at: string;
}
export interface Profile { user_id: string; language: Language; timezone: string; updated_at: string; baseline_date?: string }
export interface Bar { date: string; open?: string; close: string }
export interface HistoryResult { bars:Bar[];currency:string;exchange:string;source?:string;price_adjustment?:string }
export interface Quote {
  symbol: string; exchange: string; currency: string; price: string; change_percent: string;
  as_of: string; fetched_at: string; market_open: boolean | null;
  source: string; stale: boolean; bars?: Bar[];
}
export interface Volatility {
 name:string;bars:Bar[];value:string;change_percent:string;week_change_percent:string;
 average20:string;as_of:string;fetched_at:string;source:string;stale:boolean;
}
export type WatchInput = Omit<WatchItem, 'user_id' | 'revision' | 'created_at' | 'updated_at'>;
export type TradeInput = Omit<Trade, 'user_id' | 'revision' | 'created_at' | 'updated_at'>;
export interface ExportData { version: number; exported_at: string; watchlist: WatchItem[]; trades: Trade[] }
