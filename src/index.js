const { app, globalShortcut, BrowserWindow, Menu, ipcMain, shell } = require('electron')
const path = require('path')
const fs = require("fs");
const menu = require('./menu')
const { spawn } = require('child_process')
const log = require('electron-log');
log.transports.file.level = 'debug';
log.transports.file.fileName = 'elrs-cli.log';
log.transports.file.resolvePath = (variables) => {
    return path.join(variables.fileName);
}

const localElrsPythonVenvDir = "./elrs-cli/venv/"
const localElrsDir = "./resources/app/ExpressLRS/"

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) { // eslint-disable-line global-require
    app.quit();
}

let mainWindow

const createWindow = () => {

    aboutWindow = new BrowserWindow({
        width: 390,
        height: 420,
        frame: false,
        show: false
    });

    // and load the index.html of the app.
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
        mainWindow.show();

        if (needElrsSetup()) {
            // setup ExpressLRS Python 3 venv locally
            setupElrsLocally();
        } else {
            activateElrsPythonVenv();

            // initialize fetched remoted branches locally
            listElrsBranches();
        }
    })
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
    globalShortcut.register('Alt+CommandOrControl+C', () => {
        mainWindow.webContents.send('toggle-elrs-console')
    })

    createWindow();
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

function needElrsSetup() {
    if (!fs.existsSync(localElrsPythonVenvDir)) {
        return true;
    } else {
        return false;
    }
}

function needElrsGithubRepoClone() {
    if (!fs.existsSync(localElrsDir)) {
        return true;
    } else {
        return false;
    }
}

let setupElrsProcess = null
const setupElrsLocally = () => {
    // start event with running spinner loader
    mainWindow.webContents.send('elrs-setup-started');

    setupElrsProcess = spawn('py', ['-3', './resources/app/elrs-cli/setup.py', '-s']);

    if (setupElrsProcess != null) {
        log.info('Setting up ExpressLRS locally');

        setupElrsProcess.stdout.on('data', function(data) {
            log.info(data.toString());
        });

        setupElrsProcess.on('exit', (code) => {
            if (Number(0) === Number(code)) {
                log.info('Successfully finished setup ExpressLRS locally. Exit code: %s', code);

                // send success event for stopping spinner loader
                mainWindow.webContents.send('elrs-setup-success')

                // check and update local ExpressLRS repository if needed
                if (needElrsGithubRepoClone()) {
                    // clone ExpressLRS at startup if starting for first time - THIS TAKES A WHILE... BE PATIENT!
                    cloneElrsGithubRepo();
                } else {
                    // just update local ExpressLRS repository with latest changes from master
                    pullElrsGithubRepo();
                }
            } else {
                log.error('Failed setup ExpressLRS locally. Exit code: %s', code);

                // send success event for stopping spinner loader
                mainWindow.webContents.send('elrs-setup-failed')
            }
        });
    }
}

let activatePythonVenvProcess = null
const activateElrsPythonVenv = () => {
    // start event with running spinner loader
    mainWindow.webContents.send('elrs-activation-started');

    activatePythonVenvProcess = spawn('py', ['-3', './resources/app/elrs-cli/setup.py', '-a']);

    if (activatePythonVenvProcess != null) {
        log.info('Activating ExpressLRS Python venv locally');

        activatePythonVenvProcess.stdout.on('data', function(data) {
            log.info(data.toString());
        });

        activatePythonVenvProcess.on('exit', (code) => {
            if (Number(0) === Number(code)) {
                log.info('Successfully activated ExpressLRS Python venv locally. Exit code: %s', code);

                // send success event for stopping spinner loader
                mainWindow.webContents.send('elrs-activation-success')

                // check and update local ExpressLRS repository if needed
                if (needElrsGithubRepoClone()) {
                    // clone ExpressLRS at startup if starting for first time - THIS TAKES A WHILE... BE PATIENT!
                    cloneElrsGithubRepo();
                } else {
                    // just update local ExpressLRS repository with latest changes from master
                    pullElrsGithubRepo();
                }
            } else {
                log.error('Failed activating ExpressLRS Python venv locally. Exit code: %s', code);

                // send success event for stopping spinner loader
                mainWindow.webContents.send('elrs-activation-failed')
            }
        });
    }
}

