// Pestaña «Estadísticas» de /admin: visitas de la web y consumo del servidor de la API.
// Datos de GET /api/panel/estadisticas (api/estadisticas.py). Gráficas en SVG hechas a mano
// (sin librerías), en el blanco y negro de la web: una serie = el color del texto; la segunda,
// discontinua o más clara y siempre con leyenda. Todas tienen tooltip al pasar el ratón.

import { icono } from "@/data/iconos";
import { pildora } from "@/scripts/pildora";
import "@/styles/estadisticas.css";

type Rango = "24h" | "7d" | "30d" | "90d";

interface Resumen {
  visitas: number;
  visitantes: number;
  sesiones: number;
  nuevos: number;
  paginasSesion: number;
  rebote: number;
  duracionPagina: number;
  duracionSesion: number;
  scroll: number;
  carga: number;
}

interface Item {
  nombre: string;
  valor: number;
  pct: number;
  titulo?: string | null;
  tiempo?: number;
}

interface Reciente {
  ts: number;
  ruta: string;
  titulo: string | null;
  pais: string | null;
  dispositivo: string;
  navegador: string;
  so: string;
  fuente: string;
  referente: string | null;
  duracion: number | null;
  nuevo: boolean;
  admin: boolean;
}

interface Datos {
  rango: Rango;
  paso: "hora" | "dia";
  generado: number;
  resumen: Resumen;
  anterior: Resumen;
  historico: { visitas: number; desde: number | null };
  serie: { t: string; visitas: number; visitantes: number }[];
  hoyAyer: { hoy: number[]; ayer: number[]; horaActual: number };
  minutos: number[];
  calor: number[][];
  vivo: { ahora: number; paginas: Item[] };
  top: Record<
    | "paginas" | "entradas" | "salidas" | "fuentes" | "referentes" | "paises" | "dispositivos"
    | "navegadores" | "sistemas" | "idiomas" | "pantallas" | "temas",
    Item[]
  >;
  recientes: Reciente[];
  consumo: {
    peticiones: { total: number; err4: number; err5: number; ms: number; bytes: number };
    msMedio: number;
    serie: { t: string; total: number; errores: number; ms: number }[];
    sistema: { ts: number; cpu: number; ram: number; ramApi: number; redIn: number; redOut: number }[];
    ahora: {
      cpu: number; nucleos: number; ram: number; ramUsada: number; ramTotal: number; ramApi: number;
      disco: number | null; discoUsado: number | null; discoTotal: number | null; baseDatos: number;
      activaDesde: number; equipoDesde: number | null;
    };
  };
}

interface Vivo {
  ahora: number;
  paginas: Item[];
  cpu: number;
  ram: number;
}

// ── utilidades ─────────────────────────────

type Hijo = Node | string | number | null | undefined | false;

function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | number | boolean | null | undefined> = {},
  ...hijos: Hijo[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue;
    el.setAttribute(k, v === true ? "" : String(v));
  }
  for (const c of hijos) if (c !== null && c !== undefined && c !== false) el.append(c instanceof Node ? c : String(c));
  return el;
}

const SVG = "http://www.w3.org/2000/svg";
function s<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number> = {}): SVGElementTagNameMap[K] {
  const el = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  return el;
}

const fmt = new Intl.NumberFormat("es-ES");
const fmt1 = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 1 });
const num = (n: number) => fmt.format(Math.round(n));
const pct = (n: number) => `${fmt1.format(n)} %`;

let regiones: Intl.DisplayNames | null = null;
let lenguas: Intl.DisplayNames | null = null;
try {
  regiones = new Intl.DisplayNames(["es"], { type: "region" });
  lenguas = new Intl.DisplayNames(["es"], { type: "language" });
} catch {}

function nombrePais(c: string) {
  if (!/^[A-Z]{2}$/.test(c)) return c;
  try {
    return regiones?.of(c) ?? c;
  } catch {
    return c;
  }
}
function nombreLengua(c: string) {
  if (!/^[a-z]{2,3}$/.test(c)) return c;
  try {
    const n = lenguas?.of(c) ?? c;
    return n.charAt(0).toUpperCase() + n.slice(1);
  } catch {
    return c;
  }
}

/** «3m 40s»: para los números grandes de arriba */
function duracionCorta(seg: number): string {
  if (seg < 60) return `${Math.round(seg)}s`;
  const m = Math.floor(seg / 60);
  return m < 60 ? `${m}m ${Math.round(seg % 60)}s` : `${Math.floor(m / 60)}h ${m % 60}m`;
}

function duracion(seg: number): string {
  if (!seg) return "0 s";
  if (seg < 60) return `${Math.round(seg)} s`;
  const m = Math.floor(seg / 60);
  const r = Math.round(seg % 60);
  if (m < 60) return r ? `${m} min ${r} s` : `${m} min`;
  const hh = Math.floor(m / 60);
  return `${hh} h ${m % 60} min`;
}

function bytes(b: number): string {
  if (b < 1024) return `${b} B`;
  const u = ["KB", "MB", "GB", "TB"];
  let v = b / 1024;
  let i = 0;
  while (v >= 1024 && i < u.length - 1) {
    v /= 1024;
    i++;
  }
  return `${fmt1.format(v)} ${u[i]}`;
}

function hace(ts: number): string {
  const d = Math.max(0, Math.round(Date.now() / 1000 - ts));
  if (d < 45) return "ahora";
  if (d < 3600) return `hace ${Math.round(d / 60)} min`;
  if (d < 86400) return `hace ${Math.round(d / 3600)} h`;
  return `hace ${Math.round(d / 86400)} d`;
}

function desde(ts: number): string {
  const d = Math.max(0, Math.round(Date.now() / 1000 - ts));
  const dias = Math.floor(d / 86400);
  const horas = Math.floor((d % 86400) / 3600);
  const min = Math.floor((d % 3600) / 60);
  if (dias) return `${dias} d ${horas} h`;
  if (horas) return `${horas} h ${min} min`;
  return `${min} min`;
}

const DIAS = ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"];
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

