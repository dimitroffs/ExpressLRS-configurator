const { app, globalShortcut, BrowserWindow, Menu, ipcMain, shell, dialog } = require('electron')
const path = require('path')
const fs = require("fs");
const readline = require('readline');
const menu = require('./menu')
const { spawn } = require('child_process')
const log = require('electron-log');
const os = require('os');
const usb = require('usb')
const serialport = require('serialport');


// usb devices integration
let portPath = null;
usb.on('attach', function(device) {
    // list serial ports
    serialport.list().then(ports => {
        ports.forEach(function(port) {
            // fetch first connected serial port
            portPath = port.path;
            log.info("USB device connected on port: " + portPath);

            // send changes to renderer
            mainWindow.webContents.send('usb-connected', portPath);
        });
    });
});

usb.on('detach', function(device) {
    log.info("USB device disconnected on port: " + portPath);

    // send changes to renderer
    mainWindow.webContents.send('usb-disconnected');
});
// end of usb devices integration

// list of used platforms
const platforms = {
    WINDOWS: 'WINDOWS',
    MAC: 'MAC',
    LINUX: 'LINUX',
};

// mapping platform to platform names
const platformsNames = {
    win32: platforms.WINDOWS,
    darwin: platforms.MAC,
    linux: platforms.LINUX,
};

// get current platform
const currentPlatform = platformsNames[os.platform()];

const findHandlerOrDefault = (handlerName, dictionary) => {
    const handler = dictionary[handlerName];

    if (handler) {
        return handler;
    }

    if (dictionary.default) {
        return dictionary.default;
    }

    return () => null;
};

const byOS = findHandlerOrDefault.bind(null, currentPlatform);

// get configurator version
const appVersion = '' + app.getVersion();

// set production dir before generating local os archive of application or use empty string for development
const srcDir = "./"; // use './resources/app/' for production

const winDir7zip = "C:/Program Files/7-Zip/7z.exe";
const winDirPythonEmbedded = srcDir + "setup/win/python-3.8.8-embed-amd64/python.exe";
const winDirPortableGit = srcDir + "setup/win/PortableGit-2.30.1-64-bit/git-bash.exe";

log.transports.file.level = 'debug';
log.transports.file.fileName = srcDir + 'elrs-cli.log';
log.transports.file.resolvePath = (variables) => {
    return path.join(variables.fileName);
}

const localElrsDir = srcDir + "ExpressLRS/";
const fetchHeadPath = srcDir + "ExpressLRS/.git/FETCH_HEAD";
const packedRefsPath = srcDir + "ExpressLRS/.git/packed-refs";

// handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) { // eslint-disable-line global-require
    app.quit();
}

let setupUpdateWindow = null;
const createSetupWindow = () => {

    // create the browser window.
    setupUpdateWindow = new BrowserWindow({
        width: 874,
        height: 300,
        webPreferences: {
            nodeIntegration: true
        },
        frame: false,
        show: false
    });

    // and load the setup.html of the app.
    setupUpdateWindow.loadFile(path.join(__dirname, 'setup.html'));

    setupUpdateWindow.once('ready-to-show', () => {
        setupUpdateWindow.show();
        setupUpdateWindow.webContents.send('version', appVersion);

        // start setup procedures
        setupElrsLocally();
    })
};

let aboutWindow = null;
const createAboutWindow = () => {

    aboutWindow = new BrowserWindow({
        width: 390,
        height: 420,
        webPreferences: {
            nodeIntegration: true
        },
        frame: false,
        show: false
    });

    aboutWindow.loadFile(path.join(__dirname, 'about.html'));

    // when focus is lost on about window - hide it
    aboutWindow.on('blur', () => {
        aboutWindow.hide();
        mainWindow.setOpacity(1.0);
    });

    aboutWindow.webContents.on('new-window', function(e, url) {
        e.preventDefault();
        shell.openExternal(url);
    });

    aboutWindow.once('ready-to-show', () => {
        aboutWindow.webContents.send('version', appVersion);
    })
};

