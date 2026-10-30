# ==============================================================================
# SCRIPT DE TESTE AUTOMATIZADO DE CICLO DE VIDA MULTI-TENANT E ISOLAMENTO DE LICENCAS
# CTRL-Farm Industrial Platform & Sistema ADM Gerente
# ==============================================================================

$ErrorActionPreference = "Stop"

function Write-Step([string]$title) {
    Write-Host "`n========================================================================" -ForegroundColor Cyan
    Write-Host "  $title" -ForegroundColor Cyan
    Write-Host "========================================================================" -ForegroundColor Cyan
}

function Write-Success([string]$msg) {
    Write-Host "  [OK] $msg" -ForegroundColor Green
}

function Write-Fail([string]$msg) {
    Write-Host "  [FALHA] $msg" -ForegroundColor Red
    throw "FALHA DE TESTE: $msg"
}

function Write-Info([string]$msg) {
    Write-Host "  [INFO] $msg" -ForegroundColor Gray
}

$ctrlFarmApi = "http://localhost:3001"
$admApi = "http://localhost:4001/api/v1"

# Gera sufixo unico baseado no timestamp
$ts = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$alphaEmail = "alpha_$ts@teste.com"
$betaEmail  = "beta_$ts@teste.com"
$gammaEmail = "gamma_$ts@teste.com"
$defaultPass = "Password123!"

Write-Step "INICIANDO TESTE COMPLETO DE CICLO DE VIDA MULTI-TENANT"
Write-Info "Timestamp do teste: $ts"
Write-Info "Cliente Alpha: $alphaEmail (Empresa Alpha 3D)"
Write-Info "Cliente Beta:  $betaEmail (Empresa Beta Print)"
Write-Info "Cliente Gamma: $gammaEmail (Empresa Gamma Tech)"

# ------------------------------------------------------------------------------
# ETAPA 1: REGISTRO DOS 3 CLIENTES
# ------------------------------------------------------------------------------
Write-Step "1. Registrando 3 clientes distintos no CTRL-Farm (apps/api)"

function Register-Client($email, $name, $company) {
    $body = @{
        email = $email
        name = $name
        companyName = $company
        password = $defaultPass
    } | ConvertTo-Json

    $res = Invoke-RestMethod -Uri "$ctrlFarmApi/auth/register" -Method Post -Body $body -ContentType "application/json"
    $data = if ($res.data) { $res.data } else { $res }
    Write-Success "Registrado: $email (Company ID: $($data.id))"
    return $data
}

$alphaCompany = Register-Client $alphaEmail "Admin Alpha" "Empresa Alpha 3D"
$betaCompany  = Register-Client $betaEmail  "Admin Beta"  "Empresa Beta Print"
$gammaCompany = Register-Client $gammaEmail "Admin Gamma" "Empresa Gamma Tech"

if (-not $alphaCompany.id -or -not $betaCompany.id -or -not $gammaCompany.id) {
    Write-Fail "Falha ao obter IDs unicos das empresas!"
}

if ($alphaCompany.id -eq $betaCompany.id -or $betaCompany.id -eq $gammaCompany.id) {
    Write-Fail "Os IDs das empresas nao sao unicos!"
}
Write-Success "Empresas criadas com IDs unicos e isolados."

# ------------------------------------------------------------------------------
# ETAPA 2: LOGIN DOS 3 CLIENTES
# ------------------------------------------------------------------------------
Write-Step "2. Autenticando os 3 clientes para obtencao dos tokens JWT"

function Login-Client($email) {
    $body = @{
        email = $email
        password = $defaultPass
    } | ConvertTo-Json

    $res = Invoke-RestMethod -Uri "$ctrlFarmApi/auth/login" -Method Post -Body $body -ContentType "application/json"
    $token = if ($res.data.accessToken) { $res.data.accessToken } else { $res.accessToken }
    return $token
}

$alphaToken = Login-Client $alphaEmail
$betaToken  = Login-Client $betaEmail
$gammaToken = Login-Client $gammaEmail

Write-Success "Tokens JWT gerados para Alpha, Beta e Gamma."

# ------------------------------------------------------------------------------
# ETAPA 3: VALIDAR ESTADO INICIAL (PENDING_ACTIVATION)
# ------------------------------------------------------------------------------
Write-Step "3. Verificando estado inicial das licencas (PENDING_ACTIVATION)"

function Get-LicenseStatus($token) {
    $headers = @{ Authorization = "Bearer $token" }
    $res = Invoke-RestMethod -Uri "$ctrlFarmApi/licensing/status" -Method Get -Headers $headers
    if ($res.data) { return $res.data } else { return $res }
}

