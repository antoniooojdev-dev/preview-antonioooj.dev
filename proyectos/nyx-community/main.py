import os
import re
import base64
import json
import secrets
import tempfile
import threading
import html as html_lib
from urllib.parse import urlsplit
from datetime import datetime, timezone, timedelta
from fastapi import FastAPI, Depends, HTTPException, Request, Response, Cookie, BackgroundTasks
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import Column, String, DateTime, Boolean
from sqlalchemy.orm import Session
from pydantic import BaseModel
import requests
from dotenv import load_dotenv

import models
import schemas
import notifier
import seguridad
from database import engine, get_db

load_dotenv()


# ==========================================
# 0. TABLAS EXTRA (perfil y preferencias de notificación)
# ==========================================
# Se definen aquí para no tener que modificar models.py.
# Deben declararse ANTES de create_all para que se creen las tablas.
class PerfilUsuarioDB(models.Base):
    __tablename__ = "perfiles_usuario"

    discord_id = Column(String, primary_key=True, index=True)
    steam = Column(String, nullable=True)
    nacionalidad = Column(String, nullable=True)
    fecha_nacimiento = Column(String, nullable=True)
    actualizado = Column(DateTime, default=datetime.utcnow)


class PreferenciaNotifDB(models.Base):
    """Usuarios que han pulsado la campanita de novedades en home.html."""
    __tablename__ = "preferencias_notificaciones"

    discord_id = Column(String, primary_key=True, index=True)
    activas = Column(Boolean, default=False)
    actualizado = Column(DateTime, default=datetime.utcnow)


models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Nyx Community API", version="1.0", docs_url=None, redoc_url=None, openapi_url=None)

# Sesión firmada + bloqueo de peticiones desde otras webs + cabeceras de seguridad (ver seguridad.py)
app.add_middleware(seguridad.SeguridadMiddleware)


# ---------- Sin caché para las páginas, CSS y JS de la web ----------
# El navegador vuelve a preguntar al servidor cada vez (si no han cambiado, recibe un 304
# y no se descarga nada), así los cambios se ven al recargar sin tener que vaciar la caché.
@app.middleware("http")
async def sin_cache_en_paginas(request: Request, call_next):
    response = await call_next(request)
    ruta = request.url.path.lower()
    if ruta.endswith("/") or ruta.endswith((".html", ".css", ".js")):
        response.headers.setdefault("Cache-Control", "no-cache")
    return response

# ---------- Test de whitelist (whitelist_api.py, en la misma carpeta que este archivo) ----------
# Se carga aquí arriba para que sus rutas /api/whitelist... tengan prioridad.
# Si el archivo falta o tiene un error, la web NO se cae: se avisa en la consola y
# simplemente el test de whitelist no estará disponible hasta que se arregle.
try:
    import whitelist_api
    app.include_router(whitelist_api.router)
    print("[whitelist] ✅ Test de whitelist cargado.")
except Exception as e:
    print("[whitelist] ❌ No se pudo cargar whitelist_api.py (¿está junto a main.py?):", repr(e))

try:
    import feedback_api
    app.include_router(feedback_api.router)
except Exception as e:
    print("[feedback] ❌ No se pudo cargar feedback_api.py:", repr(e))

STEAM_REGEX = re.compile(
    r"^https?://(www\.)?steamcommunity\.com/(id/[a-zA-Z0-9_-]+|profiles/\d+)/?$"
)
BIRTH_REGEX = re.compile(r"^\d{2}/\d{2}/\d{4}$")

PAISES_VALIDOS = {
    "España", "Francia", "Alemania", "Italia", "Reino Unido", "Portugal",
    "Países Bajos", "Suecia", "México", "Argentina", "Colombia", "Chile",
    "Perú", "Estados Unidos", "Uruguay", "Venezuela",
}

# IDs de Discord del staff que puede publicar novedades (en .env: STAFF_DISCORD_IDS=id1,id2)
# Si se deja vacío, basta con tener sesión iniciada.
STAFF_IDS = {i.strip() for i in os.getenv("STAFF_DISCORD_IDS", "").split(",") if i.strip()}

# ID de Discord con acceso total a la gestión de staff. Es el mismo MASTER_ADMIN_ID
# que hay en public/admin/staff.html. Se puede cambiar en .env: MASTER_ADMIN_ID=tu_id
MASTER_ADMIN_ID = os.getenv("MASTER_ADMIN_ID", "732650490588037160").strip()

# Carpeta de datos: siempre junto a main.py, sin depender de desde dónde se lance el servidor
DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
NOVEDADES_FILE = os.path.join(DATA_DIR, "novedades.json")
PERFIL_FILE = os.path.join(DATA_DIR, "perfiles.json")
SUGERENCIAS_FILE = os.path.join(DATA_DIR, "sugerencias.json")
TICKETS_FILE = os.path.join(DATA_DIR, "tickets.json")
FOTOS_FILE = os.path.join(DATA_DIR, "fotografias.json")
STAFF_FILE = os.path.join(DATA_DIR, "staff.json")
TRANSCRIPTS_DIR = os.path.join(DATA_DIR, "transcripts")

# Fotografías que suben los usuarios desde perfil.html. Los archivos se guardan en
# data/fotos y se sirven en /fotos/<archivo>; la lista de cada usuario va en fotografias.json.
FOTOS_DIR = os.path.join(DATA_DIR, "fotos")
MAX_FOTOS_POR_USUARIO = 12
MAX_FOTO_BYTES = 4 * 1024 * 1024   # 4 MB por imagen (el navegador ya la reduce antes de enviarla)

# Comercios: los registra el staff en admin/comercios.html y se ven en comercios.html.
# La lista va en data/comercios.json y sus imágenes en data/comercios_img (servidas en /comercios-img/...).
COMERCIOS_FILE = os.path.join(DATA_DIR, "comercios.json")
COMERCIOS_IMG_DIR = os.path.join(DATA_DIR, "comercios_img")
MAX_COMERCIOS = 300
MAX_IMG_POR_COMERCIO = 3

# Dirección pública de la web (para los enlaces que se envían por Discord). En .env: PUBLIC_URL=https://tudominio.com
PUBLIC_URL = os.getenv("PUBLIC_URL", "http://localhost:8000").rstrip("/")

_file_lock = threading.Lock()


def leer_json(path: str, default):
    """Lee un JSON; si no existe o está roto devuelve el valor por defecto."""
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except (FileNotFoundError, ValueError, OSError):
        return default


def escribir_json(path: str, data) -> None:
    """Escritura atómica: se escribe en un temporal y se reemplaza, así nunca queda un archivo a medias."""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with _file_lock:
        fd, tmp = tempfile.mkstemp(dir=os.path.dirname(path), suffix=".tmp")
        try:
            with os.fdopen(fd, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False)
            os.replace(tmp, path)
        finally:
            if os.path.exists(tmp):
                os.remove(tmp)


class NovedadIn(BaseModel):
    id: str
    titulo: str
    descripcion: str
    categoria: str = "Comunicados"
    destacada: bool = False
    autor: str = "Staff"
    avatarUrl: str | None = None
    fecha: str | None = None


def _require_staff(discord_id: str | None):
    # Antes, con STAFF_DISCORD_IDS vacío bastaba con tener sesión: cualquier usuario podía
    # publicar novedades y mandar un MD a todos. Ahora hace falta ser staff de verdad
    # (ID maestro, STAFF_DISCORD_IDS o staff activo en data/staff.json).
    if not discord_id:
        raise HTTPException(status_code=401, detail="No hay sesión activa")
    if not _es_staff(discord_id):
        raise HTTPException(status_code=403, detail="Solo el staff puede hacer esto")


def _encode_pending(data: dict) -> str:
    raw = json.dumps(data, ensure_ascii=False).encode("utf-8")
    return base64.urlsafe_b64encode(raw).decode("ascii")


def _decode_pending(value: str):
    try:
        raw = base64.urlsafe_b64decode(value.encode("ascii"))
        data = json.loads(raw.decode("utf-8"))
        return data if isinstance(data, dict) else None
    except Exception:
        return None


# ==========================================
# 1. AUTENTICACIÓN CON DISCORD
# ==========================================

# Debe coincidir con el Redirect de Discord Developer Portal. En .env: REDIRECT_URI=...
REDIRECT_URI = (os.getenv("REDIRECT_URI") or f"{PUBLIC_URL}/auth/discord/callback").strip()
_OAUTH_STATE_COOKIE = "oauth_state"


def _redireccion(url: str) -> Response:
    return Response(status_code=302, headers={"Location": url, "Cache-Control": "no-store"})


@app.get("/auth/discord/login")
def discord_login():
    """
    Empieza el login con Discord. Genera un 'state' aleatorio que se guarda en una cookie
    y viaja a Discord: al volver se comprueba que coincide. Así nadie puede colarle a otro
    usuario un login con su propia cuenta (login CSRF).
    """
    from urllib.parse import urlencode
    if not (os.getenv("DISCORD_CLIENT_ID") or "").strip():
        return _redireccion("/login.html?error=discord-sin-configurar")
    state = secrets.token_urlsafe(24)
    url = "https://discord.com/api/oauth2/authorize?" + urlencode({
        "client_id": os.getenv("DISCORD_CLIENT_ID") or "",
        "redirect_uri": REDIRECT_URI,
        "response_type": "code",
        "scope": "identify guilds",
        "state": state,
    })
    resp = _redireccion(url)
    resp.set_cookie(_OAUTH_STATE_COOKIE, state, max_age=600, httponly=True, samesite="lax",
                    secure=seguridad.cookie_segura(), path="/auth/discord")
    return resp


# ---------- Acceso de demostración (solo local) ----------
# Sirve para enseñar la web sin configurar Discord. Solo funciona con DEMO_LOGIN=1 en .env,
# cuando la petición llega desde este mismo PC Y se abre como localhost/127.0.0.1 (si la web
# está detrás de un proxy en producción, el Host es el dominio público y queda bloqueado).
# DESACTIVAR (DEMO_LOGIN=0) ANTES DE PUBLICAR LA WEB.
DEMO_LOGIN = os.getenv("DEMO_LOGIN", "0").strip() == "1"
DEMO_DISCORD_ID = os.getenv("DEMO_DISCORD_ID", "100000000000000001").strip()
_HOSTS_LOCALES = {"localhost", "127.0.0.1", "[::1]"}


def _es_local(request: Request) -> bool:
    cliente = request.client.host if request.client else ""
    host = (request.headers.get("host") or "").rsplit(":", 1)[0].lower()
    # Detrás de un proxy (nginx en el mismo servidor) la IP también es 127.0.0.1 y el Host lo
    # elige quien visita: por eso se exige además que no venga reenviada y que la propia web
    # esté configurada en local (PUBLIC_URL). Con la web publicada, nunca hay modo demo.
    reenviada = request.headers.get("x-forwarded-for") or request.headers.get("x-real-ip")
    publica_local = urlsplit(PUBLIC_URL).hostname in {"localhost", "127.0.0.1"}
    return cliente in {"127.0.0.1", "::1"} and host in _HOSTS_LOCALES and not reenviada and publica_local


@app.get("/api/auth/demo-disponible")
def demo_disponible(request: Request):
    """login.html lo consulta para mostrar (o no) el botón de modo demo."""
    return {"demo": DEMO_LOGIN and _es_local(request)}


@app.get("/auth/demo", response_class=HTMLResponse)
def demo_login(request: Request, db: Session = Depends(get_db)):
    if not (DEMO_LOGIN and _es_local(request)):
        raise HTTPException(status_code=404, detail="No disponible")
    usuario = db.query(models.UsuarioDB).filter(models.UsuarioDB.discord_id == DEMO_DISCORD_ID).first()
    if not usuario:
        usuario = models.UsuarioDB(discord_id=DEMO_DISCORD_ID, username="Demo Nyx", avatar=None)
        db.add(usuario)
    usuario.ultimo_login = datetime.utcnow()
    perfil = db.query(PerfilUsuarioDB).filter(PerfilUsuarioDB.discord_id == DEMO_DISCORD_ID).first()
    if not perfil:
        db.add(PerfilUsuarioDB(
            discord_id=DEMO_DISCORD_ID,
            steam="https://steamcommunity.com/id/nyxdemo",
            nacionalidad="España",
            fecha_nacimiento="01/01/2000",
        ))
    db.commit()
    datos = {
        "id": DEMO_DISCORD_ID,
        "username": "demo.nyx",
        "displayName": "Demo Nyx",
        "avatarUrl": "https://cdn.discordapp.com/embed/avatars/0.png",
    }
    html = f"""<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Entrando… | Nyx Community</title></head>
    <body style="background:#06040c"><script>
        localStorage.setItem('discord_user', JSON.stringify({seguridad.json_para_script(datos)}));
        window.location.replace('/login.html?auth=1');
    </script></body></html>"""
    resp = HTMLResponse(content=html, headers={"Cache-Control": "no-store"})
    seguridad.poner_sesion(resp, DEMO_DISCORD_ID)
    return resp


