const { shell, ipcRenderer } = require('electron');
const path = require('path');
const os = require('os');
const Tail = require('tail').Tail;

// html dom constants
const elrsRepoStatusSpinner = document.getElementById('elrs-repo-status-spinner');
const elrsRepoStatusSpan = document.getElementById('elrs-repo-status');
const logArea = document.getElementById('log-area');
const logAreaText = document.getElementById('log-area-text');
const elrsBranchesSelect = document.getElementById('elrs-remote-branches');
const elrsBranchResetBtn = document.getElementById('elrs-branch-reset');
const fileManagerBtn = document.getElementById('open-config-folder');
const elrsBuildTargetBtn = document.getElementById('elrs-build-target-btn')
const elrsBuildTargetsSelect = document.getElementById('elrs-build-targets');
const elrsUploadTargetBtn = document.getElementById('elrs-upload-target-btn');
const buildSvgDiv = document.getElementById('build-svg');
const finishSvgDiv = document.getElementById('finish-svg');
const uploadSvgDiv = document.getElementById('upload-svg');

// set production dir before generating local os archive of application or use empty string for development
const srcDir = "./"; // use './resources/app/' for production

// tail log file
tail = new Tail(srcDir + "elrs-cli.log", { fromBeginning: true, follow: true });

tail.on("line", function(data) {
    logAreaText.value += data + '\n';
    autoScrollLogAreaText();
});

tail.on("error", function(error) {
    logAreaText.value += data + '\n';
    autoScrollLogAreaText();
});

// helper function to auto scroll log area
function autoScrollLogAreaText() {
    logAreaText.scrollTop = logAreaText.scrollHeight;
}

// watch tail log
tail.watch();

// js constants
const elrsSrcFolder = path.join(__dirname, '..', 'ExpressLRS', 'src', 'src');

// TODO: initialize with latest built target from folder
let elrsLatestBuiltTarget;

// open file manager at specific location so we can easily open user_defines.txt config file
fileManagerBtn.addEventListener('click', (event) => {
    shell.showItemInFolder(elrsSrcFolder);
});

// send event for building selected ExpressLRS target
elrsBuildTargetBtn.addEventListener('click', (event) => {
    ipcRenderer.invoke('build-elrs-selected-target', elrsBuildTargetsSelect.value)
});

// update build ExpressLRS button label with selected target
elrsBuildTargetsSelect.addEventListener('change', (event) => {
    elrsBuildTargetBtn.value = 'Build target: ' + elrsBuildTargetsSelect.value;

    // style build button as normal
    elrsBuildTargetBtn.classList = 'bg-blue-400 hover:bg-blue-600 text-white font-bold py-1 px-2 rounded inline-flex items-center';
});

// send event for uploading selected ExpressLRS target
elrsUploadTargetBtn.addEventListener('click', (event) => {
    ipcRenderer.invoke('upload-elrs-selected-target', elrsLatestBuiltTarget);
});

elrsBranchResetBtn.addEventListener('click', (event) => {
    ipcRenderer.invoke('elrs-reset-branch', elrsBranchesSelect.value);
});

// catches build started
ipcRenderer.on('elrs-build-started', (e, target) => {
    // show status text
    startElrsStatusMsg("Building ExpressLRS firmware")

    // animate build svg icon
    buildSvgDiv.className = 'animate-spin';

    // stop animating finish icon
    finishSvgDiv.className = '';

    // disable build target select
    elrsBuildTargetsSelect.disabled = true;

    // style build target select as not allowed
    elrsBuildTargetsSelect.className = 'bg-blue-400 text-white font-bold py-1 px-2 rounded focus:outline-none opacity-50 cursor-not-allowed'

    // disable build button
    elrsBuildTargetBtn.disabled = true;

    // style build button as not allowed
    elrsBuildTargetBtn.className = 'bg-blue-400 text-white font-bold py-1 px-2 rounded inline-flex items-center opacity-50 cursor-not-allowed';

    // change build button label
    elrsBuildTargetBtn.value = 'Building target ' + target + ' started';

    // hide upload target button
    elrsUploadTargetBtn.className = 'bg-blue-400 hover:bg-blue-600 text-white font-bold py-1 px-2 rounded inline-flex items-center invisible';
})

// catches build successfully finished
ipcRenderer.on('elrs-build-success', (e, target) => {
    // show status text
    successElrsStatusMsg("ExpressLRS build firmware complete")

    // stop animating build svg icon
    buildSvgDiv.className = ''

    // enable build target select
    elrsBuildTargetsSelect.disabled = false;

    // style build target select as normal
    elrsBuildTargetsSelect.className = 'bg-blue-400 hover:bg-blue-600 text-white font-bold py-1 px-2 rounded focus:outline-none'

    // enable build button
    elrsBuildTargetBtn.disabled = false;

    // style build button as normal
    elrsBuildTargetBtn.classList = 'bg-green-400 hover:bg-green-600 text-white font-bold py-1 px-2 rounded inline-flex items-center';

    // change build button label
    elrsBuildTargetBtn.value = 'Successfully built target ' + target;

    // update latest built target
    elrsLatestBuiltTarget = target;

    // update upload button label
    elrsUploadTargetBtn.value = 'Upload target ' + target

    // show upload target button
    elrsUploadTargetBtn.className = 'bg-blue-400 hover:bg-blue-600 text-white font-bold py-1 px-2 rounded inline-flex items-center visible';

    // TODO: show download link of built firmware
})

