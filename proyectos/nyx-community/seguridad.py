"""
seguridad.py · Sesión firmada, protección CSRF y cabeceras de seguridad.

Antes la cookie de sesión era el ID de Discord tal cual: cualquiera podía escribir
otro ID en su navegador y entrar como esa persona (incluido el administrador).
Ahora la cookie lleva el ID, la caducidad y una firma HMAC con una clave secreta
que solo conoce el servidor, así que no se puede falsificar.

Para no tener que cambiar las ~40 rutas que leen `discord_id: str = Cookie(None)`,
el middleware comprueba la firma en cada petición y deja a las rutas solo el ID ya
verificado. Si la firma no vale (cookie antigua, manipulada o caducada), la ruta
recibe la petición sin sesión.
"""
import base64
import hashlib
import hmac
import os
import re
import secrets
import time
from urllib.parse import urlsplit

from dotenv import load_dotenv

# El nombre de la cookie y si la web va por https dependen del .env: se carga ya, aunque
# este módulo se importe antes que el load_dotenv() de main.py
load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))


def cookie_segura() -> bool:
    """Solo se marca Secure si la web se sirve por https (en localhost no haría falta)."""
    return (os.getenv("PUBLIC_URL") or "").lower().startswith("https://")


# Nombre interno que leen las rutas (discord_id: str = Cookie(None)) y nombre real de la
# cookie en el navegador. Se pueden separar (SESSION_COOKIE_NAME en .env) para que dos webs
# servidas en el mismo dominio o en localhost no se pisen la sesión.
# Con https lleva el prefijo «__Host-»: el navegador solo la acepta si viene de esta misma web,
# por https y para todo el sitio, así que un subdominio o una red ajena no pueden colar otra.
COOKIE_RUTAS = "discord_id"
COOKIE_SESION = ("__Host-" if cookie_segura() else "") + (os.getenv("SESSION_COOKIE_NAME") or COOKIE_RUTAS).strip()

