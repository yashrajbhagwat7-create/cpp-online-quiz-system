# =================================================================
# QuizMaster .NET - Online Examination Web Server Launcher
# =================================================================

$cscPath = "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
if (-not (Test-Path $cscPath)) {
    $cscPath = "C:\Windows\Microsoft.NET\Framework\v4.0.30319\csc.exe"
}

if (-not (Test-Path $cscPath)) {
    Write-Host "[ERROR] csc.exe (.NET Framework C# compiler) not found." -ForegroundColor Red
    exit 1
}

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "       QUIZMASTER .NET - ONLINE EXAMINATION SYSTEM" -ForegroundColor Cyan
Write-Host "             (C++ OOP Logic Engine in .NET C#)" -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan

Write-Host "`n[1/3] Compiling QuizWebServer.cs..." -ForegroundColor Yellow
& $cscPath /nologo /r:System.Web.Extensions.dll /r:System.dll /r:System.Core.dll /out:QuizWebServer.exe QuizWebServer.cs

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Compilation failed." -ForegroundColor Red
    exit 1
}

Write-Host "[2/3] Compilation succeeded: QuizWebServer.exe ready." -ForegroundColor Green
Write-Host "[3/3] Opening browser at http://localhost:5050/..." -ForegroundColor Yellow
Start-Process "http://localhost:5050/"

Write-Host "`n=================================================================" -ForegroundColor Green
Write-Host " Server active on: http://localhost:5050/" -ForegroundColor Green
Write-Host " Press Ctrl+C in this terminal to stop." -ForegroundColor Green
Write-Host "=================================================================`n" -ForegroundColor Green

.\QuizWebServer.exe 5050
