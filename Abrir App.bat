@echo off
title Abrir App - Beneficios ATT
color 0A
cls

echo.
echo  ================================================
echo    A B R I R   A P P  -  B e n e f i c i o s
echo  ================================================
echo.

:: Verificar si el servidor ya esta corriendo en puerto 3457
netstat -ano | find "3457" >nul 2>&1
if %errorlevel%==0 (
    echo  [OK] Servidor ya esta corriendo en puerto 3457
) else (
    echo  [..] Levantando servidor en puerto 3457...
    cd /d "%~dp0"
    start /B python -m http.server 3457
    timeout /t 1 /nobreak >nul
    echo  [OK] Servidor iniciado
)

echo.
echo  [..] Abriendo navegador...
start "" "http://localhost:3457"
echo  [OK] Listo!
echo.
timeout /t 2 /nobreak >nul
