# CTRL-Farm Desktop - Aplicativos Nativos & Instaladores Comerciais

Este diretório contém o código-fonte, recursos e ferramentas de compilação dos executáveis desktop nativos e instaladores para **Windows** e **macOS** do ecossistema **CTRL-Farm** e do **Sistema ADM Gerente**.

---

## 📦 Binários Oficiais do Projeto

| Arquivo | Plataforma | Descrição | Portas / Serviços |
| :--- | :--- | :--- | :--- |
| `CTRL-Farm.exe` | Windows | **Executável Principal do CTRL-Farm**. Supervisão silenciosa de NestJS (`apps/api`), Next.js (`apps/web`) e streaming RTSP/WebRTC (`MediaMTX`), bandeja de sistema com menu de contexto, Splash Screen e janela Chromium nativa em App Mode. | Portas 3000, 3001, 8890 |
| `Uninstall.exe` | Windows | **Desinstalador Gráfico Nativo**. Remoção completa e limpa de atalhos, processos e registros no Windows sem abrir prompts de comando. | GUI WinForms |
| `CTRL-Farm-Setup.exe` | Windows | **Instalador Autocontido Oficial**. Assistente gráfico no padrão Dark Industrial, diagnóstico de ambiente, cópia de binários, atalhos na Área de Trabalho e Menu Iniciar, e registro no Painel de Controle. | Autocontido |
| `CTRL-Farm.dmg` | macOS | **Imagem de Disco Apple (Universal)**. Pacote `.app` com atalho de arrastar para `/Applications`, supervisor nativo silencioso sem terminal e suporte a Apple Silicon (M1/M2/M3/M4) e Intel. | Portas 3000, 3001, 8890 |
| `Sistema-ADM-Gerente.exe` | Windows (DEV) | **Executável do Sistema ADM Gerente**. Supervisão da API de licenças RSA e assinaturas (`sistema-adm-gerente/api`), painel Web (`sistema-adm-gerente/web`), documentação Swagger e sincronização Firebase Cloud. Protegido via `.gitignore`. | Portas 4000, 4001 |
| `Sistema-ADM-Gerente-Setup.exe` | Windows (DEV) | **Instalador Oficial do Sistema ADM Gerente**. Assistente gráfico exclusivo para a máquina do desenvolvedor. | Autocontido |

---

## 🛠️ Como Compilar os Executáveis

### 1. Pacotes do Windows (Cliente CTRL-Farm)
Execute o script em lote na pasta `desktop`:
```cmd
desktop\build-desktop.bat
```
Ou compile individualmente via compilador nativo C# do Windows (`csc.exe`):
```cmd
:: 1. Compilar CTRL-Farm.exe (Modo Silencioso /target:winexe)
C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe /target:winexe /optimize+ /out:desktop\ctrl-farm\dist\CTRL-Farm.exe /win32icon:desktop\ctrl-farm\icon.ico desktop\ctrl-farm\src\Program.cs

:: 2. Compilar Uninstall.exe
C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe /target:winexe /optimize+ /out:desktop\ctrl-farm\dist\Uninstall.exe /win32icon:desktop\ctrl-farm\icon.ico desktop\ctrl-farm\src\Uninstaller.cs

:: 3. Compilar CTRL-Farm-Setup.exe (Instalador Autocontido)
C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe /target:winexe /optimize+ /out:desktop\ctrl-farm\dist\CTRL-Farm-Setup.exe /win32icon:desktop\ctrl-farm\icon.ico /resource:desktop\ctrl-farm\dist\CTRL-Farm.exe,CtrlFarm.exe /resource:desktop\ctrl-farm\dist\Uninstall.exe,Uninstall.exe /resource:desktop\ctrl-farm\icon.ico,icon.ico desktop\ctrl-farm\src\Installer.cs
```
*Observação: Se o Inno Setup 6 estiver instalado, o script também compilará `desktop\ctrl-farm\ctrl-farm.iss`.*

### 2. Pacote macOS (Cliente CTRL-Farm)
No terminal macOS ou Linux:
```bash
desktop/mac/build-macos.sh
```
Ou diretamente via gerador universal Node.js:
```bash
node desktop/mac/create-dmg.mjs
```

### 3. Pacotes do Sistema ADM Gerente (Apenas DEV)
Na máquina do desenvolvedor:
```cmd
desktop\build-adm.bat
```

---

## 🚀 Diretrizes de Experiência do Usuário (Desktop Nativo)

1. **Zero Janelas Pretas ou Prompts:**
   - Todo o processo de inicialização, supervisão de subprocessos e finalização roda com `CreateNoWindow = true`, `UseShellExecute = false` e `WindowStyle = ProcessWindowStyle.Hidden`.
2. **Splash Screen Industrial Instantânea:**
   - Ao clicar no atalho do aplicativo, a Splash Screen em Dark Industrial surge de imediato reportando em tempo real o diagnóstico das portas 3000 e 3001.
3. **Chromium App Mode:**
   - Abre sem abas ou barras de URL do navegador (`--app=http://localhost:3000 --window-size=1440,900`), proporcionando a mesma sensação de um aplicativo nativo Electron/Tauri com consumo de RAM reduzido (< 40 MB).
4. **Bandeja do Sistema (System Tray):**
   - Permite restaurar, minimizar, reiniciar serviços ou encerrar o aplicativo de forma limpa, finalizando todos os processos filhos em árvore.
