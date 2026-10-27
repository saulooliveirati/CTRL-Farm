$timestamp2 = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$email2 = "tenant2_$timestamp2@oficina3d.com"

Write-Host "Registrando Tenant 2..."
$reg2 = Invoke-RestMethod -Uri "http://localhost:3001/auth/register" -Method Post -Body (@{
    companyName = "Empresa Isolada 2"
    name = "Usuario 2"
    email = $email2
    password = "SenhaForte123!"
} | ConvertTo-Json) -ContentType "application/json"

$login2 = Invoke-RestMethod -Uri "http://localhost:3001/auth/login" -Method Post -Body (@{
    email = $email2
    password = "SenhaForte123!"
} | ConvertTo-Json) -ContentType "application/json"
$token2 = if ($login2.data) { $login2.data.accessToken } else { $login2.accessToken }

$status2 = Invoke-RestMethod -Uri "http://localhost:3001/licensing/status" -Headers @{ Authorization = "Bearer $token2" }
$s2 = if ($status2.data) { $status2.data } else { $status2 }

Write-Host "Tenant 2 isLicensed: $($s2.isLicensed)"
Write-Host "Tenant 2 status:     $($s2.status)"

if ($s2.isLicensed -eq $false -and $s2.status -eq "PENDING_ACTIVATION") {
    Write-Host "ISOLAMENTO MULTI-TENANT 100% GARANTIDO: Tenant 2 NAO herdou a licenca do Tenant 1!"
} else {
    Write-Error "FALHA: Isolamento quebrado!"
}
