import * as path from 'path'
import { app, BrowserWindow, nativeTheme, ipcMain } from 'electron'
import { is } from 'electron-util'
import { getSelectedAccount } from '../accounts'
import config, { ConfigKey } from '../config'
import { toggleAppVisiblityTrayItem } from '../tray'
import { setAppMenuBarVisibility } from '../utils'
import {
  getAccountView,
  getSelectedAccountView,
  updateAllAccountViewBounds
} from '../account-views'
import { getIsQuitting } from '..'
import { openExternalUrl, shouldStartMinimized } from '../helpers'
import { getAppMenu } from '../app-menu'
import debounce from 'lodash.debounce'
import indexHTML from './index.html'
import { darkModeBackgroundColor } from '../constants'

let mainWindow: BrowserWindow | undefined

export function getMainWindow() {
  if (!mainWindow) {
    throw new Error('Main window is uninitialized or has been destroyed')
  }

  return mainWindow
}

export function sendToMainWindow(channel: string, ...args: any[]) {
  if (mainWindow) {
    mainWindow.webContents.send(channel, ...args)
  }
}

export function createMainWindow(): void {
  const lastWindowState = config.get(ConfigKey.LastWindowState)

  mainWindow = new BrowserWindow({
    title: app.name,
    titleBarStyle:
      config.get(ConfigKey.TitleBarStyle) === 'app' ? 'hiddenInset' : 'default',
    frame: config.get(ConfigKey.TitleBarStyle) === 'system',
    minWidth: 780,
    width: lastWindowState.bounds.width,
    minHeight: 200,
    height: lastWindowState.bounds.height,
    x: lastWindowState.bounds.x,
    y: lastWindowState.bounds.y,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload', 'main-window.js')
    },
    show: !shouldStartMinimized(),
    icon: is.linux
      ? path.join(__dirname, '..', 'static', 'icon.png')
      : undefined,
    darkTheme: nativeTheme.shouldUseDarkColors,
    backgroundColor: nativeTheme.shouldUseDarkColors
      ? darkModeBackgroundColor
      : undefined
  })

  if (lastWindowState.fullscreen && !mainWindow.isFullScreen()) {
    mainWindow.setFullScreen(lastWindowState.fullscreen)
  }

  if (lastWindowState.maximized && !mainWindow.isMaximized()) {
    mainWindow.maximize()
  }

  if (is.linux || is.windows) {
    setAppMenuBarVisibility()
  }

  mainWindow.loadFile(path.resolve(__dirname, indexHTML))

  mainWindow.on('app-command', (_event, command) => {
    const selectedAccount = getSelectedAccount()

    if (!selectedAccount) {
      return
    }

    const accountView = getAccountView(selectedAccount.id)

    if (command === 'browser-backward' && accountView.webContents.canGoBack()) {
      accountView.webContents.goBack()
    } else if (
      command === 'browser-forward' &&
      accountView.webContents.canGoForward()
    ) {
      accountView.webContents.goForward()
    }
  })

  mainWindow.on('close', (error) => {
    if (!getIsQuitting() && mainWindow) {
      error.preventDefault()
      mainWindow.blur()
      mainWindow.hide()
    }
  })

  mainWindow.on('hide', () => {
    toggleAppVisiblityTrayItem(false)
  })

  mainWindow.on('show', () => {
    toggleAppVisiblityTrayItem(true)
  })

  mainWindow.on('focus', () => {
    const selectedAccountView = getSelectedAccountView()
    if (selectedAccountView) {
      selectedAccountView.webContents.focus()
    }
  })

  let debouncedUpdateAllAccountViewBounds: () => void

  if (is.linux) {
    debouncedUpdateAllAccountViewBounds = debounce(
      updateAllAccountViewBounds,
      200
    )
  }

  mainWindow.on('resize', () => {
    // When the window is getting maximized on Linux, the bounds of the
    // main window are not updated until the maximizing animation is completed.
    // A workaround is to wait 200 ms before updating the account views bounds.
    // Not all Linux distros may have this animation, but it's a universal workaround
    // and there's no way to know if there's an animation or not. Unfortunately the
    // `resized` event is only available on macOS and Windows.
    if (is.linux) {
      debouncedUpdateAllAccountViewBounds()
    } else {
      updateAllAccountViewBounds()
    }
  })

  mainWindow.webContents.on('dom-ready', () => {
    if (!shouldStartMinimized() && mainWindow) {
      mainWindow.show()
    }
  })

  mainWindow.webContents.on('will-navigate', (event, url) => {
    event.preventDefault()
    openExternalUrl(url)
  })

  if (!is.macos) {
    // The events `maximize` and `unmaximize` are not sent on Linux for some reason.
    // Probably for a similar reason as above when handling the `resize` event
    // where a maximize/unmaximize animation is happening.
    if (is.linux) {
      const debouncedIsMaximized = debounce(() => {
        if (mainWindow) {
          sendToMainWindow(
            mainWindow.isMaximized() ? 'window:maximized' : 'window:unmaximized'
          )
        }
      }, 200)

      mainWindow.on('resize', debouncedIsMaximized)
    } else {
      mainWindow.on('maximize', () => {
        sendToMainWindow('window:maximized')
      })

      mainWindow.on('unmaximize', () => {
        sendToMainWindow('window:unmaximized')
      })
    }

    ipcMain.handle('window:is-maximized', () => {
      // Similar reason as above.
      if (is.linux) {
        setTimeout(() => {
          if (mainWindow) {
            sendToMainWindow(
              mainWindow.isMaximized()
                ? 'window:maximized'
                : 'window:unmaximized'
            )
          }
        }, 200)
      } else if (mainWindow) {
        return mainWindow.isMaximized()
      }

      return false
    })

    ipcMain.on('window:minimize', () => {
      if (mainWindow) {
        mainWindow.minimize()
      }
    })

    ipcMain.on('window:maximize', () => {
      if (mainWindow) {
        mainWindow.maximize()
      }
    })

    ipcMain.on('window:unmaximize', () => {
      if (mainWindow) {
        mainWindow.unmaximize()
      }
    })

    ipcMain.on('window:close', () => {
      if (mainWindow) {
        mainWindow.close()
      }
    })

    ipcMain.handle(
      'title-bar:is-enabled',
      () => config.get(ConfigKey.TitleBarStyle) === 'app'
    )

    ipcMain.on('title-bar:open-app-menu', () => {
      const appMenu = getAppMenu()
      appMenu.popup({
        window: mainWindow
      })
    })
  }
}