function etiquetaCubo(iso: string, paso: "hora" | "dia", larga = false): string {
  const d = new Date(iso);
  if (paso === "hora") {
    const hh = `${String(d.getHours()).padStart(2, "0")}:00`;
    return larga ? `${DIAS[(d.getDay() + 6) % 7]} ${d.getDate()} · ${hh}` : hh;
  }
  return larga ? `${DIAS[(d.getDay() + 6) % 7]} ${d.getDate()} ${MESES[d.getMonth()]}` : `${d.getDate()} ${MESES[d.getMonth()]}`;
}

/** Máximo «redondo» para el eje y sus marcas */
function escala(max: number, marcas = 4): number[] {
  if (max <= 0) return [0, 1];
  const bruto = max / marcas;
  const mag = 10 ** Math.floor(Math.log10(bruto));
  const paso = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((p) => p >= bruto) ?? bruto;
  const paso2 = Math.max(paso, max < marcas ? 1 : paso);
  const lista: number[] = [];
  for (let v = 0; v <= max + paso2 * 0.001; v += paso2) lista.push(+v.toFixed(6));
  if (lista[lista.length - 1] < max) lista.push(lista[lista.length - 1] + paso2);
  return lista;
}

// ── tooltip compartido ─────────────────────

const tip = h("div", { class: "est-tip", role: "tooltip", hidden: true });
document.body.append(tip);

function mostrarTip(e: PointerEvent | MouseEvent, contenido: (HTMLElement | string)[]) {
  tip.replaceChildren(...contenido);
  tip.hidden = false;
  const r = tip.getBoundingClientRect();
  let x = e.clientX + 14;
  let y = e.clientY + 14;
  if (x + r.width > innerWidth - 8) x = e.clientX - r.width - 14;
  if (y + r.height > innerHeight - 8) y = e.clientY - r.height - 14;
  tip.style.transform = `translate(${Math.max(8, x)}px, ${Math.max(8, y)}px)`;
}
const ocultarTip = () => (tip.hidden = true);

function lineaTip(marca: "solida" | "discontinua" | "barra" | null, texto: string, valor: string) {
  return h(
    "div",
    { class: "est-tip__fila" },
    marca ? h("i", { class: `est-tip__marca is-${marca}` }) : null,
    h("span", {}, texto),
    h("strong", {}, valor),
  );
}

// ── gráficas ───────────────────────────────

/** Repinta al cambiar de tamaño (las gráficas se dibujan en píxeles reales: textos nítidos) */
const observador = new ResizeObserver((entradas) => {
  for (const e of entradas) (e.target as HTMLElement & { _pintar?: () => void })._pintar?.();
});
function alCambiarTamano(el: HTMLElement, pintar: () => void) {
  // solo se anima la primera vez: al cambiar de tamaño se repinta sin que las barras vuelvan a crecer
  let primera = true;
  (el as HTMLElement & { _pintar?: () => void })._pintar = () => {
    el.classList.toggle("is-anima", primera);
    primera = false;
    pintar();
  };
  observador.observe(el);
  (el as HTMLElement & { _pintar: () => void })._pintar();
}

interface Punto {
  etiqueta: string;
  larga: string;
  valor: number;
  linea?: number;
  destacado?: boolean;
}

/** Barras verticales (con una línea opcional encima: p. ej. visitantes sobre visitas) */
function barrasV(
  el: HTMLElement,
  puntos: Punto[],
  o: { alto?: number; nombre: string; nombreLinea?: string; formato?: (n: number) => string; cadaEtiqueta?: number },
) {
  const formato = o.formato ?? num;
  alCambiarTamano(el, () => {
    const ancho = Math.max(240, el.clientWidth);
    const alto = o.alto ?? 260;
    const m = { arr: 14, der: 8, aba: 26, izq: 40 };
    const w = ancho - m.izq - m.der;
    const hh = alto - m.arr - m.aba;
    const max = Math.max(1, ...puntos.map((p) => Math.max(p.valor, p.linea ?? 0)));
    const marcas = escala(max);
    const tope = marcas[marcas.length - 1];
    const y = (v: number) => m.arr + hh - (v / tope) * hh;
    const col = w / Math.max(1, puntos.length);
    const hueco = col > 10 ? 2 : 1;
    const anchoBarra = Math.max(1, Math.min(42, col - hueco * 2 - (col > 18 ? col * 0.18 : 0)));

    const svg = s("svg", { width: ancho, height: alto, class: "est-svg", role: "img", "aria-label": o.nombre });
    for (const v of marcas) {
      svg.append(s("line", { x1: m.izq, x2: ancho - m.der, y1: y(v), y2: y(v), class: v === 0 ? "est-eje" : "est-rejilla" }));
      const t = s("text", { x: m.izq - 8, y: y(v) + 4, class: "est-txt", "text-anchor": "end" });
      t.textContent = v >= 1000 ? `${fmt1.format(v / 1000)}k` : fmt1.format(v);
      svg.append(t);
    }
    const cada = o.cadaEtiqueta ?? Math.max(1, Math.ceil(puntos.length / Math.max(2, Math.floor(w / 56))));
    puntos.forEach((p, i) => {
      const cx = m.izq + col * i + col / 2;
      if (p.valor > 0) {
        const alturaB = Math.max(2, hh - (y(p.valor) - m.arr));
        const r = Math.min(4, anchoBarra / 2);
        const x0 = cx - anchoBarra / 2;
        const y0 = m.arr + hh - alturaB;
        // solo las esquinas de arriba redondeadas (la base va pegada al eje)
        svg.append(
          s("path", {
            d: `M${x0},${m.arr + hh}V${y0 + r}Q${x0},${y0} ${x0 + r},${y0}H${x0 + anchoBarra - r}Q${x0 + anchoBarra},${y0} ${x0 + anchoBarra},${y0 + r}V${m.arr + hh}Z`,
            class: `est-barra${p.destacado ? " is-actual" : ""}`,
            style: `--i:${i}`,
          }),
        );
      }
      if ((puntos.length - 1 - i) % cada === 0) {
        const t = s("text", { x: cx, y: alto - 8, class: "est-txt", "text-anchor": "middle" });
        t.textContent = p.etiqueta;
        svg.append(t);
      }
    });
    if (o.nombreLinea) {
      const pts = puntos.map((p, i) => `${m.izq + col * i + col / 2},${y(p.linea ?? 0)}`);
      svg.append(s("polyline", { points: pts.join(" "), class: "est-linea is-sobre" }));
      puntos.forEach((p, i) => {
        if (puntos.length <= 40 && (p.linea ?? 0) > 0)
          svg.append(s("circle", { cx: m.izq + col * i + col / 2, cy: y(p.linea ?? 0), r: 3, class: "est-punto" }));
      });
    }
    // capa de ratón: una columna entera por cubo (más fácil de acertar que la barra)
    const guia = s("rect", { x: 0, y: m.arr, width: col, height: hh, class: "est-guia", opacity: 0 });
    svg.append(guia);
    puntos.forEach((p, i) => {
      const zona = s("rect", { x: m.izq + col * i, y: m.arr, width: col, height: hh, fill: "transparent" });
      zona.addEventListener("pointermove", (e) => {
        guia.setAttribute("x", String(m.izq + col * i));
        guia.setAttribute("opacity", "1");
        mostrarTip(e, [
          h("div", { class: "est-tip__titulo" }, p.larga),
          lineaTip("barra", o.nombre, formato(p.valor)),
          o.nombreLinea ? lineaTip("solida", o.nombreLinea, formato(p.linea ?? 0)) : "",
        ]);
      });
      zona.addEventListener("pointerleave", () => {
        guia.setAttribute("opacity", "0");
        ocultarTip();
      });
      svg.append(zona);
    });
    el.replaceChildren(svg);
  });
}

