// Tarjetas en directo de la portada (src/components/Bento.astro):
//  - Estado: tu modo con su escena animada, un texto según el modo, tu nota (si la has
//    escrito) y la carga de trabajo.
//  - Hora: la de España y la de quien mira, con la diferencia y una barra de 24 h. El
//    visitante puede elegir su país (src/data/zonas.ts); se guarda en localStorage («aj-tz»).
//  - Spotify: lo que suena o lo último que sonó.
// Usa la misma API que «Ahora mismo» (/api/estado y /api/spotify/ahora); sin API, las
// tarjetas se quedan con su texto por defecto. Se refresca cada 30 s (Spotify, cada 15 s)
// mientras la pestaña está visible; el reloj, cada segundo.
// Estos textos no los toca src/scripts/i18n.ts ([data-b]): se traducen aquí y se vuelven a
// pintar al oír «aj:idioma».

import { escena } from "@/data/escenas";
import { ZONAS, type Zona } from "@/data/zonas";
import { t as traducir, type Idioma } from "@/i18n/dict";
import { idiomaActual, localeActual } from "@/scripts/i18n";

interface Estado {
  modo: { id: string; nombre: string; mensaje: string; personalizado?: boolean; desde: number | null };
  yo: { plazas: number | null };
  carga: { activos: number; entregados: number };
}

interface Spotify {
  conectado: boolean;
  sonando?: boolean;
  cancion?: { nombre: string; artistas: string[]; portada: string | null; url: string | null } | null;
  escuchada?: number;
}

/** Qué cuenta la tarjeta de estado en cada modo (los ids son los de api/estado.py). */
const TEXTO_MODO: Record<string, string> = {
  disponible: "Tengo hueco para un proyecto nuevo. Es buen momento para contarme el tuyo.",
  programando: "Ahora mismo estoy con las manos en el código. Si me escribes, te contesto en cuanto levante la vista.",
  ocupado: "La agenda está llena, pero te contesto igualmente y buscamos fecha.",
  reunion: "Estoy hablando con un cliente. En cuanto termine, reviso tus mensajes.",
  descanso: "Un descanso corto para recargar. Vuelvo enseguida.",
  fuera: "Ya he cerrado por hoy. Déjame un mensaje y lo leo mañana a primera hora.",
  vacaciones: "Estoy fuera unos días. Tu mensaje me espera a la vuelta.",
};

const CLAVE_TZ = "aj-tz";
const raiz = document.querySelector<HTMLElement>("[data-bento]");