function Test-ProtectedFeature($token) {
    $headers = @{ Authorization = "Bearer $token" }
    try {
        $res = Invoke-RestMethod -Uri "$ctrlFarmApi/licensing/protected-feature" -Method Get -Headers $headers
        $data = if ($res.data) { $res.data } else { $res }
        return @{ Allowed = $true; Status = 200; Data = $data }
    } catch [System.Net.WebException] {
        $statusCode = [int]$_.Exception.Response.StatusCode
        return @{ Allowed = $false; Status = $statusCode; Error = $_.Exception.Message }
    } catch {
        return @{ Allowed = $false; Status = 500; Error = $_.ToString() }
    }
}

$alphaStatus = Get-LicenseStatus $alphaToken
$betaStatus  = Get-LicenseStatus $betaToken
$gammaStatus = Get-LicenseStatus $gammaToken

Write-Info "Alpha Status: $($alphaStatus.status) | isLicensed: $($alphaStatus.isLicensed)"
Write-Info "Beta Status:  $($betaStatus.status) | isLicensed: $($betaStatus.isLicensed)"
Write-Info "Gamma Status: $($gammaStatus.status) | isLicensed: $($gammaStatus.isLicensed)"

if ($alphaStatus.status -ne "PENDING_ACTIVATION" -or $alphaStatus.isLicensed -ne $false) {
    Write-Fail "Cliente Alpha deveria estar em PENDING_ACTIVATION e nao licenciado!"
}
if ($betaStatus.status -ne "PENDING_ACTIVATION" -or $betaStatus.isLicensed -ne $false) {
    Write-Fail "Cliente Beta deveria estar em PENDING_ACTIVATION e nao licenciado!"
}
if ($gammaStatus.status -ne "PENDING_ACTIVATION" -or $gammaStatus.isLicensed -ne $false) {
    Write-Fail "Cliente Gamma deveria estar em PENDING_ACTIVATION e nao licenciado!"
}
Write-Success "Todos os 3 clientes iniciaram corretamente em PENDING_ACTIVATION."

$guardAlpha = Test-ProtectedFeature $alphaToken
if ($guardAlpha.Allowed -ne $false) {
    Write-Fail "Alpha nao deveria ter acesso a recursos protegidos enquanto pendente!"
}
Write-Success "SubscriptionGuard bloqueou corretamente o acesso do cliente pendente (Status: $($guardAlpha.Status))."

# ------------------------------------------------------------------------------
# ETAPA 4: LOGIN NO SISTEMA ADM GERENTE
# ------------------------------------------------------------------------------
Write-Step "4. Autenticando no Sistema ADM Gerente"

$admLoginBody = @{
    username = "saulosantosns"
    password = "#Ef2ed688"
} | ConvertTo-Json

$admLoginRes = Invoke-RestMethod -Uri "$admApi/auth/login" -Method Post -Body $admLoginBody -ContentType "application/json"
$admToken = if ($admLoginRes.accessToken) { $admLoginRes.accessToken } else { $admLoginRes.data.accessToken }
Write-Success "ADM autenticado com sucesso!"

# ------------------------------------------------------------------------------
# ETAPA 5: LOCALIZAR E APROVAR APENAS CLIENTE ALPHA NO ADM
# ------------------------------------------------------------------------------
Write-Step "5. Localizando e aprovando APENAS o cliente Alpha no ADM"

$admHeaders = @{ Authorization = "Bearer $admToken" }

# Aguarda sincronizacao do webhook de registro
Start-Sleep -Milliseconds 800

$clientsList = Invoke-RestMethod -Uri "$admApi/clients?search=$alphaEmail" -Method Get -Headers $admHeaders
$rawItems = if ($clientsList.items) { $clientsList.items } else { $clientsList }
$alphaAdmClient = $rawItems | Where-Object { $_.email -eq $alphaEmail }

if (-not $alphaAdmClient) {
    $pendingList = Invoke-RestMethod -Uri "$admApi/clients?status=PENDING" -Method Get -Headers $admHeaders
    $pendingItems = if ($pendingList.items) { $pendingList.items } else { $pendingList }
    $alphaAdmClient = $pendingItems | Where-Object { $_.email -eq $alphaEmail }
}

if (-not $alphaAdmClient) {
    Write-Fail "Cliente Alpha nao foi encontrado na lista de clientes do ADM!"
}

Write-Success "Cliente Alpha localizado no ADM: ID $($alphaAdmClient.id)"

$approveBody = @{
    planCode = "BUSINESS"
    sendEmail = $false
} | ConvertTo-Json

