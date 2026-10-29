// «Ahora mismo» (src/components/AhoraMismo.astro): panel de «Sobre mí» con tu modo y su
// escena, la canción que suena en tu Spotify, tu hora local y horario, tu carga de
// trabajo, en qué estás centrado y tu estado de Discord en vivo.
// Se refresca cada 30 s (Spotify, cada 15 s) mientras la pestaña está visible; el reloj y
// la barra de la canción, cada segundo. Si quien mira es el admin, puede cambiarlo desde
// el propio panel y conectar su cuenta de Spotify.

import { quienSoy } from "@/scripts/sesion";
import { escena } from "@/data/escenas";

interface Modo {
  id: string;
  emoji: string;
  nombre: string;
  mensaje: string;
  personalizado: boolean;
  desde: number | null;
}

interface OpcionModo {
  id: string;
  emoji: string;
  nombre: string;
  texto: string;
}

interface Yo {
  enfoque: string;
  plazas: number | null;
  actualizado: number | null;
}

interface Actividad {
  tipo: string;
  nombre: string;
  detalle?: string | null;
  estado?: string | null;
  plataforma?: string;
  imagen?: string | null;
  emoji?: { texto: string | null; url: string | null } | null;
  desde: number | null;
  hasta?: number | null;
}

interface Presencia {
  estado: "online" | "idle" | "dnd" | "offline";
  plataformas: string[];
  actividades: Actividad[];
  nombre: string;
  usuario: string;
  avatar: string;
  actualizado: number;
}

interface Estado {
  modo: Modo;
  yo: Yo;
  carga: { activos: number; entregados: number };
  discord: Presencia | null;
  discordActivo: boolean;
  modos: OpcionModo[];
}

interface Cancion {
  nombre: string;
  artistas: string[];
  album: string;
  portada: string | null;
  url: string | null;
  duracion: number;
}

interface Spotify {
  conectado: boolean;
  sonando?: boolean;
  cancion?: Cancion | null;
  progreso?: number; // segundos, en el momento «hora» (epoch del servidor)
  hora?: number;
  escuchada?: number; // si no suena nada: cuándo sonó la última
}

interface Horario {
  zona: string;
  ciudad: string;
  dias: number[];
  inicio: number;
  fin: number;
}

const REFRESCO = 30_000;
const REFRESCO_SPOTIFY = 15_000;
const ESTADOS_DISCORD: Record<Presencia["estado"], string> = {
  online: "En línea",
  idle: "Ausente",
  dnd: "No molestar",
  offline: "Desconectado",
};
const DIAS = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];

/** Texto del botón de acción según el modo. */
function llamada(modo: string): string {
  switch (modo) {
    case "disponible":
      return "Cuéntame tu proyecto";
    case "fuera":
    case "vacaciones":
      return "Déjame un mensaje para la vuelta";
    default:
      return "Escríbeme";
  }
}

const LOGO_DISCORD =
  '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.32 4.37a19.8 19.8 0 0 0-4.89-1.52c-.21.38-.44.87-.61 1.25a18.3 18.3 0 0 0-5.49 0 12.6 12.6 0 0 0-.62-1.25 19.7 19.7 0 0 0-4.89 1.52C.53 9.05-.32 13.58.1 18.06a19.9 19.9 0 0 0 6 3.03c.46-.63.87-1.3 1.23-1.99a13 13 0 0 1-1.87-.89l.37-.29c3.93 1.79 8.18 1.79 12.06 0l.37.29c-.6.35-1.22.65-1.87.89.36.7.77 1.36 1.22 1.99a19.8 19.8 0 0 0 6-3.03c.5-5.18-.84-9.67-3.55-13.69ZM8.02 15.33c-1.18 0-2.16-1.08-2.16-2.42s.96-2.42 2.16-2.42c1.21 0 2.18 1.1 2.16 2.42 0 1.34-.96 2.42-2.16 2.42Zm7.97 0c-1.18 0-2.15-1.08-2.15-2.42s.95-2.42 2.15-2.42c1.21 0 2.18 1.1 2.16 2.42 0 1.34-.95 2.42-2.16 2.42Z"/></svg>';

