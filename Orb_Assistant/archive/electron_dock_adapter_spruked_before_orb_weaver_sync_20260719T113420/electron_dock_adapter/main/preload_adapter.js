const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('orbDockAdapter', {
  status: () => ipcRenderer.invoke('orb-dock:status'),
  send: (payload) => ipcRenderer.invoke('orb-dock:send', payload),
});