// catches build successfully finished
ipcRenderer.on('elrs-build-failed', (e, target) => {
    // stop animating build svg icon
    buildSvgDiv.className = ''

    // enable build target select
    elrsBuildTargetsSelect.disabled = false;

    // style build target select as normal
    elrsBuildTargetsSelect.className = 'bg-blue-400 hover:bg-blue-600 text-white font-bold py-1 px-2 rounded focus:outline-none'

    // enable build button
    elrsBuildTargetBtn.disabled = false;

    // style build button as normal
    elrsBuildTargetBtn.classList = 'bg-red-400 hover:bg-red-600 text-white font-bold py-1 px-2 rounded inline-flex items-center';

    // change build button label
    elrsBuildTargetBtn.value = 'Failed building target ' + target;

    errorElrsStatusMsg("Failed building ExpressLRS firmware");
})

// catches upload started
ipcRenderer.on('elrs-upload-started', (e, target) => {
    // show status text
    startElrsStatusMsg("Uploading ExpressLRS firmware")

    // animate upload svg icon
    uploadSvgDiv.className = 'animate-bounce mt-1'

    // stop animating finish icon
    finishSvgDiv.className = ''

    // disable build target select
    elrsBuildTargetsSelect.disabled = true;

    // style build target select as not allowed
    elrsBuildTargetsSelect.className = 'bg-blue-400 text-white font-bold py-1 px-2 rounded focus:outline-none opacity-50 cursor-not-allowed'

    // change build button label
    elrsBuildTargetBtn.value = 'Build target: ' + target;

    // disable build button
    elrsBuildTargetBtn.disabled = true;

    // style build button as not allowed
    elrsBuildTargetBtn.className = 'bg-blue-400 text-white font-bold py-1 px-2 rounded inline-flex items-center opacity-50 cursor-not-allowed';

    // disable upload button
    elrsUploadTargetBtn.disabled = true;

    // style upload button as not allowed
    elrsUploadTargetBtn.className = 'bg-blue-400 text-white font-bold py-1 px-2 rounded inline-flex items-center opacity-50 cursor-not-allowed';

    // change upload button label
    elrsUploadTargetBtn.value = 'Uploading target ' + target + ' started';
})

// catches build successfully finished
ipcRenderer.on('elrs-upload-success', (e, target) => {
    // show status text
    successElrsStatusMsg("ExpressLRS upload firmware complete")

    // stop animating upload svg icon
    uploadSvgDiv.className = ''

    // start animating finish icon
    finishSvgDiv.className = 'animate-pulse'

    // enable build target select
    elrsBuildTargetsSelect.disabled = false;

    // style build target select as normal
    elrsBuildTargetsSelect.className = 'bg-blue-400 hover:bg-blue-600 text-white font-bold py-1 px-2 rounded focus:outline-none'

    // enable build button
    elrsBuildTargetBtn.disabled = false;

    // style build button as normal
    elrsBuildTargetBtn.classList = 'bg-blue-400 hover:bg-blue-600 text-white font-bold py-1 px-2 rounded inline-flex items-center';

    // enable build button
    elrsUploadTargetBtn.disabled = false;

    // show upload target button as normal
    elrsUploadTargetBtn.className = 'bg-green-400 hover:bg-green-600 text-white font-bold py-1 px-2 rounded inline-flex items-center visible';

    // change upload button label
    elrsUploadTargetBtn.value = 'Successfully uploaded target ' + target;
})

// catches build successfully finished
ipcRenderer.on('elrs-upload-failed', (e, target) => {
    // stop animating upload svg icon
    uploadSvgDiv.className = ''

    // enable build target select
    elrsBuildTargetsSelect.disabled = false;

    // style build target select as normal
    elrsBuildTargetsSelect.className = 'bg-blue-400 hover:bg-blue-600 text-white font-bold py-1 px-2 rounded focus:outline-none'

    // enable build button
    elrsBuildTargetBtn.disabled = false;

    // style build button as normal
    elrsBuildTargetBtn.classList = 'bg-blue-400 hover:bg-blue-600 text-white font-bold py-1 px-2 rounded inline-flex items-center';

    // enable upload button
    elrsUploadTargetBtn.disabled = false;

    // show upload target button as normal
    elrsUploadTargetBtn.className = 'bg-red-400 hover:bg-red-600 text-white font-bold py-1 px-2 rounded inline-flex items-center visible';

    // change upload button label
    elrsUploadTargetBtn.value = 'Failed uploading target ' + target;

    errorElrsStatusMsg("Failed uploading ExpressLRS firmware");
})

