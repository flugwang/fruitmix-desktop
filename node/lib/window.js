import path from 'path'
import { BrowserWindow } from 'electron'

let _mainWindow = null

const getMainWindow = () => _mainWindow

const initMainWindow = () => {

  // create window
	_mainWindow = new BrowserWindow({
		frame: true,
		height: 768,
		resizable: true,
		width: 1366,
		minWidth:200,
		minHeight:200,
		title:'WISNUC',
		icon: path.join(__dirname,'180-180.png') // FIXME
	})

	//window title
	_mainWindow.on('page-title-updated',function(event){
		event.preventDefault()
	})

  // debug mode
	_mainWindow.webContents.openDevTools()
	_mainWindow.loadURL('file://' + process.cwd() + '/build/index.html')

  console.log('[window] mainWindow initialized')
}

export { initMainWindow, getMainWindow }