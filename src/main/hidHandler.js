var HID = require('node-hid')

var functions = require('./functions')

const config = {
  vid: 1121,
  pid: 32,
  retryTime: 1000
}

export default {
  hidDevice: null,

  initHID () {
    try {
      this.hidDevice = new HID.HID(config.vid, config.pid)
    } catch (error) {
        console.log(error);
      console.log('HID\t no device')
      this.retryInitHID()
    }

    if (this.hidDevice) {
      console.log('HID\t device connected')
      this.hidDevice.on('data', data => {
        this.onData(data)
      })

      this.hidDevice.on('error', error => {
        this.onError(error)
      })
    }
  },

  retryInitHID () {
    setTimeout(() => {
      this.initHID()
    }, config.retryTime)
  },

  onData (data) {
    // console.log(data);

    // let arr = functions.toArrayBuffer(data)
    // let packet = { stream: arr }
    // console.log(packet)
    // wss.broadcast(JSON.stringify(packet))
  },

  onError (error) {
    console.log('HID\t ', 'device has disconnected')
    console.log('HID\t ', error)

    this.hidDevice.close()
    this.hidDevice = null

    this.retryInitHID()
  },

  write (data) {
    if (this.hidDevice) {
      var writtenByte = this.hidDevice.write(data)
    //   console.log(`HID\t ', 'Written ${writtenByte} bytes`)
      return writtenByte > 0
    }
    return false
  }
}
