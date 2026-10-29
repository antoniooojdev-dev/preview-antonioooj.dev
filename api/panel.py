"""
panel.py · Panel de administración (/admin): tus bots de Discord.

Discord no permite listar las aplicaciones de tu Developer Portal desde fuera (haría falta
el token de tu cuenta, y eso va contra sus normas), así que cada bot se da de alta una vez:
  - por carpeta: el token se lee en cada uso del .env del propio bot (no se copia a ningún sitio)
  - o pegando el token: se guarda cifrado en data/chat.db
El token nunca sale de la API: al navegador solo llegan nombres, servidores y comandos.

Con el token del bot se puede: ver su información, los servidores donde está, salir de
uno, sus comandos (globales y por servidor) y generar el enlace para invitarlo a otro.
Añadirlo a un servidor nuevo siempre lo tiene que confirmar una persona en Discord.
"""
import asyncio
import json
import os
import re
import time
from pathlib import Path
from urllib.parse import urlsplit

import httpx
import psutil
from cryptography.fernet import Fernet, InvalidToken
from dotenv import dotenv_values
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from starlette.concurrency import run_in_threadpool

import db

DISCORD_API = "https://discord.com/api/v10"
CDN = "https://cdn.discordapp.com"
USER_AGENT = "DiscordBot (https://antonioooj.dev, 1.0) panel"

# Nombres habituales de la variable del token en el .env de un bot (se usa la primera con valor)
CLAVES_TOKEN = ("DISCORD_NOTIFY_BOT_TOKEN", "DISCORD_BOT_TOKEN", "DISCORD_TOKEN", "BOT_TOKEN", "TOKEN")

# Bot de la propia web (MD de tickets, aviso de sesión y estado de «Sobre mí»): su token está
# en el .env de esta API. En cuanto tiene token, se da de alta solo en el panel.
CARPETA_API = Path(__file__).resolve().parent
CLAVES_WEB = ("DISCORD_NOTIFY_BOT_TOKEN", "DISCORD_BOT_TOKEN")

# Dónde buscar proyectos de bots. Por defecto, la carpeta que contiene el portfolio (Developer).
_RAIZ_DEFECTO = Path(__file__).resolve().parents[2]
RAICES = [Path(r) for r in (os.getenv("BOTS_ROOTS") or str(_RAIZ_DEFECTO)).split(";") if r.strip()]
PROFUNDIDAD = 3
SALTAR = {"node_modules", ".venv", "venv", "env", ".git", "_backups", "dist", "build", "__pycache__", ".astro",
          "public", "src", "data"}

_ID_RE = re.compile(r"^\d{5,25}$")

# Permisos para la invitación (bits de Discord)
_P = {
    "add_reactions": 1 << 6, "view_channel": 1 << 10, "send_messages": 1 << 11, "manage_messages": 1 << 13,
    "embed_links": 1 << 14, "attach_files": 1 << 15, "read_history": 1 << 16, "external_emojis": 1 << 18,
    "use_commands": 1 << 31, "send_in_threads": 1 << 38,
}
PERMISOS = {
    "admin": {"nombre": "Administrador", "valor": 8},
    "recomendados": {"nombre": "Recomendados (leer, escribir, gestionar mensajes)", "valor": sum(_P.values())},
    "ninguno": {"nombre": "Sin permisos (solo comandos)", "valor": 0},
}


# ---------------------------------------------------------------------------
# Tokens pegados a mano: cifrados con una clave propia (data/.panel_key)
# ---------------------------------------------------------------------------
_FICHERO_CLAVE = Path(__file__).parent / "data" / ".panel_key"