# Sesiones que no son para siempre:
#  - la cookie es «de sesión»: el navegador la borra al cerrarse;
#  - caduca tras SESSION_IDLE_MINUTES sin usar la web (cada visita la renueva);
#  - y, aunque se use sin parar, a las SESSION_MAX_HOURS de entrar hay que volver a iniciar sesión.
INACTIVIDAD = int(os.getenv("SESSION_IDLE_MINUTES") or 120) * 60
MAXIMO_SESION = int(os.getenv("SESSION_MAX_HOURS") or 12) * 3600
RENOVAR_CADA = 5 * 60                       # no se reescribe la cookie en cada petición
DURACION_SESION = MAXIMO_SESION             # ninguna cookie vive más que esto
_ID_RE = re.compile(r"^\d{5,25}$")

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
    # O_EXCL: si dos procesos arrancan a la vez, solo uno la crea
    try:
        fd = os.open(_FICHERO_CLAVE, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            f.write(nueva)
        print("[seguridad] Clave de sesion nueva guardada en data/.session_secret")
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
        return None                              # formato antiguo o manipulado: hay que volver a entrar
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
    # Sesión cerrada con «Cerrar sesión» (o cuenta borrada): no vale ninguna cookie de un login anterior
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
    ahora = time.time()
    if caduca >= inicio + MAXIMO_SESION or caduca - ahora > INACTIVIDAD - RENOVAR_CADA:
        return None
    return firmar_sesion(did, inicio)


# ---------------------------------------------------------------------------
# Cerrar sesión de verdad: la cookie firmada seguiría valiendo hasta que caduque aunque el
# navegador la borre (p. ej. si alguien la hubiera copiado). Al cerrar sesión se apunta la hora
# y se rechazan todas las cookies de ese usuario emitidas antes (en todos sus dispositivos).
# ---------------------------------------------------------------------------
_FICHERO_REVOCADAS = os.path.join(_DATA_DIR, "sesiones_revocadas.json")
_cache_revocadas = {"datos": None, "mtime": None}


def _revocadas() -> dict:
    try:
        mtime = os.path.getmtime(_FICHERO_REVOCADAS)
    except OSError:
        return {}
    if _cache_revocadas["mtime"] != mtime:
        import json
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
    import json
    import tempfile
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


def _cabecera_cookie(valor: str) -> str:
    """Set-Cookie de la sesión: sin Max-Age/Expires, así el navegador la borra al cerrarse."""
    return f"{COOKIE_SESION}={valor}; Path=/; HttpOnly; SameSite=Lax" + ("; Secure" if cookie_segura() else "")


def poner_sesion(response, discord_id: str) -> None:
    response.headers.append("set-cookie", _cabecera_cookie(firmar_sesion(str(discord_id))))


def quitar_sesion(response) -> None:
    response.delete_cookie(key=COOKIE_SESION, path="/", samesite="lax", secure=cookie_segura(), httponly=True)
    # Al cerrar sesión, el navegador borra también lo guardado de esta web (datos del usuario
    # en localStorage y caché), por si el equipo es compartido
    response.headers["Clear-Site-Data"] = '"cache", "storage"'


# ---------------------------------------------------------------------------
# Middleware ASGI
# ---------------------------------------------------------------------------
_METODOS_QUE_CAMBIAN = {"POST", "PUT", "PATCH", "DELETE"}
_CABECERAS_SEGURIDAD = [
    (b"x-content-type-options", b"nosniff"),
    (b"x-frame-options", b"SAMEORIGIN"),
    (b"referrer-policy", b"strict-origin-when-cross-origin"),
    (b"permissions-policy", b"camera=(), microphone=(), geolocation=(), payment=()"),
    (b"cross-origin-opener-policy", b"same-origin"),
    # Las páginas usan <script> en línea y CDNs, así que no se limita script-src; sí se cierra
    # lo que no usa nadie: plugins (<object>/<embed>), cambiar la URL base y meter la web en un iframe ajeno
    (b"content-security-policy", b"object-src 'none'; base-uri 'self'; frame-ancestors 'self'"),
]


def _reescribir_cookies(cabecera: str) -> tuple[str, str | None]:
    """
    Sustituye la cookie de sesión firmada por el ID verificado (o la quita si no vale).
    Cualquier otra cookie con el nombre interno (discord_id) que no sea la verificada se
    descarta, para que nadie pueda colar un ID sin firmar.
    Devuelve la cabecera nueva y la cookie de sesión válida (para renovarla).
    """
    partes = []
    verificado = None
    token_bueno = None
    for trozo in cabecera.split(";"):
        nombre, sep, valor = trozo.strip().partition("=")
        if not sep:
            if trozo.strip():
                partes.append(trozo.strip())
            continue
        if nombre == COOKIE_SESION:
            token = valor.strip().strip('"')
            did = verificar_sesion(token)
            if did:
                verificado, token_bueno = did, token
            continue
        if nombre == COOKIE_RUTAS:
            continue
        partes.append(f"{nombre}={valor}")
    if verificado:
        partes.append(f"{COOKIE_RUTAS}={verificado}")
    return "; ".join(partes), token_bueno


# Páginas de pruebas y copias que no son de la web: en tu PC se ven, publicada la web no.
# Tampoco se sirve nunca nada oculto (/.algo) ni copias de seguridad o mapas de código.
_PAGINAS_DE_PRUEBA = {"home1.html", "equipo1.html", "pruebas.html"}
_RUTA_PROHIBIDA_RE = re.compile(r"(^|/)\.(?!well-known/)|\.(backup|bak|old|orig|tmp|swp|map|py|pyc|env|db|sqlite|log|ini|cfg)(\.|$)", re.I)


def _web_local() -> bool:
    return (urlsplit(os.getenv("PUBLIC_URL") or "http://localhost").hostname or "") in {"localhost", "127.0.0.1"}


def ruta_bloqueada(ruta: str) -> bool:
    if _RUTA_PROHIBIDA_RE.search(ruta):
        return True
    return not _web_local() and ruta.rsplit("/", 1)[-1].lower() in _PAGINAS_DE_PRUEBA


# Tamaño máximo de una petición (las fotos van en base64: 4 MB de imagen ≈ 5,4 MB de texto).
# Sin este tope, alguien podría mandar cientos de MB y llenar la memoria o el disco.
MAX_CUERPO = int(os.getenv("MAX_BODY_BYTES") or 8 * 1024 * 1024)

# Límite general por IP en /api y /auth (además de los límites propios de cada ruta).
# Frena a quien inunda el servidor de peticiones o prueba cosas a lo bruto.
LIMITE_LECTURAS = (int(os.getenv("RATE_LIMIT_GET") or 600), 60)     # 600 por minuto
LIMITE_ESCRITURAS = (int(os.getenv("RATE_LIMIT_POST") or 90), 60)   # 90 por minuto


def _ip_cliente(scope, cabeceras: dict) -> str:
    """
    IP real. Si la petición llega de un proxy en este mismo equipo (nginx delante de uvicorn)
    o con TRUST_PROXY=1, se usa la IP que añade el proxy; si no, todos los visitantes
    parecerían la misma IP y el límite los frenaría a todos juntos.
    """
    cliente = scope.get("client")
    directa = cliente[0] if cliente else "-"
    if directa in ("127.0.0.1", "::1") or os.getenv("TRUST_PROXY") == "1":
        real = cabeceras.get(b"x-real-ip", b"").decode("latin-1").strip()
        reenviada = cabeceras.get(b"x-forwarded-for", b"").decode("latin-1").split(",")[-1].strip()
        if real or reenviada:
            return real or reenviada
    return directa


class SeguridadMiddleware:
    """
    1. Verifica la firma de la cookie de sesión antes de que llegue a las rutas.
    2. CSRF: rechaza las peticiones que cambian datos si vienen desde otra web
       (cabecera Origin/Referer distinta del propio servidor).
    3. Límite de tamaño de las peticiones y de peticiones por IP (anti-saturación).
    4. Añade cabeceras de seguridad a todas las respuestas.
    """

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)

        cabeceras = list(scope.get("headers") or [])
        host = ""
        origen = ""
        referer = ""
        largo = None
        nuevas = []
        token_sesion = None
        for k, v in cabeceras:
            if k == b"cookie":
                texto, token = _reescribir_cookies(v.decode("latin-1"))
                token_sesion = token or token_sesion
                v = texto.encode("latin-1")
                if not v:
                    continue
            elif k == b"host":
                host = v.decode("latin-1").lower()
            elif k == b"origin":
                origen = v.decode("latin-1")
            elif k == b"referer":
                referer = v.decode("latin-1")
            elif k == b"content-length":
                try:
                    largo = int(v)
                except ValueError:
                    return await _responder(send, 400, b'{"detail":"Content-Length no v\\u00e1lido"}')
            nuevas.append((k, v))
        scope = dict(scope, headers=nuevas)
        metodo = scope.get("method")
        ruta = scope.get("path", "")

        if largo is not None and largo > MAX_CUERPO:
            return await _responder(send, 413, b'{"detail":"La petici\\u00f3n es demasiado grande"}')

        if ruta_bloqueada(ruta):
            return await _responder(send, 404, b'{"detail":"Not Found"}')

        if ruta.startswith(("/api/", "/auth/")) and not ruta.startswith("/api/interno/"):
            ip = _ip_cliente(scope, dict(cabeceras))
            maximo, ventana = LIMITE_ESCRITURAS if metodo in _METODOS_QUE_CAMBIAN else LIMITE_LECTURAS
            if demasiadas(f"ip:{metodo in _METODOS_QUE_CAMBIAN}:{ip}", maximo, ventana):
                return await _responder(send, 429, b'{"detail":"Demasiadas peticiones. Espera un momento."}',
                                        [(b"retry-after", b"30")])

        if metodo in _METODOS_QUE_CAMBIAN and not ruta.startswith("/api/interno/"):
            procedencia = origen or referer
            if procedencia and procedencia != "null":
                if urlsplit(procedencia).netloc.lower() != host:
                    return await _responder(send, 403, b'{"detail":"Petici\\u00f3n bloqueada: origen no permitido"}')
            elif origen == "null":
                return await _responder(send, 403, b'{"detail":"Petici\\u00f3n bloqueada: origen no permitido"}')

        # Cuerpo enviado por trozos (sin Content-Length): se cuenta según llega
        if largo is None and metodo in _METODOS_QUE_CAMBIAN:
            recibido = 0
            recibir_original = receive

            async def receive():
                nonlocal recibido
                mensaje = await recibir_original()
                if mensaje["type"] == "http.request":
                    recibido += len(mensaje.get("body") or b"")
                    if recibido > MAX_CUERPO:
                        return {"type": "http.disconnect"}
                return mensaje

        cabeceras_extra = list(_CABECERAS_SEGURIDAD)
        if cookie_segura():
            cabeceras_extra.append((b"strict-transport-security", b"max-age=31536000; includeSubDomains"))
        # Lo que devuelve la API (datos personales, tickets…) no se guarda en la caché del
        # navegador ni de proxies: en un PC compartido no queda nada al cerrar sesión
        if ruta.startswith(("/api/", "/auth/", "/ticket/")):
            cabeceras_extra.append((b"cache-control", b"no-store"))
        # Mientras se usa la web, la sesión se alarga (hasta el máximo desde el login)
        renovada = renovacion(token_sesion)
        prefijo_cookie = f"{COOKIE_SESION}=".encode("latin-1")

        async def enviar(mensaje):
            if mensaje["type"] == "http.response.start":
                hs = list(mensaje.get("headers") or [])
                existentes = {k.lower() for k, _ in hs}
                for k, v in cabeceras_extra:
                    if k not in existentes:
                        hs.append((k, v))
                # (si la propia ruta ya pone o borra la sesión —login, logout—, manda la ruta)
                if renovada and not any(k.lower() == b"set-cookie" and v.startswith(prefijo_cookie) for k, v in hs):
                    hs.append((b"set-cookie", _cabecera_cookie(renovada).encode("latin-1")))
                mensaje = dict(mensaje, headers=hs)
            await send(mensaje)

        return await self.app(scope, receive, enviar)


