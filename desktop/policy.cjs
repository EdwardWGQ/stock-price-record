'use strict';
const SITE = 'https://stock-atlas.pages.dev/';
const DEMO = 'https://demo.stock-atlas.pages.dev/';
const ORIGINS = new Set([new URL(SITE).origin, new URL(DEMO).origin]);
function isSite(url) {
  try { const value = new URL(url); return ORIGINS.has(value.origin) && value.protocol === 'https:' && !value.username && !value.password; }
  catch { return false; }
}
function isExternal(url) {
  try { const value = new URL(url); return value.protocol === 'https:' && !value.username && !value.password; }
  catch { return false; }
}
module.exports = { SITE, DEMO, isSite, isExternal };
