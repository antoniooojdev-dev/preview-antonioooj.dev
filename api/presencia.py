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

TOKEN = (os.getenv("DISCORD_BOT_TOKEN") or "").strip()
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
        _estado["error"] = None
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


async def _conectar() -> None:
    global _cliente
    intents = discord.Intents.none()
    intents.guilds = True
    intents.members = True
    intents.presences = True
    _cliente = Cliente(intents=intents, chunk_guilds_at_startup=True)
    try:
        await _cliente.start(TOKEN)
    except discord.LoginFailure:
        _estado["error"] = "El token del bot (DISCORD_BOT_TOKEN) no es válido."
    except discord.PrivilegedIntentsRequired:
        _estado["error"] = ("Activa «Presence Intent» y «Server Members Intent» en el Developer Portal "
                            "(tu app → Bot) y reinicia la API.")
    except asyncio.CancelledError:
        raise
    except Exception as e:  # noqa: BLE001 (que un fallo de Discord no tumbe la API)
        _estado["error"] = f"No se pudo conectar con Discord: {e.__class__.__name__}"
    finally:
        _estado["conectado"] = False
    if _estado["error"]:
        log.warning("presencia: %s", _estado["error"])


def arrancar() -> None:
    """Se llama al arrancar la API. Sin token o sin ID de admin no hace nada."""
    global _tarea
    if not TOKEN:
        _estado["error"] = "Falta DISCORD_BOT_TOKEN en api/.env"
        return
    if not OBJETIVO:
        _estado["error"] = "Falta tu ID en ADMIN_DISCORD_IDS"
        return
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
