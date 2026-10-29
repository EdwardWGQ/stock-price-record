'use strict';
const MAX_EXPORT_BYTES = 20 * 1024 * 1024;
function validateExport(data) {
  if (typeof data !== 'string' || Buffer.byteLength(data, 'utf8') > MAX_EXPORT_BYTES) {
    throw new Error('Invalid export size');
  }
  const json = JSON.parse(data);
  if (json.version !== 1 || !Array.isArray(json.watchlist) || !Array.isArray(json.trades)) {
    throw new Error('Invalid export format');
  }
  return data;
}
module.exports = { validateExport, MAX_EXPORT_BYTES };
