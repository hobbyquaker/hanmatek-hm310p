const path = require('path');
const url = require('url');
const fs = require('fs');

const {app, Menu, ipcMain, BrowserWindow} = require('electron');

const storage = require('electron-json-storage');
const windowStateKeeper = require('electron-window-state');
const isDev = require('electron-is-dev');

let mainWindow;
let settingsWindow;

const chartData = {};

const Hm310 = require('./lib/hm310');

let hm310;
let port;

let lastError;

const menuTemplate = [
    {
        label: 'Edit',
        submenu: [
            {label: 'Undo', accelerator: 'CmdOrCtrl+Z', selector: 'undo:'},
            {label: 'Redo', accelerator: 'Shift+CmdOrCtrl+Z', selector: 'redo:'},
            {type: 'separator'},
            {label: 'Cut', accelerator: 'CmdOrCtrl+X', selector: 'cut:'},
            {label: 'Copy', accelerator: 'CmdOrCtrl+C', selector: 'copy:'},
            {label: 'Paste', accelerator: 'CmdOrCtrl+V', selector: 'paste:'},
            {label: 'Select All', accelerator: 'CmdOrCtrl+A', selector: 'selectAll:'}
        ]
    },
    {

        label: 'Tools',
        submenu: [
            {
                role: 'export',
                label: 'Export CSV',
                enabled: true,
                click() {
                    exportCsv();
                }
            },
            {
                role: 'settings',
                label: 'Settings',
                enabled: true,
                click() {
                    settings();
                }
            }
        ]
    }
];

if (process.platform === 'darwin') {
    menuTemplate.unshift({
        label: 'HM310P',
        submenu: [
            {
                role: 'about',
                label: 'About HM310P'
            },
            {
                type: 'separator'
            },
            {
                role: 'services',
                submenu: []
            },
            {
                type: 'separator'
            },
            {
                role: 'hide',
                label: 'Hide HM310P'
            },
            {
                role: 'hideothers'
            },
            {
                role: 'unhide'
            },
            {
                type: 'separator'
            },
            {
                role: 'quit',
                label: 'Quit HM310P'
            }
        ]
    });
}

function connect() {
    console.log('connect!');

    if (hm310) {
        try {
            hm310.close();
        } catch {}

        hm310.removeAllListeners();
    }

    storage.get('port', (error, data) => {
        if (error || !data) {
            const error = 'Serial Port not defined';
            console.log(error);
            mainWindow.webContents.send('error', error);
            lastError = error;
        } else {
            port = data;

            hm310 = new Hm310({
                port
            });

            hm310.on('connected', val => {
                console.log('connected', val);
                if (mainWindow) {
                    mainWindow.webContents.send('connected', val);
                }
            });

            hm310.on('value', (key, val, timestamp) => {
                //console.log(key, val)

                if (['voltage', 'current', 'power', 'setVoltage', 'setCurrent'].includes(key)) {
                    if (!chartData[timestamp]) {
                        chartData[timestamp] = {};
                    }

                    chartData[timestamp][key] = val;
                }

                if (mainWindow) {
                    mainWindow.webContents.send('values', {key, val});
                }
            });

            hm310.on('error', error => {
                console.error(error);
                lastError = error.message;
                mainWindow.webContents.send('error', error.message);
                if (error.errno === 'ECONNREFUSED') {
                    mainWindow.webContents.send('connected', false);
                    hm310.connected = false;
                }
            });
        }
    });
}

app.on('ready', () => {
    createWindow();
    connect();
});

ipcMain.on('settings', (event, data) => {
    storage.set('port', data.port, error => {
        if (error) {
            mainWindow.webContents.send('error', error.message);
        }

        connect();
    });
});

ipcMain.on('refresh', () => {
    //console.log('refresh');
    mainWindow.webContents.send('connected', this.connected);
    if (!this.connected && lastError) {
        mainWindow.webContents.send('error', lastError);
    }

    if (hm310 && hm310.values) {
        Object.keys(hm310.values).forEach(key => {
            mainWindow.webContents.send('values', {key, val: hm310.values[key]});
        });
    }
});

ipcMain.on('write', (event, data) => {
    hm310.write(data.key, data.val);
});

ipcMain.on('export', (event, file) => {
    fs.writeFile(
        file,
        'timestamp;voltage;current;power;setVoltage;setCurrent\n' +
            Object.keys(chartData).map(timestamp => [
                timestamp,
                typeof chartData[timestamp].voltage === 'undefined' ? '' : chartData[timestamp].voltage,
                typeof chartData[timestamp].current === 'undefined' ? '' : chartData[timestamp].current,
                typeof chartData[timestamp].power === 'undefined' ? '' : chartData[timestamp].power,
                typeof chartData[timestamp].setVoltage === 'undefined' ? '' : chartData[timestamp].setVoltage,
                typeof chartData[timestamp].setCurrent === 'undefined' ? '' : chartData[timestamp].setCurrent
            ].join(';')).join('\n'),
        () => {
            console.log('wrote', file);
        }
    );
});

function createWindow() {
    const mainWindowState = windowStateKeeper({
        defaultWidth: 1366,
        defaultHeight: 768
    });

    const devWindowState = {
        width: 1600,
        height: 800
    };

    const windowState = isDev ? devWindowState : mainWindowState;

    mainWindow = new BrowserWindow(Object.assign(windowState, {
        webPreferences: {
            nodeIntegration: true
        }
    }));

    mainWindow.loadURL(url.format({
        pathname: path.join(__dirname, 'index.html'),
        protocol: 'file:',
        slashes: true
    }));

    const menu = Menu.buildFromTemplate(menuTemplate);
    Menu.setApplicationMenu(menu);

    if (isDev) {
        mainWindow.webContents.openDevTools();
    }
}

function settings() {
    settingsWindow = new BrowserWindow({
        width: 800,
        height: 400,
        show: false,
        modal: true,
        parent: mainWindow,
        webPreferences: {
            nodeIntegration: true
        }
    });
    settingsWindow.loadURL(url.format({
        pathname: path.join(__dirname, 'settings.html'),
        protocol: 'file:',
        slashes: true
    }));

    settingsWindow.show();
    if (isDev) {
        settingsWindow.webContents.openDevTools();
    }

    settingsWindow.on('closed', () => {
        settingsWindow = null;
    });
}

function exportCsv() {
    mainWindow.webContents.send('csv', {});
}
