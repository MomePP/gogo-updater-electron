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
    isSectorFinished: false,

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
            console.log('HID\t no device')
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
                this.isSectorFinished = true;
                // console.log('set sector flag');
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
                var writtenByte = this.hidDevice.write(data)
                // console.log(`HID\t ', 'Written ${writtenByte} bytes`)
                return writtenByte > 0
            } catch (error) {
                // console.log(error);
                console.log('HID\t write failed')
            }
        }
        return false
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

    setSectorFlag() {
        this.isSectorFinished = true;
    },

    clearSectorFlag() {
        this.isSectorFinished = false;
    },

    checkSectorFlag() {
        return this.isSectorFinished;
    }
}