const createMainWindow = () => {

    // create the browser window.
    mainWindow = new BrowserWindow({
        width: 890,
        height: 840,
        webPreferences: {
            nodeIntegration: true
        },
        show: false
    });

    // and load the index.html of the app.
    mainWindow.loadFile(path.join(__dirname, 'index.html'));

    // quit application on main window close
    mainWindow.on('closed', () => app.quit());

    mainWindow.webContents.on('new-window', function(e, url) {
        e.preventDefault();
        shell.openExternal(url);
    });

    // apply default menu
    const mainMenu = Menu.buildFromTemplate(menu);
    Menu.setApplicationMenu(mainMenu);

    mainWindow.once('ready-to-show', () => {
        mainWindow.webContents.send('version', appVersion);
    })
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
    globalShortcut.register('Alt+CommandOrControl+C', () => {
        mainWindow.webContents.send('toggle-elrs-console')
    })

    createSetupWindow();

    createAboutWindow();

    createMainWindow();
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// No OSX app yet
// app.on('activate', () => {
//     // On OS X it's common to re-create a window in the app when the
//     // dock icon is clicked and there are no other windows open.
//     if (BrowserWindow.getAllWindows().length === 0) {
//         createWindow();
//     }
// });

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.

// clone ExpressLRS repository locally
ipcMain.handle('clone-elrs-repo', () => cloneElrsGithubRepo());

// update ExpressLRS repository locally
ipcMain.handle('pull-elrs-repo', () => pullElrsGithubRepo());

// reset ExpressLRS local repository to branch
ipcMain.handle('elrs-reset-branch', (e, branch) => resetElrsBranch(branch));

// handle about button click
ipcMain.handle('open-about-clicked', () => {
    mainWindow.setOpacity(0.9);
    aboutWindow.show();
});

ipcMain.handle('build-elrs-selected-target', (e, target) => {
    log.info('Selected [%s] target for building ExpressLRS firmware. Starting build process.', target)

    // build ExpressLRS target
    buildElrsFirmwareForTarget(target)

    // send event for successful start of build
    mainWindow.webContents.send('elrs-build-started', target)
})

ipcMain.handle('upload-elrs-selected-target', (e, target) => {
    log.info('Selected [%s] target for uploading ExpressLRS firmware. Starting upload process.', target)

    // upload ExpressLRS target
    uploadElrsFirmwareForTarget(target)

    // send event for successful start of upload
    mainWindow.webContents.send('elrs-upload-started', target)
})

// handle update ExpressLRS branches clicked
ipcMain.handle('update-elrs-branches-clicked', () => {
    listElrsBranches();
});

// helper function to run script in terminal
function runScript(command, args, callback, errCallback) {
    log.info('Executing script: ' + command + ' ' + args);

    // spawn os subprocess
    var child = spawn(command, args, {
        encoding: 'utf8',
        shell: true
    });

    // fetch error
    child.on('error', (error) => {
        // log error data
        log.error(error.toString().trim());

        // TODO: show more cool-looking notifications
        // dialog.showMessageBox({
        //     title: 'Error',
        //     type: 'error',
        //     message: 'Unable to execute script \'' + command + '\'. Error: \r\n' + error
        // }).then((data) => {
        //     log.debug("Clicked dialog button #" + data.response);
        //     if (0 === data.response) {
        //         app.quit();
        //     }
        // });
    });

    // fetch stdout
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (data) => {
        // log stdout data
        log.info(data.toString().trim());
    });

    // fetch stderr
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (data) => {
        // log stderr data
        log.error(data.toString().trim());

        // TODO: show more cool - looking notifications
        // dialog.showMessageBox({
        //     title: 'Error',
        //     type: 'error',
        //     message: 'Unable to execute script:\r\n \'' + command + ' ' + args + '\'. \r\nError: \r\n' + data
        // }).then((data) => {
        //     log.debug("Clicked dialog button #" + data.response);
        //     if (0 === data.response) {
        //         app.quit();
        //     }
        // });
    });

    child.on('close', (code) => {
        switch (code) {
            case 0:
                {
                    log.info('Successfully executed script: ' + command + ' ' + args);

                    // run success callback function
                    if (typeof callback === 'function') {
                        callback();
                    }

                    break;
                }
            default:
                {
                    // run error callback function
                    if (typeof errCallback === 'function') {
                        errCallback();
                    }
                }
        }
    });

    return child;
}

function localFileExists(path) {
    if (fs.existsSync(path)) {
        return true;
    } else {
        return false;
    }
}

