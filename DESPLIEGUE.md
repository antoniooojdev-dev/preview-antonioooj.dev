# Publicar antonioooj.dev (Cloudflare + VPS de netcup)

Cómo queda montado:

```
visitante → Cloudflare (DNS, HTTPS, caché, anti-DDoS) → VPS netcup (Ubuntu)
                                                        nginx ─┬─ web estática (dist/)
                                                               └─ /api → API del chat (127.0.0.1:8002)
```

Los pasos van en orden. Lo que pone `<...>` lo cambias por tu valor.

---

## 1. Comprar el dominio en Cloudflare

1. Crea una cuenta en <https://dash.cloudflare.com/sign-up> (activa la verificación en dos pasos:
   **My Profile → Authentication**).
2. **Domain Registration → Register Domains** → busca `antonioooj.dev` → cómpralo.
   Cloudflare lo vende a precio de coste y crea solo la zona DNS del dominio.
3. Los `.dev` solo funcionan con HTTPS (el navegador lo obliga). Con Cloudflare no hay que hacer nada más.

## 2. Contratar el servidor en netcup

(OVH no tenía VPS en Europa y Hetzner no admite PayPal al darse de alta; se usa netcup, en Alemania,
que acepta PayPal.)

1. Antes, en tu PC (PowerShell), crea una clave SSH si no tienes una:
   ```powershell
   ssh-keygen -t ed25519 -C "vps-antonioooj"
   type $env:USERPROFILE\.ssh\id_ed25519.pub     # esto es lo que se pega en netcup
   ```
2. En <https://www.netcup.com/es> → **Servidores → VPS** → **VPS 500 G12.5** (2 vCores, 4 GB, 64 GB):
   - **Duración**: 12 o 24 meses (por mes sale bastante más caro y se pasa de 10 €).
   - **Ubicación**: Núremberg (NUE). La ubicación no se puede cambiar después.
   - Al carrito → crea la cuenta de cliente → paga con **PayPal**. Revisa el total: el precio
     de la web lleva el IVA alemán y en España se aplica el 21 %.
3. Llegan dos emails: el del **panel de cliente (CCP)**, <https://www.customercontrolpanel.de>, y el
   del **panel del servidor (SCP)**, <https://www.servercontrolpanel.de>. Activa la verificación en
   dos pasos en los dos.
4. Instala Ubuntu desde el SCP: tu servidor → **Medien / Media** → **Images** → **Ubuntu 24.04** →
   usa todo el disco → elige entrar con **clave SSH** y pega la del paso 1 → instalar (unos minutos).
   En **Netzwerk / Network** del SCP están la **IPv4** y la **IPv6** del servidor.
5. Se entra como `root`. Crea tu usuario `ubuntu` (el que usa el resto de la guía) y pásale la clave:
   ```powershell
   ssh root@<IP_DEL_VPS>
   ```
   ```bash
   adduser ubuntu                      # te pide una contraseña: es la de sudo, apúntala
   usermod -aG sudo ubuntu
   rsync --archive --chown=ubuntu:ubuntu ~/.ssh /home/ubuntu
   exit
   ```
6. Comprueba que entras con él:
   ```powershell
   ssh ubuntu@<IP_DEL_VPS>
   ```
   A partir de aquí, todo con `ubuntu`. En el paso 5 se prohíbe entrar como `root`.

## 3. DNS en Cloudflare

En Cloudflare → tu dominio → **DNS → Records**:

| Tipo  | Nombre | Contenido            | Proxy           |
|-------|--------|----------------------|-----------------|
| A     | `@`    | `<IPv4 del VPS>`     | Proxied (naranja) |
| AAAA  | `@`    | `<IPv6 del VPS>`     | Proxied (naranja) |
| CNAME | `www`  | `antonioooj.dev`     | Proxied (naranja) |

(La IPv6 está en el SCP → Network. Si `ip -6 addr` en el servidor no muestra ninguna dirección pública, sáltate la fila AAAA.)

## 4. Ajustes de Cloudflare

