// Panel de administración (/admin): bots de Discord.
// Solo entra quien está en ADMIN_DISCORD_IDS (api/.env). Los datos salen de /api/panel/*;
// el token de cada bot se queda en la API y nunca llega aquí.
// Secciones: Proyectos (estado de cada proyecto, vinculado al ticket de su cliente) y Bots.

import { cerrarSesion, urlLogin } from "@/scripts/sesion";
import { icono } from "@/data/iconos";
import { haceCuanto, tarjetaAviso, type Cambio, type DatosAviso, type ProyectoPublico } from "@/scripts/proyectos-ui";

interface Yo {
  id: string;
  usuario: string;
  nombre: string;
  avatar: string | null;
  admin: boolean;
}

interface Permiso {
  nombre: string;
  valor: number;
}

interface Resumen {
  bots: number;
  chatSinLeer: number;
  opinionesSinLeer: number;
  abrirCarpetas: boolean;
  permisos: Record<string, Permiso>;
  /** Bot de la propia web (MD de tickets, aviso de sesión, estado de «Sobre mí») */
  botWeb: { configurado: boolean; clave: string | null; carpeta: string; registrado: boolean };
}

interface Proceso {
  pid: number;
  programa: string;
  comando: string;
  desde: number;
}

interface BotListado {
  id: number;
  appId: string;
  nombre: string;
  carpeta: string | null;
  origenToken: string;
  procesos: Proceso[];
  error: string | null;
  icono: string | null;
  usuario?: string;
  servidores: number | null;
  web: boolean;
}

interface Servidor {
  id: string;
  nombre: string;
  icono: string | null;
  miembros: number | null;
  enLinea: number | null;
  admin: boolean;
}

interface Comando {
  id: string;
  nombre: string;
  descripcion: string;
  tipo: string;
  opciones: string[];
  subcomandos: string[];
  soloPermisos: boolean;
  nsfw: boolean;
}

interface Carpeta {
  ruta: string;
  existe: boolean;
  tipo: string | null;
  libreria: string | null;
  arranque: string | null;
  scripts: string[];
  nombreProyecto: string | null;
  env: string[];
  procesos: Proceso[];
}

interface Detalle {
  id: number;
  web: boolean;
  origenToken: string;
  info: {
    appId: string;
    nombre: string;
    descripcion: string;
    icono: string | null;
    usuario: string;
    usuarioId: string;
    publico: boolean;
    verificado: boolean;
    servidoresAprox: number | null;
    propietario: string | null;
  };
  servidores: Servidor[];
  comandos: Comando[];
  carpeta: Carpeta | null;
}

interface Detectado {
  carpeta: string;
  nombre: string;
  tipo: string | null;
  libreria: string | null;
  claveToken: string | null;
  registrado: boolean;
}

type Tab = "servidores" | "comandos" | "carpeta" | "invitar";

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

const raiz = document.querySelector<HTMLElement>("#panel");
if (raiz) iniciar(raiz);

