'use strict';

const { app, BrowserWindow, ipcMain, Menu, dialog, shell, net } = require('electron');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const { Armazenamento } = require('./armazenamento');

app.setName('Etiquetas Tania Bulhões');

let janela = null;
let caixa = null;
let config = {};

/* ---------- onde os dados ficam ----------
   Por padrão numa pasta do próprio programa. Para compartilhar entre
   computadores, crie um config.json ao lado do executável assim:
       { "pastaDados": "\\\\servidor\\etiquetas\\dados" }                */
function lerConfig() {
  const candidatos = [
    path.join(path.dirname(app.getPath('exe')), 'config.json'),
    path.join(app.getPath('userData'), 'config.json')
  ];
  for (const c of candidatos) {
    try {
      if (fs.existsSync(c)) return JSON.parse(fs.readFileSync(c, 'utf8')) || {};
    } catch (e) {
      dialog.showErrorBox('config.json com erro',
        'Não consegui ler ' + c + '.\n\n' + e.message + '\n\nO programa segue com as opções padrão.');
    }
  }
  return {};
}

/* ---------- onde os dados ficam ----------
   Padrão: pasta do próprio programa nesta máquina.
   Para compartilhar, aponte pastaDados no config.json para uma pasta de rede. */
function pastaDeDados(cfg) {
  const padrao = path.join(app.getPath('userData'), 'dados');
  if (!cfg.pastaDados) return padrao;
  try {
    fs.mkdirSync(cfg.pastaDados, { recursive: true });
    fs.accessSync(cfg.pastaDados, fs.constants.W_OK);
    return cfg.pastaDados;
  } catch (e) {
    dialog.showErrorBox('Pasta de dados indisponível',
      'Não consegui usar a pasta indicada no config.json:\n' + cfg.pastaDados +
      '\n\nO programa vai continuar com a pasta local desta máquina.\n\n' + e.message);
    return padrao;
  }
}

/* ---------- atualização do programa ----------
   O programa inteiro é um HTML só. Se o config.json apontar fonteHtml para uma
   pasta de rede ou um endereço na web, cada máquina busca esse arquivo ao abrir.
   Você troca um arquivo no seu PC e todo mundo recebe na próxima vez que abrir. */
function pastaCache() {
  const p = path.join(app.getPath('userData'), 'programa');
  fs.mkdirSync(p, { recursive: true });
  return p;
}
const htmlCache = () => path.join(pastaCache(), 'etiquetas.html');
const metaCache = () => path.join(pastaCache(), 'versao.json');

async function buscarHtml(fonte) {
  if (/^https?:\/\//i.test(fonte)) {
    const r = await net.fetch(fonte, { cache: 'no-store' });
    if (!r.ok) throw new Error('O endereço respondeu ' + r.status);
    return Buffer.from(await r.arrayBuffer());
  }
  return fs.promises.readFile(fonte);
}

async function verificarAtualizacao(cfg, avisar) {
  if (!cfg.fonteHtml) {
    if (avisar) dialog.showMessageBox(janela, {
      type: 'info', title: 'Atualização',
      message: 'Esta máquina não está configurada para receber atualizações.',
      detail: 'Para ligar, coloque "fonteHtml" no config.json apontando para a pasta ' +
              'de rede ou o endereço onde você publica o arquivo etiquetas.html.',
      buttons: ['Fechar']
    });
    return false;
  }
  try {
    const buf = await buscarHtml(cfg.fonteHtml);
    if (!buf || buf.length < 1000) throw new Error('O arquivo veio vazio ou incompleto.');
    const marca = crypto.createHash('sha1').update(buf).digest('hex');
    let atual = null;
    try { atual = JSON.parse(fs.readFileSync(metaCache(), 'utf8')); } catch (e) {}

    if (atual && atual.marca === marca && fs.existsSync(htmlCache())) {
      if (avisar) dialog.showMessageBox(janela, {
        type: 'info', title: 'Atualização',
        message: 'Você já está com a versão mais recente.',
        detail: 'Recebida em ' + new Date(atual.quando).toLocaleString('pt-BR'),
        buttons: ['Fechar']
      });
      return false;
    }

    const tmp = htmlCache() + '.tmp';
    fs.writeFileSync(tmp, buf);
    fs.renameSync(tmp, htmlCache());
    fs.writeFileSync(metaCache(), JSON.stringify({
      marca: marca, quando: new Date().toISOString(), origem: cfg.fonteHtml
    }), 'utf8');
    return true;
  } catch (e) {
    if (avisar) dialog.showErrorBox('Não consegui atualizar',
      'Não deu para buscar o arquivo em:\n' + cfg.fonteHtml + '\n\n' + e.message +
      '\n\nO programa continua com a versão que já está nesta máquina.');
    return false;
  }
}

