'use strict';
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
if (process.platform !== 'win32' || process.arch !== 'x64') throw new Error('Run on Windows x64');
const version = require('./package.json').version;
const directory = path.join(__dirname, 'release');
const installer = path.join(directory, `US-Equity-Monitor-${version}-x64-nsis.exe`);
const portable = path.join(directory, `US-Equity-Monitor-${version}-x64-portable.exe`);
for (const file of [installer, portable]) {
  const descriptor = fs.openSync(file, 'r');
  const header = Buffer.alloc(2);
  try { fs.readSync(descriptor, header, 0, 2, 0); } finally { fs.closeSync(descriptor); }
  if (header.toString('ascii') !== 'MZ' || fs.statSync(file).size < 1024 * 1024) throw new Error(`Invalid executable: ${path.basename(file)}`);
}
const screens = [];
const reportDirectory = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'equity-monitor-verification-'));
for (const [kind, file] of [['unpacked', path.join(directory, 'win-unpacked', 'US Equity Monitor.exe')], ['portable', portable]]) {
  for (const mode of ['live', 'demo', 'offline']) {
    const reportFile = path.join(reportDirectory, `${kind}-${mode}.json`);
    execFileSync(file, ['--smoke-test', `--smoke-report=${reportFile}`, ...(mode === 'live' ? [] : [`--${mode}`])], {
      encoding: 'utf8', timeout: 120000, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
    });
    if (!fs.existsSync(reportFile)) throw new Error(`Missing ${kind} ${mode} verification report`);
    const state = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
    fs.unlinkSync(reportFile);
    if (state.version !== version || state.sandbox !== true || state.nodeIntegration !== false) throw new Error(`Unexpected ${kind} ${mode} application`);
    if (mode === 'live' && !state.login || mode === 'demo' && !state.demo || mode === 'offline' && !state.body.includes('暂时无法连接网站')) throw new Error(`Unexpected ${kind} ${mode} screen`);
    screens.push({ kind, mode, ...state });
    process.stdout.write(JSON.stringify({ kind, mode, version, title: state.title }) + '\n');
  }
}
fs.rmdirSync(reportDirectory);
fs.writeFileSync(path.join(directory, 'windows-verification.json'), JSON.stringify({ platform: 'win32', arch: 'x64', version, checkedAt: new Date().toISOString(), screens }, null, 2) + '\n');
