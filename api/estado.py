"""
estado.py · «Ahora mismo» de «Sobre mí»: tu modo, cómo te encuentras (ánimo y energía),
en qué estás centrado y tus huecos libres (lo eliges tú desde la web), tu estado de
Discord en vivo (presencia.py) y tu carga de trabajo (proyectos.py).

  GET  /api/estado        público: todo lo anterior + historial de modos de hoy
  POST /api/estado        solo admin: cambia cualquiera de los campos (los que no
                          se envían se quedan como estaban)
"""
import time

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

import db
import presencia

# Orden = orden en el selector de la web
MODOS = {
    "disponible": {"emoji": "🟢", "nombre": "Disponible para nuevos proyectos", "texto": "Tengo hueco para empezar un proyecto nuevo."},
    "programando": {"emoji": "💻", "nombre": "Programando", "texto": "Con las manos en el código."},
    "ocupado": {"emoji": "🔥", "nombre": "Agenda llena", "texto": "Ahora mismo a tope; te respondo en cuanto pueda."},
    "reunion": {"emoji": "📞", "nombre": "En una reunión", "texto": "Hablando con un cliente."},
    "descanso": {"emoji": "☕", "nombre": "En descanso", "texto": "Recargando pilas, vuelvo enseguida."},
    "fuera": {"emoji": "🌙", "nombre": "Fuera de horario", "texto": "Te contesto mañana a primera hora."},
    "vacaciones": {"emoji": "🌴", "nombre": "De vacaciones", "texto": "Desconectado unos días."},
}
POR_DEFECTO = "disponible"
MAX_MENSAJE = 120

# Cómo te encuentras
ANIMOS = {
    "genial": {"emoji": "😄", "nombre": "Genial"},
    "bien": {"emoji": "🙂", "nombre": "Bien"},
    "concentrado": {"emoji": "🧐", "nombre": "Concentrado"},
    "inspirado": {"emoji": "✨", "nombre": "Inspirado"},
    "cansado": {"emoji": "😴", "nombre": "Cansado"},
    "liado": {"emoji": "😵‍💫", "nombre": "Con mucho lío"},
    "pachucho": {"emoji": "🤒", "nombre": "Algo pachucho"},
}
ANIMO_DEFECTO = "bien"
ENERGIA_DEFECTO = 80
MAX_ENFOQUE = 80
MAX_PLAZAS = 5

# Historial de modos (para la línea de «mi día»): se guardan los últimos cambios de 2 días
MAX_HISTORIAL = 60
VENTANA_HISTORIAL = 2 * 86400

# Estados de proyectos que cuentan como «en marcha» (ver ESTADOS en proyectos.py)
EN_MARCHA = ("diseno", "desarrollo", "pruebas", "revision")


class NuevoEstado(BaseModel):
    modo: str | None = None
    mensaje: str | None = None
    animo: str | None = None
    energia: int | None = Field(default=None, ge=0, le=100)
    enfoque: str | None = None
    # -1 = no mostrar los huecos libres
    plazas: int | None = Field(default=None, ge=-1, le=MAX_PLAZAS)


def _guardado() -> dict:
    return db.ajuste("estado") or {}


def modo_actual() -> dict:
    guardado = _guardado()
    clave = guardado.get("modo") if guardado.get("modo") in MODOS else POR_DEFECTO
    info = MODOS[clave]
    return {
        "id": clave,
        "emoji": info["emoji"],
        "nombre": info["nombre"],
        "mensaje": guardado.get("mensaje") or info["texto"],
        "personalizado": bool(guardado.get("mensaje")),
        "desde": guardado.get("desde"),
    }


def como_estoy() -> dict:
    g = _guardado()
    clave = g.get("animo") if g.get("animo") in ANIMOS else ANIMO_DEFECTO
    energia = g.get("energia")
    plazas = g.get("plazas")
    return {
        "animo": {"id": clave, **ANIMOS[clave]},
        "energia": energia if isinstance(energia, int) else ENERGIA_DEFECTO,
        "enfoque": g.get("enfoque") or "",
        "plazas": plazas if isinstance(plazas, int) and plazas >= 0 else None,
        "actualizado": g.get("actualizado") or g.get("desde"),
    }


