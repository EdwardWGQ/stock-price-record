'use strict';
const REPOSITORY = 'https://github.com/EdwardWGQ/stock-price-record';
const RELEASES = `${REPOSITORY}/releases/latest`;
const RELEASE_API = 'https://api.github.com/repos/EdwardWGQ/stock-price-record/releases/latest';

function newer(candidate, installed) {
  if (!/^\d+\.\d+\.\d+$/.test(candidate) || !/^\d+\.\d+\.\d+$/.test(installed)) return false;
  const left = candidate.split('.').map(Number);
  const right = installed.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if (left[i] !== right[i]) return left[i] > right[i];
  }
  return false;
}

function availableUpdate(release, installed, platform, arch) {
  if (!release || release.draft || release.prerelease) return null;
  const match = /^desktop-v(\d+\.\d+\.\d+)$/.exec(release.tag_name || '');
  if (!match || !newer(match[1], installed)) return null;
  const version = match[1];
  const url = `${REPOSITORY}/releases/tag/${release.tag_name}`;
  if (release.html_url !== url) return null;
  const filename = platform === 'win32' && arch === 'x64'
    ? `US-Equity-Monitor-${version}-x64-nsis.exe`
    : platform === 'darwin' && ['arm64', 'x64'].includes(arch)
      ? `US-Equity-Monitor-${version}-mac-${arch}.dmg` : null;
  if (!filename || !Array.isArray(release.assets) || !release.assets.some(asset =>
    asset.name === filename && asset.state === 'uploaded' && asset.size > 0 &&
    asset.browser_download_url === `${REPOSITORY}/releases/download/${release.tag_name}/${filename}`)) return null;
  return { version, url };
}

module.exports = { RELEASES, RELEASE_API, newer, availableUpdate };
