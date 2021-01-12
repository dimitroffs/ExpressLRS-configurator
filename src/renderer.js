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

// TODO: initialize with latest built target from folder
let elrsLatestBuiltTarget; 

// send event for uploading selected ExpressLRS target
const elrsUploadTargetBtn = document.getElementById('elrs-upload-target-btn')
elrsUploadTargetBtn.addEventListener('click', (event) => {
  ipcRenderer.invoke('upload-elrs-selected-target', elrsLatestBuiltTarget)
});

// catches build started
ipcRenderer.on('elrs-build-started', (e, target) => {
  // disable build button
  elrsBuildTargetBtn.disabled = true;
  
  // change build button label
  elrsBuildTargetBtn.value = 'Building target ' + target + ' started' ;

  // hide upload target button
  elrsUploadTargetBtn.className = 'invisible'
})

// catches build successfully finished
ipcRenderer.on('elrs-build-success', (e, target) => {
  // enable build button
  elrsBuildTargetBtn.disabled = false;

  // change build button label
  elrsBuildTargetBtn.value = 'Successfully built target ' + target;

  // update latest built target
  elrsLatestBuiltTarget = target;

  // update upload button label
  elrsUploadTargetBtn.value = 'Upload target ' + target

  // show upload target button
  elrsUploadTargetBtn.className = 'visible'

  // TODO: show download link of built firmware
})

// catches upload started
ipcRenderer.on('elrs-upload-started', (e, target) => {
  // disable build button
  elrsUploadTargetBtn.disabled = true;
  
  // change upload button label
  elrsUploadTargetBtn.value = 'Uploading target ' + target + ' started';
})

// catches build successfully finished
ipcRenderer.on('elrs-upload-success', (e, target) => {
  // enable build button
  elrsUploadTargetBtn.disabled = false;

  // change upload button label
  elrsUploadTargetBtn.value = 'Successfully uploaded target ' + target;
})


// Catches menu event and re-send the event to server
ipcRenderer.on('clone-elrs-repo', () => ipcRenderer.invoke('clone-elrs-repo'));

ipcRenderer.on('pull-elrs-repo', () => ipcRenderer.invoke('pull-elrs-repo'));

ipcRenderer.on('open-about', () => {
    // TODO: open about info dialog
})
