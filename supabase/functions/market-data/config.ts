// Public deployment settings. No API secrets belong in this file.
export const productionOrigin = 'https://stock-atlas.pages.dev';
export const legacyOrigin = 'https://312901e8.stock-atlas.pages.dev';
export function configuredOrigins(value: string): string[] {
  return value.trim() ? value.split(',').map(origin => origin.trim()).filter(Boolean) : [productionOrigin,legacyOrigin];
}

export function permittedOrigin(origin: string, origins: string[]): boolean {
  if (origins.includes(origin)) return true;
  // Cloudflare assigns an eight-hex-digit hostname to each deployment in this
  // project's namespace. Accept those versions when the project is configured,
  // while keeping custom deployments' explicit origin overrides intact.
  return origins.includes(productionOrigin) && /^https:\/\/[a-f0-9]{8}\.stock-atlas\.pages\.dev$/.test(origin);
}
