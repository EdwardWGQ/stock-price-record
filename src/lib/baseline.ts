import { Temporal } from '@js-temporal/polyfill';
import { Decimal } from 'decimal.js';
import type { Bar, WatchItem } from './types';
export function validDate(date: string, now = new Date()): boolean {
  try { return /^\d{4}-\d{2}-\d{2}$/.test(date) && Temporal.PlainDate.from(date,{overflow:'reject'}).toString() === date && date >= '1900-01-01' && date <= now.toISOString().slice(0,10); } catch { return false; }
}
export function baselineFromBars(date: string, bars: Bar[]) {
  if (!validDate(date)) throw new Error('DATE_INVALID');
  const ordered = bars.filter(bar => bar.date >= date).sort((a,b) => a.date.localeCompare(b.date));
  const first = ordered[0]; if (!first) throw new Error('HISTORY_EMPTY');
  // Preserve the original site's convention: first trading-day OPEN as baseline.
  if (!first.open || !new Decimal(first.open).isFinite() || new Decimal(first.open).lte(0)) throw new Error('OPEN_MISSING');
  return { date, session: first.date, price: first.open, bars: ordered };
}
export function returnSeries(item: WatchItem, bars: Bar[], dates: string[]): (number | null)[] {
  if (!item.baseline_price || new Decimal(item.baseline_price).lte(0)) return dates.map(() => null);
  const start = item.baseline_date ?? item.baseline_at.slice(0,10);
  const map = new Map(bars.filter(b => b.date >= start).map(bar => [bar.date, bar.close]));
  // Match dates explicitly. Missing sessions must not shift data onto another date.
  return dates.map(date => { const close = map.get(date); return close === undefined ? null : new Decimal(close).minus(item.baseline_price!).div(item.baseline_price!).times(100).toNumber(); });
}