@app.get("/auth/discord/callback", response_class=HTMLResponse)
def discord_auth_callback(
    request: Request,
    code: str = "",
    state: str = "",
    pending_profile: str = Cookie(None),
    db: Session = Depends(get_db),
):
    esperado = request.cookies.get(_OAUTH_STATE_COOKIE) or ""
    if not code or not state or not esperado or not secrets.compare_digest(state, esperado):
        # Sin 'state' válido no se acepta el código: se vuelve a empezar el login
        return _redireccion("/auth/discord/login")

    token_url = "https://discord.com/api/oauth2/token"
    client_id = os.getenv("DISCORD_CLIENT_ID")
    client_secret = os.getenv("DISCORD_CLIENT_SECRET")
    redirect_uri = REDIRECT_URI

    data = {
        "client_id": client_id,
        "client_secret": client_secret,
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": redirect_uri,
    }
    headers = {"Content-Type": "application/x-www-form-urlencoded"}

    try:
        response_discord = requests.post(token_url, data=data, headers=headers, timeout=10)
    except requests.RequestException as e:
        print("❌ No se pudo contactar con Discord:", e)
        raise HTTPException(status_code=502, detail="No se pudo contactar con Discord. Inténtalo de nuevo.")

    if response_discord.status_code != 200:
        # El detalle va a la consola del servidor; al usuario, un mensaje genérico
        try:
            print("❌ ERROR REAL DE DISCORD:", response_discord.json())
        except ValueError:
            print("❌ ERROR REAL DE DISCORD:", response_discord.status_code)
        raise HTTPException(status_code=400, detail="No se pudo autenticar con Discord. Vuelve a intentarlo.")

    access_token = response_discord.json().get("access_token")
    user_headers = {"Authorization": f"Bearer {access_token}"}
    try:
        user_response = requests.get("https://discord.com/api/users/@me", headers=user_headers, timeout=10)
    except requests.RequestException:
        raise HTTPException(status_code=502, detail="No se pudo obtener el perfil de Discord")

    if user_response.status_code != 200:
        raise HTTPException(status_code=400, detail="No se pudo obtener el perfil de Discord")

    user_info = user_response.json()
    discord_id = str(user_info.get("id") or "")
    if not re.fullmatch(r"\d{5,25}", discord_id):
        raise HTTPException(status_code=400, detail="Respuesta de Discord no válida")
    username = seguridad.neutralizar(str(user_info.get("username") or "")[:64])
    avatar = user_info.get("avatar")
    if avatar and not re.fullmatch(r"(a_)?[0-9a-f]{32}", str(avatar)):
        avatar = None

    avatar_url = f"https://cdn.discordapp.com/avatars/{discord_id}/{avatar}.png" if avatar else "https://cdn.discordapp.com/embed/avatars/0.png"

    usuario = db.query(models.UsuarioDB).filter(models.UsuarioDB.discord_id == discord_id).first()
    es_nuevo = usuario is None

    if es_nuevo:
        usuario = models.UsuarioDB(
            discord_id=discord_id,
            username=username,
            avatar=avatar,
        )
        db.add(usuario)
    else:
        usuario.username = username
        usuario.avatar = avatar
        usuario.ultimo_login = datetime.utcnow()

    # Guardamos los datos adjuntados en el login (Steam, nacionalidad, nacimiento)
    if pending_profile:
        pending = _decode_pending(pending_profile)
        # La cookie temporal la controla el navegador: se vuelven a validar los datos
        if pending and not (
            STEAM_REGEX.match(str(pending.get("steam") or ""))
            and BIRTH_REGEX.match(str(pending.get("birth") or ""))
            and str(pending.get("country") or "") in PAISES_VALIDOS
        ):
            pending = None
        if pending:
            perfil = db.query(PerfilUsuarioDB).filter(PerfilUsuarioDB.discord_id == discord_id).first()
            if not perfil:
                perfil = PerfilUsuarioDB(discord_id=discord_id)
                db.add(perfil)
            perfil.steam = pending.get("steam")
            perfil.nacionalidad = pending.get("country")
            perfil.fecha_nacimiento = pending.get("birth")
            perfil.actualizado = datetime.utcnow()

    db.commit()

    if es_nuevo:
        notifier.enviar_notificacion(
            discord_id=discord_id,
            tipo="registro",
            descripcion="Te acabas de registrar en la web de **Nyx Community**. ¡Bienvenido a la ciudad!",
        )

    # Preparamos el objeto de usuario para el frontend
    discord_user_data = {
        "id": discord_id,
        "username": username,
        "displayName": str(user_info.get("global_name") or username)[:64],
        "avatarUrl": avatar_url
    }

    # HTML de transición que guarda los datos en localStorage y vuelve a login.html
    html_content = f"""
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <title>Autenticando | Nyx Community</title>
        <style>
            body {{ background: #06040c; color: #fff; font-family: 'Plus Jakarta Sans', sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }}
            .loader-box {{ text-align: center; background: rgba(16, 12, 30, 0.9); padding: 40px; border-radius: 20px; border: 1px solid rgba(168, 85, 247, 0.3); box-shadow: 0 15px 35px rgba(0,0,0,0.8); }}
            h2 {{ color: #d8b4fe; margin-bottom: 10px; }}
            p {{ color: #94a3b8; font-size: 14px; }}
        </style>
    </head>
    <body>
        <div class="loader-box">
            <h2>¡Autenticación Exitosa!</h2>
            <p>Accediendo a Nyx Community...</p>
        </div>
        <script>
            const userData = {seguridad.json_para_script(discord_user_data)};
            localStorage.setItem('discord_user', JSON.stringify(userData));
            // login.html muestra la carga y decide: Home si ya está registrado, o el formulario si es la primera vez
            window.location.href = '/login.html?auth=1';
        </script>
    </body>
    </html>
    """

    # IMPORTANTE: las cookies se ponen sobre la respuesta que realmente se devuelve.
    # (Si se devuelve un HTMLResponse, las cookies del objeto Response inyectado se pierden.)
    html_response = HTMLResponse(content=html_content, headers={"Cache-Control": "no-store"})
    seguridad.poner_sesion(html_response, discord_id)        # cookie firmada: no se puede falsificar
    html_response.delete_cookie(key="pending_profile")
    html_response.delete_cookie(key=_OAUTH_STATE_COOKIE, path="/auth/discord")
    return html_response


@app.get("/api/auth/session")
async def get_session(discord_id: str = Cookie(None), db: Session = Depends(get_db)):
    if not discord_id:
        raise HTTPException(status_code=401, detail="No hay sesión activa")

    usuario = db.query(models.UsuarioDB).filter(models.UsuarioDB.discord_id == discord_id).first()
    if not usuario:
        raise HTTPException(status_code=401, detail="Usuario no encontrado")

    avatar_url = f"https://cdn.discordapp.com/avatars/{usuario.discord_id}/{usuario.avatar}.png" if usuario.avatar else "/src/assets/default-avatar.png"

    return {
        "id": usuario.discord_id,
        "username": usuario.username,
        "global_name": usuario.username,
        "avatar": usuario.avatar,
        "avatarUrl": avatar_url
    }

@app.post("/api/auth/logout")
def logout(response: Response, discord_id: str = Cookie(None)):
    # Además de borrar la cookie, se invalidan las copias que pudiera haber en otros sitios
    seguridad.revocar_sesiones(discord_id)
    seguridad.quitar_sesion(response)
    return {"success": True}


# ==========================================
# 1.B DATOS DE PERFIL ADJUNTADOS EN EL LOGIN
# ==========================================

@app.post("/api/user-profile-data")
async def guardar_datos_login(
    request: Request,
    response: Response,
    discord_id: str = Cookie(None),
    db: Session = Depends(get_db),
):
    """
    Guarda Steam, fecha de nacimiento y nacionalidad.
      - Con sesión iniciada (flujo actual: primero Discord, después los datos):
        se guardan directamente en la cuenta de Discord de la sesión.
      - Sin sesión (flujo antiguo): se guardan en una cookie temporal y se
        volcan a la base de datos en /auth/discord/callback.
    """
    try:
        data = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="JSON inválido")
    if not isinstance(data, dict):
        raise HTTPException(status_code=400, detail="Formato no válido")

    steam = str(data.get("steam", "")).strip()
    birth = str(data.get("birth", "")).strip()
    country = str(data.get("country", "")).strip()

    if not STEAM_REGEX.match(steam):
        raise HTTPException(status_code=400, detail="Enlace de Steam no válido")
    if not BIRTH_REGEX.match(birth):
        raise HTTPException(status_code=400, detail="Fecha de nacimiento no válida")
    if country not in PAISES_VALIDOS:
        raise HTTPException(status_code=400, detail="Nacionalidad no válida")

    # --- Con sesión: se guarda ya en la cuenta (el usuario sale de la cookie, nunca del cuerpo) ---
    if discord_id:
        usuario = db.query(models.UsuarioDB).filter(models.UsuarioDB.discord_id == discord_id).first()
        if usuario:
            perfil = db.query(PerfilUsuarioDB).filter(PerfilUsuarioDB.discord_id == discord_id).first()
            if not perfil:
                perfil = PerfilUsuarioDB(discord_id=discord_id)
                db.add(perfil)
            perfil.steam = steam
            perfil.nacionalidad = country
            perfil.fecha_nacimiento = birth
            perfil.actualizado = datetime.utcnow()
            db.commit()
            return {"success": True, "saved": True}

    # --- Sin sesión: cookie temporal hasta completar el login con Discord ---
    pending = _encode_pending({"steam": steam, "birth": birth, "country": country})
    response.set_cookie(
        key="pending_profile",
        value=pending,
        httponly=True,
        max_age=60 * 30,  # 30 minutos para completar el login con Discord
        samesite="lax",
        secure=seguridad.cookie_segura(),
    )
    return {"success": True, "saved": False}

@app.get("/api/user-profile-data")
async def obtener_datos_perfil(
    userId: str = None,
    discord_id: str = Cookie(None),
    db: Session = Depends(get_db),
):
    """
    Devuelve los datos confidenciales SOLO al propio usuario con sesión iniciada.
    """
    if not discord_id:
        raise HTTPException(status_code=401, detail="No hay sesión activa")
    if userId and str(userId) != str(discord_id):
        raise HTTPException(status_code=403, detail="No autorizado")

    perfil = db.query(PerfilUsuarioDB).filter(PerfilUsuarioDB.discord_id == discord_id).first()
    if not perfil:
        return {"steam": None, "country": None, "birth": None}

    return {
        "steam": perfil.steam,
        "country": perfil.nacionalidad,
        "birth": perfil.fecha_nacimiento,
    }


# ==========================================
# 1.C PERFILES: privacidad, redes y qué se muestra
# ==========================================

_URL_SEGURA_RE = re.compile(r"^https?://[^\s<>\"'`\\]{1,300}$", re.I)
_NOMBRE_RED_RE = re.compile(r"^@?[A-Za-z0-9_.\-]{1,60}$")


def url_segura(v) -> bool:
    """Enlace http/https sin espacios, comillas ni < > (no puede romper un atributo HTML)."""
    return isinstance(v, str) and bool(_URL_SEGURA_RE.match(v))


def limpiar_redes(r) -> dict:
    out = {}
    if not isinstance(r, dict):
        return out
    for k in ("instagram", "youtube", "twitch", "kick"):
        v = str(r.get(k) or "").strip()
        if not v or len(v) > 200:
            continue
        # solo enlaces http/https limpios o un simple nombre de usuario (letras, números, _ . -)
        if url_segura(v) or _NOMBRE_RED_RE.match(v):
            out[k] = v
    return out

def normalizar_perfil(d) -> dict:
    d = d if isinstance(d, dict) else {}
    m = d.get("mostrar") if isinstance(d.get("mostrar"), dict) else {}
    return {
        "redes": limpiar_redes(d.get("redes")),
        "publico": d.get("publico") is not False,
        "mostrar": {
            "redes": m.get("redes") is not False,
            "fotos": m.get("fotos") is not False,
            "sugerencias": m.get("sugerencias") is not False,
        },
    }

def _perfiles() -> dict:
    data = leer_json(PERFIL_FILE, {})
    return data if isinstance(data, dict) else {}

@app.get("/api/perfil-settings")
async def get_perfil_settings(userId: str = "", discord_id: str = Cookie(None)):
    p = normalizar_perfil(_perfiles().get(str(userId)))
    es_dueno = bool(discord_id) and str(discord_id) == str(userId)
    if not p["publico"] and not es_dueno:
        return {"publico": False}             # privado: nada más
    if not es_dueno and not p["mostrar"]["redes"]:
        p["redes"] = {}
    return p

@app.post("/api/perfil-settings")
async def save_perfil_settings(request: Request, discord_id: str = Cookie(None), db: Session = Depends(get_db)):
    if not discord_id:
        raise HTTPException(status_code=401, detail="No hay sesión activa")
    usuario = db.query(models.UsuarioDB).filter(models.UsuarioDB.discord_id == discord_id).first()
    if not usuario:
        raise HTTPException(status_code=401, detail="Usuario no encontrado")

    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="JSON no válido")

    todos = _perfiles()
    todos[str(discord_id)] = normalizar_perfil(body)   # el usuario sale de la sesión, nunca del cuerpo
    escribir_json(PERFIL_FILE, todos)
    return {"ok": True}

@app.get("/api/perfiles-publicos")
async def get_perfiles_publicos():
    out = {}
    for uid, raw in _perfiles().items():
        p = normalizar_perfil(raw)
        if p["publico"]:
            out[uid] = {"publico": True, "redes": p["redes"] if p["mostrar"]["redes"] else {}}
    return out

# ---------- Fotografías del perfil (subir, listar y borrar) ----------

_FOTO_URL_RE = re.compile(r"^/fotos/[A-Za-z0-9_-]{1,80}\.(jpg|png|webp)$")


def _foto_valida(u) -> bool:
    """Solo enlaces http/https limpios o archivos subidos a esta web (/fotos/...)."""
    return isinstance(u, str) and (url_segura(u) or bool(_FOTO_URL_RE.match(u)))


def _fotos_todas() -> dict:
    data = leer_json(FOTOS_FILE, {})
    return data if isinstance(data, dict) else {}