// Catches menu event and re-send the event to server
ipcRenderer.on('clone-elrs-repo', () => ipcRenderer.invoke('clone-elrs-repo'));

ipcRenderer.on('pull-elrs-repo', () => ipcRenderer.invoke('pull-elrs-repo'));

ipcRenderer.on('elrs-clone-started', () => startElrsStatusMsg("Cloning ExpressLRS locally"));

ipcRenderer.on('elrs-clone-failed', () => errorElrsStatusMsg("Failed cloning ExpressLRS repository"));

ipcRenderer.on('elrs-pull-started', () => startElrsStatusMsg("Updating ExpressLRS locally"));

ipcRenderer.on('elrs-pull-success', () => successElrsStatusMsg("Local ExpressLRS repository updated"));

ipcRenderer.on('elrs-pull-failed', () => errorElrsStatusMsg("Failed updating ExpressLRS local repository"));

ipcRenderer.on('update-elrs-branches-started', () => startElrsStatusMsg("Fetching remote ExpressLRS branches"));

ipcRenderer.on('update-elrs-branches-failed', () => errorElrsStatusMsg("Failed fetching remote ExpressLRS branches"));

ipcRenderer.on('elrs-reset-branch-started', () => startElrsStatusMsg("Resetting local ExpressLRS repository to specific branch"));

ipcRenderer.on('elrs-reset-branch-success', () => successElrsStatusMsg("Successfully reset local ExpressLRS repository to specific branch"));

ipcRenderer.on('elrs-reset-branch-failed', () => errorElrsStatusMsg("Failed resetting local ExpressLRS repository to specific branch"));

ipcRenderer.on('toggle-elrs-console', () => {
    if (logArea.classList.contains('hidden')) {
        // show log area
        logArea.className = 'visible';
    } else {
        // hide log area
        logArea.className = 'hidden';
    }
});

ipcRenderer.on('open-about', () => {
    ipcRenderer.invoke('open-about-clicked')
});

ipcRenderer.on('update-elrs-branches', () => {
    ipcRenderer.invoke('update-elrs-branches-clicked')
});

ipcRenderer.on('update-elrs-branches-success', (e, fetchedElrsRemoteBranches, currentRemoteBranch) => {
    successElrsStatusMsg("Successfully fetched remote ExpressLRS branches");

    elrsBranchesSelect.innerHTML = "";

    updateElrsRemoteBranches(fetchedElrsRemoteBranches, currentRemoteBranch);
});

ipcRenderer.on('update-elrs-build-targets-success', (e, fetchedPioBuldTargets) => {
    // TODO: enable when needed - currently build targets are updated on remote branches update
    // successElrsStatusMsg("Successfully fetched local PlatformIO build targets");

    elrsBuildTargetsSelect.innerHTML = "";

    updateElrsBuildTargets(fetchedPioBuldTargets);
});

ipcRenderer.on('version', (e, appVersion) => {
    // fetch and set configurator version
    document.getElementById('app-version-span').innerText = appVersion;
});

function startElrsStatusMsg(msg) {
    // start status spinner
    elrsRepoStatusSpinner.className = "loader-blue-400 ease-linear rounded-full border-2 border-t-2 border-gray-200 h-4 w-4 mr-1"

    // change status message
    elrsRepoStatusSpan.innerHTML = msg;
}

function successElrsStatusMsg(msg) {
    // start status spinner
    elrsRepoStatusSpinner.className = "loader-blue-400 ease-linear rounded-full border-2 border-t-2 border-gray-200 h-4 w-4 mr-1 hidden"

    // change status message
    elrsRepoStatusSpan.innerHTML = msg;
}

function errorElrsStatusMsg(msg) {
    // start status spinner
    elrsRepoStatusSpinner.className = "loader-blue-400 ease-linear rounded-full border-2 border-t-2 border-gray-200 h-4 w-4 mr-1 hidden"

    // change status message
    elrsRepoStatusSpan.innerHTML = msg;
}

function updateElrsRemoteBranches(fetchedRemoteBranches, currentRemoteBranch) {
    var fragment = document.createDocumentFragment();

    // apply to branches select component
    fetchedRemoteBranches.forEach(function(branchName, index) {
        var opt = document.createElement('option');
        opt.innerHTML = branchName;
        opt.value = branchName;
        opt.className = "bg-gray-100 text-blue-400 py-1 px-1 rounded";
        fragment.appendChild(opt);
    });

    elrsBranchesSelect.appendChild(fragment);
    elrsBranchesSelect.value = currentRemoteBranch;
}

function updateElrsBuildTargets(fetchedPioBuildTargets) {
    var fragment = document.createDocumentFragment();

    // apply to targets select component
    fetchedPioBuildTargets.forEach(function(buildTarget, index) {
        var opt = document.createElement('option');
        opt.innerHTML = buildTarget;
        opt.value = buildTarget;
        opt.className = "bg-gray-100 text-blue-400 py-1 px-1 rounded";
        fragment.appendChild(opt);
    });

    elrsBuildTargetsSelect.appendChild(fragment);
}