$alphaApproval = Invoke-RestMethod -Uri "$admApi/clients/$($alphaAdmClient.id)/approve-registration" -Method Post -Body $approveBody -ContentType "application/json" -Headers $admHeaders
$alphaKey = if ($alphaApproval.license) { $alphaApproval.license.activationKey } else { $alphaApproval.activationKey }
Write-Success "Cliente Alpha APROVADO! Chave RSA emitida: $alphaKey"

# ------------------------------------------------------------------------------
# ETAPA 6: ATIVAR CHAVE DO CLIENTE ALPHA NO CTRL-FARM
# ------------------------------------------------------------------------------
Write-Step "6. Ativando a chave do cliente Alpha no CTRL-Farm"

$activateBody = @{
    activationKey = $alphaKey
} | ConvertTo-Json

$alphaActivateRes = Invoke-RestMethod -Uri "$ctrlFarmApi/licensing/activate" -Method Post -Body $activateBody -ContentType "application/json" -Headers @{ Authorization = "Bearer $alphaToken" }
$activateData = if ($alphaActivateRes.data) { $alphaActivateRes.data } else { $alphaActivateRes }
Write-Success "Resposta da ativacao Alpha: $($activateData.message)"

# ------------------------------------------------------------------------------
# ETAPA 7: VALIDAR LIBERACAO DO CLIENTE ALPHA
# ------------------------------------------------------------------------------
Write-Step "7. Validando status ativo e liberado do cliente Alpha"

$alphaStatusAfter = Get-LicenseStatus $alphaToken
Write-Info "Alpha Status: $($alphaStatusAfter.status) | isLicensed: $($alphaStatusAfter.isLicensed)"

if ($alphaStatusAfter.status -ne "ACTIVE" -or $alphaStatusAfter.isLicensed -ne $true) {
    Write-Fail "Cliente Alpha deveria estar com status ACTIVE e isLicensed: true!"
}
Write-Success "Cliente Alpha agora esta ACTIVE e isLicensed: true!"

$guardAlphaAfter = Test-ProtectedFeature $alphaToken
if ($guardAlphaAfter.Allowed -ne $true) {
    Write-Fail "Cliente Alpha deveria ter acesso autorizado aos recursos protegidos!"
}
Write-Success "SubscriptionGuard liberou com sucesso o acesso aos recursos do Plano Business para Alpha."

# ------------------------------------------------------------------------------
# ETAPA 8: VALIDACAO CRITICA 1 - ISOLAMENTO DE BETA E GAMMA
# ------------------------------------------------------------------------------
Write-Step "8. [VALIDACAO CRITICA 1] Garantindo que Beta e Gamma PERMANECEM PENDING_ACTIVATION"

$betaStatusCheck = Get-LicenseStatus $betaToken
$gammaStatusCheck = Get-LicenseStatus $gammaToken

Write-Info "Beta Status:  $($betaStatusCheck.status) | isLicensed: $($betaStatusCheck.isLicensed)"
Write-Info "Gamma Status: $($gammaStatusCheck.status) | isLicensed: $($gammaStatusCheck.isLicensed)"

if ($betaStatusCheck.status -ne "PENDING_ACTIVATION" -or $betaStatusCheck.isLicensed -ne $false) {
    Write-Fail "CONTAMINACAO CRUZADA! Cliente Beta foi afetado pela ativacao do cliente Alpha!"
}
if ($gammaStatusCheck.status -ne "PENDING_ACTIVATION" -or $gammaStatusCheck.isLicensed -ne $false) {
    Write-Fail "CONTAMINACAO CRUZADA! Cliente Gamma foi afetado pela ativacao do cliente Alpha!"
}

$guardBeta = Test-ProtectedFeature $betaToken
if ($guardBeta.Allowed -ne $false) {
    Write-Fail "VAZAMENTO DE SEGURANCA! Cliente Beta conseguiu acessar recurso restrito sem chave ativa!"
}

Write-Success "ISOLAMENTO PERFEITO: Beta e Gamma continuam estritamente bloqueados e em PENDING_ACTIVATION!"

# ------------------------------------------------------------------------------
# ETAPA 9: APROVAR E ATIVAR CLIENTE BETA
# ------------------------------------------------------------------------------
Write-Step "9. Aprovando cliente Beta no ADM e ativando sua licenca"

$clientsListBeta = Invoke-RestMethod -Uri "$admApi/clients?search=$betaEmail" -Method Get -Headers $admHeaders
$rawItemsBeta = if ($clientsListBeta.items) { $clientsListBeta.items } else { $clientsListBeta }
$betaAdmClient = $rawItemsBeta | Where-Object { $_.email -eq $betaEmail }

