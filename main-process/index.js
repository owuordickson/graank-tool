const {ipcMain, dialog} = require('electron')

ipcMain.on('open-file-dialog', (event) => {
  dialog.showOpenDialog({
    properties: ['openFile', 'multiSelections']
  }, (files) => {
    if (files) {
      event.sender.send('selected-directory', files)
    }
  })
})
