// Tarjetas de proyectos: las comparten el chat (avisos del sistema y /estado-proyecto),
// /cuenta y la vista previa del editor de /admin, para que se vean igual en todas partes.
// Las animaciones arrancan cuando la tarjeta entra en pantalla (y no hay si el usuario
// tiene activado «reducir movimiento").

import "@/styles/proyectos.css";
import { localeActual } from "@/scripts/i18n";
// Idioma: los textos se escriben en español y los traduce i18n.ts (con patrones para los que
// llevan números); las fechas salen ya en el idioma elegido. Quien pinta las tarjetas las
// vuelve a pintar al cambiar de idioma. Nombres, notas y novedades van con data-no-i18n.

// Iconos de Font Awesome (copia local en public/fa): se carga una sola vez, la use quien la use
if (typeof document !== "undefined" && !document.querySelector("link[data-fa]")) {
  for (const css of ["fontawesome.min.css", "solid.min.css"]) {
    const l = document.createElement("link");
    l.rel = "stylesheet";
    l.href = `/fa/css/${css}`;
    l.dataset.fa = "";
    document.head.append(l);
  }
}

export interface ProyectoPublico {
  id: number;
  nombre: string;
  descripcion: string;
  estado: string;
  emoji: string;
  estadoTexto: string;
  progreso: number;
  entrega: string | null;
  actualizado: number;
  ultimaNovedad: { texto: string; creado: number } | null;
}

export interface Cambio {
  campo: "nombre" | "estado" | "progreso" | "entrega" | "descripcion";
  antes: string | number | null;
  despues: string | number | null;
}

export interface ResumenEstado {
  total: number;
  enMarcha: number;
  entregados: number;
  pausados: number;
  progresoMedio: number;
  proximaEntrega: { nombre: string; fecha: string } | null;
}

export interface UsuarioTicket {
  id: string;
  usuario: string;
  nombre: string;
  avatar: string | null;
}

export type DatosAviso =
  | { tipo: "estado"; proyectos: ProyectoPublico[]; resumen?: ResumenEstado }
  | { tipo: "actualizacion"; proyecto: ProyectoPublico; cambios: Cambio[]; nota: string | null }
  | { tipo: "nuevo" | "vinculado"; proyecto: ProyectoPublico; nota: string | null }
  // Tickets del chat (api/main.py): apertura, cierre y aviso de la transcripción por MD
  | { tipo: "apertura"; ticket: string; usuario: UsuarioTicket; abierto: number }
  | {
      tipo: "cierre";
      ticket: string;
      por: "cliente" | "admin";
      porNombre: string;
      abierto: number;
      cerrado: number;
      mensajes: number;
      /** guardada: desde 2026-10-26 ya no hay transcripción; la conversación queda en el ticket */
      transcripcion: "enviando" | "sin_bot" | "guardada";
      /** Página HTML de la transcripción (/api/transcripcion/<clave>) */
      url?: string;
    }
  | { tipo: "md"; ok: boolean; ticket: string };

// Mismo orden y textos que ESTADOS en api/proyectos.py. emoji: el del texto plano de la API;
// icono: el de Font Awesome que se pinta en las tarjetas.
export const ESTADOS: Record<string, { emoji: string; icono: string; nombre: string }> = {
  pendiente: { emoji: "⏳", icono: "hourglass-half", nombre: "Pendiente de empezar" },
  diseno: { emoji: "🎨", icono: "palette", nombre: "En diseño" },
  desarrollo: { emoji: "🛠️", icono: "code", nombre: "En desarrollo" },
  pruebas: { emoji: "🧪", icono: "flask", nombre: "En pruebas" },
  revision: { emoji: "👀", icono: "eye", nombre: "Esperando tu revisión" },
  entregado: { emoji: "✅", icono: "circle-check", nombre: "Entregado" },
  pausado: { emoji: "⏸️", icono: "circle-pause", nombre: "En pausa" },
};

