@echo off
cd /d D:\Repos\keon-omega\forgepilot
echo Starting dev server at %date% %time% > pw-run-out.txt
start /B npm run dev > dev-server.log 2>&1
echo Waiting 45s for dev server to be ready... >> pw-run-out.txt
ping -n 46 127.0.0.1 > nul
echo Running component tests at %date% %time% >> pw-run-out.txt
npx playwright test --project=component --reporter=list >> pw-run-out.txt 2>&1
echo Exit code: %ERRORLEVEL% >> pw-run-out.txt
echo DONE >> pw-run-out.txt

