// Ayudas compartidas por las demos de Discord (/servicios/discord/<demo>): crean
// mensajes, embeds, botones, «está escribiendo…», borrados animados, avisos y confeti
// con el estilo de src/styles/discord-demo.css. Todo el texto se mete con textContent.

export interface Autor {
  nombre: string;
  /** Imagen del avatar; si no hay, se usan las iniciales sobre `color`. */
  avatar?: string;
  color?: string;
  /** Color del nombre (rol más alto). */
  colorNombre?: string;
  bot?: boolean;
}

export interface Boton {
  t: string;
  estilo?: "blurple" | "green" | "red" | "gris";
  disabled?: boolean;
  onClick?: (b: HTMLButtonElement, msg: HTMLElement) => void;
}

export interface Embed {
  color?: string;
  autor?: string;
  titulo?: string;
  texto?: string;
  campos?: { k: string; v: string; inline?: boolean }[];
  pie?: string;
  miniatura?: string;
  /** Contenido extra (barras, listas…) que se añade al final del embed. */
  extra?: Node;
  botones?: Boton[];
}

export const BOT: Autor = { nombre: "AntonioooJ Dev", avatar: "/logo.png", bot: true };
export const YO: Autor = { nombre: "Tú", color: "#f0b232", colorNombre: "#f2f3f5" };

export const espera = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
export const hora = () => new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });

export function el<K extends keyof HTMLElementTagNameMap>(tag: K, clase = "", texto?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (clase) e.className = clase;
  if (texto !== undefined) e.textContent = texto;
  return e;
}

export function avatar(a: Autor, pequeño = false): HTMLElement {
  const caja = el("span", pequeño ? "dc-ava dc-ava--sm" : "dc-ava");
  if (a.avatar) {
    const img = el("img");
    img.src = a.avatar;
    img.alt = "";
    caja.append(img);
  } else {
    caja.textContent = a.nombre
      .split(/\s+/)
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
    caja.style.setProperty("--c", a.color ?? "#5865f2");
  }
  return caja;
}

/** Baja el chat al final si el usuario no está leyendo mensajes antiguos. */
export function bajar(lista: HTMLElement, forzar = false) {
  const cerca = lista.scrollHeight - lista.scrollTop - lista.clientHeight < 160;
  if (forzar || cerca) lista.scrollTo({ top: lista.scrollHeight, behavior: "smooth" });
}

export function crearEmbed(e: Embed, msg?: HTMLElement): HTMLElement {
  const box = el("div", "dc-embed");
  if (e.color) box.style.setProperty("--ec", e.color);
  if (e.autor) {
    const a = el("div", "dc-embed__author");
    const img = el("img");
    img.src = BOT.avatar!;
    img.alt = "";
    a.append(img, e.autor);
    box.append(a);
  }
  if (e.titulo) box.append(el("div", "dc-embed__title", e.titulo));
  if (e.texto) box.append(el("div", "dc-embed__text", e.texto));
  if (e.campos?.length) {
    const g = el("div", "dc-embed__fields");
    for (const c of e.campos) {
      const f = el("div", c.inline ? "dc-embed__field is-inline" : "dc-embed__field");
      f.append(el("b", "", c.k), el("span", "", c.v));
      g.append(f);
    }
    box.append(g);
  }
  if (e.extra) box.append(e.extra);
  if (e.miniatura) {
    const img = el("img", "dc-embed__thumb");
    img.src = e.miniatura;
    img.alt = "";
    box.append(img);
    box.classList.add("has-thumb");
  }
  if (e.pie) {
    const p = el("div", "dc-embed__footer");
    const img = el("img");
    img.src = BOT.avatar!;
    img.alt = "";
    p.append(img, `${e.pie} • hoy a las ${hora()}`);
    box.append(p);
  }
  if (e.botones?.length) box.append(fila(e.botones, () => msg ?? box));
  return box;
}

export function fila(botones: Boton[], msg: () => HTMLElement): HTMLElement {
  const f = el("div", "dc-row");
  for (const b of botones) {
    const btn = el("button", `dc-btn${b.estilo && b.estilo !== "gris" ? ` dc-btn--${b.estilo}` : ""}`, b.t);
    btn.type = "button";
    btn.disabled = !!b.disabled;
    if (b.onClick) btn.addEventListener("click", () => b.onClick!(btn, msg()));
    f.append(btn);
  }
  return f;
}

