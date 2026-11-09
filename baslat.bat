@echo off
chcp 65001 >nul
title PIKSEL ARENA Sunucusu
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo  [!] Node.js bulunamadi.
  echo      https://nodejs.org adresinden "LTS" surumunu indirip kur,
  echo      sonra bu dosyayi tekrar calistir.
  echo.
  start https://nodejs.org
  pause
  exit /b
)
echo  Eski surum aciksa kapatiliyor...
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":3000 " ^| findstr "LISTENING"') do taskkill /pid %%p /f >nul 2>nul
start "" http://localhost:3000
node server.js
pause