- **SSL/TLS → Overview**: modo **Full (strict)**. Nunca «Flexible» (iría sin cifrar hasta tu servidor).
- **SSL/TLS → Edge Certificates**: **Always Use HTTPS** activado y **Minimum TLS Version** 1.2.
- **SSL/TLS → Origin Server → Create Certificate**: deja RSA, `antonioooj.dev` y `*.antonioooj.dev`,
  15 años → **Create**. Copia el **certificado** y la **clave privada** (la clave solo se ve una vez);
  se instalan en el paso 7.
- **Speed → Optimization**: **Rocket Loader desactivado** (reescribe los scripts y rompe la web).
- **Scrape Shield**: **Email Address Obfuscation desactivado** (mete scripts en el HTML).
- **Caching**: deja la configuración por defecto. No crees reglas «Cache Everything»: `/api` no se
  debe cachear (la API ya manda `no-store` y Cloudflare lo respeta).

## 5. Preparar el servidor

Todo esto ya dentro del VPS (`ssh ubuntu@<IP_DEL_VPS>`):

```bash
# Sistema al día y paquetes
sudo apt update && sudo apt -y upgrade
sudo apt -y install nginx git python3-venv python3-pip ufw fail2ban

# Node.js 24 (el mismo que usas en tu PC)
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt -y install nodejs
node -v

# Usuario sin privilegios para la API (no puede iniciar sesión)
sudo useradd --system --no-create-home --shell /usr/sbin/nologin web
```

### Memoria de intercambio (swap)

Para que `npm run build` no se quede sin memoria en un servidor de 2–4 GB. Con más RAM no hace falta,
pero tampoco molesta:

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
free -h      # la fila «Swap» tiene que poner 2,0Gi
```

### SSH solo con clave

**Antes** comprueba que entras con tu clave (paso 2.4). Después:

```bash
# «01-»: sshd se queda con el primer valor que lee, y la imagen de Ubuntu puede traer un
# 50-cloud-init.conf que activa las contraseñas
echo -e "PasswordAuthentication no\nPermitRootLogin no" | sudo tee /etc/ssh/sshd_config.d/01-solo-clave.conf
sudo systemctl restart ssh
```

Sin cerrar esa ventana, abre otra y comprueba que sigues entrando con `ssh ubuntu@<IP_DEL_VPS>`.

`fail2ban` ya bloquea solo a quien prueba contraseñas por SSH, y Ubuntu instala las
actualizaciones de seguridad sin que hagas nada (`unattended-upgrades`).

### Cortafuegos: la web solo acepta conexiones de Cloudflare

Así nadie puede saltarse Cloudflare atacando directamente la IP del VPS:

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow OpenSSH
for ip in $(curl -s https://www.cloudflare.com/ips-v4) $(curl -s https://www.cloudflare.com/ips-v6); do
  sudo ufw allow from "$ip" to any port 80,443 proto tcp
done
sudo ufw enable
sudo ufw status
```

## 6. Subir la web y la API

```bash
sudo mkdir -p /var/www && sudo chown ubuntu:ubuntu /var/www
git clone https://github.com/antoniooojdev-dev/preview-antonioooj.dev.git /var/www/antonioooj.dev
cd /var/www/antonioooj.dev

# Web estática → dist/
npm ci
npm run build

# API
cd api
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
mkdir -p data
sudo chown web:web data && sudo chmod 700 data
cp .env.example .env
sudo chown ubuntu:web .env && chmod 640 .env
```

### El `.env` de producción

