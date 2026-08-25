const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { createOrbBridge } = require('./orb-bridge');

let mainWindow;
const bridge = createOrbBridge();

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 420,
    height: 720,
    webPreferences: {
      preload: path.join(__dirname, 'preload_adapter.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const target = process.env.SPRUKED_ORB_URL || 'http://127.0.0.1:3001';
  mainWindow.loadURL(target);
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('orb-dock:status', async () => bridge.status());
ipcMain.handle('orb-dock:send', async (_event, payload) => bridge.send(payload));