def _fotos_de(todas: dict, user_id) -> list:
    lista = todas.get(str(user_id), [])
    return [u for u in lista if _foto_valida(u)] if isinstance(lista, list) else []


def _tipo_imagen(raw: bytes):
    """Tipo real del archivo según sus primeros bytes (no nos fiamos del nombre ni de lo que diga el navegador)."""
    if raw[:3] == b"\xff\xd8\xff":
        return "jpg"
    if raw[:8] == b"\x89PNG\r\n\x1a\n":
        return "png"
    if raw[:4] == b"RIFF" and raw[8:12] == b"WEBP":
        return "webp"
    return None


@app.get("/api/fotografias")
async def get_fotografias(userId: str = "", discord_id: str = Cookie(None)):
    """Lista de imágenes publicadas por un usuario (respeta su privacidad)."""
    p = normalizar_perfil(_perfiles().get(str(userId)))
    es_dueno = bool(discord_id) and str(discord_id) == str(userId)
    if not es_dueno and (not p["publico"] or not p["mostrar"]["fotos"]):
        return []
    return _fotos_de(_fotos_todas(), userId)


@app.post("/api/fotografias")
async def subir_fotografia(request: Request, discord_id: str = Cookie(None), db: Session = Depends(get_db)):
    """Sube una fotografía al perfil de quien tiene la sesión iniciada. Cuerpo: {"imagen": "data:image/...;base64,..."}"""
    if not discord_id:
        raise HTTPException(status_code=401, detail="No hay sesión activa")
    usuario = db.query(models.UsuarioDB).filter(models.UsuarioDB.discord_id == discord_id).first()
    if not usuario:
        raise HTTPException(status_code=401, detail="Usuario no encontrado")

    # Se corta antes de leer nada si la petición es exageradamente grande
    try:
        largo = int(request.headers.get("content-length") or 0)
    except ValueError:
        largo = 0
    if largo > MAX_FOTO_BYTES * 2:
        raise HTTPException(status_code=413, detail="La imagen es demasiado grande")

    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="JSON no válido")

    dato = str(body.get("imagen") or "") if isinstance(body, dict) else ""
    if dato.startswith("data:") and "," in dato:
        dato = dato.split(",", 1)[1]
    try:
        raw = base64.b64decode(dato, validate=True)
    except Exception:
        raise HTTPException(status_code=400, detail="La imagen no es válida")

    if not raw:
        raise HTTPException(status_code=400, detail="No se ha recibido ninguna imagen")
    if len(raw) > MAX_FOTO_BYTES:
        raise HTTPException(status_code=413, detail="La imagen es demasiado grande (máximo 4 MB)")

    ext = _tipo_imagen(raw)
    if not ext:
        raise HTTPException(status_code=400, detail="Formato no admitido: solo JPG, PNG o WebP")

    todas = _fotos_todas()
    lista = _fotos_de(todas, discord_id)
    if len(lista) >= MAX_FOTOS_POR_USUARIO:
        raise HTTPException(status_code=400, detail=f"Has llegado al máximo de {MAX_FOTOS_POR_USUARIO} fotografías. Borra alguna para subir otra.")

    # Nombre aleatorio: no se puede adivinar ni pisar el archivo de otro usuario
    solo_digitos = re.sub(r"\D", "", str(discord_id))[:25] or "u"
    nombre = f"{solo_digitos}_{secrets.token_urlsafe(12)}.{ext}"
    try:
        os.makedirs(FOTOS_DIR, exist_ok=True)
        with open(os.path.join(FOTOS_DIR, nombre), "wb") as f:
            f.write(raw)
    except OSError as e:
        print("[fotos] ❌ No se pudo guardar la imagen:", e)
        raise HTTPException(status_code=500, detail="No se pudo guardar la imagen en el servidor")

    url = f"/fotos/{nombre}"
    lista.insert(0, url)   # la más reciente primero
    todas[str(discord_id)] = lista
    escribir_json(FOTOS_FILE, todas)
    return {"ok": True, "url": url, "fotos": lista}


@app.delete("/api/fotografias")
async def borrar_fotografia(url: str = "", discord_id: str = Cookie(None)):
    """Borra una fotografía del perfil de quien tiene la sesión iniciada."""
    if not discord_id:
        raise HTTPException(status_code=401, detail="No hay sesión activa")

    todas = _fotos_todas()
    lista = _fotos_de(todas, discord_id)
    if url not in lista:
        raise HTTPException(status_code=404, detail="Esa fotografía no está en tu perfil")

    lista = [u for u in lista if u != url]
    todas[str(discord_id)] = lista
    escribir_json(FOTOS_FILE, todas)

    if _FOTO_URL_RE.match(url):   # archivo subido a esta web: se borra también del disco
        try:
            os.remove(os.path.join(FOTOS_DIR, os.path.basename(url)))
        except OSError:
            pass
    return {"ok": True, "fotos": lista}


# ==========================================
# 2. GESTIÓN DE SANCIONES
# ==========================================

# Antes estas rutas no pedían sesión: cualquiera podía ver, crear, cambiar o borrar sanciones.
# Ahora: el staff lo gestiona todo; cada usuario solo ve las suyas.

@app.get("/api/sanciones", response_model=list[schemas.SancionResponse])
def obtener_sanciones(userId: str = None, discord_id: str = Cookie(None), db: Session = Depends(get_db)):
    if not discord_id:
        raise HTTPException(status_code=401, detail="No hay sesión activa")
    query = db.query(models.SancionDB)
    if not _es_staff(discord_id):
        userId = discord_id                      # un usuario normal solo ve las suyas
    if userId:
        query = query.filter(models.SancionDB.discord_id == str(userId))
    return query.all()

@app.post("/api/sanciones", response_model=schemas.SancionResponse)
def crear_sancion(sancion: schemas.SancionCreate, discord_id: str = Cookie(None), db: Session = Depends(get_db)):
    _require_staff(discord_id)
    if db.query(models.SancionDB).filter(models.SancionDB.id == sancion.id).first():
        raise HTTPException(status_code=409, detail="Ya existe una sanción con ese ID")
    db_sancion = models.SancionDB(**seguridad.neutralizar(sancion.dict()))
    db.add(db_sancion)
    db.commit()
    db.refresh(db_sancion)

    notifier.enviar_notificacion(
        discord_id=db_sancion.discord_id,
        tipo="sancion",
        descripcion=f"Se ha registrado una sanción a tu nombre: **{db_sancion.tipo}**.",
        campos=[
            {"name": "Motivo", "value": db_sancion.motivo, "inline": False},
            {"name": "Expediente", "value": db_sancion.id, "inline": True},
        ],
    )
    return db_sancion

@app.put("/api/sanciones/{sancion_id}", response_model=schemas.SancionResponse)
def actualizar_sancion(sancion_id: str, sancion_update: schemas.SancionUpdate, discord_id: str = Cookie(None), db: Session = Depends(get_db)):
    _require_staff(discord_id)
    db_sancion = db.query(models.SancionDB).filter(models.SancionDB.id == sancion_id).first()
    if not db_sancion:
        raise HTTPException(status_code=404, detail="Sanción no encontrada")
    for key, value in seguridad.neutralizar(sancion_update.dict(exclude_unset=True)).items():
        setattr(db_sancion, key, value)
    db.commit()
    db.refresh(db_sancion)
    return db_sancion

@app.delete("/api/sanciones/{sancion_id}")
def eliminar_sancion(sancion_id: str, discord_id: str = Cookie(None), db: Session = Depends(get_db)):
    _require_staff(discord_id)
    db_sancion = db.query(models.SancionDB).filter(models.SancionDB.id == sancion_id).first()
    if not db_sancion:
        raise HTTPException(status_code=404, detail="Sanción no encontrada")
    db.delete(db_sancion)
    db.commit()
    return {"message": "Sanción eliminada con éxito"}


# ==========================================
# 3. NOTIFICACIONES Y ENDPOINTS DE PERFIL
# ==========================================

@app.post("/api/notificar")
def notificar(payload: schemas.NotificacionCreate, discord_id: str = Cookie(None)):
    """
    MD del bot. Antes no pedía sesión: cualquiera podía mandar mensajes del bot a cualquier
    ID de Discord. Ahora un usuario normal solo puede enviárselos a sí mismo (es lo que hacen
    calendario.html y comercios.html); el staff puede enviarlos a cualquiera.
    """
    if not discord_id:
        raise HTTPException(status_code=401, detail="No hay sesión activa")
    staff = _es_staff(discord_id)
    destino = str(payload.discord_id) if staff else str(discord_id)
    if seguridad.demasiadas(f"notificar:{discord_id}", 60 if staff else 10, 600):
        raise HTTPException(status_code=429, detail="Demasiados avisos seguidos. Espera unos minutos.")
    campos = []
    for c in (payload.campos or [])[:10]:
        if isinstance(c, dict):
            campos.append({
                "name": str(c.get("name") or "​")[:256],
                "value": str(c.get("value") or "​")[:1024],
                "inline": bool(c.get("inline")),
            })
    ok = notifier.enviar_notificacion(
        discord_id=destino,
        tipo=str(payload.tipo)[:32],
        titulo=str(payload.titulo)[:256] if payload.titulo else None,
        descripcion=str(payload.descripcion)[:2000],
        campos=campos,
    )
    if not ok:
        raise HTTPException(status_code=502, detail="No se pudo contactar con el bot de Discord")
    return {"success": True}


# ---------- 3.A NOVEDADES (publicación + aviso por MD) ----------

@app.get("/api/novedades")
def listar_novedades():
    data = leer_json(NOVEDADES_FILE, [])
    return data if isinstance(data, list) else []


@app.post("/api/novedades")
async def guardar_novedades(request: Request, discord_id: str = Cookie(None)):
    _require_staff(discord_id)
    try:
        data = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="JSON inválido")
    if not isinstance(data, list) or len(data) > 500 or not all(isinstance(x, dict) for x in data):
        raise HTTPException(status_code=400, detail="Se esperaba una lista de novedades")

    escribir_json(NOVEDADES_FILE, seguridad.neutralizar(data))
    return {"success": True}


@app.post("/api/novedades/notificar")
def notificar_novedad(
    novedad: NovedadIn,
    background: BackgroundTasks,
    discord_id: str = Cookie(None),
    db: Session = Depends(get_db),
):
    """
    Envía la novedad por MD (vía el bot) SOLO a los usuarios que han
    activado la campanita de notificaciones en home.html.
    """
    _require_staff(discord_id)

    activos = db.query(PreferenciaNotifDB).filter(PreferenciaNotifDB.activas == True).all()  # noqa: E712
    ids = [p.discord_id for p in activos if p.discord_id]

    # En segundo plano: con muchos usuarios el envío tarda (hay pausa entre MD)
    background.add_task(notifier.enviar_novedad, novedad.dict(), ids)
    return {"destinatarios": len(ids)}


# ---------- 3.B PREFERENCIA DE NOTIFICACIONES (campanita) ----------

from fastapi.concurrency import run_in_threadpool   # (puedes subirlo junto al resto de imports)
 
BOT_INTERNAL_TOKEN = os.getenv("BOT_INTERNAL_TOKEN", "")
 
# Apartados que tienen campanita. Deben coincidir con las claves de CATEGORIAS_NOTIF en bot.py.
#   novedades  -> campanita de home.html
#   servidor   -> campanita de "Próximo reinicio" en servidor.html
#   calendario -> campanita de calendario.html (aviso 30 minutos antes de cada evento)
CATEGORIAS_NOTIF = {"novedades", "servidor", "calendario"}
 
 
class PreferenciaNotifCategoriaDB(models.Base):
    """
    Campanitas de los apartados que no son novedades (una fila por usuario y apartado).
    La de novedades sigue en PreferenciaNotifDB, así no se pierde lo que ya había guardado.
    """
    __tablename__ = "preferencias_notificaciones_categoria"
 
    discord_id = Column(String, primary_key=True, index=True)
    categoria = Column(String, primary_key=True)
    activas = Column(Boolean, default=False)
    actualizado = Column(DateTime, default=datetime.utcnow)
 
 
# Esta clase se declara después del create_all de arriba, así que su tabla se crea aquí
PreferenciaNotifCategoriaDB.__table__.create(bind=engine, checkfirst=True)
 
 
def _categoria_notif(valor) -> str:
    """Apartado de la campanita. Si no se indica, es 'novedades' (lo que envía home.html)."""
    clave = re.sub(r"[^a-z0-9_-]", "", str(valor or "").strip().lower())[:32] or "novedades"
    if clave not in CATEGORIAS_NOTIF:
        raise HTTPException(status_code=400, detail="Categoría de notificaciones no válida")
    return clave
 
 
def _pref_notif(db: Session, discord_id: str, categoria: str):
    if categoria == "novedades":
        return db.query(PreferenciaNotifDB).filter(PreferenciaNotifDB.discord_id == discord_id).first()
    return db.query(PreferenciaNotifCategoriaDB).filter(
        PreferenciaNotifCategoriaDB.discord_id == discord_id,
        PreferenciaNotifCategoriaDB.categoria == categoria,
    ).first()
 
 
def _guardar_preferencia_notif(db: Session, discord_id: str, categoria: str, activas: bool) -> bool:
    pref = _pref_notif(db, discord_id, categoria)
    if not pref:
        if categoria == "novedades":
            pref = PreferenciaNotifDB(discord_id=discord_id)
        else:
            pref = PreferenciaNotifCategoriaDB(discord_id=discord_id, categoria=categoria)
        db.add(pref)
    pref.activas = bool(activas)
    pref.actualizado = datetime.utcnow()
    db.commit()
    return bool(pref.activas)
 
 
