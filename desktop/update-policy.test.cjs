'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { newer, availableUpdate } = require('./update-policy.cjs');
const repository = 'https://github.com/EdwardWGQ/stock-price-record';

function release(version = '1.2.0') {
  const tag = `desktop-v${version}`;
  return {
    tag_name: tag, html_url: `${repository}/releases/tag/${tag}`, draft: false, prerelease: false,
    assets: ['x64-nsis.exe', 'mac-arm64.dmg', 'mac-x64.dmg'].map(suffix => {
      const name = `US-Equity-Monitor-${version}-${suffix}`;
      return { name, state: 'uploaded', size: 100, browser_download_url: `${repository}/releases/download/${tag}/${name}` };
    }),
  };
}

test('compares numeric versions and ignores equal, older and prerelease versions', () => {
  assert.equal(newer('1.10.0', '1.9.9'), true);
  assert.equal(newer('2.0.0', '1.99.99'), true);
  assert.equal(newer('1.1.0', '1.1.0'), false);
  assert.equal(newer('1.0.9', '1.1.0'), false);
  assert.equal(newer('1.2.0-beta.1', '1.1.0'), false);
});

test('offers updates only when the current platform has a published installer', () => {
  const data = release();
  for (const [platform, arch] of [['win32', 'x64'], ['darwin', 'arm64'], ['darwin', 'x64']]) {
    assert.deepEqual(availableUpdate(data, '1.1.0', platform, arch), { version: '1.2.0', url: data.html_url });
  }
  assert.equal(availableUpdate(data, '1.1.0', 'linux', 'x64'), null);
  assert.equal(availableUpdate(data, '1.1.0', 'win32', 'arm64'), null);
  assert.equal(availableUpdate({ ...data, assets: [] }, '1.1.0', 'win32', 'x64'), null);
  assert.equal(availableUpdate({ ...data, assets: [{ ...data.assets[0], state: 'new' }] }, '1.1.0', 'win32', 'x64'), null);
});

test('rejects drafts, prereleases, foreign links and incomplete assets', () => {
  const data = release();
  for (const extra of [{ draft: true }, { prerelease: true }, { tag_name: 'desktop-mac-v1.2.0' }, { html_url: 'https://example.com/update' }]) {
    assert.equal(availableUpdate({ ...data, ...extra }, '1.1.0', 'win32', 'x64'), null);
  }
  for (const extra of [{ size: 0 }, { browser_download_url: 'https://example.com/install.exe' }]) {
    assert.equal(availableUpdate({ ...data, assets: [{ ...data.assets[0], ...extra }] }, '1.1.0', 'win32', 'x64'), null);
  }
  assert.equal(availableUpdate(null, '1.1.0', 'win32', 'x64'), null);
  assert.equal(availableUpdate(release('1.0.0'), '1.1.0', 'win32', 'x64'), null);
});