// cross-platform setup procedures
function setupElrsLocally() {
    // start event with running spinner loader
    setupUpdateWindow.webContents.send('elrs-setup-started');

    log.info("Setting up ExpressLRS Configurator locally");

    byOS({
        [platforms.WINDOWS]: setupWinElrsLocally(),
        [platforms.LINUX]: setupLinuxElrsLocally(),
        [platforms.MAC]: setupMacElrsLocally(),
    });
}

let setupElrsProcess = null

function setupWinElrsLocally() {
    log.info("Checking for local 7-Zip installation");

    if (!localFileExists(winDir7zip)) {
        log.info("Local 7-Zip installation not found! Starting installation...")

        // install 7-Zip archiver
        setupElrsProcess = runScript("cmd", ["/C \"\"./setup/win/7zip-install.cmd\"\""], installPython);
    } else {
        log.info("Found local 7-Zip installation");
        installPython();
    }
}

function setupLinuxElrsLocally() {}

function setupMacElrsLocally() {}
// end of cross-platform setup procedures

// cross-platform Python install procedures
function installPython() {
    setupUpdateWindow.webContents.send('python-setup-started');

    log.info("Checking for local Python embedded installation");

    if (!localFileExists(winDirPythonEmbedded)) {

        log.info("Local Python embedded not found! Starting installation...");

        byOS({
            [platforms.WINDOWS]: extractWinPython(),
            [platforms.LINUX]: installLinuxPython(),
            [platforms.MAC]: installMacPython(),
        });
    } else {
        log.info("Found local Python embedded installation");
        installGit();
    }
}

let installPythonProcess = null;

function extractWinPython() {
    // install Python embedded
    installPythonProcess = runScript("cmd", ["/C \"\"C:/Program Files/7-zip/7z.exe\" x \"./setup/win/python-3.8.8-embed-amd64.7z\" -o./setup/win -aos\"\""], installPythonTools);
}

function installLinuxPython() {}

function installMacPython() {}
// end of cross-platform Python install procedures

// cross-platform ExpressLRS Python tools install procedures - should be called once after Python installation
function installPythonTools() {
    setupUpdateWindow.webContents.send('python-tools-setup-started');

    log.info("Installing Python tools needed for ExpressLRS");

    byOS({
        [platforms.WINDOWS]: installWinPythonTools(),
        [platforms.LINUX]: installLinuxPythonTools(),
        [platforms.MAC]: installMacPythonTools(),
    });
}

let installPythonToolsProcess = null;

function installWinPythonTools() {
    // install Python tools for ExpressLRS on Windows
    installPythonToolsProcess = runScript("cmd", ["/C \"\"" + winDirPythonEmbedded + "\" \"" + srcDir + "elrs-cli/setup.py\" -s\"\""], installGit);
}

function installLinuxPythonTools() {}

function installMacPythonTools() {}
// end of cross-platform ExpressLRS Python tools install procedures

// cross-platform Git install procedures
function installGit() {
    setupUpdateWindow.webContents.send('git-setup-started');

    // TODO: check if we already have git installed. Currently using Portable git version.
    log.info("Checking for local Portable Git installation");

    if (!localFileExists(winDirPortableGit)) {
        log.info("Local Portable Git not found! Starting installation...");

        byOS({
            [platforms.WINDOWS]: extractWinGit(),
            [platforms.LINUX]: installLinuxGit(),
            [platforms.MAC]: installMacGit(),
        });
    } else {
        log.info("Found local Portable Git installation");
        cloneExpressLRS();
    }
}

let installGitProcess = null

function extractWinGit() {
    // install Portable Git
    installGitProcess = runScript("cmd", ["/C \"\"C:/Program Files/7-zip/7z.exe\" x \"./setup/win/PortableGit-2.30.1-64-bit.7z.exe\" -o./setup/win/PortableGit-2.30.1-64-bit -aos\"\""], cloneExpressLRS);
}

function installLinuxGit() {}

function installMacGit() {}
// end of cross-platform Git install procedures

