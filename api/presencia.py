"""
presencia.py · Tu estado de Discord en vivo (para «Sobre mí» en la web).

Un bot de la app de Discord del portfolio se conecta al gateway y sigue la presencia de
tu cuenta (el primer ID de ADMIN_DISCORD_IDS): en línea / ausente / no molestar /
desconectado, desde qué dispositivo y qué estás haciendo (estado personalizado, juego,
Spotify...). Se guarda solo en memoria; /api/estado lo sirve a la web.

Requisitos (Developer Portal → tu app → Bot):
  - DISCORD_BOT_TOKEN en api/.env
  - «Presence Intent» y «Server Members Intent» activados
  - el bot invitado a algún servidor en el que estés tú
Sin token, la web muestra solo el modo que elijas a mano.
"""
import asyncio
import logging
import os
import time

import discord

log = logging.getLogger("presencia")

# El bot de la web: DISCORD_BOT_TOKEN o, si está vacío, el mismo de los MD (DISCORD_NOTIFY_BOT_TOKEN)
TOKEN = (os.getenv("DISCORD_BOT_TOKEN") or os.getenv("DISCORD_NOTIFY_BOT_TOKEN") or "").strip()
if TOKEN.lower().startswith("bot "):
    TOKEN = TOKEN[4:].strip()
# Lo que muestra el bot en Discord: «Jugando a antonioooj.dev»
ACTIVIDAD = (os.getenv("DISCORD_BOT_ACTIVIDAD") or "antonioooj.dev").strip()
_admins = [x.strip() for x in (os.getenv("ADMIN_DISCORD_IDS") or "").split(",") if x.strip()]
OBJETIVO = int(_admins[0]) if _admins and _admins[0].isdigit() else None

_estado: dict = {"conectado": False, "error": None, "presencia": None}
_cliente: "Cliente | None" = None
_tarea: asyncio.Task | None = None


def _emoji(e) -> dict | None:
    if not e:
        return None
    if getattr(e, "id", None):                      # emoji personalizado de un servidor
        return {"texto": None, "url": str(e.url)}
    return {"texto": str(e), "url": None}


def _actividad(a) -> dict | None:
    """Pasa una actividad de discord.py a algo sencillo para la web."""
    inicio = getattr(a, "start", None)
    fin = getattr(a, "end", None)
    desde = int(inicio.timestamp()) if inicio else None
    hasta = int(fin.timestamp()) if fin else None   # Spotify: para la barra de progreso de la canción
    if isinstance(a, discord.CustomActivity):
        if not (a.name or a.emoji):
            return None
        return {"tipo": "personalizado", "nombre": a.name or "", "emoji": _emoji(a.emoji), "desde": desde}
    if isinstance(a, discord.Spotify):
        return {"tipo": "escuchando", "nombre": a.title, "detalle": a.artist, "plataforma": "Spotify",
                "imagen": a.album_cover_url, "desde": desde, "hasta": hasta}
    tipo = {
        discord.ActivityType.playing: "jugando",
        discord.ActivityType.streaming: "en directo",
        discord.ActivityType.listening: "escuchando",
        discord.ActivityType.watching: "viendo",
        discord.ActivityType.competing: "compitiendo",
    }.get(getattr(a, "type", None), "jugando")
    imagen = None
    try:
        imagen = getattr(a, "large_image_url", None)
    except Exception:  # noqa: BLE001 (algunas actividades no tienen assets)
        pass
    return {"tipo": tipo, "nombre": getattr(a, "name", "") or "", "detalle": getattr(a, "details", None),
            "estado": getattr(a, "state", None), "imagen": imagen, "desde": desde, "hasta": hasta}


def _guardar(m: discord.Member) -> None:
    plataformas = [nombre for nombre, s in (("ordenador", m.desktop_status), ("móvil", m.mobile_status),
                                            ("web", m.web_status)) if s != discord.Status.offline]
    actividades = [x for x in (_actividad(a) for a in m.activities) if x]
    _estado["presencia"] = {
        "estado": str(m.status),                    # online | idle | dnd | offline
        "plataformas": plataformas,
        "actividades": actividades,
        "nombre": m.global_name or m.name,
        "usuario": m.name,
        "avatar": m.display_avatar.replace(size=128).url,
        "actualizado": int(time.time()),
    }


