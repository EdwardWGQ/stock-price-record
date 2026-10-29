import { Temporal } from '@js-temporal/polyfill';

export function validTimezone(zone: string): boolean {
  try { new Intl.DateTimeFormat('en', { timeZone: zone }); return !!zone; } catch { return false; }
}
export function timezones(...selected: string[]): string[] {
  // Browsers may expose old aliases (e.g. Asia/Katmandu) while records use newer IANA names.
  const aliases = ['Asia/Kathmandu', 'Asia/Kolkata', 'Europe/Kyiv', 'America/Nuuk', 'Pacific/Chuuk', 'Pacific/Pohnpei'];
  return Array.from(new Set(['UTC', Intl.DateTimeFormat().resolvedOptions().timeZone, ...Intl.supportedValuesOf('timeZone'), ...aliases.filter(validTimezone), ...selected.filter(validTimezone)])).sort();
}
export function toLocal(instant: string, zone: string): string {
  return Temporal.Instant.from(instant).toZonedDateTimeISO(zone).toPlainDateTime().toString({ smallestUnit: 'second' });
}
export function resolveLocal(local: string, zone: string, occurrence: 'reject' | 'earlier' | 'later' = 'reject'): string {
  if (!validTimezone(zone)) throw new Error('TIMEZONE');
  let plain: Temporal.PlainDateTime;
  try { plain = Temporal.PlainDateTime.from(local); } catch { throw new Error('TIME_INVALID'); }
  const earlier = plain.toZonedDateTime(zone, { disambiguation: 'earlier' });
  const later = plain.toZonedDateTime(zone, { disambiguation: 'later' });
  if (!earlier.toPlainDateTime().equals(plain) || !later.toPlainDateTime().equals(plain)) throw new Error('TIME_GAP');
  if (!earlier.equals(later) && occurrence === 'reject') throw new Error('TIME_AMBIGUOUS');
  return (occurrence === 'later' ? later : earlier).toInstant().toString();
}
export function formatTime(instant: string, zone: string, language: string): string {
  return new Intl.DateTimeFormat(language === 'zh' ? 'zh-CN' : 'en-GB', {
    timeZone: zone, year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', timeZoneName: 'short',
  }).format(new Date(instant));
}
export function marketDate(instant: string, zone: string): string {
  return Temporal.Instant.from(instant).toZonedDateTimeISO(zone).toPlainDate().toString();
}