let cloneElrsProcess = null
const cloneElrsGithubRepo = () => {
    // start event with running spinner loader
    mainWindow.webContents.send('elrs-clone-started');

    // execute child process
    cloneElrsProcess = spawn('py', ['-3', './resources/app/elrs-cli/elrs-cli.py', '-c']);

    if (cloneElrsProcess != null) {
        log.info('Cloning ExpressLRS locally');

        cloneElrsProcess.stdout.on('data', function(data) {
            log.info(data.toString());
        });

        cloneElrsProcess.on('exit', (code) => {
            if (Number(0) === Number(code)) {
                log.info('Cloning ExpressLRS locally finished successfully. Exit code: %s', code);

                // update local ExpressLRS repository with latest changes from master after cloning master code locally
                pullElrsGithubRepo();
            } else {
                log.error('Failed cloning ExpressLRS locally. Exit code: %s', code);

                // send success event for stopping spinner loader
                mainWindow.webContents.send('elrs-clone-failed')
            }
        });
    }
}

let pullElrsProcess = null
const pullElrsGithubRepo = () => {
    // start event with running spinner loader
    mainWindow.webContents.send('elrs-pull-started');

    pullElrsProcess = spawn('py', ['-3', './resources/app/elrs-cli/elrs-cli.py', '-p']);

    if (pullElrsProcess != null) {
        log.info('Updating ExpressLRS locally.');

        pullElrsProcess.stdout.on('data', function(data) {
            log.info(data.toString());
        });

        pullElrsProcess.on('exit', (code) => {
            if (Number(0) === Number(code)) {
                log.info('Successfully updated ExpressLRS locally. Exit code: %s', code);

                // send success event for stopping spinner loader
                mainWindow.webContents.send('elrs-pull-success')
            } else {
                log.error('Failed updating ExpressLRS locally. Exit code: %s', code);

                // send success event for stopping spinner loader
                mainWindow.webContents.send('elrs-pull-failed')
            }
        });
    }
}

let listElrsBranchesProcess = null;
let fetchedRemoteBranches = null;
const listElrsBranches = () => {
    // start event with running spinner loader
    mainWindow.webContents.send('update-elrs-branches-started');

    // execute child process
    listElrsBranchesProcess = spawn('py', ['-3', './resources/app/elrs-cli/elrs-cli.py', '-l']);

    if (listElrsBranchesProcess != null) {
        log.info('Fetching ExpressLRS remote branches locally');

        listElrsBranchesProcess.stdout.on('data', function(data) {
            fetchedRemoteBranches = '' + data.toString();
            log.info("Fetched ExpressLRS remoted branches: " + data.toString());
        });

        listElrsBranchesProcess.on('exit', (code) => {
            if (Number(0) === Number(code)) {
                log.info('Successfully fetched ExpressLRS remote branches locally. Exit code: %s', code);

                // update local ExpressLRS component, keeping remote branches for select
                mainWindow.webContents.send('update-elrs-branches-success', fetchedRemoteBranches);
            } else {
                log.error('Failed fetching ExpressLRS remote branches locally. Exit code: %s', code);

                // send success event for stopping spinner loader
                mainWindow.webContents.send('update-elrs-branches-failed')
            }
        });
    }
}