// cross-platform ExpressLRS clone procedures
function cloneExpressLRS() {
    setupUpdateWindow.webContents.send('initial-elrs-clone');

    log.info("Checking for already cloned ExpressLRS project");

    if (!localFileExists(localElrsDir)) {
        log.info("Local ExpressLRS repository not found! Starting cloning ExpressLRS...");

        byOS({
            [platforms.WINDOWS]: cloneWinExpressLRS(),
            [platforms.LINUX]: cloneLinuxExpressLRS(),
            [platforms.MAC]: cloneMacExpressLRS(),
        });
    } else {
        log.info("Found local ExpressLRS repository");
        updateAndGetCurrentRemoteBranch();
    }
}

let cloneExpressLRSProcess = null

function cloneWinExpressLRS() {
    // clone ExpressLRS using embedded Python on Windows
    cloneExpressLRSProcess = runScript("cmd", ["/C \"\"" + winDirPythonEmbedded + "\" \"" + srcDir + "elrs-cli/elrs-cli.py\" -c\"\""], updateAndGetCurrentRemoteBranch);
}

function cloneLinuxExpressLRS() {}

function cloneMacExpressLRS() {}
// cross-platform ExpressLRS clone procedures

let localFetchedElrsBranches = new Map();
let localFetchedElrsTags = new Map();
let currentRemote = null;

function getCurrentRemoteBranch() {
    let currentHeadCommit;

    const readInterface = readline.createInterface({
        input: fs.createReadStream(srcDir + "ExpressLRS/.git/refs/heads/master"),
        output: process.stdout,
        console: false
    });

    readInterface.on('line', function(line) {
        currentHeadCommit = line.trim();
    });

    readInterface.on('close', function(line) {
        log.info('Successfully fetched ExpressLRS local repo HEAD commit: %s', currentHeadCommit);

        // set proper remote where local HEAD is pointing
        currentRemote = localFetchedElrsBranches.get(currentHeadCommit);
        if (null == currentRemote) {
            log.info("Unable to find local HEAD commit as branch. Searching tags...")

            currentRemote = localFetchedElrsTags.get(currentHeadCommit);

            log.info('Successfully parsed current remote tag %s', currentRemote);
        } else {
            log.info('Successfully parsed current remote branch %s', currentRemote);
        }

        pullExpressLRS();
    });
}

// fetch latest locally updated remotes either from .git/packet-refs or from ./git/FETCH_HEAD file
function updateAndGetCurrentRemoteBranch() {
    if (!localFileExists(fetchHeadPath)) {
        parseInitialLocalBranches(getCurrentRemoteBranch);
    } else {
        parseLocalBranchesAfterFetch(getCurrentRemoteBranch);
    }
}

function parseInitialLocalBranches(callback) {
    log.info("Parsing local branches from packed-refs")

    const readInterface = readline.createInterface({
        input: fs.createReadStream(packedRefsPath),
        output: process.stdout,
        console: false
    });

    readInterface.on('line', function(line) {
        if (!line.startsWith('#')) {
            commitHash = line.substring(0, 40);

            lineSplit = line.split(' ');
            fullRefsPath = lineSplit[1];
            branchName = null;
            tagName = null;
            if (fullRefsPath.includes('refs/remotes/')) {
                branchName = fullRefsPath.substring(20).trim();
            } else {
                // if not branch - it is tag
                tagName = fullRefsPath.substring(10).trim();
            }

            if (null != branchName) {
                // add to locally fetched branches
                localFetchedElrsBranches.set(commitHash, branchName)
            }

            if (null != tagName) {
                // add to locally fetched tags
                localFetchedElrsTags.set(commitHash, tagName)
            }
        }
    });

    readInterface.on('close', function(line) {
        log.debug('Successfully updated ExpressLRS initial local branches mappings');

        // run success callback function
        if (typeof callback === 'function') {
            callback();
        }
    });
}

function parseLocalBranchesAfterFetch(callback) {
    log.info("Parsing local branches from FETCH_HEAD")

    const readInterface = readline.createInterface({
        input: fs.createReadStream(fetchHeadPath),
        output: process.stdout,
        console: false
    });

    readInterface.on('line', function(line) {
        commitHash = line.substring(0, 40);

        lineSplit = line.split('\'');
        branchTagIdx = 0;
        branchName = null;
        tagName = null;
        for (const currentSplit of lineSplit) {
            if (currentSplit.includes('branch')) {
                branchTagIdx = lineSplit.indexOf(currentSplit);
                branchName = lineSplit[branchTagIdx + 1];
            } else if (currentSplit.includes('tag')) {
                branchTagIdx = lineSplit.indexOf(currentSplit);
                tagName = lineSplit[branchTagIdx + 1];
            } else {
                continue;
            }
        }

        if (null != branchName) {
            // add to locally fetched branches
            localFetchedElrsBranches.set(commitHash, branchName)
        }

        if (null != tagName) {
            // add to locally fetched tags
            localFetchedElrsTags.set(commitHash, tagName)
        }
    });

    readInterface.on('close', function(line) {
        log.debug('Successfully updated ExpressLRS local branches mappings after Git fetch');

        // run success callback function
        if (typeof callback === 'function') {
            callback();
        }
    });
}