/** Icono de Font Awesome (estilo sólido). */
function fa(nombre: string, extra = ""): HTMLElement {
  const i = document.createElement("i");
  i.className = `fa-solid fa-${nombre} ${extra}`.trim();
  i.setAttribute("aria-hidden", "true");
  return i;
}

// Los avisos de la API llevan emojis en su texto plano (así se ven bien en Discord); en la web
// el emoji del principio se cambia por su icono de Font Awesome y los demás se quitan.
const ICONO_EMOJI: Record<string, string> = {
  "🎫": "ticket",
  "🔒": "lock",
  "📨": "paper-plane",
  "📄": "file-lines",
  "⚠": "triangle-exclamation",
  "📋": "clipboard-list",
  "✅": "circle-check",
  "🛠": "screwdriver-wrench",
};
const EMOJI = /[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu;

/** Texto de un aviso sin emojis, con el icono que corresponde al emoji con el que empezaba. */
export function sinEmojis(texto: string): { icono: HTMLElement | null; texto: string } {
  const primero = texto.trimStart().match(/^\p{Extended_Pictographic}/u)?.[0];
  const nombre = primero ? ICONO_EMOJI[primero] ?? "circle-info" : null;
  return {
    icono: nombre ? fa(nombre) : null,
    texto: texto.replace(EMOJI, "").replace(/\s{2,}/g, " ").trim(),
  };
}

/** Fases que se ven en la línea de pasos (la pausa no es una fase: se marca aparte). */
const FASES: [string, string][] = [
  ["pendiente", "Inicio"],
  ["diseno", "Diseño"],
  ["desarrollo", "Desarrollo"],
  ["pruebas", "Pruebas"],
  ["revision", "Revisión"],
  ["entregado", "Entrega"],
];

const reducir = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// ── utilidades ────────────────────────────────

type Hijo = Node | string | null | undefined | false;

function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  clase = "",
  ...hijos: Hijo[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (clase) el.className = clase;
  for (const c of hijos) if (c) el.append(c);
  return el;
}

/** Texto escrito a mano (nombres, notas, novedades): no se traduce. */
function crudo<T extends HTMLElement>(el: T): T {
  el.dataset.noI18n = "";
  return el;
}

// fechas en el idioma elegido
const formatos = new Map<string, Intl.DateTimeFormat>();
function formato(o: Intl.DateTimeFormatOptions) {
  const clave = localeActual() + JSON.stringify(o);
  if (!formatos.has(clave)) formatos.set(clave, new Intl.DateTimeFormat(localeActual(), o));
  return formatos.get(clave)!;
}
const rtf = { format: (n: number, u: Intl.RelativeTimeFormatUnit) => new Intl.RelativeTimeFormat(localeActual(), { numeric: "auto" }).format(n, u) };
const fechaLarga = { format: (d: Date) => formato({ day: "numeric", month: "short", year: "numeric" }).format(d) };

function dias(iso: string): number {
  const fin = new Date(`${iso}T12:00:00`);
  const hoy = new Date();
  hoy.setHours(12, 0, 0, 0);
  return Math.round((fin.getTime() - hoy.getTime()) / 86_400_000);
}

export function fechaEntrega(iso: string): string {
  return fechaLarga.format(new Date(`${iso}T12:00:00`));
}

export function haceCuanto(segundos: number): string {
  const diff = segundos - Date.now() / 1000;
  const abs = Math.abs(diff);
  if (abs < 60) return "ahora mismo";
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
  return rtf.format(Math.round(diff / 86400), "day");
}

function chipEstado(estado: string, extra = ""): HTMLElement {
  const info = ESTADOS[estado] ?? { emoji: "•", icono: "circle", nombre: estado };
  const chip = h("span", `pj-chip ${extra}`.trim(), h("span", "pj-chip__emoji", fa(info.icono)), info.nombre);
  chip.dataset.estado = estado;
  return chip;
}

/** Número que cuenta de 0 al valor cuando la tarjeta se ve. */
function contador(valor: number, sufijo = "%"): HTMLElement {
  const el = h("span", "pj-count", `${valor}${sufijo}`);
  el.dataset.valor = String(valor);
  el.dataset.sufijo = sufijo;
  return el;
}

function barra(progreso: number, desde?: number): HTMLElement {
  const b = h("span", "pj-bar");
  b.setAttribute("role", "progressbar");
  b.setAttribute("aria-valuemin", "0");
  b.setAttribute("aria-valuemax", "100");
  b.setAttribute("aria-valuenow", String(progreso));
  b.style.setProperty("--p", String(progreso / 100));
  if (desde !== undefined) {
    b.style.setProperty("--desde", String(desde / 100));
    b.append(h("span", "pj-bar__ghost"));
  }
  b.append(h("span", "pj-bar__fill"));
  return b;
}

function pasos(estado: string): HTMLElement {
  const pausado = estado === "pausado";
  const actual = FASES.findIndex(([id]) => id === estado);
  const ol = h("ol", "pj-steps" + (pausado ? " is-paused" : ""));
  ol.setAttribute("role", "list");
  ol.setAttribute("aria-label", "Fases del proyecto");
  FASES.forEach(([id, nombre], i) => {
    const li = h("li", "pj-step", h("span", "pj-step__dot"), h("span", "pj-step__label", nombre));
    li.style.setProperty("--i", String(i));
    if (actual >= 0) {
      if (i < actual || (estado === "entregado" && i === actual)) li.classList.add("is-done");
      if (i === actual) {
        li.classList.add("is-current");
        li.setAttribute("aria-current", "step");
      }
    }
    li.dataset.fase = id; // no data-estado: toda la línea usa el color del estado actual
    ol.append(li);
  });
  return ol;
}

// ── bloques ───────────────────────────────────

/** Bloque de un proyecto: nombre, estado, progreso, fases, entrega y última novedad. */
export function bloqueProyecto(
  p: ProyectoPublico,
  opciones: { i?: number; novedad?: boolean } = {},
): HTMLElement {
  const { i = 0, novedad = true } = opciones;
  const sec = h("section", "pj-proj");
  sec.dataset.estado = p.estado;
  sec.style.setProperty("--i", String(i));

  const info = ESTADOS[p.estado];
  sec.append(
    h(
      "div",
      "pj-proj__top",
      h("span", "pj-proj__ico", fa(info?.icono ?? "folder")),
      crudo(h("h4", "pj-proj__name", p.nombre)),
      chipEstado(p.estado),
    ),
  );

  sec.append(
    h(
      "div",
      "pj-progress",
      h("div", "pj-progress__num", contador(p.progreso), h("span", "pj-progress__lbl", "completado")),
      barra(p.progreso),
    ),
  );

  sec.append(pasos(p.estado));

  const meta = h("div", "pj-proj__meta");
  if (p.entrega) {
    const d = dias(p.entrega);
    const cuando =
      p.estado === "entregado" ? "" : d > 1 ? ` · en ${d} días` : d === 1 ? " · mañana" : d === 0 ? " · hoy" : " · fecha pasada";
    meta.append(
      h(
        "span",
        "pj-meta" + (d < 0 && p.estado !== "entregado" ? " is-late" : ""),
        fa(p.estado === "entregado" ? "flag-checkered" : "calendar-day"),
        `Entrega ${fechaEntrega(p.entrega)}${cuando}`,
      ),
    );
  }
  meta.append(h("span", "pj-meta", fa("clock-rotate-left"), `Actualizado ${haceCuanto(p.actualizado)}`));
  sec.append(meta);

  if (novedad && p.ultimaNovedad) {
    sec.append(
      h(
        "p",
        "pj-last",
        h("span", "pj-last__lbl mono", fa("bolt"), "última novedad"),
        crudo(h("span", "pj-last__txt", p.ultimaNovedad.texto)),
      ),
    );
  }
  return sec;
}

const CAMPOS: Record<Cambio["campo"], string> = {
  nombre: "Nombre",
  estado: "Estado",
  progreso: "Progreso",
  entrega: "Entrega",
  descripcion: "Descripción",
};

function filaCambio(c: Cambio, i: number): HTMLElement {
  const fila = h("li", "pj-change");
  fila.style.setProperty("--i", String(i));
  const etiqueta = h("span", "pj-change__lbl mono", CAMPOS[c.campo]);

  let antes: Node;
  let despues: Node;
  if (c.campo === "estado") {
    antes = chipEstado(String(c.antes), "is-old");
    despues = chipEstado(String(c.despues));
  } else if (c.campo === "progreso") {
    antes = h("span", "pj-val is-old", `${c.antes}%`);
    despues = h("span", "pj-val", contador(Number(c.despues)));
  } else if (c.campo === "entrega") {
    antes = h("span", "pj-val is-old", c.antes ? fechaEntrega(String(c.antes)) : "sin fecha");
    despues = h("span", "pj-val", c.despues ? fechaEntrega(String(c.despues)) : "sin fecha");
  } else if (c.campo === "descripcion") {
    fila.append(etiqueta, h("span", "pj-val", "actualizada"));
    return fila;
  } else {
    antes = crudo(h("span", "pj-val is-old", String(c.antes ?? "")));
    despues = crudo(h("span", "pj-val", String(c.despues ?? "")));
  }
  fila.append(etiqueta, h("span", "pj-change__vals", antes, h("span", "pj-arrow", fa("arrow-right")), despues));
  if (c.campo === "progreso") fila.append(barra(Number(c.despues), Number(c.antes)));
  return fila;
}

function nota(texto: string | null): HTMLElement | null {
  return texto
    ? h("blockquote", "pj-note", h("span", "pj-note__lbl mono", fa("quote-left"), "nota de Antonio"), crudo(h("p", "", texto)))
    : null;
}

// ── tickets ───────────────────────────────────

const fechaCompleta = { format: (d: Date) => formato({ weekday: "short", day: "numeric", month: "short", year: "numeric" }).format(d) };
const horaMin = { format: (d: Date) => formato({ hour: "2-digit", minute: "2-digit" }).format(d) };

function duracion(seg: number): string {
  const m = Math.max(1, Math.round(seg / 60));
  if (m < 60) return `${m} min`;
  const hh = Math.floor(m / 60);
  if (hh < 24) return `${hh} h ${m % 60} min`;
  const d = Math.floor(hh / 24);
  return `${d} día${d === 1 ? "" : "s"} ${hh % 24} h`;
}

function avatarTicket(u: UsuarioTicket): HTMLElement {
  const caja = h("span", "pj-tk__avatar");
  if (u.avatar) {
    const img = h("img");
    img.src = u.avatar;
    img.alt = "";
    img.referrerPolicy = "no-referrer";
    caja.append(img);
  } else caja.textContent = (u.nombre.trim()[0] ?? "?").toUpperCase();
  return caja;
}

// Logos de las cuentas con las que se entra (Font Awesome local solo trae los sólidos, sin marcas)
const LOGOS: Record<string, { nombre: string; svg: string }> = {
  discord: {
    nombre: "Discord",
    svg: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.32 4.37a19.8 19.8 0 0 0-4.89-1.52.07.07 0 0 0-.08.04c-.21.38-.44.87-.61 1.25a18.27 18.27 0 0 0-5.49 0 12.6 12.6 0 0 0-.62-1.25.08.08 0 0 0-.08-.04 19.74 19.74 0 0 0-4.89 1.52.07.07 0 0 0-.03.03C.53 9.05-.32 13.58.1 18.06a.08.08 0 0 0 .03.06 19.9 19.9 0 0 0 5.99 3.03.08.08 0 0 0 .08-.03c.46-.63.87-1.3 1.23-1.99a.08.08 0 0 0-.04-.11 13.1 13.1 0 0 1-1.87-.89.08.08 0 0 1-.01-.13l.37-.29a.07.07 0 0 1 .08-.01c3.93 1.79 8.18 1.79 12.06 0a.07.07 0 0 1 .08.01l.37.29a.08.08 0 0 1-.01.13c-.6.35-1.22.65-1.87.89a.08.08 0 0 0-.04.11c.36.7.77 1.36 1.22 1.99a.08.08 0 0 0 .08.03 19.84 19.84 0 0 0 6-3.03.08.08 0 0 0 .03-.05c.5-5.18-.84-9.67-3.55-13.66a.06.06 0 0 0-.03-.03ZM8.02 15.33c-1.18 0-2.16-1.08-2.16-2.42 0-1.33.96-2.42 2.16-2.42 1.21 0 2.18 1.1 2.16 2.42 0 1.34-.96 2.42-2.16 2.42Zm7.97 0c-1.18 0-2.15-1.08-2.15-2.42 0-1.33.95-2.42 2.15-2.42 1.21 0 2.18 1.1 2.16 2.42 0 1.34-.95 2.42-2.16 2.42Z"/></svg>',
  },
  google: {
    nombre: "Google",
    svg: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M21.35 11.1H12v2.98h5.35c-.23 1.4-1.66 4.1-5.35 4.1-3.22 0-5.85-2.67-5.85-5.96S8.78 6.26 12 6.26c1.83 0 3.06.78 3.76 1.45l2.57-2.47C16.68 3.7 14.55 2.75 12 2.75 6.89 2.75 2.75 6.89 2.75 12S6.89 21.25 12 21.25c5.34 0 8.88-3.75 8.88-9.04 0-.6-.07-1.06-.15-1.51Z"/></svg>',
  },
  github: {
    nombre: "GitHub",
    svg: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.53-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.8 1.19 1.83 1.19 3.09 0 4.42-2.7 5.39-5.26 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z"/></svg>',
  },
};

/** google-<id> / github-<id>: clientes que no entraron con Discord */
const proveedorDe = (id: string) => (id.startsWith("google-") ? "google" : id.startsWith("github-") ? "github" : "discord");

/** Botón de copiar con icono: pasa a ✓ un momento al copiar. */
function botonCopiar(texto: string, etiqueta: string): HTMLButtonElement {
  const b = h("button", "pj-tk__copy", fa("copy"));
  b.type = "button";
  b.title = etiqueta;
  b.setAttribute("aria-label", etiqueta);
  b.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(texto);
      b.replaceChildren(fa("check"));
      b.classList.add("is-ok");
      setTimeout(() => {
        b.replaceChildren(fa("copy"));
        b.classList.remove("is-ok");
      }, 1400);
    } catch {}
  });
  return b;
}

