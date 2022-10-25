import { app, BrowserWindow, ipcMain, dialog } from "electron";
import hidHandler from "./hidHandler";
import store from '../renderer/store';

var functions = require("./functions");
const fs = require("fs");

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
    let options = {
        height: 425,
        width: 680,
        useContentSize: true,
        webPreferences: {
            nodeIntegration: true,
            enableRemoteModule: true,
            devTools: false
        }
    };
    mainWindow = new BrowserWindow(options);
    mainWindow.setMenu(null);
    mainWindow.loadURL(winURL);

    mainWindow.on("closed", () => {
        mainWindow = null;
    });

    mainWindow.webContents.on('did-finish-load', () => {
        let name = require('../../package.json').build.productName;
        let version = require('../../package.json').version;
        let windowTitle = name + " v" + version;
        mainWindow.setTitle(windowTitle);
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
var beep_packet = [0x00, 0x00, 0x0b];
const HID_PACKET_SIZE = 64;
const HID_DATA_SIZE = HID_PACKET_SIZE - 1;
const RESPONSE_TIMEOUT = 100 //? 10sec timeout

async function update_esp_firmware(esp_firmware_path) {
    console.log("start update esp");
    const ESP_SECTOR_SIZE = 4032

    beep_packet.push.apply(beep_packet, Array(HID_PACKET_SIZE - beep_packet.length).fill(0));
    hidHandler.write(beep_packet);
    await functions.sleep(500);

    init_esp_firmware_update_packet.push.apply(init_esp_firmware_update_packet, Array(HID_PACKET_SIZE - init_esp_firmware_update_packet.length).fill(0));
    hidHandler.write(init_esp_firmware_update_packet);
    await functions.sleep(1000);

    hidHandler.toggleESPBootloader();

    return new Promise((resolve, reject) => {
        var stats = fs.statSync(esp_firmware_path);
        var esp_firmware_size = stats.size;
        console.log('File Size in Bytes:- ' + esp_firmware_size);

        let data = "Content-Length: " + esp_firmware_size + "\n\n";
        let firmware_length_packet = [0x00];
        firmware_length_packet.push.apply(firmware_length_packet, new Uint8Array(Buffer.from(data)))

        try {
            fs.open(esp_firmware_path, 'r', async function(err, fd) {
                if (err) {
                    dialog.showMessageBox(mainWindow, {
                        type: "error",
                        title: "ESP Updating Error",
                        message: err,
                        buttons: ['Ok']
                    });
                    reject(err);
                }

                let data_padding = new Uint8Array(Buffer.alloc(HID_PACKET_SIZE - firmware_length_packet.length))
                fs.readSync(fd, data_padding, 0, HID_PACKET_SIZE - firmware_length_packet.length, null)

                firmware_length_packet.push.apply(firmware_length_packet, data_padding);
                hidHandler.write(firmware_length_packet);

                let firmware_packet = new Uint8Array(Buffer.alloc(HID_PACKET_SIZE));
                let sector_data = new Uint8Array(Buffer.alloc(ESP_SECTOR_SIZE));
                let read_count = fs.readSync(fd, sector_data, 0, ESP_SECTOR_SIZE, null)

                let n_bytes = 0;
                let timeoutCounter = 0;
                let abortUpdate = false;
                while (read_count > 0 && !abortUpdate) {
                    timeoutCounter = 0;
                    for (let page = 0; page < read_count; page += HID_DATA_SIZE) {
                        for (let byte = 0; byte < HID_DATA_SIZE; byte++) {
                            firmware_packet[byte + 1] = sector_data[page + byte];
                        }
                        n_bytes += hidHandler.write(firmware_packet) - 1;
                    }

                    while (!hidHandler.checkESPSectorFlag() && n_bytes < esp_firmware_size) {
                        if (++timeoutCounter >= RESPONSE_TIMEOUT) {
                            reject("Waiting for response timeout...")
                            abortUpdate = true;
                            break;
                        }
                        await functions.sleep(100)
                    } //* this blocking wait for onData handler
                    hidHandler.clearESPSectorFlag();

                    let progressPercentage = Math.min(((n_bytes / esp_firmware_size) * 100).toFixed(2), 100.00);
                    store.dispatch('updateProgress', progressPercentage)

                    read_count = fs.readSync(fd, sector_data, 0, ESP_SECTOR_SIZE, null)
                }
                await functions.sleep(1000);

                hidHandler.toggleESPBootloader();

                if (abortUpdate)
                    return;

                dialog.showMessageBox(mainWindow, {
                    type: "info",
                    title: "ESP Update Successfully !",
                    message: "Updating ESP firmware was successful.",
                    buttons: ['Ok']
                });
                store.dispatch('updateProgress', 0)
                resolve();
            });
        } catch (err) {
            dialog.showMessageBox(mainWindow, {
                type: "error",
                title: "ESP Updating Error",
                message: err.message,
                buttons: ['Ok']
            });
            reject(err.message)
        }
    });
}

async function update_stm_firmware(stm_firmware_path) {
    console.log("start update stm");
    const STM_SECTOR_SIZE = 1024
    const STM_HID_TX_SIZE = 65

    const CMD_RESET_PAGES = [0x42, 0x54, 0x4c, 0x44, 0x43, 0x4d, 0x44, 0x00];
    const CMD_REBOOT_MCU = [0x42, 0x54, 0x4c, 0x44, 0x43, 0x4d, 0x44, 0x01];

    beep_packet.push.apply(beep_packet, Array(HID_PACKET_SIZE - beep_packet.length).fill(0));
    hidHandler.write(beep_packet);
    await functions.sleep(500);

    init_stm_firmware_update_packet.push.apply(init_stm_firmware_update_packet, Array(HID_PACKET_SIZE - init_stm_firmware_update_packet.length).fill(0));
    hidHandler.write(init_stm_firmware_update_packet);
    await functions.sleep(1000);

    hidHandler.toggleSTMBootloader()
    await checking_connection_status();

    return new Promise((resolve, reject) => {
        if (hidHandler.hidDevice) {
            var stats = fs.statSync(stm_firmware_path);
            var stm_firmware_size = stats.size;
            console.log('File Size in Bytes:- ' + stm_firmware_size);

            try {
                fs.open(stm_firmware_path, 'r', async function(err, fd) {
                    if (err) {
                        dialog.showMessageBox(mainWindow, {
                            type: "error",
                            title: "STM Updating Error",
                            message: err,
                            buttons: ['Ok']
                        });
                        reject(err);
                    }

                    //? send RESET PAGE
                    let reset_packet = [0]
                    reset_packet.push.apply(reset_packet, CMD_RESET_PAGES);
                    reset_packet.push.apply(reset_packet, Array(STM_HID_TX_SIZE - reset_packet.length).fill(0));
                    hidHandler.write(reset_packet);
                    await functions.sleep(500);

                    let firmware_packet = new Uint8Array(Buffer.alloc(STM_HID_TX_SIZE));
                    let page_data = new Uint8Array(Buffer.alloc(STM_SECTOR_SIZE));
                    let read_count = fs.readSync(fd, page_data, 0, STM_SECTOR_SIZE, null)
                    let n_bytes = 0;
                    let timeoutCounter = 0;
                    let abortUpdate = false;

                    while (read_count > 0) {
                        timeoutCounter = 0;
                        for (let i = 0; i < STM_SECTOR_SIZE; i += STM_HID_TX_SIZE - 1) {
                            for (let j = 0; j < STM_HID_TX_SIZE - 1; j++) {
                                firmware_packet[j + 1] = page_data[i + j];
                            }
                            n_bytes += hidHandler.write(firmware_packet) - 1;
                            await functions.sleep(0.5);
                        }

                        while (!hidHandler.checkSTMSectorFlag() && n_bytes < stm_firmware_size) {
                            if (++timeoutCounter >= RESPONSE_TIMEOUT) {
                                reject("Waiting for response timeout...")
                                abortUpdate = true;
                                break;
                            }
                            await functions.sleep(10)
                        } //* this blocking wait for onData handler
                        hidHandler.clearSTMSectorFlag();

                        if (abortUpdate)
                            break;

                        var progressPercentage = Math.min(((n_bytes / stm_firmware_size) * 100).toFixed(2), 100.00);
                        store.dispatch('updateProgress', progressPercentage)

                        page_data.fill(0);
                        read_count = fs.readSync(fd, page_data, 0, STM_SECTOR_SIZE, null)
                        await functions.sleep(100) // ! waiting for sector changed
                    }
                    await functions.sleep(1000);

                    //? send REBOOT MCU
                    let reboot_packet = [0]
                    reboot_packet.push.apply(reboot_packet, CMD_REBOOT_MCU);
                    reboot_packet.push.apply(reboot_packet, Array(STM_HID_TX_SIZE - reboot_packet.length).fill(0));
                    // console.log(reboot_packet);
                    hidHandler.write(reboot_packet);

                    // fs.close();
                    await functions.sleep(1000);

                    hidHandler.toggleSTMBootloader();

                    if (abortUpdate)
                        return;

                    dialog.showMessageBox(mainWindow, {
                        type: "info",
                        title: "STM Update Successfully !",
                        message: "Updating STM firmware was successful.",
                        buttons: ['Ok']
                    });
                    store.dispatch('updateProgress', 0)
                    resolve();
                })

            } catch (err) {
                dialog.showMessageBox(mainWindow, {
                    type: "error",
                    title: "STM Updating Error",
                    message: err.message,
                    buttons: ['Ok']
                });
                reject(err.message);
            }
        }
    })
}

async function checking_connection_status() {
    // console.log("checking connection");
    let timeout_counter = 10; //? 500ms * 10 -> 5s timeout

    return new Promise(async (resolve, reject) => {
        while (!store.getters["connected"]) {
            if (timeout_counter == 0) reject();
            timeout_counter--;
            await functions.sleep(500);
        }
        resolve();
    });
}

async function update_firmware(esp_path, stm_path) {

    if (stm_path != 'browse for stm firmware binary file') {
        try {
            await update_stm_firmware(stm_path);
            if (esp_path != 'browse for esp firmware binary file') {
                await checking_connection_status();
            }
        }
        catch (e) {
            dialog.showMessageBox(mainWindow, {
                type: "error",
                title: "STM Updating Error",
                message: e,
                buttons: ['Ok']
            });
        }
    }

    if (esp_path != 'browse for esp firmware binary file') {
        try {
            await update_esp_firmware(esp_path);
        }
        catch (e) {
            dialog.showMessageBox(mainWindow, {
                type: "error",
                title: "ESP Updating Error",
                message: e,
                buttons: ['Ok']
            });
        }
    }
}

ipcMain.on("browse-esp-firmware-path", () => {
    const dialog_option = {
        properties: ["openFile"],
        title: "select new esp firmware to update",
        filters: [{ name: "firmware file", extensions: ["bin"] }]
    }

    dialog.showOpenDialog(mainWindow, dialog_option).then(result => {
        if (result.canceled) {
            console.log("canceled");
        } else if (result.filePaths) {
            mainWindow.webContents.send(
                "browse-esp-firmware-path-response",
                result.filePaths
            );
        }
    }).catch(err => {
        console.log(err)
    });
});

ipcMain.on("browse-stm-firmware-path", () => {
    const dialog_option = {
        properties: ["openFile"],
        title: "select new stm firmware to update",
        filters: [{ name: "firmware file", extensions: ["bin"] }]
    }

    dialog.showOpenDialog(mainWindow, dialog_option).then(result => {
        if (result.canceled) {
            console.log("canceled");
        } else if (result.filePaths) {
            mainWindow.webContents.send(
                "browse-stm-firmware-path-response",
                result.filePaths
            );
        }
    }).catch(err => {
        console.log(err)
    });
});

ipcMain.on("browse-firmware-path-error", () => {
    dialog.showMessageBox(mainWindow, {
        type: "error",
        title: "Updating Error",
        message: "Please browse for firmware file before click 'Update'",
        buttons: ['Ok']
    });
});

ipcMain.on("update-firmware", (event, espFirmwarePath, stmFirmwarePath) => {

    // console.log(espFirmwarePath, stmFirmwarePath);
    // executablePath = require('path').join(require('path').dirname(__dirname), 'script', 'windows\\hid-flash.exe')

    mainWindow.webContents.send("update-firmware-start");

    update_firmware(espFirmwarePath, stmFirmwarePath).then(result => {
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
