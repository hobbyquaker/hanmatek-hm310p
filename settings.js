const {ipcRenderer: ipc, remote} = require('electron');

document.querySelector('#close').addEventListener('click', () => {
    ipc.send('settings', {port: document.querySelector('#port').value});
    const window = remote.getCurrentWindow();
    window.close();
});
