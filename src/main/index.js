import { app, BrowserWindow, ipcMain, dialog } from 'electron'

/**
 * Set `__static` path to static files in production
 * https://simulatedgreg.gitbooks.io/electron-vue/content/en/using-static-assets.html
 */
if (process.env.NODE_ENV !== 'development') {
    global.__static = require('path').join(__dirname, '/static').replace(/\\/g, '\\\\')
}

let mainWindow
const winURL = process.env.NODE_ENV === 'development'
    ? `http://localhost:9080`
    : `file://${__dirname}/index.html`

function createWindow() {
    /**
     * Initial window options
     */
    mainWindow = new BrowserWindow({
        height: 360,
        useContentSize: true,
        width: 640
    })
    mainWindow.setMenu(null)
    mainWindow.loadURL(winURL)

    mainWindow.on('closed', () => {
        mainWindow = null
    })
}

app.on('ready', createWindow)

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow()
    }
})

ipcMain.on('browse-firmware-path', () => {
    var firmwarePath = dialog.showOpenDialog({ properties: ['openFile'], title: 'select new firmware to update' })

    if (firmwarePath != null) {
        mainWindow.webContents.send('browse-firmware-path-response', firmwarePath)
    }
})

ipcMain.on("update-firmware", (event, arg) => {
    var child = require('child_process').execFile;
    var executablePath = ''
    var parameters = [arg];
    // executablePath = require('path').join(require('path').dirname(__dirname), 'script', 'windows\\hid-flash.exe')

    if (require('os').platform() == 'win32') {
        if (process.env.NODE_ENV === 'development') {
            executablePath = require('path').join(require('path').dirname(__dirname), 'script', 'windows\\hid-flash.exe')
        } else {
            executablePath = require('path').join(process.resourcesPath, 'script', 'windows\\hid-flash.exe')
        }
    }
    else if (require('os').platform() == 'darwin') {
        if (process.env.NODE_ENV === 'development') {
            executablePath = require('path').join(require('path').dirname(__dirname), 'script', 'darwin\\hid-flash')
        } else {
            executablePath = require('path').join(process.resourcesPath, 'script', 'darwin\\hid-flash')
        }
    }

    mainWindow.webContents.send('update-firmware-start')

    child(executablePath, parameters, function (err, data) {
        if (err) {
            // may show error dialog ...
            // console.log(err)
            dialog.showErrorBox('Updating Error', err)
            return;
        }

        var log = data.split(/\r?\n/)[0].split(':')

        if (log[0] == 'Error')
        {
            dialog.showErrorBox('Updating Error', log[1])
        }

        mainWindow.webContents.send('update-firmware-finish')
    });
})

/**
 * Auto Updater
 *
 * Uncomment the following code below and install `electron-updater` to
 * support auto updating. Code Signing with a valid certificate is required.
 * https://simulatedgreg.gitbooks.io/electron-vue/content/en/using-electron-builder.html#auto-updating
 */

/*
import { autoUpdater } from 'electron-updater'

autoUpdater.on('update-downloaded', () => {
  autoUpdater.quitAndInstall()
})

app.on('ready', () => {
  if (process.env.NODE_ENV === 'production') autoUpdater.checkForUpdates()
})
 */
