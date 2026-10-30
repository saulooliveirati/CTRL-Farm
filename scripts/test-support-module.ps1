# ==============================================================================
# TESTE AUTOMATIZADO END-TO-END DO MODULO DE SUPORTE INTELIGENTE HIBRIDO
# Nivel 1 (IA Bot) + Nivel 2 (Humano no Sistema ADM) + WebRTC Acesso Remoto
# ==============================================================================

$ErrorActionPreference = "Stop"

$ApiBase = "http://localhost:3001"
Write-Host ""
Write-Host "==============================================================================" -ForegroundColor Cyan
Write-Host "INICIANDO BATERIA DE TESTES DO MODULO DE SUPORTE INTELIGENTE HIBRIDO" -ForegroundColor Cyan
Write-Host "==============================================================================" -ForegroundColor Cyan

function Assert-Step($title, [scriptblock]$action) {
    Write-Host -NoNewline "[TESTE] $title ... " -ForegroundColor Yellow
    try {
        $result = & $action
        Write-Host "OK!" -ForegroundColor Green
        return $result
    } catch {
        Write-Host "FALHOU!" -ForegroundColor Red
        Write-Host "   Detalhe do erro: $_" -ForegroundColor Red
        throw $_
    }
}

# ------------------------------------------------------------------------------
# 1. Abertura de Novo Chamado (Protocolo SUP-2026-XXXX e Boas-Vindas da IA)
# ------------------------------------------------------------------------------
$createPayload = @{
    subject = "Falha de Adesao na Primeira Camada - Warping em PLA"
    initialMessage = "Ola, estou tendo problemas com o filamento PLA descolando da mesa PEI."
} | ConvertTo-Json -Depth 5

$ticketRes = Assert-Step "1. Abertura de Chamado via API - Protocolo e Boas-Vindas IA" {
    $response = Invoke-RestMethod -Uri "$ApiBase/support/tickets" -Method Post `
        -ContentType "application/json" -Body $createPayload
    
    if (-not $response.success -or -not $response.data.id) {
        throw "Resposta invalida ao criar chamado: $($response | ConvertTo-Json -Compress)"
    }
    if (-not ($response.data.protocol -match "^SUP-\d{4}-\d{4}$")) {
        throw "Protocolo fora do padrao esperado: $($response.data.protocol)"
    }
    if ($response.data.status -ne "BOT_ACTIVE") {
        throw "Status inicial deveria ser BOT_ACTIVE, retornado: $($response.data.status)"
    }
    $response.data
}

$ticketId = $ticketRes.id
$protocol = $ticketRes.protocol
Write-Host "   -> Chamado aberto com sucesso: ID=$ticketId | Protocolo=$protocol | Status=$($ticketRes.status)" -ForegroundColor DarkGray

# ------------------------------------------------------------------------------
# 2. Consulta de Detalhes e Verificacao do Historico com IA Nivel 1
# ------------------------------------------------------------------------------
$details = Assert-Step "2. Consulta de Detalhes e Verificacao da Resposta Automatica da IA" {
    Start-Sleep -Milliseconds 800
    $res = Invoke-RestMethod -Uri "$ApiBase/support/tickets/$ticketId" -Method Get
    if (-not $res.success -or $res.data.messages.Count -lt 2) {
        throw "O chamado deveria conter pelo menos as mensagens de boas-vindas e a inicial. Total: $($res.data.messages.Count)"
    }
    $res.data
}

$aiWelcome = $details.messages | Where-Object { $_.senderType -eq "AI_BOT" } | Select-Object -First 1
if (-not $aiWelcome) {
    throw "Mensagem de acolhimento da IA nao encontrada no chamado!"
}
Write-Host "   -> Mensagem inicial da IA confirmada: '$($aiWelcome.content.Substring(0, 60))...'" -ForegroundColor DarkGray

# ------------------------------------------------------------------------------
# 3. Interacao Tecnica com IA Nivel 1 (Diagnostico de 3D Printing)
# ------------------------------------------------------------------------------
$techQuestion = @{
    senderType = "USER"
    senderName = "Operador Farm"
    messageType = "TEXT"
    content = "Qual a temperatura recomendada de bico e mesa para filamento PLA, e como limpar a mesa PEI texturizada?"
} | ConvertTo-Json -Depth 5

$techReply = Assert-Step "3. Envio de Pergunta Tecnica e Validacao da Resposta da IA" {
    $res = Invoke-RestMethod -Uri "$ApiBase/support/tickets/$ticketId/messages" -Method Post `
        -ContentType "application/json" -Body $techQuestion
    
    if (-not $res.success -or -not $res.data.aiReply) {
        throw "A IA Nivel 1 nao retornou resposta automatica para o usuario."
    }
    $aiContent = $res.data.aiReply.content
    if ($aiContent.Length -lt 20) {
        throw "Conteudo retornado pela IA insuficiente: $aiContent"
    }
    $res.data.aiReply
}
Write-Host "   -> Resposta Tecnica Nivel 1 gerada com sucesso: '$($techReply.content.Substring(0, 80))...'" -ForegroundColor DarkGray

