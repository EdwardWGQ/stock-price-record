import { describe, it, expect } from 'vitest';
import { resolveLocal, toLocal, marketDate, timezones } from '../src/lib/time';
describe('global record time', () => {
  it('converts Shanghai time to UTC and roundtrips seconds', () => { expect(resolveLocal('2026-10-29T15:23:45','Asia/Shanghai')).toBe('2026-10-29T07:23:45Z'); expect(toLocal('2026-10-29T07:23:45Z','Asia/Shanghai')).toBe('2026-10-29T15:23:45'); });
  it('handles fractional offset time zones', () => { expect(resolveLocal('2026-10-29T12:00:00','Asia/Kathmandu')).toBe('2026-10-29T06:15:00Z'); expect(resolveLocal('2026-10-29T12:00:00','Australia/Eucla')).toBe('2026-10-29T03:15:00Z'); });
  it('rejects nonexistent spring-forward time', () => { for(const occurrence of ['reject','earlier','later'] as const) expect(() => resolveLocal('2026-03-08T02:30:00','America/New_York',occurrence)).toThrow('TIME_GAP'); });
  it('requires a choice during fall-back and preserves both occurrences', () => { expect(() => resolveLocal('2026-11-01T01:30:00','America/New_York')).toThrow('TIME_AMBIGUOUS'); expect(resolveLocal('2026-11-01T01:30:00','America/New_York','earlier')).toBe('2026-11-01T05:30:00Z'); expect(resolveLocal('2026-11-01T01:30:00','America/New_York','later')).toBe('2026-11-01T06:30:00Z'); });
  it('handles southern hemisphere half-hour daylight transitions', () => { expect(() => resolveLocal('2026-10-04T02:15:00','Australia/Lord_Howe')).toThrow('TIME_GAP'); });
  it('uses the exchange date across international boundaries', () => { expect(marketDate('2026-10-29T00:30:00Z','America/New_York')).toBe('2026-10-28'); });
  it('rejects invalid time zones', () => { expect(() => resolveLocal('2026-10-29T12:00:00','Mars/City')).toThrow('TIMEZONE'); });
  it('keeps newer IANA aliases selectable across browser ICU versions', () => { expect(timezones('Asia/Kathmandu')).toContain('Asia/Kathmandu'); expect(timezones('Europe/Kyiv')).toContain('Europe/Kyiv'); });
});
