const { shell, ipcRenderer } = require('electron');
const path = require('path');
const os = require('os');

// open file manager at specific location so we can easily open user_defines.txt config file
const fileManagerBtn = document.getElementById('open-config-folder');
const elrsSrcFolder = path.join(__dirname, '..','ExpressLRS', 'src', 'src');
fileManagerBtn.addEventListener('click', (event) => {
  shell.showItemInFolder(elrsSrcFolder);
});

// send event for building selected ExpressLRS target
const elrsBuildTargetBtn = document.getElementById('elrs-build-target-btn')
elrsBuildTargetBtn.addEventListener('click', (event) => {
  ipcRenderer.invoke('build-elrs-selected-target', elrsBuildTargetsSelect.value)
});

// update build ExpressLRS button label with selected target
const elrsBuildTargetsSelect = document.getElementById('elrs-build-targets');
elrsBuildTargetsSelect.addEventListener('change', (event) => {
  elrsBuildTargetBtn.value = 'Build target: ' + elrsBuildTargetsSelect.value;
});

// catches build started
ipcRenderer.on('elrs-build-started', (e, target) => {
  // TODO: disable build button
  
  // change button label
  elrsBuildTargetBtn.value = 'Building target ' + target + ' started' ;
})

// catches build successfully finished
ipcRenderer.on('elrs-build-success', (e, target) => {
  // TODO: enable build button

  // change button label
  elrsBuildTargetBtn.value = 'Successfully built target ' + target;

  // TODO: show download link of built firmware
})

// Catches menu event and re-send the event to server
ipcRenderer.on('clone-elrs-repo', () => ipcRenderer.invoke('clone-elrs-repo'));

ipcRenderer.on('pull-elrs-repo', () => ipcRenderer.invoke('pull-elrs-repo'));

ipcRenderer.on('open-about', () => {
    // TODO: open about info dialog
})
