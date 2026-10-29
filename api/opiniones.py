"""
opiniones.py · Opiniones de los visitantes.

Desde la portada (debajo de las preguntas) cualquiera puede dejar su opinión sobre el
servicio, la web u otra cosa, con una puntuación de 1 a 5. No hace falta iniciar sesión;
si la hay, se guarda quién era. Se leen y gestionan en /admin, pestaña «Opiniones».
"""
import re

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

import db
import seguridad

TEMAS = {
    "servicio": "El servicio",
    "web": "La web",
    "otro": "Otra cosa",
}
MAX_TEXTO = 1500
_CONTROL_RE = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")


class NuevaOpinion(BaseModel):
    tema: str
    puntuacion: int
    texto: str
    nombre: str | None = None
    contacto: str | None = None
    # campo trampa: invisible para las personas; si llega relleno, es un bot
    web: str | None = None


class MarcarOpinion(BaseModel):
    leida: bool = True


def _limpio(texto: str | None, maximo: int) -> str | None:
    texto = _CONTROL_RE.sub("", (texto or "").replace("\r\n", "\n")).strip()
    return texto[:maximo] or None


def crear_router(solo_admin, usuario_json) -> APIRouter:
    r = APIRouter()

    @r.post("/api/opiniones", status_code=201)
    def enviar(d: NuevaOpinion, request: Request):
        ip = seguridad.ip_cliente(request)
        if seguridad.demasiadas(f"opinion:{ip}", 5, 3600):
            raise HTTPException(429, "Ya has enviado varias opiniones. Prueba más tarde.")
        if d.web:
            return {"ok": True}       # bot: se le dice que sí y no se guarda nada
        if d.tema not in TEMAS:
            raise HTTPException(400, "Elige sobre qué es tu opinión")
        if not 1 <= d.puntuacion <= 5:
            raise HTTPException(400, "Elige una puntuación de 1 a 5")
        texto = _limpio(d.texto, MAX_TEXTO)
        if not texto or len(texto) < 3:
            raise HTTPException(400, "Escribe un poco más sobre tu opinión")
        if len(d.texto or "") > MAX_TEXTO:
            raise HTTPException(400, f"Máximo {MAX_TEXTO} caracteres")
        usuario_id = seguridad.verificar_sesion(request.cookies.get(seguridad.COOKIE_SESION))
        db.nueva_opinion(d.tema, d.puntuacion, texto, _limpio(d.nombre, 60), _limpio(d.contacto, 120),
                         usuario_id if usuario_id and db.obtener_usuario(usuario_id) else None)
        return {"ok": True}

    def opinion_json(o) -> dict:
        u = db.obtener_usuario(o["usuario_id"]) if o["usuario_id"] else None
        return {
            "id": o["id"],
            "tema": o["tema"],
            "temaTexto": TEMAS.get(o["tema"], o["tema"]),
            "puntuacion": o["puntuacion"],
            "texto": o["texto"],
            "nombre": o["nombre"],
            "contacto": o["contacto"],
            "usuario": usuario_json(u) if u else None,
            "creado": o["creado"],
            "leida": bool(o["leida"]),
        }

    @r.get("/api/panel/opiniones", dependencies=[Depends(solo_admin)])
    def listar():
        return [opinion_json(o) for o in db.opiniones()]

    @r.post("/api/panel/opiniones/{oid}/leida", dependencies=[Depends(solo_admin)])
    def marcar(oid: int, d: MarcarOpinion):
        if not db.opinion(oid):
            raise HTTPException(404, "Opinión no encontrada")
        db.marcar_opinion(oid, d.leida)
        return opinion_json(db.opinion(oid))

    @r.delete("/api/panel/opiniones/{oid}", dependencies=[Depends(solo_admin)])
    def borrar(oid: int):
        if not db.opinion(oid):
            raise HTTPException(404, "Opinión no encontrada")
        db.borrar_opinion(oid)
        return {"ok": True}

    return r
