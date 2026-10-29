# API del chat (/chat)

Backend del chat de la web: FastAPI + SQLite (`data/chat.db`). Los clientes entran con
Discord y hablan contigo; tú entras con tu Discord (`ADMIN_DISCORD_IDS`) y en la misma
página `/chat` ves todas las conversaciones y respondes.

## En local

`npm run dev` en el portfolio arranca esta API sola (puerto 8002) y Astro reenvía `/api`
a ella. Con `DEMO_LOGIN=1` en `.env`, la página `/chat` muestra dos enlaces para entrar
sin Discord: «entrar como cliente» y «entrar como admin».

Si hace falta instalarla de cero:

```powershell
cd api
python -m venv .venv
.venv\Scripts\python -m pip install -r requirements.txt
copy .env.example .env   # y rellénalo
```

## Configurar Discord

1. <https://discord.com/developers/applications> → **New Application** (p. ej. «antonioooj.dev»).
2. **OAuth2** → copia **Client ID** y **Client Secret** a `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET`.
3. **OAuth2 → Redirects** → añade `<PUBLIC_URL>/api/auth/discord/callback`:
   - local: `http://localhost:4321/api/auth/discord/callback`
   - producción: `https://antonioooj.dev/api/auth/discord/callback`

Solo se pide el permiso `identify` (nombre y avatar).

## Publicar

La web sigue siendo estática (`npm run build` → `dist/`). La API necesita un servidor
con Python (un VPS) y que `/api` llegue a ella desde el mismo dominio. Ejemplo con nginx:

```nginx
server {
    server_name antonioooj.dev;
    root /var/www/antonioooj.dev/dist;
    server_tokens off;
    client_max_body_size 256k;

    # Cabeceras de seguridad para la web estática (la API pone las suyas).
    # Si alguna página deja de cargar algo, mira la consola del navegador y añade ese dominio.
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    # SAMEORIGIN (no DENY): las demos jugables de /servicios/fivem/... se cargan en un iframe de la propia web
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=()" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'self'" always;

    # Páginas de pruebas/borradores que están en public/ y no deben verse en producción
    location ~ ^/(test|pruebas)\.html$ { return 404; }

    # Límite de peticiones a la API por IP (además del que ya aplica la propia API)
    # (en el bloque http {}: limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;)
    # limit_req zone=api burst=40 nodelay;

    location /api/ {
        proxy_pass http://127.0.0.1:8002;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        try_files $uri $uri.html $uri/ =404;
    }
}
```

Y la API como servicio: `.venv/bin/uvicorn main:app --host 127.0.0.1 --port 8002`.

`.env` de producción:

- `PUBLIC_URL=https://antonioooj.dev` (con https la cookie se marca `Secure`).
- `DEMO_LOGIN=0` — **obligatorio**.
- `SESSION_SECRET=` una cadena aleatoria larga.
- `PANEL_KEY=` la clave con la que se cifran los tokens pegados en el panel (o copia
  `data/.panel_key`); sin ella no se pueden descifrar.
- `ADMIN_SESSION_HOURS=24` (opcional): horas que vale un login para usar el panel; pasado ese
  tiempo hay que volver a entrar con Discord aunque la sesión de la web siga abierta.
- Que `data/` (chat.db, .session_secret, .panel_key, transcripciones) solo la pueda leer el
  usuario del servicio: `chmod 700 data`.

Si prefieres la API en otro dominio (p. ej. `https://api.antonioooj.dev`), pon esa
dirección en `chatApi` de `src/data/site.ts` y en el `.env` de la API
`API_URL=https://api.antonioooj.dev` y `ALLOWED_ORIGINS=https://antonioooj.dev`. En ese caso
la redirección de Discord es `https://api.antonioooj.dev/api/auth/discord/callback` y
`PUBLIC_URL` sigue siendo la web.

## Cuenta y login

