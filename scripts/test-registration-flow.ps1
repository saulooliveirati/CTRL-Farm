$timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$email = "cliente$timestamp@oficina3d.com"

Write-Host "1. Registrando novo usuario/empresa no CTRL-Farm..."
$regBody = @{
    companyName = "Oficina 3D Tenant $timestamp"
    name = "Operador Teste"
    email = $email
    password = "SenhaForte123!"
} | ConvertTo-Json

$rawReg = Invoke-RestMethod -Uri "http://localhost:3001/auth/register" -Method Post -Body $regBody -ContentType "application/json"
$companyId = if ($rawReg.data) { $rawReg.data.id } else { $rawReg.id }
Write-Host "Sucesso! Empresa criada com ID: $companyId"

Write-Host "`n2. Efetuando login do novo cliente no CTRL-Farm..."
$loginBody = @{
    email = $email
    password = "SenhaForte123!"
} | ConvertTo-Json
$rawLogin = Invoke-RestMethod -Uri "http://localhost:3001/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
$token = if ($rawLogin.data) { $rawLogin.data.accessToken } else { $rawLogin.accessToken }
Write-Host "Login efetuado com sucesso! Bearer token gerado."

Write-Host "`n3. Verificando status da licenca no CTRL-Farm (deve estar travado em PENDING_ACTIVATION)..."
$rawStatus = Invoke-RestMethod -Uri "http://localhost:3001/licensing/status" -Headers @{ Authorization = "Bearer $token" }
$statusObj = if ($rawStatus.data) { $rawStatus.data } else { $rawStatus }
Write-Host "isLicensed: $($statusObj.isLicensed) (Esperado: False)"
Write-Host "status:     $($statusObj.status) (Esperado: PENDING_ACTIVATION)"
Write-Host "mensagem:   $($statusObj.message)"

if ($statusObj.isLicensed -eq $true) {
    Write-Error "FALHA CRITICA: O novo usuario NAO deveria estar licenciado antes da aprovacao!"
    exit 1
}

Write-Host "`n4. Autenticando no Sistema ADM Gerente como Administrador Geral..."
$admLoginBody = @{
    username = "saulosantosns"
    password = "#Ef2ed688"
} | ConvertTo-Json
$rawAdmLogin = Invoke-RestMethod -Uri "http://localhost:4001/api/v1/auth/login" -Method Post -Body $admLoginBody -ContentType "application/json"
$admToken = $rawAdmLogin.accessToken
Write-Host "ADM autenticado! Token obtido: $($admToken.Substring(0, 20))..."

Write-Host "`n5. Buscando cliente pendente no Sistema ADM..."
$admClients = Invoke-RestMethod -Uri "http://localhost:4001/api/v1/clients?status=PENDING" -Headers @{ Authorization = "Bearer $admToken" }
$pendingClient = $admClients.items | Where-Object { $_.email -eq $email }
if (-not $pendingClient) {
    Write-Error "FALHA: O cliente nao foi encontrado na lista de pendentes do ADM!"
    exit 1
}
Write-Host "Cliente pendente localizado com sucesso no ADM:"
Write-Host "ID:    $($pendingClient.id)"
Write-Host "Nome:  $($pendingClient.name)"
Write-Host "Email: $($pendingClient.email)"

Write-Host "`n6. Aprovando cadastro no Sistema ADM Gerente e emitindo chave RSA (Plano Business)..."
$approveBody = @{
    planCode = "BUSINESS"
    billingCycle = "MONTHLY"
    sendEmail = $true
} | ConvertTo-Json
$approveRes = Invoke-RestMethod -Uri "http://localhost:4001/api/v1/clients/$($pendingClient.id)/approve-registration" -Method Post -Headers @{ Authorization = "Bearer $admToken" } -Body $approveBody -ContentType "application/json"
$activationKey = $approveRes.license.activationKey
Write-Host "Aprovacao concluida com sucesso!"
Write-Host "Chave de Ativacao gerada: $activationKey"
Write-Host "Email de confirmacao enviado para: $($pendingClient.email)"

Write-Host "`n7. Ativando a chave gerada na conta do cliente no CTRL-Farm..."
$actBody = @{
    activationKey = $activationKey
} | ConvertTo-Json
$rawAct = Invoke-RestMethod -Uri "http://localhost:3001/licensing/activate" -Method Post -Headers @{ Authorization = "Bearer $token" } -Body $actBody -ContentType "application/json"
$actMsg = if ($rawAct.data) { $rawAct.data.message } else { $rawAct.message }
Write-Host "Resultado da ativacao: $actMsg"

Write-Host "`n8. Verificando status da licenca pos-ativacao..."
$rawFinalStatus = Invoke-RestMethod -Uri "http://localhost:3001/licensing/status" -Headers @{ Authorization = "Bearer $token" }
$finalObj = if ($rawFinalStatus.data) { $rawFinalStatus.data } else { $rawFinalStatus }
Write-Host "isLicensed: $($finalObj.isLicensed) (Esperado: True)"
Write-Host "status:     $($finalObj.status) (Esperado: ACTIVE)"
Write-Host "plano:      $($finalObj.license.plan.name)"
Write-Host "dias rest.: $($finalObj.daysRemaining)"

if ($finalObj.isLicensed -eq $true -and $finalObj.status -eq "ACTIVE") {
    Write-Host "`n========================================================"
    Write-Host "🎉 SUCESSO TOTAL: FLUXO DE APROVACAO E ATIVACAO 100% OPERACIONAL!"
    Write-Host "========================================================"
} else {
    Write-Error "FALHA: Licenca nao foi ativada corretamente."
}
