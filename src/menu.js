const { shell } = require('electron')

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
            }
        ]
    },
    {
        label: 'Tools',
        submenu: [
            {
                label: 'Toggle Console',
                accelerator: process.platform === 'darwin' ? 'Alt+Command+C' : 'Alt+Ctrl+C',
                click(item, mainWindow) { mainWindow.webContents.send('toggle-elrs-console') }
            },
            {
                label: 'Toggle DevTools',
                //accelerator: process.platform == 'darwin' ? 'Command+I' : 'Ctrl+I', TODO!!!
                click(item, mainWindow) { mainWindow.toggleDevTools() }
            }
        ]

        
    },
    {
        label: 'Help',
        submenu: [
            {
                label: 'ExpressLRS GitHub page',
                click: async () => {
                    await shell.openExternal('https://github.com/AlessandroAU/ExpressLRS')
                }
            },
            {
                label: 'ExpressLRS Discord group',
                click: async () => {
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