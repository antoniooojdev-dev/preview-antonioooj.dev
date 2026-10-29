"""
spotify.py · La canción que estás escuchando en Spotify, para «Ahora mismo» de «Sobre mí».

Se conecta una vez tu cuenta de Spotify desde la web (botón del editor, solo admin) y se
guarda el refresh token cifrado (misma clave que los tokens del panel). Después, la API
pregunta a Spotify qué suena (con caché corta para no saturarla aunque haya muchas visitas).

  GET    /api/spotify/ahora        público: lo que suena ahora (o lo último que escuchaste)
  GET    /api/spotify/conectar     solo admin: lleva a Spotify para dar permiso
  GET    /api/spotify/callback     vuelta de Spotify (valida el state guardado en memoria)
  GET    /api/spotify/diagnostico  solo admin: si está configurado y conectado
  DELETE /api/spotify              solo admin: desconecta tu cuenta

Configuración (.env): SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET y, si hace falta,
SPOTIFY_REDIRECT_URI (Spotify no admite «localhost»: en local usa 127.0.0.1).
"""
import base64
import os
import secrets
import time
from datetime import datetime
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse

import db
import panel

AUTORIZAR = "https://accounts.spotify.com/authorize"
TOKEN = "https://accounts.spotify.com/api/token"
API = "https://api.spotify.com/v1"
PERMISOS = "user-read-currently-playing user-read-recently-played"
CACHE_SEG = 8
STATE_SEG = 600

_estados: dict[str, float] = {}  # state de OAuth -> caduca
_acceso = {"token": "", "caduca": 0.0}
_cache = {"datos": None, "hora": 0.0}
_ultimo_error = {"texto": ""}


def _cfg() -> tuple[str, str]:
    return (os.getenv("SPOTIFY_CLIENT_ID") or "").strip(), (os.getenv("SPOTIFY_CLIENT_SECRET") or "").strip()


def _redirect_uri(api_url: str) -> str:
    uri = (os.getenv("SPOTIFY_REDIRECT_URI") or "").strip()
    if uri:
        return uri
    return f"{api_url}/api/spotify/callback".replace("//localhost", "//127.0.0.1")


def _guardado() -> dict:
    return db.ajuste("spotify") or {}


def _cabecera_app() -> dict:
    cid, secreto = _cfg()
    return {"Authorization": "Basic " + base64.b64encode(f"{cid}:{secreto}".encode()).decode()}


async def _token_acceso() -> str | None:
    if _acceso["token"] and time.time() < _acceso["caduca"] - 30:
        return _acceso["token"]
    g = _guardado()
    if not g.get("refresh") or not all(_cfg()):
        return None
    refresh = panel.descifrar(g["refresh"])
    async with httpx.AsyncClient(timeout=10) as c:
        r = await c.post(TOKEN, headers=_cabecera_app(), data={"grant_type": "refresh_token", "refresh_token": refresh})
    if r.status_code != 200:
        _ultimo_error["texto"] = f"Spotify rechazó el token ({r.status_code}); vuelve a conectar la cuenta"
        return None
    d = r.json()
    _acceso.update(token=d["access_token"], caduca=time.time() + d.get("expires_in", 3600))
    if d.get("refresh_token"):  # Spotify a veces lo renueva
        db.guardar_ajuste("spotify", {**g, "refresh": panel.cifrar(d["refresh_token"])})
    _ultimo_error["texto"] = ""
    return _acceso["token"]


def _cancion(t: dict) -> dict:
    album = t.get("album") or {}
    portadas = album.get("images") or []
    return {
        "nombre": t.get("name") or "",
        "artistas": [a.get("name") for a in t.get("artists") or [] if a.get("name")],
        "album": album.get("name") or "",
        "portada": portadas[0]["url"] if portadas else None,
        "url": (t.get("external_urls") or {}).get("spotify"),
        "duracion": (t.get("duration_ms") or 0) / 1000,
    }