def _ids_con_notificaciones(db: Session, categoria: str) -> list:
    """IDs de Discord de quienes tienen activada la campanita de un apartado."""
    if categoria == "novedades":
        filas = db.query(PreferenciaNotifDB).filter(PreferenciaNotifDB.activas == True).all()  # noqa: E712
    else:
        filas = db.query(PreferenciaNotifCategoriaDB).filter(
            PreferenciaNotifCategoriaDB.categoria == categoria,
            PreferenciaNotifCategoriaDB.activas == True,  # noqa: E712
        ).all()
    return [f.discord_id for f in filas if f.discord_id]
 
 
@app.get("/api/notificaciones/preferencias")
def get_preferencias(categoria: str = "novedades", discord_id: str = Cookie(None), db: Session = Depends(get_db)):
    if not discord_id:
        raise HTTPException(status_code=401, detail="No hay sesión activa")
    pref = _pref_notif(db, discord_id, _categoria_notif(categoria))
    return {"activas": bool(pref.activas) if pref else False}
 
 
@app.post("/api/notificaciones/preferencias")
async def set_preferencias(request: Request, discord_id: str = Cookie(None), db: Session = Depends(get_db)):
    if not discord_id:
        raise HTTPException(status_code=401, detail="No hay sesión activa")
    try:
        data = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="JSON inválido")
    if not isinstance(data, dict):
        raise HTTPException(status_code=400, detail="Formato no válido")
 
    categoria = _categoria_notif(data.get("categoria"))
    activas = _guardar_preferencia_notif(db, discord_id, categoria, bool(data.get("activas", False)))
 
    # El bot envía la confirmación por MD (embed blanco "SISTEMA DE NOTIFICACIONES").
    # Va en un hilo aparte para no bloquear el servidor mientras responde el bot.
    # Si el MD falla (privados cerrados, bot apagado...), la preferencia queda guardada igualmente
    # y la web lo avisa gracias a "dm": false.
    dm_ok = await run_in_threadpool(notifier.enviar_cambio_notificaciones, discord_id, categoria, activas)
    return {"success": True, "activas": activas, "dm": dm_ok}
 
 
@app.post("/api/interno/notificaciones/preferencias")
async def set_preferencias_interno(request: Request, db: Session = Depends(get_db)):
    """
    Solo para el bot: lo llama cuando el usuario pulsa el botón "Activar / Desactivar
    notificaciones" de un mensaje privado. Se protege con el mismo BOT_INTERNAL_TOKEN
    que ya comparten la web y el bot. Aquí NO se envía ningún MD: el bot responde él mismo.
    """
    recibido = request.headers.get("X-Internal-Token") or ""
    if not BOT_INTERNAL_TOKEN or not secrets.compare_digest(recibido.encode(), BOT_INTERNAL_TOKEN.encode()):
        raise HTTPException(status_code=401, detail="No autorizado")
 
    try:
        data = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="JSON inválido")
    if not isinstance(data, dict) or not isinstance(data.get("activas"), bool):
        raise HTTPException(status_code=400, detail="Formato no válido")
 
    usuario_id = re.sub(r"\D", "", str(data.get("discord_id") or ""))[:25]
    if not usuario_id:
        raise HTTPException(status_code=400, detail="Falta discord_id")
 
    categoria = _categoria_notif(data.get("categoria"))
    activas = _guardar_preferencia_notif(db, usuario_id, categoria, data["activas"])
    print(f"[notificaciones] {usuario_id} ha {'activado' if activas else 'desactivado'} las notificaciones de '{categoria}' desde Discord.")
    return {"success": True, "activas": activas}
 
 
# ---------- 3.B bis CALENDARIO: eventos en el servidor + aviso 30 minutos antes ----------
# Los eventos se guardan en data/eventos.json con la misma forma que usa la web en
# localStorage ("calendar_events"):  { "2026-08-25": [ {title, date, location, ...}, ... ] }
# public/eventos_sync.js se encarga de subirlos y bajarlos desde las páginas.
# Un hilo revisa cada 30 segundos si algún evento empieza dentro de 30 minutos y, si es así,
# el bot avisa por MD a quienes tienen activada la campanita del calendario.
 
import math
import time
from zoneinfo import ZoneInfo
 
EVENTOS_FILE = os.path.join(DATA_DIR, "eventos.json")
EVENTOS_AVISADOS_FILE = os.path.join(DATA_DIR, "eventos_avisados.json")
MINUTOS_AVISO_EVENTO = 30
MAX_EVENTOS = 2000
MAX_EVENTOS_BYTES = 2 * 1024 * 1024
 
# Las horas de los eventos se entienden en hora peninsular española.
# En Windows hace falta "pip install tzdata"; si no está, se usa la hora del propio ordenador.
try:
    ZONA_EVENTOS = ZoneInfo("Europe/Madrid")
except Exception:
    ZONA_EVENTOS = None
 
_FECHA_EVENTO_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
_HORA_EVENTO_RE = re.compile(r"^(\d{1,2}):(\d{2})")
 
 
def _eventos() -> dict:
    data = leer_json(EVENTOS_FILE, {})
    return data if isinstance(data, dict) else {}
 
 
def _limpiar_eventos(data) -> dict:
    """Solo fechas AAAA-MM-DD con listas de eventos; de cada evento, sus campos de texto, números y listas cortas."""
    limpio, total = {}, 0
    if not isinstance(data, dict):
        return limpio
    for date_key, lista in data.items():
        if not isinstance(date_key, str) or not _FECHA_EVENTO_RE.match(date_key) or not isinstance(lista, list):
            continue
        eventos = []
        for ev in lista:
            if total >= MAX_EVENTOS:
                break
            if not isinstance(ev, dict) or not str(ev.get("title") or "").strip():
                continue
            item = {}
            for k, v in ev.items():
                if not isinstance(k, str) or len(k) > 40:
                    continue
                if v is None or isinstance(v, (bool, int)):
                    item[k] = v
                elif isinstance(v, float):
                    if math.isfinite(v):
                        item[k] = v
                elif isinstance(v, str):
                    item[k] = v[:4000]
                elif isinstance(v, list):
                    item[k] = [str(x)[:200] for x in v[:20] if isinstance(x, (str, int, float))]
            eventos.append(item)
            total += 1
        if eventos:
            limpio[date_key] = eventos
    return limpio
 
 
def _inicio_evento(ev: dict, date_key: str):
    """
    Momento en que empieza el evento, o None si no tiene hora (sin hora no hay aviso).
    Admite  date: "2026-08-25T21:00"  o un campo  time / hora / startTime: "21:00".
    """
    candidatos = []
    bruto = str(ev.get("date") or "").strip()
    if len(bruto) > 10:
        candidatos.append(bruto)
    m = _HORA_EVENTO_RE.match(str(ev.get("time") or ev.get("hora") or ev.get("startTime") or "").strip())
    if m:
        candidatos.append(f"{date_key}T{int(m.group(1)):02d}:{m.group(2)}")
 
    for texto in candidatos:
        try:
            inicio = datetime.fromisoformat(texto.replace("Z", "+00:00"))
        except ValueError:
            continue
        if inicio.tzinfo is None:
            inicio = inicio.replace(tzinfo=ZONA_EVENTOS) if ZONA_EVENTOS else inicio.astimezone()
        return inicio
    return None
 
 
@app.get("/api/eventos")
async def get_eventos(response: Response):
    # "Sin iniciar" = todavía no se ha guardado nunca un evento en el servidor. En ese caso
    # eventos_sync.js sube los que el staff tenga en su navegador en vez de borrarlos.
    response.headers["X-Eventos-Sin-Iniciar"] = "0" if os.path.exists(EVENTOS_FILE) else "1"
    response.headers["Cache-Control"] = "no-store"
    return _eventos()
 
 
@app.post("/api/eventos")
async def save_eventos(request: Request, discord_id: str = Cookie(None)):
    """Guarda todos los eventos del calendario. Solo el ID maestro o un staff activo."""
    if not discord_id:
        raise HTTPException(status_code=401, detail="No hay sesión activa")
    if not _puede_gestionar_staff(discord_id):
        raise HTTPException(status_code=403, detail="No tienes permisos para gestionar el calendario")
 
    try:
        largo = int(request.headers.get("content-length") or 0)
    except ValueError:
        largo = 0
    if largo > MAX_EVENTOS_BYTES:
        raise HTTPException(status_code=413, detail="Demasiados eventos")
    try:
        data = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="JSON inválido")
    if not isinstance(data, dict):
        raise HTTPException(status_code=400, detail="Se esperaba un objeto con los eventos por fecha")
 
    limpio = seguridad.neutralizar(_limpiar_eventos(data))
    escribir_json(EVENTOS_FILE, limpio)
    total = sum(len(v) for v in limpio.values())
    print(f"[eventos] ✅ Calendario guardado por {discord_id}: {total} eventos.")
    return {"ok": True, "total": total}
 
 
def _revisar_eventos_proximos() -> None:
    """Avisa (una sola vez por evento) de los que empiezan dentro de MINUTOS_AVISO_EVENTO."""
    ahora = datetime.now(timezone.utc)
    avisados = leer_json(EVENTOS_AVISADOS_FILE, {})
    if not isinstance(avisados, dict):
        avisados = {}
 
    pendientes = []
    for date_key, lista in _eventos().items():
        if not isinstance(lista, list):
            continue
        for ev in lista:
            if not isinstance(ev, dict):
                continue
            inicio = _inicio_evento(ev, str(date_key))
            if inicio is None:
                continue
            faltan = (inicio - ahora).total_seconds()
            if not (0 < faltan <= MINUTOS_AVISO_EVENTO * 60):
                continue
            # Si se cambia la hora del evento, la clave cambia y se vuelve a avisar
            clave = f"{date_key}|{ev.get('id') or ev.get('title')}|{inicio.isoformat()}"
            if clave not in avisados:
                pendientes.append((clave, ev, inicio, faltan))
 
    if not pendientes:
        return
 
    # Se apunta ANTES de enviar: si algo falla a medias, no se repite el aviso a todo el mundo.
    # De paso se olvidan los avisos de eventos de hace más de dos días.
    limite = ahora.timestamp() - 2 * 24 * 3600
    recientes = {}
    for clave, marca in avisados.items():
        try:
            if float(marca) >= limite:
                recientes[clave] = marca
        except (TypeError, ValueError):
            pass
    for clave, _ev, inicio, _faltan in pendientes:
        recientes[clave] = inicio.timestamp()
    escribir_json(EVENTOS_AVISADOS_FILE, recientes)
 
    with Session(engine) as db:
        ids = _ids_con_notificaciones(db, "calendario")
 
    for _clave, ev, inicio, faltan in pendientes:
        titulo = str(ev.get("title") or "Evento")
        if not ids:
            print(f"[eventos] '{titulo}' empieza pronto, pero nadie tiene activada la campanita del calendario.")
            continue
        negocios = ev.get("businesses")
        ubicacion = ev.get("location") or (", ".join(str(x) for x in negocios) if isinstance(negocios, list) else (negocios or ""))
        print(f"[eventos] Avisando de '{titulo}' a {len(ids)} usuarios.")
        notifier.enviar_aviso_evento(
            titulo_evento=titulo,
            discord_ids=ids,
            minutos=math.ceil(faltan / 60),
            inicio_ts=int(inicio.timestamp()),
            ubicacion=str(ubicacion or ""),
        )
 
 
def _bucle_avisos_eventos() -> None:
    while True:
        try:
            _revisar_eventos_proximos()
        except Exception as e:
            print("[eventos] ❌ Error revisando los eventos próximos:", repr(e))
        time.sleep(30)
 
 
@app.on_event("startup")
def _arrancar_avisos_eventos():
    threading.Thread(target=_bucle_avisos_eventos, daemon=True, name="avisos-eventos").start()
    print(f"[eventos] ✅ Avisos de eventos activos: se avisa {MINUTOS_AVISO_EVENTO} minutos antes de cada evento con hora.")
 

# ---------- 3.B ter BORRAR CUENTA (botón "Borrar cuenta" de perfil.html) ----------
# Al borrar la cuenta se eliminan los datos personales del usuario en la web:
#   - Steam, nacionalidad y fecha de nacimiento  -> al volver a entrar, login.html los pide de nuevo
#   - redes sociales y privacidad del perfil, fotografías y preferencias de notificaciones
# NO se borran sanciones, tickets, sugerencias ni whitelist: siguen asociados a su ID de Discord,
# para que borrar la cuenta no sirva para limpiar el historial.
#
# Cada baja queda apuntada en data/cuentas_borradas.json con los datos que tenía. Si el usuario
# vuelve a registrarse con un Steam, nacionalidad o fecha de nacimiento distintos, se apunta
# también y el bot avisa por MD al equipo administrativo (MASTER_ADMIN_ID y STAFF_DISCORD_IDS).
 
import time
from fastapi.concurrency import run_in_threadpool
 
CUENTAS_BORRADAS_FILE = os.path.join(DATA_DIR, "cuentas_borradas.json")
MAX_REGISTROS_CUENTAS = 5000
_cuentas_lock = threading.Lock()
 
_AVISO_CUENTAS = "-# ¡ATENCIÓN! Esto es un mensaje automático procedente del sistema de cuentas de Nyx Community."
 
 
def _registros_cuentas() -> list:
    data = leer_json(CUENTAS_BORRADAS_FILE, [])
    return [r for r in data if isinstance(r, dict)] if isinstance(data, list) else []
 
 