export interface OpcionesMensaje {
  texto?: string | Node;
  embed?: Embed;
  embeds?: Embed[];
  botones?: Boton[];
  /** Marca el mensaje como mención (fondo amarillo). */
  mencion?: boolean;
}

export function mensaje(lista: HTMLElement, autor: Autor, o: OpcionesMensaje = {}): HTMLElement {
  const m = el("div", "dc-msg");
  if (o.mencion) m.classList.add("is-mention");
  const cuerpo = el("div");
  const head = el("div", "dc-msg__head");
  const nombre = el("span", "dc-msg__name", autor.nombre);
  if (autor.colorNombre) nombre.style.setProperty("--n", autor.colorNombre);
  head.append(nombre);
  if (autor.bot) head.append(el("span", "dc-tag", "✓ BOT"));
  head.append(el("span", "dc-msg__time", `hoy a las ${hora()}`));
  cuerpo.append(head);
  if (o.texto) {
    const b = el("div", "dc-msg__body");
    b.append(o.texto);
    cuerpo.append(b);
  }
  for (const e of [...(o.embed ? [o.embed] : []), ...(o.embeds ?? [])]) cuerpo.append(crearEmbed(e, m));
  if (o.botones?.length) cuerpo.append(fila(o.botones, () => m));
  m.append(avatar(autor), cuerpo);
  lista.append(m);
  while (lista.querySelectorAll(".dc-msg, .dc-sys").length > 60) lista.querySelector(".dc-msg, .dc-sys")?.remove();
  bajar(lista, autor === YO);
  return m;
}

/** Mensaje del sistema: «X se ha unido», «X ha sido baneado»… */
export function sistema(lista: HTMLElement, icono: string, partes: (string | { b: string })[], tono?: "red" | "green"): HTMLElement {
  const s = el("div", `dc-sys${tono ? ` is-${tono}` : ""}`);
  const p = el("span");
  for (const x of partes) p.append(typeof x === "string" ? x : el("b", "", x.b));
  p.append(el("span", "dc-msg__time", `  hoy a las ${hora()}`));
  s.append(el("span", "dc-sys__icon", icono), p);
  lista.append(s);
  bajar(lista);
  return s;
}

/** «AntonioooJ Dev está escribiendo…» durante `ms`. */
export async function escribiendo(lista: HTMLElement, autor: Autor = BOT, ms = 700) {
  const t = el("div", "dc-typing");
  const dots = el("span", "dc-typing__dots");
  dots.append(el("i"), el("i"), el("i"));
  t.append(dots, el("b", "", autor.nombre), " está escribiendo…");
  lista.append(t);
  bajar(lista);
  await espera(ms);
  t.remove();
}

/** Borra un mensaje con animación. */
export async function borrar(m: HTMLElement) {
  m.classList.add("is-deleting");
  await espera(550);
  m.remove();
}

export function toast(dentro: HTMLElement, texto: string) {
  const t = el("div", "dc-toast", texto);
  dentro.append(t);
  setTimeout(() => t.remove(), 2700);
}

export function confeti(dentro: HTMLElement) {
  const caja = el("div", "dc-confetti");
  const colores = ["#5865f2", "#23a55a", "#f0b232", "#eb459e", "#fee75c", "#57f287"];
  for (let i = 0; i < 70; i++) {
    const p = el("i");
    p.style.setProperty("--x", `${Math.random() * 100}%`);
    p.style.setProperty("--c", colores[i % colores.length]);
    p.style.setProperty("--t", `${1.6 + Math.random() * 1.4}s`);
    p.style.setProperty("--d", `${Math.random() * 0.4}s`);
    p.style.setProperty("--dx", `${(Math.random() - 0.5) * 200}px`);
    p.style.setProperty("--r", `${Math.random() * 720}deg`);
    caja.append(p);
  }
  dentro.append(caja);
  setTimeout(() => caja.remove(), 3500);
}

/** Barra de progreso para meter en un embed (`extra`). */
export function barra(porcentaje: number, texto?: string): HTMLElement {
  const caja = el("div");
  caja.style.display = "grid";
  caja.style.gap = "4px";
  const b = el("div", "dc-bar");
  const i = el("i");
  b.append(i);
  requestAnimationFrame(() => requestAnimationFrame(() => i.style.setProperty("--p", `${porcentaje}%`)));
  if (texto) {
    const t = el("span", "", texto);
    t.style.fontSize = "0.75rem";
    t.style.color = "var(--dc-muted)";
    caja.append(t);
  }
  caja.prepend(b);
  return caja;
}