/** Dato con icono: etiqueta pequeña arriba, valor debajo. */
function chipDato(icono: string, k: string, v: Node | string, extra?: Node): HTMLElement {
  return h("div", "pj-tk__chip", h("span", "pj-tk__chipico", fa(icono)), h("span", "pj-tk__chiptxt", h("span", "mono", k), h("strong", "", v)), extra);
}

/** Tarjeta de apertura de ticket, con forma de entrada: cliente a la izquierda y el número troquelado a la derecha. */
function tarjetaApertura(d: Extract<DatosAviso, { tipo: "apertura" }>): HTMLElement {
  const fecha = new Date(d.abierto * 1000);
  const prov = proveedorDe(d.usuario.id);
  const logo = h("span", "pj-tk__prov");
  logo.innerHTML = LOGOS[prov].svg;
  logo.title = `Entró con ${LOGOS[prov].nombre}`;

  const card = h("article", "pj-card pj-tk is-open");
  card.dataset.tipo = "apertura";
  card.dataset.prov = prov;
  card.append(
    h(
      "header",
      "pj-card__head",
      h("span", "pj-card__icon", fa("ticket")),
      h("div", "pj-card__titles", h("span", "pj-card__kicker mono", "nuevo ticket"), h("strong", "pj-card__title", "Conversación abierta")),
      h("span", "pj-tk__live mono", h("i"), "en curso"),
    ),
  );

  const avatar = h("span", "pj-tk__avatarwrap", avatarTicket(d.usuario), logo);
  const entrada = h(
    "div",
    "pj-tk__stub",
    h(
      "div",
      "pj-tk__stub-main",
      avatar,
      crudo(h("div", "pj-tk__who", h("strong", "", d.usuario.nombre), h("span", "mono", `@${d.usuario.usuario}`))),
    ),
    h(
      "div",
      "pj-tk__stub-num",
      h("span", "mono", "ticket"),
      h("strong", "", d.ticket),
      h(
        "span",
        "pj-tk__barcode",
        ...Array.from({ length: 18 }, (_, b) => {
          const barra = h("i");
          barra.style.setProperty("--b", String(b)); // cada barra crece un poco después
          return barra;
        }),
      ),
    ),
  );

  const datos = h(
    "div",
    "pj-tk__chips",
    chipDato("calendar-day", "abierto el", fechaCompleta.format(fecha)),
    chipDato("clock", "a las", horaMin.format(fecha)),
    chipDato("fingerprint", `id de ${LOGOS[prov].nombre}`, h("code", "", d.usuario.id), botonCopiar(d.usuario.id, "Copiar ID")),
  );

  card.append(
    h("div", "pj-card__body", entrada, datos),
    h("footer", "pj-card__foot pj-tk__foot", fa("reply"), "Todo lo que escribáis aquí queda guardado en este ticket."),
  );
  return card;
}

