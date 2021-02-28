const { ipcRenderer } = require('electron');

const setupStatusSpinner = document.getElementById('setup-status-spinner');
const setupStatusSpan = document.getElementById('setup-status');

ipcRenderer.on('version', (e, appVersion) => {
    // fetch and set configurator version
    document.getElementById('app-version-span').innerText = appVersion;
});

ipcRenderer.on('elrs-setup-started', () => {
    setSetupStatusMsg("Setting up ExpressLRS Configurator")
});

ipcRenderer.on('python-setup-started', () => {
    setSetupStatusMsg("Setting up Python interpeter")
});

ipcRenderer.on('python-tools-setup-started', () => {
    setSetupStatusMsg("Setting up PlatformIO locally")
});

ipcRenderer.on('git-setup-started', () => {
    setSetupStatusMsg("Setting up git client locally")
});

ipcRenderer.on('initial-elrs-clone', () => {
    setSetupStatusMsg("Cloning ExpressLRS from GitHub repository")
});

ipcRenderer.on('initial-elrs-pull', () => {
    setSetupStatusMsg("Fetching latest ExpressLRS changes")
});

function setSetupStatusMsg(msg) {
    // start status spinner
    setupStatusSpinner.className = "loader-blue-400 ease-linear rounded-full border-2 border-t-2 border-gray-200 h-4 w-4 mr-1"

    // change status message
    setupStatusSpan.innerHTML = msg;
}