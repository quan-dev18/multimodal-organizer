Write-Host "[1/5] Kiem tra file thuc thi MMO.exe..." -ForegroundColor Cyan
if (Test-Path "D:\AI_NCKH\MMO.exe") {
    $file = Get-Item "D:\AI_NCKH\MMO.exe"
    $sizeMb = [Math]::Round($file.Length / 1MB, 2)
    Write-Host "  -> Tim thay MMO.exe ($sizeMb MB) cap nhat luc $($file.LastWriteTime)" -ForegroundColor Green
} else {
    Write-Host "  -> CHUA TIM THAY MMO.exe!" -ForegroundColor Red
}

Write-Host "`n[2/5] Kiem tra dich vu Ollama Local (127.0.0.1:11434)..." -ForegroundColor Cyan
try {
    $tags = Invoke-RestMethod -Uri "http://127.0.0.1:11434/api/tags" -TimeoutSec 2
    $mCount = if ($tags.models) { $tags.models.Count } else { 0 }
    Write-Host "  -> Ollama dang chay binh thuong. Da cai dat: $mCount model(s)" -ForegroundColor Green
    if ($tags.models) {
        foreach ($m in $tags.models) {
            $sz = [Math]::Round($m.size / 1GB, 2)
            Write-Host "     * $($m.name) ($sz GB)" -ForegroundColor DarkGray
        }
    }
} catch {
    Write-Host "  -> Ollama chua khoi dong hoac cong 11434 bi chan!" -ForegroundColor Yellow
}

Write-Host "`n[3/5] Kiem tra MMO Backend API (127.0.0.1:8001)..." -ForegroundColor Cyan
try {
    $health = Invoke-RestMethod -Uri "http://127.0.0.1:8001/api/health" -TimeoutSec 2
    Write-Host "  -> Backend dang hoat dong: Engine=$($health.engine), Status=$($health.status)" -ForegroundColor Green
} catch {
    Write-Host "  -> MMO.exe hien chua bat hoac backend dang nghi." -ForegroundColor Yellow
}

Write-Host "`n[4/5] Kiem tra Web Benchmark doc lap..." -ForegroundColor Cyan
if (Test-Path "D:\AI_NCKH\benchmark.html") {
    Write-Host "  -> Co the click dup mo truc tiep: D:\AI_NCKH\benchmark.html" -ForegroundColor Green
} else {
    Write-Host "  -> Chua co file benchmark.html" -ForegroundColor Red
}

Write-Host "`n[5/5] Kiem tra thiet bi phan cung GPU..." -ForegroundColor Cyan
try {
    $gpus = Get-CimInstance Win32_VideoController | Sort-Object AdapterRAM -Descending
    foreach ($g in $gpus) {
        $vram = [Math]::Round($g.AdapterRAM / 1GB, 2)
        Write-Host "  -> GPU: $($g.Name) (VRAM: $vram GB)" -ForegroundColor Green
    }
} catch {
    Write-Host "  -> Khong the doc thong tin GPU" -ForegroundColor Yellow
}