Genera una clave para las sesiones:

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(48))"
```

Abre `nano .env` y deja así estas líneas (el resto, las mismas claves que en tu PC):

```ini
PUBLIC_URL=https://antonioooj.dev
DEMO_LOGIN=0
SESSION_SECRET=<la clave que acabas de generar>
ADMIN_DISCORD_IDS=<tu ID de Discord, igual que en tu PC>
DISCORD_CLIENT_ID=<igual que en tu PC>
DISCORD_CLIENT_SECRET=<igual que en tu PC>
DISCORD_NOTIFY_BOT_TOKEN=<igual que en tu PC>
SPOTIFY_CLIENT_ID=<igual que en tu PC>
SPOTIFY_CLIENT_SECRET=<igual que en tu PC>
SPOTIFY_REDIRECT_URI=https://antonioooj.dev/api/spotify/callback
GITHUB_CLIENT_ID=<los de la app de GitHub de producción, ver paso 9>
GITHUB_CLIENT_SECRET=<...>
```

`DEMO_LOGIN=0` es **obligatorio**. Guarda con `Ctrl+O`, `Enter`, `Ctrl+X`.

La base de datos empieza vacía en el servidor (chats, proyectos y opiniones de tu PC no se copian).
Al entrar por primera vez con tu Discord eres el admin; Spotify hay que volver a conectarlo desde «Sobre mí».

## 7. Certificado de Cloudflare

```bash
sudo mkdir -p /etc/ssl/cloudflare
sudo nano /etc/ssl/cloudflare/antonioooj.dev.pem   # pega el certificado del paso 4
sudo nano /etc/ssl/cloudflare/antonioooj.dev.key   # pega la clave privada
sudo chmod 600 /etc/ssl/cloudflare/antonioooj.dev.key
```

## 8. nginx

### IP real de los visitantes

Con el proxy de Cloudflare, a nginx le llega la IP de Cloudflare. Sin esto, los límites de la API
(intentos de login, opiniones, peticiones por minuto) tratarían a todo el mundo como un único visitante:

```bash
{
  for ip in $(curl -s https://www.cloudflare.com/ips-v4) $(curl -s https://www.cloudflare.com/ips-v6); do
    echo "set_real_ip_from $ip;"
  done
  echo "real_ip_header CF-Connecting-IP;"
} | sudo tee /etc/nginx/conf.d/cloudflare-ip-real.conf

# Límite de peticiones a la API por IP (además del que aplica la propia API)
echo 'limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;' | sudo tee /etc/nginx/conf.d/limites.conf
```

Cloudflare cambia sus rangos muy de vez en cuando; si algún día los límites fallan, repite los dos
bloques `for` (este y el del cortafuegos).

### La web

`sudo nano /etc/nginx/sites-available/antonioooj.dev` y pega:

```nginx
# http → https
server {
    listen 80;
    listen [::]:80;
    server_name antonioooj.dev www.antonioooj.dev;
    return 301 https://antonioooj.dev$request_uri;
}

# www → sin www
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    http2 on;
    server_name www.antonioooj.dev;
    ssl_certificate     /etc/ssl/cloudflare/antonioooj.dev.pem;
    ssl_certificate_key /etc/ssl/cloudflare/antonioooj.dev.key;
    return 301 https://antonioooj.dev$request_uri;
}

server {
    listen 443 ssl;
    listen [::]:443 ssl;
    http2 on;
    server_name antonioooj.dev;
    ssl_certificate     /etc/ssl/cloudflare/antonioooj.dev.pem;
    ssl_certificate_key /etc/ssl/cloudflare/antonioooj.dev.key;

    root /var/www/antonioooj.dev/dist;
    server_tokens off;
    absolute_redirect off;
    client_max_body_size 256k;
    error_page 404 /404.html;

    # Cabeceras de seguridad de la web (las mismas que public/_headers)
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=(), usb=()" always;
    add_header Cross-Origin-Opener-Policy "same-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: blob: https:; media-src 'self' blob:; connect-src 'self' https://api.web3forms.com; form-action 'self' https://api.web3forms.com; frame-src 'self' https://www.youtube-nocookie.com; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; frame-ancestors 'self'; upgrade-insecure-requests" always;

    # Lo que no debe verse: borradores, el archivo de cabeceras de Netlify y archivos ocultos
    location ~ ^/(test|pruebas)\.html$ { return 404; }
    location = /_headers { return 404; }
    location ~ /\.(?!well-known) { return 404; }

    # CSS/JS con hash en el nombre: se pueden cachear un año
    location /_astro/ {
        expires 1y;
        try_files $uri =404;
    }

    location /api/ {
        limit_req zone=api burst=40 nodelay;
        # Cualquier add_header aquí hace que no se hereden las de la web: la API pone las suyas
        add_header X-Robots-Tag "noindex, nofollow" always;
        proxy_pass http://127.0.0.1:8002;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header X-Forwarded-Proto https;
        proxy_read_timeout 30s;
    }

    location / {
        try_files $uri $uri/ $uri.html =404;
    }
}
```

Actívala:

```bash
sudo ln -s /etc/nginx/sites-available/antonioooj.dev /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