function tarjetaCierre(d: Extract<DatosAviso, { tipo: "cierre" }>): HTMLElement {
  const card = h("article", "pj-card pj-tk is-closed");
  card.dataset.tipo = "cierre";
  card.append(
    h(
      "header",
      "pj-card__head",
      h("span", "pj-card__icon", fa("lock")),
      h("div", "pj-card__titles", h("span", "pj-card__kicker mono", "ticket cerrado"), h("strong", "pj-card__title", `Ticket ${d.ticket}`)),
      h("span", "pj-tk__live is-off mono", h("i"), "cerrado"),
    ),
  );
  const stats = h(
    "div",
    "pj-tk__stats",
    h("div", "", fa("hourglass-end"), h("strong", "", duracion(d.cerrado - d.abierto)), h("span", "", "duración")),
    h("div", "", fa("comments"), h("strong", "", String(d.mensajes)), h("span", "", "mensajes")),
    h("div", "", fa("user-check"), crudo(h("strong", "", d.por === "admin" ? "Antonio" : d.porNombre)), h("span", "", "cerrado por")),
  );
  // los tickets cerrados antes del 2026-10-26 aún dicen lo de la transcripción por MD
  const md =
    d.transcripcion === "guardada"
      ? h("p", "pj-tk__md", fa("box-archive"), "La conversación queda guardada en este ticket: puedes volver a leerla cuando quieras.")
      : d.transcripcion === "enviando"
        ? h("p", "pj-tk__md", fa("paper-plane"), "Enviando la transcripción por mensaje privado de Discord…")
        : h("p", "pj-tk__md is-off", fa("file-lines"), "Transcripción guardada (el bot de Discord no está configurado para enviarla por MD).");
  let ver: HTMLElement | null = null;
  if (d.url && d.url.startsWith("/api/transcripcion/")) {
    const a = h("a", "pj-tk__link", h("span", "", fa("file-lines"), "Ver transcripción"), fa("arrow-up-right-from-square"));
    a.href = d.url;
    a.target = "_blank";
    a.rel = "noopener";
    ver = a;
  }
  card.append(
    h("div", "pj-card__body", stats, ver, md),
    h("footer", "pj-card__foot pj-tk__foot", fa("pen"), "Escribe un mensaje para abrir un ticket nuevo."),
  );
  return card;
}

