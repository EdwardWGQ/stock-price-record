'use strict';
const { build, Platform, Arch } = require('electron-builder');
const path = require('node:path');
const fs = require('node:fs');
const installedElectron = path.join(__dirname, 'node_modules', 'electron', 'dist');
build({
  targets: Platform.WINDOWS.createTarget(process.argv.includes('--dir') ? ['dir'] : ['nsis', 'portable'], Arch.x64),
  config: fs.existsSync(path.join(installedElectron, 'electron.exe')) ? { electronDist: installedElectron } : {},
}).catch(error => { console.error(error.message); process.exitCode = 1; });
