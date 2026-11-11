'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const version = require('./package.json').version;
if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error('Desktop releases require a stable numeric version');
const directory = path.resolve(process.argv[2] || path.join(__dirname, 'release'));
const windowsOnly = process.argv.includes('--windows-only');
const filenames = [
  `US-Equity-Monitor-${version}-x64-nsis.exe`,
  `US-Equity-Monitor-${version}-x64-portable.exe`,
  ...(windowsOnly ? [] : ['arm64', 'x64'].flatMap(arch => ['dmg', 'zip'].map(ext => `US-Equity-Monitor-${version}-mac-${arch}.${ext}`))),
];

async function prepare() {
  const reports = ['windows-verification.json', ...(windowsOnly ? [] : ['mac-verification-arm64.json', 'mac-verification-x64.json'])];
  for (const filename of reports) {
    const report = JSON.parse(fs.readFileSync(path.join(directory, filename), 'utf8'));
    if (report.version !== version || !Array.isArray(report.screens) || report.screens.length < 3) throw new Error(`Unverified version in ${filename}`);
    for (const mode of ['live', 'demo', 'offline']) {
      if (!report.screens.some(screen => screen.mode === mode)) throw new Error(`Missing ${mode} check in ${filename}`);
    }
    if (filename === 'windows-verification.json' && (report.platform !== 'win32' || report.arch !== 'x64')) throw new Error('Unexpected Windows report');
    if (filename.startsWith('mac-verification-') && (report.platform !== 'darwin' || filename !== `mac-verification-${report.arch}.json` || !report.dmgVerified || !report.zipVerified)) throw new Error('Unexpected macOS report');
  }
  const packages = [];
  for (const filename of filenames) {
    const file = path.join(directory, filename);
    const size = fs.statSync(file).size;
    if (size < 1024 * 1024) throw new Error(`Incomplete installer: ${filename}`);
    const hash = crypto.createHash('sha256');
    for await (const chunk of fs.createReadStream(file)) hash.update(chunk);
    packages.push({ filename, size, sha256: hash.digest('hex') });
  }
  fs.writeFileSync(path.join(directory, 'SHA256SUMS.txt'), packages.map(file => `${file.sha256}  ${file.filename}`).join('\n') + '\n');
  for (const filename of ['README-Windows.txt', ...(windowsOnly ? [] : ['README-macOS.txt']), 'RELEASE.md']) {
    const text = fs.readFileSync(path.join(__dirname, filename), 'utf8').replaceAll('{{version}}', version);
    fs.writeFileSync(path.join(directory, filename), text);
  }
  fs.writeFileSync(path.join(directory, 'release-manifest.json'), JSON.stringify({ version, tag: `desktop-v${version}`, sourceCommit: process.env.GITHUB_SHA || null, verifiedAt: new Date().toISOString(), packages }, null, 2) + '\n');
  console.log(JSON.stringify({ version, directory, packages: packages.map(file => file.filename) }));
}
prepare().catch(error => { console.error(error.message); process.exitCode = 1; });