async def _responder(send, codigo: int, cuerpo: bytes, extra: list | None = None):
    await send({
        "type": "http.response.start",
        "status": codigo,
        "headers": [(b"content-type", b"application/json"), (b"content-length", str(len(cuerpo)).encode()),
                    *_CABECERAS_SEGURIDAD, *(extra or [])],
    })
    await send({"type": "http.response.body", "body": cuerpo})


# ---------------------------------------------------------------------------
# Límite de peticiones sencillo (en memoria) para rutas sensibles
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


# ---------------------------------------------------------------------------
# Texto escrito por la gente: sin caracteres que puedan formar HTML
# ---------------------------------------------------------------------------
# Muchas páginas pintan los datos con innerHTML. Aunque las importantes ya escapan el texto,
# basta un olvido en una de las ~50 páginas para que un ticket, una sugerencia o una
# postulación con <img onerror=...> ejecute código en el navegador del staff (y, con su
# sesión, se haga admin). Por eso el servidor guarda el texto ya sin < > " ' : se cambian por
# sus equivalentes tipográficos, que se leen igual pero el navegador nunca toma por código.
_SUSTITUTOS_HTML = str.maketrans({"<": "‹", ">": "›", '"': "”", "'": "’", "`": "ˋ"})


def neutralizar(valor, _nivel: int = 0):
    """Copia de 'valor' (texto, lista o dict, también sus claves) sin caracteres de HTML."""
    if isinstance(valor, str):
        return valor.translate(_SUSTITUTOS_HTML)
    if _nivel > 12:
        return None
    if isinstance(valor, list):
        return [neutralizar(v, _nivel + 1) for v in valor]
    if isinstance(valor, dict):
        return {(k.translate(_SUSTITUTOS_HTML) if isinstance(k, str) else k): neutralizar(v, _nivel + 1)
                for k, v in valor.items()}
    return valor


def json_para_script(datos) -> str:
    """JSON que se puede meter dentro de <script> sin que un texto como </script> lo rompa."""
    import json
    return (json.dumps(datos, ensure_ascii=False)
            .replace("<", "\\u003c").replace(">", "\\u003e").replace("&", "\\u0026")
            .replace("\u2028", "\\u2028").replace("\u2029", "\\u2029"))