def _norm_dato(valor) -> str:
    """Para comparar: sin mayúsculas, sin http(s)://www. y sin la barra final."""
    texto = str(valor or "").strip().lower()
    return re.sub(r"^https?://(www\.)?", "", texto).rstrip("/")
 
 
def _enviar_alertas_cuentas(alertas: list) -> None:
    """Manda cada alerta por MD al equipo administrativo. alertas = [(tipo, descripcion), ...]"""
    destinatarios = {str(MASTER_ADMIN_ID or "").strip(), *STAFF_IDS} - {""}
    for tipo, descripcion in alertas:
        for staff_id in destinatarios:
            notifier.enviar_notificacion(
                discord_id=staff_id,
                tipo=tipo,
                titulo="SISTEMA DE CUENTAS",
                descripcion=descripcion,
                boton_texto="Acceder al panel online",
                boton_url=f"{PUBLIC_URL}/admin.html",
            )
            time.sleep(notifier.PAUSA_ENTRE_DMS)
 
 
def _revisar_reregistros() -> list:
    """
    Mira si alguien que borró su cuenta ha vuelto a registrarse y compara sus datos con los
    que tenía. Devuelve las alertas que hay que enviar al staff (solo si ha cambiado algo).
    """
    alertas = []
    with _cuentas_lock:
        registros = _registros_cuentas()
        pendientes = [r for r in registros if r.get("reRegistro") is None and r.get("discordId")]
        if not pendientes:
            return alertas
 
        cambiado = False
        vistos = set()
        with Session(engine) as db:
            for r in pendientes:                       # van de la baja más reciente a la más antigua
                usuario_id = str(r["discordId"])
                if usuario_id in vistos:               # una baja anterior del mismo usuario: ya no se compara
                    r["reRegistro"] = False
                    cambiado = True
                    continue
                vistos.add(usuario_id)
 
                perfil = db.query(PerfilUsuarioDB).filter(PerfilUsuarioDB.discord_id == usuario_id).first()
                if not perfil or not (perfil.steam or perfil.nacionalidad or perfil.fecha_nacimiento):
                    continue                           # todavía no ha vuelto a poner sus datos
 
                cambios = []
                for campo, etiqueta, nuevo in (
                    ("steam", "STEAM", perfil.steam),
                    ("nacionalidad", "NACIONALIDAD", perfil.nacionalidad),
                    ("fechaNacimiento", "FECHA DE NACIMIENTO", perfil.fecha_nacimiento),
                ):
                    anterior = r.get(campo)
                    if anterior and _norm_dato(anterior) != _norm_dato(nuevo):
                        cambios.append({"campo": etiqueta, "antes": anterior, "ahora": nuevo})
 
                r["reRegistro"] = {
                    "fecha": datetime.now(timezone.utc).isoformat(),
                    "steam": perfil.steam,
                    "nacionalidad": perfil.nacionalidad,
                    "fechaNacimiento": perfil.fecha_nacimiento,
                    "cambios": cambios,
                }
                cambiado = True
 
                if cambios:
                    lineas = [f"- **__USUARIO__**: {r.get('usuario') or 'Desconocido'} (`{usuario_id}`)"]
                    for c in cambios:
                        if c["campo"] == "STEAM":
                            lineas.append(f"- **__STEAM__**: {c['antes']} → {c['ahora']}")
                        else:
                            # el valor concreto no se manda por Discord: está en data/cuentas_borradas.json
                            lineas.append(f"- **__{c['campo']}__**: ha cambiado")
                    alertas.append((
                        "sancion",
                        "¡Buenas!, un usuario que borró su cuenta ha vuelto a registrarse con datos distintos:\n\n"
                        + "\n".join(lineas) + "\n\n"
                        + _AVISO_CUENTAS + " El detalle completo está en el registro de cuentas borradas.",
                    ))
                    print(f"[cuentas] ⚠️ {usuario_id} se ha vuelto a registrar con datos distintos: "
                          + ", ".join(c["campo"] for c in cambios))
 
        if cambiado:
            escribir_json(CUENTAS_BORRADAS_FILE, registros)
    return alertas
 
 
@app.post("/api/cuenta/borrar")
async def borrar_cuenta(
    request: Request,
    response: Response,
    background: BackgroundTasks,
    discord_id: str = Cookie(None),
    db: Session = Depends(get_db),
):
    """Borra los datos personales de quien tiene la sesión iniciada. Cuerpo: {"confirmacion": "BORRAR"}"""
    if not discord_id:
        raise HTTPException(status_code=401, detail="No hay sesión activa")
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="JSON inválido")
    if not isinstance(body, dict) or str(body.get("confirmacion") or "").strip().upper() != "BORRAR":
        raise HTTPException(status_code=400, detail="Falta la confirmación para borrar la cuenta")
 
    usuario = db.query(models.UsuarioDB).filter(models.UsuarioDB.discord_id == discord_id).first()
    if not usuario:
        raise HTTPException(status_code=401, detail="Usuario no encontrado")
 
    # Si tenía una baja anterior sin comparar, se compara ahora con los datos que está a punto de borrar
    alertas = await run_in_threadpool(_revisar_reregistros)
 
    perfil = db.query(PerfilUsuarioDB).filter(PerfilUsuarioDB.discord_id == discord_id).first()
    tenia_datos = bool(perfil and (perfil.steam or perfil.nacionalidad or perfil.fecha_nacimiento))
    ahora = datetime.now(timezone.utc)
    nombre = str(getattr(usuario, "username", "") or "")
 
    # 1) Se apunta la baja ANTES de borrar nada
    registro = {
        "discordId": str(discord_id),
        "usuario": nombre,
        "fecha": ahora.isoformat(),
        "steam": perfil.steam if perfil else None,
        "nacionalidad": perfil.nacionalidad if perfil else None,
        "fechaNacimiento": perfil.fecha_nacimiento if perfil else None,
        # None = pendiente de comparar cuando vuelva a registrarse · False = no había nada que comparar
        "reRegistro": None if tenia_datos else False,
    }
    with _cuentas_lock:
        registros = _registros_cuentas()
        registros.insert(0, registro)
        escribir_json(CUENTAS_BORRADAS_FILE, registros[:MAX_REGISTROS_CUENTAS])
 
    # 2) Base de datos: datos del login y preferencias de notificaciones
    if perfil:
        db.delete(perfil)
    db.query(PreferenciaNotifDB).filter(PreferenciaNotifDB.discord_id == discord_id).delete(synchronize_session=False)
    pref_categoria = globals().get("PreferenciaNotifCategoriaDB")
    if pref_categoria is not None:
        db.query(pref_categoria).filter(pref_categoria.discord_id == discord_id).delete(synchronize_session=False)
    db.commit()
 
    # 3) Redes sociales y privacidad del perfil
    perfiles = _perfiles()
    if perfiles.pop(str(discord_id), None) is not None:
        escribir_json(PERFIL_FILE, perfiles)
 
    # 4) Fotografías: la lista y los archivos
    fotos = _fotos_todas()
    lista_fotos = fotos.pop(str(discord_id), None)
    if lista_fotos is not None:
        escribir_json(FOTOS_FILE, fotos)
        for url in (lista_fotos if isinstance(lista_fotos, list) else []):
            if isinstance(url, str) and _FOTO_URL_RE.match(url):
                try:
                    os.remove(os.path.join(FOTOS_DIR, os.path.basename(url)))
                except OSError:
                    pass
 
    # 5) Se cierra la sesión (en todos sus dispositivos)
    seguridad.revocar_sesiones(discord_id)
    seguridad.quitar_sesion(response)
 
    # 6) Aviso al equipo administrativo (en segundo plano)
    alertas.append((
        "logout",
        "¡Buenas!, un usuario ha borrado su cuenta de la web:\n\n"
        f"- **__USUARIO__**: {nombre or 'Desconocido'} (`{discord_id}`)\n"
        f"- **__FECHA__**: <t:{int(ahora.timestamp())}:F>\n\n"
        + _AVISO_CUENTAS + " Si vuelve a registrarse con datos distintos, recibirás otro aviso.",
    ))
    background.add_task(_enviar_alertas_cuentas, alertas)
 
    print(f"[cuentas] 🗑️ {nombre or discord_id} ({discord_id}) ha borrado su cuenta.")
    return {"ok": True}
 
 
def _bucle_reregistros() -> None:
    while True:
        time.sleep(60)
        try:
            alertas = _revisar_reregistros()
            if alertas:
                _enviar_alertas_cuentas(alertas)
        except Exception as e:
            print("[cuentas] ❌ Error revisando los registros de cuentas borradas:", repr(e))
 
 
@app.on_event("startup")
def _arrancar_vigilancia_cuentas():
    threading.Thread(target=_bucle_reregistros, daemon=True, name="cuentas-borradas").start()

# ---------- 3.C SUGERENCIAS Y TICKETS (listas compartidas) ----------
# Las páginas leen la lista completa y la guardan completa (así funcionan sugerencias.html,
# tickets.html y home.html). Guardar requiere sesión iniciada.

MAX_ITEMS = 10000

async def _lista_desde_peticion(request: Request) -> list:
    try:
        data = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="JSON inválido")
    if not isinstance(data, list):
        raise HTTPException(status_code=400, detail="Se esperaba una lista")
    if len(data) > MAX_ITEMS:
        raise HTTPException(status_code=413, detail="Demasiados elementos")
    if not all(isinstance(x, dict) for x in data):
        raise HTTPException(status_code=400, detail="Formato no válido")
    return data


@app.get("/api/avatares")
async def get_avatares(ids: str = "", db: Session = Depends(get_db)):
    """Foto de perfil de Discord de los usuarios que han iniciado sesión en la web.
    Recibe ?ids=123,456 y devuelve { "123": "https://cdn.discordapp.com/avatars/..." }.
    Los que no tienen foto propia (o no han entrado nunca) no aparecen."""
    lista = [i for i in dict.fromkeys(x.strip() for x in ids.split(",")) if i.isdigit()][:100]
    if not lista:
        return {}
    filas = db.query(models.UsuarioDB).filter(models.UsuarioDB.discord_id.in_(lista)).all()
    return {
        u.discord_id: f"https://cdn.discordapp.com/avatars/{u.discord_id}/{u.avatar}.png"
        for u in filas
        if u.avatar and re.fullmatch(r"(a_)?[0-9a-f]{32}", u.avatar)
    }


@app.get("/api/sugerencias")
async def get_sugerencias(userId: str = None):
    data = leer_json(SUGERENCIAS_FILE, [])
    return data if isinstance(data, list) else []


_CAMPOS_TEXTO_SUGERENCIA = {"titulo": 200, "categoria": 60, "descripcion": 5000}
_sugerencias_lock = threading.Lock()


def _votos_limpios(voters) -> dict:
    if not isinstance(voters, dict):
        return {}
    return {str(k)[:25]: v for k, v in voters.items() if v in ("up", "down") and re.fullmatch(r"\d{5,25}", str(k))}


def _recontar(s: dict) -> dict:
    v = _votos_limpios(s.get("voters"))
    s["voters"] = v
    s["upvotes"] = sum(1 for x in v.values() if x == "up")
    s["downvotes"] = sum(1 for x in v.values() if x == "down")
    return s


def _fusionar_sugerencias(servidor: list, entrantes: list, yo: str) -> list:
    """
    La página manda la lista completa. Un usuario normal solo puede:
      - crear sugerencias a su nombre (siempre "Pendiente"),
      - editar o borrar las suyas,
      - poner o quitar SU voto en cualquiera.
    Todo lo demás (estado, nota del staff, votos de otros, sugerencias ajenas) se queda como estaba.
    """
    por_id = {str(s.get("id")): s for s in servidor if isinstance(s, dict) and s.get("id")}
    vistos = set()
    resultado = []

    for e in entrantes:
        sid = str(e.get("id") or "")[:40]
        if not sid or sid in vistos:
            continue
        vistos.add(sid)
        actual = por_id.get(sid)
        voto = _votos_limpios(e.get("voters")).get(yo)

        if actual is None:
            nueva = {k: str(e.get(k) or "")[:n] for k, n in _CAMPOS_TEXTO_SUGERENCIA.items()}
            nueva.update({
                "id": sid,
                "discordId": yo,
                "usuario": str(e.get("usuario") or "")[:64],
                "avatarUrl": e.get("avatarUrl") if url_segura(e.get("avatarUrl")) else "",
                "status": "Pendiente",
                "fechaRegistro": datetime.now(timezone.utc).isoformat(),
                "voters": {yo: voto} if voto else {},
            })
            resultado.append(_recontar(nueva))
            continue

        copia = dict(actual)
        if str(actual.get("discordId")) == yo:
            for k, n in _CAMPOS_TEXTO_SUGERENCIA.items():
                if k in e:
                    copia[k] = str(e.get(k) or "")[:n]
        votos = _votos_limpios(actual.get("voters"))
        if voto:
            votos[yo] = voto
        else:
            votos.pop(yo, None)
        copia["voters"] = votos
        resultado.append(_recontar(copia))

    # Las que no han llegado: se borran solo si eran del propio usuario
    for sid, s in por_id.items():
        if sid not in vistos and str(s.get("discordId")) != yo:
            resultado.append(s)
    return resultado


@app.post("/api/sugerencias")
async def save_sugerencias(request: Request, discord_id: str = Cookie(None)):
    if not discord_id:
        raise HTTPException(status_code=401, detail="No hay sesión activa")
    entrantes = seguridad.neutralizar(await _lista_desde_peticion(request))
    with _sugerencias_lock:
        if _es_staff(discord_id):
            lista = [_recontar(dict(s)) for s in entrantes]       # el staff gestiona estados y borra
        else:
            servidor = leer_json(SUGERENCIAS_FILE, [])
            lista = _fusionar_sugerencias(servidor if isinstance(servidor, list) else [], entrantes, str(discord_id))
        escribir_json(SUGERENCIAS_FILE, lista)
    return {"ok": True}