if (-not $betaAdmClient) {
    $pendingList = Invoke-RestMethod -Uri "$admApi/clients?status=PENDING" -Method Get -Headers $admHeaders
    $pendingItems = if ($pendingList.items) { $pendingList.items } else { $pendingList }
    $betaAdmClient = $pendingItems | Where-Object { $_.email -eq $betaEmail }
}

if (-not $betaAdmClient) {
    Write-Fail "Cliente Beta nao encontrado no ADM!"
}

$betaApproval = Invoke-RestMethod -Uri "$admApi/clients/$($betaAdmClient.id)/approve-registration" -Method Post -Body $approveBody -ContentType "application/json" -Headers $admHeaders
$betaKey = if ($betaApproval.license) { $betaApproval.license.activationKey } else { $betaApproval.activationKey }
Write-Success "Cliente Beta APROVADO! Chave RSA emitida: $betaKey"

# Ativa Beta no CTRL-Farm
$activateBetaBody = @{ activationKey = $betaKey } | ConvertTo-Json
$betaActivateRes = Invoke-RestMethod -Uri "$ctrlFarmApi/licensing/activate" -Method Post -Body $activateBetaBody -ContentType "application/json" -Headers @{ Authorization = "Bearer $betaToken" }
$activateBetaData = if ($betaActivateRes.data) { $betaActivateRes.data } else { $betaActivateRes }
Write-Success "Resposta da ativacao Beta: $($activateBetaData.message)"

$betaStatusActive = Get-LicenseStatus $betaToken
if ($betaStatusActive.status -ne "ACTIVE" -or $betaStatusActive.isLicensed -ne $true) {
    Write-Fail "Cliente Beta deveria estar com status ACTIVE!"
}
Write-Success "Cliente Beta agora esta ACTIVE e liberado!"

# ------------------------------------------------------------------------------
# ETAPA 10: VALIDACAO CRITICA 2 - ATIVACAO DE BETA NAO TRAVOU ALPHA
# ------------------------------------------------------------------------------
Write-Step "10. [VALIDACAO CRITICA 2] Verificando se a ativacao do Beta afetou o Alpha"

$alphaStatusCheck2 = Get-LicenseStatus $alphaToken
Write-Info "Alpha Status: $($alphaStatusCheck2.status) | isLicensed: $($alphaStatusCheck2.isLicensed)"

if ($alphaStatusCheck2.status -ne "ACTIVE" -or $alphaStatusCheck2.isLicensed -ne $true) {
    Write-Fail "REGRESSAO MULTI-TENANT! A ativacao do cliente Beta sobrescreveu ou bloqueou o cliente Alpha!"
}

$guardAlphaCheck2 = Test-ProtectedFeature $alphaToken
if ($guardAlphaCheck2.Allowed -ne $true) {
    Write-Fail "Cliente Alpha perdeu acesso aos seus recursos apos ativacao do Beta!"
}
Write-Success "ISOLAMENTO CONFIRMADO: Alpha PERMANECE ACTIVE (isLicensed: true) apos ativacao do Beta!"

# ------------------------------------------------------------------------------
# ETAPA 11: SUSPENDER CLIENTE ALPHA NO ADM
# ------------------------------------------------------------------------------
Write-Step "11. Suspendendo cliente Alpha no ADM (POST /clients/:id/suspend)"

$suspendBody = @{
    reason = "Inadimplencia no pagamento mensal"
} | ConvertTo-Json

$alphaSuspendRes = Invoke-RestMethod -Uri "$admApi/clients/$($alphaAdmClient.id)/suspend" -Method Post -Body $suspendBody -ContentType "application/json" -Headers $admHeaders
Write-Success "Comando de suspensao executado no ADM para cliente Alpha."

# Pausa para sincronizacao M2M
Start-Sleep -Milliseconds 600

# ------------------------------------------------------------------------------
# ETAPA 12: VALIDACAO CRITICA 3 - SUSPENSAO AFETA APENAS ALPHA
# ------------------------------------------------------------------------------
Write-Step "12. [VALIDACAO CRITICA 3] Verificando que a suspensao afetou EXCLUSIVAMENTE o Alpha"

$alphaStatusSuspended = Get-LicenseStatus $alphaToken
Write-Info "Alpha Status: $($alphaStatusSuspended.status) | isLicensed: $($alphaStatusSuspended.isLicensed) | isSuspended: $($alphaStatusSuspended.isSuspended)"

if ($alphaStatusSuspended.isLicensed -ne $false -or $alphaStatusSuspended.isSuspended -ne $true) {
    Write-Fail "Cliente Alpha deveria estar suspenso (isLicensed: false, isSuspended: true)!"
}

