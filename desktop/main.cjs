'use strict';
const { app, BrowserWindow, Menu, dialog, shell, nativeImage, ipcMain } = require('electron');
const path = require('node:path');
const fs = require('node:fs/promises');
const { pathToFileURL } = require('node:url');
const { SITE, DEMO, isSite, isExternal } = require('./policy.cjs');
const { validateExport } = require('./export-policy.cjs');
const { RELEASES, RELEASE_API, availableUpdate } = require('./update-policy.cjs');
const offline = pathToFileURL(path.join(__dirname, 'offline.html')).href;
const smoke = process.argv.includes('--smoke-test');
const smokeReport = smoke ? process.argv.find(argument => argument.startsWith('--smoke-report='))?.slice('--smoke-report='.length) : null;
const mac = process.platform === 'darwin';
let window;
let showingOffline = false;
let loadTimer;
let finishing = false;
let checkedUpdates = false;
let checkingUpdates = false;
const icon = path.join(__dirname, 'assets', 'icon.png');
if (smoke) app.setPath('userData', path.join(app.getPath('temp'), 'equity-monitor-desktop-smoke'));

if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => {
    if (!window) return;
    if (window.isMinimized()) window.restore();
    window.show(); window.focus();
  });
  app.whenReady().then(createWindow);
}

function showOffline() {
  clearTimeout(loadTimer);
  if (!window || window.isDestroyed() || showingOffline) return;
  showingOffline = true;
  window.loadURL(offline).catch(() => {});
}

function visit(url = SITE) {
  if (!window || window.isDestroyed() || !isSite(url)) return;
  showingOffline = false;
  clearTimeout(loadTimer);
  loadTimer = setTimeout(showOffline, 30000);
  window.loadURL(url).catch(showOffline);
}

async function external(url) {
  if (!isExternal(url) || !window) return;
  const { response } = await dialog.showMessageBox(window, {
    type: 'question', title: '打开外部链接',
    message: '在系统浏览器打开此链接？',
    detail: new URL(url).origin,
    buttons: ['打开 / Open', '取消 / Cancel'], defaultId: 1, cancelId: 1,
  });
  if (response === 0) await shell.openExternal(url);
}

