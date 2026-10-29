"""
tickets.py · Tickets del chat. Cada ticket es una conversación propia: un cliente puede
tener varios abiertos a la vez (uno por tema) y abrir otro cuando quiera.

Al abrirse, el ticket empieza con un aviso del sistema que deja registrados los datos de
Discord del cliente (nombre, @usuario, ID, avatar) y la fecha. Lo usan main.py (chat) y
proyectos.py (los avisos de un proyecto van al último ticket abierto del cliente o, si no
tiene ninguno, a uno nuevo).
"""
import time

import db

MAX_ASUNTO = 80


def avatar_url(id_: str, avatar: str | None) -> str | None:
    if not avatar:
        return None
    if avatar.startswith("http"):
        return avatar
    return f"https://cdn.discordapp.com/avatars/{id_}/{avatar}.png?size=128"


def n_ticket(tid: int) -> str:
    return f"#{tid:04d}"


def fecha_txt(ts: int) -> str:
    return time.strftime("%d/%m/%Y · %H:%M", time.localtime(ts))


def abrir(u, asunto: str | None = None) -> tuple[int, object]:
    """Crea un ticket para el usuario 'u' con su aviso de apertura. Devuelve (id, mensaje)."""
    asunto = (asunto or "").strip()[:MAX_ASUNTO] or None
    tid = db.nuevo_ticket(u["id"], asunto)
    ahora = int(time.time())
    usuario = {"id": u["id"], "usuario": u["usuario"], "nombre": u["nombre"], "avatar": avatar_url(u["id"], u["avatar"])}
    texto = (f"🎫 Ticket {n_ticket(tid)} abierto{f' · {asunto}' if asunto else ''} · {u['nombre']} "
             f"(@{u['usuario']}) · ID de Discord {u['id']} · {fecha_txt(ahora)}")
    m = db.nuevo_mensaje(u["id"], "sistema", texto, leido=True, ticket=tid,
                         datos={"tipo": "apertura", "ticket": n_ticket(tid), "asunto": asunto,
                                "usuario": usuario, "abierto": ahora})
    db.ticket_desde(tid, m["id"])
    return tid, m


def para_avisos(cliente_id: str) -> int | None:
    """Ticket donde publicar un aviso automático (proyectos): el último abierto del cliente
    o, si no tiene, uno nuevo «Novedades de tus proyectos»."""
    t = db.ticket_abierto(cliente_id)
    if t:
        return t["id"]
    u = db.obtener_usuario(cliente_id)
    if not u:
        return None
    tid, _ = abrir(u, "Novedades de tus proyectos")
    return tid
