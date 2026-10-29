import { z } from 'zod';
import { decimalValue } from './finance';
import { validTimezone } from './time';
const decimal = (positive: boolean) => z.string().refine(v => { try { decimalValue(v, positive); return true; } catch { return false; } }, 'DECIMAL');
export const instrumentSchema = z.object({
  symbol: z.string().regex(/^[A-Z0-9^.=_/-]{1,24}$/),
  name: z.string().trim().min(1).max(160), exchange: z.string().regex(/^[A-Za-z0-9 _.-]{1,64}$/),
  currency: z.string().regex(/^[A-Z]{3}$/).refine(v => Intl.supportedValuesOf('currency').includes(v)),
  timezone: z.string().refine(validTimezone, 'TIMEZONE'),
});
const instant = z.string().datetime({ offset: true }).refine(v => { const d = new Date(v); return Number.isFinite(d.getTime()) && d >= new Date('1900-01-01') && d <= new Date('2100-12-31T23:59:59Z'); }, 'TIME_RANGE');
export const watchSchema = instrumentSchema.extend({ id: z.string().uuid(), baseline_at: instant, baseline_timezone: z.string().refine(validTimezone), baseline_price: decimal(true).nullable(), baseline_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), baseline_session: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(), alert_percent: z.string().refine(v => /^-\d{1,3}(\.\d{1,2})?$/.test(v) && Number(v) >= -100 && Number(v) < 0), notes: z.string().max(2000) });
export const tradeSchema = instrumentSchema.extend({ id: z.string().uuid(), occurred_at: instant, record_timezone: z.string().refine(validTimezone), side: z.enum(['buy', 'sell']), quantity: decimal(true), price: decimal(true), fees: decimal(false), notes: z.string().max(2000) });
