const menu = [
    {
        label: 'ExpressLRS',
        submenu: [
            {
                label: 'Clone ExpressLRS repository',
                click(item, mainWindow) { mainWindow.webContents.send('clone-elrs-repo') }
            },
            {
                label: 'Pull ExpressLRS repository',
                click(item, mainWindow) { mainWindow.webContents.send('pull-elrs-repo') }
            },
            {
                label: 'TODO',
                accelerator: process.platform == 'darwin' ? 'Command+C' : 'Ctrl+C',
                click(item, mainWindow) { mainWindow.webContents.send('quit') }
            }
        ]
    },
    {
        label: 'DevTools',
        accelerator: process.platform == 'darwin' ? 'Command+I' : 'Ctrl+I',
        click(item, mainWindow) { mainWindow.toggleDevTools() }
    },
    {
        label: 'Help',
        submenu: [
            {
                label: 'ExpressLRS GitHub page',
                click: async () => {
                    const { shell } = require('electron')
                    await shell.openExternal('https://github.com/AlessandroAU/ExpressLRS')
                }
            },
            {
                label: 'ExpressLRS Discord group',
                click: async () => {
                    const { shell } = require('electron')
                    await shell.openExternal('http://discord.gg/dS6ReFY')
                }
            },
            {
                type: 'separator'
            },
            {
                label: 'About',
                click(item, mainWindow) { mainWindow.webContents.send('open-about') }
            }
        ]
    }
]
if (process.platform == 'darwin') mainMenuTemplate.unshift({})

module.exports = menu