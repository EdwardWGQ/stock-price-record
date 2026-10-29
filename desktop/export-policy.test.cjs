'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { validateExport, MAX_EXPORT_BYTES } = require('./export-policy.cjs');
test('saves a valid journal JSON including non-ASCII notes without losing decimals', () => {
  const data = JSON.stringify({ version: 1, watchlist: [{ notes: '股票记录', baseline_price: '0.12345678' }], trades: [] });
  assert.equal(validateExport(data), data);
});
test('refuses malformed exports and payloads above the size limit', () => {
  for (const data of [{}, 'not JSON', '{"version":1}', '{"version":1,"watchlist":{},"trades":[]}']) {
    assert.throws(() => validateExport(data));
  }
  assert.throws(() => validateExport('a'.repeat(MAX_EXPORT_BYTES + 1)));
});
