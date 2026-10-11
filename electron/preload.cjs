const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Vault storage
  loadVault: () => ipcRenderer.invoke('vault:load'),
  saveVault: (cipherPayload) => ipcRenderer.invoke('vault:save', cipherPayload),
  resetVault: () => ipcRenderer.invoke('vault:reset'),
  exportVault: (payload) => ipcRenderer.invoke('vault:export', payload),
  importVault: () => ipcRenderer.invoke('vault:import'),

  // Clipboard
  copyWithAutoClear: (text, clearSeconds) => ipcRenderer.invoke('clipboard:copy-with-autoclear', { text, clearSeconds }),

  // Window control
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close: () => ipcRenderer.send('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
  onMaximizedChange: (callback) => {
    const handler = (_, val) => callback(val);
    ipcRenderer.on('window:maximized-change', handler);
    return () => ipcRenderer.removeListener('window:maximized-change', handler);
  },
  onBeforeClose: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('window:before-close', handler);
    ipcRenderer.send('window:close-guard-ready');
    return () => ipcRenderer.removeListener('window:before-close', handler);
  },
  finishClose: (saved) => ipcRenderer.invoke('window:finish-close', saved),

  // Info
  getInfo: () => ipcRenderer.invoke('app:getInfo'),
});