// cross-platform ExpressLRS pull procedures
function pullExpressLRS() {
    setupUpdateWindow.webContents.send('initial-elrs-pull');

    log.info("Updating local ExpressLRS project with latest current branch changes");

    if (null != currentRemote) {
        byOS({
            [platforms.WINDOWS]: pullWinExpressLRS(),
            [platforms.LINUX]: pullLinuxExpressLRS(),
            [platforms.MAC]: pullMacExpressLRS(),
        });
    } else {
        log.error('Unable to pull remote ExpressLRS repo due to missing current remote branch');
    }
}

let pullExpressLRSProcess = null

function pullWinExpressLRS() {
    // pull ExpressLRS using embedded Python on Windows
    pullExpressLRSProcess = runScript("cmd", ["/C \"\"" + winDirPythonEmbedded + "\" \"" + srcDir + "elrs-cli/elrs-cli.py\" -p \"" + currentRemote + "\"\""], startElrsConfigurator);
}

function pullLinuxExpressLRS() {}

function pullMacExpressLRS() {}
// end of cross-platform ExpressLRS pull procedures

function startElrsConfigurator() {
    // show main window
    mainWindow.show();

    // hide setup and update window
    setupUpdateWindow.hide();

    // fetch latest ExpressLRS branches
    parseLocalBranchesAfterFetch(listElrsBranches);

    // fetch latest PlatformIO build targets
    listElrsBuildTargets();
}

function listElrsBranches() {
    //updateLocalBranchesMap()

    let parsedElrsBranches = Array.from(localFetchedElrsBranches.values()).sort();
    let parsedElrsTags = Array.from(localFetchedElrsTags.values()).sort();
    let parsedElrsRemotes = parsedElrsTags.concat(parsedElrsBranches);

    log.info('Successfully parsed ExpressLRS remote branches: %s', parsedElrsRemotes);

    // update local ExpressLRS branches select component, keeping remote branches for select
    mainWindow.webContents.send('update-elrs-branches-success', parsedElrsRemotes, currentRemote);
}

// fetch latest PlatformIO build targets from platformio.ini
function listElrsBuildTargets() {
    let fetchedPioBuildTargets = [];

    const readInterface = readline.createInterface({
        input: fs.createReadStream(srcDir + "ExpressLRS/src/platformio.ini"),
        output: process.stdout,
        console: false
    });

    readInterface.on('line', function(line) {
        if (line.startsWith('[env:')) {
            // remove '[env:' from start and end ']' for correct value parsing
            var substringEnd = line.length - 1;
            line = line.substring(5, substringEnd);

            // add to array list
            fetchedPioBuildTargets.push(line);
        }
    });

    readInterface.on('close', function(line) {
        log.debug('Successfully fetched PlatformIO branches: %s', fetchedPioBuildTargets);

        // update local ExpressLRS build targets component
        mainWindow.webContents.send('update-elrs-build-targets-success', fetchedPioBuildTargets);
    });
}

// cross-platform reset ExpressLRS to branch procedures
function resetElrsBranch(branch) {
    mainWindow.webContents.send('elrs-reset-branch-started')

    log.info('Resetting ExpressLRS local repository to remote branch: \'%s\'', branch);

    byOS({
        [platforms.WINDOWS]: resetWinElrsBranch(branch),
        [platforms.LINUX]: resetLinuxElrsBranch(branch),
        [platforms.MAC]: resetMacElrsBranch(branch),
    });
}

let resetElrsBranchProcess = null
let resetBranch = null;