const rtf = new Intl.RelativeTimeFormat("es", { numeric: "auto" });
function haceCuanto(seg: number): string {
  const d = seg - Date.now() / 1000;
  const a = Math.abs(d);
  if (a < 60) return "ahora mismo";
  if (a < 3600) return rtf.format(Math.round(d / 60), "minute");
  if (a < 86400) return rtf.format(Math.round(d / 3600), "hour");
  return rtf.format(Math.round(d / 86400), "day");
}

/** «3 h 20 min», «45 min», «1 min». */
function duracion(seg: number): string {
  const min = Math.max(1, Math.round(seg / 60));
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (!h) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
}

const mmss = (s: number) => `${Math.floor(Math.max(0, s) / 60)}:${String(Math.floor(Math.max(0, s) % 60)).padStart(2, "0")}`;
const dos = (n: number) => String(n).padStart(2, "0");

/** Día de la semana (1 = lunes) y hora en una zona horaria. */
function partes(zona: string, fecha = new Date()) {
  const f = new Intl.DateTimeFormat("en-GB", {
    timeZone: zona,
    hourCycle: "h23",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const p = Object.fromEntries(f.formatToParts(fecha).map((x) => [x.type, x.value]));
  return {
    dia: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(p.weekday) + 1,
    h: Number(p.hour) % 24,
    m: Number(p.minute),
    s: Number(p.second),
  };
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, clase = "", texto = ""): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (clase) e.className = clase;
  if (texto) e.textContent = texto;
  return e;
}

const tarjeta = document.querySelector<HTMLElement>(".pc");
if (tarjeta) iniciar(tarjeta);

function iniciar(pc: HTMLElement) {
  const API = pc.dataset.api ?? "";
  const horario = JSON.parse(pc.dataset.horario ?? "{}") as Horario;
  const $ = <T extends Element>(s: string) => pc.querySelector<T>(s)!;

  const escenaCaja = $<HTMLElement>(".pc__scene");
  const hero = $<HTMLElement>(".pc__hero");
  const actualizado = $<HTMLElement>(".pc__updated");
  const img = $<HTMLImageElement>(".pc__avatar img");
  const discordPill = $<HTMLElement>(".pc__discord");
  const nombre = $<HTMLElement>(".pc__name");
  const usuario = $<HTMLElement>(".pc__user");
  const custom = $<HTMLElement>(".pc__custom");
  const emoji = $<HTMLElement>(".pc__mode-emoji");
  const modoNombre = $<HTMLElement>(".pc__mode-name");
  const msg = $<HTMLElement>(".pc__msg");
  const desde = $<HTMLElement>(".pc__since");
  const cta = $<HTMLElement>(".pc__cta-txt");
  // spotify
  const panelSp = $<HTMLElement>(".pc__w--spotify");
  const spEnlace = $<HTMLAnchorElement>(".pc__sp");
  const spPortada = $<HTMLImageElement>(".pc__sp-cover img");
  const spEstado = $<HTMLElement>(".pc__sp-estado");
  const spTitulo = $<HTMLElement>(".pc__sp-title");
  const spArtista = $<HTMLElement>(".pc__sp-artist");
  const spAlbum = $<HTMLElement>(".pc__sp-album");
  const spBarra = $<HTMLElement>(".pc__sp-bar");
  // tarjetita de Spotify del banner
  const np = $<HTMLAnchorElement>(".pc__np");
  const npPortada = $<HTMLImageElement>(".pc__np-cover img");
  const npTitulo = $<HTMLElement>(".pc__np-title");
  const npArtista = $<HTMLElement>(".pc__np-artist");
  const npBarra = $<HTMLElement>(".pc__np-bar span");
  // reloj
  const hora = $<HTMLElement>(".pc__time");
  const segundos = $<HTMLElement>(".pc__sec");
  const estadoHorario = $<HTMLElement>(".pc__horario");
  const tuHora = $<HTMLElement>(".pc__tuhora");
  // foco y carga
  const panelFoco = $<HTMLElement>(".pc__w--foco");
  const foco = $<HTMLElement>(".pc__foco");
  const activos = $<HTMLElement>(".pc__activos");
  const statEntregados = $<HTMLElement>(".pc__stat-entregados");
  const entregados = $<HTMLElement>(".pc__entregados");
  const plazas = $<HTMLElement>(".pc__plazas");
  // discord
  const actsWrap = $<HTMLElement>(".pc__w--acts");
  const acts = $<HTMLUListElement>(".pc__acts");
  // editor
  const admin = $<HTMLElement>(".pc__admin");
  const botonEditar = $<HTMLButtonElement>(".pc__edit");
  const editor = $<HTMLFormElement>(".pc__editor");
  const mosaicos = $<HTMLElement>(".pc__tiles");
  const inputMsg = editor.elements.namedItem("mensaje") as HTMLInputElement;
  const inputEnfoque = editor.elements.namedItem("enfoque") as HTMLInputElement;
  const selectPlazas = editor.elements.namedItem("plazas") as HTMLSelectElement;
  const pista = $<HTMLElement>(".pc__hint");
  const usuarioDefecto = usuario.textContent ?? "";

  let ultimo: Estado | null = null;
  let sp: (Spotify & { recibido: number }) | null = null;
  let modoPintado = "";
  let timer = 0;
  let timerSp = 0;
  let timerCancion = 0;

  const reiniciar = (e: Element, clase: string) => {
    e.classList.remove(clase);
    void (e as HTMLElement).offsetWidth; // reinicia la animación
    e.classList.add(clase);
  };

  // ── modo ──

  function pintarModo(m: Modo) {
    const clave = `${m.id}|${m.mensaje}`;
    const cambiaModo = pc.dataset.modo !== m.id;
    const cambia = modoPintado && modoPintado !== clave;
    modoPintado = clave;

    if (cambiaModo || !escenaCaja.firstElementChild) {
      escenaCaja.innerHTML = escena(m.id); // SVG propio (src/data/escenas.ts), sin datos del usuario
      if (cambia) reiniciar(escenaCaja, "is-changing");
    }
    pc.dataset.modo = m.id;
    emoji.textContent = m.emoji;
    modoNombre.textContent = m.nombre;
    msg.textContent = m.mensaje;
    desde.textContent = m.desde ? `Desde ${haceCuanto(m.desde).replace(/^ahora mismo$/, "ahora")}` : "";
    cta.textContent = llamada(m.id);
    if (cambia) reiniciar(hero, "is-changing");

    // La etiqueta de arriba del index (Hero) también muestra el modo actual
    document.querySelectorAll<HTMLElement>("[data-estado-vivo]").forEach((et) => {
      const txt = et.querySelector<HTMLElement>(".status-text");
      if (!txt || txt.textContent === m.nombre) return;
      et.dataset.modo = m.id;
      et.title = m.mensaje;
      txt.textContent = m.nombre;
      reiniciar(txt, "is-changing");
    });
  }

  // ── foco y carga ──

  function pintarYo(yo: Yo, carga: Estado["carga"]) {
    foco.textContent = yo.enfoque;
    panelFoco.hidden = !yo.enfoque;

    activos.textContent = String(carga.activos);
    entregados.textContent = String(carga.entregados);
    statEntregados.hidden = !carga.entregados;

    if (yo.plazas === null) {
      plazas.hidden = true;
    } else {
      const n = yo.plazas;
      const puntos = $<HTMLElement>(".pc__plazas-dots");
      puntos.replaceChildren(...Array.from({ length: Math.max(3, n) }, (_, i) => el("i", i < n ? "on" : "")));
      $<HTMLElement>(".pc__plazas-txt").textContent = n
        ? `${n === 1 ? "Me queda 1 hueco" : `Me quedan ${n} huecos`} para proyectos nuevos este mes`
        : "Sin huecos este mes · puedes reservar para el siguiente";
      plazas.hidden = false;
    }

    actualizado.textContent = yo.actualizado ? `actualizado ${haceCuanto(yo.actualizado)}` : "";
  }

  // ── reloj y horario ──

  function textoHorario(p: ReturnType<typeof partes>): { abierto: boolean; texto: string } {
    const { dias, inicio, fin } = horario;
    const segDia = p.h * 3600 + p.m * 60 + p.s;
    if (dias.includes(p.dia) && p.h >= inicio && p.h < fin) {
      return { abierto: true, texto: `En horario de trabajo · termino en ${duracion(fin * 3600 - segDia)}` };
    }
    // Próxima apertura
    for (let d = 0; d < 8; d++) {
      const dia = ((p.dia - 1 + d) % 7) + 1;
      if (!dias.includes(dia) || (d === 0 && p.h >= inicio)) continue;
      const falta = d * 86400 + inicio * 3600 - segDia;
      const cuando = d === 0 ? "hoy" : d === 1 ? "mañana" : `el ${DIAS[dia - 1]}`;
      const extra = falta < 12 * 3600 ? ` (en ${duracion(falta)})` : "";
      return { abierto: false, texto: `Fuera de horario · vuelvo ${cuando} a las ${inicio}:00${extra}` };
    }
    return { abierto: false, texto: "Fuera de horario" };
  }

  function pintarReloj() {
    const ahora = new Date();
    const p = partes(horario.zona, ahora);
    hora.textContent = `${dos(p.h)}:${dos(p.m)}`;
    segundos.textContent = `:${dos(p.s)}`;

    const { abierto, texto } = textoHorario(p);
    estadoHorario.classList.toggle("is-open", abierto);
    estadoHorario.lastElementChild!.textContent = texto;

    // Hora del visitante, solo si es distinta
    const mia = partes(Intl.DateTimeFormat().resolvedOptions().timeZone, ahora);
    tuHora.textContent =
      mia.h === p.h && mia.m === p.m ? "misma hora que tú" : `tu hora: ${dos(mia.h)}:${dos(mia.m)}`;

    avanzarSpotify();
  }

  // ── Spotify ──

  function pintarSpotify(d: Spotify) {
    const c = d.cancion;
    // La tarjetita del banner solo aparece mientras suena algo
    np.hidden = !(d.conectado && c && d.sonando);
    if (!d.conectado || !c) {
      panelSp.hidden = true;
      sp = null;
      return;
    }
    const firma = `${c.url}|${c.nombre}`;
    const nueva = panelSp.dataset.firma !== firma;
    sp = { ...d, recibido: Date.now() / 1000 };

    panelSp.toggleAttribute("data-sonando", !!d.sonando);
    spEstado.textContent = d.sonando
      ? "escuchando ahora en Spotify"
      : d.escuchada
        ? `lo último que escuché · ${haceCuanto(d.escuchada)}`
        : "en pausa en Spotify";

    if (nueva) {
      panelSp.dataset.firma = firma;
      spTitulo.textContent = c.nombre;
      spArtista.textContent = c.artistas.join(", ");
      spAlbum.textContent = c.album;
      if (c.portada) {
        spPortada.src = c.portada;
        // URL de Spotify (i.scdn.co); se escapa por si acaso
        panelSp.style.setProperty("--cover", `url("${c.portada.replace(/["\\]/g, "")}")`);
      }
      for (const enlace of [spEnlace, np]) {
        if (c.url) enlace.href = c.url;
        else enlace.removeAttribute("href");
        enlace.title = `${c.nombre} · ${c.artistas.join(", ")}`;
      }
      npTitulo.textContent = c.nombre;
      npArtista.textContent = c.artistas.join(", ");
      if (c.portada) npPortada.src = c.portada;
      if (!panelSp.hidden) reiniciar(panelSp, "is-changing");
    }
    panelSp.hidden = false;
    avanzarSpotify();
    if (ultimo) pintarDiscord(ultimo.discord, ultimo.discordActivo); // evita repetir la canción en Discord
  }

  function avanzarSpotify() {
    if (!sp?.cancion || !sp.sonando) return;
    const total = sp.cancion.duracion;
    const pos = Math.min(total, (sp.progreso ?? 0) + (Date.now() / 1000 - sp.recibido));
    spBarra.children[0].textContent = mmss(pos);
    spBarra.children[2].textContent = mmss(total);
    const porcentaje = `${total ? (pos / total) * 100 : 0}%`;
    (spBarra.children[1].firstElementChild as HTMLElement).style.setProperty("--p", porcentaje);
    npBarra.style.setProperty("--p", porcentaje);
    // Al acabar la canción, se pregunta enseguida por la siguiente
    if (pos >= total && Date.now() / 1000 - sp.recibido > 3) {
      sp.recibido = Infinity;
      programarSpotify(1500);
    }
  }

  async function cargarSpotify() {
    try {
      const r = await fetch(`${API}/api/spotify/ahora`, { cache: "no-store" });
      if (r.ok) pintarSpotify((await r.json()) as Spotify);
    } catch {}
  }

  function programarSpotify(espera = REFRESCO_SPOTIFY) {
    clearTimeout(timerSp);
    if (document.hidden) return;
    timerSp = window.setTimeout(async () => {
      await cargarSpotify();
      programarSpotify();
    }, espera);
  }

  // ── Discord ──

  function pintarCustom(a: Actividad | undefined) {
    if (!a || (!a.nombre && !a.emoji)) {
      custom.hidden = true;
      return;
    }
    custom.replaceChildren();
    if (a.emoji?.url) {
      const im = el("img");
      im.src = a.emoji.url;
      im.alt = "";
      custom.append(im);
    } else if (a.emoji?.texto) {
      custom.append(`${a.emoji.texto} `);
    }
    custom.append(a.nombre);
    custom.hidden = false;
  }

  function filaActividad(a: Actividad, i: number): HTMLElement {
    const li = el("li", "pc__act");
    li.dataset.tipo = a.tipo;
    li.style.setProperty("--i", String(i));

    const caja = el("span", "pc__act-img");
    if (a.imagen) {
      const im = el("img");
      im.src = a.imagen;
      im.alt = "";
      im.referrerPolicy = "no-referrer";
      caja.append(im);
    } else {
      caja.textContent = { jugando: "🎮", escuchando: "🎧", viendo: "📺", "en directo": "🔴", compitiendo: "🏆" }[a.tipo] ?? "✨";
    }

    const texto = el("span", "pc__act-text");
    const tipo = a.tipo === "escuchando" && a.plataforma ? `escuchando en ${a.plataforma}` : a.tipo;
    texto.append(el("span", "pc__act-kind", tipo), el("strong", "", a.nombre));
    const sub = [a.detalle && a.tipo === "escuchando" ? `de ${a.detalle}` : a.detalle, a.estado].filter(Boolean).join(" · ");
    if (sub) texto.append(el("span", "", sub));

    if (a.desde && a.hasta && a.hasta > a.desde) {
      // Canción: barra que avanza en vivo
      const barra = el("span", "pc__song-bar");
      const relleno = el("span");
      barra.append(relleno);
      const actual = el("span");
      const total = el("span", "", mmss(a.hasta - a.desde));
      const linea = el("span", "pc__song");
      linea.append(actual, barra, total);
      linea.dataset.desde = String(a.desde);
      linea.dataset.hasta = String(a.hasta);
      texto.append(linea);
    } else if (a.desde) {
      texto.append(el("span", "", `desde ${haceCuanto(a.desde)}`));
    }
    li.append(caja, texto);
    return li;
  }

  function avanzarCanciones() {
    const ahora = Date.now() / 1000;
    acts.querySelectorAll<HTMLElement>(".pc__song").forEach((l) => {
      const d = Number(l.dataset.desde);
      const h = Number(l.dataset.hasta);
      const p = Math.min(1, Math.max(0, (ahora - d) / (h - d)));
      (l.children[0] as HTMLElement).textContent = mmss(Math.min(ahora, h) - d);
      (l.children[1].firstElementChild as HTMLElement).style.setProperty("--p", `${p * 100}%`);
    });
  }

  function pintarDiscord(p: Presencia | null, activo: boolean) {
    if (!p) {
      delete pc.dataset.discord;
      discordPill.hidden = !activo;
      if (activo) discordPill.textContent = "buscando mi estado…";
      usuario.textContent = usuarioDefecto;
      custom.hidden = true;
      actsWrap.hidden = true;
      return;
    }
    pc.dataset.discord = p.estado;
    nombre.textContent = p.nombre;
    usuario.textContent = `@${p.usuario} · ${usuarioDefecto.toLowerCase()}`;
    if (img.src !== p.avatar) img.src = p.avatar;

    const donde = p.estado !== "offline" && p.plataformas.length ? ` · ${p.plataformas.join(", ")}` : "";
    discordPill.innerHTML = LOGO_DISCORD; // icono fijo
    discordPill.append(el("b", "", ESTADOS_DISCORD[p.estado] ?? p.estado), document.createTextNode(donde));
    discordPill.hidden = false;

    pintarCustom(p.actividades.find((a) => a.tipo === "personalizado"));

    // Si el panel de Spotify ya enseña la canción, no se repite aquí
    const conSpotify = !panelSp.hidden;
    const lista = p.actividades.filter(
      (a) => a.tipo !== "personalizado" && !(conSpotify && a.tipo === "escuchando" && /spotify/i.test(a.plataforma ?? a.nombre)),
    );
    // Las actividades se repintan solo si cambian, para no repetir la animación
    const firma = JSON.stringify(lista.map((a) => [a.tipo, a.nombre, a.detalle, a.estado, a.desde]));
    if (acts.dataset.firma !== firma) {
      acts.dataset.firma = firma;
      acts.replaceChildren(...lista.map(filaActividad));
    }
    actsWrap.hidden = !lista.length;
    clearInterval(timerCancion);
    if (acts.querySelector(".pc__song")) {
      avanzarCanciones();
      timerCancion = window.setInterval(avanzarCanciones, 1000);
    }
  }

  // ── carga ──

  async function cargar() {
    try {
      const r = await fetch(`${API}/api/estado`, { cache: "no-store" });
      if (!r.ok) throw new Error(String(r.status));
      ultimo = (await r.json()) as Estado;
    } catch {
      if (!ultimo) pc.dataset.state = "off"; // sin API (p. ej. web estática): no se muestra
      return;
    }
    pintarModo(ultimo.modo);
    pintarYo(ultimo.yo, ultimo.carga);
    pintarDiscord(ultimo.discord, ultimo.discordActivo);
    if (pc.dataset.state !== "listo") {
      pc.dataset.state = "listo";
      pc.classList.add("is-ready");
    }
  }

  function programar() {
    clearTimeout(timer);
    if (document.hidden) return;
    timer = window.setTimeout(async () => {
      await cargar();
      programar();
    }, REFRESCO);
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      clearTimeout(timer);
      clearTimeout(timerSp);
      return;
    }
    cargar().then(programar);
    cargarSpotify().then(() => programarSpotify());
  });

  pintarReloj();
  window.setInterval(() => {
    if (!document.hidden) pintarReloj();
  }, 1000);

  // ── editor (solo admin) ──

  function abrirEditor(abrir: boolean) {
    editor.hidden = !abrir;
    botonEditar.setAttribute("aria-expanded", String(abrir));
    botonEditar.textContent = abrir ? "✕ cerrar" : "✎ cambiar mi estado";
    if (!abrir || !ultimo) return;
    const e = ultimo;

    mosaicos.replaceChildren(
      ...e.modos.map((m) => {
        const r = el("input");
        r.type = "radio";
        r.name = "modo";
        r.value = m.id;
        r.checked = m.id === e.modo.id;
        r.addEventListener("change", () => (inputMsg.placeholder = m.texto));
        const fondo = el("span", "pc__tile-scene");
        fondo.innerHTML = escena(m.id); // SVG propio
        const etiqueta = el("span", "pc__tile-name");
        etiqueta.append(`${m.emoji} ${m.nombre}`);
        const mosaico = el("label", "pc__tile");
        mosaico.dataset.modo = m.id;
        mosaico.append(r, fondo, etiqueta);
        return mosaico;
      }),
    );

    const actual = e.modos.find((m) => m.id === e.modo.id);
    inputMsg.value = e.modo.personalizado ? e.modo.mensaje : "";
    inputMsg.placeholder = actual?.texto ?? "";
    inputEnfoque.value = e.yo.enfoque;
    selectPlazas.value = String(e.yo.plazas ?? -1);
    contar();
    estadoSpotifyAdmin();
  }

  function contar() {
    editor.querySelectorAll<HTMLElement>(".pc__count").forEach((c) => {
      const input = c.parentElement!.querySelector("input")!;
      c.textContent = `${input.value.length}/${c.dataset.max}`;
    });
  }

  /** Línea del editor con el estado de la conexión de Spotify. */
  async function estadoSpotifyAdmin() {
    const txt = $<HTMLElement>(".pc__sp-admin-txt");
    const conectar = $<HTMLAnchorElement>(".pc__sp-connect");
    const desconectar = $<HTMLButtonElement>(".pc__sp-disconnect");
    try {
      const r = await fetch(`${API}/api/spotify/diagnostico`, { credentials: "include", cache: "no-store" });
      const d = await r.json();
      conectar.href = `${API}/api/spotify/conectar`;
      if (!d.configurado) {
        txt.textContent = "♫ Spotify: falta SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET en api/.env";
        conectar.hidden = desconectar.hidden = true;
      } else if (!d.conectado) {
        txt.textContent = "♫ Spotify sin conectar ·";
        conectar.hidden = false;
        desconectar.hidden = true;
      } else {
        txt.textContent = `♫ Spotify conectado${d.usuario ? ` como ${d.usuario}` : ""}${d.error ? ` · ${d.error}` : ""} ·`;
        conectar.hidden = !d.error;
        conectar.textContent = "volver a conectar";
        desconectar.hidden = false;
      }
    } catch {
      txt.textContent = "♫ Spotify: no se pudo comprobar";
    }
  }

  $<HTMLButtonElement>(".pc__sp-disconnect").addEventListener("click", async () => {
    await fetch(`${API}/api/spotify`, { method: "DELETE", credentials: "include" }).catch(() => null);
    panelSp.hidden = np.hidden = true;
    sp = null;
    estadoSpotifyAdmin();
  });

  editor.addEventListener("input", contar);
  botonEditar.addEventListener("click", () => abrirEditor(editor.hasAttribute("hidden")));
  $<HTMLButtonElement>(".pc__cancel").addEventListener("click", () => abrirEditor(false));

  editor.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const modo = (editor.elements.namedItem("modo") as RadioNodeList).value;
    const boton = editor.querySelector<HTMLButtonElement>('button[type="submit"]')!;
    boton.disabled = true;
    pista.hidden = true;
    try {
      const r = await fetch(`${API}/api/estado`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modo,
          mensaje: inputMsg.value.trim(),
          enfoque: inputEnfoque.value.trim(),
          plazas: Number(selectPlazas.value),
        }),
      });
      if (!r.ok) throw new Error((await r.json().catch(() => null))?.detail ?? `Error ${r.status}`);
      const d = (await r.json()) as Pick<Estado, "modo" | "yo">;
      if (ultimo) {
        Object.assign(ultimo, d);
        pintarModo(ultimo.modo);
        pintarYo(ultimo.yo, ultimo.carga);
      }
      abrirEditor(false);
      pc.scrollIntoView({ block: "start", behavior: "smooth" });
    } catch (err) {
      pista.hidden = false;
      pista.textContent = err instanceof Error ? err.message : "No se pudo guardar";
    } finally {
      boton.disabled = false;
    }
  });

  async function mostrarAdmin() {
    try {
      const yo = await quienSoy();
      if (!yo?.admin) return;
    } catch {
      return;
    }
    admin.hidden = false;
    // Si Discord no está conectado, te dice por qué (solo lo ves tú)
    if (ultimo && !ultimo.discordActivo) {
      try {
        const r = await fetch(`${API}/api/estado/diagnostico`, { credentials: "include", cache: "no-store" });
        const d = r.ok ? await r.json() : null;
        if (d?.error) {
          pista.hidden = false;
          pista.textContent = `Discord no conectado: ${d.error}`;
        }
      } catch {}
    }
  }

  cargarSpotify().then(() => programarSpotify());
  cargar().then(() => {
    programar();
    if (pc.dataset.state === "listo") mostrarAdmin();
  });
}