function iniciar(panel: HTMLElement) {
  const API = panel.dataset.api ?? "";
  const $ = <T extends Element>(sel: string, base: ParentNode = document) => base.querySelector<T>(sel)!;

  const seccionBots = $<HTMLElement>('[data-panel="bots"]', panel);
  const listaBots = $<HTMLUListElement>(".pn-bots__list", seccionBots);
  const detalle = $<HTMLElement>(".pn-detail", seccionBots);
  const cuerpo = $<HTMLElement>(".pn-detail__body", seccionBots);
  const dialogo = $<HTMLDialogElement>("#pn-anadir");
  const formAnadir = $<HTMLFormElement>("#pn-form-anadir");
  const detectados = $<HTMLUListElement>(".pn-detectados");

  let resumen: Resumen | null = null;
  let bots: BotListado[] = [];
  let actual: Detalle | null = null;
  let tabActual: Tab = "servidores";
  let servidorComandos = ""; // "" = globales

  // ── utilidades ──────────────────────────────

  async function api<T>(ruta: string, init: RequestInit = {}): Promise<T> {
    const r = await fetch(API + ruta, {
      credentials: "include",
      cache: "no-store",
      ...init,
      headers: { Accept: "application/json", ...(init.body ? { "Content-Type": "application/json" } : {}) },
    });
    let datos: unknown = null;
    try {
      datos = await r.json();
    } catch {}
    if (!r.ok) {
      const d = (datos as { detail?: unknown } | null)?.detail;
      // reauth: la sesión puede seguir valiendo para la web pero ser demasiado antigua para el panel
      if (r.status === 401) location.replace(`${urlLogin("/admin")}&reauth=1`);
      throw new ApiError(r.status, typeof d === "string" ? d : `Error ${r.status}`);
    }
    return datos as T;
  }

  type Hijo = Node | string | null | undefined | false;

  function h<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    attrs: Record<string, string | boolean | undefined> = {},
    ...hijos: Hijo[]
  ): HTMLElementTagNameMap[K] {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v === undefined || v === false) continue;
      if (k === "class") el.className = String(v);
      else el.setAttribute(k, v === true ? "" : String(v));
    }
    for (const c of hijos) if (c) el.append(c);
    return el;
  }

  function avatar(src: string | null, nombre: string, cuadrado = false): HTMLElement {
    const el = h("span", { class: "pn-avatar" + (cuadrado ? " is-square" : "") });
    if (src) el.append(h("img", { src, alt: "", loading: "lazy", referrerpolicy: "no-referrer" }));
    else el.textContent = (nombre.trim()[0] ?? "?").toUpperCase();
    return el;
  }

  /** Texto con icono delante (src/data/iconos.ts). */
  function ico(nombre: string, texto: string, attrs: Record<string, string | undefined> = {}): HTMLElement {
    return h("span", { ...attrs, class: `pn-ico ${attrs.class ?? ""}`.trim() }, icono(nombre, 14), texto);
  }

  // Icono de cada estado de proyecto (mismos ids que ESTADOS en api/proyectos.py)
  const ICONO_ESTADO: Record<string, string> = {
    pendiente: "hourglass",
    diseno: "palette",
    desarrollo: "tool",
    pruebas: "flask",
    revision: "eye",
    entregado: "check",
    pausado: "pause",
  };

  function mostrar(estado: "cargando" | "login" | "denegado" | "panel") {
    panel.dataset.state = estado;
  }

  const fecha = new Intl.DateTimeFormat("es-ES", { dateStyle: "short", timeStyle: "short" });
  const numero = new Intl.NumberFormat("es-ES");

  let toastTimer = 0;
  function aviso(texto: string, error = false) {
    let t = document.querySelector<HTMLElement>(".pn-toast");
    if (!t) {
      t = h("div", { class: "pn-toast", role: "status" });
      document.body.append(t);
    }
    t.textContent = texto;
    t.classList.toggle("is-error", error);
    t.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => t?.classList.remove("is-visible"), 3500);
  }

  async function copiar(texto: string) {
    try {
      await navigator.clipboard.writeText(texto);
      aviso("Copiado");
    } catch {
      aviso("No se pudo copiar", true);
    }
  }

  function botonCopiar(texto: string) {
    const b = h("button", { type: "button", class: "btn btn-ghost pn-btn-sm" }, "Copiar");
    b.addEventListener("click", () => copiar(texto));
    return b;
  }

  /** Botón que pide confirmación en el sitio (sin ventanas del navegador). */
  function botonConfirmar(texto: string, pregunta: string, accion: () => Promise<void>) {
    const caja = h("span", { class: "pn-row" });
    const inicial = h("button", { type: "button", class: "btn btn-danger pn-btn-sm" }, texto);
    caja.append(inicial);
    inicial.addEventListener("click", () => {
      const si = h("button", { type: "button", class: "btn btn-danger pn-btn-sm" }, "Sí");
      const no = h("button", { type: "button", class: "btn btn-ghost pn-btn-sm" }, "Cancelar");
      caja.replaceChildren(h("span", { class: "pn-note" }, pregunta), si, no);
      no.addEventListener("click", () => caja.replaceChildren(inicial));
      si.addEventListener("click", async () => {
        si.disabled = no.disabled = true;
        try {
          await accion();
        } catch (e) {
          aviso(e instanceof Error ? e.message : "Algo ha fallado", true);
          caja.replaceChildren(inicial);
        }
      });
      si.focus();
    });
    return caja;
  }

  // ── lista de bots ──────────────────────────

  function pintarLista() {
    const enMarcha = bots.filter((b) => b.procesos.length).length;
    $<HTMLElement>('[data-dato="botsResumen"]', panel).textContent = `${bots.length} en total · ${enMarcha} en marcha`;
    listaBots.replaceChildren(
      ...bots.map((b, i) => {
        const estado = b.error
          ? h("span", { class: "pn-pill is-error", title: b.error }, "error")
          : b.procesos.length
            ? h("span", { class: "pn-pill is-on" }, "en marcha")
            : b.carpeta
              ? h("span", { class: "pn-pill" }, "parado")
              : h("span", { class: "pn-pill is-plain" }, "solo token");
        const carpeta = b.carpeta ? b.carpeta.split(/[\\/]/).filter(Boolean).pop() : null;
        const boton = h(
          "button",
          { type: "button", class: `pn-pitem pn-bitem${b.web ? " is-web" : ""}`, "aria-current": actual?.id === b.id ? "true" : undefined },
          h(
            "span",
            { class: "pn-pitem__top" },
            avatar(b.icono, b.nombre),
            h(
              "span",
              { class: "pn-pitem__title" },
              h("strong", {}, b.nombre),
              h("span", { class: "pn-pitem__client" }, b.usuario ? `@${b.usuario}` : `app ${b.appId}`),
            ),
            estado,
          ),
          b.web ? h("span", { class: "pn-webtag" }, icono("globe", 13), "Bot de la web · MD de tickets y avisos de sesión") : null,
          h(
            "span",
            { class: "pn-pitem__meta" },
            b.servidores !== null ? ico("server", `${b.servidores} servidor${b.servidores === 1 ? "" : "es"}`) : null,
            b.procesos.length ? ico("cog", `${b.procesos.length} proceso${b.procesos.length === 1 ? "" : "s"}`) : null,
            carpeta ? ico("folder", carpeta, { title: b.carpeta ?? undefined }) : null,
            ico("key", b.origenToken),
          ),
          b.error ? h("span", { class: "pn-pitem__last is-error" }, b.error) : null,
        );
        boton.addEventListener("click", () => abrirBot(b.id));
        return h("li", { style: `--i:${i}` }, boton);
      }),
    );
    // El bot de la web aún sin token: tarjeta con los pasos para configurarlo
    const web = resumen?.botWeb;
    if (web && !bots.some((b) => b.web)) listaBots.prepend(tarjetaBotWeb(web));
    $<HTMLElement>('[data-dato="bots"]', panel).textContent = String(bots.length);
    $<HTMLElement>('[data-dato="nBots"]', panel).textContent = String(bots.length);
  }

  function tarjetaBotWeb(web: Resumen["botWeb"]): HTMLElement {
    const pasos = [
      "Crea una aplicación en discord.com/developers/applications (o usa la del login) → pestaña Bot → Reset Token.",
      "Pega el token en api/.env, en DISCORD_NOTIFY_BOT_TOKEN.",
      "Invita el bot a un servidor donde estén tus clientes (desde aquí, en «Añadir a servidor»).",
      "Pulsa «Comprobar»: aparecerá aquí con sus servidores y comandos.",
    ];
    const comprobar = h("button", { type: "button", class: "btn btn-primary pn-btn-sm" }, icono("refresh", 14), "Comprobar");
    comprobar.addEventListener("click", async () => {
      comprobar.disabled = true;
      try {
        resumen = await api<Resumen>("/api/panel/resumen");
        await cargarBots();
        aviso(bots.some((b) => b.web) ? "Bot de la web añadido al panel" : "Todavía no hay token en api/.env", !bots.some((b) => b.web));
      } finally {
        comprobar.disabled = false;
      }
    });
    return h(
      "li",
      { class: "pn-webcard" },
      h(
        "div",
        { class: "pn-webcard__head" },
        h("span", { class: "pn-webcard__icon" }, icono("bot", 22)),
        h(
          "div",
          {},
          h("strong", {}, "Bot de la web"),
          h("span", { class: "mono" }, web.configurado ? "token encontrado · comprobando…" : "sin configurar"),
        ),
      ),
      h(
        "p",
        { class: "pn-webcard__txt" },
        "Te avisa por MD cuando cierras sesión en el panel.",
      ),
      h("ol", { class: "pn-webcard__steps", role: "list" }, ...pasos.map((p, i) => h("li", {}, h("span", { class: "mono" }, String(i + 1)), p))),
      comprobar,
    );
  }

  async function cargarBots() {
    bots = await api<BotListado[]>("/api/panel/bots");
    pintarLista();
  }

  // ── detalle ────────────────────────────────

  async function abrirBot(id: number, recargar = false) {
    detalle.dataset.bot = String(id);
    if (!recargar || !actual) {
      cuerpo.replaceChildren(h("div", { class: "pn-tabpanel" }, h("span", { class: "pn-spinner" })));
    }
    history.replaceState(null, "", `#bot-${id}`);
    try {
      actual = await api<Detalle>(`/api/panel/bots/${id}${recargar ? "?recargar=true" : ""}`);
      if (!recargar) {
        tabActual = "servidores";
        servidorComandos = "";
      }
      pintarDetalle();
    } catch (e) {
      actual = null;
      const b = bots.find((x) => x.id === id);
      cuerpo.replaceChildren(
        h(
          "div",
          { class: "pn-tabpanel" },
          h("h2", {}, b?.nombre ?? "Bot"),
          h("p", { class: "pn-error" }, e instanceof Error ? e.message : "No se pudo cargar"),
          b ? zonaPeligro(b.id, b.nombre) : null,
        ),
      );
    }
    pintarLista();
  }

  function pintarDetalle() {
    if (!actual) return;
    const d = actual;
    const i = d.info;

    const recargar = h("button", { type: "button", class: "btn btn-ghost pn-btn-sm" }, "↻ Recargar");
    recargar.addEventListener("click", async () => {
      recargar.disabled = true;
      await abrirBot(d.id, true);
      await cargarBots().catch(() => {});
    });

    const cabecera = h(
      "div",
      { class: "pn-info" },
      avatar(i.icono, i.nombre),
      h(
        "div",
        {},
        h("h2", {}, i.nombre),
        h(
          "div",
          { class: "pn-info__meta" },
          h("span", { class: "pn-pill is-plain" }, `@${i.usuario}`),
          h("span", { class: "pn-pill is-plain", title: "ID de la aplicación" }, i.appId),
          h("span", { class: "pn-pill is-plain" }, i.publico ? "público" : "privado"),
          i.verificado ? h("span", { class: "pn-pill is-on" }, "verificado") : null,
          i.propietario ? h("span", { class: "pn-pill is-plain" }, `dueño: ${i.propietario}`) : null,
          d.web ? h("span", { class: "pn-pill is-on" }, "bot de la web") : null,
        ),
        d.web
          ? h(
              "p",
              { class: "pn-webnote" },
              icono("info", 15),
              "Es el bot de esta web: te avisa por MD al cerrar sesión. Para que el MD llegue, tiene que compartir servidor contigo.",
            )
          : null,
        i.descripcion ? h("p", { class: "pn-info__desc" }, i.descripcion) : null,
      ),
      recargar,
    );

    const tabs: [Tab, string, number | null][] = [
      ["servidores", "Servidores", d.servidores.length],
      ["comandos", "Comandos", d.comandos.length],
      ["carpeta", "Carpeta", null],
      ["invitar", "Añadir a servidor", null],
    ];
    const barra = h("div", { class: "pn-tabs", role: "tablist" });
    const panelTab = h("div", { class: "pn-tabpanel", role: "tabpanel" });
    for (const [id, texto, n] of tabs) {
      const t = h(
        "button",
        { type: "button", class: "pn-tab", role: "tab", "aria-selected": String(id === tabActual) },
        texto,
        n !== null ? h("span", { class: "pn-count" }, String(n)) : null,
      );
      t.addEventListener("click", () => {
        tabActual = id;
        pintarDetalle();
      });
      barra.append(t);
    }

    if (tabActual === "servidores") pintarServidores(panelTab, d);
    else if (tabActual === "comandos") pintarComandos(panelTab, d);
    else if (tabActual === "carpeta") pintarCarpeta(panelTab, d);
    else pintarInvitar(panelTab, d);

    cuerpo.replaceChildren(cabecera, barra, panelTab, zonaPeligro(d.id, i.nombre));
  }

  function zonaPeligro(id: number, nombre: string) {
    return h(
      "div",
      { class: "pn-danger-zone" },
      h("span", { class: "pn-note" }, "Quitarlo del panel no cambia nada en Discord."),
      botonConfirmar("Quitar del panel", `¿Quitar ${nombre}?`, async () => {
        await api(`/api/panel/bots/${id}`, { method: "DELETE" });
        actual = null;
        delete detalle.dataset.bot;
        cuerpo.replaceChildren();
        history.replaceState(null, "", location.pathname);
        aviso(`${nombre} quitado del panel`);
        await cargarBots();
      }),
    );
  }

  // servidores
  function pintarServidores(caja: HTMLElement, d: Detalle) {
    if (!d.servidores.length) {
      caja.append(h("p", { class: "pn-empty" }, "No está en ningún servidor. Invítalo desde «Añadir a servidor»."));
      return;
    }
    const lista = h("div", { class: "pn-list" });
    for (const s of d.servidores) {
      const verCmds = h("button", { type: "button", class: "btn btn-ghost pn-btn-sm" }, "Comandos");
      verCmds.addEventListener("click", () => {
        servidorComandos = s.id;
        tabActual = "comandos";
        pintarDetalle();
      });
      const datos = [
        s.miembros !== null ? `${numero.format(s.miembros)} miembros` : null,
        s.enLinea !== null ? `${numero.format(s.enLinea)} en línea` : null,
        s.admin ? "administrador" : null,
        s.id,
      ].filter(Boolean);
      lista.append(
        h(
          "div",
          { class: "pn-item" },
          avatar(s.icono, s.nombre, true),
          h(
            "div",
            { class: "pn-item__text" },
            h("span", { class: "pn-item__title" }, s.nombre),
            h("span", { class: "pn-item__sub mono" }, datos.join(" · ")),
          ),
          h(
            "div",
            { class: "pn-item__actions" },
            verCmds,
            botonConfirmar("Expulsar", `¿Sacar a ${d.info.nombre} de «${s.nombre}»?`, async () => {
              await api(`/api/panel/bots/${d.id}/servidores/${s.id}`, { method: "DELETE" });
              aviso(`${d.info.nombre} ha salido de ${s.nombre}`);
              await abrirBot(d.id, true);
              await cargarBots().catch(() => {});
            }),
          ),
        ),
      );
    }
    caja.append(lista);
  }

  // comandos
  function listaComandos(cmds: Comando[]) {
    if (!cmds.length) return h("p", { class: "pn-empty" }, "No hay comandos registrados aquí.");
    const lista = h("div", { class: "pn-list" });
    for (const c of cmds) {
      const extra = [
        c.subcomandos.length ? `subcomandos: ${c.subcomandos.join(", ")}` : null,
        c.opciones.length ? `opciones: ${c.opciones.join(", ")}` : null,
      ].filter(Boolean);
      lista.append(
        h(
          "div",
          { class: "pn-item pn-cmd" },
          h(
            "div",
            { class: "pn-item__text" },
            h("code", {}, c.tipo === "slash" ? `/${c.nombre}` : c.nombre),
            c.descripcion ? h("span", { class: "pn-item__sub" }, c.descripcion) : null,
            extra.length ? h("span", { class: "pn-item__sub mono" }, extra.join(" · ")) : null,
          ),
          h(
            "div",
            { class: "pn-item__actions" },
            c.tipo !== "slash" ? h("span", { class: "pn-pill is-plain" }, `menú ${c.tipo}`) : null,
            c.soloPermisos ? h("span", { class: "pn-pill is-plain", title: "Requiere permisos" }, "con permisos") : null,
            c.nsfw ? h("span", { class: "pn-pill is-plain" }, "nsfw") : null,
          ),
        ),
      );
    }
    return lista;
  }

  function pintarComandos(caja: HTMLElement, d: Detalle) {
    const select = h("select", { "aria-label": "Ámbito de los comandos" });
    select.append(h("option", { value: "" }, `Globales (${d.comandos.length})`));
    for (const s of d.servidores) select.append(h("option", { value: s.id }, `Solo en ${s.nombre}`));
    select.value = servidorComandos;
    const resultado = h("div", { class: "pn-tabpanel", style: "padding:0" });
    select.addEventListener("change", () => {
      servidorComandos = select.value;
      cargar();
    });
    caja.append(
      h("label", { class: "pn-select" }, "Ver:", select),
      h(
        "p",
        { class: "pn-note" },
        "Los globales están en todos los servidores; además, un bot puede tener comandos registrados solo en un servidor.",
      ),
      resultado,
    );

    async function cargar() {
      if (!servidorComandos) {
        resultado.replaceChildren(listaComandos(d.comandos));
        return;
      }
      resultado.replaceChildren(h("span", { class: "pn-spinner" }));
      try {
        const cmds = await api<Comando[]>(`/api/panel/bots/${d.id}/servidores/${servidorComandos}/comandos`);
        resultado.replaceChildren(listaComandos(cmds));
      } catch (e) {
        resultado.replaceChildren(h("p", { class: "pn-error" }, e instanceof Error ? e.message : "Error"));
      }
    }
    cargar();
  }

  // carpeta
  function pintarCarpeta(caja: HTMLElement, d: Detalle) {
    const c = d.carpeta;
    if (!c) {
      caja.append(
        h("p", { class: "pn-empty" }, "Este bot se añadió pegando el token, sin carpeta. Quítalo y vuelve a añadirlo con su carpeta para ver aquí sus datos."),
        h("dl", { class: "pn-kv" }, h("dt", {}, "token"), h("dd", {}, d.origenToken)),
      );
      return;
    }
    const ruta = h("div", { class: "pn-copy" }, h("code", { class: "pn-code" }, c.ruta), botonCopiar(c.ruta));
    if (resumen?.abrirCarpetas && c.existe) {
      const abrir = h("button", { type: "button", class: "btn btn-ghost pn-btn-sm" }, "Abrir");
      abrir.addEventListener("click", async () => {
        try {
          await api(`/api/panel/bots/${d.id}/abrir-carpeta`, { method: "POST" });
        } catch (e) {
          aviso(e instanceof Error ? e.message : "No se pudo abrir", true);
        }
      });
      ruta.append(abrir);
    }

    const filas: [string, Node | string][] = [["ruta", ruta]];
    if (!c.existe) filas.push(["estado", h("span", { class: "pn-error" }, "La carpeta ya no existe")]);
    if (c.tipo) filas.push(["proyecto", [c.tipo, c.nombreProyecto].filter(Boolean).join(" · ")]);
    if (c.libreria) filas.push(["librería", c.libreria]);
    if (c.arranque)
      filas.push(["arrancar", h("div", { class: "pn-copy" }, h("code", { class: "pn-code" }, c.arranque), botonCopiar(c.arranque))]);
    if (c.scripts.length) filas.push(["scripts npm", c.scripts.join(", ")]);
    filas.push(["token", d.origenToken]);
    if (c.env.length) filas.push([".env", h("span", { class: "mono" }, c.env.join(", "))]);

    const dl = h("dl", { class: "pn-kv" });
    for (const [k, v] of filas) dl.append(h("dt", {}, k), h("dd", {}, v));

    const procesos = c.procesos.length
      ? h(
          "div",
          { class: "pn-list" },
          ...c.procesos.map((p) =>
            h(
              "div",
              { class: "pn-item pn-cmd" },
              h(
                "div",
                { class: "pn-item__text" },
                h("code", { class: "pn-item__sub" }, p.comando),
                h("span", { class: "pn-item__sub mono" }, `PID ${p.pid} · ${p.programa} · desde ${fecha.format(new Date(p.desde * 1000))}`),
              ),
              h("span", { class: "pn-pill is-on" }, "en marcha"),
            ),
          ),
        )
      : h("p", { class: "pn-empty" }, "No hay ningún proceso de Python ni Node ejecutándose en esta carpeta.");

    caja.append(dl, h("h3", { class: "mono pn-sub", style: "margin:0" }, "// procesos en esta carpeta"), procesos);
  }

  // invitar
  function pintarInvitar(caja: HTMLElement, d: Detalle) {
    const permisos = resumen?.permisos ?? {};
    let elegido = "recomendados";
    const radios = h("div", { class: "pn-radios", role: "radiogroup", "aria-label": "Permisos" });
    const url = h("code", { class: "pn-code" });
    const abrir = h("a", { class: "btn btn-primary", target: "_blank", rel: "noopener noreferrer" }, "Abrir en Discord", h("span", { class: "arrow", "aria-hidden": "true" }, " →"));
    const copiarBtn = h("button", { type: "button", class: "btn btn-ghost" }, "Copiar enlace");

    const generar = () => {
      const p = permisos[elegido]?.valor ?? 0;
      const enlace =
        "https://discord.com/oauth2/authorize?" +
        new URLSearchParams({ client_id: d.info.appId, scope: "bot applications.commands", permissions: String(p) });
      url.textContent = enlace;
      abrir.href = enlace;
    };

    for (const [clave, p] of Object.entries(permisos)) {
      const input = h("input", { type: "radio", name: "pn-permisos", value: clave, checked: clave === elegido });
      input.addEventListener("change", () => {
        elegido = clave;
        generar();
      });
      radios.append(h("label", {}, input, p.nombre));
    }
    copiarBtn.addEventListener("click", () => copiar(url.textContent ?? ""));
    generar();

    caja.append(
      h(
        "p",
        { class: "pn-note" },
        "Discord exige que una persona confirme la invitación: abre el enlace, elige el servidor (necesitas «Gestionar servidor» en él) y acepta. Después pulsa «↻ Recargar».",
      ),
      radios,
      h("div", { class: "pn-copy" }, url),
      h("div", { class: "pn-row" }, abrir, copiarBtn),
    );
  }

  // ── añadir bot ─────────────────────────────

  async function cargarDetectados() {
    detectados.replaceChildren(h("li", { class: "pn-muted mono" }, "buscando…"));
    try {
      const lista = await api<Detectado[]>("/api/panel/bots/detectar");
      if (!lista.length) {
        detectados.replaceChildren(h("li", { class: "pn-muted" }, "No he encontrado proyectos de bots en tu carpeta Developer."));
        return;
      }
      detectados.replaceChildren(
        ...lista.map((d) => {
          let accion: Node;
          if (d.registrado) accion = h("span", { class: "pn-pill is-on" }, "ya añadido");
          else if (d.claveToken) {
            const b = h("button", { type: "button", class: "btn btn-primary pn-btn-sm" }, "Añadir");
            b.addEventListener("click", () => anadir({ carpeta: d.carpeta }, b));
            accion = b;
          } else {
            const b = h("button", { type: "button", class: "btn btn-ghost pn-btn-sm" }, "Pegar token");
            b.addEventListener("click", () => {
              (formAnadir.elements.namedItem("carpeta") as HTMLInputElement).value = d.carpeta;
              (formAnadir.elements.namedItem("token") as HTMLInputElement).focus();
            });
            accion = b;
          }
          const sub = [d.tipo, d.libreria, d.claveToken ? `token en .env (${d.claveToken})` : "sin token en .env"]
            .filter(Boolean)
            .join(" · ");
          return h(
            "li",
            { class: "pn-item" },
            h("span", { class: "pn-avatar is-square" }, d.tipo === "Python" ? "py" : "js"),
            h(
              "div",
              { class: "pn-item__text" },
              h("span", { class: "pn-item__title" }, d.nombre),
              h("span", { class: "pn-item__sub mono" }, d.carpeta),
              h("span", { class: "pn-item__sub" }, sub),
            ),
            h("div", { class: "pn-item__actions" }, accion),
          );
        }),
      );
    } catch (e) {
      detectados.replaceChildren(h("li", { class: "pn-muted pn-error" }, e instanceof Error ? e.message : "Error"));
    }
  }

  async function anadir(datos: { carpeta?: string; token?: string }, boton: HTMLButtonElement) {
    const error = $<HTMLElement>(".pn-form__error", formAnadir);
    error.textContent = "";
    boton.disabled = true;
    try {
      const r = await api<{ id: number; nombre: string }>("/api/panel/bots", { method: "POST", body: JSON.stringify(datos) });
      aviso(`${r.nombre} añadido`);
      formAnadir.reset();
      dialogo.close();
      await cargarBots();
      $<HTMLElement>('[data-dato="bots"]', panel).textContent = String(bots.length);
      abrirBot(r.id);
    } catch (e) {
      error.textContent = e instanceof Error ? e.message : "No se pudo añadir";
      aviso(error.textContent, true);
    } finally {
      boton.disabled = false;
    }
  }

  formAnadir.addEventListener("submit", (e) => {
    e.preventDefault();
    const f = new FormData(formAnadir);
    const carpeta = String(f.get("carpeta") ?? "").trim();
    const token = String(f.get("token") ?? "").trim();
    if (!carpeta && !token) {
      $<HTMLElement>(".pn-form__error", formAnadir).textContent = "Indica la carpeta del bot o pega su token.";
      return;
    }
    anadir({ carpeta: carpeta || undefined, token: token || undefined }, $<HTMLButtonElement>('button[type="submit"]', formAnadir));
  });

  panel.querySelectorAll('[data-accion="anadir"]').forEach((b) =>
    b.addEventListener("click", () => {
      dialogo.showModal();
      cargarDetectados();
    }),
  );

  // ── sesión ─────────────────────────────────

  panel.querySelectorAll('[data-accion="salir"]').forEach((b) =>
    b.addEventListener("click", async () => {
      await cerrarSesion();
      location.replace("/");
    }),
  );

  // ── proyectos ──────────────────────────────
  // Editor a todo el ancho. Al pulsar «Crear proyecto» / «Guardar cambios» se abre una ventana
  // con la tarjeta exacta que recibirá el cliente en su chat (src/scripts/proyectos-ui.ts) y
  // solo se guarda al confirmar.

  interface Estado {
    id: string;
    emoji: string;
    nombre: string;
  }

  interface Cliente {
    id: string;
    usuario: string;
    nombre: string;
    avatar: string | null;
  }

  interface TicketBase {
    id: number;
    numero: string;
    asunto: string | null;
    abierto: number;
    cerrado: number | null;
  }

  /** Ticket que se puede vincular a un proyecto (el cliente es quien lo abrió). */
  interface TicketOpcion extends TicketBase {
    cliente: Cliente;
    /** Proyecto que ya tiene (uno por ticket) */
    proyecto: { id: number; nombre: string } | null;
    ultimoTexto: string | null;
    ultimoCreado: number | null;
  }

  interface Proyecto {
    id: number;
    nombre: string;
    descripcion: string;
    estado: string;
    progreso: number;
    entrega: string | null;
    cliente: Cliente | null;
    ticket: TicketBase | null;
    actualizado: number;
    ultimoEvento: { texto: string; creado: number } | null;
  }

  interface Evento {
    id: number;
    texto: string;
    avisado: boolean;
    creado: number;
  }

  const seccionProys = $<HTMLElement>('[data-panel="proyectos"]', panel);
  const listaProys = $<HTMLUListElement>(".pn-proys", seccionProys);
  const cajaProy = $<HTMLElement>(".pn-proy", seccionProys);
  const formProy = $<HTMLFormElement>(".pn-proy__form", seccionProys);
  const input = <T extends HTMLElement>(n: string) => formProy.elements.namedItem(n) as unknown as T;
  const salidaProgreso = $<HTMLOutputElement>(".pn-progreso-valor", formProy);
  const rango = input<HTMLInputElement>("progreso");
  const errorProy = $<HTMLElement>(".pn-form__error", formProy);
  const cajaEstados = $<HTMLElement>(".pn-estados", formProy);
  const confirmar = $<HTMLDialogElement>(".pn-confirm", seccionProys);
  const previaCard = $<HTMLElement>(".pn-preview__card", confirmar);
  const previaNota = $<HTMLElement>(".pn-preview__note", confirmar);
  const errorConfirmar = $<HTMLElement>(".pn-confirm__error", confirmar);
  const botonConfirmarOk = $<HTMLButtonElement>(".pn-confirm__ok", confirmar);
  const botonGuardar = $<HTMLButtonElement>(".pn-save", formProy);

  // Proyecto nuevo a medias: pulsar otra vez la pestaña «Proyectos» lo descarta y vuelve la lista
  function salirDeNuevo() {
    if (!seccionProys.classList.contains("is-nuevo")) return;
    proyActual = null;
    formProy.hidden = true;
    delete cajaProy.dataset.abierto;
    seccionProys.classList.remove("is-nuevo");
    pintarProyectos();
  }

  let estados: Estado[] = [];
  let clientes: Cliente[] = [];
  let ticketsOp: TicketOpcion[] = [];
  let proyectos: Proyecto[] = [];
  let proyActual: number | null = null; // null + formulario visible = proyecto nuevo

  const infoEstado = (id: string) => estados.find((x) => x.id === id) ?? { id, emoji: "•", nombre: id };
  const estadoElegido = () => (formProy.elements.namedItem("estado") as RadioNodeList | null)?.value || "pendiente";

  async function cargarOpciones() {
    const op = await api<{ estados: Estado[]; clientes: Cliente[]; tickets: TicketOpcion[] }>("/api/panel/proyectos/opciones");
    estados = op.estados;
    clientes = op.clientes;
    ticketsOp = op.tickets ?? [];
    cajaEstados.replaceChildren(
      ...estados.map((e) => {
        const radio = h("input", { type: "radio", name: "estado", value: e.id });
        const tarjeta = h(
          "label",
          { class: "pn-estado", "data-estado": e.id },
          radio,
          h("span", { class: "pn-estado__emoji", "aria-hidden": "true" }, icono(ICONO_ESTADO[e.id] ?? "info", 17)),
          h("span", {}, e.nombre),
        );
        return tarjeta;
      }),
    );
  }

  function textoEntrega(p: Proyecto): { texto: string; tarde: boolean } | null {
    if (!p.entrega) return null;
    const fin = new Date(`${p.entrega}T12:00:00`);
    const hoy = new Date();
    hoy.setHours(12, 0, 0, 0);
    const d = Math.round((fin.getTime() - hoy.getTime()) / 86_400_000);
    const f = fin.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
    if (p.estado === "entregado") return { texto: f, tarde: false };
    if (d < 0) return { texto: `${f} · ${-d} d tarde`, tarde: true };
    return { texto: `${f} · ${d === 0 ? "hoy" : d === 1 ? "mañana" : `en ${d} d`}`, tarde: false };
  }

  function pintarProyectos() {
    const activos = proyectos.filter((p) => !["entregado", "pausado"].includes(p.estado)).length;
    const entregados = proyectos.filter((p) => p.estado === "entregado").length;
    $<HTMLElement>('[data-dato="proyActivos"]', panel).textContent = String(activos);
    $<HTMLElement>('[data-dato="proyEntregados"]', panel).textContent = String(entregados);
    $<HTMLElement>('[data-dato="nProys"]', panel).textContent = String(proyectos.length);
    $<HTMLElement>('[data-dato="proysResumen"]', panel).textContent = `${proyectos.length} en total · ${activos} en marcha`;

    listaProys.replaceChildren(
      ...proyectos.map((p, i) => {
        const e = infoEstado(p.estado);
        const entrega = textoEntrega(p);
        const b = h(
          "button",
          { type: "button", class: "pn-pitem", "data-estado": p.estado, "aria-current": p.id === proyActual ? "true" : undefined },
          h(
            "span",
            { class: "pn-pitem__top" },
            p.cliente
              ? avatar(p.cliente.avatar, p.cliente.nombre)
              : h("span", { class: "pn-avatar pn-pitem__emoji" }, icono(ICONO_ESTADO[p.estado] ?? "folder", 20)),
            h(
              "span",
              { class: "pn-pitem__title" },
              h("strong", {}, p.nombre),
              h(
                "span",
                { class: "pn-pitem__client" },
                p.cliente
                  ? `${p.cliente.nombre}${p.ticket ? ` · ticket ${p.ticket.numero}` : ` · @${p.cliente.usuario}`}`
                  : "Sin cliente vinculado",
              ),
            ),
            h("span", { class: "pn-pitem__pct" }, `${p.progreso}%`),
          ),
          h("span", { class: "pn-proyitem__barra" }, h("span", { style: `--p:${p.progreso / 100}` })),
          h(
            "span",
            { class: "pn-pitem__meta" },
            ico(ICONO_ESTADO[p.estado] ?? "info", e.nombre, { class: "pn-pitem__estado" }),
            entrega ? ico(entrega.tarde ? "alert" : "calendar", entrega.texto, { class: entrega.tarde ? "is-late" : undefined }) : null,
            ico("clock", haceCuanto(p.actualizado)),
          ),
          p.ultimoEvento ? h("span", { class: "pn-pitem__last" }, p.ultimoEvento.texto) : null,
        );
        b.addEventListener("click", () => abrirProyecto(p.id));
        b.addEventListener("contextmenu", (e) => {
          e.preventDefault();
          const r = b.getBoundingClientRect();
          // con la tecla de menú no hay coordenadas del ratón: junto a la tarjeta
          menuProyecto(p, e.clientX || r.left + 24, e.clientY || r.top + r.height / 2);
        });
        return h("li", { style: `--i:${i}` }, b);
      }),
    );
  }

  async function cargarProyectos() {
    proyectos = await api<Proyecto[]>("/api/panel/proyectos");
    pintarProyectos();
  }

  // ── menú de clic derecho sobre un proyecto de la lista ──
  // Abrir, editar, marcar como completado y, si ya está completado, borrar (con doble clic de
  // confirmación dentro del propio menú).
  const menu = h("div", { class: "pn-ctx", role: "menu", popover: "manual", "aria-label": "Acciones del proyecto" });
  document.body.append(menu);
  const menuAbierto = () => menu.matches(":popover-open") && !menu.classList.contains("is-cerrando");

  // Se cierra con animación: primero la clase .is-cerrando y, al terminar, fuera del todo
  function cerrarMenu() {
    if (!menuAbierto()) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return menu.hidePopover();
    menu.classList.add("is-cerrando");
    window.setTimeout(() => {
      menu.classList.remove("is-cerrando");
      if (menu.matches(":popover-open")) menu.hidePopover();
    }, 160);
  }

  function opcionMenu(icon: string, texto: string, pista: string, accion: (b: HTMLButtonElement) => void, extra = "") {
    const b = h(
      "button",
      { type: "button", role: "menuitem", class: `pn-ctx__item ${extra}`.trim() },
      h("span", { class: "pn-ctx__ico" }, icono(icon, 17)),
      h("span", { class: "pn-ctx__txt" }, h("span", { class: "pn-ctx__lbl" }, texto), h("span", { class: "pn-ctx__pista" }, pista)),
    );
    b.addEventListener("click", () => accion(b));
    return b;
  }

  function menuProyecto(p: Proyecto, x: number, y: number) {
    const completado = p.estado === "entregado";
    const e = infoEstado(p.estado);
    const cabeza = h(
      "div",
      { class: "pn-ctx__head", "data-estado": p.estado },
      h("span", { class: "pn-ctx__estado" }, icono(ICONO_ESTADO[p.estado] ?? "folder", 16)),
      h(
        "span",
        { class: "pn-ctx__titulo" },
        h("strong", {}, p.nombre),
        h("span", {}, `${e.nombre} · ${p.progreso}%${p.ticket ? ` · ${p.ticket.numero}` : ""}`),
      ),
      h("span", { class: "pn-ctx__barra", style: `--p:${p.progreso / 100}` }),
    );
    const opciones: (HTMLElement | null)[] = [
      cabeza,
      opcionMenu("folder", "Abrir proyecto", "Ver la ficha en el panel", () => {
        cerrarMenu();
        abrirProyecto(p.id);
      }),
      opcionMenu("edit", "Editar proyecto", "Cambiar estado, progreso o fecha", () => {
        cerrarMenu();
        abrirProyecto(p.id);
        // directo a lo que se suele cambiar: estado y progreso
        const paso = formProy.querySelectorAll<HTMLElement>(".pn-group")[1];
        paso?.scrollIntoView({ behavior: "smooth", block: "center" });
        cajaEstados.querySelector<HTMLInputElement>("input:checked")?.focus({ preventScroll: true });
      }),
      p.ticket || p.cliente
        ? opcionMenu(
            "message",
            p.ticket ? `Ir al ticket ${p.ticket.numero}` : "Ir al chat del cliente",
            p.cliente ? `Hablar con ${p.cliente.nombre}` : "Abrir la conversación",
            () => {
              cerrarMenu();
              location.href = p.ticket ? `/chat?t=${p.ticket.id}` : `/chat?c=${encodeURIComponent(p.cliente!.id)}`;
            },
          )
        : null,
      h("div", { class: "pn-ctx__sep", role: "separator" }),
      completado
        ? opcionMenu(
            "trash",
            "Borrar proyecto",
            "Ya está entregado: se puede eliminar",
            async (b) => {
              // primer clic: pide confirmación; segundo: borra
              if (!b.classList.contains("is-confirmar")) {
                b.classList.add("is-confirmar");
                b.querySelector(".pn-ctx__lbl")!.textContent = "¿Seguro?";
                b.querySelector(".pn-ctx__pista")!.textContent = "Pulsa otra vez para borrarlo";
                return;
              }
              b.disabled = true;
              try {
                await api(`/api/panel/proyectos/${p.id}`, { method: "DELETE" });
                aviso(`«${p.nombre}» borrado`);
                cerrarMenu();
                if (proyActual === p.id) {
                  proyActual = null;
                  formProy.hidden = true;
                  delete cajaProy.dataset.abierto;
                }
                await cargarOpciones(); // su ticket vuelve a quedar libre
                await cargarProyectos();
              } catch (err) {
                b.disabled = false;
                aviso(err instanceof Error ? err.message : "No se pudo borrar", true);
              }
            },
            "is-peligro",
          )
        : opcionMenu("check", "Proyecto completado", "Entregado al 100 % y avisar al cliente", () => {
            cerrarMenu();
            // Se abre con estado «Entregado» y 100 %, y sale la vista previa del aviso para confirmar
            abrirProyecto(p.id);
            const radio = cajaEstados.querySelector<HTMLInputElement>('input[value="entregado"]');
            if (radio) radio.checked = true;
            rango.value = "100";
            pintarProgreso();
            pintarColorEstado();
            formProy.requestSubmit();
          }, "is-exito"),
    ];
    const visibles = opciones.filter((o): o is HTMLElement => o !== null);
    visibles.forEach((o, i) => o.style.setProperty("--i", String(i)));
    menu.replaceChildren(...visibles);
    menu.classList.remove("is-cerrando");
    if (!menu.matches(":popover-open")) menu.showPopover();
    const ancho = menu.offsetWidth;
    const alto = menu.offsetHeight;
    const izq = Math.max(8, Math.min(x, innerWidth - ancho - 8));
    const arriba = Math.max(8, Math.min(y, innerHeight - alto - 8));
    menu.style.left = `${izq}px`;
    menu.style.top = `${arriba}px`;
    // la animación crece desde donde está el ratón
    menu.style.transformOrigin = `${x - izq}px ${y - arriba}px`;
    menu.querySelector<HTMLButtonElement>(".pn-ctx__item")?.focus({ preventScroll: true });
  }

  document.addEventListener("pointerdown", (e) => {
    if (menuAbierto() && !menu.contains(e.target as Node)) cerrarMenu();
  });
  addEventListener("scroll", cerrarMenu, { passive: true, capture: true });
  addEventListener("resize", cerrarMenu);
  addEventListener("blur", cerrarMenu);
  menu.addEventListener("keydown", (e) => {
    const items = [...menu.querySelectorAll<HTMLButtonElement>(".pn-ctx__item")];
    const i = items.indexOf(document.activeElement as HTMLButtonElement);
    if (e.key === "Escape") cerrarMenu();
    else if (e.key === "ArrowDown") items[(i + 1) % items.length]?.focus();
    else if (e.key === "ArrowUp") items[(i - 1 + items.length) % items.length]?.focus();
    else return;
    e.preventDefault();
  });

  // ── controles del editor ──

  function pintarProgreso() {
    const v = Number(rango.value);
    salidaProgreso.textContent = `${v}%`;
    rango.style.setProperty("--v", `${v}%`);
    formProy.querySelectorAll<HTMLButtonElement>("[data-prog]").forEach((b) =>
      b.setAttribute("aria-pressed", String(Number(b.dataset.prog) === v)),
    );
  }

  function pintarColorEstado() {
    // El color del estado tiñe la barra de progreso y el título del editor
    formProy.dataset.estado = estadoElegido();
  }

  // ── ticket del proyecto ──
  // Se elige un ticket (chat) ya creado; el cliente es quien lo abrió. Los inputs ocultos
  // ticketId y clienteId guardan la elección.
  const tkLista = $<HTMLElement>(".pn-tks__list", formProy);
  const tkBuscar = $<HTMLInputElement>(".pn-tks__buscar input", formProy);
  const tkElegido = $<HTMLElement>(".pn-tks__elegido", formProy);
  let tkFiltro: "abiertos" | "todos" = "abiertos";

  const ticketElegido = () => {
    const id = Number(input<HTMLInputElement>("ticketId").value);
    return id ? ticketsOp.find((t) => t.id === id) ?? null : null;
  };

  function pintarCliente() {
    pintarTickets();
  }

  function elegirTicket(t: TicketOpcion | null) {
    input<HTMLInputElement>("ticketId").value = t ? String(t.id) : "";
    const cliente = input<HTMLInputElement>("clienteId");
    cliente.value = t ? t.cliente.id : "";
    tkBuscar.value = "";
    cliente.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function filaTicket(t: TicketOpcion, elegido: boolean) {
    return [
      avatar(t.cliente.avatar, t.cliente.nombre),
      h(
        "span",
        { class: "pn-tk__text" },
        h(
          "span",
          { class: "pn-tk__top" },
          h("span", { class: "pn-tk__num mono" }, t.numero),
          h("strong", {}, t.asunto || "Sin asunto"),
          h("span", { class: `pn-tk__estado${t.cerrado ? " is-cerrado" : ""}` }, t.cerrado ? "cerrado" : "abierto"),
        ),
        h("span", { class: "pn-tk__cli" }, `${t.cliente.nombre} · @${t.cliente.usuario}`),
        t.ultimoTexto && !elegido ? h("span", { class: "pn-tk__ultimo" }, t.ultimoTexto) : null,
      ),
    ];
  }

  function pintarTickets() {
    const elegido = ticketElegido();
    const clienteSuelto = !elegido && clientes.find((x) => x.id === input<HTMLInputElement>("clienteId").value);

    tkElegido.hidden = !elegido && !clienteSuelto;
    if (elegido) {
      const quitar = h("button", { type: "button", class: "pn-elegido__quitar" }, "Cambiar");
      quitar.addEventListener("click", () => elegirTicket(null));
      tkElegido.replaceChildren(...filaTicket(elegido, true), quitar);
    } else if (clienteSuelto) {
      // proyecto antiguo, vinculado a un cliente sin ticket concreto
      tkElegido.replaceChildren(
        avatar(clienteSuelto.avatar, clienteSuelto.nombre),
        h(
          "span",
          { class: "pn-tk__text" },
          h("strong", {}, clienteSuelto.nombre),
          h("span", { class: "pn-tk__cli" }, "Sin ticket concreto: elige uno abajo para vincularlo"),
        ),
      );
    } else tkElegido.replaceChildren();

    const barra = $<HTMLElement>(".pn-tks__barra", formProy);
    barra.hidden = !!elegido;
    tkLista.hidden = !!elegido;
    if (elegido) return tkLista.replaceChildren();

    formProy.querySelectorAll<HTMLButtonElement>("[data-tk-filtro]").forEach((b) =>
      b.setAttribute("aria-pressed", String(b.dataset.tkFiltro === tkFiltro)),
    );
    const q = tkBuscar.value.trim().toLowerCase().replace(/^[@#]/, "");
    const lista = ticketsOp
      .filter((t) => tkFiltro === "todos" || !t.cerrado)
      .filter((t) => !q || `${t.numero} ${t.id} ${t.asunto ?? ""} ${t.cliente.nombre} ${t.cliente.usuario}`.toLowerCase().includes(q));
    tkLista.replaceChildren(
      ...lista.map((t) => {
        // un proyecto por ticket: los que ya tienen otro salen bloqueados
        const ocupado = t.proyecto && t.proyecto.id !== proyActual ? t.proyecto : null;
        const b = h(
          "button",
          {
            type: "button",
            class: `pn-tk${ocupado ? " is-ocupado" : ""}`,
            role: "option",
            "aria-selected": "false",
            "aria-disabled": ocupado ? "true" : undefined,
            disabled: !!ocupado,
            title: ocupado ? `Ya tiene el proyecto «${ocupado.nombre}»` : undefined,
          },
          ...filaTicket(t, false),
        );
        if (ocupado) b.querySelector(".pn-tk__text")!.append(h("span", { class: "pn-tk__ocupado" }, icono("folder", 12), `Ya tiene «${ocupado.nombre}»`));
        else b.addEventListener("click", () => elegirTicket(t));
        return b;
      }),
    );
    if (!lista.length) {
      tkLista.append(
        h(
          "p",
          { class: "pn-muted pn-tks__vacio" },
          ticketsOp.length
            ? q
              ? "Ningún ticket coincide."
              : "No hay tickets abiertos. Pulsa «Todos» para ver también los cerrados."
            : "Aún no hay tickets. El cliente tiene que abrir uno desde el chat.",
        ),
      );
    }
  }

  tkBuscar.addEventListener("input", pintarTickets);
  tkBuscar.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    tkLista.querySelector<HTMLButtonElement>(".pn-tk:not(:disabled)")?.click();
  });
  formProy.querySelectorAll<HTMLButtonElement>("[data-tk-filtro]").forEach((b) =>
    b.addEventListener("click", () => {
      tkFiltro = b.dataset.tkFiltro === "todos" ? "todos" : "abiertos";
      pintarTickets();
    }),
  );

  // ── fecha de entrega: calendario propio ──
  const fechaCampo = input<HTMLInputElement>("entrega");
  const fechaBtn = $<HTMLButtonElement>(".pn-fecha__btn", formProy);
  const cal = $<HTMLElement>(".pn-cal", formProy);
  const calDias = $<HTMLElement>(".pn-cal__dias", cal);
  const calMes = $<HTMLElement>(".pn-cal__mes", cal);
  let calVista = new Date();

  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const hoyIso = () => iso(new Date());

  function pintarFecha() {
    const v = fechaCampo.value;
    const valor = $<HTMLElement>(".pn-fecha__valor", fechaBtn);
    const sub = $<HTMLElement>(".pn-fecha__sub", fechaBtn);
    fechaBtn.classList.toggle("is-vacia", !v);
    if (!v) {
      valor.textContent = "Sin fecha";
      sub.textContent = "Pulsa para elegir el día";
      return;
    }
    const f = new Date(`${v}T12:00:00`);
    const hoy = new Date();
    hoy.setHours(12, 0, 0, 0);
    const dias = Math.round((f.getTime() - hoy.getTime()) / 86_400_000);
    valor.textContent = f.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    sub.textContent =
      dias === 0 ? "Hoy" : dias === 1 ? "Mañana" : dias > 0 ? `Dentro de ${dias} días` : `Hace ${-dias} días · ya ha pasado`;
  }

  function pintarCalendario() {
    const y = calVista.getFullYear();
    const m = calVista.getMonth();
    const titulo = new Date(y, m, 1).toLocaleDateString("es-ES", { month: "long", year: "numeric" });
    calMes.textContent = titulo.charAt(0).toUpperCase() + titulo.slice(1);
    const hueco = (new Date(y, m, 1).getDay() + 6) % 7; // lunes = 0
    const total = new Date(y, m + 1, 0).getDate();
    const elegida = fechaCampo.value;
    const hoy = hoyIso();
    const celdas: HTMLElement[] = [];
    for (let i = 0; i < hueco; i++) celdas.push(h("span", { class: "pn-cal__hueco", "aria-hidden": "true" }));
    for (let d = 1; d <= total; d++) {
      const valor = iso(new Date(y, m, d));
      const b = h(
        "button",
        {
          type: "button",
          class: `pn-cal__dia${valor === hoy ? " is-hoy" : ""}${valor === elegida ? " is-elegido" : ""}${valor < hoy ? " is-pasado" : ""}`,
          "aria-pressed": String(valor === elegida),
          "aria-label": new Date(y, m, d).toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" }),
        },
        String(d),
      );
      b.addEventListener("click", () => {
        fechaCampo.value = valor;
        fechaCampo.dispatchEvent(new Event("change", { bubbles: true }));
        cerrarCalendario(true);
      });
      celdas.push(b);
    }
    calDias.replaceChildren(...celdas);
  }

  // El calendario va en la capa superior (popover): se coloca junto al botón, debajo o, si no
  // cabe, encima; y se recoloca al hacer scroll o cambiar el tamaño de la ventana.
  const calAbierto = () => cal.matches(":popover-open");

  function colocarCalendario() {
    const r = fechaBtn.getBoundingClientRect();
    const alto = cal.offsetHeight;
    const ancho = cal.offsetWidth;
    const arriba = r.bottom + 8 + alto > innerHeight && r.top - 8 - alto > 0;
    cal.classList.toggle("is-arriba", arriba);
    cal.style.top = `${arriba ? r.top - 8 - alto : Math.min(r.bottom + 8, innerHeight - alto - 8)}px`;
    cal.style.left = `${Math.max(8, Math.min(r.left, innerWidth - ancho - 8))}px`;
  }

  function abrirCalendario() {
    calVista = fechaCampo.value ? new Date(`${fechaCampo.value}T12:00:00`) : new Date();
    pintarCalendario();
    cal.showPopover();
    colocarCalendario();
    fechaBtn.setAttribute("aria-expanded", "true");
    (cal.querySelector<HTMLButtonElement>(".is-elegido") ?? cal.querySelector<HTMLButtonElement>(".is-hoy"))?.focus({ preventScroll: true });
  }

  function cerrarCalendario(enfocar = false) {
    if (!calAbierto()) return;
    cal.hidePopover();
    fechaBtn.setAttribute("aria-expanded", "false");
    if (enfocar) fechaBtn.focus({ preventScroll: true });
  }

  addEventListener("scroll", () => calAbierto() && colocarCalendario(), { passive: true, capture: true });
  addEventListener("resize", () => calAbierto() && colocarCalendario());
  fechaBtn.addEventListener("click", () => (calAbierto() ? cerrarCalendario() : abrirCalendario()));
  cal.querySelectorAll<HTMLButtonElement>("[data-cal]").forEach((b) =>
    b.addEventListener("click", () => {
      calVista = new Date(calVista.getFullYear(), calVista.getMonth() + Number(b.dataset.cal), 1);
      pintarCalendario();
    }),
  );
  document.addEventListener("click", (e) => {
    if (calAbierto() && !(e.target as HTMLElement).closest(".pn-fecha")) cerrarCalendario();
  });
  cal.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      cerrarCalendario(true);
    }
  });
  fechaCampo.addEventListener("change", pintarFecha);

  // Fechas rápidas (dentro del calendario)
  formProy.querySelectorAll<HTMLButtonElement>("[data-dias]").forEach((b) =>
    b.addEventListener("click", () => {
      if (!b.dataset.dias) fechaCampo.value = "";
      else {
        const d = new Date();
        d.setDate(d.getDate() + Number(b.dataset.dias));
        fechaCampo.value = iso(d);
      }
      fechaCampo.dispatchEvent(new Event("change", { bubbles: true }));
      cerrarCalendario(true);
    }),
  );

  formProy.querySelectorAll<HTMLButtonElement>("[data-prog]").forEach((b) =>
    b.addEventListener("click", () => {
      rango.value = b.dataset.prog ?? "0";
      pintarProgreso();
    }),
  );

  rango.addEventListener("input", pintarProgreso);
  input<HTMLInputElement>("clienteId").addEventListener("change", pintarCliente);
  cajaEstados.addEventListener("change", pintarColorEstado);

  // ── vista previa del aviso ──

  function valoresFormulario() {
    return {
      nombre: input<HTMLInputElement>("nombre").value.trim(),
      clienteId: input<HTMLInputElement>("clienteId").value,
      // null = no se toca (proyecto antiguo sin ticket: manda clienteId)
      ticketId: Number(input<HTMLInputElement>("ticketId").value) || null,
      estado: estadoElegido(),
      progreso: Number(rango.value),
      entrega: input<HTMLInputElement>("entrega").value,
      descripcion: input<HTMLTextAreaElement>("descripcion").value.trim(),
      nota: input<HTMLTextAreaElement>("nota").value.trim(),
      avisar: input<HTMLInputElement>("avisar").checked,
    };
  }

  function publicoDesdeFormulario(v: ReturnType<typeof valoresFormulario>, id: number): ProyectoPublico {
    const e = infoEstado(v.estado);
    return {
      id,
      nombre: v.nombre || "Proyecto sin nombre",
      descripcion: v.descripcion,
      estado: v.estado,
      emoji: e.emoji,
      estadoTexto: e.nombre,
      progreso: v.progreso,
      entrega: v.entrega || null,
      actualizado: Date.now() / 1000,
      ultimaNovedad: null,
    };
  }

  /** Lo mismo que hará la API al guardar (api/proyectos.py): qué aviso se mandaría. */
  function avisoPrevisto(): { datos: DatosAviso; nota: string; activo: boolean } {
    const v = valoresFormulario();
    const antes = proyActual === null ? null : proyectos.find((x) => x.id === proyActual) ?? null;
    const publico = publicoDesdeFormulario(v, antes?.id ?? 0);
    const nota = v.nota || null;

    if (!v.clienteId) {
      return { datos: { tipo: "estado", proyectos: [publico] }, nota: "Sin cliente: no se enviará ningún aviso.", activo: false };
    }
    if (!antes) {
      return {
        datos: { tipo: "nuevo", proyecto: publico, nota },
        nota: v.avisar ? "Se enviará al crear el proyecto." : "Aviso desactivado.",
        activo: v.avisar,
      };
    }
    if (antes.cliente?.id !== v.clienteId) {
      return {
        datos: { tipo: "vinculado", proyecto: publico, nota },
        nota: v.avisar ? "El proyecto se vinculará a este cliente." : "Aviso desactivado.",
        activo: v.avisar,
      };
    }
    const cambios: Cambio[] = [];
    const anterior: Record<Cambio["campo"], string | number | null> = {
      nombre: antes.nombre,
      estado: antes.estado,
      progreso: antes.progreso,
      entrega: antes.entrega,
      descripcion: antes.descripcion,
    };
    const actual: Record<Cambio["campo"], string | number | null> = {
      nombre: v.nombre,
      estado: v.estado,
      progreso: v.progreso,
      entrega: v.entrega || null,
      descripcion: v.descripcion,
    };
    for (const campo of ["nombre", "estado", "progreso", "entrega", "descripcion"] as Cambio["campo"][]) {
      if ((anterior[campo] ?? "") !== (actual[campo] ?? "")) cambios.push({ campo, antes: anterior[campo], despues: actual[campo] });
    }
    if (!cambios.length && !nota) {
      return {
        datos: { tipo: "estado", proyectos: [publico] },
        nota: "Sin cambios todavía: cambia algo o escribe una nota para avisar al cliente.",
        activo: false,
      };
    }
    return {
      datos: { tipo: "actualizacion", proyecto: publico, cambios, nota },
      nota: v.avisar ? "Se enviará al guardar." : "Aviso desactivado.",
      activo: v.avisar,
    };
  }

  function pintarPrevia() {
    const { datos, nota, activo } = avisoPrevisto();
    previaCard.replaceChildren(tarjetaAviso(datos, { animar: true }));
    previaCard.classList.toggle("is-off", !activo);
    previaNota.textContent = nota;
  }

  // ── abrir / guardar / borrar ──

  async function pintarHistorial(id: number) {
    const caja = $<HTMLElement>(".pn-proy__hist", formProy);
    const lista = $<HTMLOListElement>(".pn-hist", formProy);
    try {
      const eventos = await api<Evento[]>(`/api/panel/proyectos/${id}/eventos`);
      lista.replaceChildren(
        ...eventos.map((e, i) =>
          h(
            "li",
            { style: `--i:${i}` },
            h("time", {}, `${fecha.format(new Date(e.creado * 1000))} · ${haceCuanto(e.creado)}`),
            h("span", {}, e.texto, e.avisado ? h("span", { class: "pn-pill is-on" }, "avisado") : null),
          ),
        ),
      );
      caja.hidden = !eventos.length;
    } catch {
      caja.hidden = true;
    }
  }

  function abrirProyecto(id: number | null, animar = true) {
    proyActual = id;
    const p = id === null ? null : proyectos.find((x) => x.id === id);
    if (id !== null && !p) return;
    cajaProy.dataset.abierto = "";
    formProy.hidden = false;
    formProy.reset();
    // Proyecto nuevo: el editor ocupa también el sitio de la lista de proyectos
    seccionProys.classList.toggle("is-nuevo", id === null);
    errorProy.textContent = "";

    $<HTMLElement>(".pn-proy__titulo", formProy).textContent = p ? p.nombre : "Nuevo proyecto";
    $<HTMLElement>(".pn-proy__kicker", formProy).textContent = p
      ? `proyecto #${p.id} · actualizado ${haceCuanto(p.actualizado)}`
      : "nuevo proyecto";
    input<HTMLInputElement>("nombre").value = p?.nombre ?? "";
    // El nombre solo se elige al crear el proyecto; después queda fijo
    input<HTMLInputElement>("nombre").readOnly = !!p;
    input<HTMLInputElement>("nombre").title = p ? "El nombre del proyecto no se puede cambiar después de crearlo" : "";
    input<HTMLInputElement>("clienteId").value = p?.cliente?.id ?? "";
    input<HTMLInputElement>("ticketId").value = p?.ticket ? String(p.ticket.id) : "";
    tkFiltro = "abiertos";
    cerrarCalendario();
    const radio = cajaEstados.querySelector<HTMLInputElement>(`input[value="${p?.estado ?? estados[0]?.id ?? "pendiente"}"]`);
    if (radio) radio.checked = true;
    rango.value = String(p?.progreso ?? 0);
    input<HTMLInputElement>("entrega").value = p?.entrega ?? "";
    input<HTMLTextAreaElement>("descripcion").value = p?.descripcion ?? "";
    input<HTMLInputElement>("avisar").checked = true;
    $<HTMLElement>(".pn-save__txt", botonGuardar).textContent = p ? "Guardar cambios" : "Crear proyecto";
    pintarProgreso();
    pintarColorEstado();
    pintarCliente();
    pintarFecha();

    const borrar = $<HTMLElement>(".pn-proy__borrar", formProy);
    borrar.replaceChildren(
      p
        ? botonConfirmar("Eliminar", `¿Eliminar «${p.nombre}»? (no se avisa al cliente)`, async () => {
            await api(`/api/panel/proyectos/${p.id}`, { method: "DELETE" });
            aviso(`«${p.nombre}» eliminado`);
            proyActual = null;
            formProy.hidden = true;
            delete cajaProy.dataset.abierto;
            await cargarOpciones();
            await cargarProyectos();
          })
        : "",
    );

    if (p) pintarHistorial(p.id);
    else $<HTMLElement>(".pn-proy__hist", formProy).hidden = true;
    pintarProyectos();

    if (animar) {
      formProy.classList.remove("is-entering");
      void formProy.offsetWidth; // reinicia la animación de entrada
      formProy.classList.add("is-entering");
    }
    if (!p) input<HTMLInputElement>("nombre").focus({ preventScroll: true });
  }

  // Pulsar «Crear proyecto» / «Guardar cambios» solo abre la vista previa; se guarda al confirmar
  formProy.addEventListener("submit", (e) => {
    e.preventDefault();
    errorProy.textContent = "";
    const v = valoresFormulario();
    if (!v.nombre) {
      errorProy.textContent = "Ponle un nombre al proyecto.";
      input<HTMLInputElement>("nombre").focus();
      return;
    }
    const nuevo = proyActual === null;
    if (nuevo && !v.ticketId) {
      errorProy.textContent = "Elige el ticket (chat) al que va este proyecto.";
      tkBuscar.focus();
      return;
    }
    $<HTMLElement>(".pn-confirm__kicker", confirmar).textContent = nuevo ? "revisa antes de crear" : "revisa antes de guardar";
    botonConfirmarOk.textContent = nuevo ? "Confirmar y crear" : "Confirmar y guardar";
    errorConfirmar.textContent = "";
    pintarPrevia();
    confirmar.showModal();
    botonConfirmarOk.focus();
  });

  confirmar.querySelectorAll<HTMLButtonElement>('[data-confirm="volver"]').forEach((b) =>
    b.addEventListener("click", () => confirmar.close()),
  );
  // clic fuera de la ventana = volver a editar
  confirmar.addEventListener("click", (e) => {
    if (e.target === confirmar) confirmar.close();
  });
  botonConfirmarOk.addEventListener("click", guardarProyecto);

  async function guardarProyecto() {
    const datos = valoresFormulario();
    const { activo } = avisoPrevisto();
    errorConfirmar.textContent = "";
    botonConfirmarOk.disabled = true;
    botonGuardar.disabled = true;
    botonGuardar.classList.add("is-loading");
    try {
      const antes = proyActual === null ? null : proyectos.find((x) => x.id === proyActual);
      const p = await api<Proyecto>(proyActual === null ? "/api/panel/proyectos" : `/api/panel/proyectos/${proyActual}`, {
        method: proyActual === null ? "POST" : "PATCH",
        body: JSON.stringify(datos),
      });
      const huboCambios = !antes || p.actualizado !== antes.actualizado;
      const creado = !antes ? "Proyecto creado" : "Guardado";
      aviso(!huboCambios ? "No había cambios" : activo && p.cliente ? `${creado} · avisado en el chat de ${p.cliente.nombre}` : creado);
      confirmar.close();
      await cargarOpciones(); // el ticket queda ocupado por este proyecto
      await cargarProyectos();
      abrirProyecto(p.id, false);
      botonGuardar.classList.remove("is-loading");
      botonGuardar.classList.add("is-done");
      $<HTMLElement>(".pn-save__txt", botonGuardar).textContent = `✓ ${creado}`;
      window.setTimeout(() => {
        botonGuardar.classList.remove("is-done");
        $<HTMLElement>(".pn-save__txt", botonGuardar).textContent = "Guardar cambios";
      }, 1600);
    } catch (err) {
      // la ventana sigue abierta para poder reintentar o volver a editar
      errorConfirmar.textContent = err instanceof Error ? err.message : "No se pudo guardar";
    } finally {
      botonConfirmarOk.disabled = false;
      botonGuardar.disabled = false;
      botonGuardar.classList.remove("is-loading");
    }
  }

  panel.querySelectorAll('[data-accion="nuevo-proyecto"]').forEach((b) =>
    b.addEventListener("click", () => abrirProyecto(null)),
  );

  // ── opiniones ──────────────────────────────
  // Las que dejan los visitantes desde la portada (debajo de las preguntas).

  interface Opinion {
    id: number;
    tema: string;
    temaTexto: string;
    puntuacion: number;
    texto: string;
    nombre: string | null;
    contacto: string | null;
    usuario: Cliente | null;
    creado: number;
    leida: boolean;
  }

  const seccionOps = $<HTMLElement>('[data-panel="opiniones"]', panel);
  const listaOps = $<HTMLUListElement>(".pn-ops__lista", seccionOps);
  let opiniones: Opinion[] = [];
  const verOp = $<HTMLDialogElement>(".pn-opver", seccionOps);
  const verOpCuerpo = $<HTMLElement>(".pn-opver__body", verOp);

  // Abre la opinión en grande: crece desde la tarjeta pulsada hasta el centro
  function abrirOpinion(tarjeta: HTMLElement) {
    const copia = tarjeta.cloneNode(true) as HTMLElement;
    copia.querySelector(".pn-op__acciones")?.remove();
    verOpCuerpo.replaceChildren(copia);
    const r = tarjeta.getBoundingClientRect();
    verOp.style.setProperty("--dx", `${r.left + r.width / 2 - innerWidth / 2}px`);
    verOp.style.setProperty("--dy", `${r.top + r.height / 2 - innerHeight / 2}px`);
    verOp.classList.remove("is-cerrando");
    verOp.showModal();
  }

  function cerrarOpinion() {
    if (!verOp.open || verOp.classList.contains("is-cerrando")) return;
    verOp.classList.add("is-cerrando");
    verOp.addEventListener(
      "animationend",
      () => {
        verOp.classList.remove("is-cerrando");
        verOp.close();
      },
      { once: true },
    );
  }

  $<HTMLButtonElement>(".pn-opver__cerrar", verOp).addEventListener("click", cerrarOpinion);
  verOp.addEventListener("click", (e) => {
    if (e.target === verOp) cerrarOpinion(); // clic en el fondo
  });
  verOp.addEventListener("cancel", (e) => {
    e.preventDefault(); // Esc: cierra con la misma animación
    cerrarOpinion();
  });

  function pintarBadgeOpiniones(n: number) {
    const badge = $<HTMLElement>('[data-dato="opinionesNav"]', panel);
    badge.textContent = String(n);
    badge.hidden = !n;
  }

  function estrellas(n: number) {
    const caja = h("span", { class: "pn-op__estrellas", "aria-label": `${n} de 5` });
    for (let i = 1; i <= 5; i++) {
      const s = h("span", { class: i <= n ? "is-on" : undefined, "aria-hidden": "true" });
      s.innerHTML =
        '<svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor"><path d="M12 2.8l2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3L2.9 9.5l6.3-.9L12 2.8z"/></svg>';
      caja.append(s);
    }
    return caja;
  }

  function pintarOpiniones() {
    const sinLeer = opiniones.filter((o) => !o.leida).length;
    const media = opiniones.length ? opiniones.reduce((s, o) => s + o.puntuacion, 0) / opiniones.length : 0;
    $<HTMLElement>('[data-dato="opsResumen"]', panel).textContent = opiniones.length
      ? `${opiniones.length} en total · ${sinLeer} sin leer · media ${media.toFixed(1)} / 5`
      : "aún no hay ninguna";
    pintarBadgeOpiniones(sinLeer);

    const lista = opiniones;
    listaOps.replaceChildren(
      ...lista.map((o, i) => {
        const marcar = h("button", { type: "button", class: "btn btn-ghost pn-btn-sm" }, o.leida ? "Marcar como no leída" : "Marcar como leída");
        marcar.addEventListener("click", async () => {
          try {
            const nueva = await api<Opinion>(`/api/panel/opiniones/${o.id}/leida`, {
              method: "POST",
              body: JSON.stringify({ leida: !o.leida }),
            });
            opiniones = opiniones.map((x) => (x.id === o.id ? nueva : x));
            pintarOpiniones();
          } catch (e) {
            aviso(e instanceof Error ? e.message : "No se pudo cambiar", true);
          }
        });
        const borrar = botonConfirmar("Eliminar", "¿Eliminar esta opinión?", async () => {
          await api(`/api/panel/opiniones/${o.id}`, { method: "DELETE" });
          opiniones = opiniones.filter((x) => x.id !== o.id);
          aviso("Opinión eliminada");
          pintarOpiniones();
        });
        const quien = o.usuario
          ? [avatar(o.usuario.avatar, o.usuario.nombre), `${o.nombre || o.usuario.nombre} · @${o.usuario.usuario}`]
          : [o.nombre || "Anónimo"];
        const tarjeta = h(
          "article",
          { class: `pn-op${o.leida ? "" : " is-nueva"}`, tabindex: "0", title: "Ver en grande" },
          h(
            "div",
            { class: "pn-op__top" },
            estrellas(o.puntuacion),
            h("span", { class: "pn-op__tema" }, o.temaTexto),
            h("time", { class: "pn-op__fecha", title: fecha.format(new Date(o.creado * 1000)) }, haceCuanto(o.creado)),
          ),
          h("p", { class: "pn-op__texto" }, o.texto),
          h("div", { class: "pn-op__quien" }, ...quien, o.contacto ? h("span", { class: "mono" }, ` · ${o.contacto}`) : null),
          h("div", { class: "pn-op__acciones" }, marcar, borrar),
        );
        tarjeta.addEventListener("click", (e) => {
          // Los botones de la tarjeta (leída, eliminar) hacen lo suyo, no la abren
          if ((e.target as HTMLElement).closest("button, a, .pn-op__acciones")) return;
          abrirOpinion(tarjeta);
        });
        tarjeta.addEventListener("keydown", (e) => {
          if (e.target === tarjeta && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            abrirOpinion(tarjeta);
          }
        });
        return h("li", { style: `--i:${i}` }, tarjeta);
      }),
    );
    if (!lista.length) {
      listaOps.append(h("li", { class: "pn-ops__vacio" }, "Aún no ha llegado ninguna opinión."));
    }
  }

  async function cargarOpiniones() {
    opiniones = await api<Opinion[]>("/api/panel/opiniones");
    pintarOpiniones();
  }


  // ── secciones ──────────────────────────────

  type Seccion = "proyectos" | "bots" | "estado" | "opiniones";
  let botsCargados = false;

  async function irASeccion(s: Seccion) {
    if (s === "proyectos") salirDeNuevo();
    panel.querySelectorAll<HTMLButtonElement>("button[data-seccion]").forEach((b) =>
      b.setAttribute("aria-pressed", String(b.dataset.seccion === s)),
    );
    panel.querySelectorAll<HTMLElement>("[data-panel]").forEach((p) => (p.hidden = p.dataset.panel !== s));
    try {
      localStorage.setItem("aj-panel-seccion", s);
    } catch {}
    // Las opiniones se piden cada vez que se abre su pestaña (pueden llegar nuevas)
    if (s === "opiniones") {
      cargarOpiniones().catch((e) => aviso(e instanceof Error ? e.message : "Error al cargar las opiniones", true));
    }
    // Los bots se piden a Discord: solo al abrir su sección por primera vez
    if (s === "bots" && !botsCargados) {
      botsCargados = true;
      listaBots.replaceChildren(h("li", { class: "pn-muted mono", style: "padding:1rem" }, "cargando bots…"));
      try {
        await cargarBots();
        const desdeUrl = Number(location.hash.match(/^#bot-(\d+)$/)?.[1]);
        const primero = bots.find((b) => b.id === desdeUrl) ?? bots[0];
        if (primero) abrirBot(primero.id);
      } catch (e) {
        aviso(e instanceof Error ? e.message : "Error al cargar los bots", true);
      }
    }
  }

  panel.querySelectorAll<HTMLButtonElement>("button[data-seccion]").forEach((b) =>
    b.addEventListener("click", () => irASeccion(b.dataset.seccion as Seccion)),
  );

  // ── arranque ───────────────────────────────

  async function arrancar() {
    let yo: Yo;
    try {
      yo = await api<Yo>("/api/me");
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) return; // api() ya ha mandado a /login
      const p = $<HTMLElement>(".pn-gate__error", panel);
      p.textContent = "La API no responde. ¿Está arrancada?";
      p.hidden = false;
      return mostrar("login");
    }
    if (!yo.admin) return mostrar("denegado");

    const miAvatar = Object.assign(avatar(yo.avatar, yo.nombre), { title: yo.nombre });
    miAvatar.classList.add("pn-me__avatar");
    $<HTMLElement>('[data-dato="miAvatar"]', panel).replaceWith(miAvatar);
    $<HTMLElement>('[data-dato="miNombre"]', panel).textContent = yo.nombre;
    $<HTMLElement>('[data-dato="miUsuario"]', panel).textContent = `@${yo.usuario}`;
    const hora = new Date().getHours();
    $<HTMLElement>('[data-dato="saludo"]', panel).textContent =
      `${hora < 14 ? "Buenos días" : hora < 21 ? "Buenas tardes" : "Buenas noches"}, ${yo.nombre.split(" ")[0]} 👋`;
    mostrar("panel");

    try {
      resumen = await api<Resumen>("/api/panel/resumen");
      $<HTMLElement>('[data-dato="sinLeer"]', panel).textContent = String(resumen.chatSinLeer);
      $<HTMLElement>('[data-dato="bots"]', panel).textContent = String(resumen.bots);
      const badge = $<HTMLElement>('[data-dato="sinLeerNav"]', panel);
      badge.textContent = String(resumen.chatSinLeer);
      badge.hidden = !resumen.chatSinLeer;
      pintarBadgeOpiniones(resumen.opinionesSinLeer ?? 0);

      await cargarOpciones();
      await cargarProyectos();
      $<HTMLElement>('[data-dato="clientes"]', panel).textContent = String(clientes.length);
      $<HTMLElement>('[data-dato="nBots"]', panel).textContent = String(resumen.bots);
    } catch (e) {
      aviso(e instanceof Error ? e.message : "Error al cargar el panel", true);
    }

    let inicial: Seccion = "proyectos";
    try {
      const guardada = localStorage.getItem("aj-panel-seccion");
      if (guardada === "bots" || guardada === "estado" || guardada === "opiniones") inicial = guardada;
    } catch {}
    if (location.hash.startsWith("#bot-")) inicial = "bots";
    irASeccion(inicial);
  }

  arrancar();
}
