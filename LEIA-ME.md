# Etiquetas Tania Bulhões — aplicativo para PC

Mesmo programa de etiquetas que você já usa, agora com ícone na área de trabalho
e os dados gravados em arquivo, fora do navegador.

---

## Login

O programa (tanto `renderer/etiquetas.html` quanto o `index.html` da raiz, que são
o mesmo arquivo) agora pede e-mail e senha antes de abrir — mesma conta usada no
Protocolo de Coleta e na Etiqueta de Transportadora. Precisa de internet na
primeira vez que abre em cada computador; depois disso a sessão fica salva.

Publicado também pelo GitHub Pages para acesso direto pelo navegador, sem
precisar instalar nada.

**Importante:** ao publicar uma atualização (ver seção "Para publicar uma
mudança" abaixo), lembre de subir o arquivo novo nos dois lugares —
`renderer/etiquetas.html` (usado pelo instalador) e `index.html` da raiz (usado
pelo GitHub Pages) — para os dois não ficarem desencontrados.

---

## Como gerar o instalador

Só precisa fazer isso **uma vez**, numa máquina com Windows.

**1. Instale o Node.js**
Baixe a versão LTS em <https://nodejs.org> e instale com as opções padrão.
Para conferir, abra o Prompt de Comando e digite `node -v` — deve aparecer um número de versão.

**2. Abra o Prompt de Comando dentro desta pasta**
No Explorador de Arquivos, entre na pasta do projeto, clique na barra de endereço,
digite `cmd` e tecle Enter.

**3. Baixe as dependências** (demora alguns minutos na primeira vez)

```
npm install
```

**4. Teste antes de empacotar**

```
npm start
```

O programa abre. Feche a janela quando terminar de conferir.

**5. Gere o instalador**

```
npm run dist
```

O arquivo sai em `instalador\Etiquetas Tania Bulhoes Setup 1.0.0.exe`.
É esse arquivo que você distribui para as outras máquinas.

> Se preferir uma versão sem instalação, que roda direto do pen drive:
> `npm run dist:portatil`

---

## Ao instalar nas máquinas

O instalador **não é assinado digitalmente**, então na primeira execução o Windows
mostra a tela azul "O Windows protegeu o computador". Clique em
**Mais informações → Executar assim mesmo**. Isso acontece só uma vez por máquina.

---

## Onde os dados ficam

Base de produtos, lotes, usuários e histórico ficam em arquivos `.json` dentro de:

```
C:\Users\<usuário>\AppData\Roaming\Etiquetas Tania Bulhões\dados
```

O menu **Arquivo → Abrir a pasta de dados** leva direto lá. Para fazer backup,
basta copiar essa pasta. O programa também guarda sozinho uma cópia diária da base
na subpasta `backups`, mantendo as 10 últimas.

### Compartilhar a base entre vários computadores

Crie um arquivo chamado `config.json` na mesma pasta do executável instalado,
com o caminho de uma pasta de rede:

```json
{ "pastaDados": "\\\\servidor\\etiquetas\\dados" }
```

A partir daí, todas as máquinas passam a ler e gravar na mesma base — inclusive o
histórico de movimentação e a lista de usuários. Se a pasta estiver fora do ar, o
programa avisa e continua funcionando com a cópia local, sem travar.

---

## Controlar as máquinas a partir do seu PC

Todo o programa é **um arquivo HTML só**. Isso permite comandar tudo de um lugar,
sem servidor e sem reinstalar nada nas outras máquinas.

### 1. Ligue a central no `config.json`

Crie o `config.json` ao lado do executável instalado, em **todas** as máquinas:

```json
{
  "pastaDados": "\\\\servidor\\etiquetas\\dados",
  "fonteHtml":  "\\\\servidor\\etiquetas\\etiquetas.html",
  "verificarAoAbrir": true
}
```

| Opção | O que faz |
|---|---|
| `pastaDados` | Base, usuários e histórico passam a ser os mesmos para todo mundo |
| `fonteHtml` | De onde cada máquina busca a versão do programa ao abrir |
| `verificarAoAbrir` | Deixe `true`. Coloque `false` para essa máquina não buscar atualização |

O `fonteHtml` também aceita endereço na web (`https://...`), para máquinas que não
enxergam a pasta de rede.

### 2. Para publicar uma mudança

1. No seu PC, faça a alteração e clique em **Exportar arquivo**.
2. Menu **Arquivo → Publicar esta versão para as outras máquinas** e escolha o
   arquivo que você acabou de exportar.

Pronto. Cada máquina recebe na próxima vez que abrir o programa. Quem quiser
antecipar usa **Arquivo → Verificar atualização agora**.

> Também dá para simplesmente copiar o arquivo por cima do `etiquetas.html` na
> pasta de rede — o efeito é o mesmo.

### O que muda na hora e o que muda ao reabrir

| O que você altera | Quando chega nas outras máquinas |
|---|---|
| Produtos, lotes, usuários, histórico | **Na hora** — todos leem os mesmos arquivos |
| Layout, campos, regras, correções | Ao reabrirem o programa (ou ao verificarem atualização) |

### Se a rede cair

O programa abre normalmente com a última versão que recebeu e com a cópia local
dos dados. Nada trava e ninguém fica parado. Quando a rede volta, tudo volta a
conversar sozinho.

### Sobre o instalador

Você só precisa gerar e distribuir o instalador de novo quando mudar algo do
próprio aplicativo — janela, menu, impressão direta. Alterações da etiqueta e das
regras vão todas pelo `fonteHtml`, sem reinstalação.


---

## Atualizar quando o instalador precisa mudar

Quando quiser publicar uma versão nova:

1. Substitua o arquivo `renderer\etiquetas.html` pela versão atualizada.
2. Aumente o número em `"version"` dentro do `package.json`.
3. Rode `npm run dist` de novo e distribua o instalador novo.

Na prática isso quase nunca é necessário: o dia a dia é resolvido pelo
`fonteHtml` descrito acima.

Os dados dos usuários **não são apagados** na atualização — ficam na pasta de dados,
que é separada do programa.

---

## O que está dentro da pasta

| Arquivo | Para que serve |
|---|---|
| `main.js` | Abre a janela, monta o menu e cuida da leitura e gravação em disco |
| `preload.js` | A única ponte entre a tela e o disco |
| `armazenamento.js` | Grava cada chave num `.json`, com gravação segura e backup |
| `renderer/etiquetas.html` | O programa em si — o mesmo arquivo que você já usa |
| `build/icon.ico` | Ícone do aplicativo |
| `package.json` | Nome, versão e receita do instalador |

---

## Observações

- **Impressão:** continua como está hoje, pela janela do Windows. Quando quiser a
  impressão direta, sem janela, é só avisar — no Electron isso é possível e o
  programa já está preparado para receber essa mudança.
- **Navegador:** o `etiquetas.html` continua funcionando sozinho num navegador
  comum, como sempre. Só que aí os dados voltam a ficar guardados no navegador,
  e não na pasta de dados.
