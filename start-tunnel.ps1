$logFile = Join-Path $PSScriptRoot "tunnel-url.txt"
$node = Start-Process -WindowStyle Hidden -FilePath "node" -ArgumentList "server.js" -PassThru -WorkingDirectory $PSScriptRoot
Start-Sleep -Seconds 2

$cf = Start-Process -WindowStyle Hidden -FilePath (Join-Path $PSScriptRoot "cloudflared.exe") -ArgumentList "tunnel --url http://localhost:3000" -PassThru -RedirectStandardOutput $logFile
Start-Sleep -Seconds 8

$url = Select-String -Path $logFile -Pattern "https://" | ForEach-Object { $_ -match "https://[\w.-]+\.trycloudflare\.com" | Out-Null; $matches[0] }
if ($url) {
  Set-Content -Path (Join-Path $PSScriptRoot "public-url.txt") -Value $url
  Write-Host "Public URL: $url"
} else {
  Write-Host "Could not find URL in output"
}
