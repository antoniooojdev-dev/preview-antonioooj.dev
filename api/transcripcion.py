"""
transcripcion.py · Transcripción de un ticket del chat como página HTML.

Al cerrar un ticket (main.py) se genera una página autocontenida con el estilo de la web
(cabecera con el logo, datos del ticket y la conversación con avatares) y se guarda en
data/transcripciones/<clave>.html. Se sirve en /api/transcripcion/<clave>: la clave es
aleatoria y larga, así que solo la puede abrir quien tenga el enlace (el cliente por MD,
tú en el panel). Todo el texto va escapado.
"""
import html
import re
import secrets
import time
from pathlib import Path

CARPETA = Path(__file__).parent / "data" / "transcripciones"
CLAVE_RE = re.compile(r"^[A-Za-z0-9_-]{24,64}$")


def nueva_clave() -> str:
    return secrets.token_urlsafe(24)


def ruta(clave: str) -> Path | None:
    if not CLAVE_RE.match(clave or ""):
        return None
    p = CARPETA / f"{clave}.html"
    return p if p.is_file() else None


def guardar(clave: str, contenido: str) -> None:
    CARPETA.mkdir(parents=True, exist_ok=True)
    (CARPETA / f"{clave}.html").write_text(contenido, encoding="utf-8")


def _fecha(ts: int) -> str:
    return time.strftime("%d/%m/%Y · %H:%M", time.localtime(ts))


def _duracion(seg: int) -> str:
    m = max(1, round(seg / 60))
    if m < 60:
        return f"{m} min"
    h = m // 60
    if h < 24:
        return f"{h} h {m % 60} min"
    return f"{h // 24} d {h % 24} h"


def _avatar(src: str | None, nombre: str, clase: str = "") -> str:
    if src:
        return f'<img class="ava {clase}" src="{html.escape(src)}" alt="" referrerpolicy="no-referrer">'
    inicial = html.escape((nombre.strip()[:1] or "?").upper())
    return f'<span class="ava ava--txt {clase}">{inicial}</span>'


