'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { isSite, isExternal } = require('./policy.cjs');
test('permits only the live and demo HTTPS site in the application', () => {
  assert.equal(isSite('https://stock-atlas.pages.dev/auth/callback?code=abc'), true);
  assert.equal(isSite('https://demo.stock-atlas.pages.dev/'), true);
  for (const url of ['http://stock-atlas.pages.dev/', 'https://stock-atlas.pages.dev.evil.example/', 'https://user:pass@stock-atlas.pages.dev/', 'file:///C:/test.html', 'javascript:alert(1)', 'https://evil.example/']) assert.equal(isSite(url), false);
});
test('rejects external links that invoke local applications or embed credentials', () => {
  assert.equal(isExternal('https://github.com/EdwardWGQ/stock-price-record'), true);
  for (const url of ['javascript:alert(1)', 'file:///C:/test.exe', 'shell:Startup', 'http://example.com', 'https://user:pass@example.com/']) assert.equal(isExternal(url), false);
});
