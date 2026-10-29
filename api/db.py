"""
db.py · Base de datos del chat (SQLite, en data/chat.db).

  usuarios   -> quien ha iniciado sesión con Discord
  mensajes   -> una conversación (ticket) por cliente: conv = ID de Discord del cliente.
                emisor: 'cliente', 'admin' o 'sistema' (avisos automáticos y respuestas a
                comandos como /estado-proyecto). leido: cuándo lo leyó el destinatario.
  bots       -> bots de Discord del panel /admin. El token se lee del .env de su
                carpeta (env_clave) o, si se pegó a mano, va cifrado (token_cifrado).
  proyectos  -> proyectos de clientes con su estado. Si tienen cliente, cada cambio se
                publica en su conversación.
                'ticket': el ticket (chat) al que se vinculó; sus avisos van ahí mientras esté abierto.
  proyecto_eventos -> historial de cambios de cada proyecto.
  opiniones  -> opiniones que dejan los visitantes desde la portada (se leen en /admin).
  ajustes    -> valores sueltos en JSON (p. ej. «estado»: tu modo en «Sobre mí»).
"""
import json
import os
import sqlite3
import time
from contextlib import contextmanager

_DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
RUTA_DB = os.path.join(_DATA_DIR, "chat.db")

_TABLA_MENSAJES = """
CREATE TABLE IF NOT EXISTS {nombre} (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    conv    TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    emisor  TEXT NOT NULL CHECK (emisor IN ('cliente', 'admin', 'sistema')),
    texto   TEXT NOT NULL,
    creado  INTEGER NOT NULL,
    leido   INTEGER,
    datos   TEXT,
    ticket  INTEGER
);
"""

_ESQUEMA = """
CREATE TABLE IF NOT EXISTS usuarios (
    id          TEXT PRIMARY KEY,
    usuario     TEXT NOT NULL,
    nombre      TEXT NOT NULL,
    avatar      TEXT,
    creado      INTEGER NOT NULL,
    ultima_vez  INTEGER NOT NULL
);
""" + _TABLA_MENSAJES.format(nombre="mensajes") + """
CREATE INDEX IF NOT EXISTS idx_mensajes_conv ON mensajes (conv, id);
CREATE TABLE IF NOT EXISTS bots (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    app_id         TEXT NOT NULL UNIQUE,
    nombre         TEXT NOT NULL,
    carpeta        TEXT,
    env_clave      TEXT,
    token_cifrado  TEXT,
    creado         INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS proyectos (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre       TEXT NOT NULL,
    descripcion  TEXT NOT NULL DEFAULT '',
    cliente_id   TEXT REFERENCES usuarios(id) ON DELETE SET NULL,
    estado       TEXT NOT NULL,
    progreso     INTEGER NOT NULL DEFAULT 0 CHECK (progreso BETWEEN 0 AND 100),
    entrega      TEXT,
    creado       INTEGER NOT NULL,
    actualizado  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_proyectos_cliente ON proyectos (cliente_id);
CREATE TABLE IF NOT EXISTS proyecto_eventos (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    proyecto_id  INTEGER NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
    texto        TEXT NOT NULL,
    avisado      INTEGER NOT NULL DEFAULT 0,
    creado       INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_eventos_proyecto ON proyecto_eventos (proyecto_id, id);
CREATE TABLE IF NOT EXISTS tickets (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    conv         TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    desde_msg    INTEGER NOT NULL,
    abierto      INTEGER NOT NULL,
    cerrado      INTEGER,
    cerrado_por  TEXT,
    asunto       TEXT
);
CREATE INDEX IF NOT EXISTS idx_tickets_conv ON tickets (conv, id);
CREATE TABLE IF NOT EXISTS ajustes (
    clave        TEXT PRIMARY KEY,
    valor        TEXT NOT NULL,
    actualizado  INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS opiniones (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    tema        TEXT NOT NULL,
    puntuacion  INTEGER NOT NULL CHECK (puntuacion BETWEEN 1 AND 5),
    texto       TEXT NOT NULL,
    nombre      TEXT,
    contacto    TEXT,
    usuario_id  TEXT REFERENCES usuarios(id) ON DELETE SET NULL,
    creado      INTEGER NOT NULL,
    leida       INTEGER
);
"""