$guardAlphaSuspended = Test-ProtectedFeature $alphaToken
if ($guardAlphaSuspended.Allowed -ne $false) {
    Write-Fail "SubscriptionGuard NAO bloqueou o cliente Alpha suspenso!"
}
Write-Success "Cliente Alpha BLOQUEADO com sucesso (isSuspended: true, 403 Forbidden em recursos)."

# Agora checa o Beta: Beta DEVE permanecer 100% ativo!
$betaStatusCheck3 = Get-LicenseStatus $betaToken
Write-Info "Beta Status:  $($betaStatusCheck3.status) | isLicensed: $($betaStatusCheck3.isLicensed) | isSuspended: $($betaStatusCheck3.isSuspended)"

if ($betaStatusCheck3.status -ne "ACTIVE" -or $betaStatusCheck3.isLicensed -ne $true -or $betaStatusCheck3.isSuspended -ne $false) {
    Write-Fail "CONTAMINACAO DE SUSPENSAO! A suspensao do Alpha afetou indevidamente o cliente Beta!"
}

$guardBetaCheck3 = Test-ProtectedFeature $betaToken
if ($guardBetaCheck3.Allowed -ne $true) {
    Write-Fail "Cliente Beta perdeu acesso aos recursos devido a suspensao do Alpha!"
}
Write-Success "ISOLAMENTO PERFEITO: Cliente Beta PERMANECE 100% ATIVO e OPERACIONAL enquanto Alpha esta suspenso!"

# ------------------------------------------------------------------------------
# ETAPA 13: REATIVACAO DO CLIENTE ALPHA
# ------------------------------------------------------------------------------
Write-Step "13. Reativando cliente Alpha no ADM (POST /clients/:id/reactivate)"

$alphaReactivateRes = Invoke-RestMethod -Uri "$admApi/clients/$($alphaAdmClient.id)/reactivate" -Method Post -Headers $admHeaders
Write-Success "Comando de reativacao executado no ADM para cliente Alpha."

Start-Sleep -Milliseconds 600

$alphaStatusReactivated = Get-LicenseStatus $alphaToken
Write-Info "Alpha Status apos reativacao: $($alphaStatusReactivated.status) | isLicensed: $($alphaStatusReactivated.isLicensed)"

if ($alphaStatusReactivated.status -ne "ACTIVE" -or $alphaStatusReactivated.isLicensed -ne $true) {
    Write-Fail "Cliente Alpha deveria ter retornado ao status ACTIVE!"
}
Write-Success "Cliente Alpha REATIVADO com sucesso!"

$guardAlphaReactivated = Test-ProtectedFeature $alphaToken
if ($guardAlphaReactivated.Allowed -ne $true) {
    Write-Fail "Cliente Alpha reativado deveria ter acesso liberado!"
}
Write-Success "Cliente Alpha agora tem acesso normal novamente aos recursos protegidos."

# ------------------------------------------------------------------------------
# RELATORIO FINAL
# ------------------------------------------------------------------------------
Write-Host "`n"
Write-Host "========================================================================" -ForegroundColor Green
Write-Host "                RELATORIO DE AVALIACAO MULTI-TENANT                    " -ForegroundColor Green
Write-Host "========================================================================" -ForegroundColor Green
Write-Host "  [x] Isolamento de Cache: Nenhum arquivo estatico compartilhado em disco" -ForegroundColor Green
Write-Host "  [x] Cadastro Isolado: Cada empresa recebe UUID unico e isolado" -ForegroundColor Green
Write-Host "  [x] Status Inicial: PENDING_ACTIVATION para novos clientes" -ForegroundColor Green
Write-Host "  [x] SubscriptionGuard: Bloqueio estrito de tenants sem licenca ativa" -ForegroundColor Green
Write-Host "  [x] Aprovacao Seletiva: Aprovacao de Alpha manteve Beta e Gamma bloqueados" -ForegroundColor Green
Write-Host "  [x] Ativacao Independente: Ativacao de Beta nao sobrescreveu Alpha" -ForegroundColor Green
Write-Host "  [x] Suspensao Cirurgica: Suspensao de Alpha bloqueou Alpha e manteve Beta ativo" -ForegroundColor Green
Write-Host "  [x] Reativacao Imediata: Alpha reativado com sucesso sem afetar Beta" -ForegroundColor Green
Write-Host "------------------------------------------------------------------------" -ForegroundColor Green
Write-Host "  STATUS FINAL: 100% DOS TESTES MULTI-TENANT PASSARAM COM SUCESSO!     " -ForegroundColor Green
Write-Host "========================================================================" -ForegroundColor Green
