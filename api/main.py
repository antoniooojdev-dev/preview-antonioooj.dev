"""
main.py · API del chat de antonioooj.dev

Los clientes inician sesión con Discord y hablan directamente con Antonio desde /chat.
Antonio entra con su propia cuenta de Discord (ADMIN_DISCORD_IDS) y la misma página
le muestra todas las conversaciones para responder.

Arranque en local: lo arranca solo `npm run dev` en el portfolio (puerto 8002), y
Astro reenvía /api a este servidor, así que web y API comparten origen y cookie.
"""
import json
import os
import re
import secrets
import time
from contextlib import asynccontextmanager
from urllib.parse import urlencode, urlsplit

import httpx
from dotenv import load_dotenv
from fastapi import BackgroundTasks, Depends, FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse
from pydantic import BaseModel

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

import db  # noqa: E402  (después de load_dotenv)
import panel  # noqa: E402
import proyectos  # noqa: E402
import seguridad  # noqa: E402
import estado  # noqa: E402
import presencia  # noqa: E402
import spotify  # noqa: E402
import notificar  # noqa: E402
import transcripcion  # noqa: E402
import tickets  # noqa: E402
import opiniones  # noqa: E402

DISCORD_API = "https://discord.com/api/v10"
CLIENT_ID = (os.getenv("DISCORD_CLIENT_ID") or "").strip()
CLIENT_SECRET = (os.getenv("DISCORD_CLIENT_SECRET") or "").strip()
PUBLIC_URL = (os.getenv("PUBLIC_URL") or "http://localhost:4321").rstrip("/")
# Dirección de esta API vista desde fuera. Por defecto la misma que la web (/api reenviado).
API_URL = (os.getenv("API_URL") or PUBLIC_URL).rstrip("/")
REDIRECT_URI = f"{API_URL}/api/auth/discord/callback"
ADMIN_IDS = {x.strip() for x in (os.getenv("ADMIN_DISCORD_IDS") or "").split(",") if x.strip()}
ADMIN_NOMBRE = (os.getenv("ADMIN_NAME") or "Antonio").strip()
# Solo para probar en local sin Discord. Nunca activar en producción.
DEMO_LOGIN = os.getenv("DEMO_LOGIN") == "1"

COOKIE_ESTADO = "aj_oauth_state"
COOKIE_VOLVER = "aj_oauth_next"
PAGINAS_VOLVER = {"/", "/chat", "/admin", "/contacto", "/cuenta"}      # adónde se puede volver tras iniciar sesión
MAX_TEXTO = 2000
_ID_RE = re.compile(r"^\d{5,25}$")

db.iniciar()


@asynccontextmanager
async def ciclo_de_vida(_app):
    # Bot de Discord que sigue tu estado para «Sobre mí» (no hace nada sin DISCORD_BOT_TOKEN)
    presencia.arrancar()
    yield
    await presencia.parar()


app = FastAPI(title="Chat antonioooj.dev", docs_url=None, redoc_url=None, openapi_url=None, lifespan=ciclo_de_vida)

# Solo hace falta si la API va en otro dominio (p. ej. api.antonioooj.dev)
if os.getenv("ALLOWED_ORIGINS"):
    app.add_middleware(
        CORSMiddleware,
        allow_origins=sorted(seguridad.origenes_permitidos()),
        allow_credentials=True,
        allow_methods=["GET", "POST"],
        allow_headers=["Content-Type"],
    )


# Nada de lo que recibe esta API pasa de unos KB (mensajes de 2000 caracteres, tokens...)
MAX_CUERPO = 256 * 1024
# Peticiones por IP y minuto (además de los límites propios de cada ruta)
LIMITE_LECTURAS = 300
LIMITE_ESCRITURAS = 60


