"""
estadisticas.py · Estadísticas de la web y consumo del servidor (pestaña «Estadísticas» de /admin).

Visitas (anónimas y sin cookies):
  - Cada página de la web avisa al cargar (POST /api/estadisticas/visita) y al salir manda cuánto
    tiempo se ha estado y hasta dónde se ha bajado (POST /api/estadisticas/fin, con sendBeacon).
  - No se guarda la IP ni nada en el navegador. Para contar «visitantes únicos» se usa un resumen
    (hash) de IP + navegador con una sal que cambia cada día y no se guarda en disco: al día
    siguiente ya no se puede relacionar con nadie. Una sesión son las páginas de un mismo
    visitante sin más de 30 minutos entre una y otra. «Nuevo» = su primera visita del día.
  - No cuentan los bots conocidos, quien pide no ser seguido (Global Privacy Control) ni tus
    propias visitas con la sesión de administrador (se guardan marcadas y el panel las oculta
    salvo que actives «Incluir mis visitas»).

Consumo:
  - Cada petición a la API suma en un contador por minuto (total, errores, ms, bytes enviados).
  - Cada minuto se apunta CPU, RAM, disco, red y memoria de la propia API (psutil).

Todo va en data/estadisticas.db, aparte del chat. Se borra solo lo antiguo (ver RETENCION).
"""
import asyncio
import hashlib
import os
import re
import secrets
import sqlite3
import threading
import time
from collections import Counter, defaultdict
from contextlib import contextmanager
from datetime import datetime, timedelta
from urllib.parse import urlsplit

import psutil
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

import seguridad

_DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
RUTA_DB = os.path.join(_DATA_DIR, "estadisticas.db")
ARRANQUE = time.time()

# Días que se guarda cada cosa
RETENCION = {"visitas": 400, "peticiones": 35, "sistema": 8}
# Una visita «está» en la web si cargó una página en los últimos 5 minutos
VENTANA_VIVO = 5 * 60
PAUSA_SESION = 30 * 60
RANGOS = {"24h": 24 * 3600, "7d": 7 * 86400, "30d": 30 * 86400, "90d": 90 * 86400}

_ESQUEMA = """
CREATE TABLE IF NOT EXISTS visitas (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    clave      TEXT NOT NULL,
    ts         INTEGER NOT NULL,
    ruta       TEXT NOT NULL,
    titulo     TEXT,
    referente  TEXT,
    fuente     TEXT NOT NULL,
    pais       TEXT,
    dispositivo TEXT NOT NULL,
    navegador  TEXT NOT NULL,
    so         TEXT NOT NULL,
    idioma     TEXT,
    pantalla   TEXT,
    tema       TEXT,
    visitante  TEXT NOT NULL,
    sesion     TEXT NOT NULL,
    nuevo      INTEGER NOT NULL DEFAULT 0,
    admin      INTEGER NOT NULL DEFAULT 0,
    duracion   INTEGER,
    scroll     INTEGER,
    carga      INTEGER
);
CREATE INDEX IF NOT EXISTS visitas_ts ON visitas(ts);
CREATE INDEX IF NOT EXISTS visitas_visitante ON visitas(visitante, ts);
CREATE TABLE IF NOT EXISTS peticiones (
    minuto   INTEGER PRIMARY KEY,
    total    INTEGER NOT NULL,
    err4     INTEGER NOT NULL,
    err5     INTEGER NOT NULL,
    ms       INTEGER NOT NULL,
    bytes    INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS sistema (
    ts        INTEGER PRIMARY KEY,
    cpu       REAL,
    ram       REAL,
    ram_api   INTEGER,
    disco     REAL,
    red_in    INTEGER,
    red_out   INTEGER
);
"""


@contextmanager
def conexion():
    db = sqlite3.connect(RUTA_DB, timeout=10)
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA journal_mode=WAL")
    try:
        yield db
        db.commit()
    finally:
        db.close()


def iniciar() -> None:
    os.makedirs(_DATA_DIR, exist_ok=True)
    with conexion() as db:
        db.executescript(_ESQUEMA)


