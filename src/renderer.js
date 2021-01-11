const { ipcRenderer } = require('electron')

// const form = document.querySelector('form')
// const item = document.querySelector('input')
// const list = document.querySelector('ul')

// // Render Items to Screen
// const render = item => {
//     const li = document.createElement('li')
//     li.innerHTML = item
//     list.appendChild(li)
// }

// //Get All Items After Starting 
// window.addEventListener('load', () => ipcRenderer.send('loadAll'))
// ipcRenderer.on('loaded', (e, items) => items.forEach(item => render(item.item)))

// //Send Item to the server
// form.addEventListener('submit', e => {
//     e.preventDefault()
//     ipcRenderer.send('addItem', { item: item.value })
//     form.reset()
// })

// //Catches Add Item from server
// ipcRenderer.on('added', (e, item) => render(item.item))

// Catches menu event and re-send the event to server
ipcRenderer.on('clone-elrs-repo', () => ipcRenderer.invoke('clone-elrs-repo'))

ipcRenderer.on('pull-elrs-repo', () => ipcRenderer.invoke('pull-elrs-repo'))

ipcRenderer.on('open-about', () => {
    // TODO: open about info dialog
})