## 9. Logins de Discord, GitHub, Google y Spotify

Cada proveedor tiene que conocer la dirección de vuelta de producción:

- **Discord** (<https://discord.com/developers/applications> → tu app → **OAuth2 → Redirects**):
  añade `https://antonioooj.dev/api/auth/discord/callback` (deja también la de localhost).
- **GitHub** (<https://github.com/settings/developers> → **OAuth Apps**): una app de GitHub solo
  admite una dirección de vuelta, así que crea **otra app para producción** con
  Homepage `https://antonioooj.dev` y callback `https://antonioooj.dev/api/auth/github/callback`,
  y pon su Client ID y Secret en el `.env` del servidor.
- **Google** (opcional, ahora está sin configurar): en Google Cloud Console → Credenciales → ID de
  cliente OAuth, URI de redirección `https://antonioooj.dev/api/auth/google/callback`.
- **Spotify** (<https://developer.spotify.com/dashboard> → tu app → **Settings → Redirect URIs**):
  añade `https://antonioooj.dev/api/spotify/callback`.

## 10. La API como servicio

`sudo nano /etc/systemd/system/antonioooj-api.service`:

```ini
[Unit]
Description=API de antonioooj.dev
After=network.target

[Service]
User=web
Group=web
WorkingDirectory=/var/www/antonioooj.dev/api
ExecStart=/var/www/antonioooj.dev/api/.venv/bin/uvicorn main:app --host 127.0.0.1 --port 8002 --proxy-headers --forwarded-allow-ips 127.0.0.1
Restart=always
RestartSec=3
# Encerrada: no puede ganar privilegios ni tocar el sistema ni las carpetas personales
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
ProtectHome=true

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now antonioooj-api
sudo systemctl status antonioooj-api       # tiene que poner «active (running)»
curl -s http://127.0.0.1:8002/api/health   # {"ok":true}
```

## 11. Comprobar que todo funciona

- <https://antonioooj.dev> carga, y `http://` y `www.` te llevan a `https://antonioooj.dev`.
- <https://antonioooj.dev/api/health> devuelve `{"ok":true}`.
- Entra con Discord desde `/login`: vuelves a la web con tu avatar y ves el botón «Admin».
- `/admin` abre el panel; en «Sobre mí» conecta Spotify.
- Abre un ticket desde otra cuenta (o pídeselo a alguien) y respóndelo desde `/chat`.
- Revisa las cabeceras en <https://securityheaders.com/?q=antonioooj.dev>.
- Si algo no carga: F12 → **Consola**. Un error «Content Security Policy» dice qué dominio falta.
- Si la API falla: `sudo journalctl -u antonioooj-api -n 50`.

## 12. Publicar cambios después

Desde tu PC subes los cambios a GitHub como siempre. Luego, en el VPS:

```bash
cd /var/www/antonioooj.dev
git pull
npm ci && npm run build                      # si cambiaste la web
api/.venv/bin/pip install -r api/requirements.txt   # si cambiaste requirements.txt
sudo systemctl restart antonioooj-api        # si cambiaste algo de api/
```

Si Cloudflare sigue enseñando lo de antes: **Caching → Configuration → Purge Everything**.

## Opcional

- **Formulario de contacto**: ahora abre el correo del visitante (`mailto:`). Para recibirlo
  directamente, saca una clave gratuita en <https://web3forms.com> y ponla en `web3formsKey` de
  `src/data/site.ts`.
- **Demos activas** (servidor-gta, ClickSense): en producción salen como «Publicación
  próximamente». Para publicarlas hace falta un subdominio por demo (p. ej.
  `demo-gta.antonioooj.dev`) con su propio servicio y bloque de nginx; caben en este mismo VPS.
- **Copias de seguridad**: netcup incluye instantáneas (SCP → Snapshots): haz una antes de cada cambio grande. Lo importante es `api/data/`
  (base de datos y claves) y `api/.env`.