interface Serie {
  nombre: string;
  valores: (number | null)[];
  estilo: "solida" | "discontinua";
  area?: boolean;
}

/** Líneas con cruz al pasar el ratón: todas las series en el mismo punto */
function lineas(
  el: HTMLElement,
  series: Serie[],
  etiquetas: string[],
  largas: string[],
  o: { alto?: number; nombre: string; formato?: (n: number) => string; max?: number; cadaEtiqueta?: number; eje?: (n: number) => string },
) {
  const formato = o.formato ?? num;
  alCambiarTamano(el, () => {
    const ancho = Math.max(240, el.clientWidth);
    const alto = o.alto ?? 240;
    const m = { arr: 14, der: 12, aba: 26, izq: 44 };
    const w = ancho - m.izq - m.der;
    const hh = alto - m.arr - m.aba;
    const n = etiquetas.length;
    const todos = series.flatMap((x) => x.valores.filter((v): v is number => v !== null));
    const marcas = o.max ? [0, o.max / 4, o.max / 2, (o.max * 3) / 4, o.max] : escala(Math.max(1, ...todos));
    const tope = marcas[marcas.length - 1];
    const x = (i: number) => m.izq + (n <= 1 ? w / 2 : (w * i) / (n - 1));
    const y = (v: number) => m.arr + hh - (Math.min(v, tope) / tope) * hh;

    const svg = s("svg", { width: ancho, height: alto, class: "est-svg", role: "img", "aria-label": o.nombre });
    for (const v of marcas) {
      svg.append(s("line", { x1: m.izq, x2: ancho - m.der, y1: y(v), y2: y(v), class: v === 0 ? "est-eje" : "est-rejilla" }));
      const t = s("text", { x: m.izq - 8, y: y(v) + 4, class: "est-txt", "text-anchor": "end" });
      t.textContent = o.eje ? o.eje(v) : v >= 1000 ? `${fmt1.format(v / 1000)}k` : fmt1.format(v);
      svg.append(t);
    }
    const cada = o.cadaEtiqueta ?? Math.max(1, Math.ceil(n / Math.max(2, Math.floor(w / 56))));
    etiquetas.forEach((e, i) => {
      if ((n - 1 - i) % cada !== 0) return;
      const t = s("text", { x: x(i), y: alto - 8, class: "est-txt", "text-anchor": "middle" });
      t.textContent = e;
      svg.append(t);
    });
    for (const serie of series) {
      // tramos sin datos (null) cortan la línea
      let d = "";
      let abierto = false;
      serie.valores.forEach((v, i) => {
        if (v === null) {
          abierto = false;
          return;
        }
        d += `${abierto ? "L" : "M"}${x(i)},${y(v)}`;
        abierto = true;
      });
      if (serie.area && d) {
        const validos = serie.valores.map((v, i) => [v, i] as const).filter(([v]) => v !== null);
        const primero = validos[0]?.[1] ?? 0;
        const ultimo = validos[validos.length - 1]?.[1] ?? 0;
        svg.append(s("path", { d: `${d}L${x(ultimo)},${y(0)}L${x(primero)},${y(0)}Z`, class: "est-area" }));
      }
      svg.append(s("path", { d, class: `est-linea is-${serie.estilo}` }));
    }
    // etiqueta directa al final de cada serie (solo con 2+ series)
    if (series.length > 1) {
      for (const serie of series) {
        const i = serie.valores.map((v) => v !== null).lastIndexOf(true);
        if (i < 0) continue;
        svg.append(s("circle", { cx: x(i), cy: y(serie.valores[i] ?? 0), r: 4, class: `est-punto is-${serie.estilo}` }));
      }
    }
    const cruz = s("line", { y1: m.arr, y2: m.arr + hh, class: "est-cruz", opacity: 0 });
    const marcadores = series.map((x2) => s("circle", { r: 4.5, class: `est-punto is-${x2.estilo}`, opacity: 0 }));
    svg.append(cruz, ...marcadores);
    const zona = s("rect", { x: m.izq, y: m.arr, width: w, height: hh, fill: "transparent" });
    zona.addEventListener("pointermove", (e) => {
      const caja = svg.getBoundingClientRect();
      const i = Math.max(0, Math.min(n - 1, Math.round(((e.clientX - caja.left - m.izq) / w) * (n - 1))));
      cruz.setAttribute("x1", String(x(i)));
      cruz.setAttribute("x2", String(x(i)));
      cruz.setAttribute("opacity", "1");
      series.forEach((serie, k) => {
        const v = serie.valores[i];
        marcadores[k].setAttribute("opacity", v === null ? "0" : "1");
        marcadores[k].setAttribute("cx", String(x(i)));
        marcadores[k].setAttribute("cy", String(y(v ?? 0)));
      });
      mostrarTip(e, [
        h("div", { class: "est-tip__titulo" }, largas[i]),
        ...series.map((serie) => lineaTip(serie.estilo, serie.nombre, serie.valores[i] === null ? "—" : formato(serie.valores[i] ?? 0))),
      ]);
    });
    zona.addEventListener("pointerleave", () => {
      cruz.setAttribute("opacity", "0");
      marcadores.forEach((mk) => mk.setAttribute("opacity", "0"));
      ocultarTip();
    });
    svg.append(zona);
    el.replaceChildren(svg);
  });
}