# ---------- Tickets: lista compartida + cierre (copia HTML y aviso por MD) ----------

_TAG_RE = re.compile(r"<[^>]+>")
_TID_RE = re.compile(r"^[A-Za-z0-9_-]{1,40}$")

_TICKET_CSS = """
*{box-sizing:border-box}body{margin:0;background:#0b0a14;color:#e2e8f0;font-family:'Inter','Segoe UI',sans-serif;line-height:1.55}
.wrap{max-width:860px;margin:0 auto;padding:32px 18px 60px}
.head{background:linear-gradient(135deg,#1a1230,#10101c);border:1px solid rgba(168,85,247,.35);border-radius:18px;padding:24px;margin-bottom:22px}
.brand{font-size:12px;font-weight:700;letter-spacing:1.5px;color:#c084fc;text-transform:uppercase}
h1{margin:8px 0 14px;font-size:24px;color:#fff}
.meta{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px;font-size:13.5px;color:#94a3b8}
.meta b{display:block;font-size:11px;letter-spacing:.8px;text-transform:uppercase;color:#a78bfa;margin-bottom:2px}
.closed{display:inline-block;margin-left:8px;padding:3px 12px;border-radius:999px;background:rgba(239,68,68,.15);color:#f87171;font-size:12px;font-weight:700;vertical-align:middle}
.msg{margin:12px 0;padding:14px 16px;border-radius:14px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08)}
.msg.user{background:rgba(168,85,247,.1);border-color:rgba(168,85,247,.3)}
.msg.system{background:rgba(251,191,36,.06);border-color:rgba(251,191,36,.25);font-size:13.5px}
.top{display:flex;justify-content:space-between;gap:10px;font-size:12.5px;margin-bottom:6px;color:#94a3b8}
.top b{color:#fff;font-size:13.5px}
.msg img{max-width:100%;border-radius:10px;margin-top:10px;display:block}
.foot{margin-top:30px;text-align:center;font-size:12px;color:#64748b}
@media print{body{background:#fff;color:#000}.head,.msg{border-color:#ccc;background:#fff}h1,.top b,.meta b{color:#000}}
"""

def _limpio(s) -> str:
    """Quita etiquetas HTML y escapa el texto (nunca se inserta HTML de usuarios)."""
    return html_lib.escape(_TAG_RE.sub("", str(s or "")))

def _ticket_cerrado(t) -> bool:
    if not isinstance(t, dict):
        return False
    return str(t.get("status") or t.get("estado") or "").lower() == "closed"

def _span_fecha(iso, fallback="—") -> str:
    """Fecha que el navegador convierte a la hora local de quien abre el archivo."""
    if not iso:
        return html_lib.escape(str(fallback))
    s = html_lib.escape(str(iso), quote=True)
    return f'<span data-ts="{s}">{s}</span>'

def _render_ticket_html(t: dict) -> str:
    tid = _limpio(t.get("id"))
    titulo = _limpio(t.get("title") or t.get("asunto") or "Sin título")
    categoria = _limpio(t.get("category") or t.get("categoria") or "General")
    usuario = _limpio(t.get("usuario") or "—")

    burbujas = []
    for m in (t.get("messages") or []):
        if not isinstance(m, dict):
            continue
        sender = m.get("sender") if m.get("sender") in ("user", "staff", "system") else "staff"
        nombre = _limpio(m.get("name") or m.get("autor") or "")
        texto = _limpio(m.get("text") or m.get("texto") or "").replace("\n", "<br>")
        hora = _limpio(m.get("time") or "")
        img = ""
        src = str(m.get("image") or "")
        if src.startswith(("data:image/png", "data:image/jpeg", "data:image/gif", "data:image/webp", "https://", "http://")):
            img = f'<img src="{html_lib.escape(src, quote=True)}" alt="Imagen adjunta">'
        burbujas.append(
            f'<div class="msg {sender}"><div class="top"><b>{nombre}</b><span>{hora}</span></div>{texto}{img}</div>'
        )
    cuerpo = "".join(burbujas) or '<div class="msg system">Este ticket no tiene mensajes.</div>'

    script = (
        "<script>document.querySelectorAll('[data-ts]').forEach(function(e){"
        "var d=new Date(e.getAttribute('data-ts'));"
        "if(!isNaN(d))e.textContent=d.toLocaleString('es-ES');});</script>"
    )
    return (
        '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">'
        '<meta name="viewport" content="width=device-width, initial-scale=1.0">'
        f"<title>Ticket {tid} | Nyx Community</title><style>{_TICKET_CSS}</style></head><body><div class=\"wrap\">"
        f'<div class="head"><div class="brand">Nyx Community · Archivo de ticket</div>'
        f'<h1>{titulo}<span class="closed">CERRADO</span></h1><div class="meta">'
        f"<div><b>Ticket</b>{tid}</div><div><b>Categoría</b>{categoria}</div><div><b>Usuario</b>{usuario}</div>"
        f"<div><b>Creado</b>{_span_fecha(t.get('fechaCreacion'), t.get('date') or '—')}</div>"
        f"<div><b>Cerrado</b>{_span_fecha(t.get('fechaCierre'))}</div></div></div>"
        f"{cuerpo}<div class=\"foot\">Copia generada automáticamente al cerrar el ticket.</div></div>{script}</body></html>"
    )

def _pagina_mensaje(titulo: str, texto: str, codigo: int) -> HTMLResponse:
    cuerpo = (
        '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Nyx Community</title>'
        f"<style>{_TICKET_CSS}</style></head><body><div class=\"wrap\"><div class=\"head\" style=\"text-align:center\">"
        f'<div class="brand">Nyx Community</div><h1>{html_lib.escape(titulo)}</h1>'
        f'<p style="color:#94a3b8">{html_lib.escape(texto)}</p>'
        '<p><a href="/login.html" style="color:#c084fc">Iniciar sesión</a></p></div></div></body></html>'
    )
    return HTMLResponse(content=cuerpo, status_code=codigo, headers={"Cache-Control": "no-store"})

def _procesar_cierre_ticket(t: dict) -> None:
    """Guarda la copia HTML del ticket y avisa por MD de Discord a su dueño."""
    tid = str(t.get("id") or "")
    owner = str(t.get("discordId") or "")
    if not _TID_RE.match(tid) or not owner:
        print(f"[tickets] ⚠️ Cierre ignorado: ticket sin id válido o sin discordId ({tid!r}).")
        return

    # 1) Copia HTML (primero, para que el enlace del mensaje ya funcione)
    try:
        os.makedirs(TRANSCRIPTS_DIR, exist_ok=True)
        with open(os.path.join(TRANSCRIPTS_DIR, tid + ".html"), "w", encoding="utf-8") as f:
            f.write(_render_ticket_html(t))
    except Exception as e:
        print("[tickets] ❌ No se pudo guardar la copia HTML:", e)

    # 2) Aviso por MD con botón "Acceder al ticket"
    try:
        ts = int(datetime.fromisoformat(str(t.get("fechaCierre"))).timestamp())
    except Exception:
        ts = int(datetime.now(timezone.utc).timestamp())

    titulo = str(t.get("title") or t.get("asunto") or "Sin título")[:200]
    categoria = str(t.get("category") or t.get("categoria") or "General")[:100]
    url = f"{PUBLIC_URL}/ticket/{tid}.html"

    campos = [
        {
            "name": "**INFORMACIÓN**",
            "value": (
                f"- __**TICKET**__: {titulo}\n"
                f"- __**ID**__: `{tid}`\n"
                f"- __**CATEGORÍA**__: {categoria}\n"
                f"- __**FECHA DE CIERRE**__: <t:{ts}:F>"
            ),
            "inline": False,
        },
        {
            "name": "\u200b",
            "value": "-# ¡ATENCIÓN! Esto es un mensaje automático procedente del sistema de tickets de Nyx Community.",
            "inline": False,
        },
    ]

    ok = notifier.enviar_notificacion(
        discord_id=owner,
        tipo="ticket",
        titulo="SISTEMA DE TICKETS",
        descripcion="¡Buenas!, se ha cerrado el siguiente ticket:",
        campos=campos,
        boton_texto="Acceder al ticket",
        boton_url=url,
    )
    if ok:
        print(f"[tickets] ✅ MD de cierre enviado para {tid}.")
    else:
        print(f"[tickets] ❌ No se pudo enviar el MD de {tid}. Mira los mensajes [notifier] / [bot] justo encima.")


@app.get("/api/tickets")
async def get_tickets(discord_id: str = Cookie(None)):
    """Antes era público: cualquiera leía los tickets privados de todos. Ahora el staff ve
    todos y cada usuario solo los suyos."""
    if not discord_id:
        return []
    data = leer_json(TICKETS_FILE, [])
    lista = data if isinstance(data, list) else []
    if _es_staff(discord_id):
        return lista
    return [t for t in lista if isinstance(t, dict) and str(t.get("discordId") or "") == str(discord_id)]


_CAMPOS_TICKET_SERVIDOR = {"discordId", "fechaCierre", "cierreNotificado", "fechaCreacion"}
_tickets_lock = threading.Lock()


def _mensaje_de_staff(m) -> bool:
    return isinstance(m, dict) and (m.get("sender") == "staff" or str(m.get("rol") or "").lower() == "staff")


# Marcas con las que el panel (admin/tickets.html) pinta un mensaje como «Staff». Un usuario
# normal no puede ponerlas en sus mensajes: se quitan y el autor queda fijado a su propio ID.
_MARCAS_STAFF = ("esStaff", "staff", "isStaff", "rol", "role", "tipo")
_MAX_TEXTO_MENSAJE = 4000
_MAX_MENSAJE_BYTES = 6 * 1024 * 1024     # una imagen adjunta en base64 cabe; un mensaje gigante no


def _mensaje_de_usuario(m: dict, yo: str):
    """Copia limpia de un mensaje escrito por el dueño del ticket (None si no vale)."""
    limpio = {k: v for k, v in m.items() if k not in _MARCAS_STAFF}
    if limpio.get("sender") not in (None, "user"):
        limpio["sender"] = "user"
    limpio["autorId"] = yo
    for clave in ("texto", "text", "mensaje", "content"):
        if isinstance(limpio.get(clave), str):
            limpio[clave] = limpio[clave][:_MAX_TEXTO_MENSAJE]
    if len(json.dumps(limpio, ensure_ascii=False)) > _MAX_MENSAJE_BYTES:
        return None
    return limpio


def _fusionar_mensajes(servidor, entrantes, yo: str) -> list:
    """Se conservan los del servidor y se añaden los nuevos (limpios, sin poder hacerse pasar por el staff)."""
    base = [m for m in (servidor or []) if isinstance(m, dict)]
    nuevos = []
    for m in (entrantes or []):
        if not isinstance(m, dict) or m in base or _mensaje_de_staff(m):
            continue
        limpio = _mensaje_de_usuario(m, yo)
        if limpio is not None and limpio not in base:
            nuevos.append(limpio)
    return base + nuevos[:50]


def _fusionar_tickets(servidor: list, entrantes: list, yo: str) -> list:
    """
    Un usuario normal solo puede crear tickets a su nombre, escribir en los suyos y cerrarlos.
    No puede tocar ni borrar tickets de otros, ni hacerse pasar por el staff en el chat.
    """
    por_id = {str(t.get("id")): t for t in servidor if isinstance(t, dict) and t.get("id")}
    for e in entrantes:
        tid = str(e.get("id") or "")
        if not _TID_RE.match(tid):
            continue
        actual = por_id.get(tid)
        if actual is None:
            nuevo = {k: v for k, v in e.items() if k not in _CAMPOS_TICKET_SERVIDOR}
            nuevo["discordId"] = yo
            nuevo["fechaCreacion"] = datetime.now(timezone.utc).isoformat()
            for clave in ("messages", "mensajes"):
                if isinstance(nuevo.get(clave), list):
                    nuevo[clave] = _fusionar_mensajes([], nuevo[clave], yo)
            por_id[tid] = nuevo
            continue
        if str(actual.get("discordId") or "") != yo:
            continue                                   # ticket ajeno: no se toca
        copia = dict(actual)
        for k, v in e.items():
            if k in _CAMPOS_TICKET_SERVIDOR or k in ("messages", "mensajes"):
                continue
            copia[k] = v
        for clave in ("messages", "mensajes"):
            if clave in e or clave in actual:
                copia[clave] = _fusionar_mensajes(actual.get(clave), e.get(clave), yo)
        por_id[tid] = copia
    return list(por_id.values())


@app.post("/api/tickets")
async def save_tickets(request: Request, background: BackgroundTasks, discord_id: str = Cookie(None)):
    if not discord_id:
        raise HTTPException(status_code=401, detail="No hay sesión activa")
    entrantes = seguridad.neutralizar(await _lista_desde_peticion(request))

    with _tickets_lock:
        return _guardar_tickets(entrantes, background, str(discord_id))


