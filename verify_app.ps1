$proc = Start-Process -FilePath "D:\AI_NCKH\MMO.exe" -PassThru
Start-Sleep -Seconds 3
try {
    $apiHealth = Invoke-RestMethod -Uri "http://127.0.0.1:8001/api/health" -TimeoutSec 2
    Write-Output "API Health OK: $($apiHealth.engine) $($apiHealth.status)"
} catch {
    Write-Output "API Health Error: $_"
}

try {
    $webIndex = Invoke-WebRequest -Uri "http://127.0.0.1:8001/" -TimeoutSec 2
    Write-Output "Web Root OK: Status $($webIndex.StatusCode), Size $($webIndex.Content.Length) bytes"
} catch {
    Write-Output "Web Root Error: $_"
}

Stop-Process -Id $proc.Id -Force
