export function toArrayBuffer(buf) {
    // var ab = new ArrayBuffer(buf.length);
    // var view = new Uint8Array(ab);
    // for (var i = 0; i < buf.length; ++i) {
    //     view[i] = buf[i];
    // }
    var view = new Uint8Array(buf)
    var normalArray = []
    // Push all numbers from buffer to Array
    normalArray.push.apply(normalArray, view)
    return normalArray
}
export function textToArray(text) {
    var array = []
    for (var i = 0; i < text.length; i++) {
        array[i] = parseInt(text.charAt(i))
    }
    return array
}
export function chunk(array, size) {
    const chunked_arr = []
    let index = 0
    while (index < array.length) {
        chunked_arr.push(array.slice(index, size + index))
        index += size
    }
    return chunked_arr
}
export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}