# ---------------------------------------------------------------------------
# Quién visita: navegador, sistema, dispositivo y de dónde llega
# ---------------------------------------------------------------------------
_BOT_RE = re.compile(
    r"bot|crawl|spider|slurp|headless|lighthouse|pagespeed|preview|facebookexternalhit|embedly|"
    r"curl|wget|python|httpx|axios|node-fetch|go-http|java/|phantom|selenium|puppeteer|playwright",
    re.I,
)
_RUTA_RE = re.compile(r"^/[A-Za-z0-9\-._~/%]*$")
_CONTROL_RE = re.compile(r"[\x00-\x1f\x7f]")

BUSCADORES = ("google.", "bing.", "duckduckgo.", "yahoo.", "ecosia.", "yandex.", "baidu.", "qwant.", "startpage.", "brave.")
REDES = {
    "discord": "Discord", "t.co": "X / Twitter", "twitter.": "X / Twitter", "x.com": "X / Twitter",
    "instagram.": "Instagram", "facebook.": "Facebook", "fb.": "Facebook", "linkedin.": "LinkedIn",
    "lnkd.in": "LinkedIn", "github.": "GitHub", "youtube.": "YouTube", "reddit.": "Reddit",
    "tiktok.": "TikTok", "whatsapp.": "WhatsApp", "wa.me": "WhatsApp", "telegram.": "Telegram",
    "t.me": "Telegram",
}


def leer_agente(ua: str) -> tuple[str, str, str]:
    """(dispositivo, navegador, sistema) a partir del User-Agent."""
    if re.search(r"iPad|Tablet|PlayBook|Silk", ua) or ("Android" in ua and "Mobile" not in ua):
        dispositivo = "Tablet"
    elif re.search(r"Mobi|iPhone|iPod|Android|Windows Phone", ua):
        dispositivo = "Móvil"
    else:
        dispositivo = "Escritorio"

    for patron, nombre in (
        (r"Edg(A|iOS)?/", "Edge"), (r"OPR/|Opera", "Opera"), (r"SamsungBrowser", "Samsung Internet"),
        (r"YaBrowser", "Yandex"), (r"Vivaldi", "Vivaldi"), (r"Firefox|FxiOS", "Firefox"),
        (r"CriOS|Chrome", "Chrome"), (r"Safari", "Safari"),
    ):
        if re.search(patron, ua):
            navegador = nombre
            break
    else:
        navegador = "Otro"

    if re.search(r"iPhone|iPad|iPod", ua):
        so = "iOS"
    elif "Android" in ua:
        so = "Android"
    elif "CrOS" in ua:
        so = "ChromeOS"
    elif "Windows" in ua:
        so = "Windows"
    elif "Mac OS X" in ua or "Macintosh" in ua:
        so = "macOS"
    elif "Linux" in ua:
        so = "Linux"
    else:
        so = "Otro"
    return dispositivo, navegador, so


def clasificar_referente(referente: str | None, utm: str | None) -> tuple[str | None, str]:
    """(web de la que viene, tipo de fuente). Sin referente = entrada directa."""
    if utm:
        utm = _CONTROL_RE.sub("", utm).strip().lower()[:40]
    host = None
    if referente:
        try:
            host = (urlsplit(referente).hostname or "").lower().removeprefix("www.")[:80] or None
        except ValueError:
            host = None
    nombre = host or utm
    if not nombre:
        return None, "Directo"
    if any(b in nombre for b in BUSCADORES):
        return host or utm, "Buscadores"
    if any(k in nombre for k in REDES):
        return host or utm, "Redes sociales"
    if utm and not host:
        return utm, "Campañas"
    return host, "Otras webs"


# Sal del día para el resumen de visitantes: solo en memoria (se pierde al reiniciar o cambiar de día)
_sal = {"dia": "", "valor": b""}


def huella(ip: str, ua: str) -> str:
    dia = time.strftime("%Y-%m-%d")
    if _sal["dia"] != dia:
        _sal.update(dia=dia, valor=secrets.token_bytes(32))
    return hashlib.sha256(_sal["valor"] + ip.encode() + b"|" + ua.encode()).hexdigest()[:20]


def _texto(valor: str | None, maximo: int) -> str | None:
    valor = _CONTROL_RE.sub("", valor or "").strip()
    return valor[:maximo] or None


# ---------------------------------------------------------------------------
# Consumo: contador de peticiones por minuto (lo llama el middleware de main.py)
# ---------------------------------------------------------------------------
_cerrojo = threading.Lock()
_minutos: dict[int, list[int]] = {}       # minuto -> [total, err4, err5, ms, bytes]


