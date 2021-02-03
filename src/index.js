const { app, globalShortcut, BrowserWindow, Menu, ipcMain, shell } = require('electron')
const path = require('path')
const fs = require("fs");
const readline = require('readline');
const menu = require('./menu')
const { spawn } = require('child_process')
const log = require('electron-log');
const Git = require("nodegit");

// set production dir before generating local os archive of application or use empty string for development
const srcDir = "./"; // use './resources/app/' for production

log.transports.file.level = 'debug';
log.transports.file.fileName = srcDir + 'elrs-cli.log';
log.transports.file.resolvePath = (variables) => {
    return path.join(variables.fileName);
}

const localElrsPythonVenvDir = "./elrs-cli/venv/"
const localElrsDir = srcDir + "ExpressLRS/"

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) { // eslint-disable-line global-require
    app.quit();
}

let setupUpdateWindow
const createSetupWindow = () => {

    // create the browser window.
    setupUpdateWindow = new BrowserWindow({
        width: 874,
        height: 300,
        frame: false,
        show: false
    });

    // and load the index.html of the app.
    setupUpdateWindow.loadFile(path.join(__dirname, 'setup.html'));

    setupUpdateWindow.once('ready-to-show', () => {
        setupUpdateWindow.show();

        if (needElrsSetup()) {
            // setup ExpressLRS Python 3 venv locally
            setupElrsLocally();
        } else {
            activateElrsPythonVenv();
        }
    })
};

let aboutWindow
const createMainWindow = () => {

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
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
    globalShortcut.register('Alt+CommandOrControl+C', () => {
        mainWindow.webContents.send('toggle-elrs-console')
    })

    createSetupWindow();

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

    setupElrsProcess = spawn('py', ['-3', srcDir + 'elrs-cli/setup.py', '-s']);

    if (setupElrsProcess != null) {
        log.info('Setting up ExpressLRS locally');

        setupElrsProcess.stdout.on('data', function(data) {
            log.info(data.toString());
        });

        setupElrsProcess.on('exit', (code) => {
            if (Number(0) === Number(code)) {
                log.info('Successfully finished setup ExpressLRS locally. Exit code: %s', code);

                // check and update local ExpressLRS repository if needed
                if (needElrsGithubRepoClone()) {
                    // clone ExpressLRS at startup if starting for first time - THIS TAKES A WHILE... BE PATIENT!
                    autoCloneElrsGithubRepo();
                } else {
                    // just update local ExpressLRS repository with latest changes from master
                    autoPullElrsGithubRepo();
                }
            } else {
                log.error('Failed setup ExpressLRS locally. Exit code: %s', code);

                // quit application if error while setting up
                app.quit();
            }
        });
    }
}

let activatePythonVenvProcess = null
const activateElrsPythonVenv = () => {

    activatePythonVenvProcess = spawn('py', ['-3', srcDir + 'elrs-cli/setup.py', '-a']);

    if (activatePythonVenvProcess != null) {
        log.info('Activating ExpressLRS Python venv locally');

        activatePythonVenvProcess.stdout.on('data', function(data) {
            log.info(data.toString());
        });

        activatePythonVenvProcess.on('exit', (code) => {
            if (Number(0) === Number(code)) {
                log.info('Successfully activated ExpressLRS Python venv locally. Exit code: %s', code);

                // check and update local ExpressLRS repository if needed
                if (needElrsGithubRepoClone()) {
                    // clone ExpressLRS at startup if starting for first time - THIS TAKES A WHILE... BE PATIENT!
                    autoCloneElrsGithubRepo();
                } else {
                    // just update local ExpressLRS repository with latest changes from master
                    autoPullElrsGithubRepo();
                }
            } else {
                log.error('Failed activating ExpressLRS Python venv locally. Exit code: %s', code);

                // quit application if error while activating venv
                app.quit();
            }
        });
    }
}

const elrsCloneUrl = "https://github.com/AlessandroAU/ExpressLRS";
var elrsCloneOptions = {};

// needed for OSX
elrsCloneOptions.fetchOpts = {
    callbacks: {
        certificateCheck: function() { return 0; }
    }
};

const autoCloneElrsGithubRepo = () => {

    log.info('Cloning ExpressLRS locally');

    Git.Clone(elrsCloneUrl, localElrsDir, elrsCloneOptions)
        .then(function(repository) {
            log.info('Cloning ExpressLRS locally finished successfully');

            // update local ExpressLRS repository with latest changes from master after cloning master code locally
            autoPullElrsGithubRepo();
        })
        .catch(function(msg) {
            log.error("Failed cloning ExpressLRS locally. " + msg);
            app.quit();
        });
}

// Manual cloning from menu
const cloneElrsGithubRepo = () => {

    log.info('Cloning ExpressLRS locally');

    // start event with running spinner loader
    mainWindow.webContents.send('elrs-clone-started');

    Git.Clone(elrsCloneUrl, localElrsDir, elrsCloneOptions)
        .then(function(repository) {
            log.info('Cloning ExpressLRS locally finished successfully');

            // update local ExpressLRS repository with latest changes from master after cloning master code locally
            pullElrsGithubRepo();
        })
        .catch(function(msg) {
            log.error('Failed cloning ExpressLRS locally. %s', msg);

            // send success event for stopping spinner loader
            mainWindow.webContents.send('elrs-clone-failed')
        });
}

