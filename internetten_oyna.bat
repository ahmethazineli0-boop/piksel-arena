@echo off
chcp 65001 >nul
title PIKSEL ARENA - Internetten Oyna
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo  [!] Node.js bulunamadi. https://nodejs.org adresinden LTS surumunu kur.
  start https://nodejs.org
  pause
  exit /b
)

echo.
echo  ================================================
echo           PIKSEL ARENA - INTERNETTEN OYNA
echo  ================================================
echo.
echo  Eski surum aciksa kapatiliyor...
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":3000 " ^| findstr "LISTENING"') do taskkill /pid %%p /f >nul 2>nul
echo  [1/3] Oyun sunucusu baslatiliyor...
start "PIKSEL ARENA Sunucu - KAPATMA" /min cmd /k node server.js
timeout /t 2 /nobreak >nul

if not exist cloudflared.exe (
  echo  [2/3] Tunel programi indiriliyor - sadece ilk sefer, biraz surebilir...
  curl -L --fail -o cloudflared.exe https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe
  if errorlevel 1 goto dlfail
) else (
  echo  [2/3] Tunel programi hazir.
)

taskkill /im cloudflared.exe /f >nul 2>nul
echo  [3/3] Internet baglantisi kuruluyor, 10-20 saniye bekle...
if exist tunnel.log del /q tunnel.log
start "" /b cmd /c "cloudflared.exe tunnel --url http://localhost:3000 --no-autoupdate > tunnel.log 2>&1"

set "URL="
set /a TRIES=0
:wait
timeout /t 1 /nobreak >nul
set /a TRIES+=1
for /f "usebackq delims=" %%u in (`powershell -NoProfile -Command "$m = Select-String -Path 'tunnel.log' -Pattern 'https://[a-z0-9-]+\.trycloudflare\.com' -ErrorAction SilentlyContinue; if ($m) { $m[0].Matches[0].Value }"`) do set "URL=%%u"
if defined URL goto found
if %TRIES% geq 60 goto tunfail
goto wait

:found
echo %URL%| clip
timeout /t 4 /nobreak >nul
start "" %URL%
echo.
echo  ================================================
echo   HAZIR! ARKADASINA BU LINKI GONDER:
echo.
echo     %URL%
echo.
echo   (Link panoya kopyalandi, Ctrl+V ile yapistirabilirsin)
echo   Sen de oyuna bu linkten gir, ODA KUR de,
echo   oda kodunu arkadasina soyle.
echo  ================================================
echo.
echo  Bu pencereyi ve kucultulmus sunucu penceresini KAPATMA.
echo  Oyun bitince kapatmak icin bu pencerede bir tusa bas.
pause >nul
taskkill /im cloudflared.exe /f >nul 2>nul
taskkill /fi "WINDOWTITLE eq PIKSEL ARENA Sunucu*" /f >nul 2>nul
exit /b

:dlfail
echo.
echo  [!] Tunel programi indirilemedi. Internet baglantini kontrol et
echo      veya README dosyasindaki diger yollari dene.
pause
exit /b

:tunfail
echo.
echo  [!] Tunel kurulamadi. Ayrintilar tunnel.log dosyasinda.
echo      Antivirus cloudflared.exe'yi engelliyor olabilir.
pause
exit /b