def generar(*, ticket: str, cliente: dict, admin: dict, abierto: int, cerrado: int, cerrado_por: str,
            mensajes: list, logo: str = "/logo.png") -> str:
    """cliente/admin: {nombre, usuario, id, avatar}. mensajes: filas de la tabla mensajes."""
    e = html.escape
    autores = {
        "cliente": (cliente["nombre"], cliente.get("avatar"), "cliente"),
        "admin": (admin["nombre"], admin.get("avatar"), "admin"),
    }
    n_mensajes = sum(1 for m in mensajes if m["emisor"] != "sistema")

    filas = []
    dia_anterior = ""
    for m in mensajes:
        dia = time.strftime("%d/%m/%Y", time.localtime(m["creado"]))
        if dia != dia_anterior:
            dia_anterior = dia
            filas.append(f'<div class="day"><span>{e(dia)}</span></div>')
        hora = time.strftime("%H:%M", time.localtime(m["creado"]))
        if m["emisor"] == "sistema":
            filas.append(f'<div class="sys"><span class="sys__txt">{e(m["texto"])}</span><time>{e(hora)}</time></div>')
            continue
        nombre, avatar, rol = autores[m["emisor"]]
        etiqueta = '<span class="tag">STAFF</span>' if rol == "admin" else ""
        filas.append(
            f'<article class="msg msg--{rol}">{_avatar(avatar, nombre)}'
            f'<div class="msg__body"><header><strong>{e(nombre)}</strong>{etiqueta}<time>{e(hora)}</time></header>'
            f'<p>{e(m["texto"])}</p></div></article>'
        )

    datos = [
        ("Ticket", ticket),
        ("Cliente", f'{cliente["nombre"]} (@{cliente["usuario"]})'),
        ("ID de Discord", cliente["id"]),
        ("Fecha de apertura", _fecha(abierto)),
        ("Fecha de cierre", _fecha(cerrado)),
        ("Duración", _duracion(cerrado - abierto)),
        ("Cerrado por", cerrado_por),
        ("Mensajes", str(n_mensajes)),
    ]
    lista_datos = "".join(f"<li><span>{e(k)}</span><strong>{e(v)}</strong></li>" for k, v in datos)

    return f"""<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Transcripción {e(ticket)} · AntonioooJ.dev</title>
<style>
  :root {{
    --bg: #0b0b0f; --card: #13141a; --card2: #191a22; --line: #26283280; --fg: #eceef3; --muted: #9aa0ad;
    --subtle: #6b7180; --brand: #5865f2; --ok: #23a55a;
  }}
  * {{ box-sizing: border-box; margin: 0; }}
  html {{ scrollbar-color: #33364a transparent; scrollbar-width: thin; }}
  body {{
    min-height: 100vh; padding: clamp(16px, 4vw, 48px) 16px; color: var(--fg);
    font: 15px/1.55 Inter, "Segoe UI", system-ui, sans-serif;
    background:
      radial-gradient(60% 40% at 15% 0%, #5865f233, transparent 70%),
      radial-gradient(40% 30% at 90% 5%, #eb459e1f, transparent 70%),
      var(--bg);
  }}
  .wrap {{ max-width: 860px; margin: 0 auto; display: grid; gap: 20px; }}
  .head {{
    display: flex; align-items: center; gap: 16px; padding: 22px 24px; border-radius: 20px;
    background: linear-gradient(135deg, #5865f2, #4752c4 60%, #3c45a5); box-shadow: 0 30px 80px -40px #5865f2;
  }}
  .head img {{ width: 64px; height: 64px; border-radius: 16px; background: #fff; box-shadow: 0 8px 24px #0005; }}
  .head h1 {{ font-size: clamp(20px, 3vw, 28px); letter-spacing: -.02em; line-height: 1.15; }}
  .head p {{ opacity: .85; font-size: 14px; }}
  .badge {{
    margin-left: auto; padding: 6px 12px; border-radius: 999px; background: #0003; font-size: 12px;
    font-weight: 600; white-space: nowrap;
  }}
  .info {{
    display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 10px; padding: 0; list-style: none;
  }}
  .info li {{
    display: grid; gap: 2px; padding: 14px 16px; border-radius: 14px; background: var(--card);
    border: 1px solid var(--line);
  }}
  .info span {{ font-size: 12px; color: var(--subtle); text-transform: uppercase; letter-spacing: .04em; }}
  .info strong {{ font-size: 15px; overflow-wrap: anywhere; }}
  .chat {{ padding: 20px; border-radius: 20px; background: var(--card); border: 1px solid var(--line); display: grid; gap: 6px; }}
  .chat h2 {{ font-size: 13px; color: var(--subtle); text-transform: uppercase; letter-spacing: .06em; margin-bottom: 6px; }}
  .day {{ display: flex; justify-content: center; margin: 10px 0; }}
  .day span {{ padding: 3px 12px; border-radius: 999px; background: var(--card2); color: var(--muted); font-size: 12px; }}
  .msg {{ display: grid; grid-template-columns: 42px 1fr; gap: 12px; padding: 8px 10px; border-radius: 12px; }}
  .msg:hover {{ background: var(--card2); }}
  .ava {{ width: 42px; height: 42px; border-radius: 50%; object-fit: cover; background: #2b2d31; }}
  .ava--txt {{ display: grid; place-items: center; font-weight: 700; color: #fff; background: #f0b232; }}
  .msg--admin .ava--txt {{ background: var(--brand); }}
  .msg header {{ display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; }}
  .msg header strong {{ font-size: 15px; }}
  .msg--admin header strong {{ color: #a5acff; }}
  .tag {{ padding: 0 6px; border-radius: 4px; background: var(--brand); color: #fff; font-size: 10px; font-weight: 700; line-height: 16px; }}
  time {{ color: var(--subtle); font-size: 12px; }}
  .msg p {{ white-space: pre-wrap; overflow-wrap: anywhere; color: #dcdee4; }}
  .sys {{
    display: flex; justify-content: center; align-items: center; gap: 10px; flex-wrap: wrap; margin: 6px 0;
    padding: 8px 14px; border-radius: 12px; border: 1px dashed #3a3d4d; color: var(--muted); font-size: 13px; text-align: center;
  }}
  .sys__txt {{ white-space: pre-wrap; }}
  .foot {{ text-align: center; color: var(--subtle); font-size: 12px; }}
  .foot a {{ color: #a5acff; }}
  @media (max-width: 560px) {{ .head {{ flex-wrap: wrap; }} .badge {{ margin-left: 0; }} }}
</style>
</head>
<body>
<main class="wrap">
  <header class="head">
    <img src="{e(logo)}" alt="AntonioooJ.dev">
    <div>
      <h1>Transcripción del ticket {e(ticket)}</h1>
      <p>{e(cliente["nombre"])} · soporte de AntonioooJ.dev</p>
    </div>
    <span class="badge">🔒 Cerrado</span>
  </header>
  <ul class="info">{lista_datos}</ul>
  <section class="chat">
    <h2>Conversación</h2>
    {''.join(filas) or '<p class="sys">Sin mensajes</p>'}
  </section>
  <p class="foot">Generado el {e(_fecha(cerrado))} · <a href="https://antonioooj.dev">antonioooj.dev</a></p>
</main>
</body>
</html>
"""


def logo_png() -> bytes | None:
    """Logo de la web (public/logo.png del portfolio) para la miniatura del embed."""
    p = Path(__file__).resolve().parent.parent / "public" / "logo.png"
    try:
        return p.read_bytes()
    except OSError:
        return None
