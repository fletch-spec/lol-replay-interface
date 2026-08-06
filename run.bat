@echo off
REM Starts the helper and opens the panel. Requires Node 18+.
REM
REM BEFORE THIS WILL CONNECT TO ANYTHING: the League client's replay API must be
REM enabled locally. Add EnableReplayApi=1 under [General] in
REM   C:\Riot Games\League of Legends\Config\game.cfg
REM and fully restart the client. Without it the panel sits on "no replay
REM loaded" forever with a replay open, because there is no API to talk to.

echo.
echo   Requires EnableReplayApi=1 under [General] in the client's game.cfg,
echo   and a full client restart after setting it. See the README.
echo.

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
