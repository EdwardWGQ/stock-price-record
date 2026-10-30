'use strict';
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const arch = process.env.EXPECTED_ARCH;
if (process.platform !== 'darwin' || !['arm64', 'x64'].includes(arch)) throw new Error('Run on the corresponding macOS runner');
const expectedNative = arch === 'x64' ? 'x86_64' : 'arm64';
const directory = path.join(__dirname, 'release', arch === 'arm64' ? 'mac-arm64' : 'mac');
const application = path.join(directory, 'US Equity Monitor.app');
const executable = path.join(application, 'Contents', 'MacOS', 'US Equity Monitor');
const run = (file, args, timeout = 120000) => execFileSync(file, args, { encoding: 'utf8', timeout, stdio: ['ignore', 'pipe', 'pipe'] });
const native = run('lipo', ['-archs', executable]).trim();
if (native !== expectedNative) throw new Error(`Unexpected architecture ${native}`);
run('codesign', ['--verify', '--deep', '--strict', '--verbose=2', application]);
const plist = path.join(application, 'Contents', 'Info.plist');
const minSystem = run('/usr/libexec/PlistBuddy', ['-c', 'Print LSMinimumSystemVersion', plist]).trim();
if (minSystem !== '13.0.0') throw new Error(`Unexpected minimum macOS ${minSystem}`);
const version = require('./package.json').version;
const dmg = path.join(__dirname, 'release', `US-Equity-Monitor-${version}-mac-${arch}.dmg`);
const zip = path.join(__dirname, 'release', `US-Equity-Monitor-${version}-mac-${arch}.zip`);
run('hdiutil', ['verify', dmg]);
run('unzip', ['-t', zip]);
const mount = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'equity-monitor-dmg-'));
try {
  run('hdiutil', ['attach', '-readonly', '-nobrowse', '-mountpoint', mount, dmg]);
  const mounted = path.join(mount, 'US Equity Monitor.app');
  if (!fs.existsSync(mounted) || !fs.lstatSync(path.join(mount, 'Applications')).isSymbolicLink()) throw new Error('DMG lacks the app or Applications link');
  run('codesign', ['--verify', '--deep', '--strict', mounted]);
} finally {
  run('hdiutil', ['detach', mount]);
  fs.rmdirSync(mount);
}
const modes = ['live', 'demo', 'offline'];
const results = [];
for (const mode of modes) {
  const args = ['--smoke-test', ...(mode === 'live' ? [] : [`--${mode}`])];
  const output = run(executable, args, 90000);
  process.stdout.write(output);
  const line = output.split('\n').find(value => value.startsWith('{"event":"desktop-smoke"'));
  if (!line) throw new Error(`No application verification output for ${mode}`);
  const state = JSON.parse(line);
  if (state.background !== 'rgb(0, 0, 0)') throw new Error('Monitor background changed');
  results.push({ mode, title: state.title, login: state.login, demo: state.demo, sandbox: state.sandbox, nodeIntegration: state.nodeIntegration });
}
const report = { platform: 'darwin', arch, native, minimumSystemVersion: minSystem, signature: 'ad-hoc verified', dmgVerified: true, zipVerified: true, checkedAt: new Date().toISOString(), screens: results };
fs.writeFileSync(path.join(__dirname, 'release', `mac-verification-${arch}.json`), JSON.stringify(report, null, 2) + '\n');
process.stdout.write(JSON.stringify(report) + '\n');
