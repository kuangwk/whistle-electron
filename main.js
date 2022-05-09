const { app, BrowserWindow, Menu } = require('electron')
const path = require('path')
const fs = require('fs')
const prompt = require('electron-prompt')
const fixPath = require('fix-path');

const iconPath = path.join(__dirname, 'assets/whistle.png')

const DEFAULT_PORT = 8899

const isMac = process.platform === 'darwin'

let win
const createWindow = () => {
  if (win && !win.isDestroyed()) {
    win.close()
  }
  win = new BrowserWindow({
    width: 1280,
    height: 960,
    icon: iconPath
  })

  if (isMac) {
    app.dock.setIcon(iconPath);
  }

  const port = getPort()
  console.log('whistle port: ', port);
  win.loadURL(`http://127.0.0.1:${port}`)

}

function getPortPath() {
  const userPath = app.getPath('userData')
  return path.join(userPath, 'port');
}

let cachePort;
function getPort() {
  // return DEFAULT_PORT
  if (cachePort) {
    return cachePort
  }
  const portPath = getPortPath()
  try {
    cachePort = fs.readFileSync(portPath, 'utf8')
  } catch (e) {
    console.log('no user data file')
  }
  return cachePort || DEFAULT_PORT
}

function setPort(port) {
  console.log('setPort: ', port);
  const portPath = getPortPath()
  fs.writeFileSync(portPath, port, 'utf8')
  cachePort = port
}

function promptSetPort() {
  prompt({
    title: '设置端口号',
    label: 'whistle 端口号:',
    value: getPort(),
    inputAttrs: {
      type: 'text'
    },
    type: 'input'
  })
  .then((r) => {
      if(r === null) {
          console.log('user cancelled');
      } else {
        console.log('设置端口号', r);
        setPort(r)
        startWhistleAndCreateWindow()
      }
  })
  .catch(console.error);
}

function runCmd(cmd, successCallback) {
  console.log('runCmd: ', cmd);
  const exec = require('child_process').exec
  exec(cmd, (err, stdout, stderr) => {
    if (err) {
      console.error(`run cmd error: ${cmd}`, err)
      throw process.env.PATH;
    } else {
      console.log(`run cmd success: ${cmd}`)
      console.log(stdout)
      successCallback()
    }
  })
}

function setMenu() {
  const template = [
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    }] : []),
  {
    label: 'whistle 设置',
    submenu: [{
      label: '设置端口号',
      click: () => {
        promptSetPort()
      }
    }, {
      label: '在浏览器中打开',
      click: async () => {
        const { shell } = require('electron')
        const port = getPort()
        await shell.openExternal(`http://127.0.0.1:${port}`)
      }
    },
   ]
  }, {
    label: 'View',
    submenu: [
      { role: 'reload' },
      { role: 'forceReload' },
      { role: 'toggleDevTools' },
      { type: 'separator' },
      { role: 'resetZoom' },
      { role: 'zoomIn' },
      { role: 'zoomOut' },
      { type: 'separator' },
      { role: 'togglefullscreen' }
    ]
  }]
  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

function startWhistleAndCreateWindow() {
  const port = getPort()
  console.log('port: ', port);
  runCmd(`w2 restart -p ${port}`, () => {
    createWindow()
  })
}

app.whenReady().then(() => {
  // 修复 node 路径
  fixPath();
  setMenu()
  startWhistleAndCreateWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('will-quit', () => {
  runCmd('w2 stop')
  console.log('will-quit')
})