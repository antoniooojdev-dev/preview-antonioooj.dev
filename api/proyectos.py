"""
proyectos.py · Estado de los proyectos de cada cliente.

Desde /admin se crean proyectos y se vinculan a un ticket (chat) ya creado: el cliente es
el dueño de ese ticket. Cada cambio de estado, progreso o fecha, y cada nota, se guarda en
el historial y se publica como mensaje del sistema en ese ticket (si se ha cerrado, en el
último abierto del cliente o en uno nuevo).

El cliente, desde su chat, escribe /estado-proyecto y recibe el resumen de todos sus
proyectos.
"""
import re
from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

import db
import tickets

# Orden = orden en el que se muestran en el panel
ESTADOS = {
    "pendiente": ("⏳", "Pendiente de empezar"),
    "diseno": ("🎨", "En diseño"),
    "desarrollo": ("🛠️", "En desarrollo"),
    "pruebas": ("🧪", "En pruebas"),
    "revision": ("👀", "Esperando tu revisión"),
    "entregado": ("✅", "Entregado"),
    "pausado": ("⏸️", "En pausa"),
}

COMANDOS = {
    "/estado-proyecto": "Ver cómo va cada uno de tus proyectos",
}

_FECHA_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


# ---------------------------------------------------------------------------
# Textos
# ---------------------------------------------------------------------------
def etiqueta(estado: str) -> str:
    emoji, texto = ESTADOS.get(estado, ("•", estado))
    return f"{emoji} {texto}"


def barra(progreso: int) -> str:
    llenos = round(max(0, min(100, progreso)) / 10)
    return "▰" * llenos + "▱" * (10 - llenos)


def fecha_es(iso: str | None) -> str | None:
    if not iso:
        return None
    try:
        return date.fromisoformat(iso).strftime("%d/%m/%Y")
    except ValueError:
        return iso


def resumen_proyecto(p) -> str:
    lineas = [f"«{p['nombre']}»", f"{etiqueta(p['estado'])} · {p['progreso']}%", barra(p["progreso"])]
    if p["entrega"]:
        lineas.append(f"Entrega estimada: {fecha_es(p['entrega'])}")
    ultimo = db.ultimo_evento(p["id"])
    if ultimo:
        lineas.append(f"Última novedad ({date.fromtimestamp(ultimo['creado']).strftime('%d/%m')}): {ultimo['texto']}")
    return "\n".join(lineas)


def proyecto_publico(p) -> dict:
    """Lo que el cliente puede ver de un proyecto (tarjetas del chat y /cuenta)."""
    ultimo = db.ultimo_evento(p["id"])
    emoji, texto = ESTADOS.get(p["estado"], ("•", p["estado"]))
    return {
        "id": p["id"],
        "nombre": p["nombre"],
        "descripcion": p["descripcion"],
        "estado": p["estado"],
        "emoji": emoji,
        "estadoTexto": texto,
        "progreso": p["progreso"],
        "entrega": p["entrega"],
        "actualizado": p["actualizado"],
        "ultimaNovedad": {"texto": ultimo["texto"], "creado": ultimo["creado"]} if ultimo else None,
    }


def resumen_general(lista: list) -> dict:
    """Cifras de cabecera de /estado-proyecto: cuántos hay en marcha, entregados, progreso
    medio (de los no entregados) y la próxima entrega."""
    activos = [p for p in lista if p["estado"] not in ("entregado", "pausado")]
    proximas = sorted((p for p in activos if p["entrega"]), key=lambda p: p["entrega"])
    return {
        "total": len(lista),
        "enMarcha": len(activos),
        "entregados": sum(1 for p in lista if p["estado"] == "entregado"),
        "pausados": sum(1 for p in lista if p["estado"] == "pausado"),
        "progresoMedio": round(sum(p["progreso"] for p in activos) / len(activos)) if activos else 100 if lista else 0,
        "proximaEntrega": {"nombre": proximas[0]["nombre"], "fecha": proximas[0]["entrega"]} if proximas else None,
    }