def _migrar(db) -> None:
    """
    1. La primera versión de 'mensajes' no admitía el emisor 'sistema': se rehace la tabla.
    2. 'datos' (JSON de los avisos del sistema, para pintarlos como tarjeta) se añade si falta.
    """
    fila = db.execute("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'mensajes'").fetchone()
    if not fila:
        return
    if "'sistema'" in fila[0]:
        columnas = {c[1] for c in db.execute("PRAGMA table_info(mensajes)")}
        if "datos" not in columnas:
            db.execute("ALTER TABLE mensajes ADD COLUMN datos TEXT")
        return
    db.execute("PRAGMA foreign_keys=OFF")
    db.executescript(
        "BEGIN;"
        + _TABLA_MENSAJES.format(nombre="mensajes_nueva")
        + """INSERT INTO mensajes_nueva (id, conv, emisor, texto, creado, leido)
               SELECT id, conv, emisor, texto, creado, leido FROM mensajes;
             DROP TABLE mensajes;
             ALTER TABLE mensajes_nueva RENAME TO mensajes;
             CREATE INDEX IF NOT EXISTS idx_mensajes_conv ON mensajes (conv, id);
             COMMIT;"""
    )
    db.execute("PRAGMA foreign_keys=ON")


def _migrar_tickets(db) -> None:
    """
    Varios tickets por usuario: cada mensaje pertenece a un ticket (columna 'ticket') y cada
    ticket puede tener asunto. Los mensajes antiguos se reparten entre los tickets que ya
    había (por el id del aviso de apertura); los anteriores al primer ticket van a uno nuevo
    «Conversación anterior».
    """
    if "ticket" not in {c[1] for c in db.execute("PRAGMA table_info(mensajes)")}:
        db.execute("ALTER TABLE mensajes ADD COLUMN ticket INTEGER")
    if "asunto" not in {c[1] for c in db.execute("PRAGMA table_info(tickets)")}:
        db.execute("ALTER TABLE tickets ADD COLUMN asunto TEXT")
    db.execute("CREATE INDEX IF NOT EXISTS idx_mensajes_ticket ON mensajes (ticket, id)")

    for (conv,) in db.execute("SELECT DISTINCT conv FROM mensajes WHERE ticket IS NULL").fetchall():
        tks = db.execute("SELECT id, desde_msg, abierto FROM tickets WHERE conv = ? ORDER BY desde_msg",
                         (conv,)).fetchall()
        primero = tks[0]["desde_msg"] if tks else None
        antiguo = db.execute(
            "SELECT id, creado FROM mensajes WHERE conv = ? AND ticket IS NULL"
            + (" AND id < ?" if primero is not None else "") + " ORDER BY id LIMIT 1",
            (conv, primero) if primero is not None else (conv,),
        ).fetchone()
        if antiguo:
            cerrado = tks[0]["abierto"] if tks else None
            tid = db.execute(
                "INSERT INTO tickets (conv, desde_msg, abierto, cerrado, cerrado_por, asunto) VALUES (?, ?, ?, ?, ?, ?)",
                (conv, antiguo["id"], antiguo["creado"], cerrado, "sistema" if cerrado else None,
                 "Conversación anterior"),
            ).lastrowid
            db.execute(
                "UPDATE mensajes SET ticket = ? WHERE conv = ? AND ticket IS NULL"
                + (" AND id < ?" if primero is not None else ""),
                (tid, conv, primero) if primero is not None else (tid, conv),
            )
        for i, t in enumerate(tks):
            hasta = tks[i + 1]["desde_msg"] if i + 1 < len(tks) else None
            db.execute(
                "UPDATE mensajes SET ticket = ? WHERE conv = ? AND ticket IS NULL AND id >= ?"
                + (" AND id < ?" if hasta is not None else ""),
                (t["id"], conv, t["desde_msg"], hasta) if hasta is not None else (t["id"], conv, t["desde_msg"]),
            )


def _migrar_proyectos(db) -> None:
    """Proyectos vinculados a un ticket concreto (columna 'ticket')."""
    if "ticket" not in {c[1] for c in db.execute("PRAGMA table_info(proyectos)")}:
        db.execute("ALTER TABLE proyectos ADD COLUMN ticket INTEGER")


