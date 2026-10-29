import Decimal from 'decimal.js';
import type { Trade, WatchItem, Quote } from './types';
Decimal.set({ precision: 50, rounding: Decimal.ROUND_HALF_UP });
export const decimalPattern = /^(?:0|[1-9]\d{0,11})(?:\.\d{1,8})?$/;
export function decimalValue(value: string, positive = true): string {
  if (!decimalPattern.test(value) || (positive && new Decimal(value).lte(0))) throw new Error('DECIMAL');
  return new Decimal(value).toFixed();
}
export function percent(price: string, baseline: string | null): string | null {
  if (baseline === null || new Decimal(baseline).lte(0)) return null;
  return new Decimal(price).minus(baseline).div(baseline).times(100).toFixed(2);
}
export function money(value: string, currency: string, language: string): string {
  const rounded = new Decimal(value).toDecimalPlaces(2);
  const [whole, fraction] = rounded.abs().toFixed(2).split('.');
  const parts = new Intl.NumberFormat(language === 'zh' ? 'zh-CN' : 'en-US', { style: 'currency', currency, currencyDisplay: 'code', minimumFractionDigits: 2, maximumFractionDigits: 2 }).formatToParts(rounded.isNegative() && !rounded.isZero() ? -1.1 : 1.1);
  const integer = BigInt(whole).toLocaleString(language === 'zh' ? 'zh-CN' : 'en-US');
  let firstInteger = true;
  return parts.map(p => p.type === 'integer' ? (firstInteger ? (firstInteger = false, integer) : '') : p.type === 'fraction' ? fraction : p.type === 'group' ? '' : p.value).join('');
}
export function signedPercent(value: string | null): string { return value === null ? '—' : `${new Decimal(value).gt(0) ? '+' : ''}${new Decimal(value).toFixed(2)}%`; }
export function tradeValue(trade: Pick<Trade, 'quantity' | 'price' | 'fees' | 'side'>): string {
  const gross = new Decimal(trade.quantity).times(trade.price);
  return (trade.side === 'buy' ? gross.plus(trade.fees) : gross.minus(trade.fees)).toFixed();
}
export function watchSummary(items: WatchItem[], quotes: Record<string, Quote>) {
  const returns = items.flatMap(item => { const q = quotes[item.id]; const p = q && q.currency === item.currency ? percent(q.price, item.baseline_price) : null; return p === null ? [] : [new Decimal(p)]; });
  return { tracked: items.length, priced: returns.length, average: returns.length ? returns.reduce((s, p) => s.plus(p), new Decimal(0)).div(returns.length).toFixed(2) : null,
    alerts: items.filter(item => { const q = quotes[item.id]; const p = q && q.currency === item.currency ? percent(q.price, item.baseline_price) : null; return p !== null && new Decimal(p).lte(item.alert_percent); }).length };
}
export function currencyTotals(trades: Trade[]): Record<string, string> {
  const result: Record<string, Decimal> = {};
  for (const t of trades) result[t.currency] = (result[t.currency] ?? new Decimal(0)).plus(new Decimal(tradeValue(t)).times(t.side === 'buy' ? -1 : 1));
  return Object.fromEntries(Object.entries(result).map(([currency, value]) => [currency, value.toFixed()]));
}
