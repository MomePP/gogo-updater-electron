import { app, BrowserWindow, ipcMain, dialog } from "electron";

const fs = require("fs");
var functions = require("./functions");
import hidHandler from "./hidHandler";

/**
 * Set `__static` path to static files in production
 * https://simulatedgreg.gitbooks.io/electron-vue/content/en/using-static-assets.html
 */
if (process.env.NODE_ENV !== "development") {
  global.__static = require("path")
    .join(__dirname, "/static")
    .replace(/\\/g, "\\\\");
}

let mainWindow;
const winURL =
  process.env.NODE_ENV === "development"
    ? `http://localhost:9080`
    : `file://${__dirname}/index.html`;

function createWindow() {
  /**
   * Initial window options
   */
  mainWindow = new BrowserWindow({
    height: 400,
    useContentSize: true,
    width: 680
  });
  mainWindow.setMenu(null);
  mainWindow.loadURL(winURL);

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.on("ready", () => {
  createWindow();
  hidHandler.initHID();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (mainWindow === null) {
    createWindow();
  }
});

var init_esp_firmware_update_packet = [0x00, 0x00, 0xc9];
var init_stm_firmware_update_packet = [0x00, 0x00, 0xca];
var firmware_length_packet = [0x00];
var beep_packet = [0x00, 0x00, 0x0b];

async function update_esp_firmware(esp_firmware_path) {
  const HID_PACKET_SIZE = 64;

  hidHandler.write(beep_packet);
  await functions.sleep(500);

  hidHandler.write(init_esp_firmware_update_packet);
  await functions.sleep(1000);

  return new Promise((resolve, reject) => {
    fs.readFile(esp_firmware_path, function(err, data) {
      if (err) {
        dialog.showMessageBox(mainWindow, {
          type: "error",
          title: "ESP Updating Error",
          message: err
        });
        reject(err);
      }

      let contentBytesArray = new Uint8Array(new Buffer(data));

      let data_padding = contentBytesArray.slice(
        0,
        HID_PACKET_SIZE - firmware_length_packet.length
      );
      contentBytesArray = contentBytesArray.subarray(
        HID_PACKET_SIZE - firmware_length_packet.length
      );

      firmware_length_packet.push.apply(firmware_length_packet, data_padding);
      hidHandler.write(firmware_length_packet);

      let contentChunkArray = functions.chunk(
        contentBytesArray,
        HID_PACKET_SIZE - 1
      );

      contentChunkArray.forEach((eachChunkArray, i) => {
        var contentChunk = [0x00];
        contentChunk.push.apply(contentChunk, eachChunkArray);
        hidHandler.write(contentChunk);

        if (i % 20 == 0) {
          console.log(
            "Updating: " +
              ((i / contentChunkArray.length) * 100).toFixed(2) +
              " %\n"
          );
        }
      });
      dialog.showMessageBox(mainWindow, {
        type: "info",
        title: "ESP Update Successfully !",
        message: "Updating ESP firmware was successful."
      });
      resolve();
    });
  });
}

async function update_stm_firmware(parameters) {
  var child = require("child_process").execFile;
  var executablePath = "";

  if (require("os").platform() == "win32") {
    if (process.env.NODE_ENV === "development") {
      executablePath = require("path").join(
        require("path").dirname(__dirname),
        "script",
        "windows/hid-flash.exe"
      );
    } else {
      executablePath = require("path").join(
        process.resourcesPath,
        "script",
        "windows/hid-flash.exe"
      );
    }
  } else if (require("os").platform() == "darwin") {
    if (process.env.NODE_ENV === "development") {
      executablePath = require("path").join(
        require("path").dirname(__dirname),
        "script",
        "darwin/hid-flash"
      );
    } else {
      executablePath = require("path").join(
        process.resourcesPath,
        "script",
        "darwin/hid-flash"
      );
    }
  }

  hidHandler.write(beep_packet);
  await functions.sleep(500);

  hidHandler.write(init_stm_firmware_update_packet);
  await functions.sleep(1000);

  return new Promise((resolve, reject) => {
    child(executablePath, parameters, function(err, data) {
      if (err) {
        // may show error dialog ...
        console.log(err);
        // dialog.showErrorBox('Updating Error', err)
        dialog.showMessageBox(mainWindow, {
          type: "error",
          title: "STM Updating Error",
          message: err
        });
        reject(err);
      }

      var log = data.split(/\r?\n/)[0].split(":");

      if (log[0] == "Error") {
        // dialog.showErrorBox('Updating Error', log[1])
        dialog.showMessageBox(mainWindow, {
          type: "error",
          title: "STM Updating Error",
          message: log[1]
        });
        reject(log[1]);
      } else if (log[0] == "Finish") {
        dialog.showMessageBox(mainWindow, {
          type: "info",
          title: "STM Update Successfully !",
          message: "Updating STM firmware was successful."
        });
        resolve(log[0]);
      }
    });
  });
}

async function update_firmware(esp_path, stm_path) {
  await update_stm_firmware(stm_path);
  await functions.sleep(5000);
  await update_esp_firmware(esp_path);
}

ipcMain.on("browse-esp-firmware-path", () => {
  var firmwarePath = dialog.showOpenDialog({
    properties: ["openFile"],
    title: "select new esp firmware to update",
    filters: [{ name: "firmware file", extensions: ["bin"] }]
  });

  if (firmwarePath != null) {
    mainWindow.webContents.send(
      "browse-esp-firmware-path-response",
      firmwarePath
    );
  }
});

ipcMain.on("browse-stm-firmware-path", () => {
  var firmwarePath = dialog.showOpenDialog({
    properties: ["openFile"],
    title: "select new stm firmware to update",
    filters: [{ name: "firmware file", extensions: ["bin"] }]
  });

  if (firmwarePath != null) {
    mainWindow.webContents.send(
      "browse-stm-firmware-path-response",
      firmwarePath
    );
  }
});

ipcMain.on("browse-firmware-path-error", () => {
  dialog.showMessageBox(mainWindow, {
    type: "error",
    title: "Updating Error",
    message: "Please browse for firmware file before click 'Update'"
  });
});

ipcMain.on("update-firmware", (event, espFirmwarePath, stmFirmwarePath) => {
  var stmParameters = [stmFirmwarePath];
  console.log(stmParameters, espFirmwarePath);
  // executablePath = require('path').join(require('path').dirname(__dirname), 'script', 'windows\\hid-flash.exe')

  mainWindow.webContents.send("update-firmware-start");

  update_firmware(espFirmwarePath, stmParameters).then(result => {
    mainWindow.webContents.send("update-firmware-finish");
  });
});

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