def iniciar() -> None:
    os.makedirs(_DATA_DIR, exist_ok=True)
    with conexion() as db:
        _migrar(db)
        db.executescript(_ESQUEMA)
        _migrar_tickets(db)
        _migrar_proyectos(db)


@contextmanager
def conexion():
    db = sqlite3.connect(RUTA_DB, timeout=10)
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA journal_mode=WAL")
    db.execute("PRAGMA foreign_keys=ON")
    try:
        yield db
        db.commit()
    finally:
        db.close()


def ahora() -> int:
    return int(time.time())


# ---------- usuarios ----------

def guardar_usuario(id_: str, usuario: str, nombre: str, avatar: str | None) -> None:
    t = ahora()
    with conexion() as db:
        db.execute(
            """INSERT INTO usuarios (id, usuario, nombre, avatar, creado, ultima_vez)
               VALUES (?, ?, ?, ?, ?, ?)
               ON CONFLICT(id) DO UPDATE SET usuario = excluded.usuario, nombre = excluded.nombre,
                                             avatar = excluded.avatar, ultima_vez = excluded.ultima_vez""",
            (id_, usuario, nombre, avatar, t, t),
        )


def obtener_usuario(id_: str):
    with conexion() as db:
        return db.execute("SELECT * FROM usuarios WHERE id = ?", (id_,)).fetchone()


def usuarios() -> list:
    with conexion() as db:
        return db.execute("SELECT * FROM usuarios ORDER BY nombre COLLATE NOCASE").fetchall()


# ---------- mensajes ----------

def mensajes(conv: str, despues_de: int = 0, limite: int = 200) -> list:
    """Mensajes de una conversación con id > despues_de (los últimos 'limite' si es la primera carga)."""
    with conexion() as db:
        if despues_de > 0:
            filas = db.execute(
                "SELECT * FROM mensajes WHERE conv = ? AND id > ? ORDER BY id LIMIT ?",
                (conv, despues_de, limite),
            ).fetchall()
        else:
            filas = db.execute(
                "SELECT * FROM (SELECT * FROM mensajes WHERE conv = ? ORDER BY id DESC LIMIT ?) ORDER BY id",
                (conv, limite),
            ).fetchall()
    return filas


def nuevo_mensaje(conv: str, emisor: str, texto: str, leido: bool = False, datos: dict | None = None,
                  ticket: int | None = None):
    """'datos' (solo avisos del sistema) se guarda como JSON para pintar el mensaje como tarjeta.
    'ticket': ticket al que pertenece (cada ticket es una conversación propia)."""
    with conexion() as db:
        t = ahora()
        cur = db.execute(
            "INSERT INTO mensajes (conv, emisor, texto, creado, leido, datos, ticket) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (conv, emisor, texto, t, t if leido else None,
             json.dumps(datos, ensure_ascii=False) if datos else None, ticket),
        )
        return db.execute("SELECT * FROM mensajes WHERE id = ?", (cur.lastrowid,)).fetchone()


def marcar_leidos(conv: str, *emisores: str) -> None:
    """Marca como leídos los mensajes de esos emisores en la conversación (los lee el otro lado)."""
    with conexion() as db:
        db.execute(
            f"UPDATE mensajes SET leido = ? WHERE conv = ? AND leido IS NULL "
            f"AND emisor IN ({','.join('?' * len(emisores))})",
            (ahora(), conv, *emisores),
        )


def ultimo_leido_por_cliente(conv: str) -> int:
    """ID del último mensaje del admin que el cliente ya ha leído (para el «visto»)."""
    with conexion() as db:
        fila = db.execute(
            "SELECT MAX(id) FROM mensajes WHERE conv = ? AND emisor = 'admin' AND leido IS NOT NULL", (conv,)
        ).fetchone()
    return fila[0] or 0


def ultimo_leido_por_admin(conv: str) -> int:
    with conexion() as db:
        fila = db.execute(
            "SELECT MAX(id) FROM mensajes WHERE conv = ? AND emisor = 'cliente' AND leido IS NOT NULL", (conv,)
        ).fetchone()
    return fila[0] or 0


def total_sin_leer_admin() -> int:
    with conexion() as db:
        return db.execute("SELECT COUNT(*) FROM mensajes WHERE emisor = 'cliente' AND leido IS NULL").fetchone()[0]


