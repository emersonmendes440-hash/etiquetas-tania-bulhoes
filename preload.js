'use strict';

/* Única ponte entre a página e o disco. A página não enxerga mais nada do
   sistema — só estas quatro funções. */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('appDados', {
  ler:    chave => ipcRenderer.invoke('dados:ler', chave),
  gravar: (chave, valor) => ipcRenderer.invoke('dados:gravar', chave, valor),
  apagar: chave => ipcRenderer.invoke('dados:apagar', chave),
  pasta:  () => ipcRenderer.invoke('dados:pasta')
});
