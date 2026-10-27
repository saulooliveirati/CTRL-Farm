$base = "E:\CTRL-Farm\apps\web"
$appDir = "$base\app"

Get-ChildItem -Path $appDir -Recurse -Directory | ForEach-Object {
    $sub = $_.FullName.Substring($appDir.Length)
    $dirs = @(
        "$base\.next\server\app$sub",
        "$base\.next\types\app$sub",
        "$base\.next\static\chunks\app$sub"
    )
    foreach ($d in $dirs) {
        if (-not [System.IO.Directory]::Exists($d)) {
            [System.IO.Directory]::CreateDirectory($d) | Out-Null
        }
    }
}
Write-Host "All subdirectories created in server, types, and static!"