async function checkUpdates(manual = false) {
  if (checkingUpdates || !window || window.isDestroyed()) return;
  checkingUpdates = true;
  try {
    const response = await fetch(RELEASE_API, {
      headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'US-Equity-Monitor-Desktop' },
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error('Update service unavailable');
    const release = await response.json();
    const update = availableUpdate(release, app.getVersion(), process.platform, process.arch);
    if (!window || window.isDestroyed()) return;
    if (update) {
      const { response: choice } = await dialog.showMessageBox(window, {
        type: 'info', title: '发现新版本', message: `桌面版 ${update.version} 已发布`,
        detail: `当前版本：${app.getVersion()}。打开下载页查看更新说明并下载新版。已有账户和云端记录可以继续使用。`,
        buttons: ['下载新版', '稍后'], defaultId: 0, cancelId: 1,
      });
      if (choice === 0) await shell.openExternal(update.url);
    } else if (manual) {
      await dialog.showMessageBox(window, {
        type: 'info', title: '检查更新', message: `当前版本：${app.getVersion()}`,
        detail: '暂未发现适用于这台电脑的更新版本。',
      });
    }
  } catch {
    if (manual && window && !window.isDestroyed()) {
      const { response: choice } = await dialog.showMessageBox(window, {
        type: 'info', title: '检查更新', message: '暂时无法检查更新',
        detail: '请稍后重试，或打开下载页查看最新版本。',
        buttons: ['打开下载页', '关闭'], defaultId: 0, cancelId: 1,
      });
      if (choice === 0) await shell.openExternal(RELEASES);
    }
  } finally { checkingUpdates = false; }
}

function createWindow() {
  window = new BrowserWindow({
    title: 'US Equity Monitor', width: 1400, height: 900, minWidth: 760, minHeight: 560,
    backgroundColor: '#000000', icon: nativeImage.createFromPath(icon), show: false,
    webPreferences: {
      nodeIntegration: false, contextIsolation: true, sandbox: true, webSecurity: true,
      allowRunningInsecureContent: false, partition: 'persist:equity-monitor',
      preload: path.join(__dirname, 'preload.cjs'),
      spellcheck: false,
    },
  });
  window.once('ready-to-show', () => { if (!smoke) window?.show(); });
  const session = window.webContents.session;
  session.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  session.setPermissionCheckHandler(() => false);
  window.webContents.on('will-attach-webview', event => event.preventDefault());
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (isSite(url)) visit(url); else void external(url);
    return { action: 'deny' };
  });
  window.webContents.on('will-navigate', (event, url) => {
    if (url === offline) return;
    if (isSite(url)) {
      showingOffline = false;
      clearTimeout(loadTimer);
      loadTimer = setTimeout(showOffline, 30000);
      return;
    }
    event.preventDefault(); void external(url);
  });
  window.webContents.on('will-redirect', (event, url) => {
    if (!isSite(url)) { event.preventDefault(); void external(url); }
  });
  window.webContents.on('did-fail-load', (_event, code, _description, _url, mainFrame) => {
    if (mainFrame && code !== -3) showOffline();
  });
  window.webContents.on('did-finish-load', async () => {
    clearTimeout(loadTimer); if (!smoke) window?.show();
    if (!smoke) {
      if (!showingOffline && !checkedUpdates) { checkedUpdates = true; void checkUpdates(); }
      return;
    }
    if (finishing) return;
    finishing = true;
    try {
      // did-finish-load precedes React's account initialization. Wait for the
      // intended screen so the packaged executable is tested after rendering.
      let state;
      for (let attempt = 0; attempt < 150; attempt++) {
        state = await window.webContents.executeJavaScript(`({
          title: document.title,
          body: document.body.innerText.slice(0,2000),
          demo: !!document.querySelector('.demo-banner'),
          login: !!document.querySelector('.auth-card'),
          background: getComputedStyle(document.body).backgroundColor
        })`);
        if (showingOffline || state.demo || state.login) break;
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      const report = { event: 'desktop-smoke', version: app.getVersion(), ...state,
        sandbox: true, nodeIntegration: false };
      process.stdout.write(JSON.stringify(report) + '\n');
      // The Windows portable launcher does not forward the application's stdout.
      if (smokeReport && path.isAbsolute(smokeReport)) await fs.writeFile(smokeReport, JSON.stringify(report) + '\n', 'utf8');
      const expected = process.argv.includes('--offline') ? showingOffline :
        !showingOffline && (process.argv.includes('--demo') ? state.demo : state.login);
      app.exit(expected ? 0 : 1);
    } catch (error) { process.stderr.write(error.message + '\n'); app.exit(1); }
  });

  session.on('will-download', (_event, item, contents) => {
    if (contents !== window?.webContents || !isSite(contents.getURL())) { item.cancel(); return; }
    item.setSaveDialogOptions({
      title: '保存导出文件',
      defaultPath: path.join(app.getPath('downloads'), path.basename(item.getFilename())),
    });
    item.once('done', (_event, state) => {
      if (state !== 'completed' && state !== 'cancelled') void dialog.showMessageBox(window, {
        type: 'error', message: '导出未完成，请重试。',
      });
    });
  });

  Menu.setApplicationMenu(Menu.buildFromTemplate([
    ...(mac ? [{ label: app.name, submenu: [
      { role: 'about' }, { type: 'separator' },
      { role: 'hide' }, { role: 'hideOthers' }, { role: 'unhide' },
      { type: 'separator' }, { role: 'quit' },
    ] }] : []),
    { label: '应用', submenu: [
      { label: '正式网站', click: () => visit(SITE) },
      { label: '演示模式', click: () => visit(DEMO) },
      { type: 'separator' },
      { label: '退出', accelerator: mac ? 'Command+Q' : 'Alt+F4', click: () => app.quit() },
    ] },
    { label: '编辑', submenu: [
      { role: 'undo' }, { role: 'redo' }, { type: 'separator' },
      { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' },
    ] },
    { label: '查看', submenu: [
      { label: '刷新', accelerator: 'CommandOrControl+R', click: () => showingOffline ? visit() : window.webContents.reload() },
      ...(mac ? [{ role: 'close' }] : []),
      { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }, { role: 'togglefullscreen' },
    ] },
    { label: '帮助', submenu: [
      { label: '在浏览器打开', click: () => shell.openExternal(SITE) },
      { label: '检查更新', click: () => void checkUpdates(true) },
      { label: '下载最新版本', click: () => shell.openExternal(RELEASES) },
      { label: '关于', click: () => dialog.showMessageBox(window, {
        type: 'info', title: 'US Equity Monitor',
        message: `US Equity Monitor ${app.getVersion()}`,
        detail: `${mac ? 'macOS' : 'Windows'} 桌面客户端。登录、行情和保存需要联网。网页更新会自动同步到客户端。`,
      }) },
    ] },
  ]));
  window.on('closed', () => { clearTimeout(loadTimer); window = null; });
  if (smoke && process.argv.includes('--offline')) showOffline();
  else visit(smoke && process.argv.includes('--demo') ? DEMO : SITE);
}

app.on('window-all-closed', () => { if (!mac) app.quit(); });
app.on('activate', () => { if (!window) createWindow(); });

ipcMain.handle('equity:save-export', async (event, input) => {
  // Only this window's top-level trusted page may request a JSON save.
  // The page never supplies a filesystem path and has no general-purpose native API.
  if (!window || event.sender !== window.webContents ||
      event.senderFrame !== window.webContents.mainFrame || !isSite(event.senderFrame.url)) {
    throw new Error('Export is not allowed from this page');
  }
  const data = validateExport(input);
  const { canceled, filePath } = await dialog.showSaveDialog(window, {
    title: '保存导出文件',
    defaultPath: path.join(app.getPath('downloads'), 'us-equity-monitor.json'),
    filters: [{ name: 'JSON', extensions: ['json'] }],
  });
  if (canceled || !filePath) return { saved: false };
  await fs.writeFile(filePath, data, 'utf8');
  return { saved: true };
});
