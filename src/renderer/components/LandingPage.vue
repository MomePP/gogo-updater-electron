<template>
  <div id="wrapper">
    <img id="logo" src="~@/assets/gogo_logo.png" alt="electron-vue" />
    <main>
      <div class="left-side">
        <div class="doc">
          <p>{{ firmware_path }}</p>
        </div>
      </div>
      <div class="right-side">
        <button @click="openDialog()">Browse firmware file</button>
      </div>
    </main>
    <main>
      <div></div>
      <div class="update">
        <br />
        <br />
        <br />
        <span class="loader" v-if="isUpdating">
          <clip-loader :loading="loading" :color="color" :size="size"></clip-loader>
        </span>
        <span class="loader" v-else></span>
        <button class="alt" @click="updateFirmware()">Update</button>
      </div>
    </main>
  </div>
</template>

<script>
import ClipLoader from "vue-spinner/src/ClipLoader.vue";

export default {
  name: "landing-page",
  components: {
    ClipLoader
  },
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
      if (
        this.firmware_path != null &&
        this.firmware_path != "browse for firmware path"
      ) {
        this.$electron.ipcRenderer.send("update-firmware", this.firmware_path);
      }

      this.$electron.ipcRenderer.on("update-firmware-start", () => {
        this.isUpdating = true;
      });
      this.$electron.ipcRenderer.on("update-firmware-success", () => {
        this.isUpdating = false;
      });
    }
  },
  data() {
    return {
      firmware_path: "browse for firmware path",
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
}

#logo {
  height: auto;
  margin-bottom: 50px;
  width: 320px;
}

main {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.left-side {
  display: flex;
  flex-direction: column;
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
  margin-right: 10px;
}

.doc p {
  color: black;
  margin-bottom: 10px;
  margin-right: 10px;
}

main button {
  font-size: 0.8em;
  cursor: pointer;
  outline: none;
  padding: 0.75em 2em;
  border-radius: 2em;
  display: inline-block;
  color: #651e3e ;
  background-color: transparent;
  transition: all 0.15s ease;
  box-sizing: border-box;
  border: 1px solid #651e3e ;
}

main button.alt {
  color: #fff;
  background-color: #851e3e ;
}
</style>