async def _consultar() -> dict:
    token = await _token_acceso()
    if not token:
        return {"conectado": False}
    cab = {"Authorization": f"Bearer {token}"}
    async with httpx.AsyncClient(timeout=10) as c:
        r = await c.get(f"{API}/me/player/currently-playing", headers=cab)
        if r.status_code == 200 and r.content:
            d = r.json()
            if d.get("currently_playing_type") == "track" and d.get("item"):
                return {
                    "conectado": True,
                    "sonando": bool(d.get("is_playing")),
                    "cancion": _cancion(d["item"]),
                    "progreso": (d.get("progress_ms") or 0) / 1000,
                    "hora": time.time(),
                }
        # Nada sonando (204) o un podcast: lo último que escuchaste
        r = await c.get(f"{API}/me/player/recently-played", headers=cab, params={"limit": 1})
    if r.status_code == 200:
        items = r.json().get("items") or []
        if items:
            cuando = datetime.fromisoformat(items[0]["played_at"].replace("Z", "+00:00")).timestamp()
            return {"conectado": True, "sonando": False, "cancion": _cancion(items[0]["track"]), "escuchada": cuando}
    elif r.status_code == 401:
        _acceso["token"] = ""
    return {"conectado": True, "sonando": False, "cancion": None}


def crear_router(solo_admin, api_url: str, public_url: str) -> APIRouter:
    r = APIRouter(prefix="/api/spotify")

    @r.get("/ahora")
    async def ahora():
        if not all(_cfg()):
            return {"conectado": False}
        if _cache["datos"] is None or time.time() - _cache["hora"] > CACHE_SEG:
            try:
                _cache["datos"] = await _consultar()
            except (httpx.HTTPError, HTTPException, KeyError, ValueError, TypeError):
                # Spotify caído o con una respuesta rara: se sigue mostrando lo último que había
                _ultimo_error["texto"] = "No se pudo contactar con Spotify"
                if _cache["datos"] is None:
                    return {"conectado": False}
            _cache["hora"] = time.time()
        return _cache["datos"]

    @r.get("/conectar", dependencies=[Depends(solo_admin)])
    def conectar():
        cid, _ = _cfg()
        if not cid:
            raise HTTPException(400, "Falta SPOTIFY_CLIENT_ID en api/.env")
        ahora_ = time.time()
        for s, caduca in list(_estados.items()):
            if caduca < ahora_:
                del _estados[s]
        state = secrets.token_urlsafe(24)
        _estados[state] = ahora_ + STATE_SEG
        q = {"client_id": cid, "response_type": "code", "redirect_uri": _redirect_uri(api_url), "scope": PERMISOS, "state": state}
        return RedirectResponse(f"{AUTORIZAR}?{urlencode(q)}")

    @r.get("/callback")
    async def callback(state: str = "", code: str = "", error: str = ""):
        # El state solo existe si lo generó /conectar (solo admin) hace menos de 10 min
        if not state or _estados.pop(state, 0) < time.time():
            raise HTTPException(400, "Enlace caducado o no válido; vuelve a conectar desde la web")
        volver = f"{public_url}/#sobre-mi"
        if error or not code:
            return RedirectResponse(f"{volver}")
        async with httpx.AsyncClient(timeout=10) as c:
            t = await c.post(
                TOKEN,
                headers=_cabecera_app(),
                data={"grant_type": "authorization_code", "code": code, "redirect_uri": _redirect_uri(api_url)},
            )
            if t.status_code != 200:
                raise HTTPException(502, "Spotify no aceptó el código; inténtalo de nuevo")
            d = t.json()
            yo = await c.get(f"{API}/me", headers={"Authorization": f"Bearer {d['access_token']}"})
        nombre = yo.json().get("display_name") if yo.status_code == 200 else None
        db.guardar_ajuste("spotify", {"refresh": panel.cifrar(d["refresh_token"]), "usuario": nombre})
        _acceso.update(token=d["access_token"], caduca=time.time() + d.get("expires_in", 3600))
        _cache["datos"] = None
        return RedirectResponse(volver)

    @r.get("/diagnostico", dependencies=[Depends(solo_admin)])
    def diagnostico():
        g = _guardado()
        return {
            "configurado": all(_cfg()),
            "conectado": bool(g.get("refresh")),
            "usuario": g.get("usuario"),
            "redirect": _redirect_uri(api_url),
            "error": _ultimo_error["texto"] or None,
        }

    @r.delete("", dependencies=[Depends(solo_admin)])
    def desconectar():
        db.guardar_ajuste("spotify", {})
        _acceso.update(token="", caduca=0.0)
        _cache["datos"] = None
        return {"ok": True}

    return r