def conversaciones() -> list:
    """Una fila por cliente con mensajes: datos del usuario, último mensaje y no leídos."""
    with conexion() as db:
        return db.execute(
            """SELECT u.id, u.usuario, u.nombre, u.avatar,
                      m.texto AS ultimo_texto, m.emisor AS ultimo_emisor, m.creado AS ultimo_creado, m.id AS ultimo_id,
                      (SELECT COUNT(*) FROM mensajes x
                        WHERE x.conv = u.id AND x.emisor = 'cliente' AND x.leido IS NULL) AS sin_leer
               FROM usuarios u
               JOIN mensajes m ON m.id = (SELECT MAX(id) FROM mensajes WHERE conv = u.id)
               ORDER BY m.id DESC"""
        ).fetchall()


# ---------- tickets ----------
# Cada conversación es una sucesión de tickets: el primero se abre con el primer mensaje
# y, tras cerrarse, el siguiente mensaje abre otro. desde_msg = id del aviso de apertura
# (la transcripción es todo lo que hay desde ahí).

def ticket_abierto(conv: str):
    with conexion() as db:
        return db.execute(
            "SELECT * FROM tickets WHERE conv = ? AND cerrado IS NULL ORDER BY id DESC LIMIT 1", (conv,)
        ).fetchone()


def ultimo_ticket(conv: str):
    with conexion() as db:
        return db.execute("SELECT * FROM tickets WHERE conv = ? ORDER BY id DESC LIMIT 1", (conv,)).fetchone()


def nuevo_ticket(conv: str, asunto: str | None = None) -> int:
    """Crea el ticket (desde_msg se rellena después, con el id del aviso de apertura)."""
    with conexion() as db:
        return db.execute(
            "INSERT INTO tickets (conv, desde_msg, abierto, asunto) VALUES (?, 0, ?, ?)", (conv, ahora(), asunto)
        ).lastrowid


def ticket(tid: int):
    with conexion() as db:
        return db.execute("SELECT * FROM tickets WHERE id = ?", (tid,)).fetchone()


def mensajes_de_ticket(tid: int, despues_de: int = 0, limite: int = 300) -> list:
    with conexion() as db:
        if despues_de > 0:
            return db.execute("SELECT * FROM mensajes WHERE ticket = ? AND id > ? ORDER BY id LIMIT ?",
                              (tid, despues_de, limite)).fetchall()
        return db.execute(
            "SELECT * FROM (SELECT * FROM mensajes WHERE ticket = ? ORDER BY id DESC LIMIT ?) ORDER BY id",
            (tid, limite)).fetchall()


def marcar_leidos_ticket(tid: int, *emisores: str) -> None:
    with conexion() as db:
        db.execute(
            f"UPDATE mensajes SET leido = ? WHERE ticket = ? AND leido IS NULL "
            f"AND emisor IN ({','.join('?' * len(emisores))})",
            (ahora(), tid, *emisores),
        )


def visto_ticket(tid: int, emisor: str) -> int:
    """Último mensaje de 'emisor' en el ticket que el otro lado ya ha leído (para el «visto»)."""
    with conexion() as db:
        fila = db.execute("SELECT MAX(id) FROM mensajes WHERE ticket = ? AND emisor = ? AND leido IS NOT NULL",
                          (tid, emisor)).fetchone()
    return fila[0] or 0


_SQL_TICKETS = """
SELECT t.id, t.conv, t.abierto, t.cerrado, t.cerrado_por, t.asunto,
       u.usuario, u.nombre, u.avatar,
       m.emisor AS ultimo_emisor, m.texto AS ultimo_texto, m.creado AS ultimo_creado, m.id AS ultimo_id,
       (SELECT COUNT(*) FROM mensajes x WHERE x.ticket = t.id AND x.emisor = 'cliente' AND x.leido IS NULL)
           AS sin_leer_admin,
       (SELECT COUNT(*) FROM mensajes x WHERE x.ticket = t.id AND x.emisor IN ('admin', 'sistema')
           AND x.leido IS NULL) AS sin_leer_cliente,
       (SELECT COUNT(*) FROM mensajes x WHERE x.ticket = t.id AND x.emisor != 'sistema') AS n_mensajes,
       (SELECT COUNT(*) FROM proyectos p WHERE p.cliente_id = t.conv) AS n_proyectos
FROM tickets t
JOIN usuarios u ON u.id = t.conv
LEFT JOIN mensajes m ON m.id = (SELECT MAX(id) FROM mensajes WHERE ticket = t.id)
{donde}
ORDER BY (t.cerrado IS NOT NULL), COALESCE(m.id, 0) DESC
"""