function arquivoParaAbrir() {
  return fs.existsSync(htmlCache())
    ? htmlCache()
    : path.join(__dirname, 'renderer', 'etiquetas.html');
}

function criarJanela() {
  janela = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1024,
    minHeight: 680,
    show: false,
    backgroundColor: '#0D110F',
    title: 'Etiquetas Tania Bulhões',
    icon: path.join(__dirname, 'build', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false
    }
  });

  janela.loadFile(arquivoParaAbrir());
  janela.once('ready-to-show', () => {
    janela.maximize();
    janela.show();
  });

  /* “Exportar arquivo” e outros downloads abrem a janela de salvar */
  janela.webContents.session.on('will-download', (evento, item) => {
    item.setSaveDialogOptions({
      title: 'Salvar arquivo',
      defaultPath: path.join(app.getPath('documents'), item.getFilename()),
      filters: item.getFilename().endsWith('.csv')
        ? [{ name: 'Planilha CSV', extensions: ['csv'] }]
        : [{ name: 'Página HTML', extensions: ['html'] }]
    });
  });

  janela.on('closed', () => { janela = null; });
}

function descricaoVersao() {
  try {
    const v = JSON.parse(fs.readFileSync(metaCache(), 'utf8'));
    return '\nConteúdo recebido em ' + new Date(v.quando).toLocaleString('pt-BR');
  } catch (e) {
    return '\nConteúdo: o que veio no instalador';
  }
}

/* copia o HTML que está rodando para a pasta compartilhada — é assim que você
   publica uma versão nova para as outras máquinas */
async function publicar() {
  if (!config.fonteHtml) {
    dialog.showMessageBox(janela, {
      type: 'info', title: 'Publicar',
      message: 'Nenhum destino configurado.',
      detail: 'Coloque "fonteHtml" no config.json apontando para o arquivo etiquetas.html ' +
              'na pasta de rede. É de lá que as outras máquinas vão buscar.',
      buttons: ['Fechar']
    });
    return;
  }
  if (/^https?:\/\//i.test(config.fonteHtml)) {
    dialog.showMessageBox(janela, {
      type: 'info', title: 'Publicar',
      message: 'A publicação é por endereço na web.',
      detail: 'Envie o arquivo para o servidor pelo caminho de sempre. ' +
              'Este botão só funciona quando o destino é uma pasta.',
      buttons: ['Fechar']
    });
    return;
  }
  const escolha = await dialog.showOpenDialog(janela, {
    title: 'Escolha o arquivo HTML que será publicado',
    defaultPath: app.getPath('documents'),
    filters: [{ name: 'Página HTML', extensions: ['html'] }],
    properties: ['openFile']
  });
  if (escolha.canceled || !escolha.filePaths.length) return;
  try {
    const buf = fs.readFileSync(escolha.filePaths[0]);
    if (buf.length < 1000) throw new Error('O arquivo escolhido parece incompleto.');
    fs.mkdirSync(path.dirname(config.fonteHtml), { recursive: true });
    const tmp = config.fonteHtml + '.tmp';
    fs.writeFileSync(tmp, buf);
    fs.renameSync(tmp, config.fonteHtml);
    dialog.showMessageBox(janela, {
      type: 'info', title: 'Publicado',
      message: 'Versão publicada.',
      detail: 'As outras máquinas recebem na próxima vez que abrirem o programa.',
      buttons: ['Fechar']
    });
  } catch (e) {
    dialog.showErrorBox('Não consegui publicar', e.message);
  }
}

