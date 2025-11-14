const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  getEnvironment: async () => {
    try {
      return await ipcRenderer.invoke('app:getEnvironment');
    } catch (error) {
      console.error('[Electron] Failed to get environment', error);
      return {
        isPackaged: true,
        version: 'unknown',
        name: 'COGA',
      };
    }
  },
  systemEvents: {
    start: async () => {
      try {
        return await ipcRenderer.invoke('systemEvents:start');
      } catch (error) {
        console.error('[Electron] Failed to start system events', error);
        return { success: false, error: error.message };
      }
    },
    stop: async () => {
      try {
        return await ipcRenderer.invoke('systemEvents:stop');
      } catch (error) {
        console.error('[Electron] Failed to stop system events', error);
        return { success: false, error: error.message };
      }
    },
    getMousePosition: async () => {
      try {
        return await ipcRenderer.invoke('systemEvents:getMousePosition');
      } catch (error) {
        console.error('[Electron] Failed to get mouse position', error);
        return null;
      }
    },
    on: (eventType, callback) => {
      const channel = `systemEvent:${eventType}`;
      const handler = (_event, data) => callback(data);
      ipcRenderer.on(channel, handler);
      
      // Return cleanup function
      return () => {
        ipcRenderer.removeListener(channel, handler);
      };
    },
    off: (eventType, handler) => {
      const channel = `systemEvent:${eventType}`;
      ipcRenderer.removeListener(channel, handler);
    },
  },
});

