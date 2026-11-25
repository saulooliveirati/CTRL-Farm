# CTRL+Farm 🖨️

Plataforma Industrial e Sistema ERP profissional para gerenciamento de Farms e Oficinas de Impressão 3D.
Operação Desktop Nativa Autônoma com Arquitetura Híbrida Local-First e Conexão em Nuvem.

[![Download Windows](https://img.shields.io/badge/Download-Windows%20(.exe)-0078D6?style=for-the-badge&logo=windows&logoColor=white)](https://github.com/saulooliveirati/CTRL-Farm/releases/latest/download/CTRL-Farm-Setup.exe)
[![Download macOS](https://img.shields.io/badge/Download-macOS%20(.dmg)-000000?style=for-the-badge&logo=apple&logoColor=white)](https://github.com/saulooliveirati/CTRL-Farm/releases/latest/download/CTRL-Farm.dmg)
[![Website Oficial](https://img.shields.io/badge/Website-GitHub%20Pages-20c997?style=for-the-badge&logo=githubpages&logoColor=black)](https://saulooliveirati.github.io/CTRL-Farm/)
[![Status](https://img.shields.io/badge/Release-v1.0.0--Beta-emerald?style=for-the-badge)](https://github.com/saulooliveirati/CTRL-Farm/releases)

---

## 📥 Download dos Instaladores Oficiais (Desktop)

O CTRL-Farm opera nativamente em computadores pessoais e servidores de farm com inicialização 100% silenciosa (zero telas pretas, prompts do DOS ou scripts .bat), baixíssimo consumo de memória RAM (< 40 MB) e zero dependência de Docker:

| Sistema Operacional | Formato | Arquitetura | Link de Download Direto |
| :--- | :--- | :--- | :--- |
| **Microsoft Windows** | `.exe` | Windows 10 e 11 (64-bit) | 🔗 [Baixar CTRL-Farm para Windows (.exe)](https://github.com/saulooliveirati/CTRL-Farm/releases/latest/download/CTRL-Farm-Setup.exe) |
| **Apple macOS** | `.dmg` | Apple Silicon (M1/M2/M3/M4) & Intel | 🔗 [Baixar CTRL-Farm para macOS (.dmg)](https://github.com/saulooliveirati/CTRL-Farm/releases/latest/download/CTRL-Farm.dmg) |

> 📖 **Guia Passo a Passo:** Consulte o [Guia de Instalação e Ativação](INSTRUCOES-INSTALACAO.md) para instruções detalhadas.  
> 🌐 **Website e Documentação Online:** [https://saulooliveirati.github.io/CTRL-Farm/](https://saulooliveirati.github.io/CTRL-Farm/)

---

## 🏛️ Arquitetura Híbrida: Local-First + Conexão em Nuvem

O CTRL-Farm foi concebido para o ambiente fabril, unindo a velocidade e resiliência local com a inteligência central da nuvem:

### 1. Operação Local-First (Totalmente Autônoma)
- **Gestão de Impressoras na Rede Local:** Comunicação em tempo real via Moonraker (Klipper), OctoPrint e interfaces de rede local sem depender de conexão externa.
- **Streaming de Câmeras com MediaMTX:** Servidor de mídia embutido para monitoramento de câmeras RTSP e WebRTC na rede local com latência zero e sem consumir banda de internet.
- **Calculadora e Cache de Alta Velocidade:** Motor de orçamento, fatiamento, custo unitário e perdas executado localmente.
- **Inicialização Silenciosa & Splash Screen:** Ao clicar no atalho, uma Splash Screen gráfica personalizada em Dark Industrial (`#0a0f1b`, `#101827`, `#20c997`) surge imediatamente enquanto os serviços locais (portas 3001 e 3000) são validados, abrindo a janela principal em Chromium App Mode e minimizando para a bandeja do sistema (System Tray).

### 2. Conectividade em Nuvem Segura (Cloud Sync)
- **Autenticação Unificada:** Login corporativo e gestão de usuários sincronizados com o Firebase Cloud.
- **Validação de Licença RSA:** Checagem criptográfica de chaves de ativação digitais emitidas pela autoridade central do Sistema ADM.
- **Atualizações Silenciosas:** Verificação automática de versões sem interrupção dos trabalhos de impressão.
- **Suporte Remoto Assistido:** Suporte Nível 1 com IA e Nível 2 humano integrado diretamente à central de atendimento.

---

## 💻 Recursos do Beta Funcional

- **Painel Geral de Telemetria:** Status operacional em tempo real de todas as impressoras da fazenda 3D.
- **Controle de Insumos:** Gestão de carretéis de filamento, marcas, cores, materiais (PLA, PETG, ABS, TPU) e pesagem disponível.
- **Ordens de Produção:** Fila de trabalhos, início, pausa, conclusão e registro detalhado de falhas operacionais.
- **Vínculo Comercial:** Integração de pedidos e clientes com ordens de produção correspondentes.
- **Baixa Automática:** Débito automático do peso real consumido de filamento após o encerramento de cada ordem.
- **Multi-Tenant Estrito:** Isolamento criptográfico e operacional completo dos dados por empresa.
- **Calculadora de Precificação:** Custos fixos, consumo elétrico, depreciação de máquinas, margens de lucro e taxas de marketplace.
- **Biblioteca de Arquivos 3D:** Repositório de arquivos STL/3MF/GCODE com controle de versões e pré-visualização.
- **Suporte Multi-Idioma Nativo (i18n):** Operação completa em Português (Brasil - padrão), Inglês (US), Espanhol, Francês e Alemão.

---

## 🌐 Suporte Multi-Idioma (i18n)

O CTRL-Farm foi preparado para operações globais com suporte internacional nativo:
- **Seleção no Instalador (Windows):** Ao iniciar o instalador oficial `CTRL-Farm-Setup.exe`, o assistente solicita o idioma de preferência do usuário. O instalador grava automaticamente a escolha e o software já inicializa configurado nesse idioma.
- **Alternador na Interface Web & Landing Page:** No canto superior direito da Landing Page oficial, página de downloads e painel de controle, há um seletor visual com bandeiras e nomes que atualiza dinamicamente os textos e salva a preferência.
- **Controle pelo System Tray:** No Windows, clique com o botão direito no ícone do CTRL-Farm (perto do relógio) para acessar o submenu `🌐 Idioma / Language` e alternar instantaneamente entre os idiomas suportados sem precisar reiniciar o aplicativo.

---

## 🛠️ Compilação dos Pacotes Desktop

### Windows
Para compilar o executável nativo silencioso `CTRL-Farm.exe`, o desinstalador `Uninstall.exe` e o instalador oficial `CTRL-Farm-Setup.exe`:
```cmd
desktop\build-desktop.bat
```

### macOS
Para gerar a imagem de disco comprimida `CTRL-Farm.dmg` com atalho de instalação para `/Applications`:
```bash
desktop/mac/build-macos.sh
```

### Sistema ADM Gerente (Apenas DEV)
O módulo `sistema-adm-gerente/` é restrito à máquina do desenvolvedor e isolado no `.gitignore`:
```cmd
desktop\build-adm.bat
```

---

## 🌐 Executar em Ambiente de Desenvolvimento

Pré-requisitos: Node.js 20+, pnpm e Docker (ou PostgreSQL local).

1. Instale as dependências: `pnpm install`.
2. Configure as variáveis de ambiente: copie `.env.example` para `.env`.
3. Inicie os serviços locais: `docker compose up -d postgres redis`.
4. Aplique as migrações: `pnpm dlx prisma@6.16.3 migrate deploy`.
5. Inicie Web e API: `pnpm dev`.

Acesse `http://localhost:3000` para a aplicação e `http://localhost:3001/docs` para a documentação da API.

---

Desenvolvido por Saulo Oliveira.