def tickets_de(conv: str) -> list:
    with conexion() as db:
        return db.execute(_SQL_TICKETS.format(donde="WHERE t.conv = ?"), (conv,)).fetchall()


def todos_los_tickets() -> list:
    with conexion() as db:
        return db.execute(_SQL_TICKETS.format(donde="")).fetchall()


def ticket_desde(ticket_id: int, msg_id: int) -> None:
    with conexion() as db:
        db.execute("UPDATE tickets SET desde_msg = ? WHERE id = ?", (msg_id, ticket_id))


def cerrar_ticket(ticket_id: int, por: str) -> None:
    with conexion() as db:
        db.execute("UPDATE tickets SET cerrado = ?, cerrado_por = ? WHERE id = ?", (ahora(), por, ticket_id))


def mensajes_ticket(conv: str, desde_msg: int) -> list:
    with conexion() as db:
        return db.execute(
            "SELECT * FROM mensajes WHERE conv = ? AND id >= ? ORDER BY id", (conv, desde_msg)
        ).fetchall()


def resumen_tickets() -> dict:
    """Por conversación: ticket actual (o el último), total de tickets y de proyectos."""
    with conexion() as db:
        filas = db.execute(
            """SELECT t.conv, t.id, t.abierto, t.cerrado,
                      (SELECT COUNT(*) FROM tickets x WHERE x.conv = t.conv) AS total
               FROM tickets t
               WHERE t.id = (SELECT MAX(id) FROM tickets WHERE conv = t.conv)"""
        ).fetchall()
        proys = db.execute(
            "SELECT cliente_id, COUNT(*) AS n FROM proyectos WHERE cliente_id IS NOT NULL GROUP BY cliente_id"
        ).fetchall()
    salida = {f["conv"]: {"id": f["id"], "abierto": f["abierto"], "cerrado": f["cerrado"], "total": f["total"]}
              for f in filas}
    for p in proys:
        salida.setdefault(p["cliente_id"], {})["proyectos"] = p["n"]
    return salida


# ---------- bots (panel) ----------

def bots() -> list:
    with conexion() as db:
        return db.execute("SELECT * FROM bots ORDER BY nombre COLLATE NOCASE").fetchall()


def bot(id_: int):
    with conexion() as db:
        return db.execute("SELECT * FROM bots WHERE id = ?", (id_,)).fetchone()


def bot_por_app(app_id: str):
    with conexion() as db:
        return db.execute("SELECT * FROM bots WHERE app_id = ?", (app_id,)).fetchone()


def nuevo_bot(app_id: str, nombre: str, carpeta: str | None, env_clave: str | None, token_cifrado: str | None) -> int:
    with conexion() as db:
        cur = db.execute(
            "INSERT INTO bots (app_id, nombre, carpeta, env_clave, token_cifrado, creado) VALUES (?, ?, ?, ?, ?, ?)",
            (app_id, nombre, carpeta, env_clave, token_cifrado, ahora()),
        )
        return cur.lastrowid


def renombrar_bot(id_: int, nombre: str) -> None:
    with conexion() as db:
        db.execute("UPDATE bots SET nombre = ? WHERE id = ?", (nombre, id_))


def borrar_bot(id_: int) -> None:
    with conexion() as db:
        db.execute("DELETE FROM bots WHERE id = ?", (id_,))


# ---------- proyectos ----------

def proyectos(cliente_id: str | None = None) -> list:
    with conexion() as db:
        if cliente_id:
            return db.execute(
                "SELECT * FROM proyectos WHERE cliente_id = ? ORDER BY actualizado DESC", (cliente_id,)
            ).fetchall()
        return db.execute("SELECT * FROM proyectos ORDER BY actualizado DESC").fetchall()


def proyecto(id_: int):
    with conexion() as db:
        return db.execute("SELECT * FROM proyectos WHERE id = ?", (id_,)).fetchone()


