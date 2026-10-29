'use strict';
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('equityDesktop', {
  saveExport: data => ipcRenderer.invoke('equity:save-export', data),
});
