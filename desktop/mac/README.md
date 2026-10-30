# CTRL-Farm Desktop para macOS 🍏

Este diretório contém a estrutura de empacotamento, metadados e scripts de inicialização do **CTRL-Farm** no ecossistema Apple macOS (suporte universal para arquiteturas **Apple Silicon M1/M2/M3/M4** e **Intel x86_64**).

---

## 📂 Estrutura de Arquivos

```
desktop/mac/
├── Info.plist            # Metadados oficiais do pacote .app da Apple
├── launcher.sh           # Supervisor nativo (controle de processo, detecção de arquitetura e modo janela)
├── build-macos.sh        # Script oficial de compilação e geração de imagem de disco .dmg
├── create-dmg.mjs        # Gerador universal multiplataforma de DMG
├── assets/
│   ├── icon.icns         # Ícone nativo Apple com múltiplas resoluções
│   └── icon.png          # Imagem base de alta fidelidade
└── dist/
    ├── CTRL-Farm.app/    # Bundle nativo da aplicação
    └── CTRL-Farm.dmg     # Imagem de disco comprimida para distribuição
```

---

## 🛠️ Como Gerar o Pacote DMG

### No macOS (Nativo):
```bash
chmod +x desktop/mac/build-macos.sh
./desktop/mac/build-macos.sh
```

### Em Qualquer Sistema Operacional (Windows / Linux / CI):
```bash
node desktop/mac/create-dmg.mjs
```

O arquivo final `CTRL-Farm.dmg` será gerado automaticamente tanto na pasta `desktop/mac/dist/` quanto na raiz do projeto `CTRL-Farm.dmg` pronto para publicação no GitHub Releases.

---

## 🖥️ Como Funciona o Supervisor (`launcher.sh`)

1. **Instância Única:** Checa `/tmp/ctrl-farm-mac.lock` para evitar múltiplas instâncias concorrentes.
2. **Apple Silicon & Intel:** Detecta a arquitetura do processador (`uname -m`) e seleciona os binários correspondentes do Darwin.
3. **Serviços em Background:** Inicializa a API NestJS (porta 3001), o Frontend Next.js (porta 3000) e o MediaMTX Darwin.
4. **Modo Janela Nativa:** Verifica se o Google Chrome, Microsoft Edge ou Brave Browser estão instalados no macOS e abre no modo aplicação dedicada (`--app="http://localhost:3000" --window-size=1440,900`).
5. **Graceful Shutdown:** Captura sinais `SIGINT`, `SIGTERM` e encerra todos os serviços ao fechar o app.