def _fernet() -> Fernet:
    clave = (os.getenv("PANEL_KEY") or "").strip()
    if not clave:
        try:
            clave = _FICHERO_CLAVE.read_text("utf-8").strip()
        except OSError:
            clave = Fernet.generate_key().decode()
            _FICHERO_CLAVE.parent.mkdir(parents=True, exist_ok=True)
            try:
                fd = os.open(_FICHERO_CLAVE, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
                with os.fdopen(fd, "w", encoding="utf-8") as f:
                    f.write(clave)
            except FileExistsError:
                clave = _FICHERO_CLAVE.read_text("utf-8").strip()
    return Fernet(clave.encode())


def cifrar(token: str) -> str:
    return _fernet().encrypt(token.encode()).decode()


def descifrar(dato: str) -> str:
    try:
        return _fernet().decrypt(dato.encode()).decode()
    except InvalidToken:
        raise HTTPException(500, "No se pudo descifrar el token guardado (¿ha cambiado la clave del panel?)")


def limpiar_token(t: str) -> str:
    t = (t or "").strip().strip('"').strip("'")
    return t[4:].strip() if t.lower().startswith("bot ") else t


# ---------------------------------------------------------------------------
# Discord
# ---------------------------------------------------------------------------
class DiscordError(Exception):
    def __init__(self, status: int, mensaje: str):
        super().__init__(mensaje)
        self.status = status
        self.mensaje = mensaje


async def discord(token: str, metodo: str, ruta: str, **kw):
    async with httpx.AsyncClient(timeout=10) as http:
        try:
            r = await http.request(metodo, DISCORD_API + ruta, headers={
                "Authorization": f"Bot {token}", "User-Agent": USER_AGENT}, **kw)
        except httpx.HTTPError:
            raise DiscordError(502, "No se pudo conectar con Discord")
    if r.status_code == 204:
        return None
    if r.status_code == 429:
        espera = 1.0
        try:
            espera = float(r.json().get("retry_after", 1))
        except (ValueError, AttributeError):
            pass
        raise DiscordError(429, f"Discord pide esperar {max(1, round(espera))} s antes de repetir")
    if r.status_code == 401:
        raise DiscordError(401, "El token no es válido (¿lo has regenerado en el Developer Portal?)")
    if r.status_code == 403:
        raise DiscordError(403, "El bot no tiene permiso para hacer esto")
    if r.status_code == 404:
        raise DiscordError(404, "Discord no lo encuentra")
    if r.status_code >= 400:
        raise DiscordError(r.status_code, f"Discord respondió con un error ({r.status_code})")
    return r.json()


def _http(e: DiscordError) -> HTTPException:
    return HTTPException(e.status if e.status in (401, 403, 404, 429) else 502, e.mensaje)


# Caché corta para no gastar el límite de peticiones de Discord al recargar el panel
_cache: dict = {}


async def cacheado(clave: tuple, ttl: int, fn):
    ahora = time.time()
    hit = _cache.get(clave)
    if hit and hit[0] > ahora:
        return hit[1]
    datos = await fn()
    _cache[clave] = (ahora + ttl, datos)
    return datos


def olvidar(bot_id: int) -> None:
    for k in [k for k in _cache if k[0] == bot_id]:
        _cache.pop(k, None)


def avatar_usuario(u: dict) -> str | None:
    return f"{CDN}/avatars/{u['id']}/{u['avatar']}.png?size=128" if u.get("avatar") else None


def icono_app(a: dict) -> str | None:
    return f"{CDN}/app-icons/{a['id']}/{a['icon']}.png?size=128" if a.get("icon") else None


def icono_servidor(g: dict) -> str | None:
    return f"{CDN}/icons/{g['id']}/{g['icon']}.png?size=96" if g.get("icon") else None


async def info_bot(bot_id: int, token: str) -> dict:
    """Aplicación + usuario del bot."""
    async def pedir():
        app, usuario = await asyncio.gather(discord(token, "GET", "/applications/@me"),
                                            discord(token, "GET", "/users/@me"))
        return {
            "appId": app["id"],
            "nombre": app.get("name") or usuario.get("username"),
            "descripcion": app.get("description") or "",
            "icono": icono_app(app) or avatar_usuario(usuario),
            "usuario": usuario.get("username"),
            "usuarioId": usuario.get("id"),
            "publico": bool(app.get("bot_public")),
            "verificado": bool(int(usuario.get("public_flags") or 0) & (1 << 16)),   # VERIFIED_BOT
            "servidoresAprox": app.get("approximate_guild_count"),
            "propietario": (app.get("owner") or {}).get("username"),
        }
    return await cacheado((bot_id, "info"), 60, pedir)


async def servidores(bot_id: int, token: str) -> list:
    async def pedir():
        lista, despues = [], None
        while True:
            params = {"limit": 200, "with_counts": "true"}
            if despues:
                params["after"] = despues
            trozo = await discord(token, "GET", "/users/@me/guilds", params=params)
            lista.extend(trozo)
            if len(trozo) < 200 or len(lista) >= 2000:
                break
            despues = trozo[-1]["id"]
        return [
            {
                "id": g["id"],
                "nombre": g.get("name"),
                "icono": icono_servidor(g),
                "miembros": g.get("approximate_member_count"),
                "enLinea": g.get("approximate_presence_count"),
                "admin": bool(int(g.get("permissions") or 0) & 8),
            }
            for g in sorted(lista, key=lambda g: (g.get("name") or "").lower())
        ]
    return await cacheado((bot_id, "servidores"), 30, pedir)


_TIPOS_COMANDO = {1: "slash", 2: "usuario", 3: "mensaje", 4: "actividad"}


def comando_json(c: dict) -> dict:
    opciones = c.get("options") or []
    sub = [o for o in opciones if o.get("type") in (1, 2)]
    return {
        "id": c["id"],
        "nombre": c.get("name"),
        "descripcion": c.get("description") or "",
        "tipo": _TIPOS_COMANDO.get(c.get("type", 1), "slash"),
        "opciones": [o.get("name") for o in opciones if o.get("type") not in (1, 2)],
        "subcomandos": [o.get("name") for o in sub],
        "soloPermisos": c.get("default_member_permissions") not in (None, ""),
        "nsfw": bool(c.get("nsfw")),
    }


async def comandos(bot_id: int, token: str, app_id: str, servidor: str | None = None) -> list:
    ruta = f"/applications/{app_id}/guilds/{servidor}/commands" if servidor else f"/applications/{app_id}/commands"

    async def pedir():
        return sorted((comando_json(c) for c in await discord(token, "GET", ruta)), key=lambda c: c["nombre"] or "")
    return await cacheado((bot_id, "comandos", servidor or "global"), 60, pedir)


# ---------------------------------------------------------------------------
# Carpetas y procesos
# ---------------------------------------------------------------------------
def _norm(ruta: str) -> str:
    return os.path.normcase(os.path.abspath(ruta))


def clave_token_env(carpeta: Path) -> str | None:
    """Primera variable de CLAVES_TOKEN con valor en el .env de la carpeta."""
    env = carpeta / ".env"
    if not env.is_file():
        return None
    valores = dotenv_values(env)
    return next((k for k in CLAVES_TOKEN if (valores.get(k) or "").strip()), None)


def _leer_json(ruta: Path) -> dict:
    try:
        return json.loads(ruta.read_text("utf-8"))
    except (OSError, ValueError):
        return {}


def _libreria_python(carpeta: Path) -> str | None:
    for nombre in ("requirements.txt", "pyproject.toml"):
        try:
            texto = (carpeta / nombre).read_text("utf-8", errors="ignore").lower()
        except OSError:
            continue
        for lib in ("discord.py", "py-cord", "nextcord", "disnake", "discord"):
            m = re.search(rf"^\s*\"?{re.escape(lib)}\b[^\n]*", texto, re.M)
            if m:
                return m.group(0).strip().strip('",')
    return None


def analizar_carpeta(carpeta: Path) -> dict | None:
    """
    Tipo de proyecto, librería de Discord y cómo se arranca. None si no parece un bot.
    Una carpeta puede tener Node y Python a la vez (p. ej. ClickSense: web Express + bot
    discord.py): manda el lado que usa una librería de Discord.
    """
    node = None
    if (carpeta / "package.json").is_file():
        pkg = _leer_json(carpeta / "package.json")
        deps = {**(pkg.get("dependencies") or {}), **(pkg.get("devDependencies") or {})}
        lib = next((f"{n} {deps[n]}" for n in ("discord.js", "eris", "oceanic.js", "@discordjs/core") if n in deps), None)
        scripts = pkg.get("scripts") or {}
        arranque = "npm start" if "start" in scripts else f"node {pkg.get('main') or 'index.js'}"
        node = {"tipo": "Node.js", "libreria": lib, "arranque": arranque, "scripts": sorted(scripts),
                "nombreProyecto": pkg.get("name")}

    python = None
    lib = _libreria_python(carpeta)
    if lib or any((carpeta / f).is_file() for f in ("bot.py", "requirements.txt")):
        principal = next((f for f in ("run.py", "bot.py", "main.py", "app.py") if (carpeta / f).is_file()), None)
        python = {"tipo": "Python", "libreria": lib, "arranque": f"python {principal}" if principal else None,
                  "scripts": [], "nombreProyecto": carpeta.name}

    if python and python["libreria"] and not (node and node["libreria"]):
        return python
    return node or python


def _procesos() -> list:
    """Procesos de Python/Node con su carpeta de trabajo y comando."""
    salida = []
    for pr in psutil.process_iter(["pid", "name", "cmdline", "create_time"]):
        try:
            nombre = (pr.info["name"] or "").lower()
            if not any(x in nombre for x in ("python", "node", "bun", "deno")):
                continue
            cmd = pr.info["cmdline"] or []
            if any("multiprocessing" in a for a in cmd):
                continue      # hijos internos de un proceso que ya sale en la lista
            try:
                cwd = _norm(pr.cwd())
            except (psutil.AccessDenied, psutil.ZombieProcess, OSError):
                cwd = ""
            salida.append({"pid": pr.info["pid"], "nombre": pr.info["name"], "cwd": cwd, "cmd": cmd,
                           "desde": int(pr.info["create_time"] or 0)})
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            continue
    return salida


def procesos_en(carpeta: str, lista: list) -> list:
    base = _norm(carpeta)
    dentro = lambda r: bool(r) and (r == base or r.startswith(base + os.sep))  # noqa: E731
    salida, vistos = [], set()
    for p in sorted(lista, key=lambda p: p["desde"]):
        if not (dentro(p["cwd"]) or any(dentro(_norm(a)) for a in p["cmd"][1:] if os.path.isabs(a))):
            continue
        # En Windows el python.exe del .venv lanza el Python real con los mismos argumentos: se cuenta una vez
        firma = (p["cwd"], tuple(p["cmd"][1:]))
        if firma in vistos:
            continue
        vistos.add(firma)
        salida.append({"pid": p["pid"], "programa": p["nombre"], "comando": " ".join(p["cmd"])[:240],
                       "desde": p["desde"]})
    return salida


def info_carpeta(carpeta: str, lista_procesos: list | None = None) -> dict:
    p = Path(carpeta)
    existe = p.is_dir()
    datos = analizar_carpeta(p) if existe else None
    claves_env = []
    if existe and (p / ".env").is_file():
        claves_env = sorted(k for k in dotenv_values(p / ".env"))   # solo nombres, nunca valores
    return {
        "ruta": str(p),
        "existe": existe,
        **(datos or {"tipo": None, "libreria": None, "arranque": None, "scripts": [], "nombreProyecto": None}),
        "env": claves_env,
        "procesos": procesos_en(carpeta, lista_procesos if lista_procesos is not None else _procesos()) if existe else [],
    }


def detectar_carpetas() -> list:
    registradas = {_norm(b["carpeta"]) for b in db.bots() if b["carpeta"]}
    vistas, salida = set(), []
    for raiz in RAICES:
        if not raiz.is_dir():
            continue
        base_len = len(raiz.parts)
        for dirpath, dirnames, _ in os.walk(raiz):
            actual = Path(dirpath)
            if len(actual.parts) - base_len >= PROFUNDIDAD:
                dirnames[:] = []
            dirnames[:] = [d for d in dirnames if d not in SALTAR and not d.startswith(".")]
            datos = analizar_carpeta(actual)
            clave = clave_token_env(actual)
            if not (clave or (datos and datos["libreria"])):
                continue
            n = _norm(dirpath)
            if n in vistas:
                continue
            vistas.add(n)
            salida.append({
                "carpeta": str(actual),
                "nombre": actual.name,
                "tipo": datos["tipo"] if datos else None,
                "libreria": datos["libreria"] if datos else None,
                "claveToken": clave,
                "registrado": n in registradas,
            })
    return sorted(salida, key=lambda d: (d["registrado"], d["claveToken"] is None, d["nombre"].lower()))


# ---------------------------------------------------------------------------
# Rutas
# ---------------------------------------------------------------------------
class NuevoBot(BaseModel):
    carpeta: str | None = None
    token: str | None = None


def token_de(b) -> str:
    if b["token_cifrado"]:
        return descifrar(b["token_cifrado"])
    if b["carpeta"] and b["env_clave"]:
        env = Path(b["carpeta"]) / ".env"
        if not env.is_file():
            raise HTTPException(409, f"No se encuentra el .env en {b['carpeta']}")
        token = limpiar_token(dotenv_values(env).get(b["env_clave"]) or "")
        if not token:
            raise HTTPException(409, f"{b['env_clave']} está vacío en el .env de la carpeta")
        return token
    raise HTTPException(409, "Este bot no tiene token configurado")


def bot_o_404(bot_id: int):
    b = db.bot(bot_id)
    if not b:
        raise HTTPException(404, "Bot no encontrado")
    return b


def carpeta_local() -> bool:
    """Abrir carpetas solo tiene sentido con la API en tu propio PC (Windows, web en localhost)."""
    return os.name == "nt" and urlsplit(os.getenv("PUBLIC_URL") or "").hostname in {"localhost", "127.0.0.1"}


def clave_web() -> str | None:
    """Variable del .env de la API que tiene el token del bot de la web (la primera con valor)."""
    valores = dotenv_values(CARPETA_API / ".env") if (CARPETA_API / ".env").is_file() else {}
    return next((k for k in CLAVES_WEB if (valores.get(k) or os.getenv(k) or "").strip()), None)


# App de Discord del token de la web (para reconocerlo aunque se añadiera pegando el token)
_web_app = {"token": "", "id": None}


def es_bot_web(b) -> bool:
    if b["carpeta"] and _norm(b["carpeta"]) == _norm(str(CARPETA_API)):
        return True
    return bool(_web_app["id"]) and b["app_id"] == _web_app["id"]


async def registrar_bot_web() -> None:
    """Da de alta el bot de la web en el panel si tiene token y aún no está."""
    clave = clave_web()
    if not clave:
        _web_app.update(token="", id=None)
        return
    token = limpiar_token(dotenv_values(CARPETA_API / ".env").get(clave) or os.getenv(clave) or "")
    if token != _web_app["token"]:
        # Solo se pregunta a Discord cuando cambia el token
        try:
            usuario, app = await asyncio.gather(discord(token, "GET", "/users/@me"),
                                                discord(token, "GET", "/applications/@me"))
        except DiscordError:
            _web_app.update(token="", id=None)
            return
        _web_app.update(token=token, id=app["id"], nombre=app.get("name") or usuario.get("username"))
    if any(es_bot_web(b) for b in db.bots()):
        return      # ya está (por carpeta o porque se añadió a mano con su token)
    db.nuevo_bot(_web_app["id"], _web_app.get("nombre") or "Bot de la web", str(CARPETA_API), clave, None)


def crear_router(solo_admin) -> APIRouter:
    r = APIRouter(prefix="/api/panel", dependencies=[Depends(solo_admin)])

    @r.get("/resumen")
    async def resumen():
        await registrar_bot_web()
        return {"bots": len(db.bots()), "chatSinLeer": db.total_sin_leer_admin(),
                "opinionesSinLeer": db.opiniones_sin_leer(), "abrirCarpetas": carpeta_local(),
                "permisos": PERMISOS,
                "botWeb": {"configurado": bool(clave_web()), "clave": clave_web(), "carpeta": str(CARPETA_API),
                           "registrado": any(es_bot_web(b) for b in db.bots())}}

    @r.get("/bots")
    async def listar():
        await registrar_bot_web()
        filas = sorted(db.bots(), key=lambda b: not es_bot_web(b))     # el de la web, primero
        lista_procesos = await run_in_threadpool(_procesos)

        async def uno(b):
            base = {"id": b["id"], "appId": b["app_id"], "nombre": b["nombre"], "carpeta": b["carpeta"],
                    "origenToken": f".env → {b['env_clave']}" if b["env_clave"] else "guardado (cifrado)",
                    "procesos": procesos_en(b["carpeta"], lista_procesos) if b["carpeta"] else [],
                    "error": None, "icono": None, "servidores": None, "web": es_bot_web(b)}
            try:
                token = token_de(b)
                info, servs = await asyncio.gather(info_bot(b["id"], token), servidores(b["id"], token))
                if info["nombre"] and info["nombre"] != b["nombre"]:
                    db.renombrar_bot(b["id"], info["nombre"])
                base.update(nombre=info["nombre"], icono=info["icono"], usuario=info["usuario"],
                            servidores=len(servs))
            except HTTPException as e:
                base["error"] = e.detail
            except DiscordError as e:
                base["error"] = e.mensaje
            return base

        return await asyncio.gather(*(uno(b) for b in filas))

    @r.get("/bots/detectar")
    async def detectar():
        return await run_in_threadpool(detectar_carpetas)

    @r.post("/bots", status_code=201)
    async def anadir(datos: NuevoBot):
        carpeta = (datos.carpeta or "").strip().strip('"') or None
        token = limpiar_token(datos.token or "") or None
        env_clave = None
        if carpeta:
            p = Path(carpeta)
            if not p.is_absolute() or not p.is_dir():
                raise HTTPException(400, "La carpeta no existe (usa la ruta completa)")
            carpeta = str(p.resolve())
            if not token:
                env_clave = clave_token_env(p)
                if not env_clave:
                    raise HTTPException(400, f"No hay token en {p / '.env'} (busco {', '.join(CLAVES_TOKEN)}). "
                                             "Pégalo a mano.")
                token = limpiar_token(dotenv_values(p / ".env").get(env_clave) or "")
        if not token:
            raise HTTPException(400, "Indica la carpeta del bot o pega su token")
        if len(token) < 50 or len(token) > 120:
            raise HTTPException(400, "Eso no parece un token de bot")

        try:
            usuario, app = await asyncio.gather(discord(token, "GET", "/users/@me"),
                                                discord(token, "GET", "/applications/@me"))
        except DiscordError as e:
            raise _http(e)
        if not usuario.get("bot"):
            raise HTTPException(400, "Ese token no es de un bot")
        if db.bot_por_app(app["id"]):
            raise HTTPException(409, f"{app.get('name')} ya está en el panel")

        nuevo = db.nuevo_bot(app["id"], app.get("name") or usuario.get("username") or "Bot", carpeta, env_clave,
                             None if env_clave else cifrar(token))
        return {"id": nuevo, "nombre": app.get("name")}

    @r.delete("/bots/{bot_id}")
    def quitar(bot_id: int):
        bot_o_404(bot_id)
        db.borrar_bot(bot_id)
        olvidar(bot_id)
        return {"ok": True}

    @r.get("/bots/{bot_id}")
    async def detalle(bot_id: int, recargar: bool = False):
        b = bot_o_404(bot_id)
        if recargar:
            olvidar(bot_id)
        token = token_de(b)
        try:
            info, servs, globales = await asyncio.gather(
                info_bot(bot_id, token), servidores(bot_id, token), comandos(bot_id, token, b["app_id"]))
        except DiscordError as e:
            raise _http(e)
        carpeta = await run_in_threadpool(info_carpeta, b["carpeta"]) if b["carpeta"] else None
        return {
            "id": b["id"],
            "web": es_bot_web(b),
            "origenToken": f".env → {b['env_clave']}" if b["env_clave"] else "guardado (cifrado)",
            "info": info,
            "servidores": servs,
            "comandos": globales,
            "carpeta": carpeta,
        }

    @r.get("/bots/{bot_id}/servidores/{servidor}/comandos")
    async def comandos_servidor(bot_id: int, servidor: str):
        b = bot_o_404(bot_id)
        if not _ID_RE.match(servidor):
            raise HTTPException(400, "Servidor no válido")
        try:
            return await comandos(bot_id, token_de(b), b["app_id"], servidor)
        except DiscordError as e:
            if e.status == 403:
                raise HTTPException(403, "El bot no se invitó con «applications.commands» en este servidor")
            raise _http(e)

    @r.delete("/bots/{bot_id}/servidores/{servidor}")
    async def salir(bot_id: int, servidor: str):
        b = bot_o_404(bot_id)
        if not _ID_RE.match(servidor):
            raise HTTPException(400, "Servidor no válido")
        try:
            await discord(token_de(b), "DELETE", f"/users/@me/guilds/{servidor}")
        except DiscordError as e:
            raise _http(e)
        olvidar(bot_id)
        return {"ok": True}

    @r.post("/bots/{bot_id}/abrir-carpeta")
    def abrir_carpeta(bot_id: int):
        b = bot_o_404(bot_id)
        if not carpeta_local():
            raise HTTPException(400, "Solo se puede abrir con el panel en tu PC")
        if not b["carpeta"] or not Path(b["carpeta"]).is_dir():
            raise HTTPException(404, "La carpeta no existe")
        os.startfile(b["carpeta"])  # type: ignore[attr-defined]  (solo Windows)
        return {"ok": True}

    return r