function resetWinElrsBranch(branch) {
    // reset ExpressLRS code source using embedded Python on Windows
    resetElrsBranchProcess = runScript("cmd", ["/C \"\"" + winDirPythonEmbedded + "\" \"" + srcDir + "elrs-cli/elrs-cli.py\" -r \"" + branch + "\"\""], resetElrsBranchSuccess, resetElrsBranchFailed);
    resetBranch = branch;
}

function resetLinuxElrsBranch(branch) {}

function resetMacElrsBranch(branch) {}
// end of cross-platform reset ExpressLRS to branch procedures

function resetElrsBranchSuccess() {
    log.info('Resetting ExpressLRS local repository to branch \'%s\' completed successfully', resetBranch);

    // send event for successfully finished target build
    mainWindow.webContents.send('elrs-reset-branch-success')

    // fetch latest PlatformIO build targets
    listElrsBuildTargets();
}

function resetElrsBranchFailed() {
    log.error('Failed resetting ExpressLRS local repository to remote branch %s', resetBranch);

    // send failed event for stopping spinner loader
    mainWindow.webContents.send('elrs-reset-branch-failed')
}

// cross-platform build ExpressLRS firmware procedures
function buildElrsFirmwareForTarget(target) {
    log.info('Building ExpressLRS firmware for target: %s', target);

    byOS({
        [platforms.WINDOWS]: buildWinElrsFirmwareForTarget(target),
        [platforms.LINUX]: buildLinuxElrsFirmwareForTarget(target),
        [platforms.MAC]: buildMacElrsFirmwareForTarget(target),
    });
}

let buildElrsFirmwareProcess = null
let buildTarget = null;

function buildWinElrsFirmwareForTarget(target) {
    // build ExpressLRS firmware for specific target using embedded Python on Windows
    buildElrsFirmwareProcess = runScript("cmd", ["/C \"\"" + winDirPythonEmbedded + "\" \"" + srcDir + "elrs-cli/elrs-cli.py\" -b -t \"" + target + "\"\""], buildElrsFirmwareForTargetSuccess, buildElrsFirmwareForTargetFailed);
    buildTarget = target;
}

function buildLinuxElrsFirmwareForTarget(branch) {}

function buildMacElrsFirmwareForTarget(branch) {}
// end of cross-platform build ExpressLRS firmware procedures

function buildElrsFirmwareForTargetSuccess() {
    log.info('Building ExpressLRS firmware for target %s completed successfully', buildTarget);

    // send event for successfully finished target build
    mainWindow.webContents.send('elrs-build-success', buildTarget)
}

function buildElrsFirmwareForTargetFailed() {
    log.error('Failed building ExpressLRS firmware for target %s.', buildTarget);

    // send failed event for stopping spinner loader
    mainWindow.webContents.send('elrs-build-failed', buildTarget)
}

// cross-platform upload ExpressLRS firmware procedures
function uploadElrsFirmwareForTarget(target) {
    log.info('Started uploading ExpressLRS firmware for target: %s', target);

    byOS({
        [platforms.WINDOWS]: uploadWinElrsFirmwareForTarget(target),
        [platforms.LINUX]: uploadLinuxElrsFirmwareForTarget(target),
        [platforms.MAC]: uploadMacElrsFirmwareForTarget(target),
    });
}

let uploadElrsFirmwareProcess = null
let uploadTarget = null;

function uploadWinElrsFirmwareForTarget(target) {
    // upload ExpressLRS firmware for specific target using embedded Python on Windows
    uploadElrsFirmwareProcess = runScript("cmd", ["/C \"\"" + winDirPythonEmbedded + "\" \"" + srcDir + "elrs-cli/elrs-cli.py\" -u -t \"" + target + "\"\""], uploadElrsFirmwareForTargetSuccess, uploadElrsFirmwareForTargetFailed);
    uploadTarget = target;
}

function uploadLinuxElrsFirmwareForTarget(branch) {}

function uploadMacElrsFirmwareForTarget(branch) {}
// end of cross-platform upload ExpressLRS firmware procedures

function uploadElrsFirmwareForTargetSuccess() {
    log.info('Uploading ExpressLRS firmware for target %s completed successfully', uploadTarget);

    // send event for successfully finished target upload
    mainWindow.webContents.send('elrs-upload-success', uploadTarget)
}

