import store from '../renderer/store'

var HID = require('node-hid')
var functions = require('./functions')

const config = {
    gogo_vid: 0x461,
    gogo_pid: 0x20,
    stm_vid: 0x1209,
    stm_pid: 0xbeba,
    retryTime: 1000
}

export default {
    hidDevice: null,
    isSTMBootloader: false,
    isSTMSectorFinished: false,
    isESPBootloader: false,
    isESPSectorFinished: false,

    initHID() {
        try {
            if (!this.isSTMBootloader) {
                this.hidDevice = new HID.HID(config.gogo_vid, config.gogo_pid)
            }
            else {
                this.hidDevice = new HID.HID(config.stm_vid, config.stm_pid)
            }
        } catch (error) {
            // console.log(error);
            // console.log('HID\t no device')
            store.dispatch('setConnected', false)

            this.retryInitHID()
        }

        if (this.hidDevice) {
            console.log('HID\t device connected')
            store.dispatch('setConnected', true)

            this.hidDevice.on('data', data => {
                this.onData(data)
            })

            this.hidDevice.on('error', error => {
                this.onError(error)
            })
        }
    },

    retryInitHID() {
        setTimeout(() => {
            this.initHID()
        }, config.retryTime)
    },

    onData(data) {
        // console.log(data);

        // let arr = functions.toArrayBuffer(data)
        // let packet = { stream: arr }
        // console.log(packet)
        // wss.broadcast(JSON.stringify(packet))
        if (this.isSTMBootloader) {
            if (data[7] == 0x02) {
                this.isSTMSectorFinished = true;
            }
        }
        else if (this.isESPBootloader) {
            if (data[2] == 201 && data[3] == 1) {
                this.isESPSectorFinished = true;
            }
        }
    },

    onError(error) {
        console.log('HID\t ', 'device has disconnected')
        // console.log('HID\t ', error)
        store.dispatch('setConnected', false)

        this.hidDevice.close()
        this.hidDevice = null

        this.retryInitHID()
    },

    write(data) {
        if (this.hidDevice) {
            try {
                // var writtenByte = this.hidDevice.write(data)
                // console.log(`HID\t ', 'Written ${writtenByte} bytes`)
                return this.hidDevice.write(data)
            } catch (error) {
                // console.log(error);
                console.log('HID\t write failed')
            }
        }
        return 0
    },

    read() {
        if (this.hidDevice) {
            return this.hidDevice.readSync();
        }
        return [0]
    },

    toggleSTMBootloader() {
        this.isSTMBootloader = !this.isSTMBootloader;
    },

    clearSTMSectorFlag() {
        this.isSTMSectorFinished = false;
    },

    checkSTMSectorFlag() {
        return this.isSTMSectorFinished;
    },

    toggleESPBootloader() {
        this.isESPBootloader = !this.isESPBootloader;
    },

    clearESPSectorFlag() {
        this.isESPSectorFinished = false;
    },

    checkESPSectorFlag() {
        return this.isESPSectorFinished;
    }
}
