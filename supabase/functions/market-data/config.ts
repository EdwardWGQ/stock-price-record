// Public deployment settings. No API secrets belong in this file.
export const productionOrigin = 'https://stock-atlas.pages.dev';
export const legacyOrigin = 'https://312901e8.stock-atlas.pages.dev';
export function configuredOrigins(value: string): string[] {
  return value.trim() ? value.split(',').map(origin => origin.trim()).filter(Boolean) : [productionOrigin,legacyOrigin];
}
