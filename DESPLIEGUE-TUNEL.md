# API del chat publicada con Cloudflare Tunnel (gratis)

> **Desde 2026-10-30 corre en Google Cloud**, no en el PC: VM `antonioooj-api` (e2-micro «Always Free»,
> us-central1-a, Ubuntu 24.04), `ssh antonio@35.254.200.19`.
> - API: `/opt/antonioooj/api` (código + `.env` + `.env.production` + `data/`), servicio systemd
>   `antonioooj-api` (puerto 8003). Tras cambiar el código: copiar los .py y `sudo systemctl restart antonioooj-api`.
> - Túnel: `/etc/cloudflared/config.yml` + credenciales, servicio systemd `cloudflared`.
> - Logs: `journalctl -u antonioooj-api -f` / `journalctl -u cloudflared -f`.
> - La base de datos de verdad es la del servidor; la del PC (`api/data/chat.db`) se quedó como copia del 30-10.
> - En el PC quedan `api/produccion.ps1` y las tareas «AntonioooJ API» / «AntonioooJ Tunel» (sin usar).
> - **Demo pública de servidor-fivem** en <https://fivem.antonioooj.dev> (misma VM y mismo túnel):
>   código en `/opt/antonioooj/fivem` (`.env` con `DEMO_PUBLICA=1`, sin bot ni claves de Discord),
>   servicio systemd `antonioooj-fivem` (puerto 8004, máx. 300 MB). Cada arranque copia los datos
>   ficticios de `/opt/antonioooj/fivem-semilla` y se reinicia solo cada 24 h, así que todo vuelve a
>   empezar a diario. «Entrar como visitante» (`/auth/visitante`) solo existe con `DEMO_PUBLICA=1`, y en
>   la demo no se pueden subir imágenes. Para actualizarla: copiar el código (sin `.env` ni `data/`) y
>   `sudo systemctl restart antonioooj-fivem`.
>
> Lo de abajo describe el montaje original en el PC, que sigue valiendo de plan B.

```
visitante → antonioooj.dev (Cloudflare Pages)
              ├─ páginas: dist/ estático
              └─ /api/*  → functions/api/[[ruta]].js ──(+ X-Proxy-Secret)──► origen-api.antonioooj.dev
                                                                             (Cloudflare Tunnel)
                                                                                   │
                                                           cloudflared en el PC ◄──┘
                                                                   │
                                                  API pública 127.0.0.1:8003 (api/produccion.ps1)
```

- La web y la API comparten dominio, así que la cookie de sesión funciona igual que en local.
- La API pública solo atiende peticiones con la cabecera `X-Proxy-Secret` (la pone la función de
  Pages). Entrar directo a `origen-api.antonioooj.dev` da 404.
- Solo funciona con el PC encendido. Apagado, `/api` responde 503 («El chat no está disponible»).
- `npm run dev` sigue con su API en el 8002. Las dos usan la misma base de datos (`api/data/chat.db`).

## Piezas

| Qué | Dónde |
|---|---|
| Túnel `antonioooj-api` (id 90d3edc8-…) | `%USERPROFILE%\.cloudflared\config.yml` + `<id>.json` (secreto) |
| Configuración pública de la API | `api/.env.production` (no se sube a git): `PUBLIC_URL`, `DEMO_LOGIN=0`, `PROXY_SECRET` |
| Arranque de la API pública | `api/produccion.ps1` (puerto 8003, se reinicia si se cae) |
| Reenvío de `/api` | `functions/api/[[ruta]].js` (Pages Function) |

## Variables en Cloudflare Pages

Proyecto de la web → **Settings → Variables and secrets** (entorno *Production*):

- `API_ORIGEN` = `https://origen-api.antonioooj.dev`
- `PROXY_SECRET` (tipo *Secret*) = el mismo valor que en `api/.env.production`

Tras cambiarlas hay que volver a desplegar (Deployments → Retry deployment, o un push).

## URLs de vuelta del login

- Discord (OAuth2 → Redirects): `https://antonioooj.dev/api/auth/discord/callback`
- Google (URI de redirección autorizado): `https://antonioooj.dev/api/auth/google/callback`
- GitHub (Authorization callback URL): `https://antonioooj.dev/api/auth/github/callback`
- Spotify (si se usa): `https://antonioooj.dev/api/spotify/callback`

Las de localhost se dejan para seguir probando en local.

## Arrancar a mano

```powershell
# API pública
powershell -ExecutionPolicy Bypass -File "api\produccion.ps1"
# Túnel
& "C:\Program Files (x86)\cloudflared\cloudflared.exe" tunnel run antonioooj-api
```

Para que arranquen solos al entrar en Windows: dos tareas programadas «al iniciar sesión»
(Programador de tareas) con esos mismos comandos.