class Cliente(discord.Client):
    async def on_ready(self):
        _estado["conectado"] = True
        if self.intents.members:
            _estado["error"] = None
        log.info("presencia: bot conectado como %s (jugando a %s)", self.user, ACTIVIDAD)
        if not OBJETIVO or not self.intents.members:
            return
        miembro = next((g.get_member(OBJETIVO) for g in self.guilds if g.get_member(OBJETIVO)), None)
        if miembro:
            _guardar(miembro)
            log.info("presencia: siguiendo a %s", miembro)
        else:
            _estado["error"] = "El bot no comparte ningún servidor contigo: invítalo a uno en el que estés."
            log.warning("presencia: %s", _estado["error"])

    async def on_presence_update(self, antes: discord.Member, despues: discord.Member):
        if despues.id == OBJETIVO:
            _guardar(despues)

    async def on_member_update(self, antes: discord.Member, despues: discord.Member):
        if despues.id == OBJETIVO:
            _guardar(despues)

    async def on_member_join(self, m: discord.Member):
        if m.id == OBJETIVO:
            _guardar(m)

    async def on_disconnect(self):
        _estado["conectado"] = False


def _nuevo_cliente(privilegiados: bool) -> "Cliente":
    intents = discord.Intents.none()
    intents.guilds = True
    if privilegiados:                               # para seguir tu presencia (hacen falta en el Portal)
        intents.members = True
        intents.presences = True
    # La actividad va en el constructor: discord.py la vuelve a poner sola en cada reconexión
    return Cliente(intents=intents, chunk_guilds_at_startup=privilegiados,
                   activity=discord.Game(name=ACTIVIDAD), status=discord.Status.online)


async def _conectar() -> None:
    """Mantiene el bot conectado para siempre. discord.py ya reconecta solo si se corta la red;
    si aun así se cae del todo, se vuelve a intentar con espera creciente (5 s → 5 min)."""
    global _cliente
    privilegiados = True
    espera = 5
    while True:
        _cliente = _nuevo_cliente(privilegiados)
        inicio = time.monotonic()
        try:
            await _cliente.start(TOKEN)
            _estado["error"] = "Discord cerró la conexión; reconectando."
        except discord.LoginFailure:
            _estado["error"] = "El token del bot no es válido (DISCORD_BOT_TOKEN / DISCORD_NOTIFY_BOT_TOKEN)."
            log.error("presencia: %s", _estado["error"])
            return                                  # reintentar no sirve: hay que cambiar el token
        except discord.PrivilegedIntentsRequired:
            # Sin esos permisos el bot sigue en línea y «jugando», pero sin poder leer tu estado
            _estado["error"] = ("Activa «Presence Intent» y «Server Members Intent» en el Developer Portal "
                                "(tu app → Bot) y reinicia la API para que la web vea tu estado.")
            log.warning("presencia: %s", _estado["error"])
            privilegiados = False
            espera = 0
        except asyncio.CancelledError:
            raise
        except Exception as e:  # noqa: BLE001 (que un fallo de Discord no tumbe la API)
            _estado["error"] = f"No se pudo conectar con Discord: {e.__class__.__name__}"
            log.warning("presencia: %s", _estado["error"])
        finally:
            _estado["conectado"] = False
            if not _cliente.is_closed():
                await _cliente.close()
        if time.monotonic() - inicio > 300:          # llevaba un rato conectado: empezar de cero
            espera = 5
        await asyncio.sleep(espera)
        espera = min(max(espera * 2, 5), 300)


def arrancar() -> None:
    """Se llama al arrancar la API. Sin token no hace nada; sin tu ID el bot sale en línea igual."""
    global _tarea
    if not TOKEN:
        _estado["error"] = "Falta DISCORD_BOT_TOKEN (o DISCORD_NOTIFY_BOT_TOKEN) en api/.env"
        return
    if not OBJETIVO:
        _estado["error"] = "Falta tu ID en ADMIN_DISCORD_IDS"
    _tarea = asyncio.get_running_loop().create_task(_conectar())


async def parar() -> None:
    if _cliente and not _cliente.is_closed():
        await _cliente.close()
    if _tarea:
        _tarea.cancel()


def estado() -> dict:
    """Presencia actual (o None) y si el bot está configurado y conectado."""
    return {
        "configurado": bool(TOKEN and OBJETIVO),
        "conectado": _estado["conectado"],
        "error": _estado["error"],
        "presencia": _estado["presencia"],
    }