let resetElrsBranchProcess = null
const resetElrsBranch = (branch) => {
    mainWindow.webContents.send('elrs-reset-branch-started')

    resetElrsBranchProcess = spawn('py', ['-3', './resources/app/elrs-cli/elrs-cli.py', '-r', branch]);

    if (resetElrsBranchProcess != null) {
        log.info('Resetting ExpressLRS local repository to remote branch: \'%s\'', branch);

        resetElrsBranchProcess.stdout.on('data', function(data) {
            log.info(data.toString());
        });

        resetElrsBranchProcess.stderr.on('data', function(data) {
            log.error(data.toString());
        });

        resetElrsBranchProcess.on('exit', (code) => {
            // if execute code successful - send event for successful build done
            if (Number(0) === Number(code)) {
                log.info('Resetting ExpressLRS local repository to remote branch \'%s\' completed successfully. Exit code: %s', branch, code);

                // send event for successfully finished target build
                mainWindow.webContents.send('elrs-reset-branch-success')
            } else {
                log.error('Failed resetting ExpressLRS local repository to remote branch %s. Exit code: %s', branch, code);

                // send success event for stopping spinner loader
                mainWindow.webContents.send('elrs-reset-branch-failed')
            }
        });
    }
}

let buildElrsFirmwareProcess = null
const buildElrsFirmwareForTarget = (target) => {
    buildElrsFirmwareProcess = spawn('py', ['-3', './resources/app/elrs-cli/elrs-cli.py', '-b', '-t', target]);

    if (buildElrsFirmwareProcess != null) {
        log.info('Building ExpressLRS firmware for target: %s', target);

        buildElrsFirmwareProcess.stdout.on('data', function(data) {
            log.info(data.toString());
        });

        buildElrsFirmwareProcess.stderr.on('data', function(data) {
            log.error(data.toString());
        });

        buildElrsFirmwareProcess.on('exit', (code) => {
            // if execute code successful - send event for successful build done
            if (Number(0) === Number(code)) {
                log.info('Building ExpressLRS firmware for target %s completed successfully. Exit code: %s', target, code);

                // send event for successfully finished target build
                mainWindow.webContents.send('elrs-build-success', target)
            } else {
                log.error('Failed building ExpressLRS firmware for target %s. Exit code: %s', target, code);

                // send success event for stopping spinner loader
                mainWindow.webContents.send('elrs-build-failed', target)
            }
        });
    }
}

let uploadElrsFirmwareProcess = null
const uploadElrsFirmwareForTarget = (target) => {
    uploadElrsFirmwareProcess = spawn('py', ['-3', './resources/app/elrs-cli/elrs-cli.py', '-u', '-t', target]);

    if (uploadElrsFirmwareProcess != null) {
        log.info('Started uploading ExpressLRS firmware for target: %s', target);

        uploadElrsFirmwareProcess.stdout.on('data', function(data) {
            log.info(data.toString());
        });

        uploadElrsFirmwareProcess.stderr.on('data', function(data) {
            log.error(data.toString());
        });

        uploadElrsFirmwareProcess.on('exit', (code) => {
            log.info('Uploading ExpressLRS firmware for target %s has completed. Exit code: %s', target, code);

            // if execute code successful - send event for successful upload done
            if (Number(0) === Number(code)) {
                // send event for successfully finished target upload
                mainWindow.webContents.send('elrs-upload-success', target)
            } else {
                log.error('Failed uploading ExpressLRS firmware for target %s. Exit code: %s', target, code);

                // send success event for stopping spinner loader
                mainWindow.webContents.send('elrs-upload-failed', target)
            }
        });
    }
}

const killAllProcesses = () => {
    log.info('Killing all ExpressLRS CLI processes');
    setupElrsProcess.kill();
    setupElrsProcess = null;

    activatePythonVenvProcess.kill();
    activatePythonVenvProcess = null;

    cloneElrsProcess.kill();
    cloneElrsProcess = null;

    pullElrsProcess.kill();
    pullElrsProcess = null;

    listElrsBranchesProcess.kill();
    listElrsBranchesProcess = null;

    buildElrsFirmwareProcess.kill();
    buildElrsFirmwareProcess = null;

    uploadElrsFirmwareProcess.kill();
    uploadElrsFirmwareProcess = null;
}

// Kill all processes before quit application
app.on('will-quit', killAllProcesses);