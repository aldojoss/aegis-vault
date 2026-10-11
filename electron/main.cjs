const { app, BrowserWindow, ipcMain, dialog, clipboard, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { readVault, saveVault } = require('./vault-storage.cjs');

// Keep the same location in development, installed builds and future updates.
app.setPath('userData', path.join(app.getPath('appData'), 'aegis-vault'));

let mainWindow = null;
let clipboardClearTimeout = null;
let closeGuardReady = false;
let canClose = false;
let loadedVaultPath = null;

const hasSingleInstanceLock = app.requestSingleInstanceLock();
if (!hasSingleInstanceLock) app.quit();
app.on('second-instance', () => {
  if (mainWindow) { if (mainWindow.isMinimized()) mainWindow.restore(); mainWindow.focus(); }
});

function getVaultFilePath() {
  return path.join(app.getPath('userData'), 'aegis_vault_v1.enc');
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1160,
    height: 760,
    minWidth: 960,
    minHeight: 620,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#0b0e14',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
    icon: path.join(__dirname, '../build/icon.ico'),
    show: false,
  });

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  const distPath = path.join(__dirname, '../dist/index.html');

  if (isDev && process.env.ELECTRON_START_URL) {
    mainWindow.loadURL(process.env.ELECTRON_START_URL);
  } else if (fs.existsSync(distPath)) {
    mainWindow.loadFile(distPath);
  } else {
    mainWindow.loadURL('http://localhost:5173');
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('close', (event) => {
    if (closeGuardReady && !canClose) {
      event.preventDefault();
      mainWindow.webContents.send('window:before-close');
    }
  });
  mainWindow.webContents.on('will-navigate', (event) => event.preventDefault());
  mainWindow.webContents.session.setPermissionRequestHandler((_, __, callback) => callback(false));
  mainWindow.webContents.session.setPermissionCheckHandler(() => false);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  mainWindow.on('maximize', () => {
    mainWindow.webContents.send('window:maximized-change', true);
  });

  mainWindow.on('unmaximize', () => {
    mainWindow.webContents.send('window:maximized-change', false);
  });
}

app.whenReady().then(() => {
  if (!hasSingleInstanceLock) return;
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handlers
ipcMain.handle('vault:load', async () => {
  const filePath = getVaultFilePath();
  try {
    const data = readVault(filePath);
    if (data !== null) { loadedVaultPath = filePath; return { success: true, data }; }
    const legacyPath = path.join(app.getPath('appData'), 'Aegis Vault', 'aegis_vault_v1.enc');
    const legacyData = readVault(legacyPath);
    loadedVaultPath = legacyData ? legacyPath : null;
    return { success: true, data: legacyData };
  } catch (err) {
    console.error('Error al cargar vault:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('vault:save', async (_, cipherPayload) => {
  const filePath = getVaultFilePath();
  try {
    saveVault(filePath, cipherPayload);
    loadedVaultPath = filePath;
    return { success: true };
  } catch (err) {
    console.error('Error al guardar vault:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('vault:reset', () => {
  try {
    const filePath = loadedVaultPath || getVaultFilePath();
    if (fs.existsSync(filePath)) {
      fs.renameSync(filePath, `${filePath}.reset-${Date.now()}.bak`);
    }
    loadedVaultPath = null;
    return { success: true };
  } catch (error) { return { success: false, error: error.message }; }
});

ipcMain.handle('vault:export', async (_, { content, defaultName }) => {
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Exportar Bóveda de Aegis',
    defaultPath: defaultName || 'aegis-backup.aegis',
    filters: [
      { name: 'Archivo de Respaldo Aegis (*.aegis)', extensions: ['aegis'] },
      { name: 'Archivo JSON (*.json)', extensions: ['json'] },
      { name: 'Todos los archivos', extensions: ['*'] }
    ]
  });

  if (canceled || !filePath) return { success: false, canceled: true };

  try {
    fs.writeFileSync(filePath, content, 'utf-8');
    return { success: true, filePath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('vault:import', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: 'Importar Bóveda o Contraseñas',
    properties: ['openFile'],
    filters: [
      { name: 'Archivos Aegis / JSON / CSV', extensions: ['aegis', 'json', 'csv'] },
      { name: 'Todos los archivos', extensions: ['*'] }
    ]
  });

  if (canceled || !filePaths || filePaths.length === 0) {
    return { success: false, canceled: true };
  }

  try {
    const rawContent = fs.readFileSync(filePaths[0], 'utf-8');
    return { success: true, content: rawContent, fileName: path.basename(filePaths[0]) };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('clipboard:copy-with-autoclear', async (_, { text, clearSeconds = 30 }) => {
  try {
    clipboard.writeText(text);

    if (clipboardClearTimeout) {
      clearTimeout(clipboardClearTimeout);
      clipboardClearTimeout = null;
    }

    if (clearSeconds > 0) {
      clipboardClearTimeout = setTimeout(() => {
        if (clipboard.readText() === text) {
          clipboard.clear();
        }
      }, clearSeconds * 1000);
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Window controls
ipcMain.on('window:close-guard-ready', () => { closeGuardReady = true; });
ipcMain.handle('window:finish-close', async (_, saved) => {
  if (saved) {
    canClose = true;
    mainWindow?.close();
  } else {
    await dialog.showMessageBox(mainWindow, { type: 'error', title: 'Cambios sin guardar', message: 'No se pudo guardar la bóveda. La ventana seguirá abierta para que puedas reintentar o exportar tus datos.', buttons: ['Volver a la bóveda'] });
  }
});
ipcMain.on('window:minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('window:maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on('window:close', () => {
  if (mainWindow) mainWindow.close();
});

ipcMain.handle('window:isMaximized', () => {
  return mainWindow ? mainWindow.isMaximized() : false;
});

ipcMain.handle('app:getInfo', () => {
  return {
    version: app.getVersion(),
    vaultPath: getVaultFilePath(),
  };
});