def estado_cliente(cliente_id: str) -> tuple[str, dict]:
    """Respuesta a /estado-proyecto: texto (para avisos y vistas previas) y datos (para la tarjeta)."""
    lista = db.proyectos(cliente_id)
    resumen = resumen_general(lista)
    datos = {"tipo": "estado", "proyectos": [proyecto_publico(p) for p in lista], "resumen": resumen}
    if not lista:
        return ("📋 Estado de tus proyectos: todavía no tienes proyectos vinculados a tu cuenta. En cuanto "
                "empecemos a trabajar en el tuyo, aparecerá aquí con su estado."), datos
    cabecera = [f"📋 Estado de tus proyectos ({len(lista)})",
                f"🛠️ En marcha: {resumen['enMarcha']} · ✅ Entregados: {resumen['entregados']} · "
                f"📈 Progreso medio: {resumen['progresoMedio']}%"]
    if resumen["proximaEntrega"]:
        cabecera.append(f"📅 Próxima entrega: «{resumen['proximaEntrega']['nombre']}» el "
                        f"{fecha_es(resumen['proximaEntrega']['fecha'])}")
    bloques = "\n\n".join(resumen_proyecto(p) for p in lista)
    return "\n".join(cabecera) + f"\n\n{bloques}", datos


def es_comando(texto: str) -> str | None:
    """Devuelve el comando si el texto es uno conocido (/estado-proyecto), si no None."""
    primero = (texto or "").strip().split(maxsplit=1)[0].lower() if texto and texto.strip() else ""
    return primero if primero in COMANDOS else None


# ---------------------------------------------------------------------------
# Panel
# ---------------------------------------------------------------------------
class DatosProyecto(BaseModel):
    nombre: str | None = None
    descripcion: str | None = None
    clienteId: str | None = None
    # ticket al que se vincula (0 = ninguno; None = no se toca). Si llega, manda sobre clienteId.
    ticketId: int | None = None
    estado: str | None = None
    progreso: int | None = None
    entrega: str | None = None
    nota: str | None = None
    avisar: bool = True