/** Barras horizontales: ranking con nombre, barra, valor y % */
function barrasH(
  items: Item[],
  o: { nombre?: (i: Item) => string; sub?: (i: Item) => string | null; vacio?: string; extra?: (i: Item) => string; enlace?: (i: Item) => string | null } = {},
): HTMLElement {
  if (!items.length) return h("p", { class: "est-vacio mono" }, o.vacio ?? "Sin datos en este periodo");
  const max = Math.max(...items.map((i) => i.valor));
  return h(
    "ol",
    { class: "est-rank", role: "list" },
    ...items.map((it, k) => {
      const nombre = o.nombre ? o.nombre(it) : it.nombre;
      const sub = o.sub?.(it);
      const enlace = o.enlace?.(it);
      const fila = h(
        "li",
        { class: "est-rank__fila", style: `--w:${(it.valor / max) * 100}%;--i:${k}` },
        h("span", { class: "est-rank__barra", "aria-hidden": "true" }),
        h(
          "span",
          { class: "est-rank__nombre" },
          enlace ? h("a", { href: enlace, target: "_blank", rel: "noopener" }, nombre) : nombre,
          sub ? h("small", { class: "mono" }, sub) : null,
        ),
        o.extra ? h("span", { class: "est-rank__extra mono" }, o.extra(it)) : null,
        h("span", { class: "est-rank__valor" }, num(it.valor)),
        h("span", { class: "est-rank__pct mono" }, pct(it.pct)),
      );
      fila.addEventListener("pointermove", (e) =>
        mostrarTip(e, [
          h("div", { class: "est-tip__titulo" }, nombre),
          lineaTip("barra", "Visitas", num(it.valor)),
          lineaTip(null, "Del total", pct(it.pct)),
          it.tiempo ? lineaTip(null, "Tiempo medio", duracion(it.tiempo)) : "",
        ]),
      );
      fila.addEventListener("pointerleave", ocultarTip);
      return fila;
    }),
  );
}

/** Barra apilada de reparto (dispositivos, tema…) con leyenda debajo */
function reparto(items: Item[], nombres: (n: string) => string = (n) => n): HTMLElement {
  if (!items.length) return h("p", { class: "est-vacio mono" }, "Sin datos en este periodo");
  const barra = h("div", { class: "est-reparto__barra" });
  items.forEach((it, i) => {
    const seg = h("span", { class: `est-reparto__seg is-${i}`, style: `flex-grow:${it.valor}` });
    seg.addEventListener("pointermove", (e) =>
      mostrarTip(e, [h("div", { class: "est-tip__titulo" }, nombres(it.nombre)), lineaTip(null, "Visitas", num(it.valor)), lineaTip(null, "Del total", pct(it.pct))]),
    );
    seg.addEventListener("pointerleave", ocultarTip);
    barra.append(seg);
  });
  return h(
    "div",
    { class: "est-reparto" },
    barra,
    h(
      "ul",
      { class: "est-reparto__leyenda", role: "list" },
      ...items.map((it, i) =>
        h("li", {}, h("i", { class: `est-reparto__seg is-${i}` }), h("span", {}, nombres(it.nombre)), h("strong", {}, pct(it.pct))),
      ),
    ),
  );
}

/** Mapa de calor: día de la semana × hora */
function calor(matriz: number[][]): HTMLElement {
  const max = Math.max(1, ...matriz.flat());
  const rejilla = h("div", { class: "est-calor", role: "img", "aria-label": "Visitas por día de la semana y hora" });
  rejilla.append(h("span", {}));
  for (let hh = 0; hh < 24; hh++) rejilla.append(h("span", { class: "est-calor__h mono" }, hh % 3 === 0 ? String(hh).padStart(2, "0") : ""));
  matriz.forEach((fila, d) => {
    rejilla.append(h("span", { class: "est-calor__d mono" }, DIAS[d]));
    fila.forEach((v, hh) => {
      const nivel = v ? 0.12 + (v / max) * 0.88 : 0;
      const celda = h("span", { class: "est-calor__c", style: `--n:${nivel.toFixed(3)}` });
      celda.addEventListener("pointermove", (e) =>
        mostrarTip(e, [
          h("div", { class: "est-tip__titulo" }, `${DIAS[d]} · ${String(hh).padStart(2, "0")}:00 – ${String(hh + 1).padStart(2, "0")}:00`),
          lineaTip(null, "Visitas (4 semanas)", num(v)),
        ]),
      );
      celda.addEventListener("pointerleave", ocultarTip);
      rejilla.append(celda);
    });
  });
  return h(
    "div",
    {},
    rejilla,
    h(
      "div",
      { class: "est-calor__leyenda mono" },
      "menos",
      ...[0, 0.25, 0.5, 0.75, 1].map((n) => h("span", { class: "est-calor__c", style: `--n:${n ? 0.12 + n * 0.88 : 0}` })),
      "más",
    ),
  );
}

