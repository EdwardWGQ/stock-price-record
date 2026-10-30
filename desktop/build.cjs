'use strict';
const { build, Platform, Arch } = require('electron-builder');
const path = require('node:path');
const fs = require('node:fs');
const installedElectron = path.join(__dirname, 'node_modules', 'electron', 'dist');
const mac = process.argv.includes('--mac') || process.platform === 'darwin';
const arch = process.argv.includes('--arm64') ? Arch.arm64 : process.argv.includes('--x64') ? Arch.x64 : mac && process.arch === 'arm64' ? Arch.arm64 : Arch.x64;
if (mac && process.platform !== 'darwin') {
  console.error('Build macOS packages on a Mac or with the Build macOS Desktop GitHub workflow.');
  process.exit(1);
}
build({
  targets: (mac ? Platform.MAC : Platform.WINDOWS).createTarget(process.argv.includes('--dir') ? ['dir'] : mac ? ['dmg', 'zip'] : ['nsis', 'portable'], arch),
  publish: 'never',
  config: !mac && fs.existsSync(path.join(installedElectron, 'electron.exe')) ? { electronDist: installedElectron } : {},
}).catch(error => { console.error(error.message); process.exitCode = 1; });