def crear_router(solo_admin, usuario_json, admin_ids: set[str]) -> APIRouter:
    r = APIRouter(prefix="/api/panel/proyectos", dependencies=[Depends(solo_admin)])

    def cliente_valido(cid: str | None):
        if not cid:
            return None
        u = db.obtener_usuario(cid)
        if not u or u["id"] in admin_ids:
            raise HTTPException(400, "Ese cliente no existe")
        return u

    def validar(d: DatosProyecto, nuevo: bool, pid: int | None = None) -> dict:
        campos: dict = {}
        # El nombre se pone al crear el proyecto y ya no se cambia (al editar se ignora)
        if nuevo:
            nombre = (d.nombre or "").strip()
            if not 1 <= len(nombre) <= 120:
                raise HTTPException(400, "El nombre debe tener entre 1 y 120 caracteres")
            campos["nombre"] = nombre
        if d.descripcion is not None:
            if len(d.descripcion) > 1000:
                raise HTTPException(400, "La descripción es demasiado larga (máx. 1000)")
            campos["descripcion"] = d.descripcion.strip()
        if d.estado is not None or nuevo:
            estado = d.estado or "pendiente"
            if estado not in ESTADOS:
                raise HTTPException(400, "Estado no válido")
            campos["estado"] = estado
        if d.progreso is not None or nuevo:
            progreso = d.progreso or 0
            if not 0 <= progreso <= 100:
                raise HTTPException(400, "El progreso va de 0 a 100")
            campos["progreso"] = progreso
        if d.entrega is not None:
            entrega = d.entrega.strip()
            if entrega and not _FECHA_RE.match(entrega):
                raise HTTPException(400, "Fecha de entrega no válida")
            campos["entrega"] = entrega or None
        if d.ticketId is not None:           # 0 = sin ticket ni cliente
            if d.ticketId:
                t = db.ticket(d.ticketId)
                if not t:
                    raise HTTPException(400, "Ese ticket no existe")
                cliente_valido(t["conv"])
                # Un proyecto por ticket
                otro = db.proyecto_de_ticket(t["id"])
                if otro and otro["id"] != pid:
                    raise HTTPException(409, f"El ticket {tickets.n_ticket(t['id'])} ya tiene el proyecto «{otro['nombre']}»")
                campos["cliente_id"], campos["ticket"] = t["conv"], t["id"]
            else:
                campos["cliente_id"], campos["ticket"] = None, None
        elif d.clienteId is not None:        # "" = sin cliente; None = no se toca
            cid = d.clienteId.strip()
            cliente_valido(cid)
            campos["cliente_id"] = cid or None
        if d.nota is not None and len(d.nota) > 1000:
            raise HTTPException(400, "La nota es demasiado larga (máx. 1000)")
        return campos

    def ticket_json(t) -> dict:
        return {"id": t["id"], "numero": tickets.n_ticket(t["id"]), "asunto": t["asunto"],
                "abierto": t["abierto"], "cerrado": t["cerrado"]}

    def proyecto_json(p) -> dict:
        cliente = db.obtener_usuario(p["cliente_id"]) if p["cliente_id"] else None
        ultimo = db.ultimo_evento(p["id"])
        t = db.ticket(p["ticket"]) if p["ticket"] else None
        return {
            "ticket": ticket_json(t) if t else None,
            "id": p["id"],
            "nombre": p["nombre"],
            "descripcion": p["descripcion"],
            "estado": p["estado"],
            "progreso": p["progreso"],
            "entrega": p["entrega"],
            "cliente": usuario_json(cliente) if cliente else None,
            "creado": p["creado"],
            "actualizado": p["actualizado"],
            "ultimoEvento": {"texto": ultimo["texto"], "creado": ultimo["creado"]} if ultimo else None,
        }

    def avisar(p, texto: str, datos: dict) -> None:
        # Al ticket del proyecto si sigue abierto; si no, al último abierto del cliente (o a uno nuevo)
        t = db.ticket(p["ticket"]) if p["ticket"] else None
        tid = t["id"] if t and not t["cerrado"] and t["conv"] == p["cliente_id"] else tickets.para_avisos(p["cliente_id"])
        db.nuevo_mensaje(p["cliente_id"], "sistema", texto, datos=datos, ticket=tid)

    @r.get("/opciones")
    def opciones():
        # Tickets para vincular: primero los abiertos, cada uno con su cliente
        lista = []
        con_proyecto = {p["ticket"]: p for p in db.proyectos() if p["ticket"]}
        for t in db.todos_los_tickets():
            if t["conv"] in admin_ids:
                continue
            p = con_proyecto.get(t["id"])
            lista.append({
                **ticket_json(t),
                # un proyecto por ticket: el panel no deja elegir los que ya tienen uno
                "proyecto": {"id": p["id"], "nombre": p["nombre"]} if p else None,
                "cliente": usuario_json({"id": t["conv"], "usuario": t["usuario"], "nombre": t["nombre"], "avatar": t["avatar"]}),
                "ultimoTexto": (t["ultimo_texto"] or "")[:140] if t["ultimo_emisor"] != "sistema" else None,
                "ultimoCreado": t["ultimo_creado"],
            })
        return {
            "estados": [{"id": k, "emoji": e, "nombre": n} for k, (e, n) in ESTADOS.items()],
            "clientes": [usuario_json(u) for u in db.usuarios() if u["id"] not in admin_ids],
            "tickets": lista,
        }

    @r.get("")
    def listar():
        return [proyecto_json(p) for p in db.proyectos()]

    @r.post("", status_code=201)
    def crear(d: DatosProyecto):
        c = validar(d, nuevo=True)
        pid = db.nuevo_proyecto(c["nombre"], c.get("descripcion", ""), c.get("cliente_id"), c["estado"],
                                c["progreso"], c.get("entrega"), c.get("ticket"))
        p = db.proyecto(pid)
        nota = (d.nota or "").strip()
        avisado = bool(p["cliente_id"] and d.avisar)
        db.nuevo_evento(pid, "Proyecto creado" + (f". {nota}" if nota else ""), avisado)
        if avisado:
            partes = [f"📁 Nuevo proyecto: «{p['nombre']}»", f"Estado: {etiqueta(p['estado'])} · {p['progreso']}%"]
            if p["entrega"]:
                partes.append(f"Entrega estimada: {fecha_es(p['entrega'])}")
            if p["descripcion"]:
                partes.append(f"\n{p['descripcion']}")
            if nota:
                partes.append(f"\n📝 {nota}")
            partes.append("\nEscribe /estado-proyecto cuando quieras para ver cómo va.")
            avisar(p, "\n".join(partes),
                   {"tipo": "nuevo", "proyecto": proyecto_publico(p), "nota": nota or None})
        return proyecto_json(db.proyecto(pid))

    @r.patch("/{pid}")
    def editar(pid: int, d: DatosProyecto):
        antes = db.proyecto(pid)
        if not antes:
            raise HTTPException(404, "Proyecto no encontrado")
        c = validar(d, nuevo=False, pid=pid)
        cambios = {k: v for k, v in c.items() if antes[k] != v}
        nota = (d.nota or "").strip()
        if not cambios and not nota:
            return proyecto_json(antes)
        db.actualizar_proyecto(pid, **cambios)
        p = db.proyecto(pid)

        lineas = []
        if "nombre" in cambios:
            lineas.append(f"Nombre: «{antes['nombre']}» → «{p['nombre']}»")
        if "estado" in cambios:
            lineas.append(f"Estado: {etiqueta(antes['estado'])} → {etiqueta(p['estado'])}")
        if "progreso" in cambios:
            lineas.append(f"Progreso: {antes['progreso']}% → {p['progreso']}%  {barra(p['progreso'])}")
        if "entrega" in cambios:
            lineas.append(f"Entrega estimada: {fecha_es(p['entrega']) or 'sin fecha'}")
        if "descripcion" in cambios:
            lineas.append("Descripción actualizada")

        cliente_nuevo = "cliente_id" in cambios and p["cliente_id"]
        avisado = bool(p["cliente_id"] and d.avisar and (lineas or nota or cliente_nuevo))
        # En el historial, sin la barra de progreso (solo luce en el chat)
        sin_barra = [ln.split("  ")[0] for ln in lineas]
        if "ticket" in cambios and p["ticket"]:
            sin_barra.append(f"Vinculado al ticket {tickets.n_ticket(p['ticket'])}")
        resumen_evento = " · ".join(sin_barra + ([nota] if nota else [])) or (
            "Vinculado a un cliente" if cliente_nuevo else "Cliente desvinculado")
        db.nuevo_evento(pid, resumen_evento, avisado)

        if avisado:
            publico = proyecto_publico(p)
            if cliente_nuevo:
                texto = f"🔗 Se ha vinculado un proyecto a tu cuenta\n\n{resumen_proyecto(p)}"
                if nota:
                    texto += f"\n\n📝 {nota}"
                datos = {"tipo": "vinculado", "proyecto": publico, "nota": nota or None}
            else:
                texto = "\n".join([f"📌 Actualización de «{p['nombre']}»", *lineas] + ([f"\n📝 {nota}"] if nota else []))
                # Cambios con su valor anterior y nuevo, para pintar «antes → después» en la tarjeta
                datos = {
                    "tipo": "actualizacion",
                    "proyecto": publico,
                    "cambios": [{"campo": k, "antes": antes[k], "despues": p[k]}
                                for k in ("nombre", "estado", "progreso", "entrega", "descripcion") if k in cambios],
                    "nota": nota or None,
                }
            avisar(p, texto, datos)
        return proyecto_json(p)

    @r.get("/{pid}/eventos")
    def historial(pid: int):
        if not db.proyecto(pid):
            raise HTTPException(404, "Proyecto no encontrado")
        return [{"id": e["id"], "texto": e["texto"], "avisado": bool(e["avisado"]), "creado": e["creado"]}
                for e in db.eventos(pid)]

    @r.delete("/{pid}")
    def borrar(pid: int):
        if not db.proyecto(pid):
            raise HTTPException(404, "Proyecto no encontrado")
        db.borrar_proyecto(pid)
        return {"ok": True}

    return r
