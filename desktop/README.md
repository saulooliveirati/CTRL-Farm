# CTRL-Farm & Sistema ADM Gerente - Aplicativos Desktop e Instaladores Windows

Este diretório contém o código-fonte, recursos e ferramentas de compilação dos executáveis desktop nativos e instaladores para **Windows** do projeto **CTRL-Farm** e do **Sistema ADM Gerente**.

---

## 📦 Binários Gerados na Raiz do Projeto

| Arquivo | Descrição | Portas / Serviços |
| :--- | :--- | :--- |
| `CTRL-Farm.exe` | **Executável Principal do CTRL-Farm**. Supervisão em tempo real de NestJS (`apps/api`), Next.js (`apps/web`) e streaming RTSP/WebRTC (`MediaMTX`), bandeja de sistema com menu de contexto e janela Chromium nativa em App Mode. | Portas 3000, 3001, 8890 |
| `CTRL-Farm-Setup.exe` | **Instalador Oficial do CTRL-Farm**. Assistente gráfico no padrão Dark Industrial, diagnóstico de pré-requisitos, atalhos na Área de Trabalho e Menu Iniciar, e registro de desinstalação no Windows. | Totalmente autocontido |
| `Sistema-ADM-Gerente.exe` | **Executável Principal do Sistema ADM Gerente**. Supervisão da API de licenças RSA e assinaturas (`sistema-adm-gerente/api`), painel Web (`sistema-adm-gerente/web`), atalhos para documentação Swagger e forçar checagem com o Firebase Cloud. | Portas 4000, 4001 |
| `Sistema-ADM-Gerente-Setup.exe` | **Instalador Oficial do Sistema ADM Gerente**. Assistente gráfico, atalhos na Área de Trabalho e Menu Iniciar, integração Windows. | Totalmente autocontido |

---

## 🛠️ Como Recompilar os Executáveis

Basta executar o script em lote incluído na pasta `desktop`:

```cmd
desktop\build-desktop.bat
```

Ou via linha de comando manual utilizando o compilador C# nativo do Windows (`csc.exe`):

```cmd
# 1. Compilar CTRL-Farm.exe
C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe /target:winexe /optimize+ /out:desktop\ctrl-farm\dist\CTRL-Farm.exe /win32icon:desktop\ctrl-farm\icon.ico desktop\ctrl-farm\src\Program.cs

# 2. Compilar CTRL-Farm-Setup.exe
C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe /target:winexe /optimize+ /out:desktop\ctrl-farm\dist\CTRL-Farm-Setup.exe /win32icon:desktop\ctrl-farm\icon.ico /resource:desktop\ctrl-farm\dist\CTRL-Farm.exe,CtrlFarm.exe /resource:desktop\ctrl-farm\icon.ico,icon.ico desktop\ctrl-farm\src\Installer.cs

# 3. Compilar Sistema-ADM-Gerente.exe
C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe /target:winexe /optimize+ /out:desktop\sistema-adm-gerente\dist\Sistema-ADM-Gerente.exe /win32icon:desktop\sistema-adm-gerente\icon.ico desktop\sistema-adm-gerente\src\Program.cs

# 4. Compilar Sistema-ADM-Gerente-Setup.exe
C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe /target:winexe /optimize+ /out:desktop\sistema-adm-gerente\dist\Sistema-ADM-Gerente-Setup.exe /win32icon:desktop\sistema-adm-gerente\icon.ico /resource:desktop\sistema-adm-gerente\dist\Sistema-ADM-Gerente.exe,SistemaAdmGerente.exe /resource:desktop\sistema-adm-gerente\icon.ico,icon.ico desktop\sistema-adm-gerente\src\Installer.cs
```

---

## 🚀 Arquitetura e Recursos dos Aplicativos

1. **Instância Única (Single-Instance Mutex):**
   - Garante que apenas uma instância de cada aplicativo seja executada por vez via `Global\CTRL_FARM_DESKTOP_SINGLE_INSTANCE` e `Global\SISTEMA_ADM_GERENTE_SINGLE_INSTANCE`.

2. **Splash Screen Industrial Dark Mode:**
   - Tela de inicialização personalizada nas cores oficiais (`#0a0f1b`, `#101827`, `#20c997`), com indicador de progresso e status detalhado em tempo real.

3. **Supervisão Inteligente de Processos:**
   - Detecta portas abertas automaticamente. Se os serviços já estiverem ativos, conecta-se a eles de imediato. Se não estiverem, inicia os daemons em segundo plano sem poluir a tela do usuário.
   - Ao fechar o aplicativo pelo menu da bandeja ou janela, executa o encerramento em árvore (`taskkill /PID ... /T /F`), garantindo que nenhum processo órfão de Node.js permaneça rodando.

4. **Modo Chromium Desktop Nativo (Edge / Chrome App Mode):**
   - Inicializa a interface com `--app=http://localhost:...` sem barras de navegação ou abas de navegador padrão, oferecendo uma experiência 100% idêntica a um software nativo (como Electron/Tauri), porém com zero consumo extra de memória e aproveitando o motor de alta velocidade já existente no Windows.

5. **Bandeja do Sistema (System Tray):**
   - Ícone dedicado próximo ao relógio do Windows com menu interativo:
     - Abrir janela principal
     - Abrir no navegador padrão
     - Forçar checagem e sincronização Firebase
     - Visualizar logs
     - Encerrar serviços
