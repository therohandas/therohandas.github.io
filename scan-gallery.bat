@echo off
REM ── Scan img\gallery folder and update gallery.json ──
REM Run this after adding/removing images from img\gallery\
REM Usage: double-click this file or run: scan-gallery.bat

echo Scanning img\gallery for images...

(
echo [
setlocal enabledelayedexpansion
set "first=1"
for %%f in (img\gallery\*.jpg img\gallery\*.jpeg img\gallery\*.png img\gallery\*.gif img\gallery\*.webp img\gallery\*.JPG img\gallery\*.JPEG img\gallery\*.PNG) do (
    if !first!==1 (
        set "first=0"
    ) else (
        echo ,
    )
    echo   "%%~nxf"
)
endlocal
echo.
echo ]
) > gallery.json

echo Done! gallery.json updated.
echo.
type gallery.json
pause