/** Aviso corto: la transcripción se ha enviado (o no) por MD. */
function avisoMd(d: Extract<DatosAviso, { tipo: "md" }>): HTMLElement {
  const p = h("p", `pj-mdnote${d.ok ? "" : " is-error"}`, fa(d.ok ? "paper-plane" : "triangle-exclamation"), h("span", "", d.ok
    ? `Transcripción del ticket ${d.ticket} enviada por mensaje privado de Discord`
    : `No se pudo enviar la transcripción del ticket ${d.ticket} por MD (¿tienes los mensajes privados cerrados?)`));
  return p;
}

/** Resumen de cabecera de /estado-proyecto: anillo de progreso medio y cifras. */
function resumenEstado(r: ResumenEstado): HTMLElement {
  const anillo = h("div", "pj-ring", h("span", "pj-ring__num", contador(r.progresoMedio)), h("span", "pj-ring__lbl mono", "medio"));
  anillo.style.setProperty("--pj-ring", String(r.progresoMedio / 100));
  const cifra = (icono: string, valor: number, texto: string, estado: string, i: number) => {
    const c = h("div", "pj-stat", h("span", "pj-stat__ico", fa(icono)), h("strong", "", contador(valor, "")), h("span", "", texto));
    c.dataset.estado = estado;
    c.style.setProperty("--i", String(i));
    return c;
  };
  const cifras = h(
    "div",
    "pj-sum__stats",
    cifra("gears", r.enMarcha, "en marcha", "desarrollo", 0),
    cifra("circle-check", r.entregados, "entregados", "entregado", 1),
    r.pausados ? cifra("circle-pause", r.pausados, "en pausa", "pausado", 2) : null,
  );
  const lado = h("div", "pj-sum__side", cifras);
  if (r.proximaEntrega) {
    const d = dias(r.proximaEntrega.fecha);
    const cuando = d > 1 ? `en ${d} días` : d === 1 ? "mañana" : d === 0 ? "hoy" : "fecha pasada";
    lado.append(
      h(
        "div",
        "pj-sum__next" + (d < 0 ? " is-late" : ""),
        h("span", "pj-sum__flag", fa("flag-checkered")),
        h(
          "span",
          "pj-sum__nexttxt",
          h("span", "mono", "próxima entrega"),
          crudo(h("strong", "", r.proximaEntrega.nombre)),
          h("span", "", fechaEntrega(r.proximaEntrega.fecha)),
        ),
        h("span", "pj-sum__cuando", cuando),
      ),
    );
  }
  return h("div", "pj-sum", anillo, lado);
}