# ------------------------------------------------------------------------------
# 4. Transbordo para Atendente Humano (Nivel 2 no Sistema ADM) & Resumo da IA
# ------------------------------------------------------------------------------
$escalatePayload = @{
    reason = "Ja limpei com alcool e calibrei o Z-offset, mas as bordas continuam levantando. Preciso de suporte humano."
} | ConvertTo-Json -Depth 5

$escalatedTicket = Assert-Step "4. Transbordo para Atendente Humano - WAITING_HUMAN e Resumo IA" {
    $res = Invoke-RestMethod -Uri "$ApiBase/support/tickets/$ticketId/escalate" -Method Post `
        -ContentType "application/json" -Body $escalatePayload
    
    if (-not $res.success -or $res.data.ticket.status -ne "WAITING_HUMAN") {
        throw "Status do chamado nao foi alterado para WAITING_HUMAN: $($res.data.ticket.status)"
    }
    if (-not $res.data.ticket.aiSummary -or $res.data.ticket.aiSummary.Length -lt 10) {
        throw "Resumo executivo da IA nao foi gerado para o atendente do ADM!"
    }
    $res.data.ticket
}
Write-Host "   -> Status atualizado: $($escalatedTicket.status)" -ForegroundColor DarkGray
Write-Host "   -> Resumo da IA para o ADM: '$($escalatedTicket.aiSummary)'" -ForegroundColor DarkGray

# ------------------------------------------------------------------------------
# 5. Listagem Global da Fila no Sistema ADM (com filtro de prioridade)
# ------------------------------------------------------------------------------
$admQueue = Assert-Step "5. Listagem da Fila no ADM - Presenca na Fila com WAITING_HUMAN" {
    $res = Invoke-RestMethod -Uri "$ApiBase/support/tickets?all=true&status=WAITING_HUMAN" -Method Get
    if (-not $res.success -or -not ($res.data | Where-Object { $_.id -eq $ticketId })) {
        throw "O chamado $ticketId nao apareceu na fila de chamados aguardando do ADM!"
    }
    $res.data
}
Write-Host "   -> Chamado encontrado na fila do Sistema ADM. Total aguardando: $($admQueue.Count)" -ForegroundColor DarkGray

# ------------------------------------------------------------------------------
# 6. Upload de Arquivo Multimidia (Foto/Audio de Suporte)
# ------------------------------------------------------------------------------
$tempMediaFile = [System.IO.Path]::GetTempFileName() + ".png"
[System.IO.File]::WriteAllBytes($tempMediaFile, [byte[]](1..250))

$uploadRes = Assert-Step "6. Upload Seguro de Arquivo Multimidia (POST /support/media/upload)" {
    $raw = & curl.exe -s -F "file=@$tempMediaFile" "$ApiBase/support/media/upload"
    $res = $raw | ConvertFrom-Json
    if (-not $res.success -or -not $res.data.url) {
        throw "Falha ao realizar upload de arquivo de suporte: $raw"
    }
    Remove-Item $tempMediaFile -ErrorAction SilentlyContinue
    $res.data
}
Write-Host "   -> Arquivo de midia salvo com sucesso: URL=$($uploadRes.url) (MIME=$($uploadRes.mimetype))" -ForegroundColor DarkGray

# ------------------------------------------------------------------------------
# 7. Ciclo de Vida do Acesso Remoto Assistido via WebRTC (30 minutos)
# ------------------------------------------------------------------------------
$remoteReqPayload = @{
    adminName = "Especialista ADM Saulo"
} | ConvertTo-Json -Depth 5

$remoteSession = Assert-Step "7.1. ADM Solicita Acesso Remoto Assistido ao Cliente (Status: REQUESTED)" {
    $res = Invoke-RestMethod -Uri "$ApiBase/support/tickets/$ticketId/remote-access" -Method Post `
        -ContentType "application/json" -Body $remoteReqPayload
    
    if (-not $res.success -or -not $res.data.session.id) {
        throw "Falha ao criar sessao remota: $($res | ConvertTo-Json -Compress)"
    }
    if ($res.data.session.status -ne "REQUESTED") {
        throw "Status inicial da sessao remota deveria ser REQUESTED: $($res.data.session.status)"
    }
    $res.data.session
}
$sessionId = $remoteSession.id
Write-Host "   -> Sessao Remota ID=$sessionId criada. Aguardando aceite do cliente." -ForegroundColor DarkGray