def contar(estado: int, ms: float, bytes_: int) -> None:
    minuto = int(time.time() // 60 * 60)
    with _cerrojo:
        f = _minutos.setdefault(minuto, [0, 0, 0, 0, 0])
        f[0] += 1
        f[1] += 400 <= estado < 500
        f[2] += estado >= 500
        f[3] += int(ms)
        f[4] += max(0, bytes_)


def _volcar_peticiones(todo: bool = False) -> None:
    actual = int(time.time() // 60 * 60)
    with _cerrojo:
        listos = {m: v for m, v in _minutos.items() if todo or m < actual}
        for m in listos:
            _minutos.pop(m, None)
    if not listos:
        return
    with conexion() as db:
        for m, (t, e4, e5, ms, b) in listos.items():
            db.execute(
                """INSERT INTO peticiones (minuto, total, err4, err5, ms, bytes) VALUES (?,?,?,?,?,?)
                   ON CONFLICT(minuto) DO UPDATE SET total=total+excluded.total, err4=err4+excluded.err4,
                   err5=err5+excluded.err5, ms=ms+excluded.ms, bytes=bytes+excluded.bytes""",
                (m, t, e4, e5, ms, b),
            )


_red_previa: list = [None]
_proceso = psutil.Process()


def _ahora_sistema() -> dict:
    mem = psutil.virtual_memory()
    try:
        disco = psutil.disk_usage(_DATA_DIR)
    except OSError:
        disco = None
    red = psutil.net_io_counters()
    return {
        "cpu": psutil.cpu_percent(interval=None),
        "nucleos": psutil.cpu_count() or 1,
        "ram": mem.percent,
        "ramUsada": mem.used,
        "ramTotal": mem.total,
        "ramApi": _proceso.memory_info().rss,
        "disco": disco.percent if disco else None,
        "discoUsado": disco.used if disco else None,
        "discoTotal": disco.total if disco else None,
        "red": red,
    }


def _muestrear() -> None:
    s = _ahora_sistema()
    red = s["red"]
    previa, _red_previa[0] = _red_previa[0], red
    if previa is None:
        return                       # la primera muestra solo sirve de referencia para la red
    ts = int(time.time() // 60 * 60)
    with conexion() as db:
        db.execute(
            "INSERT OR REPLACE INTO sistema (ts, cpu, ram, ram_api, disco, red_in, red_out) VALUES (?,?,?,?,?,?,?)",
            (ts, s["cpu"], s["ram"], s["ramApi"], s["disco"],
             max(0, red.bytes_recv - previa.bytes_recv), max(0, red.bytes_sent - previa.bytes_sent)),
        )


def _limpiar() -> None:
    ahora = int(time.time())
    with conexion() as db:
        db.execute("DELETE FROM visitas WHERE ts < ?", (ahora - RETENCION["visitas"] * 86400,))
        db.execute("DELETE FROM peticiones WHERE minuto < ?", (ahora - RETENCION["peticiones"] * 86400,))
        db.execute("DELETE FROM sistema WHERE ts < ?", (ahora - RETENCION["sistema"] * 86400,))


_tarea: list = [None]


async def _bucle() -> None:
    psutil.cpu_percent(interval=None)    # la primera lectura de CPU siempre es 0: se descarta
    vueltas = 0
    while True:
        await asyncio.sleep(60 - time.time() % 60 + 1)       # justo después de cada minuto
        try:
            await asyncio.to_thread(_volcar_peticiones)
            await asyncio.to_thread(_muestrear)
            if vueltas % 360 == 0:                             # cada 6 h
                await asyncio.to_thread(_limpiar)
        except Exception as e:                                 # que un fallo no pare el muestreo
            print(f"[estadisticas] {e!r}")
        vueltas += 1


def arrancar() -> None:
    iniciar()
    _red_previa[0] = psutil.net_io_counters()
    _tarea[0] = asyncio.get_running_loop().create_task(_bucle())


async def parar() -> None:
    if _tarea[0]:
        _tarea[0].cancel()
    try:
        _volcar_peticiones(todo=True)
    except Exception:
        pass


# ---------------------------------------------------------------------------
# Cálculos para el panel
# ---------------------------------------------------------------------------
def _cubos(desde: int, hasta: int, paso: str) -> list[tuple[int, str]]:
    """Inicio y etiqueta de cada cubo (hora o día, en hora local)."""
    if paso == "hora":
        t = datetime.fromtimestamp(desde).replace(minute=0, second=0, microsecond=0)
        salto = timedelta(hours=1)
    else:
        t = datetime.fromtimestamp(desde).replace(hour=0, minute=0, second=0, microsecond=0)
        salto = timedelta(days=1)
    fin = datetime.fromtimestamp(hasta)
    lista = []
    while t <= fin:
        lista.append((int(t.timestamp()), t.isoformat(timespec="minutes")))
        t += salto
    return lista


def _indice(cubos: list[tuple[int, str]], ts: int) -> int:
    # búsqueda binaria: el último cubo cuyo inicio es <= ts
    lo, hi = 0, len(cubos) - 1
    while lo < hi:
        mid = (lo + hi + 1) // 2
        if cubos[mid][0] <= ts:
            lo = mid
        else:
            hi = mid - 1
    return lo


def _visitas(db, desde: int, hasta: int, con_admin: bool) -> list:
    sql = "SELECT * FROM visitas WHERE ts >= ? AND ts < ?" + ("" if con_admin else " AND admin = 0")
    return db.execute(sql + " ORDER BY ts", (desde, hasta)).fetchall()


def _resumen(filas: list) -> dict:
    sesiones: dict[str, list] = defaultdict(list)
    for f in filas:
        sesiones[f["sesion"]].append(f)
    n_ses = len(sesiones)
    rebotes = sum(1 for s in sesiones.values() if len(s) == 1)
    duraciones = [f["duracion"] for f in filas if f["duracion"]]
    # tiempo por sesión: suma de lo que se estuvo en cada página
    por_sesion = [sum(f["duracion"] or 0 for f in s) for s in sesiones.values()]
    por_sesion = [d for d in por_sesion if d]
    scrolls = [f["scroll"] for f in filas if f["scroll"] is not None]
    cargas = [f["carga"] for f in filas if f["carga"]]
    return {
        "visitas": len(filas),
        "visitantes": len({f["visitante"] for f in filas}),
        "sesiones": n_ses,
        "nuevos": sum(1 for f in filas if f["nuevo"]),
        "paginasSesion": round(len(filas) / n_ses, 2) if n_ses else 0,
        "rebote": round(rebotes * 100 / n_ses, 1) if n_ses else 0,
        "duracionPagina": round(sum(duraciones) / len(duraciones)) if duraciones else 0,
        "duracionSesion": round(sum(por_sesion) / len(por_sesion)) if por_sesion else 0,
        "scroll": round(sum(scrolls) / len(scrolls)) if scrolls else 0,
        "carga": round(sorted(cargas)[len(cargas) // 2]) if cargas else 0,
    }


def _top(contador: Counter, total: int, n: int = 10, extra: dict | None = None) -> list:
    return [
        {"nombre": k, "valor": v, "pct": round(v * 100 / total, 1) if total else 0, **((extra or {}).get(k, {}))}
        for k, v in contador.most_common(n)
    ]


def calcular(rango: str, con_admin: bool) -> dict:
    ahora = int(time.time())
    largo = RANGOS[rango]
    desde = ahora - largo
    paso = "hora" if rango == "24h" else "dia"

    with conexion() as db:
        filas = _visitas(db, desde, ahora + 1, con_admin)
        previas = _visitas(db, desde - largo, desde, con_admin)

        # «Hoy contra ayer» por horas y mapa de calor de las últimas 4 semanas
        hoy0 = int(datetime.now().replace(hour=0, minute=0, second=0, microsecond=0).timestamp())
        ayer0 = int((datetime.fromtimestamp(hoy0) - timedelta(days=1)).timestamp())
        dos_dias = _visitas(db, ayer0, ahora + 1, con_admin)
        cuatro_semanas = _visitas(db, ahora - 28 * 86400, ahora + 1, con_admin)
        ultima_hora = _visitas(db, ahora - 3600, ahora + 1, con_admin)
        recientes = db.execute(
            "SELECT * FROM visitas" + ("" if con_admin else " WHERE admin = 0") + " ORDER BY ts DESC LIMIT 40"
        ).fetchall()

        # Consumo de la API en el mismo rango
        peticiones = db.execute("SELECT * FROM peticiones WHERE minuto >= ? ORDER BY minuto", (desde,)).fetchall()
        sistema = db.execute("SELECT * FROM sistema WHERE ts >= ? ORDER BY ts", (ahora - 24 * 3600,)).fetchall()
        n_total = db.execute("SELECT COUNT(*) FROM visitas").fetchone()[0]
        primera = db.execute("SELECT MIN(ts) FROM visitas").fetchone()[0]

    # pendientes del minuto actual (aún en memoria)
    with _cerrojo:
        en_memoria = {m: list(v) for m, v in _minutos.items()}

    # ── serie principal (barras) ─────────────
    cubos = _cubos(desde, ahora, paso)
    serie = [{"t": etiqueta, "visitas": 0, "visitantes": set()} for _, etiqueta in cubos]
    for f in filas:
        c = serie[_indice(cubos, f["ts"])]
        c["visitas"] += 1
        c["visitantes"].add(f["visitante"])
    for c in serie:
        c["visitantes"] = len(c["visitantes"])

    # ── hoy contra ayer (24 horas cada uno) ──
    hoy, ayer = [0] * 24, [0] * 24
    for f in dos_dias:
        h = datetime.fromtimestamp(f["ts"]).hour
        (hoy if f["ts"] >= hoy0 else ayer)[h] += 1

    # ── últimos 60 minutos ───────────────────
    minuto0 = ahora // 60 * 60 - 59 * 60
    minutos = [0] * 60
    for f in ultima_hora:
        i = (f["ts"] - minuto0) // 60
        if 0 <= i < 60:
            minutos[i] += 1

    # ── mapa de calor: día de la semana × hora
    calor = [[0] * 24 for _ in range(7)]
    for f in cuatro_semanas:
        d = datetime.fromtimestamp(f["ts"])
        calor[d.weekday()][d.hour] += 1

    # ── rankings ─────────────────────────────
    total = len(filas)
    paginas, titulos, tiempo_pag = Counter(), {}, defaultdict(list)
    for f in filas:
        paginas[f["ruta"]] += 1
        if f["titulo"]:
            titulos[f["ruta"]] = f["titulo"]
        if f["duracion"]:
            tiempo_pag[f["ruta"]].append(f["duracion"])
    extra_pag = {
        r: {"titulo": titulos.get(r), "tiempo": round(sum(t) / len(t)) if (t := tiempo_pag.get(r)) else 0}
        for r in paginas
    }
    entradas, salidas = Counter(), Counter()
    sesiones: dict[str, list] = defaultdict(list)
    for f in filas:
        sesiones[f["sesion"]].append(f)
    for s in sesiones.values():
        entradas[s[0]["ruta"]] += 1
        salidas[s[-1]["ruta"]] += 1

    def contar_por(campo: str, solo_entradas: bool = False, vacio: str = "Desconocido") -> Counter:
        origen = [s[0] for s in sesiones.values()] if solo_entradas else filas
        return Counter((f[campo] or vacio) for f in origen)

    fuentes = contar_por("fuente", True)
    referentes = Counter(s[0]["referente"] for s in sesiones.values() if s[0]["referente"])
    n_ses = len(sesiones)

    # ── en vivo ──────────────────────────────
    vivos = [f for f in recientes if f["ts"] >= ahora - VENTANA_VIVO]
    por_visitante = {}
    for f in vivos:                       # recientes va del más nuevo al más viejo
        por_visitante.setdefault(f["visitante"], f)

    # ── consumo ──────────────────────────────
    pet_cubos = [{"t": etiqueta, "total": 0, "errores": 0, "ms": 0} for _, etiqueta in cubos]
    tot = {"total": 0, "err4": 0, "err5": 0, "ms": 0, "bytes": 0}
    filas_pet = [(p["minuto"], p["total"], p["err4"], p["err5"], p["ms"], p["bytes"]) for p in peticiones]
    filas_pet += [(m, *v) for m, v in en_memoria.items() if m >= desde]
    for m, t, e4, e5, ms, b in filas_pet:
        c = pet_cubos[_indice(cubos, m)]
        c["total"] += t
        c["errores"] += e4 + e5
        c["ms"] += ms
        tot["total"] += t
        tot["err4"] += e4
        tot["err5"] += e5
        tot["ms"] += ms
        tot["bytes"] += b
    for c in pet_cubos:
        c["ms"] = round(c["ms"] / c["total"]) if c["total"] else 0

    s = _ahora_sistema()
    tamano_db = sum(
        os.path.getsize(os.path.join(_DATA_DIR, n)) for n in os.listdir(_DATA_DIR)
        if n.endswith((".db", ".db-wal", ".db-shm"))
    )
    try:
        arranque_equipo = psutil.boot_time()
    except Exception:
        arranque_equipo = None

    return {
        "rango": rango,
        "paso": paso,
        "generado": ahora,
        "resumen": _resumen(filas),
        "anterior": _resumen(previas),
        "historico": {"visitas": n_total, "desde": primera},
        "serie": serie,
        "hoyAyer": {"hoy": hoy, "ayer": ayer, "horaActual": datetime.now().hour},
        "minutos": minutos,
        "calor": calor,
        "vivo": {
            "ahora": len(por_visitante),
            "paginas": _top(Counter(f["ruta"] for f in por_visitante.values()), len(por_visitante), 6),
        },
        "top": {
            "paginas": _top(paginas, total, 12, extra_pag),
            "entradas": _top(entradas, n_ses, 8),
            "salidas": _top(salidas, n_ses, 8),
            "fuentes": _top(fuentes, n_ses, 6),
            "referentes": _top(referentes, n_ses, 10),
            "paises": _top(contar_por("pais"), total, 12),
            "dispositivos": _top(contar_por("dispositivo"), total, 4),
            "navegadores": _top(contar_por("navegador"), total, 8),
            "sistemas": _top(contar_por("so"), total, 8),
            "idiomas": _top(contar_por("idioma"), total, 8),
            "pantallas": _top(contar_por("pantalla"), total, 8),
            "temas": _top(contar_por("tema"), total, 3),
        },
        "recientes": [
            {"ts": f["ts"], "ruta": f["ruta"], "titulo": f["titulo"], "pais": f["pais"], "dispositivo": f["dispositivo"],
             "navegador": f["navegador"], "so": f["so"], "fuente": f["fuente"], "referente": f["referente"],
             "duracion": f["duracion"], "nuevo": bool(f["nuevo"]), "admin": bool(f["admin"])}
            for f in recientes[:25]
        ],
        "consumo": {
            "peticiones": tot,
            "msMedio": round(tot["ms"] / tot["total"]) if tot["total"] else 0,
            "serie": pet_cubos,
            "sistema": [
                {"ts": x["ts"], "cpu": x["cpu"], "ram": x["ram"], "ramApi": x["ram_api"], "redIn": x["red_in"], "redOut": x["red_out"]}
                for x in sistema
            ],
            "ahora": {
                "cpu": s["cpu"], "nucleos": s["nucleos"], "ram": s["ram"], "ramUsada": s["ramUsada"],
                "ramTotal": s["ramTotal"], "ramApi": s["ramApi"], "disco": s["disco"], "discoUsado": s["discoUsado"],
                "discoTotal": s["discoTotal"], "baseDatos": tamano_db,
                "activaDesde": int(ARRANQUE), "equipoDesde": int(arranque_equipo) if arranque_equipo else None,
            },
        },
    }


# ---------------------------------------------------------------------------
# Rutas
# ---------------------------------------------------------------------------
class NuevaVisita(BaseModel):
    ruta: str
    titulo: str | None = None
    referente: str | None = None
    utm: str | None = None
    idioma: str | None = None
    pantalla: str | None = None
    tema: str | None = None
    carga: int | None = None


class FinVisita(BaseModel):
    id: int
    clave: str
    duracion: int
    scroll: int | None = None


def _sesion_de(db, visitante: str, ahora: int) -> tuple[str, bool]:
    """(sesión, es nuevo hoy): sigue la última sesión del visitante si no pasó media hora."""
    ultima = db.execute(
        "SELECT sesion, ts FROM visitas WHERE visitante = ? ORDER BY ts DESC LIMIT 1", (visitante,)
    ).fetchone()
    if ultima and ahora - ultima["ts"] < PAUSA_SESION:
        return ultima["sesion"], False
    return secrets.token_hex(8), ultima is None


def crear_router(solo_admin, es_admin_id) -> APIRouter:
    r = APIRouter()

    @r.post("/api/estadisticas/visita")
    def visita(d: NuevaVisita, request: Request):
        ua = request.headers.get("user-agent") or ""
        if not ua or _BOT_RE.search(ua) or request.headers.get("sec-gpc") == "1":
            return {"ok": True}
        ip = seguridad.ip_cliente(request)
        if seguridad.demasiadas(f"visita:{ip}", 40, 60):
            return {"ok": True}
        ruta = (d.ruta or "/").split("?")[0].split("#")[0][:160]
        if not _RUTA_RE.match(ruta):
            raise HTTPException(400, "Datos no válidos")
        if len(ruta) > 1:
            ruta = ruta.rstrip("/")
        referente, fuente = clasificar_referente(d.referente, d.utm)
        dispositivo, navegador, so = leer_agente(ua)
        pais = (request.headers.get("x-pais") or "").upper()
        pais = pais if re.fullmatch(r"[A-Z]{2}", pais) and pais not in ("XX", "T1") else None
        idioma = (d.idioma or "").split("-")[0].lower()
        idioma = idioma if re.fullmatch(r"[a-z]{2,3}", idioma) else None
        pantalla = d.pantalla if d.pantalla and re.fullmatch(r"\d{3,5}x\d{3,5}", d.pantalla) else None
        tema = d.tema if d.tema in ("claro", "oscuro") else None
        carga = d.carga if d.carga and 0 < d.carga < 60000 else None
        usuario = seguridad.verificar_sesion(request.cookies.get(seguridad.COOKIE_SESION))
        clave = secrets.token_urlsafe(12)
        visitante = huella(ip, ua)
        ahora = int(time.time())
        with conexion() as db:
            sesion, nuevo = _sesion_de(db, visitante, ahora)
            cur = db.execute(
                """INSERT INTO visitas (clave, ts, ruta, titulo, referente, fuente, pais, dispositivo, navegador, so,
                   idioma, pantalla, tema, visitante, sesion, nuevo, admin, carga)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                (clave, ahora, ruta, _texto(d.titulo, 120), referente, fuente, pais, dispositivo,
                 navegador, so, idioma, pantalla, tema, visitante, sesion, int(nuevo),
                 int(bool(usuario and es_admin_id(usuario))), carga),
            )
        return {"id": cur.lastrowid, "clave": clave}

    @r.post("/api/estadisticas/fin")
    def fin(d: FinVisita):
        duracion = max(0, min(d.duracion, 3 * 3600))
        scroll = max(0, min(d.scroll, 100)) if d.scroll is not None else None
        with conexion() as db:
            db.execute(
                "UPDATE visitas SET duracion = MAX(COALESCE(duracion, 0), ?), scroll = MAX(COALESCE(scroll, 0), ?) "
                "WHERE id = ? AND clave = ? AND ts > ?",
                (duracion, scroll or 0, d.id, d.clave, int(time.time()) - 4 * 3600),
            )
        return {"ok": True}

    @r.get("/api/panel/estadisticas", dependencies=[Depends(solo_admin)])
    def panel(rango: str = "24h", yo: int = 0):
        if rango not in RANGOS:
            raise HTTPException(400, "Rango no válido")
        return calcular(rango, bool(yo))

    @r.get("/api/panel/estadisticas/vivo", dependencies=[Depends(solo_admin)])
    def vivo(yo: int = 0):
        ahora = int(time.time())
        with conexion() as db:
            filas = db.execute(
                "SELECT ruta, visitante, ts FROM visitas WHERE ts >= ?" + ("" if yo else " AND admin = 0") + " ORDER BY ts DESC",
                (ahora - VENTANA_VIVO,),
            ).fetchall()
        por_visitante = {}
        for f in filas:
            por_visitante.setdefault(f["visitante"], f)
        return {
            "ahora": len(por_visitante),
            "paginas": _top(Counter(f["ruta"] for f in por_visitante.values()), len(por_visitante), 6),
            "cpu": psutil.cpu_percent(interval=None),
            "ram": psutil.virtual_memory().percent,
        }

    @r.delete("/api/panel/estadisticas", dependencies=[Depends(solo_admin)])
    def vaciar_mias():
        """Borra tus propias visitas (las marcadas como administrador)."""
        with conexion() as db:
            n = db.execute("DELETE FROM visitas WHERE admin = 1").rowcount
        return {"borradas": n}

    return r