function montarMenu() {
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    {
      label: 'Arquivo',
      submenu: [
        {
          label: 'Verificar atualização agora',
          click: async () => {
            const mudou = await verificarAtualizacao(config, true);
            if (mudou) {
              await dialog.showMessageBox(janela, {
                type: 'info', title: 'Atualização',
                message: 'Versão nova recebida.',
                detail: 'O programa vai recarregar agora.',
                buttons: ['Recarregar']
              });
              janela.loadFile(arquivoParaAbrir());
            }
          }
        },
        {
          label: 'Publicar esta versão para as outras máquinas',
          click: () => publicar()
        },
        { type: 'separator' },
        {
          label: 'Abrir a pasta de dados',
          click: () => shell.openPath(caixa.pasta)
        },
        {
          label: 'Onde os dados estão gravados',
          click: () => dialog.showMessageBox(janela, {
            type: 'info',
            title: 'Pasta de dados',
            message: 'Os dados deste programa estão em:',
            detail: caixa.pasta +
              '\n\nPara compartilhar a base entre vários computadores, crie um arquivo ' +
              'config.json ao lado do executável com:\n\n{ "pastaDados": "\\\\\\\\servidor\\\\etiquetas\\\\dados" }',
            buttons: ['Fechar']
          })
        },
        { type: 'separator' },
        { role: 'quit', label: 'Sair' }
      ]
    },
    {
      label: 'Exibir',
      submenu: [
        { role: 'reload', label: 'Recarregar' },
        { role: 'resetZoom', label: 'Zoom normal' },
        { role: 'zoomIn', label: 'Aumentar zoom' },
        { role: 'zoomOut', label: 'Diminuir zoom' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Tela cheia' },
        { role: 'toggleDevTools', label: 'Ferramentas do desenvolvedor' }
      ]
    },
    {
      label: 'Ajuda',
      submenu: [
        {
          label: 'Sobre',
          click: () => dialog.showMessageBox(janela, {
            type: 'info',
            title: 'Sobre',
            message: 'Etiquetas Tania Bulhões',
            detail: 'Versão ' + app.getVersion() + descricaoVersao() +
              '\n\nDados em: ' + caixa.pasta +
              (config.fonteHtml ? '\nAtualizações de: ' + config.fonteHtml : '\nAtualizações: não configuradas'),
            buttons: ['Fechar']
          })
        }
      ]
    }
  ]));
}

/* uma instância só, para dois usuários não gravarem por cima um do outro */
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (janela) {
      if (janela.isMinimized()) janela.restore();
      janela.focus();
    }
  });

  app.whenReady().then(async () => {
    config = lerConfig();
    caixa = new Armazenamento(pastaDeDados(config));
    try { caixa.backup('tania_bulhoes_etiquetas_v2'); } catch (e) {}

    ipcMain.handle('dados:ler', (e, chave) => caixa.ler(chave));
    ipcMain.handle('dados:gravar', (e, chave, valor) => caixa.gravar(chave, valor));
    ipcMain.handle('dados:apagar', (e, chave) => caixa.apagar(chave));
    ipcMain.handle('dados:pasta', () => caixa.pasta);

    if (config.fonteHtml && config.verificarAoAbrir !== false) {
      await verificarAtualizacao(config, false);
    }

    montarMenu();
    criarJanela();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) criarJanela();
    });
  });

  app.on('window-all-closed', () => app.quit());
}
