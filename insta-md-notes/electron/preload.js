// Expose APIs if needed
window.electron = {};
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('noteAPI', {
  saveNoteToFile: (noteContent) => ipcRenderer.send('save-note', noteContent),
   onSaveComplete: (callback) => ipcRenderer.on('note-saved', callback),
   getConfig: () => ipcRenderer.invoke('get-config')
});