/** Tarjeta completa de un aviso del sistema. */
export function tarjetaAviso(datos: DatosAviso, opciones: { animar?: boolean } = {}): HTMLElement {
  if (datos.tipo === "apertura" || datos.tipo === "cierre" || datos.tipo === "md") {
    const t = datos.tipo === "apertura" ? tarjetaApertura(datos) : datos.tipo === "cierre" ? tarjetaCierre(datos) : avisoMd(datos);
    if (opciones.animar === false) t.classList.add("is-visible", "is-static");
    else animarAlVer(t);
    return t;
  }
  const card = h("article", "pj-card");
  card.dataset.tipo = datos.tipo;
  // Color del estado del proyecto para toda la tarjeta (en /estado-proyecto lo pone cada bloque)
  if (datos.tipo !== "estado") card.dataset.estado = datos.proyecto.estado;

  const cabecera = (icono: string, kicker: string, titulo: string, extra?: Hijo) =>
    h(
      "header",
      "pj-card__head",
      h("span", "pj-card__icon", fa(icono)),
      h("div", "pj-card__titles", h("span", "pj-card__kicker mono", kicker), h("strong", "pj-card__title", titulo)),
      extra,
    );

  if (datos.tipo === "estado") {
    const n = datos.proyectos.length;
    card.append(cabecera("clipboard-list", "/estado-proyecto", "Estado de tus proyectos", n ? h("span", "pj-card__badge", String(n)) : null));
    if (!n) {
      card.append(
        h(
          "div",
          "pj-empty",
          h("span", "pj-empty__icon", fa("folder-open")),
          h("p", "", "Todavía no tienes proyectos vinculados. En cuanto empecemos con el tuyo, aparecerá aquí con su estado."),
        ),
      );
    } else {
      const cuerpo = h("div", "pj-card__body");
      if (datos.resumen) cuerpo.append(resumenEstado(datos.resumen));
      datos.proyectos.forEach((p, i) => cuerpo.append(bloqueProyecto(p, { i })));
      card.append(cuerpo);
      card.append(
        h(
          "footer",
          "pj-card__foot mono",
          fa("rotate"),
          `Actualizado ${haceCuanto(Math.max(...datos.proyectos.map((p) => p.actualizado)))} · escribe /estado-proyecto cuando quieras`,
        ),
      );
    }
  } else if (datos.tipo === "actualizacion") {
    const p = datos.proyecto;
    card.append(cabecera("thumbtack", "actualización", p.nombre, chipEstado(p.estado, "is-small")));
    crudo(card.querySelector<HTMLElement>(".pj-card__title")!);
    const cuerpo = h("div", "pj-card__body");
    if (datos.cambios.length) {
      const lista = h("ul", "pj-changes");
      lista.setAttribute("role", "list");
      datos.cambios.forEach((c, i) => lista.append(filaCambio(c, i)));
      cuerpo.append(lista);
    }
    const n = nota(datos.nota);
    if (n) cuerpo.append(n);
    if (!datos.cambios.some((c) => c.campo === "estado")) cuerpo.append(pasos(p.estado));
    card.append(cuerpo);
  } else {
    const p = datos.proyecto;
    const nuevo = datos.tipo === "nuevo";
    card.append(cabecera(nuevo ? "folder-plus" : "link", nuevo ? "nuevo proyecto" : "proyecto vinculado", nuevo ? "¡Arrancamos tu proyecto!" : "Proyecto añadido a tu cuenta"));
    const cuerpo = h("div", "pj-card__body", bloqueProyecto(p, { novedad: false }));
    if (p.descripcion) cuerpo.append(crudo(h("p", "pj-desc", p.descripcion)));
    const n = nota(datos.nota);
    if (n) cuerpo.append(n);
    card.append(cuerpo);
    card.append(h("footer", "pj-card__foot mono", fa("terminal"), "Escribe /estado-proyecto cuando quieras para ver cómo va."));
  }

  if (opciones.animar === false) card.classList.add("is-visible", "is-static");
  else animarAlVer(card);
  return card;
}