/** Medidor circular (CPU, RAM, disco) */
function medidor(nombre: string, valor: number | null, detalle: string): HTMLElement {
  const v = valor ?? 0;
  const r = 34;
  const c = 2 * Math.PI * r;
  const svg = s("svg", { viewBox: "0 0 84 84", class: "est-medidor__svg", "aria-hidden": "true" });
  svg.append(
    s("circle", { cx: 42, cy: 42, r, class: "est-medidor__pista" }),
    s("circle", {
      cx: 42, cy: 42, r, class: "est-medidor__valor", "stroke-dasharray": `${(c * Math.min(100, v)) / 100} ${c}`,
      transform: "rotate(-90 42 42)",
    }),
  );
  const nivel = v >= 90 ? "critico" : v >= 75 ? "alto" : "ok";
  return h(
    "div",
    { class: `est-medidor is-${nivel}` },
    h("div", { class: "est-medidor__anillo" }, svg, h("strong", {}, valor === null ? "—" : `${Math.round(v)}%`)),
    h(
      "div",
      { class: "est-medidor__texto" },
      h("span", { class: "mono" }, nombre),
      h("small", {}, detalle),
      nivel !== "ok" ? h("em", { class: "mono" }, nivel === "critico" ? "muy alto" : "alto") : null,
    ),
  );
}

function sparkline(valores: number[]): SVGSVGElement {
  const svg = s("svg", { viewBox: "0 0 100 28", preserveAspectRatio: "none", class: "est-spark", "aria-hidden": "true" });
  if (valores.length < 2) return svg;
  const max = Math.max(1, ...valores);
  const pts = valores.map((v, i) => `${(i / (valores.length - 1)) * 100},${26 - (v / max) * 24}`);
  svg.append(s("path", { d: `M0,28L${pts.join("L")}L100,28Z`, class: "est-spark__area" }));
  svg.append(s("polyline", { points: pts.join(" "), class: "est-spark__linea" }));
  return svg;
}

// ── la pestaña ─────────────────────────────