def _guardar_tickets(entrantes: list, background: BackgroundTasks, discord_id: str):
    anteriores = leer_json(TICKETS_FILE, [])
    anteriores = anteriores if isinstance(anteriores, list) else []
    previos = {str(x.get("id")): x for x in anteriores if isinstance(x, dict)}
    staff = _es_staff(discord_id)
    nuevos = entrantes if staff else _fusionar_tickets(anteriores, entrantes, discord_id)

    ahora = datetime.now(timezone.utc)
    for t in nuevos:
        if not _ticket_cerrado(t) or t.get("cierreNotificado"):
            continue
        tid = str(t.get("id"))
        previo = previos.get(tid)

        if previo is None:
            print(f"[tickets] ⚠️ {tid} llega cerrado pero no estaba en el servidor: no se avisa.")
            continue
        if _ticket_cerrado(previo):
            continue   # ya estaba cerrado antes

        print(f"[tickets] Cierre detectado: {tid}")
        t["fechaCierre"] = ahora.isoformat()
        owner = str(t.get("discordId") or "")
        if owner and (str(discord_id) == owner or staff):
            t["cierreNotificado"] = True
            background.add_task(_procesar_cierre_ticket, dict(t))
        else:
            print(f"[tickets] ⚠️ Cierre de {tid} ignorado: quien cierra ({discord_id}) no es el dueño ({owner}) ni está en STAFF_IDS.")

    escribir_json(TICKETS_FILE, nuevos)
    return {"ok": True}


@app.get("/ticket/{ticket_id}")
async def ver_ticket_cerrado(ticket_id: str, discord_id: str = Cookie(None)):
    """Copia en HTML de un ticket. Solo la ve su dueño o el staff."""
    tid = ticket_id[:-5] if ticket_id.lower().endswith(".html") else ticket_id
    if not _TID_RE.match(tid):
        return _pagina_mensaje("Ticket no encontrado", "El enlace no es válido.", 404)
    if not discord_id:
        return _pagina_mensaje("Inicia sesión", "Para ver este ticket tienes que iniciar sesión con Discord.", 401)

    lista = leer_json(TICKETS_FILE, [])
    t = next((x for x in lista if isinstance(x, dict) and str(x.get("id")) == tid), None) if isinstance(lista, list) else None
    if t is None:
        return _pagina_mensaje("Ticket no encontrado", "Este ticket no existe o ha sido eliminado.", 404)

    es_dueno = str(t.get("discordId") or "") == str(discord_id)
    if not es_dueno and not _es_staff(discord_id):
        return _pagina_mensaje("Sin acceso", "Este ticket pertenece a otro usuario.", 403)

    copia = os.path.join(TRANSCRIPTS_DIR, tid + ".html")
    try:
        with open(copia, "r", encoding="utf-8") as f:
            contenido = f.read()
    except OSError:
        contenido = _render_ticket_html(t)   # si aún no existe la copia, se genera al momento
    return HTMLResponse(content=contenido, headers={"Cache-Control": "no-store"})


# ---------- 3.D STAFF (admin/staff.html guarda, equipo.html lee) ----------
# La lista se guarda en data/staff.json.
#  - Leer: cualquiera recibe la versión pública (solo activos y sin las redes marcadas
#    como "Ocultar"). Quien puede gestionar el staff recibe la lista completa.
#  - Guardar: solo el MASTER_ADMIN_ID o un staff activo de la propia lista, y siempre
#    con sesión iniciada (el usuario sale de la cookie, nunca del cuerpo de la petición).

_REDES_STAFF = ("instagram", "youtube", "kick", "twitch")


def _staff() -> list:
    data = leer_json(STAFF_FILE, [])
    return [s for s in data if isinstance(s, dict)] if isinstance(data, list) else []


def _staff_activo(s: dict) -> bool:
    estado = str(s.get("status") or "Activo").strip().lower()
    return estado not in ("inactivo", "inactive", "0", "false")


def _puede_gestionar_staff(discord_id) -> bool:
    if not discord_id:
        return False
    did = str(discord_id).strip()
    if did == MASTER_ADMIN_ID:
        return True
    return any(
        _staff_activo(s) and str(s.get("discordId") or "").strip() == did
        for s in _staff()
    )


def _limpiar_staff(s: dict):
    """Deja solo los campos que usa la web, como texto y con un tamaño razonable."""
    sid = str(s.get("id") or "").strip()[:40]
    usuario = str(s.get("usuario") or "").strip()[:64]
    if not sid or not usuario:
        return None

    out = {
        "id": sid,
        "usuario": usuario,
        "discordId": re.sub(r"\D", "", str(s.get("discordId") or ""))[:25],
        "categoria": str(s.get("categoria") or "Moderación y Soporte").strip()[:60],
        "rango": str(s.get("rango") or "Moderador").strip()[:60],
        "especialidad": str(s.get("especialidad") or "Ninguna").strip()[:400],
        "status": "Activo" if _staff_activo(s) else "Inactivo",
        "fechaRegistro": str(s.get("fechaRegistro") or "").strip()[:40] or None,
    }
    for red in _REDES_STAFF:
        url = str(s.get(red) or "").strip()[:200]
        out[red] = url if url_segura(url) else ""
        out["hide" + red.capitalize()] = bool(s.get("hide" + red.capitalize()))
    return out


@app.get("/api/staff")
async def get_staff(discord_id: str = Cookie(None)):
    lista = _staff()
    if _puede_gestionar_staff(discord_id):
        return lista   # el panel necesita la lista completa (inactivos y redes ocultas incluidas)

    publica = []
    for s in lista:
        if not _staff_activo(s):
            continue
        p = dict(s)
        for red in _REDES_STAFF:
            if p.get("hide" + red.capitalize()):
                p[red] = ""
        publica.append(p)
    return publica


def _avisar_cambio_staff(autor: str, altas: set, bajas: set) -> None:
    """Cualquier staff activo puede editar la lista: el ID maestro se entera de cada alta o baja."""
    lineas = [f"- **__CAMBIADO POR__**: `{autor}`"]
    if altas:
        lineas.append("- **__NUEVOS EN EL STAFF__**: " + ", ".join(f"`{i}`" for i in sorted(altas)))
    if bajas:
        lineas.append("- **__QUITADOS DEL STAFF__**: " + ", ".join(f"`{i}`" for i in sorted(bajas)))
    notifier.enviar_notificacion(
        discord_id=MASTER_ADMIN_ID,
        tipo="sancion",
        titulo="CAMBIO EN EL STAFF",
        descripcion="¡Buenas!, se ha modificado la lista de staff de la web:\n\n" + "\n".join(lineas)
                    + "\n\n-# Si no lo esperabas, revisa la gestión de staff cuanto antes.",
        boton_texto="Acceder al panel online",
        boton_url=f"{PUBLIC_URL}/admin/staff.html",
    )


@app.post("/api/staff")
async def save_staff(request: Request, background: BackgroundTasks, discord_id: str = Cookie(None)):
    if not discord_id:
        raise HTTPException(status_code=401, detail="No hay sesión activa")
    if not _puede_gestionar_staff(discord_id):
        raise HTTPException(status_code=403, detail="No tienes permisos para gestionar el staff")

    lista = await _lista_desde_peticion(request)
    antes = {str(s.get("discordId")) for s in _staff() if _staff_activo(s) and s.get("discordId")}
    limpia = [seguridad.neutralizar(x) for x in (_limpiar_staff(s) for s in lista) if x]
    escribir_json(STAFF_FILE, limpia)
    despues = {s["discordId"] for s in limpia if s["status"] == "Activo" and s["discordId"]}
    if (antes != despues) and str(discord_id) != MASTER_ADMIN_ID:
        background.add_task(_avisar_cambio_staff, str(discord_id), despues - antes, antes - despues)
    print(f"[staff] ✅ Lista guardada por {discord_id}: {len(limpia)} miembros.")
    return {"ok": True, "total": len(limpia)}


# ---------- 3.F POSTULACIONES (postulaciones/post-staff, post-playmaker y post-ilegales) ----------
# Cada formulario envía aquí su solicitud. El autor sale SIEMPRE de la cookie de sesión.
#  - GET  /api/postulaciones?tipo=staff       -> el staff ve todas; el resto de usuarios, solo las suyas
#  - POST /api/postulaciones                  -> nueva postulación (queda "Pendiente")
#  - POST /api/postulaciones/{id}/estado      -> el staff la pasa a "En revisión", "Aprobada" o "Rechazada"
# Al llegar una nueva se avisa por MD al equipo administrativo; al cambiar de estado, a quien la envió.

POSTULACIONES_FILE = os.path.join(DATA_DIR, "postulaciones.json")

# max_abiertas -> cuántas puede tener a la vez sin responder (None = sin límite)
# espera_horas -> horas que tienen que pasar desde la última que envió (None = sin espera)
_TIPOS_POSTULACION = {
    "staff":     {"prefijo": "STF", "nombre": "Staff",               "pagina": "/postulaciones/post-staff.html",     "max_abiertas": 1,    "espera_horas": None},
    "playmaker": {"prefijo": "PLM", "nombre": "Playmaker",           "pagina": "/postulaciones/post-playmaker.html", "max_abiertas": None, "espera_horas": 12},
    "ilegal":    {"prefijo": "IL",  "nombre": "Organización ilegal", "pagina": "/postulaciones/post-ilegales.html",  "max_abiertas": 3,    "espera_horas": None},
}
_PIE_POSTULACIONES = ("-# ¡ATENCIÓN! Esto es un mensaje automático procedente del sistema de "
                      "notificaciones de Nyx Community.")
_EDAD_MINIMA_POSTULACION = {"staff": 18}   # edad mínima para enviar cada tipo (se comprueba aquí, no solo en la web)
_ESTADOS_POSTULACION = ("Pendiente", "En revisión", "Aprobada", "Rechazada")
_ESTADOS_ABIERTOS = ("Pendiente", "En revisión")
_PID_RE = re.compile(r"^[A-Z]{2,3}-\d{1,6}$")
_MAX_TEXTO_POSTULACION = 4000
_MAX_CAMPOS_POSTULACION = 60
_postulaciones_lock = threading.Lock()   # leer + añadir + guardar sin pisarse entre peticiones


class PostulacionIn(BaseModel):
    tipo: str
    respuestas: dict
    usuario: str = ""


class EstadoPostulacionIn(BaseModel):
    estado: str
    nota: str = ""


def _postulaciones() -> list:
    data = leer_json(POSTULACIONES_FILE, [])
    return [p for p in data if isinstance(p, dict)] if isinstance(data, list) else []


def _es_staff(discord_id) -> bool:
    did = str(discord_id or "").strip()
    return bool(did) and (did in STAFF_IDS or _puede_gestionar_staff(did))


def _limpiar_respuesta(valor, nivel: int = 0):
    """
    Solo texto, números, sí/no y listas o grupos pequeños. Hasta 3 niveles, para que quepa
    p. ej. respuestas -> integrantes (lista) -> cada integrante (rol, discord, id, steam).
    """
    if isinstance(valor, bool) or valor is None:
        return valor
    if isinstance(valor, (int, float)):
        return valor
    if isinstance(valor, str):
        return valor.strip()[:_MAX_TEXTO_POSTULACION]
    if isinstance(valor, list) and nivel < 3:
        return [x for x in (_limpiar_respuesta(v, nivel + 1) for v in valor[:20]) if x not in (None, "")]
    if isinstance(valor, dict) and nivel < 3:
        return {str(k)[:40]: _limpiar_respuesta(v, nivel + 1) for k, v in list(valor.items())[:_MAX_CAMPOS_POSTULACION]}
    return None


def _avisar_postulacion_nueva(p: dict) -> None:
    cfg = _TIPOS_POSTULACION[p["tipo"]]
    destinatarios = {str(MASTER_ADMIN_ID or "").strip(), *STAFF_IDS} - {""}
    for staff_id in destinatarios:
        notifier.enviar_notificacion(
            discord_id=staff_id,
            tipo="postulaciones",
            titulo="NUEVA POSTULACIÓN",
            descripcion=(
                "¡Buenas!, se ha recibido una nueva postulación:\n\n"
                f"- **__TIPO__**: {cfg['nombre']}\n"
                f"- **__CÓDIGO__**: {p['id']}\n"
                f"- **__USUARIO__**: {p.get('usuario') or p['discordId']}\n\n"
                f"{_PIE_POSTULACIONES}"
            ),
            boton_texto="Acceder al panel online",
            boton_url=f"{PUBLIC_URL}/admin.html",
        )
        time.sleep(notifier.PAUSA_ENTRE_DMS)


def _avisar_cambio_postulacion(p: dict) -> None:
    cfg = _TIPOS_POSTULACION.get(p.get("tipo"), {"nombre": "Postulación", "pagina": "/home.html"})
    nota = f"\n- **__NOTA DEL STAFF__**: {p['nota']}" if p.get("nota") else ""
    notifier.enviar_notificacion(
        discord_id=p.get("discordId"),
        tipo="postulaciones",
        titulo="ACTUALIZACIÓN DE TU POSTULACIÓN",
        descripcion=(
            "¡Buenas!, tu postulación ha cambiado de estado:\n\n"
            f"- **__TIPO__**: {cfg['nombre']}\n"
            f"- **__CÓDIGO__**: {p['id']}\n"
            f"- **__ESTADO__**: {p['estado']}{nota}\n\n"
            f"{_PIE_POSTULACIONES}"
        ),
        boton_texto="Ver mi postulación",
        boton_url=f"{PUBLIC_URL}{cfg['pagina']}",
    )


@app.get("/api/postulaciones")
async def listar_postulaciones(tipo: str = None, discord_id: str = Cookie(None)):
    if not discord_id:
        raise HTTPException(status_code=401, detail="No hay sesión activa")
    lista = _postulaciones()
    if tipo:
        lista = [p for p in lista if p.get("tipo") == tipo.strip().lower()]
    if not _es_staff(discord_id):
        lista = [p for p in lista if str(p.get("discordId")) == str(discord_id)]
    return sorted(lista, key=lambda p: str(p.get("fecha") or ""), reverse=True)


