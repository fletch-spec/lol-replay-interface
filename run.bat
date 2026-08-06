@echo off
REM Starts the helper and opens the panel.
REM Requires Node 18+ and EnableReplayApi=1 in the client's Config/game.cfg.

cd /d "%~dp0app"

if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo.
        echo npm install failed. Is Node installed?
        pause
        exit /b 1
    )
)

start "" http://localhost:3000
echo Helper starting on http://localhost:3000  - close this window to stop it.
call npm start
pause