// ── animación ─────────────────────────────────

function contar(el: HTMLElement) {
  const fin = Number(el.dataset.valor ?? 0);
  const sufijo = el.dataset.sufijo ?? "";
  if (reducir() || fin === 0) {
    el.textContent = `${fin}${sufijo}`;
    return;
  }
  const dur = 900;
  const t0 = performance.now();
  const paso = (t: number) => {
    const k = Math.min(1, (t - t0) / dur);
    const suave = 1 - Math.pow(1 - k, 3);
    el.textContent = `${Math.round(fin * suave)}${sufijo}`;
    if (k < 1) requestAnimationFrame(paso);
  };
  el.textContent = `0${sufijo}`;
  requestAnimationFrame(paso);
}

let observador: IntersectionObserver | null = null;

function mostrar(el: Element) {
  el.classList.add("is-visible");
  el.querySelectorAll<HTMLElement>(".pj-count").forEach(contar);
}

/** Lanza las animaciones de la tarjeta cuando aparece en pantalla. */
export function animarAlVer(el: HTMLElement) {
  if (reducir() || !("IntersectionObserver" in window)) {
    el.classList.add("is-visible");
    return;
  }
  observador ??= new IntersectionObserver(
    (entradas) => {
      for (const e of entradas) {
        if (!e.isIntersecting) continue;
        observador?.unobserve(e.target);
        mostrar(e.target);
      }
    },
    { threshold: 0.25 },
  );
  observador.observe(el);
}
