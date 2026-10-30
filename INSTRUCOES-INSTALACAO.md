# Guia de Instalação e Ativação do CTRL-Farm 🖨️

Bem-vindo ao **CTRL-Farm**, a plataforma industrial de gestão e monitoramento para fazendas e oficinas de impressão 3D!

Este guia foi elaborado para que você instale e ative o sistema em seu computador com Windows de forma rápida, simples e com zero complicação.

---

![Como Instalar o CTRL-Farm](docs/images/como-instalar-ctrl-farm.jpg)

---

## 💻 Requisitos do Sistema

- **Sistema Operacional:** Windows 10 ou Windows 11 (64-bit)
- **Memória RAM:** Mínimo de 4 GB RAM (recomendado 8 GB)
- **Espaço em Disco:** 500 MB livres
- **Navegador:** Microsoft Edge ou Google Chrome (utilizado pelo motor nativo de visualização)
- **Não requer Docker nem configuração manual de banco de dados:** Todos os serviços essenciais (PostgreSQL local leve e runtime) já operam de forma integrada e autocontida.

---

## 🚀 Passo a Passo de Instalação (1 Clique)

### Passo 1 — Download do Instalador
Baixe o arquivo de instalação único e oficial diretamente pelo link do GitHub Releases:

🔗 **[Baixar CTRL-Farm-Setup.exe (Link Direto)](https://github.com/saulooliveirati/CTRL-Farm/releases/latest/download/CTRL-Farm-Setup.exe)**

---

### Passo 2 — Instalação com 1 Clique
1. Abra o arquivo baixado **`CTRL-Farm-Setup.exe`**.
2. **Aviso do Windows SmartScreen (Desenvolvedor Independente):**
   - Como se trata de um binário de teste inicial (Beta), o Windows pode exibir a tela azul *"O Windows protegeu o seu computador"*.
   - Clique no texto **"Mais informações"**.
   - Em seguida, clique no botão **"Executar assim mesmo"**.
3. O instalador do CTRL-Farm será aberto. Clique em **"Avançar"** e depois em **"Instalar"**.
4. O processo é rápido (< 1 minuto) e criará automaticamente o atalho **CTRL-Farm** na sua Área de Trabalho e no Menu Iniciar.

---

### Passo 3 — Inicialização Automática
1. Ao concluir a instalação (ou ao clicar duas vezes no ícone **CTRL-Farm** na Área de Trabalho), o aplicativo inicializará automaticamente no Windows.
2. Uma janela nativa, limpa e dedicada será aberta diretamente na porta local segura, sem barras de ferramentas do navegador e com o ícone de monitoramento presente na bandeja do sistema (próximo ao relógio).

---

### Passo 4 — Solicitação e Ativação da Licença
1. No primeiro acesso, o sistema apresentará a tela de boas-vindas e ativação com o seu **ID de Instalação / Chave da Máquina**.
2. **Copie esse código** exibido na tela e envie ao desenvolvedor/administrador.
3. O administrador irá aprovar o seu acesso no Sistema ADM e enviará a sua **Chave Criptográfica de Licença**.
4. Cole a chave recebida no campo correspondente e clique em **"Ativar Sistema"**.
5. O painel completo será imediatamente liberado, permitindo que você controle impressoras, filamentos, ordens de serviço, câmeras e finanças com máxima performance!

---

## 🛠️ Suporte e Dúvidas

Se tiver qualquer dúvida durante a instalação ou precisar de nova chave de ativação:
- Contate diretamente o administrador do sistema.
- Os logs de diagnóstico ficam disponíveis em `%LOCALAPPDATA%\CTRL-Farm\Logs`.