def historial() -> list:
    """Cambios de modo de las últimas 48 h, del más antiguo al más reciente: [{modo, desde}]."""
    limite = int(time.time()) - VENTANA_HISTORIAL
    lista = [h for h in (db.ajuste("estado_historial") or []) if h.get("modo") in MODOS]
    # Se conserva el último cambio anterior a la ventana: marca el modo con el que empezó el día
    previos = [h for h in lista if h["desde"] < limite]
    recientes = [h for h in lista if h["desde"] >= limite]
    return previos[-1:] + recientes


def _anotar_historial(modo: str, desde: int) -> None:
    lista = db.ajuste("estado_historial") or []
    if lista and lista[-1].get("modo") == modo:
        return
    lista.append({"modo": modo, "desde": desde})
    db.guardar_ajuste("estado_historial", lista[-MAX_HISTORIAL:])


def carga() -> dict:
    """Solo totales: nunca nombres ni clientes."""
    activos = entregados = 0
    for p in db.proyectos():
        if p["estado"] in EN_MARCHA:
            activos += 1
        elif p["estado"] == "entregado":
            entregados += 1
    return {"activos": activos, "entregados": entregados}


def crear_router(solo_admin) -> APIRouter:
    r = APIRouter(prefix="/api/estado")

    @r.get("")
    def ver():
        p = presencia.estado()
        return {
            "modo": modo_actual(),
            "yo": como_estoy(),
            "hoy": historial(),
            "carga": carga(),
            "discord": p["presencia"],
            "discordActivo": p["configurado"] and p["conectado"],
            "modos": [{"id": k, "emoji": v["emoji"], "nombre": v["nombre"], "texto": v["texto"]} for k, v in MODOS.items()],
            "animos": [{"id": k, **v} for k, v in ANIMOS.items()],
        }

    @r.get("/diagnostico", dependencies=[Depends(solo_admin)])
    def diagnostico():
        """Para el admin: por qué no aparece el estado de Discord (sin token, sin intents...)."""
        return presencia.estado()

    @r.post("", dependencies=[Depends(solo_admin)])
    def cambiar(d: NuevoEstado):
        antes = _guardado()
        nuevo = dict(antes)
        ahora = int(time.time())

        if d.modo is not None:
            if d.modo not in MODOS:
                raise HTTPException(400, "Modo no válido")
            # «desde» solo cambia si cambia el modo (así se ve «programando desde hace 2 h»)
            if antes.get("modo") != d.modo or not antes.get("desde"):
                nuevo["desde"] = ahora
            nuevo["modo"] = d.modo
        if d.mensaje is not None:
            mensaje = d.mensaje.strip()
            if len(mensaje) > MAX_MENSAJE:
                raise HTTPException(400, f"El mensaje admite como máximo {MAX_MENSAJE} caracteres")
            nuevo["mensaje"] = mensaje or None
        if d.animo is not None:
            if d.animo not in ANIMOS:
                raise HTTPException(400, "Ánimo no válido")
            nuevo["animo"] = d.animo
        if d.energia is not None:
            nuevo["energia"] = d.energia
        if d.enfoque is not None:
            enfoque = d.enfoque.strip()
            if len(enfoque) > MAX_ENFOQUE:
                raise HTTPException(400, f"«En foco» admite como máximo {MAX_ENFOQUE} caracteres")
            nuevo["enfoque"] = enfoque or None
        if d.plazas is not None:
            nuevo["plazas"] = d.plazas if d.plazas >= 0 else None

        nuevo.setdefault("modo", POR_DEFECTO)
        nuevo.setdefault("desde", ahora)
        nuevo["actualizado"] = ahora
        db.guardar_ajuste("estado", nuevo)
        _anotar_historial(nuevo["modo"], nuevo["desde"])
        return {"modo": modo_actual(), "yo": como_estoy(), "hoy": historial()}

    return r