if (raiz) {
  const api = raiz.dataset.api ?? "";
  const miZona = raiz.dataset.zona || "Europe/Madrid";
  const zonaDispositivo = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const $ = <T extends HTMLElement>(k: string) => raiz.querySelector<T>(`[data-b="${k}"]`);
  const tr = (es: string) => traducir(es, idiomaActual() as Idioma);
  const dos = (n: number) => String(n).padStart(2, "0");

  const hace = (seg: number) => {
    const rtf = new Intl.RelativeTimeFormat(localeActual(), { numeric: "auto" });
    const d = seg - Date.now() / 1000;
    const a = Math.abs(d);
    if (a < 3600) return rtf.format(Math.round(d / 60) || -1, "minute");
    if (a < 86400) return rtf.format(Math.round(d / 3600), "hour");
    return rtf.format(Math.round(d / 86400), "day");
  };

  /** Repite una animación CSS quitando y poniendo el atributo data-cambio. */
  function animar(el: HTMLElement | null) {
    if (!el) return;
    el.removeAttribute("data-cambio");
    void el.offsetWidth;
    el.setAttribute("data-cambio", "");
  }

  // ═══ hora ═══════════════════════════════════════════════

  function leerTz(): string {
    try {
      return localStorage.getItem(CLAVE_TZ) || zonaDispositivo;
    } catch {
      return zonaDispositivo;
    }
  }

  let tuZona = leerTz();

  /** Hora, minuto y segundo ahora mismo en una zona horaria. */
  function partes(zona: string, fecha: Date) {
    const f = new Intl.DateTimeFormat("en-GB", { timeZone: zona, hourCycle: "h23", hour: "2-digit", minute: "2-digit", second: "2-digit" });
    const p = Object.fromEntries(f.formatToParts(fecha).map((x) => [x.type, x.value]));
    return { h: Number(p.hour) % 24, m: Number(p.minute), s: Number(p.second) };
  }

  /** Minutos que una zona va por delante de UTC. */
  function desfase(zona: string, fecha: Date) {
    const enZona = new Date(fecha.toLocaleString("en-US", { timeZone: zona }));
    const enUtc = new Date(fecha.toLocaleString("en-US", { timeZone: "UTC" }));
    return Math.round((enZona.getTime() - enUtc.getTime()) / 60000);
  }

  /** «1 h», «5 h 30 min», «45 min». */
  function cuanto(min: number) {
    const h = Math.floor(min / 60);
    const m = min % 60;
    if (!h) return `${m} min`;
    return m ? `${h} h ${m} min` : `${h} h`;
  }

  const nombresPais = () => new Intl.DisplayNames([localeActual()], { type: "region" });

  /** Nombre que se enseña de una zona: país (y ciudad si el país tiene varias). */
  function describir(zona: string): { cc: string; pais: string; ciudad?: string } {
    const z = ZONAS.find((x) => x.zona === zona);
    const ciudadDe = (tz: string) => tz.split("/").pop()!.replace(/_/g, " ");
    if (!z) return { cc: "··", pais: ciudadDe(zona) };
    const varias = ZONAS.filter((x) => x.cc === z.cc).length > 1;
    return { cc: z.cc, pais: nombresPais().of(z.cc) ?? z.cc, ciudad: varias ? (z.ciudad ?? ciudadDe(z.zona)) : undefined };
  }

  const tarjetaHora = $("hora")?.closest<HTMLElement>(".tile");
  let difAnterior: number | null = null;

  function tic() {
    const ahora = new Date();
    const yo = partes(miZona, ahora);
    let tu;
    try {
      tu = partes(tuZona, ahora);
    } catch {
      tuZona = zonaDispositivo; // zona guardada que ya no existe
      tu = partes(tuZona, ahora);
    }

    $("hora")!.textContent = `${dos(yo.h)}:${dos(yo.m)}`;
    $("seg")!.textContent = `:${dos(yo.s)}`;
    $("tu-hora")!.textContent = `${dos(tu.h)}:${dos(tu.m)}`;

    const d = describir(tuZona);
    $("tu-pais")!.textContent = d.ciudad ? `${d.pais} (${d.ciudad})` : d.pais;
    $("pin-tu-cc")!.textContent = d.cc;

    $("pin-yo")!.style.setProperty("--x", `${((yo.h * 60 + yo.m) / 1440) * 100}%`);
    $("pin-tu")!.style.setProperty("--x", `${((tu.h * 60 + tu.m) / 1440) * 100}%`);

    const dif = desfase(tuZona, ahora) - desfase(miZona, ahora);
    tarjetaHora?.toggleAttribute("data-misma", dif === 0);
    const pastilla = $("dif")!;
    pastilla.textContent = dif === 0 ? "=" : `${dif > 0 ? "+" : "−"}${cuanto(Math.abs(dif))}`;
    $("dia-yo")!.textContent =
      dif === 0 ? tr("Tenemos la misma hora") : `${cuanto(Math.abs(dif))} ${tr(dif > 0 ? "por delante de España" : "por detrás de España")}`;
    if (difAnterior !== null && dif !== difAnterior) animar(pastilla);
    difAnterior = dif;
  }

  // ── selector de país ──
  const dialogo = document.querySelector<HTMLDialogElement>("[data-tz]");
  const lista = dialogo?.querySelector<HTMLElement>("[data-tz-lista]");
  const buscador = dialogo?.querySelector<HTMLInputElement>("[data-tz-q]");
  const sinTildes = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

  function pintarLista() {
    if (!lista) return;
    const ahora = new Date();
    const q = sinTildes(buscador?.value.trim() ?? "");
    const filas = ZONAS.map((z: Zona) => ({ z, d: describir(z.zona) }))
      .filter(({ z, d }) => !q || sinTildes(`${d.pais} ${d.ciudad ?? ""} ${z.cc} ${z.zona}`).includes(q))
      .sort((a, b) => a.d.pais.localeCompare(b.d.pais, localeActual()) || (a.d.ciudad ?? "").localeCompare(b.d.ciudad ?? ""));

    if (!filas.length) {
      const vacio = document.createElement("li");
      vacio.className = "vacio";
      vacio.textContent = tr("Sin resultados");
      lista.replaceChildren(vacio);
      return;
    }

    lista.replaceChildren(
      ...filas.map(({ z, d }) => {
        const li = document.createElement("li");
        const b = document.createElement("button");
        b.type = "button";
        b.setAttribute("role", "option");
        b.setAttribute("aria-selected", String(z.zona === tuZona));
        const cc = document.createElement("span");
        cc.className = "cc";
        cc.textContent = z.cc;
        const nombre = document.createElement("span");
        nombre.className = "nombre";
        nombre.textContent = d.pais;
        if (d.ciudad) {
          const c = document.createElement("small");
          c.textContent = d.ciudad;
          nombre.append(c);
        }
        const p = partes(z.zona, ahora);
        const hora = document.createElement("span");
        hora.className = "h";
        hora.textContent = `${dos(p.h)}:${dos(p.m)}`;
        b.append(cc, nombre, hora);
        b.addEventListener("click", () => elegir(z.zona));
        li.append(b);
        return li;
      }),
    );
  }

  function elegir(zona: string | null) {
    try {
      if (zona) localStorage.setItem(CLAVE_TZ, zona);
      else localStorage.removeItem(CLAVE_TZ);
    } catch {}
    tuZona = zona ?? zonaDispositivo;
    tic();
    cerrar();
  }

  function cerrar() {
    if (!dialogo?.open) return;
    dialogo.close();
  }

  raiz.querySelector("[data-tz-abrir]")?.addEventListener("click", () => {
    if (!dialogo) return;
    if (buscador) buscador.value = "";
    pintarLista();
    dialogo.showModal();
    buscador?.focus();
    lista?.querySelector<HTMLElement>('[aria-selected="true"]')?.scrollIntoView({ block: "center" });
  });
  buscador?.addEventListener("input", pintarLista);
  buscador?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") lista?.querySelector<HTMLButtonElement>("button")?.click();
  });
  dialogo?.querySelector("[data-tz-cerrar]")?.addEventListener("click", cerrar);
  dialogo?.querySelector("[data-tz-auto]")?.addEventListener("click", () => elegir(null));
  dialogo?.addEventListener("click", (e) => e.target === dialogo && cerrar());

  tic();
  setInterval(tic, 1000);

  // ═══ estado y carga ═════════════════════════════════════

  const tarjetaEstado = $("modo")?.closest<HTMLElement>(".tile");
  const caja = $("escena");
  let modoActual = tarjetaEstado?.dataset.modo ?? "";
  let ultimoEstado: Estado | null = null;

  function pintarEstado(e: Estado) {
    if (tarjetaEstado && e.modo.id !== modoActual) {
      modoActual = e.modo.id;
      tarjetaEstado.dataset.modo = e.modo.id;
      if (caja) {
        caja.innerHTML = escena(e.modo.id); // SVG propio (src/data/escenas.ts), sin datos del usuario
        animar(caja);
      }
    }
    $("modo")!.textContent = tr(e.modo.nombre);
    $("texto")!.textContent = tr(TEXTO_MODO[e.modo.id] ?? e.modo.mensaje);

    // tu nota a mano, solo si la has escrito tú (si no, el mensaje es el texto por defecto)
    const nota = $("nota")!;
    const propia = e.modo.personalizado && e.modo.mensaje.trim();
    nota.hidden = !propia;
    nota.textContent = propia ? `${tr("Nota:")} «${e.modo.mensaje.trim()}»` : "";

    const n = e.carga.activos;
    const plazas = e.yo.plazas;
    let carga = `${n} ${tr(n === 1 ? "proyecto en marcha" : "proyectos en marcha")}`;
    if (plazas !== null && plazas >= 0) {
      carga += plazas === 0 ? ` · ${tr("sin huecos este mes")}` : ` · ${plazas} ${tr(plazas === 1 ? "hueco libre este mes" : "huecos libres este mes")}`;
    }
    $("carga")!.textContent = carga;
  }

  async function estado() {
    try {
      const r = await fetch(`${api}/api/estado`, { cache: "no-store" });
      if (!r.ok) return;
      ultimoEstado = (await r.json()) as Estado;
      pintarEstado(ultimoEstado);
    } catch {
      /* sin API: se queda el texto por defecto */
    }
  }

  // ═══ Spotify ════════════════════════════════════════════

  const sp = $<HTMLAnchorElement>("sp");
  let ultimoSp: Spotify | null = null;

  function pintarSpotify(d: Spotify) {
    const c = d.cancion;
    if (!d.conectado || !c || !sp) return;
    sp.toggleAttribute("data-sonando", !!d.sonando);
    $("sp-estado")!.textContent = d.sonando
      ? tr("Sonando ahora")
      : d.escuchada
        ? `${tr("Lo último")} · ${hace(d.escuchada)}`
        : tr("Lo último que escuché");
    $("sp-titulo")!.textContent = c.nombre;
    $("sp-artista")!.textContent = c.artistas.join(", ");
    const img = $<HTMLImageElement>("sp-img");
    if (img && c.portada && img.src !== c.portada) {
      img.src = c.portada;
      img.hidden = false;
    }
    if (c.url) {
      sp.href = c.url;
      sp.classList.add("is-link");
    }
  }

  async function spotify() {
    try {
      const r = await fetch(`${api}/api/spotify/ahora`, { cache: "no-store" });
      if (!r.ok) return;
      ultimoSp = (await r.json()) as Spotify;
      pintarSpotify(ultimoSp);
    } catch {
      /* sin API */
    }
  }

  // ═══ idioma ═════════════════════════════════════════════

  function pintarTextosFijos() {
    // los textos por defecto (sin API) también se traducen
    if (!ultimoEstado) {
      $("modo")!.textContent = tr("Disponible para nuevos proyectos");
      $("texto")!.textContent = tr(TEXTO_MODO.disponible);
    }
    if (!ultimoSp?.cancion) {
      $("sp-estado")!.textContent = "Spotify";
      $("sp-titulo")!.textContent = tr("Trabajo con música");
      $("sp-artista")!.textContent = tr("Aquí sale lo que suena en mi Spotify.");
    }
  }

  window.addEventListener("aj:idioma", () => {
    pintarTextosFijos();
    tic();
    if (ultimoEstado) pintarEstado(ultimoEstado);
    if (ultimoSp) pintarSpotify(ultimoSp);
    if (dialogo?.open) pintarLista();
  });

  pintarTextosFijos();
  const refrescar = () => {
    if (document.visibilityState !== "visible") return;
    estado();
    spotify();
  };
  refrescar();
  setInterval(() => document.visibilityState === "visible" && estado(), 30_000);
  setInterval(() => document.visibilityState === "visible" && spotify(), 15_000);
  document.addEventListener("visibilitychange", refrescar);
}
