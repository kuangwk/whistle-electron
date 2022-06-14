const { app, BrowserWindow, Menu, dialog } = require('electron')
const path = require('path')
const fs = require('fs')
const prompt = require('electron-prompt')
const fixPath = require('fix-path')
const ip = require('ip')

const defaultMenu = require('./default-menu')

const iconPath = path.join(__dirname, 'assets/whistle.png')

const DEFAULT_PORT = 8899

const isMac = process.platform === 'darwin'

class Setting {

  constructor(name, defaultValue = '') {
    this.name = name
    this.defaultValue = defaultValue
    this.value = this.getLocalValue()
  }

  getLocalValue() {
    const localPath = this.getUserSettingPath()
    let localValue = this.defaultValue
    try {
      localValue = fs.readFileSync(localPath, 'utf8') || this.defaultValue
    } catch (err) {
      console.error(err)
    }
    return localValue
  }

  getValue() {
    return this.value
  }

  setValue(value, successCallback) {
    const localPath = this.getUserSettingPath()
    try {
      fs.writeFileSync(localPath, value, 'utf8')
      this.value = value
      successCallback()
    } catch (err) {
      console.error(err)
    }
  }

  getUserSettingPath(dataPath) {
    const userPath = app.getPath('userData')
    return path.join(userPath, this.name)
  }
}

const portSetting = new Setting('port', DEFAULT_PORT)
const whistleLocationSetting = new Setting('whistle', 'local')

function getPort() {
  return portSetting.getValue()
}

const whistleIsGlobal = whistleLocationSetting.getValue() === 'global'

const whistleCmd = whistleIsGlobal ? 'w2' : path.resolve(__dirname, './node_modules/whistle/bin/whistle.js')

let win
const createWindow = () => {
  if (win && !win.isDestroyed()) {
    win.close()
  }
  win = new BrowserWindow({
    width: 1280,
    height: 960,
    icon: iconPath,
    title: `Whistle@${ip.address()}:${portSetting.getValue()}`,
  })

  win.on('page-title-updated', e => {
    e.preventDefault()
  })

  if (isMac) {
    app.dock.setIcon(iconPath)
  }

  const port = getPort()
  console.log('whistle port: ', port)
  win.loadURL(`http://127.0.0.1:${port}`)

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
  .then(port => {
      if(port === null) {
          console.log('user cancelled')
      } else {
        console.log('设置端口号', port)
        portSetting.setValue(port, () => {
          startWhistleAndCreateWindow()
        })
      }
  })
  .catch(console.error)
}

function setWhistleLocation() {
  const result = dialog.showMessageBoxSync(win, {
    title: '提示',
    buttons: ['确定', '取消'],
    message: whistleIsGlobal ? `确定使用内置的 whistle 版本?` : '确定使用全局的 whistle？\n 请确认已全局安装 whistle(npm i -g whistle)',
    icon: iconPath
  })
  console.log('result: ', result)
  if (result === 0) {
    whistleLocationSetting.setValue(whistleIsGlobal ? 'local' : 'global', () => {
      app.relaunch()
      app.exit(0)
    })
  }
}

function runCmd(cmd, successCallback) {
  console.log('runCmd: ', cmd)
  const exec = require('child_process').exec
  exec(cmd, (err, stdout, stderr) => {
    if (err) {
      console.error(`run cmd error: ${cmd}`, err)
      throw err
    } else {
      console.log(`run cmd success: ${cmd}`)
      console.log(stdout)
      successCallback()
    }
  })
}

function setMenu() {
  const template = [
  ...defaultMenu,
  {
    label: 'whistle 设置',
    submenu: [{
      label: `设置端口号${getPort()}`,
      click: () => {
        promptSetPort()
      }
    }, {
      label: !whistleIsGlobal ? '使用全局 whistle' : '使用内置 whistle',
      click: () => {
        setWhistleLocation()
      },
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
  console.log('port: ', port)
  // npx 运行本地 whistle
  runCmd(`${whistleCmd} restart -p ${port}`, () => {
    createWindow()
  })
}

function logSettings() {
  console.log('Settings:', {
    port: getPort(),
    whistleIsGlobal: whistleIsGlobal,
  })
}

app.whenReady().then(() => {
  // 修复 node 路径
  logSettings()
  fixPath()
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
  console.log('will-quit')
  runCmd(`${whistleCmd} stop`)
})