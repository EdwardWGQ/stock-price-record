'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { nextVersion } = require('./release-version.cjs');

test('uses the first planned version and increments subsequent website releases automatically', () => {
  assert.equal(nextVersion('1.1.0', undefined), '1.1.0');
  assert.equal(nextVersion('1.1.0', '1.0.0'), '1.1.0');
  assert.equal(nextVersion('1.1.0', '1.1.0'), '1.1.1');
  assert.equal(nextVersion('1.1.0', '1.1.9'), '1.1.10');
  assert.equal(nextVersion('1.2.0', '1.1.10'), '1.2.0');
  assert.equal(nextVersion('2.0.0', '1.9.99'), '2.0.0');
  assert.throws(() => nextVersion('1.1.0-beta.1', '1.1.0'));
});
