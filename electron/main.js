const path = require('path');
const { app, BrowserWindow, ipcMain } = require('electron');
const SystemEventCapture = require('./systemEvents');

const isMac = process.platform === 'darwin';

// Global system event capture instance
let systemEvents = null;
let mainWindow = null;

/**
 * Create the primary application window.
 */
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 640,
    backgroundColor: '#0f172a',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  const rendererHtml = path.join(__dirname, 'renderer', 'index.html');
  mainWindow.loadFile(rendererHtml);

  if (!app.isPackaged && process.env.ELECTRON_OPEN_DEVTOOLS !== 'false') {
    mainWindow.webContents.openDevTools({ mode: 'detach' }).catch(() => {
      // Ignore failures caused by devtools being unavailable.
    });
  }

  return mainWindow;
}

/**
 * Application bootstrap.
 */
app.whenReady().then(() => {
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (!isMac) {
    app.quit();
  }
});

ipcMain.handle('app:getEnvironment', () => ({
  isPackaged: app.isPackaged,
  version: app.getVersion(),
  name: app.getName(),
}));

/**
 * System-level event monitoring IPC handlers
 */
ipcMain.handle('systemEvents:start', () => {
  try {
    if (!systemEvents) {
      systemEvents = new SystemEventCapture();
      
      // Forward events to renderer
      systemEvents.on('mousemove', (data) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('systemEvent:mousemove', data);
        }
      });

      systemEvents.on('keydown', (data) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('systemEvent:keydown', data);
        }
      });

      systemEvents.on('keyup', (data) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('systemEvent:keyup', data);
        }
      });

      systemEvents.on('click', (data) => {
        console.log('[Main] System click event received:', data);
        if (mainWindow && !mainWindow.isDestroyed()) {
          console.log('[Main] Forwarding click event to renderer via IPC...');
          mainWindow.webContents.send('systemEvent:click', data);
        } else {
          console.warn('[Main] Cannot send click event - mainWindow not available');
        }
      });

      systemEvents.on('scroll', (data) => {
        console.log('[Main] System scroll event received:', data);
        if (mainWindow && !mainWindow.isDestroyed()) {
          console.log('[Main] Forwarding scroll event to renderer via IPC...');
          mainWindow.webContents.send('systemEvent:scroll', data);
        } else {
          console.warn('[Main] Cannot send scroll event - mainWindow not available');
        }
      });
    }

    systemEvents.start();
    return { success: true };
  } catch (error) {
    console.error('[Main] Error starting system events:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('systemEvents:stop', () => {
  try {
    if (systemEvents) {
      systemEvents.stop();
      systemEvents = null;
    }
    return { success: true };
  } catch (error) {
    console.error('[Main] Error stopping system events:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('systemEvents:getMousePosition', () => {
  try {
    if (systemEvents) {
      return systemEvents.getMousePosition();
    }
    return null;
  } catch (error) {
    console.error('[Main] Error getting mouse position:', error);
    return null;
  }
});

// Cleanup on app quit
app.on('will-quit', () => {
  if (systemEvents) {
    systemEvents.stop();
    systemEvents = null;
  }
});