@app.post("/api/postulaciones")
async def crear_postulacion(datos: PostulacionIn, background_tasks: BackgroundTasks, discord_id: str = Cookie(None),
                            db: Session = Depends(get_db)):
    if not discord_id:
        raise HTTPException(status_code=401, detail="No hay sesión activa")
    tipo = datos.tipo.strip().lower()
    cfg = _TIPOS_POSTULACION.get(tipo)
    if not cfg:
        raise HTTPException(status_code=400, detail="Tipo de postulación no válido")
    respuestas = seguridad.neutralizar(_limpiar_respuesta(datos.respuestas))
    cuenta = db.query(models.UsuarioDB).filter(models.UsuarioDB.discord_id == discord_id).first()
    if not cuenta:
        raise HTTPException(status_code=401, detail="Usuario no encontrado")
    if not isinstance(respuestas, dict) or not respuestas:
        raise HTTPException(status_code=400, detail="La postulación está vacía")
    if tipo in _EDAD_MINIMA_POSTULACION:
        minima = _EDAD_MINIMA_POSTULACION[tipo]
        try:
            edad = int(str(respuestas.get("edad", "")).strip())
        except ValueError:
            edad = 0
        if edad < minima:
            raise HTTPException(status_code=400, detail=f"Para postular a {cfg['nombre']} hay que tener al menos {minima} años.")

    with _postulaciones_lock:
        lista = _postulaciones()
        mias = [p for p in lista if p.get("tipo") == tipo and str(p.get("discordId")) == str(discord_id)]

        # Límite de postulaciones sin responder a la vez
        if cfg["max_abiertas"] is not None:
            abiertas = [p for p in mias if p.get("estado") in _ESTADOS_ABIERTOS]
            if len(abiertas) >= cfg["max_abiertas"]:
                raise HTTPException(
                    status_code=409,
                    detail=f"Ya tienes {'una postulación' if cfg['max_abiertas'] == 1 else str(len(abiertas)) + ' postulaciones'} "
                           f"de {cfg['nombre']} pendiente{'s' if len(abiertas) > 1 else ''} de revisión. Espera a que el staff responda.",
                )

        # Espera mínima desde la última que envió
        if cfg["espera_horas"] and mias:
            def _fecha(p):
                try:
                    return datetime.fromisoformat(str(p.get("fecha")))
                except ValueError:
                    return datetime.min.replace(tzinfo=timezone.utc)
            ultima = max(_fecha(p) for p in mias)
            if ultima.tzinfo is None:
                ultima = ultima.replace(tzinfo=timezone.utc)
            restante = ultima + timedelta(hours=cfg["espera_horas"]) - datetime.now(timezone.utc)
            if restante.total_seconds() > 0:
                minutos = int(restante.total_seconds() // 60) + 1
                horas, mins = divmod(minutos, 60)
                cuando = (f"{horas} h {mins} min" if horas else f"{mins} min")
                raise HTTPException(
                    status_code=409,
                    detail=f"Solo puedes enviar una postulación de {cfg['nombre']} cada {cfg['espera_horas']} horas. "
                           f"Podrás enviar la siguiente dentro de {cuando}.",
                )

        patron = re.compile(rf"^{cfg['prefijo']}-(\d+)$")
        ultimo = max((int(m.group(1)) for p in lista for m in [patron.match(str(p.get("id") or ""))] if m), default=0)
        ahora = datetime.now(timezone.utc).isoformat()
        nueva = {
            "id": f"{cfg['prefijo']}-{ultimo + 1:04d}",
            "tipo": tipo,
            "discordId": str(discord_id),
            "usuario": seguridad.neutralizar(str(cuenta.username or datos.usuario.strip())[:64]),
            "estado": "Pendiente",
            "nota": "",
            "fecha": ahora,
            "fechaEstado": ahora,
            "respuestas": respuestas,
        }
        lista.append(nueva)
        escribir_json(POSTULACIONES_FILE, lista)

    print(f"[postulaciones] ✅ {nueva['id']} ({cfg['nombre']}) enviada por {discord_id}.")
    background_tasks.add_task(_avisar_postulacion_nueva, nueva)
    return nueva


@app.post("/api/postulaciones/{pid}/estado")
async def cambiar_estado_postulacion(pid: str, datos: EstadoPostulacionIn, background_tasks: BackgroundTasks,
                                     discord_id: str = Cookie(None)):
    if not discord_id:
        raise HTTPException(status_code=401, detail="No hay sesión activa")
    if not _es_staff(discord_id):
        raise HTTPException(status_code=403, detail="Solo el staff puede revisar postulaciones")
    if not _PID_RE.match(pid or ""):
        raise HTTPException(status_code=400, detail="Código de postulación no válido")
    if datos.estado not in _ESTADOS_POSTULACION:
        raise HTTPException(status_code=400, detail="Estado no válido")

    with _postulaciones_lock:
        lista = _postulaciones()
        p = next((x for x in lista if x.get("id") == pid), None)
        if not p:
            raise HTTPException(status_code=404, detail="No existe esa postulación")
        p["estado"] = datos.estado
        p["nota"] = seguridad.neutralizar(datos.nota.strip()[:1000])
        p["revisadoPor"] = str(discord_id)
        p["fechaEstado"] = datetime.now(timezone.utc).isoformat()
        escribir_json(POSTULACIONES_FILE, lista)

    background_tasks.add_task(_avisar_cambio_postulacion, dict(p))
    return p


# ---------- 3.E COMERCIOS (admin/comercios.html guarda, comercios.html lee) ----------

_COMERCIO_IMG_RE = re.compile(r"^/comercios-img/[A-Za-z0-9_-]{1,80}\.(jpg|png|webp)$")
_ESTADOS_COMERCIO = ("disponible", "adquirido", "no-disponible")


def _comercios() -> list:
    data = leer_json(COMERCIOS_FILE, [])
    return [c for c in data if isinstance(c, dict)] if isinstance(data, list) else []


def _guardar_imagen_comercio(valor):
    """
    Una imagen puede llegar como:
      - "/comercios-img/archivo.jpg"  -> ya está en el servidor, se deja igual
      - "https://..."                 -> enlace externo, se deja igual
      - "data:image/...;base64,..."   -> imagen nueva: se guarda como archivo y se devuelve su ruta
    Devuelve None si no es válida.
    """
    if not isinstance(valor, str):
        return None
    if _COMERCIO_IMG_RE.match(valor) or url_segura(valor):
        return valor[:500]
    if not valor.startswith("data:image/") or "," not in valor:
        return None
    try:
        raw = base64.b64decode(valor.split(",", 1)[1], validate=True)
    except Exception:
        return None
    if not raw or len(raw) > MAX_FOTO_BYTES:
        return None
    ext = _tipo_imagen(raw)
    if not ext:
        return None
    nombre = f"{secrets.token_urlsafe(12)}.{ext}"
    try:
        os.makedirs(COMERCIOS_IMG_DIR, exist_ok=True)
        with open(os.path.join(COMERCIOS_IMG_DIR, nombre), "wb") as f:
            f.write(raw)
    except OSError as e:
        print("[comercios] ❌ No se pudo guardar una imagen:", e)
        return None
    return f"/comercios-img/{nombre}"


def _limpiar_comercio(c: dict):
    nombre = str(c.get("nombre") or "").strip()[:80]
    if not nombre:
        return None
    estado = str(c.get("estado") or "disponible").strip().lower()
    etiquetas = c.get("etiquetas") if isinstance(c.get("etiquetas"), list) else []
    imagenes_in = c.get("imagenesData") if isinstance(c.get("imagenesData"), list) else []
    imagenes = [u for u in (_guardar_imagen_comercio(v) for v in imagenes_in[:MAX_IMG_POR_COMERCIO]) if u]
    return {
        "nombre": nombre,
        "tipo": str(c.get("tipo") or "Servicio").strip()[:40],
        "ubicacion": str(c.get("ubicacion") or "").strip()[:120],
        "fundado": re.sub(r"\D", "", str(c.get("fundado") or ""))[:4],
        "estado": estado if estado in _ESTADOS_COMERCIO else "disponible",
        "historia": str(c.get("historia") or "").strip()[:4000],
        "horario": str(c.get("horario") or "Oculto").strip()[:120],
        "precio": str(c.get("precio") or "Oculto").strip()[:120],
        "etiquetas": [str(t).strip()[:40] for t in etiquetas[:5] if str(t).strip()],
        "imagenes": len(imagenes),
        "imagenesData": imagenes,
    }


@app.get("/api/comercios")
async def get_comercios():
    return _comercios()


@app.post("/api/comercios")
async def save_comercios(request: Request, discord_id: str = Cookie(None)):
    """Guarda la lista completa de comercios. Solo el ID maestro o un staff activo."""
    if not discord_id:
        raise HTTPException(status_code=401, detail="No hay sesión activa")
    if not _puede_gestionar_staff(discord_id):
        raise HTTPException(status_code=403, detail="No tienes permisos para gestionar los comercios")

    lista = await _lista_desde_peticion(request)
    if len(lista) > MAX_COMERCIOS:
        raise HTTPException(status_code=413, detail="Demasiados comercios")

    limpia = [seguridad.neutralizar(x) for x in (_limpiar_comercio(c) for c in lista) if x]
    escribir_json(COMERCIOS_FILE, limpia)

    # Se borran del disco las imágenes que ya no usa ningún comercio
    en_uso = {os.path.basename(u) for c in limpia for u in c["imagenesData"] if _COMERCIO_IMG_RE.match(u)}
    try:
        for archivo in os.listdir(COMERCIOS_IMG_DIR):
            if archivo not in en_uso:
                os.remove(os.path.join(COMERCIOS_IMG_DIR, archivo))
    except OSError:
        pass

    print(f"[comercios] ✅ Lista guardada por {discord_id}: {len(limpia)} comercios.")
    return {"ok": True, "comercios": limpia}


# ---------- 3.F ENDPOINTS DE RELLENO ----------

@app.get("/api/clickpoints")
async def get_clickpoints(userId: str = None):
    return {"clickpoints": 0}

# Solo responde si whitelist_api.py no se ha podido cargar (si está cargado, manda el suyo)
@app.get("/api/whitelist")
async def get_whitelist(userId: str = None):
    return []

@app.get("/api/vip")
async def get_vip(userId: str = None):
    return {"isVip": False}

@app.get("/api/notificaciones")
async def get_notificaciones(userId: str = None):
    return []

@app.get("/api/propiedades")
async def get_propiedades(userId: str = None):
    return []

@app.post("/api/notificaciones/read")
async def mark_notification_read(request: Request):
    try:
        data = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="JSON inválido")
    notif_id = str(data.get("id") or "")[:60] if isinstance(data, dict) else ""
    return {"success": True, "id": notif_id}


# ---------- 3.G ESTADO DEL SERVIDOR DE FIVEM (servidor1.html) ----------
# El servidor de FiveM no deja que el navegador lea su estado (no envía CORS),
# así que la web lo pregunta aquí. Se guarda 20 s para no saturarlo.
FIVEM_DYNAMIC_URL = os.getenv("FIVEM_DYNAMIC_URL", "http://91.134.62.42:30120/dynamic.json")
_estado_servidor_cache = {"t": 0.0, "datos": None}
_estado_servidor_lock = threading.Lock()


def _leer_estado_fivem():
    try:
        r = requests.get(FIVEM_DYNAMIC_URL, timeout=4)
        r.raise_for_status()
        d = r.json()
        return {
            "online": True,
            "jugadores": int(d.get("clients") or 0),
            "max": int(d.get("sv_maxclients") or 0),
            "mapa": str(d.get("mapname") or ""),
            "modo": str(d.get("gametype") or ""),
        }
    except Exception as e:
        print(f"[servidor] ⚠️ No se pudo leer el estado de FiveM: {e}")
        return {"online": False, "jugadores": 0, "max": 0, "mapa": "", "modo": ""}


@app.get("/api/servidor/estado")
async def estado_servidor():
    ahora = time.time()
    with _estado_servidor_lock:
        if _estado_servidor_cache["datos"] and ahora - _estado_servidor_cache["t"] < 20:
            return _estado_servidor_cache["datos"]
    datos = await run_in_threadpool(_leer_estado_fivem)
    datos["actualizado"] = datetime.now(timezone.utc).isoformat()
    with _estado_servidor_lock:
        _estado_servidor_cache["t"] = ahora
        _estado_servidor_cache["datos"] = datos
    return datos


# ==========================================
# 4. ARCHIVOS ESTÁTICOS (SIEMPRE AL FINAL)
# ==========================================
public_path = os.path.join(os.path.dirname(__file__), "public")
os.makedirs(public_path, exist_ok=True)

src_path = os.path.join(public_path, "src")
os.makedirs(src_path, exist_ok=True)
app.mount("/src", StaticFiles(directory=src_path), name="src")

# Fotografías subidas por los usuarios (data/fotos -> /fotos/archivo.jpg)
os.makedirs(FOTOS_DIR, exist_ok=True)
app.mount("/fotos", StaticFiles(directory=FOTOS_DIR), name="fotos")

# Imágenes de los comercios (data/comercios_img -> /comercios-img/archivo.jpg)
os.makedirs(COMERCIOS_IMG_DIR, exist_ok=True)
app.mount("/comercios-img", StaticFiles(directory=COMERCIOS_IMG_DIR), name="comercios_img")

app.mount("/", StaticFiles(directory=public_path, html=True), name="public")