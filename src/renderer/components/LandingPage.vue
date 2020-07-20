<template>
    <div id="wrapper">
        <img id="logo" src="~@/assets/gogo_logo.png" alt="electron-vue" />
        <main>
            <div class="box">
                <div class="left-side">
                    <div class="doc">
                        <p>{{ esp_firmware_path }}</p>
                    </div>
                </div>
                <div class="right-side">
                    <button :disabled="isUpdating" @click="openESPDialog()">
                        Browse for ESP firmware
                    </button>
                </div>
            </div>
            <div class="box">
                <div class="left-side">
                    <div class="doc">
                        <p>{{ stm_firmware_path }}</p>
                    </div>
                </div>
                <div class="right-side">
                    <button :disabled="isUpdating" @click="openSTMDialog()">
                        Browse for STM firmware
                    </button>
                </div>
            </div>
        </main>
        <main>
            <div class="update">
                <br />
                <br />
                <br />
                <button
                    class="alt"
                    :disabled="isUpdating"
                    @click="updateFirmware()"
                >
                    Update
                </button>
                <clip-loader
                    class="loader"
                    :loading="isUpdating"
                    :color="color"
                    :size="size"
                ></clip-loader>
            </div>
        </main>
        <div class="footer-box">
            <div class="led-box">
                <div
                    class="led-light"
                    :class="connected ? 'led-green' : 'led-red'"
                ></div>
                <p>{{ connected ? "" : "Not " }}Connected</p>
            </div>
        </div>
    </div>
</template>

<script>
import ClipLoader from "vue-spinner/src/ClipLoader.vue";

export default {
    name: "landing-page",
    computed: {
        connected() {
            return this.$store.getters["connected"];
        }
    },
    components: {
        ClipLoader
    },
    methods: {
        open(link) {
            this.$electron.shell.openExternal(link);
        },
        openESPDialog() {
            this.$electron.ipcRenderer.send("browse-esp-firmware-path");

            this.$electron.ipcRenderer.on(
                "browse-esp-firmware-path-response",
                (event, arg) => {
                    this.esp_firmware_path = arg[0];
                }
            );
        },
        openSTMDialog() {
            this.$electron.ipcRenderer.send("browse-stm-firmware-path");

            this.$electron.ipcRenderer.on(
                "browse-stm-firmware-path-response",
                (event, arg) => {
                    this.stm_firmware_path = arg[0];
                }
            );
        },
        updateFirmware() {
            if (
                this.esp_firmware_path != null &&
                // this.esp_firmware_path != "browse for esp firmware binary file"
                this.stm_firmware_path != null
                // this.stm_firmware_path != "browse for stm firmware binary file"
            ) {
                this.$electron.ipcRenderer.send(
                    "update-firmware",
                    this.esp_firmware_path,
                    this.stm_firmware_path
                );
            } else {
                this.$electron.ipcRenderer.send("browse-firmware-path-error");
            }

            this.$electron.ipcRenderer.on("update-firmware-start", () => {
                this.isUpdating = true;
            });
            this.$electron.ipcRenderer.on("update-firmware-finish", () => {
                this.isUpdating = false;
            });
        }
    },
    data() {
        return {
            esp_firmware_path: "browse for esp firmware binary file",
            stm_firmware_path: "browse for stm firmware binary file",
            color: "#051e3e ",
            size: "25px",
            isUpdating: false
        };
    }
};
</script>

<style>
@import url("https://fonts.googleapis.com/css?family=Source+Sans+Pro");

* {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
}

body {
    font-family: "Source Sans Pro", sans-serif;
}

#wrapper {
    background: radial-gradient(
        ellipse at top left,
        rgba(255, 255, 255, 1) 40%,
        rgba(229, 229, 229, 0.9) 100%
    );
    height: 100vh;
    padding: 60px 80px;
    width: 100vw;
    position: relative;
}

#logo {
    height: auto;
    margin-bottom: 40px;
    width: 320px;
}

main {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
}

.box {
    width: 50%;
}

.left-side {
    flex-basis: 80%;
    margin-bottom: 10px;
    margin-right: 20px;
}

.right-side {
    display: flex;
}

.break {
    flex-basis: 100%;
    height: 40px;
}

.update {
    display: flex;
    align-items: center;
}

.loader {
    margin-top: 5px;
    margin-left: 10px;
}

.doc p {
    height: 80px;
    color: black;
    text-overflow: ellipsis;
    min-width: 0;
    overflow-wrap: break-word;
    word-wrap: break-word;
    hyphens: auto;
    overflow: hidden;
}

main button {
    font-size: 0.8em;
    cursor: pointer;
    outline: none;
    padding: 0.75em 2em;
    border-radius: 2em;
    display: inline-block;
    color: #651e3e;
    background-color: transparent;
    transition: all 0.15s ease;
    box-sizing: border-box;
    border: 1px solid #651e3e;
}

main button.alt {
    color: #fff;
    background-color: #851e3e;
}

.footer-box {
    display: flex;
    justify-content: flex-end;
}

.led-box {
    display: flex;
    align-self: flex-end;
}

.led-box p {
    font-size: 12px;
    width: 80px;
    text-align: left;
    margin-left: 1em;
}

.led-light {
    width: 15px;
    height: 15px;
    border-radius: 100%;
}

.led-red {
    background-color: #f00;
}

.led-green {
    background-color: #abff00;
}
</style>
