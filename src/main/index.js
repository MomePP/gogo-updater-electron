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
        height: 460,
        useContentSize: true,
        width: 720
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
var beep_packet = [0x00, 0x00, 0x0b];
const HID_PACKET_SIZE = 64;

async function update_esp_firmware(esp_firmware_path) {
    console.log("start update esp");
    beep_packet.push.apply(beep_packet, Array(HID_PACKET_SIZE - beep_packet.length).fill(0));
    hidHandler.write(beep_packet);
    await functions.sleep(500);

    init_esp_firmware_update_packet.push.apply(init_esp_firmware_update_packet, Array(HID_PACKET_SIZE - init_esp_firmware_update_packet.length).fill(0));
    hidHandler.write(init_esp_firmware_update_packet);
    await functions.sleep(1000);

    return new Promise((resolve, reject) => {
        var stats = fs.statSync(esp_firmware_path);
        var esp_firmware_size = stats.size;
        console.log('File Size in Bytes:- ' + esp_firmware_size);

        let data = "Content-Length: " + esp_firmware_size + "\n\n";
        let firmware_length_packet = [0x00];
        firmware_length_packet.push.apply(firmware_length_packet, new Uint8Array(new Buffer(data)))

        try {
            fs.open(esp_firmware_path, 'r', async function (err, fd) {
                // fs.readFile(esp_firmware_path, function (err, data) {
                if (err) {
                    dialog.showMessageBox(mainWindow, {
                        type: "error",
                        title: "ESP Updating Error",
                        message: err
                    });
                    reject(err);
                }

                let data_padding = new Uint8Array(new Buffer(HID_PACKET_SIZE - firmware_length_packet.length))
                fs.readSync(fd, data_padding, 0, HID_PACKET_SIZE - firmware_length_packet.length, null)

                firmware_length_packet.push.apply(firmware_length_packet, data_padding);
                hidHandler.write(firmware_length_packet);

                let firmware_packet = new Uint8Array(new Buffer(HID_PACKET_SIZE));
                let read_count = fs.readSync(fd, firmware_packet, 1, HID_PACKET_SIZE - 1, null)

                while (read_count > 0) {
                    hidHandler.write(firmware_packet);
                    await functions.sleep(0.1);

                    firmware_packet.fill(0);
                    read_count = fs.readSync(fd, firmware_packet, 1, HID_PACKET_SIZE - 1, null)
                }

                dialog.showMessageBox(mainWindow, {
                    type: "info",
                    title: "ESP Update Successfully !",
                    message: "Updating ESP firmware was successful."
                });
                resolve();
            });
        } catch (err) {
            dialog.showMessageBox(mainWindow, {
                type: "error",
                title: "ESP Updating Error",
                message: err.message
            });
            reject(err.message)
        }
    });
}

async function update_stm_firmware(stm_firmware_path) {
    console.log("start update stm");
    let STM_SECTOR_SIZE = 1024
    let STM_HID_TX_SIZE = 65

    let CMD_RESET_PAGES = [0x42, 0x54, 0x4c, 0x44, 0x43, 0x4d, 0x44, 0x00];
    let CMD_REBOOT_MCU = [0x42, 0x54, 0x4c, 0x44, 0x43, 0x4d, 0x44, 0x01];

    beep_packet.push.apply(beep_packet, Array(HID_PACKET_SIZE - beep_packet.length).fill(0));
    hidHandler.write(beep_packet);
    await functions.sleep(500);

    init_stm_firmware_update_packet.push.apply(init_stm_firmware_update_packet, Array(HID_PACKET_SIZE - init_stm_firmware_update_packet.length).fill(0));
    hidHandler.write(init_stm_firmware_update_packet);
    await functions.sleep(1000);

    hidHandler.toggleSTMBootloader()
    await functions.sleep(2000);

    return new Promise((resolve, reject) => {
        if (hidHandler.hidDevice) {
            var stats = fs.statSync(stm_firmware_path);
            var stm_firmware_size = stats.size;
            console.log('File Size in Bytes:- ' + stm_firmware_size);

            //? send RESET PAGE
            let reset_packet = [0]
            reset_packet.push.apply(reset_packet, CMD_RESET_PAGES);
            reset_packet.push.apply(reset_packet, Array(STM_HID_TX_SIZE - reset_packet.length).fill(0));
            // console.log(reset_packet);
            hidHandler.write(reset_packet);

            try {
                fs.open(stm_firmware_path, 'r', async function (err, fd) {
                    if (err) {
                        dialog.showMessageBox(mainWindow, {
                            type: "error",
                            title: "STM Updating Error",
                            message: err
                        });
                        reject(err);
                    }

                    let firmware_packet = new Uint8Array(new Buffer(STM_HID_TX_SIZE));
                    let page_data = new Uint8Array(new Buffer(STM_SECTOR_SIZE));
                    let read_count = fs.readSync(fd, page_data, 0, STM_SECTOR_SIZE, null)
                    // let countSector = 0;

                    while (read_count > 0) {
                        // console.log(page_data);

                        // let countChunk = 1;
                        for (let i = 0; i < STM_SECTOR_SIZE; i += STM_HID_TX_SIZE - 1) {
                            for (let j = 0; j < STM_HID_TX_SIZE - 1; j++) {
                                firmware_packet[j + 1] = page_data[i + j];
                            }
                            // console.log('sector chunk: '+ (countChunk++));
                            // console.log(firmware_packet);
                            hidHandler.write(firmware_packet);
                            await functions.sleep(0.1);
                        }

                        // hidHandler.write(firmware_packet);

                        while (!hidHandler.checkSectorFlag()) {
                            // console.log("wait");
                            await functions.sleep(10)
                        } //* this blocking wait for onData handler
                        hidHandler.clearSectorFlag();

                        // console.log('sector count: ' + (countSector++));

                        page_data.fill(0);
                        read_count = fs.readSync(fd, page_data, 0, STM_SECTOR_SIZE, null)
                    }
                    await functions.sleep(1000);

                    //? send REBOOT MCU
                    let reboot_packet = [0]
                    reboot_packet.push.apply(reboot_packet, CMD_REBOOT_MCU);
                    reboot_packet.push.apply(reboot_packet, Array(STM_HID_TX_SIZE - reboot_packet.length).fill(0));
                    // console.log(reboot_packet);
                    hidHandler.write(reboot_packet);

                    // fs.close();
                    hidHandler.toggleSTMBootloader();

                    dialog.showMessageBox(mainWindow, {
                        type: "info",
                        title: "STM Update Successfully !",
                        message: "Updating STM firmware was successful."
                    });
                    resolve();
                })

            } catch (err) {
                dialog.showMessageBox(mainWindow, {
                    type: "error",
                    title: "STM Updating Error",
                    message: err.message
                });
                reject(err.message);
            }
        }
    })
}

async function update_firmware(esp_path, stm_path) {

    if (stm_path != 'browse for stm firmware binary file') {
        try {
            await update_stm_firmware(stm_path);
            if (esp_path != 'browse for esp firmware binary file') {
                await functions.sleep(2000);
            }
        }
        catch (e) {
            dialog.showMessageBox(mainWindow, {
                type: "error",
                title: "STM Updating Error",
                message: e
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
                message: e
            });
        }
    }
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

    console.log(espFirmwarePath, stmFirmwarePath);
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