@app.middleware("http")
async def cabeceras(request: Request, call_next):
    escribe = request.method in {"POST", "PUT", "PATCH", "DELETE"}
    # Peticiones enormes: fuera antes de leerlas (anti-saturación)
    try:
        largo = int(request.headers.get("content-length") or 0)
    except ValueError:
        return JSONResponse({"detail": "Content-Length no válido"}, status_code=400)
    if largo > MAX_CUERPO or (escribe and "chunked" in (request.headers.get("transfer-encoding") or "").lower()):
        return JSONResponse({"detail": "La petición es demasiado grande"}, status_code=413)
    # Límite general por IP: frena a quien inunda la API de peticiones
    ip = seguridad.ip_cliente(request)
    if seguridad.demasiadas(f"ip:{escribe}:{ip}", LIMITE_ESCRITURAS if escribe else LIMITE_LECTURAS, 60):
        return JSONResponse({"detail": "Demasiadas peticiones. Espera un momento."}, status_code=429,
                            headers={"Retry-After": "30"})
    # CSRF: lo que cambia datos solo se acepta si viene de la propia web
    if escribe and not seguridad.origen_valido(request.headers.get("origin"), request.headers.get("referer")):
        return JSONResponse({"detail": "Origen no permitido"}, status_code=403)
    respuesta = await call_next(request)
    # Mientras se usa la web, la sesión se alarga (hasta el máximo desde el login). Si la propia
    # ruta ya pone o borra la cookie (login, logout), manda la ruta.
    renovada = seguridad.renovacion(request.cookies.get(seguridad.COOKIE_SESION))
    if renovada and not any(v.startswith(f"{seguridad.COOKIE_SESION}=")
                            for k, v in respuesta.headers.items() if k == "set-cookie"):
        respuesta.headers.append("set-cookie", seguridad.cabecera_cookie(renovada))
    respuesta.headers.setdefault("Cache-Control", "no-store")
    respuesta.headers.setdefault("X-Content-Type-Options", "nosniff")
    respuesta.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    respuesta.headers.setdefault("X-Frame-Options", "DENY")
    if seguridad.cookie_segura():
        respuesta.headers.setdefault("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
    return respuesta



# ---------------------------------------------------------------------------
# Sesión
# ---------------------------------------------------------------------------
avatar_url = tickets.avatar_url


def usuario_json(u) -> dict:
    return {
        "id": u["id"],
        "usuario": u["usuario"],
        "nombre": u["nombre"],
        "avatar": avatar_url(u["id"], u["avatar"]),
    }


def sesion(request: Request):
    id_ = seguridad.verificar_sesion(request.cookies.get(seguridad.COOKIE_SESION))
    u = db.obtener_usuario(id_) if id_ else None
    if not u:
        raise HTTPException(status_code=401, detail="Inicia sesión con Discord")
    return u


def es_admin(u) -> bool:
    return u["id"] in ADMIN_IDS


# El panel maneja los tokens de tus bots: para usarlo, la sesión tiene que ser reciente.
# Una cookie robada deja de servir para el panel en unas horas, no en 30 días.
ADMIN_SESION_SEG = int(os.getenv("ADMIN_SESSION_HOURS") or 24) * 3600


def solo_admin(request: Request, u=Depends(sesion)):
    if not es_admin(u):
        raise HTTPException(status_code=403, detail="Solo para el administrador")
    if seguridad.edad_sesion(request.cookies.get(seguridad.COOKIE_SESION)) > ADMIN_SESION_SEG:
        raise HTTPException(status_code=401, detail="Por seguridad, vuelve a iniciar sesión con Discord para usar el panel")
    return u


def solo_cliente(u=Depends(sesion)):
    if es_admin(u):
        raise HTTPException(status_code=403, detail="Como administrador, responde desde el panel")
    return u


def pagina_volver(volver: str | None) -> str:
    return volver if volver in PAGINAS_VOLVER else "/cuenta"


@app.get("/api/auth/discord/login")
def discord_login(volver: str | None = None):
    destino = pagina_volver(volver)
    if not (CLIENT_ID and CLIENT_SECRET):
        return RedirectResponse(f"{PUBLIC_URL}/login?volver={destino}&error=config", status_code=303)
    estado = secrets.token_urlsafe(24)
    url = "https://discord.com/oauth2/authorize?" + urlencode({
        "client_id": CLIENT_ID,
        "redirect_uri": REDIRECT_URI,
        "response_type": "code",
        "scope": "identify",
        "state": estado,
        "prompt": "none",
    })
    r = RedirectResponse(url, status_code=303)
    for nombre, valor in ((COOKIE_ESTADO, estado), (COOKIE_VOLVER, destino)):
        r.set_cookie(nombre, valor, max_age=600, httponly=True, samesite="lax",
                     secure=seguridad.cookie_segura(), path="/api/auth/discord")
    return r


@app.get("/api/auth/discord/callback")
async def discord_callback(request: Request, code: str | None = None, state: str | None = None):
    destino = pagina_volver(request.cookies.get(COOKIE_VOLVER))
    error = RedirectResponse(f"{PUBLIC_URL}/login?volver={destino}&error=login", status_code=303)
    error.delete_cookie(COOKIE_ESTADO, path="/api/auth/discord")
    esperado = request.cookies.get(COOKIE_ESTADO)
    if not code or not state or not esperado or not secrets.compare_digest(state, esperado):
        return error
    if seguridad.demasiadas(f"login:{request.client.host if request.client else '-'}", 20, 600):
        return error

    try:
        async with httpx.AsyncClient(timeout=10) as http:
            tok = await http.post(f"{DISCORD_API}/oauth2/token", data={
                "client_id": CLIENT_ID,
                "client_secret": CLIENT_SECRET,
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": REDIRECT_URI,
            })
            tok.raise_for_status()
            yo = await http.get(f"{DISCORD_API}/users/@me",
                                headers={"Authorization": f"Bearer {tok.json()['access_token']}"})
            yo.raise_for_status()
            datos = yo.json()
    except (httpx.HTTPError, KeyError, ValueError):
        return error

    id_ = str(datos.get("id") or "")
    if not _ID_RE.match(id_):
        return error
    db.guardar_usuario(id_, datos.get("username") or "", datos.get("global_name") or datos.get("username") or "Usuario",
                       datos.get("avatar"))
    r = RedirectResponse(f"{PUBLIC_URL}{destino}", status_code=303)
    r.delete_cookie(COOKIE_ESTADO, path="/api/auth/discord")
    r.delete_cookie(COOKIE_VOLVER, path="/api/auth/discord")
    seguridad.poner_sesion(r, id_)
    return r


# Google y GitHub: clientes que no usan Discord. Su ID se guarda con prefijo (google-<sub>,
# github-<id>) para no chocar con los de Discord; no reciben MD (notificar.md los salta).
PROVEEDORES = {
    "google": {
        "client_id": (os.getenv("GOOGLE_CLIENT_ID") or "").strip(),
        "client_secret": (os.getenv("GOOGLE_CLIENT_SECRET") or "").strip(),
        "authorize": "https://accounts.google.com/o/oauth2/v2/auth",
        "token": "https://oauth2.googleapis.com/token",
        "usuario": "https://openidconnect.googleapis.com/v1/userinfo",
        "scope": "openid profile",
        "extra": {"prompt": "select_account"},
    },
    "github": {
        "client_id": (os.getenv("GITHUB_CLIENT_ID") or "").strip(),
        "client_secret": (os.getenv("GITHUB_CLIENT_SECRET") or "").strip(),
        "authorize": "https://github.com/login/oauth/authorize",
        "token": "https://github.com/login/oauth/access_token",
        "usuario": "https://api.github.com/user",
        "scope": "",
        "extra": {"allow_signup": "true"},
    },
}


def _proveedor(nombre: str) -> dict:
    p = PROVEEDORES.get(nombre)
    if not p:
        raise HTTPException(status_code=404)
    return p


def _redirect_proveedor(nombre: str) -> str:
    return f"{API_URL}/api/auth/{nombre}/callback"


@app.get("/api/auth/{nombre}/login")
def proveedor_login(nombre: str, volver: str | None = None):
    p = _proveedor(nombre)
    destino = pagina_volver(volver)
    if not (p["client_id"] and p["client_secret"]):
        return RedirectResponse(f"{PUBLIC_URL}/login?volver={destino}&error=config-{nombre}", status_code=303)
    estado = secrets.token_urlsafe(24)
    url = p["authorize"] + "?" + urlencode({
        "client_id": p["client_id"],
        "redirect_uri": _redirect_proveedor(nombre),
        "response_type": "code",
        "scope": p["scope"],
        "state": estado,
        **p["extra"],
    })
    r = RedirectResponse(url, status_code=303)
    for cookie, valor in ((COOKIE_ESTADO, estado), (COOKIE_VOLVER, destino)):
        r.set_cookie(cookie, valor, max_age=600, httponly=True, samesite="lax",
                     secure=seguridad.cookie_segura(), path=f"/api/auth/{nombre}")
    return r


@app.get("/api/auth/{nombre}/callback")
async def proveedor_callback(nombre: str, request: Request, code: str | None = None, state: str | None = None):
    p = _proveedor(nombre)
    ruta = f"/api/auth/{nombre}"
    destino = pagina_volver(request.cookies.get(COOKIE_VOLVER))
    error = RedirectResponse(f"{PUBLIC_URL}/login?volver={destino}&error=login-{nombre}", status_code=303)
    error.delete_cookie(COOKIE_ESTADO, path=ruta)
    esperado = request.cookies.get(COOKIE_ESTADO)
    if not code or not state or not esperado or not secrets.compare_digest(state, esperado):
        return error
    if not (p["client_id"] and p["client_secret"]):
        return error
    if seguridad.demasiadas(f"login:{request.client.host if request.client else '-'}", 20, 600):
        return error

    try:
        async with httpx.AsyncClient(timeout=10, headers={"User-Agent": "antonioooj.dev"}) as http:
            tok = await http.post(p["token"], headers={"Accept": "application/json"}, data={
                "client_id": p["client_id"],
                "client_secret": p["client_secret"],
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": _redirect_proveedor(nombre),
            })
            tok.raise_for_status()
            yo = await http.get(p["usuario"], headers={"Authorization": f"Bearer {tok.json()['access_token']}",
                                                       "Accept": "application/json"})
            yo.raise_for_status()
            datos = yo.json()
    except (httpx.HTTPError, KeyError, ValueError):
        return error

    if nombre == "google":
        crudo, usuario = str(datos.get("sub") or ""), ""
        nombre_vis, avatar = datos.get("name") or "Usuario", datos.get("picture")
    else:
        crudo, usuario = str(datos.get("id") or ""), datos.get("login") or ""
        nombre_vis, avatar = datos.get("name") or usuario or "Usuario", datos.get("avatar_url")
    id_ = f"{nombre}-{crudo}"
    if not seguridad._ID_RE.match(id_):
        return error
    if not (isinstance(avatar, str) and avatar.startswith("https://")):
        avatar = None
    db.guardar_usuario(id_, (usuario or nombre_vis.lower().replace(" ", ""))[:40], str(nombre_vis)[:80], avatar)
    r = RedirectResponse(f"{PUBLIC_URL}{destino}", status_code=303)
    r.delete_cookie(COOKIE_ESTADO, path=ruta)
    r.delete_cookie(COOKIE_VOLVER, path=ruta)
    seguridad.poner_sesion(r, id_)
    return r


@app.get("/api/auth/dev")
def dev_login(request: Request, como: str = "cliente", volver: str | None = None):
    """Login de prueba en local (DEMO_LOGIN=1). Solo responde si se entra por localhost."""
    # El Host lo puede escribir cualquiera; por eso además la web tiene que estar configurada
    # en local (PUBLIC_URL) y la petición venir de este mismo equipo. Publicada, nunca entra.
    local = {"localhost", "127.0.0.1"}
    if (not DEMO_LOGIN or request.url.hostname not in local or urlsplit(PUBLIC_URL).hostname not in local
            or (request.client.host if request.client else "") not in {"127.0.0.1", "::1"}):
        raise HTTPException(status_code=404)
    if como == "admin":
        if not ADMIN_IDS:
            raise HTTPException(status_code=400, detail="Pon tu ID en ADMIN_DISCORD_IDS")
        id_, nombre = sorted(ADMIN_IDS)[0], ADMIN_NOMBRE
    else:
        id_, nombre = "100000000000000002", "Cliente de prueba"
    if not db.obtener_usuario(id_):
        db.guardar_usuario(id_, nombre.lower().replace(" ", ""), nombre, None)
    r = RedirectResponse(f"{PUBLIC_URL}{pagina_volver(volver)}", status_code=303)
    seguridad.poner_sesion(r, id_)
    return r


ip_de = seguridad.ip_cliente


@app.post("/api/auth/logout")
def logout(request: Request, response: Response, tareas: BackgroundTasks):
    id_ = seguridad.verificar_sesion(request.cookies.get(seguridad.COOKIE_SESION))
    u = db.obtener_usuario(id_) if id_ else None
    # Además de borrar la cookie, se invalidan las copias que pudiera haber en otros sitios
    seguridad.revocar_sesiones(id_)
    seguridad.quitar_sesion(response)
    # Si es el admin, le llega un aviso por MD de Discord
    if u and es_admin(u) and notificar.configurado():
        e = notificar.embed(
            "🔒 Sesión cerrada en el panel",
            "Has cerrado sesión en el panel de administración de antonioooj.dev.",
            notificar.GRIS,
            [
                ("Cuenta", f"{u['nombre']} (@{u['usuario']})", True),
                ("Fecha", time.strftime("%d/%m/%Y · %H:%M:%S"), True),
                ("IP", ip_de(request), True),
                ("Navegador", (request.headers.get("user-agent") or "—")[:200], False),
            ],
            pie="Si no has sido tú, cambia tu contraseña de Discord",
            miniatura=avatar_url(u["id"], u["avatar"]),
        )
        tareas.add_task(notificar.md, u["id"], e)
    return {"ok": True}


@app.get("/api/me")
def me(u=Depends(sesion)):
    return {
        **usuario_json(u),
        "admin": es_admin(u),
        "adminNombre": ADMIN_NOMBRE,
        "comandos": [{"nombre": k, "descripcion": v} for k, v in proyectos.COMANDOS.items()],
    }


# ---------------------------------------------------------------------------
# Mensajes
# ---------------------------------------------------------------------------
class NuevoMensaje(BaseModel):
    texto: str


def mensaje_json(m) -> dict:
    salida = {"id": m["id"], "de": m["emisor"], "texto": m["texto"], "creado": m["creado"]}
    if m["datos"]:
        try:
            salida["datos"] = json.loads(m["datos"])     # avisos del sistema: se pintan como tarjeta
        except ValueError:
            pass
    return salida


def limpiar(texto: str) -> str:
    texto = re.sub(r"\n{4,}", "\n\n\n", (texto or "").replace("\r\n", "\n").strip())
    if not texto:
        raise HTTPException(status_code=400, detail="El mensaje está vacío")
    if len(texto) > MAX_TEXTO:
        raise HTTPException(status_code=400, detail=f"Máximo {MAX_TEXTO} caracteres")
    return texto


# ---------------------------------------------------------------------------
# Tickets: cada ticket es una conversación propia y un cliente puede tener varios a la vez
# (tickets.py). Al abrirse queda un aviso con sus datos de Discord; al cerrarse se genera la
# transcripción (.html) y le llega por MD de Discord.
# ---------------------------------------------------------------------------
n_ticket = tickets.n_ticket
fecha_txt = tickets.fecha_txt


class NuevoTicket(BaseModel):
    asunto: str | None = None


def ticket_json(t, para_admin: bool = False) -> dict:
    """Fila de db.tickets_de / db.todos_los_tickets (o de la tabla tickets) a JSON."""
    claves = t.keys()
    salida = {
        "id": t["id"],
        "numero": n_ticket(t["id"]),
        "asunto": t["asunto"],
        "abierto": t["abierto"],
        "cerrado": t["cerrado"],
        "cerradoPor": t["cerrado_por"],
    }
    if "ultimo_id" in claves:
        salida["ultimo"] = ({"de": t["ultimo_emisor"], "texto": (t["ultimo_texto"] or "")[:140],
                             "creado": t["ultimo_creado"], "id": t["ultimo_id"]} if t["ultimo_id"] else None)
        salida["sinLeer"] = t["sin_leer_admin"] if para_admin else t["sin_leer_cliente"]
        salida["mensajes"] = t["n_mensajes"]
    if para_admin and "nombre" in claves:
        salida["usuario"] = {"id": t["conv"], "usuario": t["usuario"], "nombre": t["nombre"],
                             "avatar": avatar_url(t["conv"], t["avatar"])}
        salida["proyectos"] = t["n_proyectos"]
    return salida


def ticket_de_cliente(tid: int, u):
    t = db.ticket(tid)
    if not t or t["conv"] != u["id"]:
        raise HTTPException(404, "Ticket no encontrado")
    return t


def ticket_admin(tid: int):
    t = db.ticket(tid)
    if not t or t["conv"] in ADMIN_IDS:
        raise HTTPException(404, "Ticket no encontrado")
    return t


def escribir(t, c, emisor: str, texto: str) -> list:
    """Guarda el mensaje en el ticket (y la respuesta a /estado-proyecto si era el comando)."""
    if t["cerrado"]:
        raise HTTPException(409, "Este ticket está cerrado. Abre uno nuevo para seguir hablando.")
    if proyectos.es_comando(texto) == "/estado-proyecto":
        texto_estado, datos_estado = proyectos.estado_cliente(c["id"])
        nuevos = []
        if emisor == "cliente":
            # El comando no cuenta como mensaje sin leer para el admin
            nuevos.append(db.nuevo_mensaje(c["id"], "cliente", texto, leido=True, ticket=t["id"]))
        nuevos.append(db.nuevo_mensaje(c["id"], "sistema", texto_estado, leido=emisor == "cliente",
                                       datos=datos_estado, ticket=t["id"]))
        return nuevos
    return [db.nuevo_mensaje(c["id"], emisor, texto, ticket=t["id"])]


def cerrar_ticket(t, c, por_admin: bool) -> dict:
    """Cierra el ticket. Ya no se genera transcripción ni se manda nada por Discord (a petición
    de Antonio, 2026-10-26): la conversación se queda guardada en el propio ticket del chat."""
    if t["cerrado"]:
        raise HTTPException(400, "Este ticket ya está cerrado")
    cerrado_por = ADMIN_NOMBRE if por_admin else c["nombre"]
    mensajes = db.mensajes_de_ticket(t["id"], 0, 5000)
    db.cerrar_ticket(t["id"], "admin" if por_admin else "cliente")
    ahora_ = int(time.time())

    cierre = {"tipo": "cierre", "ticket": n_ticket(t["id"]), "por": "admin" if por_admin else "cliente",
              "porNombre": cerrado_por, "abierto": t["abierto"], "cerrado": ahora_,
              "mensajes": sum(1 for x in mensajes if x["emisor"] != "sistema"),
              "transcripcion": "guardada"}
    m = db.nuevo_mensaje(c["id"], "sistema",
                         f"🔒 Ticket {n_ticket(t['id'])} cerrado por {cerrado_por} · {fecha_txt(ahora_)}",
                         leido=True, datos=cierre, ticket=t["id"])
    return {"mensajes": [mensaje_json(m)], "ticket": ticket_json(db.ticket(t["id"]))}


@app.get("/api/transcripcion/{clave}")
def ver_transcripcion(clave: str):
    """Página de la transcripción. La clave larga y aleatoria hace de contraseña del enlace."""
    p = transcripcion.ruta(clave)
    if not p:
        raise HTTPException(404, "Transcripción no encontrada")
    return HTMLResponse(p.read_text("utf-8"), headers={
        "Content-Security-Policy": "default-src 'none'; img-src * data:; style-src 'unsafe-inline'; "
                                   "base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
        "X-Robots-Tag": "noindex, nofollow",
    })


# --- cliente: sus tickets ---

@app.get("/api/chat/tickets")
def chat_tickets(u=Depends(solo_cliente)):
    return [ticket_json(t) for t in db.tickets_de(u["id"])]


@app.post("/api/chat/tickets", status_code=201)
def chat_nuevo_ticket(datos: NuevoTicket, u=Depends(solo_cliente)):
    if seguridad.demasiadas(f"ticket:{u['id']}", 5, 600):
        raise HTTPException(429, "Has abierto muchos tickets seguidos. Espera un poco.")
    abiertos = sum(1 for t in db.tickets_de(u["id"]) if not t["cerrado"])
    if abiertos >= 10:
        raise HTTPException(409, "Tienes 10 tickets abiertos. Cierra alguno antes de abrir otro.")
    tid, m = tickets.abrir(u, datos.asunto)
    return {"ticket": ticket_json(db.ticket(tid)), "mensajes": [mensaje_json(m)]}


@app.get("/api/chat/tickets/{tid}/mensajes")
def chat_mensajes(tid: int, despues: int = 0, u=Depends(solo_cliente)):
    t = ticket_de_cliente(tid, u)
    db.marcar_leidos_ticket(tid, "admin", "sistema")
    return {
        "mensajes": [mensaje_json(m) for m in db.mensajes_de_ticket(tid, max(despues, 0))],
        "visto": db.visto_ticket(tid, "cliente"),
        "ticket": ticket_json(t),
    }


@app.post("/api/chat/tickets/{tid}/mensajes", status_code=201)
def chat_enviar(tid: int, datos: NuevoMensaje, u=Depends(solo_cliente)):
    if seguridad.demasiadas(f"msg:{u['id']}", 20, 60):
        raise HTTPException(status_code=429, detail="Vas muy rápido. Espera un momento.")
    t = ticket_de_cliente(tid, u)
    nuevos = escribir(t, u, "cliente", limpiar(datos.texto))
    return {"mensajes": [mensaje_json(m) for m in nuevos], "ticket": ticket_json(t)}


@app.post("/api/chat/tickets/{tid}/cerrar")
def chat_cerrar(tid: int, u=Depends(solo_cliente)):
    return cerrar_ticket(ticket_de_cliente(tid, u), u, por_admin=False)


@app.get("/api/cuenta/proyectos")
def cuenta_proyectos(u=Depends(sesion)):
    """Proyectos vinculados a la cuenta, con sus últimas novedades (página /cuenta)."""
    return [
        {
            **proyectos.proyecto_publico(p),
            "eventos": [{"texto": e["texto"], "creado": e["creado"]} for e in db.eventos(p["id"], 5)],
        }
        for p in db.proyectos(u["id"])
    ]


# --- admin: todos los tickets ---

def cliente_o_404(uid: str):
    c = db.obtener_usuario(uid) if seguridad._ID_RE.match(uid) else None
    if not c or c["id"] in ADMIN_IDS:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    return c


@app.get("/api/admin/tickets")
def admin_tickets(_=Depends(solo_admin)):
    return [ticket_json(t, para_admin=True) for t in db.todos_los_tickets() if t["conv"] not in ADMIN_IDS]


@app.post("/api/admin/clientes/{uid}/tickets", status_code=201)
def admin_nuevo_ticket(uid: str, datos: NuevoTicket, _=Depends(solo_admin)):
    """Abrir un ticket a un cliente desde el panel (p. ej. desde un proyecto)."""
    tid, m = tickets.abrir(cliente_o_404(uid), datos.asunto)
    return {"ticket": ticket_json(db.ticket(tid)), "mensajes": [mensaje_json(m)]}


@app.get("/api/admin/tickets/{tid}/mensajes")
def admin_mensajes(tid: int, despues: int = 0, _=Depends(solo_admin)):
    t = ticket_admin(tid)
    db.marcar_leidos_ticket(tid, "cliente")
    c = db.obtener_usuario(t["conv"])
    return {
        "usuario": usuario_json(c),
        "mensajes": [mensaje_json(m) for m in db.mensajes_de_ticket(tid, max(despues, 0))],
        "visto": db.visto_ticket(tid, "admin"),
        "ticket": ticket_json(t),
    }


@app.post("/api/admin/tickets/{tid}/mensajes", status_code=201)
def admin_enviar(tid: int, datos: NuevoMensaje, u=Depends(solo_admin)):
    if seguridad.demasiadas(f"msg:{u['id']}", 60, 60):
        raise HTTPException(status_code=429, detail="Vas muy rápido. Espera un momento.")
    t = ticket_admin(tid)
    nuevos = escribir(t, db.obtener_usuario(t["conv"]), "admin", limpiar(datos.texto))
    return {"mensajes": [mensaje_json(m) for m in nuevos], "ticket": ticket_json(t)}


@app.post("/api/admin/tickets/{tid}/cerrar")
def admin_cerrar(tid: int, _=Depends(solo_admin)):
    t = ticket_admin(tid)
    return cerrar_ticket(t, db.obtener_usuario(t["conv"]), por_admin=True)


@app.get("/api/admin/notificaciones")
def admin_notificaciones(_=Depends(solo_admin)):
    """Para el panel: si el bot de MD está configurado y el último error al enviar."""
    return {"configurado": notificar.configurado(), "ultimoError": notificar.ultimo_error()}


# ---------------------------------------------------------------------------
# Panel de administración (/admin): bots de Discord y proyectos
# ---------------------------------------------------------------------------
app.include_router(panel.crear_router(solo_admin))
app.include_router(proyectos.crear_router(solo_admin, usuario_json, ADMIN_IDS))
# «Ahora mismo» de «Sobre mí»: tu modo y tu estado de Discord
app.include_router(estado.crear_router(solo_admin))
# Canción de Spotify que estás escuchando (también en «Sobre mí»)
app.include_router(spotify.crear_router(solo_admin, API_URL, PUBLIC_URL))
# Opiniones que dejan los visitantes desde la portada
app.include_router(opiniones.crear_router(solo_admin, usuario_json))


@app.get("/api/health")
def health():
    return {"ok": True}