def proyecto_de_ticket(ticket_id: int):
    with conexion() as db:
        return db.execute("SELECT * FROM proyectos WHERE ticket = ? LIMIT 1", (ticket_id,)).fetchone()


def nuevo_proyecto(nombre: str, descripcion: str, cliente_id: str | None, estado: str, progreso: int,
                   entrega: str | None, ticket: int | None = None) -> int:
    t = ahora()
    with conexion() as db:
        cur = db.execute(
            """INSERT INTO proyectos (nombre, descripcion, cliente_id, estado, progreso, entrega, creado, actualizado, ticket)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (nombre, descripcion, cliente_id, estado, progreso, entrega, t, t, ticket),
        )
        return cur.lastrowid


def actualizar_proyecto(id_: int, **campos) -> None:
    permitidos = {"nombre", "descripcion", "cliente_id", "estado", "progreso", "entrega", "ticket"}
    campos = {k: v for k, v in campos.items() if k in permitidos}
    if not campos:
        return
    with conexion() as db:
        db.execute(
            f"UPDATE proyectos SET {', '.join(f'{k} = ?' for k in campos)}, actualizado = ? WHERE id = ?",
            (*campos.values(), ahora(), id_),
        )


def borrar_proyecto(id_: int) -> None:
    with conexion() as db:
        db.execute("DELETE FROM proyectos WHERE id = ?", (id_,))


def nuevo_evento(proyecto_id: int, texto: str, avisado: bool) -> None:
    with conexion() as db:
        db.execute(
            "INSERT INTO proyecto_eventos (proyecto_id, texto, avisado, creado) VALUES (?, ?, ?, ?)",
            (proyecto_id, texto, int(avisado), ahora()),
        )
        db.execute("UPDATE proyectos SET actualizado = ? WHERE id = ?", (ahora(), proyecto_id))


def eventos(proyecto_id: int, limite: int = 50) -> list:
    with conexion() as db:
        return db.execute(
            "SELECT * FROM proyecto_eventos WHERE proyecto_id = ? ORDER BY id DESC LIMIT ?", (proyecto_id, limite)
        ).fetchall()


def ajuste(clave: str, defecto=None):
    with conexion() as db:
        fila = db.execute("SELECT valor FROM ajustes WHERE clave = ?", (clave,)).fetchone()
    if not fila:
        return defecto
    try:
        return json.loads(fila[0])
    except ValueError:
        return defecto


def guardar_ajuste(clave: str, valor) -> None:
    with conexion() as db:
        db.execute(
            """INSERT INTO ajustes (clave, valor, actualizado) VALUES (?, ?, ?)
               ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor, actualizado = excluded.actualizado""",
            (clave, json.dumps(valor, ensure_ascii=False), ahora()),
        )


def ultimo_evento(proyecto_id: int):
    with conexion() as db:
        return db.execute(
            "SELECT * FROM proyecto_eventos WHERE proyecto_id = ? ORDER BY id DESC LIMIT 1", (proyecto_id,)
        ).fetchone()


# ---------- opiniones ----------

def nueva_opinion(tema: str, puntuacion: int, texto: str, nombre: str | None, contacto: str | None,
                  usuario_id: str | None) -> int:
    with conexion() as db:
        return db.execute(
            """INSERT INTO opiniones (tema, puntuacion, texto, nombre, contacto, usuario_id, creado)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (tema, puntuacion, texto, nombre, contacto, usuario_id, ahora()),
        ).lastrowid


def opiniones() -> list:
    with conexion() as db:
        return db.execute("SELECT * FROM opiniones ORDER BY id DESC LIMIT 500").fetchall()


def opinion(id_: int):
    with conexion() as db:
        return db.execute("SELECT * FROM opiniones WHERE id = ?", (id_,)).fetchone()


def marcar_opinion(id_: int, leida: bool) -> None:
    with conexion() as db:
        db.execute("UPDATE opiniones SET leida = ? WHERE id = ?", (ahora() if leida else None, id_))


def borrar_opinion(id_: int) -> None:
    with conexion() as db:
        db.execute("DELETE FROM opiniones WHERE id = ?", (id_,))


def opiniones_sin_leer() -> int:
    with conexion() as db:
        return db.execute("SELECT COUNT(*) FROM opiniones WHERE leida IS NULL").fetchone()[0]
