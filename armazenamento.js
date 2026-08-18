'use strict';

/* Guarda cada chave num arquivo .json dentro da pasta de dados.
   A gravação é feita em arquivo temporário e depois renomeada, para que
   uma queda de energia no meio do processo não corrompa a base. */

const fs = require('fs');
const path = require('path');

function nomeSeguro(chave) {
  return String(chave).replace(/[^a-zA-Z0-9._-]/g, '_') + '.json';
}

class Armazenamento {
  constructor(pasta) {
    this.pasta = pasta;
    fs.mkdirSync(pasta, { recursive: true });
  }

  caminho(chave) {
    return path.join(this.pasta, nomeSeguro(chave));
  }

  ler(chave) {
    const arq = this.caminho(chave);
    try {
      if (!fs.existsSync(arq)) return null;
      const txt = fs.readFileSync(arq, 'utf8');
      if (!txt.trim()) return null;
      return JSON.parse(txt);
    } catch (e) {
      /* arquivo corrompido: guarda uma cópia e devolve vazio em vez de quebrar */
      try {
        fs.renameSync(arq, arq + '.defeito-' + Date.now());
      } catch (e2) {}
      return null;
    }
  }

  gravar(chave, valor) {
    const arq = this.caminho(chave);
    const tmp = arq + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(valor), 'utf8');
    fs.renameSync(tmp, arq);
    return true;
  }

  apagar(chave) {
    const arq = this.caminho(chave);
    try {
      if (fs.existsSync(arq)) fs.unlinkSync(arq);
    } catch (e) {}
    return true;
  }

  /* uma cópia diária da base, mantendo as 10 últimas */
  backup(chave) {
    const arq = this.caminho(chave);
    if (!fs.existsSync(arq)) return;
    const dir = path.join(this.pasta, 'backups');
    fs.mkdirSync(dir, { recursive: true });
    const hoje = new Date().toISOString().slice(0, 10);
    const destino = path.join(dir, nomeSeguro(chave).replace('.json', '') + '-' + hoje + '.json');
    if (!fs.existsSync(destino)) fs.copyFileSync(arq, destino);

    const meus = fs.readdirSync(dir)
      .filter(f => f.startsWith(nomeSeguro(chave).replace('.json', '')))
      .sort();
    while (meus.length > 10) {
      try { fs.unlinkSync(path.join(dir, meus.shift())); } catch (e) {}
    }
  }
}

module.exports = { Armazenamento, nomeSeguro };