const autoPullElrsGithubRepo = () => {

    log.info('Updating ExpressLRS locally.');

    Git.Repository.open(localElrsDir)
        .then(function(repo) {
            repository = repo;

            return repository.fetchAll({
                callbacks: {
                    certificateCheck: function() {
                        return 0;
                    }
                }
            });
        })
        .then(function() {
            return repository.mergeBranches("master", "origin/master");
        })
        .then(function() {
            log.info('Successfully updated ExpressLRS locally.');

            // show main window
            mainWindow.show();

            // hide setup and update window
            setupUpdateWindow.hide();

            // fetch latest ExpressLRS branches
            listElrsBranches();

            // send event for success pull
            mainWindow.webContents.send('elrs-pull-success')
        })
        .catch(function(errorMsg) {
            log.error('Unable to pull latest remote ExpressLRS repository changes');
            app.quit();
        });
}

const pullElrsGithubRepo = () => {
    // start event with running spinner loader
    mainWindow.webContents.send('elrs-pull-started');

    log.info('Updating ExpressLRS locally.');

    Git.Repository.open(localElrsDir)
        .then(function(repo) {
            repository = repo;

            return repository.fetchAll({
                callbacks: {
                    certificateCheck: function() {
                        return 0;
                    }
                }
            });
        })
        .then(function() {
            return repository.mergeBranches("master", "origin/master");
        })
        .then(function() {
            log.info('Successfully updated ExpressLRS locally.');

            // send event for success pull
            mainWindow.webContents.send('elrs-pull-success')
        })
        .catch(function(errorMsg) {
            log.error('Unable to pull latest remote ExpressLRS repository changes');

            // send success event for stopping spinner loader
            mainWindow.webContents.send('elrs-pull-failed')
        });
}

const listElrsBranches = () => {

    let fetchedRemoteBranches = [];

    // start event with running spinner loader
    mainWindow.webContents.send('update-elrs-branches-started');

    Git.Repository.open(localElrsDir)
        .then(function(repo) {
            return repo.getReferenceNames(Git.Reference.TYPE.ALL);
        })
        .then(function(elrsReferenceNames) {
            log.info("Fetched %s local ExpressLRS reference names", elrsReferenceNames.length);

            elrsReferenceNames.forEach(reference => {
                if (reference.startsWith('refs/remotes/')) {
                    let remoteReferenceTrimmed = reference.substring(13);

                    fetchedRemoteBranches.push(remoteReferenceTrimmed);

                    log.debug("Found remote branch: %s", remoteReferenceTrimmed)
                }
            });
        })
        .then(function() {
            log.info('Successfully fetched %s ExpressLRS remote branches', fetchedRemoteBranches.length);

            // update local ExpressLRS branches select component, keeping remote branches for select
            mainWindow.webContents.send('update-elrs-branches-success', fetchedRemoteBranches);

            // fetch latest PlatformIO build targets
            updateElrsBuildTargets();
        })
        .catch(function(msg) {
            log.error('Failed fetching ExpressLRS remote branches locally. %', msg);

            // send success event for stopping spinner loader
            mainWindow.webContents.send('update-elrs-branches-failed')
        })
}

// fetch latest PlatformIO build targets from platformio.ini
function updateElrsBuildTargets() {
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

const resetElrsBranch = (remoteBranchName) => {
    mainWindow.webContents.send('elrs-reset-branch-started')

    log.info('Resetting ExpressLRS local repository to remote branch: \'%s\'', remoteBranchName);

    Git.Repository.open(localElrsDir)
        .then(function(repo) {
            repository = repo;

            return repo.getHeadCommit()
        })
        .then(function(targetCommit) {
            return repository.createBranch(remoteBranchName, targetCommit, false);
        })
        .then(function(reference) {
            return repository.checkoutBranch(reference, {});
        })
        .then(function() {
            return repository.getReferenceCommit("refs/remotes/" + remoteBranchName);
        })
        .then(function(commit) {
            Git.Reset.reset(repository, commit, 3, {});
        })
        .then(function() {
            log.info('Resetting ExpressLRS local repository to remote branch \'%s\' completed successfully', remoteBranchName);

            // send event for successfully finished target build
            mainWindow.webContents.send('elrs-reset-branch-success')
        })
        .catch(function(msg) {
            log.error('Failed resetting ExpressLRS local repository to remote branch %s. %s', remoteBranchName, msg);

            // send success event for stopping spinner loader
            mainWindow.webContents.send('elrs-reset-branch-failed')
        });
}

let buildElrsFirmwareProcess = null
const buildElrsFirmwareForTarget = (target) => {
    buildElrsFirmwareProcess = spawn('py', ['-3', srcDir + 'elrs-cli/elrs-cli.py', '-b', '-t', target]);

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
    uploadElrsFirmwareProcess = spawn('py', ['-3', srcDir + 'elrs-cli/elrs-cli.py', '-u', '-t', target]);

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
    if (null != setupElrsProcess) {
        setupElrsProcess.kill();
        setupElrsProcess = null;
    }

    if (null != activatePythonVenvProcess) {
        activatePythonVenvProcess.kill();
        activatePythonVenvProcess = null;
    }

    if (null != buildElrsFirmwareProcess) {
        buildElrsFirmwareProcess.kill();
        buildElrsFirmwareProcess = null;
    }

    if (null != uploadElrsFirmwareProcess) {
        uploadElrsFirmwareProcess.kill();
        uploadElrsFirmwareProcess = null;
    }
}

// Kill all processes before quit application
app.on('will-quit', killAllProcesses);