`/login?volver=/chat` (o `/contacto`, `/cuenta`, `/admin`): entra con Discord y vuelve a esa
página. La sesión no es permanente: la cookie se borra al cerrar el navegador, caduca tras
`SESSION_IDLE_MINUTES` (120) sin usar la web y, aunque se use, a las `SESSION_MAX_HOURS` (12)
del login hay que volver a entrar. Al cerrar sesión se borran también la caché y el
localStorage de la web (`Clear-Site-Data`). `/cuenta` muestra los datos de Discord, el botón de cerrar
sesión y los proyectos del cliente. La cabecera muestra el avatar y, al admin, el botón «Admin».

## «Ahora mismo» en «Sobre mí»

La tarjeta muestra tu **modo** (Disponible, Programando, Agenda llena, En una reunión, En
descanso, Fuera de horario, De vacaciones) con un mensaje opcional, y tu **estado de Discord**
en vivo (en línea / ausente / no molestar / desconectado, dispositivo y actividad: estado
personalizado, juego, Spotify…). La etiqueta de arriba del index también muestra el modo.

- Cambiar el modo: entra con tu Discord, ve a «Sobre mí» y pulsa «Cambiar mi estado».
- Estado de Discord (`presencia.py`): en el Developer Portal, tu app → **Bot**:
  1. «Reset Token» y pégalo en `DISCORD_BOT_TOKEN` de `api/.env`.
  2. Activa **Presence Intent** y **Server Members Intent**.
  3. Invítalo a un servidor en el que estés:
     `https://discord.com/oauth2/authorize?client_id=<DISCORD_CLIENT_ID>&scope=bot&permissions=0`
  Si algo falla, en «Sobre mí» (solo tú) sale el motivo.

## Proyectos y /estado-proyecto

En `/admin` → «Proyectos» se crea cada proyecto (estado, progreso, entrega, descripción) y se
vincula al ticket (chat) de un cliente. Cada cambio y cada nota se guardan en el historial y,
con «Avisar» marcado, se publican como mensaje del sistema en el chat del cliente.

En el chat, `/estado-proyecto` responde con el estado de todos sus proyectos (el admin
también puede usarlo dentro de un ticket para publicárselo al cliente).

## Panel de administración (/admin)

Solo entran los IDs de `ADMIN_DISCORD_IDS`. Gestiona tus bots de Discord:

- **Servidores** donde está cada bot (miembros, si es admin) y botón para **expulsarlo**.
- **Comandos** registrados: globales y los de cada servidor.
- **Carpeta**: ruta, tipo de proyecto, librería, cómo arrancarlo, variables del `.env`
  (solo nombres) y si hay procesos de Python/Node ejecutándose ahí.
- **Añadir a servidor**: genera el enlace de invitación con los permisos elegidos.

Discord no permite listar los bots de tu Developer Portal desde fuera, así que cada uno
se da de alta una vez en «Añadir»: el panel busca proyectos de bots en tu carpeta
(`BOTS_ROOTS`) y lee el token de su `.env` (`DISCORD_BOT_TOKEN`, `DISCORD_TOKEN`,
`BOT_TOKEN` o `TOKEN`) cada vez que lo necesita, sin copiarlo. Si no hay `.env`, se puede
pegar el token y se guarda cifrado. El token nunca se envía al navegador.

Añadir el bot a un servidor nuevo siempre lo confirma una persona en Discord (el panel
da el enlace). «Abrir carpeta» solo funciona con la API en tu PC.

## Seguridad

- Sesión en cookie `HttpOnly` firmada con HMAC (no se puede falsificar el ID).
- Las peticiones que cambian datos solo se aceptan desde la propia web (cabecera `Origin`).
- Cada cliente solo ve su conversación; las rutas `/api/admin/*` y `/api/panel/*` exigen tu ID
  y un login de menos de `ADMIN_SESSION_HOURS` horas (24 por defecto).
- Máximo 2000 caracteres por mensaje y 20 mensajes por minuto por cliente.
- Los mensajes se pintan como texto, nunca como HTML.
