<template>
    <div id="wrapper">
        <img id="logo" src="~@/assets/gogo_logo.png" alt="electron-vue" />
        <main>
            <div class="left-side">
                <div class="doc">
                    <p>{{ firmware_path }}</p>
                    <button class="alt" @click="openDialog()">Browse firmware file</button>
                    <br />
                    <br />
                </div>
                <div class="doc">
                    <button @click="updateFirmware()">Update</button>
                </div>
            </div>
        </main>
    </div>
</template>

<script>
export default {
    name: "landing-page",
    methods: {
        open(link) {
            this.$electron.shell.openExternal(link);
        },
        openDialog() {
            this.$electron.ipcRenderer.send("browse-firmware-path");

            this.$electron.ipcRenderer.on(
                "browse-firmware-path-response",
                (event, arg) => {
                    this.firmware_path = arg[0];
                }
            );
        },
        updateFirmware() {
			if (this.firmware_path != null && this.firmware_path != 'browse for firmware path')
				this.$electron.ipcRenderer.send("update-firmware", this.firmware_path);

			// this.$electron.ipcRenderer.on('update-firmware-start', (event, arg) => {
				
			// })
			// this.$electron.ipcRenderer.on('update-firmware-error', (event, arg) => {

			// })
			// this.$electron.ipcRenderer.on('update-firmware-success', () => {

			// })
		}
    },
    data() {
        return {
            firmware_path: "browse for firmware path"
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
}

#logo {
    height: auto;
    margin-bottom: 20px;
    width: 320px;
}

main {
    display: flex;
    justify-content: space-between;
}

main > div {
    flex-basis: 50%;
}

.left-side {
    display: flex;
    flex-direction: column;
}

.welcome {
    color: #555;
    font-size: 23px;
    margin-bottom: 10px;
}

.title {
    color: #2c3e50;
    font-size: 20px;
    font-weight: bold;
    margin-bottom: 6px;
}

.title.alt {
    font-size: 18px;
    margin-bottom: 10px;
}

.doc p {
    color: black;
    margin-bottom: 10px;
}

.doc button {
    font-size: 0.8em;
    cursor: pointer;
    outline: none;
    padding: 0.75em 2em;
    border-radius: 2em;
    display: inline-block;
    color: #fff;
    background-color: #4fc08d;
    transition: all 0.15s ease;
    box-sizing: border-box;
    border: 1px solid #4fc08d;
}

.doc button.alt {
    color: #42b983;
    background-color: transparent;
}
</style>
