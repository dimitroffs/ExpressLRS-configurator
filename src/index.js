const { app, BrowserWindow, Menu, ipcMain } = require('electron')
const path = require('path')
const fs = require("fs");
const menu = require('./menu')

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) { // eslint-disable-line global-require
  app.quit();
}

let mainWindow

const createWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 905,
    height: 605,
    webPreferences: {
      nodeIntegration: true
    }
  });

  // and load the index.html of the app.
  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // quit application on main window close
  mainWindow.on('closed', () => app.quit());

  // apply default menu
  const mainMenu = Menu.buildFromTemplate(menu);
  Menu.setApplicationMenu(mainMenu);

  if (needElrsGithubRepoClone()) {
    // clone ExpressLRS at startup if starting for first time - THIS TAKES A WHILE... BE PATIENT!
    cloneElrsGithubRepo();
  } else {
    // just update local ExpressLRS repository with latest changes from master
    pullElrsGithubRepo();
  }

  // TODO: move this to action events
  // buildElrsFirmwareForTarget("Jumper_RX_R900MINI_via_BetaflightPassthrough")
  // uploadElrsFirmwareForTarget("Jumper_RX_R900MINI_via_BetaflightPassthrough")
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.

// clone ExpressLRS repository locally
ipcMain.handle('clone-elrs-repo', () => cloneElrsGithubRepo());

// update ExpressLRS repository locally
ipcMain.handle('pull-elrs-repo', () => pullElrsGithubRepo());

ipcMain.handle('build-elrs-selected-target', (e, target) => {
  console.log('Selected [%s] target for building ExpressLRS firmware. Starting build process.', target)

  // build ExpressLRS target
  buildElrsFirmwareForTarget(target)

  // send event for successful start of build
  mainWindow.webContents.send('elrs-build-started', target)
})

ipcMain.handle('upload-elrs-selected-target', (e, target) => {
  console.log('Selected [%s] target for uploading ExpressLRS firmware. Starting upload process.', target)

  // upload ExpressLRS target
  uploadElrsFirmwareForTarget(target)

  // send event for successful start of upload
  mainWindow.webContents.send('elrs-upload-started', target)
})

const localElrsDir = "./ExpressLRS/"
function needElrsGithubRepoClone() {
  if (!fs.existsSync(localElrsDir)) {
    return true;
  } else {
    return false;
  }
}

let cloneElrsProcess = null
const cloneElrsGithubRepo = () => {
  //TODO: start event with running spinner loader
  cloneElrsProcess = require('child_process').execFile('./elrs-cli/venv/Scripts/python.exe', ['./elrs-cli/elrs-cli.py', '-c']);
  
  if (cloneElrsProcess != null) {
    console.log('Cloning ExpressLRS locally');

    cloneElrsProcess.stdout.on('data', function(data) {
      console.log(data.toString());
    });

    cloneElrsProcess.on('exit', (code) => {
      //TODO: stop spinner loading when this event occurs. If code is 0 - success, otherwise - bad local repo sync
      console.log('Cloning ExpressLRS locally finished successfully. Exit code: %s', code);

      if (Number(0) === Number(code)) {
        // update local ExpressLRS repository with latest changes from master after cloning master code locally
        pullElrsGithubRepo();
      }
    });
  }
}

let pullElrsProcess = null
const pullElrsGithubRepo = () => {
  pullElrsProcess = require('child_process').execFile('./elrs-cli/venv/Scripts/python.exe', ['./elrs-cli/elrs-cli.py', '-p']);

  if (pullElrsProcess != null) {
    console.log('Updating ExpressLRS locally. Updating \'PlatformIO\' pip module');

    pullElrsProcess.stdout.on('data', function(data) {
      console.log(data.toString());
    });

    pullElrsProcess.on('exit', (code) => {
      console.log('Successfully updated ExpressLRS locally. \'PlatformIO\' pip module updated. Exit code: %s', code);
    });
  }
}

let buildElrsFirmwareProcess = null
const buildElrsFirmwareForTarget = (target) => {
  buildElrsFirmwareProcess = require('child_process').execFile('./elrs-cli/venv/Scripts/pio.exe', ['run', '--project-dir', './ExpressLRS/src', '--environment', target]);

  if (buildElrsFirmwareProcess != null) {
    console.log('Building ExpressLRS firmware for target: %s', target);

    buildElrsFirmwareProcess.stdout.on('data', function(data) {
      console.log(data.toString());
    });

    buildElrsFirmwareProcess.stderr.on('data', function(data) {
      console.log(data.toString());
    });

    buildElrsFirmwareProcess.on('exit', (code) => {
      console.log('Building ExpressLRS firmware for target %s completed. Exit code: %s', target, code);

      // if execute code successful - send event for successful build done
      if (Number(0) === Number(code)) {
        // send event for successfully finished target build
        mainWindow.webContents.send('elrs-build-success', target)
      }
      // TODO: handle error cases
    });
  }
}

let uploadElrsFirmwareProcess = null
const uploadElrsFirmwareForTarget = (target) => {
  uploadElrsFirmwareProcess = require('child_process').execFile('./elrs-cli/venv/Scripts/pio.exe', ['run', '--project-dir', './ExpressLRS/src', '--target', 'upload', '--environment', target]);

  if (uploadElrsFirmwareProcess != null) {
    console.log('Started uploading ExpressLRS firmware for target: %s', target);

    uploadElrsFirmwareProcess.stdout.on('data', function(data) {
      console.log(data.toString());
    });

    uploadElrsFirmwareProcess.stderr.on('data', function(data) {
      console.log(data.toString());
    });

    uploadElrsFirmwareProcess.on('exit', (code) => {
      console.log('Uploading ExpressLRS firmware for target %s has completed. Exit code: %s', target, code);

      // if execute code successful - send event for successful upload done
      if (Number(0) === Number(code)) {
        // send event for successfully finished target upload
        mainWindow.webContents.send('elrs-upload-success', target)
      }
      //TODO: handle error cases
    });
  }
}

const killAllProcesses = () => {
  console.log('Killing all ExpressLRS CLI processes');
  cloneElrsProcess.kill();
  cloneElrsProcess = null;

  pullElrsProcess.kill();
  pullElrsProcess = null;

  buildElrsFirmwareProcess.kill();
  buildElrsFirmwareProcess = null;

  uploadElrsFirmwareProcess.kill();
  uploadElrsFirmwareProcess = null;
}

// Kill all processes before quit application
app.on('will-quit', killAllProcesses);