# Cliente Autoriza com 30 minutos de validade
$authPayload = @{
    sessionId = $sessionId
    authorized = $true
} | ConvertTo-Json -Depth 5

$authorizedSession = Assert-Step "7.2. Cliente Autoriza Acesso Remoto (Status: AUTHORIZED e Expira em 30 min)" {
    $res = Invoke-RestMethod -Uri "$ApiBase/support/tickets/$ticketId/remote-access/respond" -Method Post `
        -ContentType "application/json" -Body $authPayload
    
    if (-not $res.success -or $res.data.session.status -ne "AUTHORIZED") {
        throw "Sessao nao foi autorizada com sucesso: $($res | ConvertTo-Json -Compress)"
    }
    if (-not $res.data.session.expiresAt) {
        throw "A sessao remota deve conter timestamp de expiracao (expiresAt) de 30 minutos!"
    }
    
    $expires = [DateTime]::Parse($res.data.session.expiresAt)
    $diffMinutes = ($expires - (Get-Date)).TotalMinutes
    if ($diffMinutes -lt 28 -or $diffMinutes -gt 31) {
        throw "Duracao da expiracao deveria ser ~30 minutos, calculada: $diffMinutes min"
    }
    $res.data.session
}
Write-Host "   -> Acesso Remoto Autorizado com Sucesso! Expira em: $($authorizedSession.expiresAt)" -ForegroundColor DarkGray

# ------------------------------------------------------------------------------
# 8. Finalizacao do Chamado e Encerramento da Sessao Remota
# ------------------------------------------------------------------------------
$closedTicket = Assert-Step "8. Conclusao e Fechamento do Chamado (Status: CLOSED)" {
    $res = Invoke-RestMethod -Uri "$ApiBase/support/tickets/$ticketId/close" -Method Post
    if (-not $res.success -or ($res.data.status -ne "RESOLVED" -and $res.data.status -ne "CLOSED")) {
        throw "O chamado nao foi finalizado corretamente: $($res | ConvertTo-Json -Compress)"
    }
    $res.data
}
Write-Host "   -> Chamado encerrado com sucesso: Status=$($closedTicket.status) | Fechado em=$($closedTicket.closedAt)" -ForegroundColor DarkGray

Write-Host ""
Write-Host "==============================================================================" -ForegroundColor Green
Write-Host "TODOS OS 8 TESTES DO MODULO DE SUPORTE INTELIGENTE FORAM APROVADOS (100%)!" -ForegroundColor Green
Write-Host "==============================================================================" -ForegroundColor Green
Write-Host ""
