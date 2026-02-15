import { app, BrowserWindow, shell } from 'electron';
import { join } from 'path';
import { setupIpcHandlers } from './ipc';
import { configService } from './services/config.service';
import { initCrontabService } from './services/crontab.service';
import { createApplicationMenu } from './menu';

const isDev = process.env.NODE_ENV === 'development';

// Initialize services
async function initializeServices() {
  await configService.load();
  initCrontabService(configService);
}

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
    title: 'Cron Manager',
    titleBarStyle: 'default',
    show: false,
  });

  // Create application menu
  createApplicationMenu(mainWindow);

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(join(__dirname, '../../dist/index.html'));
  }

  // Show window when ready
  mainWindow.on('ready-to-show', () => {
    mainWindow?.show();
  });

  // Open external links in browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// App lifecycle
app.whenReady().then(async () => {
  await initializeServices();

  // Setup IPC handlers once when app is ready
  setupIpcHandlers();

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
