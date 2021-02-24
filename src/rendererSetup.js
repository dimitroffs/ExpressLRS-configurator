const { ipcRenderer } = require('electron');

ipcRenderer.on('version', (e, appVersion) => {
    // fetch and set configurator version
    document.getElementById('app-version-span').innerText = appVersion;
});