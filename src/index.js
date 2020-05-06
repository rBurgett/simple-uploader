import { app, BrowserWindow, ipcMain, Menu } from 'electron';
import isDev from 'electron-is-dev';
import { autoUpdater } from 'electron-updater';
import fs from 'fs-extra';
import path from 'path';

const { platform } = process;

require('electron-context-menu')();

app.on('ready', () => {

  const width = 400;
  const height = platform === 'win32' ? 420 : platform === 'darwin' ? 400 : 380;
  const appWindow = new BrowserWindow({
    show: false,
    minWidth: width,
    width,
    minHeight: height,
    height,
    webPreferences: {
      nodeIntegration: true
    }
  });

  appWindow.once('ready-to-show', () => {
    appWindow.show();
    appWindow.focus();
  });

  appWindow.loadURL(`file://${path.resolve(__dirname, '..')}/public/index.html`);

  if(platform === 'darwin') {
    const menuTemplate = [];
    // File Menu
    menuTemplate.push({
      label: 'File',
      submenu: [
        { role: 'quit' }
      ]
    });
    // Edit Menu
    menuTemplate.push({
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectall' }
      ]
    });
    // Window Menu
    if(isDev) {
      menuTemplate.push({
        label: 'Window',
        submenu: [
          { label: 'Show Dev Tools', role: 'toggledevtools' }
        ]
      });
    }
    const appMenu = Menu.buildFromTemplate(menuTemplate);
    Menu.setApplicationMenu(appMenu);
  }

});

ipcMain.on('getVersion', e => {
  const { version } = fs.readJsonSync(path.join(__dirname, 'package.json'));
  e.returnValue = version;
});

// Properly close the application
app.on('window-all-closed', () => {
  app.quit();
});

// Check for updates and automatically install
if(!isDev) autoUpdater.checkForUpdates();