function uploadElrsFirmwareForTargetFailed() {
    log.error('Failed uploading ExpressLRS firmware for target %s.', uploadTarget);

    // send failed event for stopping spinner loader
    mainWindow.webContents.send('elrs-upload-failed', uploadTarget)
}

// // manual cloning from menu
// let cloneElrsProcess = null
// const cloneElrsGithubRepo = () => {
//     // start event with running spinner loader
//     mainWindow.webContents.send('elrs-clone-started');

//     // execute child process
//     cloneElrsProcess = spawn('py', ['-3', srcDir + 'elrs-cli/elrs-cli.py', '-c']);

//     if (cloneElrsProcess != null) {
//         log.info('Cloning ExpressLRS locally');

//         cloneElrsProcess.stdout.on('data', function(data) {
//             log.info(data.toString());
//         });

//         cloneElrsProcess.on('exit', (code) => {
//             if (Number(0) === Number(code)) {
//                 log.info('Cloning ExpressLRS locally finished successfully. Exit code: %s', code);

//                 // update local ExpressLRS repository with latest changes from master after cloning master code locally
//                 pullElrsGithubRepo();
//             } else {
//                 log.error('Failed cloning ExpressLRS locally. Exit code: %s', code);

//                 // send success event for stopping spinner loader
//                 mainWindow.webContents.send('elrs-clone-failed')
//             }
//         });
//     }
// }

// let pullElrsProcess = null
// const pullElrsGithubRepo = () => {
//     // start event with running spinner loader
//     mainWindow.webContents.send('elrs-pull-started');

//     pullElrsProcess = spawn('py', ['-3', srcDir + 'elrs-cli/elrs-cli.py', '-p']);

//     if (pullElrsProcess != null) {
//         log.info('Updating ExpressLRS locally.');

//         pullElrsProcess.stdout.on('data', function(data) {
//             log.info(data.toString());
//         });

//         pullElrsProcess.on('exit', (code) => {
//             if (Number(0) === Number(code)) {
//                 log.info('Successfully updated ExpressLRS locally. Exit code: %s', code);

//                 // send event for success pull
//                 mainWindow.webContents.send('elrs-pull-success')
//             } else {
//                 log.error('Failed updating ExpressLRS locally. Exit code: %s', code);

//                 // send success event for stopping spinner loader
//                 mainWindow.webContents.send('elrs-pull-failed')
//             }
//         });
//     }
// }




const killAllProcesses = () => {
    log.info('Killing all ExpressLRS CLI processes');

    if (null != setupElrsProcess) {
        setupElrsProcess.kill();
        setupElrsProcess = null;
        log.debug("\'setupElrsProcess\' successfully killed!")
    }

    if (null != installPythonProcess) {
        installPythonProcess.kill();
        installPythonProcess = null;
        log.debug("\'installPythonProcess\' successfully killed!")
    }

    if (null != installPythonToolsProcess) {
        installPythonToolsProcess.kill();
        installPythonToolsProcess = null;
        log.debug("\'installPythonToolsProcess\' successfully killed!")
    }

    if (null != installGitProcess) {
        installGitProcess.kill();
        installGitProcess = null;
        log.debug("\'installGitProcess\' successfully killed!")
    }

    if (null != cloneExpressLRSProcess) {
        cloneExpressLRSProcess.kill();
        cloneExpressLRSProcess = null;
        log.debug("\'cloneExpressLRSProcess\' successfully killed!")
    }

    if (null != pullExpressLRSProcess) {
        pullExpressLRSProcess.kill();
        pullExpressLRSProcess = null;
        log.debug("\'pullExpressLRSProcess\' successfully killed!")
    }

    if (null != resetElrsBranchProcess) {
        resetElrsBranchProcess.kill();
        resetElrsBranchProcess = null;
        log.debug("\'resetElrsBranchProcess\' successfully killed!")
    }

    if (null != buildElrsFirmwareProcess) {
        buildElrsFirmwareProcess.kill();
        buildElrsFirmwareProcess = null;
        log.debug("\'buildElrsFirmwareProcess\' successfully killed!")
    }

    if (null != uploadElrsFirmwareProcess) {
        uploadElrsFirmwareProcess.kill();
        uploadElrsFirmwareProcess = null;
        log.debug("\'uploadElrsFirmwareProcess\' successfully killed!")
    }
}

// Kill all processes before quit application
app.on('will-quit', killAllProcesses);