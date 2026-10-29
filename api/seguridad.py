"""
seguridad.py · Sesión firmada, protección CSRF y límite de peticiones del chat.

Mismo modelo que ClickSense: la cookie lleva el ID de Discord, la caducidad y una
firma HMAC con una clave que solo conoce el servidor, así que no se puede falsificar.
"""
import base64
import hashlib
import hmac
import json
import os
import re
import secrets
import tempfile
import time
from urllib.parse import urlsplit

def cookie_segura() -> bool:
    """Solo se marca Secure si la web se sirve por https (en localhost no haría falta)."""
    return (os.getenv("PUBLIC_URL") or "").lower().startswith("https://")


# Con https lleva el prefijo «__Host-»: el navegador solo la acepta de esta misma web, por https
# y para todo el sitio (un subdominio o una red ajena no pueden colar otra)
COOKIE_SESION = ("__Host-" if cookie_segura() else "") + (os.getenv("SESSION_COOKIE_NAME") or "aj_session").strip()

# Sesiones que no son para siempre: la cookie se borra al cerrar el navegador, caduca tras
# SESSION_IDLE_MINUTES sin usar la web (cada visita la renueva) y a las SESSION_MAX_HOURS del
# login hay que volver a entrar aunque se esté usando.
INACTIVIDAD = int(os.getenv("SESSION_IDLE_MINUTES") or 120) * 60
MAXIMO_SESION = int(os.getenv("SESSION_MAX_HOURS") or 12) * 3600
RENOVAR_CADA = 5 * 60
DURACION_SESION = MAXIMO_SESION
# ID de Discord (solo cifras) o de otra cuenta con su prefijo: google-<sub>, github-<id>
_ID_RE = re.compile(r"^(?:\d{5,25}|(?:google|github)-\d{1,30})$")

_DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
_FICHERO_CLAVE = os.path.join(_DATA_DIR, ".session_secret")


