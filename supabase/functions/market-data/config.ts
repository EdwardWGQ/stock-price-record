// Public deployment settings. No API secrets belong in this file.
export const productionOrigin = 'https://stock-atlas.pages.dev';
export function configuredOrigins(value: string): string[] {
  return value.trim() ? value.split(',').map(origin => origin.trim()).filter(Boolean) : [productionOrigin];
}
