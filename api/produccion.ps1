# API pública del chat (la que llega a antonioooj.dev por Cloudflare Tunnel).
# Puerto 8003, para no chocar con la de `npm run dev` (8002). Misma base de datos (data/chat.db).
# Lee .env.production encima de .env (ver main.py). Se arranca sola al iniciar sesión en Windows
# con la tarea programada «AntonioooJ API» (ver DESPLIEGUE-TUNEL.md).
Set-Location $PSScriptRoot
$env:API_ENTORNO = "produccion"
# Si se cae, vuelve a arrancar a los 5 s
while ($true) {
    & .\.venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8003 --no-server-header --timeout-graceful-shutdown 5
    Start-Sleep -Seconds 5
}
