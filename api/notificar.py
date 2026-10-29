"""
notificar.py · Mensajes privados (MD) de Discord desde la API, con un bot.

Se usa para:
  - mandar la transcripción de un ticket al cliente cuando se cierra (y una copia al admin)
  - avisar al admin cuando cierra sesión en el panel

Usa la API REST de Discord (no hace falta tener el bot «conectado»): basta con su token.
Token: DISCORD_NOTIFY_BOT_TOKEN (un bot aparte, si quieres) o, si está vacío, el mismo
DISCORD_BOT_TOKEN del estado de «Sobre mí».

Para que un MD llegue, Discord exige que el bot y la persona compartan al menos un
servidor y que esa persona no tenga bloqueados los MD de miembros del servidor.
Si no se puede enviar, no se rompe nada: se devuelve el motivo y se registra.
"""
import json
import logging
import os
import time

import httpx
from dotenv import dotenv_values

API = "https://discord.com/api/v10"
log = logging.getLogger("notificar")

# Colores de los embeds
AZUL = 0x5865F2
VERDE = 0x23A55A
ROJO = 0xF23F43
GRIS = 0x80848E

_ultimo_error = {"texto": "", "hora": 0}


_ENV = os.path.join(os.path.dirname(__file__), ".env")


def _token() -> str:
    # Se lee el .env cada vez: así basta con pegar el token, sin reiniciar la API
    valores = dotenv_values(_ENV) if os.path.isfile(_ENV) else {}
    for clave in ("DISCORD_NOTIFY_BOT_TOKEN", "DISCORD_BOT_TOKEN"):
        t = (valores.get(clave) or os.getenv(clave) or "").strip().strip('"').strip("'")
        if t:
            return t[4:].strip() if t.lower().startswith("bot ") else t
    return ""


def configurado() -> bool:
    return bool(_token())


def ultimo_error() -> dict:
    return dict(_ultimo_error)


def _fallo(texto: str) -> str:
    _ultimo_error.update(texto=texto, hora=int(time.time()))
    log.warning("Discord MD: %s", texto)
    return texto


def boton_enlace(texto: str, url: str, emoji: str | None = None) -> dict:
    """Fila con un botón-enlace de Discord (los bots pueden mandarlos sin interacciones)."""
    b: dict = {"type": 2, "style": 5, "label": texto[:80], "url": url}
    if emoji:
        b["emoji"] = {"name": emoji}
    return {"type": 1, "components": [b]}


async def md(usuario_id: str, embed: dict, archivos: list[tuple[str, bytes, str]] | None = None,
             componentes: list[dict] | None = None) -> str | None:
    """Envía un MD con un embed, archivos opcionales (nombre, bytes, tipo MIME; se pueden
    citar en el embed como attachment://nombre) y botones. Devuelve None si ha ido bien o
    el motivo del fallo. Si Discord rechaza los botones (p. ej. un enlace a localhost), se
    reintenta sin ellos."""
    if not str(usuario_id).isdigit():
        return "La cuenta no es de Discord (entró con Google o GitHub)"
    token = _token()
    if not token:
        return _fallo("No hay token de bot (DISCORD_NOTIFY_BOT_TOKEN / DISCORD_BOT_TOKEN)")
    cab = {"Authorization": f"Bot {token}"}
    archivos = archivos or []

    async def enviar(http: httpx.AsyncClient, canal_id: str, con_botones: bool):
        carga: dict = {"embeds": [embed]}
        if componentes and con_botones:
            carga["components"] = componentes
        if not archivos:
            return await http.post(f"{API}/channels/{canal_id}/messages", headers=cab, json=carga)
        carga["attachments"] = [{"id": i, "filename": n} for i, (n, _, _) in enumerate(archivos)]
        return await http.post(
            f"{API}/channels/{canal_id}/messages",
            headers=cab,
            data={"payload_json": json.dumps(carga, ensure_ascii=False)},
            files={f"files[{i}]": (n, b, t) for i, (n, b, t) in enumerate(archivos)},
        )

    try:
        async with httpx.AsyncClient(timeout=20) as http:
            canal = await http.post(f"{API}/users/@me/channels", headers=cab, json={"recipient_id": usuario_id})
            if canal.status_code >= 400:
                return _fallo(f"No se pudo abrir el MD ({canal.status_code}): {canal.text[:160]}")
            canal_id = canal.json()["id"]
            r = await enviar(http, canal_id, True)
            if r.status_code == 400 and componentes:
                r = await enviar(http, canal_id, False)
            if r.status_code >= 400:
                # 50007 = el usuario no acepta MD de este bot (no comparten servidor o los tiene cerrados)
                codigo = (r.json() or {}).get("code") if r.headers.get("content-type", "").startswith("application/json") else None
                motivo = "el usuario no acepta MD del bot (¿comparten servidor?)" if codigo == 50007 else r.text[:160]
                return _fallo(f"No se pudo enviar ({r.status_code}): {motivo}")
    except (httpx.HTTPError, KeyError, ValueError) as e:
        return _fallo(f"Error de conexión con Discord: {e}")
    return None


def embed(titulo: str, descripcion: str = "", color: int = AZUL, campos: list[tuple[str, str, bool]] | None = None,
          pie: str = "antonioooj.dev", miniatura: str | None = None, url: str | None = None,
          autor: str | None = None, icono: str | None = None) -> dict:
    """miniatura/icono: URL https o «attachment://archivo» (un archivo enviado con el mensaje)."""
    e: dict = {
        "title": titulo[:256],
        "color": color,
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "footer": {"text": pie[:2048], **({"icon_url": icono} if icono else {})},
    }
    if url and url.startswith(("http://", "https://")):
        e["url"] = url
    if autor:
        e["author"] = {"name": autor[:256], **({"icon_url": icono} if icono else {})}
    if descripcion:
        e["description"] = descripcion[:4000]
    if campos:
        e["fields"] = [{"name": n[:256], "value": (v or "—")[:1024], "inline": i} for n, v, i in campos[:25]]
    if miniatura and miniatura.startswith(("https://", "attachment://")):
        e["thumbnail"] = {"url": miniatura}
    return e