def _cargar_clave() -> bytes:
    """
    Clave de firma. Se toma de SESSION_SECRET en el .env; si no está, se genera una
    vez y se guarda en data/.session_secret para que las sesiones sobrevivan a un reinicio.
    """
    desde_env = (os.getenv("SESSION_SECRET") or "").strip()
    if len(desde_env) >= 32:
        return desde_env.encode("utf-8")
    try:
        with open(_FICHERO_CLAVE, "r", encoding="utf-8") as f:
            guardada = f.read().strip()
        if len(guardada) >= 32:
            return guardada.encode("utf-8")
    except OSError:
        pass
    nueva = secrets.token_urlsafe(48)
    os.makedirs(_DATA_DIR, exist_ok=True)
    try:
        fd = os.open(_FICHERO_CLAVE, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            f.write(nueva)
        return nueva.encode("utf-8")
    except FileExistsError:
        with open(_FICHERO_CLAVE, "r", encoding="utf-8") as f:
            return f.read().strip().encode("utf-8")


_CLAVE = _cargar_clave()


def _firma(texto: str) -> str:
    mac = hmac.new(_CLAVE, texto.encode("utf-8"), hashlib.sha256).digest()
    return base64.urlsafe_b64encode(mac).decode("ascii").rstrip("=")


def firmar_sesion(discord_id: str, inicio: int | None = None) -> str:
    """s2.<id>.<hora del login>.<caducidad>.<firma>. La caducidad nunca pasa del máximo desde el login."""
    ahora = int(time.time())
    inicio = int(inicio or ahora)
    caduca = min(ahora + INACTIVIDAD, inicio + MAXIMO_SESION)
    base = f"s2.{discord_id}.{inicio}.{caduca}"
    return f"{base}.{_firma(base)}"


def leer_sesion(token: str | None):
    """(id, inicio, caduca) si la cookie es buena, no ha caducado y no se cerró la sesión; si no, None."""
    partes = (token or "").split(".")
    if len(partes) != 5 or partes[0] != "s2":
        return None
    base = ".".join(partes[:4])
    if not hmac.compare_digest(partes[4], _firma(base)):
        return None
    did = partes[1]
    try:
        inicio, caduca = int(partes[2]), int(partes[3])
    except ValueError:
        return None
    ahora = time.time()
    if not _ID_RE.match(did) or caduca < ahora or inicio + MAXIMO_SESION < ahora or inicio > ahora + 60:
        return None
    # Sesión cerrada con «Cerrar sesión»: no vale ninguna cookie de un login anterior
    revocada = _revocadas().get(did)
    if revocada and inicio < revocada:
        return None
    return did, inicio, caduca


def verificar_sesion(token: str | None) -> str | None:
    datos = leer_sesion(token)
    return datos[0] if datos else None


def renovacion(token: str | None) -> str | None:
    """Cookie nueva (misma hora de login, más tiempo de inactividad) si toca renovarla."""
    datos = leer_sesion(token)
    if not datos:
        return None
    did, inicio, caduca = datos
    if caduca >= inicio + MAXIMO_SESION or caduca - time.time() > INACTIVIDAD - RENOVAR_CADA:
        return None
    return firmar_sesion(did, inicio)


# ---------------------------------------------------------------------------
# Cerrar sesión de verdad: la cookie firmada seguiría valiendo hasta que caduque aunque el
# navegador la borre (p. ej. si alguien la hubiera copiado). Al cerrar sesión se apunta la hora
# y se rechazan todas las cookies de ese usuario emitidas antes (en todos sus dispositivos).
# ---------------------------------------------------------------------------
_FICHERO_REVOCADAS = os.path.join(_DATA_DIR, "sesiones_revocadas.json")
_cache_revocadas = {"datos": None, "mtime": None}


def edad_sesion(token: str | None) -> float:
    """Segundos desde el login (infinito si la cookie no vale). Renovar la cookie no la rejuvenece."""
    datos = leer_sesion(token)
    return time.time() - datos[1] if datos else float("inf")


def _revocadas() -> dict:
    try:
        mtime = os.path.getmtime(_FICHERO_REVOCADAS)
    except OSError:
        return {}
    if _cache_revocadas["mtime"] != mtime:
        try:
            with open(_FICHERO_REVOCADAS, "r", encoding="utf-8") as f:
                datos = json.load(f)
        except (OSError, ValueError):
            datos = {}
        _cache_revocadas.update(datos=datos if isinstance(datos, dict) else {}, mtime=mtime)
    return _cache_revocadas["datos"]


def revocar_sesiones(discord_id: str | None) -> None:
    """Invalida todas las cookies de sesión emitidas hasta ahora para ese usuario."""
    did = str(discord_id or "")
    if not _ID_RE.match(did):
        return
    ahora = int(time.time())
    datos = {k: v for k, v in _revocadas().items() if v > ahora - DURACION_SESION}   # las viejas ya caducaron solas
    datos[did] = ahora
    os.makedirs(_DATA_DIR, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=_DATA_DIR, suffix=".tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump(datos, f)
        os.replace(tmp, _FICHERO_REVOCADAS)
    finally:
        if os.path.exists(tmp):
            os.remove(tmp)


def cabecera_cookie(valor: str) -> str:
    """Set-Cookie de la sesión: sin Max-Age/Expires, así el navegador la borra al cerrarse."""
    return f"{COOKIE_SESION}={valor}; Path=/; HttpOnly; SameSite=Lax" + ("; Secure" if cookie_segura() else "")


def poner_sesion(response, discord_id: str, inicio: int | None = None) -> None:
    response.headers.append("set-cookie", cabecera_cookie(firmar_sesion(str(discord_id), inicio)))


def quitar_sesion(response) -> None:
    response.delete_cookie(key=COOKIE_SESION, path="/", samesite="lax", secure=cookie_segura(), httponly=True)
    # Al cerrar sesión, el navegador borra también lo guardado de esta web (caché y localStorage)
    response.headers["Clear-Site-Data"] = '"cache", "storage"'


# ---------------------------------------------------------------------------
# CSRF: las peticiones que cambian datos solo se aceptan desde la propia web
# ---------------------------------------------------------------------------
def origenes_permitidos() -> set[str]:
    """PUBLIC_URL más los de ALLOWED_ORIGINS (separados por comas), como esquema://host[:puerto]."""
    lista = [os.getenv("PUBLIC_URL") or "", *(os.getenv("ALLOWED_ORIGINS") or "").split(",")]
    salida = set()
    for o in lista:
        partes = urlsplit(o.strip())
        if partes.scheme and partes.netloc:
            salida.add(f"{partes.scheme}://{partes.netloc}".lower())
    return salida


def ip_cliente(request) -> str:
    """
    IP real del visitante. Si la petición llega de un proxy en este mismo equipo (nginx o el
    servidor de Astro reenviando /api) o con TRUST_PROXY=1, se usa la que añade el proxy.
    A cualquier otro no se le cree la cabecera: podría inventarse la IP.
    """
    directa = request.client.host if request.client else "-"
    if directa in ("127.0.0.1", "::1") or os.getenv("TRUST_PROXY") == "1":
        real = (request.headers.get("x-real-ip") or "").strip()
        reenviada = (request.headers.get("x-forwarded-for") or "").split(",")[-1].strip()
        if real or reenviada:
            return real or reenviada
    return directa


def origen_valido(origin: str | None, referer: str | None) -> bool:
    procedencia = origin or referer
    if not procedencia or procedencia == "null":
        return False
    partes = urlsplit(procedencia)
    return f"{partes.scheme}://{partes.netloc}".lower() in origenes_permitidos()


# ---------------------------------------------------------------------------
# Límite de peticiones sencillo (en memoria)
# ---------------------------------------------------------------------------
_contadores: dict = {}


def demasiadas(clave: str, maximo: int, ventana_seg: int) -> bool:
    """True si 'clave' ha superado 'maximo' usos en los últimos 'ventana_seg' segundos."""
    ahora = time.time()
    lista = [t for t in _contadores.get(clave, []) if ahora - t < ventana_seg]
    if len(lista) >= maximo:
        _contadores[clave] = lista
        return True
    lista.append(ahora)
    _contadores[clave] = lista
    if len(_contadores) > 20000:          # que no crezca sin límite
        for k in list(_contadores)[:5000]:
            _contadores.pop(k, None)
    return False