export function montarEstadisticas(raiz: HTMLElement, aviso: (texto: string, error?: boolean) => void) {
  let rango: Rango = "24h";
  let conmigo = false;
  try {
    const r = localStorage.getItem("aj-est-rango");
    if (r === "24h" || r === "7d" || r === "30d" || r === "90d") rango = r;
    conmigo = localStorage.getItem("aj-est-yo") === "1";
  } catch {}
  let datos: Datos | null = null;
  let temporizador = 0;
  let temporizadorVivo = 0;
  let cargando = false;
  let visible = false;

  // ── cabecera fija ──
  const botonesRango = h(
    "div",
    { class: "est-rangos", role: "group", "aria-label": "Periodo" },
    ...(
      [
        ["24h", "24 h"],
        ["7d", "7 días"],
        ["30d", "30 días"],
        ["90d", "90 días"],
      ] as const
    ).map(([id, texto]) => h("button", { type: "button", "data-rango": id, "aria-pressed": String(id === rango) }, texto)),
  );
  const moverPildora = pildora(botonesRango, "[aria-pressed='true']");
  const casillaYo = h("input", { type: "checkbox" }) as HTMLInputElement;
  casillaYo.checked = conmigo;
  const botonRefrescar = h("button", { type: "button", class: "est-icono", title: "Actualizar ahora", "aria-label": "Actualizar ahora" }, icono("refresh", 17));
  const estadoCarga = h("span", { class: "mono est-actualizado" }, "cargando…");

  const cuerpo = h("div", { class: "est-cuerpo" });
  raiz.replaceChildren(
    h(
      "div",
      { class: "est-head" },
      h(
        "div",
        {},
        h("strong", { class: "est-head__titulo" }, "Estadísticas"),
        h("span", { class: "est-head__sub" }, h("i", { class: "est-pulso", "aria-hidden": "true" }), estadoCarga),
      ),
      h(
        "div",
        { class: "est-controles" },
        botonesRango,
        h("label", { class: "est-yo", title: "Cuenta también las visitas que haces con tu sesión de administrador" }, casillaYo, h("span", {}, "Incluir mis visitas")),
        botonRefrescar,
      ),
    ),
    cuerpo,
  );
  requestAnimationFrame(() => moverPildora());

  botonesRango.addEventListener("click", (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>("button[data-rango]");
    if (!b) return;
    rango = b.dataset.rango as Rango;
    botonesRango.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    moverPildora();
    try {
      localStorage.setItem("aj-est-rango", rango);
    } catch {}
    cargar();
  });
  casillaYo.addEventListener("change", () => {
    conmigo = casillaYo.checked;
    try {
      localStorage.setItem("aj-est-yo", conmigo ? "1" : "0");
    } catch {}
    cargar();
  });
  botonRefrescar.addEventListener("click", () => cargar());

  async function pedir<T>(url: string): Promise<T> {
    const r = await fetch(url, { credentials: "same-origin", headers: { Accept: "application/json" } });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error((d as { detail?: string }).detail || `Error ${r.status}`);
    return d as T;
  }

  async function cargar() {
    if (cargando) return;
    cargando = true;
    botonRefrescar.classList.add("is-girando");
    try {
      datos = await pedir<Datos>(`/api/panel/estadisticas?rango=${rango}&yo=${conmigo ? 1 : 0}`);
      pintar(datos);
      estadoCarga.textContent = `actualizado ${new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", second: "2-digit" })} · se actualiza solo`;
    } catch (e) {
      estadoCarga.textContent = "no se han podido cargar";
      aviso(e instanceof Error ? e.message : "Error al cargar las estadísticas", true);
    } finally {
      cargando = false;
      botonRefrescar.classList.remove("is-girando");
    }
  }

  // ── en vivo (cada 10 s, solo el número y las páginas) ──
  const vivoNumero = h("strong", { class: "est-vivo__n" }, "0");
  const vivoPaginas = h("div", { class: "est-vivo__paginas" });
  function pintarVivo(v: { ahora: number; paginas: Item[] }) {
    vivoNumero.textContent = num(v.ahora);
    vivoPaginas.replaceChildren(
      v.paginas.length
        ? h("ul", { role: "list" }, ...v.paginas.map((p) => h("li", {}, h("span", { class: "mono" }, p.nombre), h("strong", {}, num(p.valor)))))
        : h("p", { class: "est-vacio mono" }, "Nadie en la web ahora mismo"),
    );
  }
  async function cargarVivo() {
    try {
      const v = await pedir<Vivo>(`/api/panel/estadisticas/vivo?yo=${conmigo ? 1 : 0}`);
      pintarVivo(v);
    } catch {}
  }

  // ── pintar todo ──
  function tarjeta(titulo: string, sub: string | null, contenido: Node, clase = "", leyenda?: Node): HTMLElement {
    return h(
      "section",
      { class: `est-card card ${clase}` },
      h("header", { class: "est-card__head" }, h("div", {}, h("h3", {}, titulo), sub ? h("p", { class: "mono" }, sub) : null), leyenda ?? null),
      contenido,
    );
  }

  function leyenda(...elementos: [string, "solida" | "discontinua" | "barra"][]): HTMLElement {
    return h(
      "ul",
      { class: "est-leyenda", role: "list" },
      ...elementos.map(([t, m]) => h("li", {}, h("i", { class: `est-tip__marca is-${m}` }), t)),
    );
  }

  function kpi(nombre: string, valor: string, actual: number, previo: number, o: { menosEsMejor?: boolean; spark?: number[]; ico: string; ayuda?: string }) {
    let delta: HTMLElement | null = null;
    if (previo > 0 || actual > 0) {
      const cambio = previo > 0 ? ((actual - previo) / previo) * 100 : 100;
      const sube = cambio > 0.05;
      const baja = cambio < -0.05;
      const bueno = o.menosEsMejor ? baja : sube;
      const malo = o.menosEsMejor ? sube : baja;
      delta = h(
        "span",
        { class: `est-kpi__delta${bueno ? " is-bien" : malo ? " is-mal" : ""}`, title: "Frente al periodo anterior de la misma duración" },
        sube ? "▲" : baja ? "▼" : "=",
        ` ${previo > 0 ? pct(Math.abs(cambio)) : "nuevo"}`,
      );
    }
    return h(
      "div",
      { class: "est-kpi card", title: o.ayuda ?? null },
      h("span", { class: "est-kpi__nombre mono" }, icono(o.ico, 15), nombre),
      h("strong", { class: "est-kpi__valor" }, valor),
      delta,
      o.spark ? sparkline(o.spark) : null,
    );
  }

  function pintar(d: Datos) {
    const r = d.resumen;
    const a = d.anterior;
    const etiquetaRango = { "24h": "últimas 24 horas", "7d": "últimos 7 días", "30d": "últimos 30 días", "90d": "últimos 90 días" }[d.rango];
    const sparkVisitas = d.serie.map((x) => x.visitas);
    const sparkVisitantes = d.serie.map((x) => x.visitantes);

    // KPIs
    const vivo = h(
      "div",
      { class: "est-kpi est-vivo card" },
      h("span", { class: "est-kpi__nombre mono" }, h("i", { class: "est-pulso is-vivo", "aria-hidden": "true" }), "En la web ahora"),
      vivoNumero,
      h("small", { class: "mono" }, "últimos 5 minutos"),
    );
    pintarVivo(d.vivo);
    const kpis = h(
      "div",
      { class: "est-kpis" },
      vivo,
      kpi("Visitas", num(r.visitas), r.visitas, a.visitas, { ico: "eye", spark: sparkVisitas, ayuda: "Páginas vistas" }),
      kpi("Visitantes", num(r.visitantes), r.visitantes, a.visitantes, { ico: "users", spark: sparkVisitantes, ayuda: "Personas distintas (se reinicia cada día)" }),
      kpi("Sesiones", num(r.sesiones), r.sesiones, a.sesiones, { ico: "layers", ayuda: "Visitas seguidas sin más de 30 min de pausa" }),
      kpi("Páginas / sesión", fmt1.format(r.paginasSesion), r.paginasSesion, a.paginasSesion, { ico: "file" }),
      kpi("Rebote", pct(r.rebote), r.rebote, a.rebote, { ico: "arrow", menosEsMejor: true, ayuda: "Sesiones que solo vieron una página" }),
      kpi("Tiempo por sesión", duracionCorta(r.duracionSesion), r.duracionSesion, a.duracionSesion, { ico: "clock" }),
      kpi("Scroll medio", pct(r.scroll), r.scroll, a.scroll, { ico: "sliders", ayuda: "Hasta dónde se baja en cada página" }),
      kpi("Carga media", r.carga ? `${fmt.format(r.carga)} ms` : "—", r.carga, a.carga, { ico: "zap", menosEsMejor: true, ayuda: "Mediana de lo que tarda en cargar la página" }),
    );

    // Serie principal
    const principal = h("div", { class: "est-grafica" });
    const nPuntos = d.serie.length;
    barrasV(
      principal,
      d.serie.map((p, i) => ({
        etiqueta: etiquetaCubo(p.t, d.paso),
        larga: etiquetaCubo(p.t, d.paso, true),
        valor: p.visitas,
        linea: p.visitantes,
        destacado: i === nPuntos - 1,
      })),
      { nombre: "Visitas", nombreLinea: "Visitantes", alto: 300 },
    );

    // Hoy contra ayer
    const horas = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, "0")}h`);
    const hoyAyer = h("div", { class: "est-grafica" });
    lineas(
      hoyAyer,
      [
        { nombre: "Hoy", valores: d.hoyAyer.hoy.map((v, i) => (i <= d.hoyAyer.horaActual ? v : null)), estilo: "solida", area: true },
        { nombre: "Ayer", valores: d.hoyAyer.ayer, estilo: "discontinua" },
      ],
      horas,
      horas.map((x, i) => `${x.slice(0, 2)}:00 – ${String(i + 1).padStart(2, "0")}:00`),
      { nombre: "Visitas de hoy frente a ayer, por hora", cadaEtiqueta: 3 },
    );
    const totalHoy = d.hoyAyer.hoy.reduce((x, y) => x + y, 0);
    const ayerHastaAhora = d.hoyAyer.ayer.slice(0, d.hoyAyer.horaActual + 1).reduce((x, y) => x + y, 0);

    // Últimos 60 minutos
    const minutos = h("div", { class: "est-grafica" });
    const ahora = new Date();
    barrasV(
      minutos,
      d.minutos.map((v, i) => {
        const t = new Date(ahora.getTime() - (59 - i) * 60000);
        const hhmm = `${String(t.getHours()).padStart(2, "0")}:${String(t.getMinutes()).padStart(2, "0")}`;
        return { etiqueta: i === 59 ? "ahora" : `-${59 - i}′`, larga: hhmm, valor: v, destacado: i === 59 };
      }),
      { nombre: "Visitas", alto: 170, cadaEtiqueta: 15 },
    );

    const ordenFuentes = (it: Item) => it.nombre;
    const paises = d.top.paises.map((p) => ({ ...p, nombre: p.nombre }));

    // Consumo
    const c = d.consumo;
    const sistema = agrupar5min(c.sistema);
    const etiquetasSis = sistema.map((x) => {
      const t = new Date(x.ts * 1000);
      return `${String(t.getHours()).padStart(2, "0")}:${String(t.getMinutes()).padStart(2, "0")}`;
    });
    const cpuRam = h("div", { class: "est-grafica" });
    const red = h("div", { class: "est-grafica" });
    const peticiones = h("div", { class: "est-grafica" });
    if (sistema.length > 1) {
      lineas(
        cpuRam,
        [
          { nombre: "CPU", valores: sistema.map((x) => x.cpu), estilo: "solida", area: true },
          { nombre: "RAM", valores: sistema.map((x) => x.ram), estilo: "discontinua" },
        ],
        etiquetasSis,
        etiquetasSis,
        { nombre: "CPU y RAM del servidor (%)", max: 100, formato: (n) => pct(n), eje: (n) => `${n}%` },
      );
      lineas(
        red,
        [
          { nombre: "Recibido", valores: sistema.map((x) => x.redIn / 300), estilo: "solida", area: true },
          { nombre: "Enviado", valores: sistema.map((x) => x.redOut / 300), estilo: "discontinua" },
        ],
        etiquetasSis,
        etiquetasSis,
        { nombre: "Red del servidor (por segundo)", formato: (n) => `${bytes(Math.round(n))}/s`, eje: (n) => bytes(Math.round(n)).replace(" ", "") },
      );
    } else {
      const espera = () => h("p", { class: "est-vacio mono" }, "Recogiendo datos: el servidor apunta una muestra cada minuto.");
      cpuRam.append(espera());
      red.append(espera());
    }
    barrasV(
      peticiones,
      c.serie.map((p, i) => ({
        etiqueta: etiquetaCubo(p.t, d.paso),
        larga: etiquetaCubo(p.t, d.paso, true),
        valor: p.total,
        linea: p.errores,
        destacado: i === c.serie.length - 1,
      })),
      { nombre: "Peticiones", nombreLinea: "Errores", alto: 220 },
    );
    const errores = c.peticiones.err4 + c.peticiones.err5;

    cuerpo.replaceChildren(
      kpis,
      tarjeta(
        d.paso === "hora" ? "Visitas por hora" : "Visitas por día",
        `${etiquetaRango} · ${num(r.visitas)} visitas de ${num(r.visitantes)} visitantes${r.nuevos ? ` · ${num(r.nuevos)} nuevos` : ""}`,
        principal,
        "est-ancho",
        leyenda(["Visitas", "barra"], ["Visitantes", "solida"]),
      ),
      h(
        "div",
        { class: "est-fila est-fila--2-1" },
        tarjeta(
          "Hoy frente a ayer",
          `${num(totalHoy)} hoy · ${num(ayerHastaAhora)} ayer a esta hora`,
          hoyAyer,
          "",
          leyenda(["Hoy", "solida"], ["Ayer", "discontinua"]),
        ),
        tarjeta("Última hora", "visitas por minuto · y quién está ahora", h("div", {}, minutos, h("h4", { class: "est-mini mono" }, "páginas abiertas ahora"), vivoPaginas)),
      ),
      tarjeta(
        "Páginas más vistas",
        `${d.top.paginas.length ? `${num(d.top.paginas.length)} páginas distintas` : "sin visitas"} · tiempo medio en cada una`,
        barrasH(d.top.paginas, {
          nombre: (i) => i.titulo || i.nombre,
          sub: (i) => (i.titulo ? i.nombre : null),
          extra: (i) => (i.tiempo ? duracion(i.tiempo) : "—"),
          enlace: (i) => i.nombre,
        }),
        "est-ancho",
      ),
      h(
        "div",
        { class: "est-fila est-fila--3" },
        tarjeta("Fuentes de tráfico", "cómo llegan (por sesión)", barrasH(d.top.fuentes, { nombre: ordenFuentes })),
        tarjeta("Webs que te enlazan", "referentes", barrasH(d.top.referentes, { vacio: "Nadie llega desde otra web aún" })),
        tarjeta("Páginas de entrada", "la primera que ven", barrasH(d.top.entradas)),
      ),
      h(
        "div",
        { class: "est-fila est-fila--3" },
        tarjeta("Países", null, barrasH(paises, { nombre: (i) => nombrePais(i.nombre), sub: (i) => (/^[A-Z]{2}$/.test(i.nombre) ? i.nombre : null), vacio: "El país solo llega en la web publicada" })),
        tarjeta(
          "Dispositivos",
          null,
          h("div", { class: "est-pila" }, reparto(d.top.dispositivos), h("h4", { class: "est-mini mono" }, "tema de la web"), reparto(d.top.temas, (n) => (n === "oscuro" ? "Oscuro" : n === "claro" ? "Claro" : n))),
        ),
        tarjeta("Páginas de salida", "la última que ven", barrasH(d.top.salidas)),
      ),
      h(
        "div",
        { class: "est-fila est-fila--4" },
        tarjeta("Navegadores", null, barrasH(d.top.navegadores)),
        tarjeta("Sistemas", null, barrasH(d.top.sistemas)),
        tarjeta("Idiomas", null, barrasH(d.top.idiomas, { nombre: (i) => nombreLengua(i.nombre) })),
        tarjeta("Pantallas", null, barrasH(d.top.pantallas)),
      ),
      h(
        "div",
        { class: "est-fila est-fila--2-1" },
        tarjeta("Cuándo te visitan", "últimas 4 semanas · día y hora", calor(d.calor)),
        tarjeta("Últimas visitas", d.historico.desde ? `${num(d.historico.visitas)} en total desde ${new Date(d.historico.desde * 1000).toLocaleDateString("es-ES")}` : null, feed(d.recientes), "est-feed-card"),
      ),

      h("h2", { class: "est-seccion" }, icono("server", 18), "Consumo del servidor", h("small", { class: "mono" }, "la API del chat, el panel y estas estadísticas")),
      h(
        "div",
        { class: "est-medidores" },
        medidor("CPU", c.ahora.cpu, `${c.ahora.nucleos} ${c.ahora.nucleos === 1 ? "núcleo" : "núcleos"}`),
        medidor("RAM", c.ahora.ram, `${bytes(c.ahora.ramUsada)} de ${bytes(c.ahora.ramTotal)}`),
        medidor("Disco", c.ahora.disco, c.ahora.discoTotal ? `${bytes(c.ahora.discoUsado ?? 0)} de ${bytes(c.ahora.discoTotal)}` : "—"),
        medidor("RAM de la API", (c.ahora.ramApi / c.ahora.ramTotal) * 100, bytes(c.ahora.ramApi)),
      ),
      h(
        "div",
        { class: "est-kpis est-kpis--consumo" },
        datoConsumo("Peticiones a la API", num(c.peticiones.total), etiquetaRango, "pulse"),
        datoConsumo("Errores", errores ? pct((errores * 100) / Math.max(1, c.peticiones.total)) : "0 %", `${num(c.peticiones.err4)} 4xx · ${num(c.peticiones.err5)} 5xx`, "alert", c.peticiones.err5 > 0),
        datoConsumo("Respuesta media", `${num(c.msMedio)} ms`, "lo que tarda la API", "gauge"),
        datoConsumo("Datos enviados", bytes(c.peticiones.bytes), "respuestas de la API", "send"),
        datoConsumo("Bases de datos", bytes(c.ahora.baseDatos), "chat + estadísticas", "database"),
        datoConsumo("API encendida", desde(c.ahora.activaDesde), "desde el último reinicio", "hourglass"),
        datoConsumo("Servidor encendido", c.ahora.equipoDesde ? desde(c.ahora.equipoDesde) : "—", "desde que arrancó la máquina", "monitor"),
      ),
      h(
        "div",
        { class: "est-fila est-fila--2" },
        tarjeta("CPU y RAM", "últimas 24 horas · media cada 5 min", cpuRam, "", leyenda(["CPU", "solida"], ["RAM", "discontinua"])),
        tarjeta("Red", "últimas 24 horas · por segundo", red, "", leyenda(["Recibido", "solida"], ["Enviado", "discontinua"])),
      ),
      tarjeta(
        d.paso === "hora" ? "Peticiones a la API por hora" : "Peticiones a la API por día",
        etiquetaRango,
        peticiones,
        "est-ancho",
        leyenda(["Peticiones", "barra"], ["Errores", "solida"]),
      ),
    );
  }

  function datoConsumo(nombre: string, valor: string, sub: string, ico: string, alerta = false) {
    return h(
      "div",
      { class: `est-kpi est-kpi--consumo card${alerta ? " is-alerta" : ""}` },
      h("span", { class: "est-kpi__nombre mono" }, icono(ico, 15), nombre),
      h("strong", { class: "est-kpi__valor" }, valor),
      h("small", { class: "mono" }, sub),
    );
  }

  function feed(lista: Reciente[]): HTMLElement {
    if (!lista.length) return h("p", { class: "est-vacio mono" }, "Aún no hay visitas");
    return h(
      "ol",
      { class: "est-feed", role: "list" },
      ...lista.map((v) =>
        h(
          "li",
          {},
          h("span", { class: "est-feed__ico", title: v.dispositivo }, icono(v.dispositivo === "Móvil" ? "devices" : v.dispositivo === "Tablet" ? "layout" : "monitor", 15)),
          h(
            "div",
            { class: "est-feed__txt" },
            h("strong", {}, v.titulo || v.ruta),
            h(
              "small",
              { class: "mono" },
              [v.pais ? nombrePais(v.pais) : null, v.navegador, v.so, v.referente ? `desde ${v.referente}` : v.fuente.toLowerCase()]
                .filter(Boolean)
                .join(" · "),
            ),
          ),
          h(
            "span",
            { class: "est-feed__meta mono" },
            v.nuevo ? h("em", {}, "nuevo") : null,
            v.admin ? h("em", {}, "tú") : null,
            h("span", {}, hace(v.ts)),
            v.duracion ? h("span", {}, duracion(v.duracion)) : null,
          ),
        ),
      ),
    );
  }

  function programar() {
    clearInterval(temporizador);
    clearInterval(temporizadorVivo);
    if (!visible) return;
    temporizador = window.setInterval(() => document.visibilityState === "visible" && cargar(), 60000);
    temporizadorVivo = window.setInterval(() => document.visibilityState === "visible" && cargarVivo(), 10000);
  }
  document.addEventListener("visibilitychange", () => {
    if (visible && document.visibilityState === "visible") cargarVivo();
  });

  return {
    mostrar() {
      visible = true;
      requestAnimationFrame(() => moverPildora());
      if (!datos || Date.now() / 1000 - datos.generado > 20) cargar();
      programar();
    },
    ocultar() {
      visible = false;
      programar();
      ocultarTip();
    },
  };
}

/** Las muestras del sistema son por minuto: en la gráfica, media de cada 5 min */
function agrupar5min(lista: Datos["consumo"]["sistema"]) {
  const grupos = new Map<number, { ts: number; cpu: number; ram: number; redIn: number; redOut: number; n: number }>();
  for (const x of lista) {
    const k = Math.floor(x.ts / 300) * 300;
    const g = grupos.get(k) ?? { ts: k, cpu: 0, ram: 0, redIn: 0, redOut: 0, n: 0 };
    g.cpu += x.cpu;
    g.ram += x.ram;
    g.redIn += x.redIn;
    g.redOut += x.redOut;
    g.n++;
    grupos.set(k, g);
  }
  // red: lo recibido en esos 5 min, aunque falte alguna muestra (se escala a 5 min)
  return [...grupos.values()].map((g) => ({
    ts: g.ts,
    cpu: g.cpu / g.n,
    ram: g.ram / g.n,
    redIn: (g.redIn / g.n) * 5,
    redOut: (g.redOut / g.n) * 5,
  }));
}
