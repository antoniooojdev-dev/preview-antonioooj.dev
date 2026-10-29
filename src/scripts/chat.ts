// Chat de /chat, organizado en tickets: cada ticket es una conversación propia y un
// cliente puede tener varios abiertos a la vez (uno por tema).
// - Sin sesión: se va a /login?volver=/chat.
// - Cliente: lista de sus tickets, «Nuevo ticket» (con asunto opcional) y la conversación
//   del ticket elegido. Comandos: /estado-proyecto.
// - Admin (ADMIN_DISCORD_IDS en api/.env): todos los tickets de todos los clientes.
//   /chat?t=<id de ticket> abre ese ticket; /chat?c=<id de Discord> abre el último ticket
//   de ese cliente (o le abre uno si no tiene ninguno).
// - /chat?nuevo (cliente) abre directamente el formulario de «Nuevo ticket».
// Al cerrar un ticket la conversación se queda guardada en él (ya no hay transcripción por MD).
// Los mensajes nuevos se piden cada pocos segundos mientras la pestaña está visible.

import { cerrarSesion, urlLogin } from "@/scripts/sesion";
import { sinEmojis, tarjetaAviso, type DatosAviso } from "@/scripts/proyectos-ui";
import { icono } from "@/data/iconos";
import { pildora } from "@/scripts/pildora";
import { localeActual } from "@/scripts/i18n";
// Idioma: los textos fijos se escriben en español y los traduce i18n.ts al vuelo (también los
// que llevan números, ver src/i18n/textos/patrones.ts). Lo que escribe la gente (mensajes,
// nombres, asuntos) va con data-no-i18n para que nunca se toque.

const CLAVE_NUEVO = "aj-chat-nuevo";

interface Usuario {
  id: string;
  usuario: string;
  nombre: string;
  avatar: string | null;
}

interface Comando {
  nombre: string;
  descripcion: string;
}

interface Yo extends Usuario {
  admin: boolean;
  adminNombre: string;
  comandos: Comando[];
}

interface Mensaje {
  id: number;
  de: "cliente" | "admin" | "sistema";
  texto: string;
  creado: number;
  /** Avisos del sistema con datos: se pintan como tarjeta (src/scripts/proyectos-ui.ts) */
  datos?: DatosAviso;
}

interface Ticket {
  id: number;
  numero: string;
  asunto: string | null;
  abierto: number;
  cerrado: number | null;
  cerradoPor: string | null;
  ultimo?: { de: Mensaje["de"]; texto: string; creado: number; id: number } | null;
  sinLeer?: number;
  mensajes?: number;
  /** Solo para el admin */
  usuario?: Usuario;
  proyectos?: number;
}

interface RespuestaMensajes {
  mensajes: Mensaje[];
  visto: number;
  usuario?: Usuario;
  ticket?: Ticket;
}

const POLL_CHAT = 3000;
const POLL_LISTA = 5000;
const MAX_TEXTO = 2000;

const app = document.querySelector<HTMLElement>("#chat-app");
if (app) iniciar(app);

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

function iniciar(app: HTMLElement) {
  const API = app.dataset.api ?? "";
  const respuesta = app.dataset.responseTime ?? "";
  const $ = <T extends Element>(sel: string) => app.querySelector<T>(sel)!;

  const main = $<HTMLElement>(".chat-main");
  const lista = $<HTMLUListElement>(".chat-convs__list");
  const msgs = $<HTMLElement>(".chat-msgs");
  const form = $<HTMLFormElement>(".chat-form");
  const texto = $<HTMLTextAreaElement>("#chat-text");
  const enviarBtn = $<HTMLButtonElement>(".chat-send");
  const errorForm = $<HTMLElement>(".chat-form__error");
  const contador = $<HTMLElement>(".chat-form__count");
  const paneAvatar = $<HTMLElement>(".chat-pane__avatar");
  const paneNombre = $<HTMLElement>(".chat-pane__name");
  const paneSub = $<HTMLElement>(".chat-pane__sub");
  const meAvatar = $<HTMLElement>(".chat-me__avatar");
  const meNombre = $<HTMLElement>(".chat-me__name");
  const cajaTicket = $<HTMLElement>(".chat-ticket");
  const badgeTicket = $<HTMLElement>(".chat-ticket__badge");
  const botonCerrar = $<HTMLButtonElement>(".chat-ticket__close");
  const confirmar = $<HTMLElement>(".chat-ticket__confirm");
  const buscador = $<HTMLInputElement>(".chat-search__input");
  const cuenta = $<HTMLElement>(".chat-convs__count");
  const botonNuevo = $<HTMLButtonElement>(".chat-new");
  const formNuevo = $<HTMLFormElement>(".chat-newform");
  const notaCerrado = $<HTMLElement>(".chat-closed-note");
  const tituloBase = document.title;

  let yo: Yo | null = null;
  let tickets: Ticket[] = [];
  let actual: Ticket | null = null; // ticket abierto en el panel derecho
  let filtro = "todos";
  let ultimoId = 0;
  let ultimoDia = "";
  let visto = 0;
  const pintados = new Set<number>();
  let timerChat = 0;
  let timerLista = 0;
  let cargando = false;

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
      const detalle = (datos as { detail?: unknown } | null)?.detail;
      throw new ApiError(r.status, typeof detalle === "string" ? detalle : "Algo ha fallado. Inténtalo de nuevo.");
    }
    return datos as T;
  }

  const base = () => (yo?.admin ? "/api/admin/tickets" : "/api/chat/tickets");

  // fechas en el idioma elegido (se rehacen al cambiarlo)
  const formatos = new Map<string, Intl.DateTimeFormat>();
  const formato = (o: Intl.DateTimeFormatOptions) => {
    const clave = localeActual() + JSON.stringify(o);
    if (!formatos.has(clave)) formatos.set(clave, new Intl.DateTimeFormat(localeActual(), o));
    return formatos.get(clave)!;
  };
  const hora = { format: (d: Date) => formato({ hour: "2-digit", minute: "2-digit" }).format(d) };
  const fechaLarga = { format: (d: Date) => formato({ day: "numeric", month: "long" }).format(d) };
  const fechaCorta = { format: (d: Date) => formato({ day: "2-digit", month: "2-digit" }).format(d) };
  const claveDia = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

  function etiquetaDia(d: Date): string {
    const hoy = new Date();
    const ayer = new Date();
    ayer.setDate(hoy.getDate() - 1);
    if (claveDia(d) === claveDia(hoy)) return "Hoy";
    if (claveDia(d) === claveDia(ayer)) return "Ayer";
    return fechaLarga.format(d);
  }

  function horaCorta(segundos: number): string {
    const d = new Date(segundos * 1000);
    return claveDia(d) === claveDia(new Date()) ? hora.format(d) : fechaCorta.format(d);
  }

  function pintarAvatar(el: HTMLElement, src: string | null, nombre: string) {
    el.replaceChildren();
    el.classList.remove("is-ticket", "is-closed");
    if (src) {
      const img = document.createElement("img");
      img.src = src;
      img.alt = "";
      img.loading = "lazy";
      img.referrerPolicy = "no-referrer";
      el.append(img);
    } else {
      el.textContent = (nombre.trim()[0] ?? "?").toUpperCase();
    }
  }

  function el<K extends keyof HTMLElementTagNameMap>(tag: K, clase = "", txt?: string): HTMLElementTagNameMap[K] {
    const e = document.createElement(tag);
    if (clase) e.className = clase;
    if (txt !== undefined) e.textContent = txt;
    return e;
  }

  /** Texto escrito por alguien (mensaje, nombre, asunto): no se traduce. */
  function crudo<T extends HTMLElement>(e: T): T {
    e.dataset.noI18n = "";
    return e;
  }

  const tituloTicket = (t: Ticket) => t.asunto || `Ticket ${t.numero}`;

  function mostrar(estado: "cargando" | "login" | "chat") {
    app.dataset.state = estado;
  }

  const cercaDelFinal = () => msgs.scrollHeight - msgs.scrollTop - msgs.clientHeight < 120;
  const bajar = () => (msgs.scrollTop = msgs.scrollHeight);

  function irALogin() {
    pararTimers();
    // reauth: como admin, la sesión puede valer para la web pero ser demasiado antigua para responder
    location.replace(`${urlLogin("/chat")}&reauth=1`);
  }

  function pantallaLogin(mensaje?: string) {
    pararTimers();
    yo = null;
    const error = $<HTMLElement>(".chat-login__error");
    error.textContent = mensaje ?? "";
    error.hidden = !mensaje;
    mostrar("login");
  }

  // ── mensajes ───────────────────────────────

  function reiniciarMensajes() {
    msgs.replaceChildren();
    pintados.clear();
    ultimoId = 0;
    ultimoDia = "";
    visto = 0;
  }

  function vacio() {
    if (msgs.querySelector(".chat-msg")) return;
    msgs.querySelector(".chat-empty")?.remove();
    const caja = el("div", "chat-empty");
    if (yo?.admin) {
      caja.append(el("strong", "", "Sin mensajes todavía"), el("p", "", "Escribe para empezar la conversación."));
    } else if (!actual) {
      caja.append(
        el("strong", "", `¡Hola${yo ? `, ${yo.nombre}` : ""}! 👋`),
        el("p", "", `Abre un ticket para contarme qué necesitas. Puedes tener varios a la vez, uno por tema. Te respondo en ${respuesta}.`),
      );
    } else {
      caja.append(crudo(el("strong", "", tituloTicket(actual))), el("p", "", `Cuéntame qué necesitas. Te respondo en ${respuesta}.`));
    }
    msgs.append(caja);
  }

  const esMio = (m: Mensaje) => (yo?.admin ? m.de === "admin" : m.de === "cliente");

  function pintarMensaje(m: Mensaje) {
    if (pintados.has(m.id)) return;
    pintados.add(m.id);
    msgs.querySelector(".chat-empty")?.remove();

    const fecha = new Date(m.creado * 1000);
    const dia = claveDia(fecha);
    if (dia !== ultimoDia) {
      ultimoDia = dia;
      msgs.append(el("div", "chat-day", etiquetaDia(fecha)));
    }

    const mio = esMio(m);
    const sistema = m.de === "sistema";
    const caja = el("div", "chat-msg" + (mio ? " is-mine" : "") + (sistema ? " is-system" : ""));
    caja.dataset.id = String(m.id);

    let burbuja: HTMLElement;
    if (sistema && m.datos) {
      burbuja = tarjetaAviso(m.datos);
      caja.classList.add("has-card");
    } else if (sistema) {
      // aviso sin tarjeta: icono de Font Awesome en vez de emojis
      const { icono: ico, texto } = sinEmojis(m.texto);
      burbuja = el("p", "chat-msg__text");
      burbuja.append(...(ico ? [ico, " "] : []), texto);
    } else {
      burbuja = crudo(el("p", "chat-msg__text", m.texto));
    }
    caja.append(burbuja, el("span", "chat-msg__meta", (sistema ? "sistema · " : "") + hora.format(fecha)));
    msgs.append(caja);
    ultimoId = Math.max(ultimoId, m.id);
  }

  // «visto» solo en el último mensaje propio
  function pintarVisto() {
    msgs.querySelectorAll(".chat-msg__seen").forEach((x) => x.remove());
    const propios = msgs.querySelectorAll<HTMLElement>(".chat-msg.is-mine:not(.is-pending)");
    const ultimo = propios[propios.length - 1];
    if (!ultimo) return;
    ultimo.querySelector(".chat-msg__meta")?.append(el("span", "chat-msg__seen", Number(ultimo.dataset.id) <= visto ? " · visto" : " · enviado"));
  }

  async function cargarMensajes(primeraVez = false) {
    if (!actual || cargando) return;
    const tid = actual.id;
    cargando = true;
    try {
      const datos = await api<RespuestaMensajes>(`${base()}/${tid}/mensajes?despues=${ultimoId}`);
      if (tid !== actual?.id) return; // se cambió de ticket mientras tanto
      const abajo = primeraVez || cercaDelFinal();
      if (datos.ticket) pintarEstadoTicket({ ...actual, ...datos.ticket });
      datos.mensajes.forEach(pintarMensaje);
      visto = datos.visto;
      pintarVisto();
      vacio();
      if (abajo || datos.mensajes.some(esMio)) bajar();
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) return irALogin();
      if (e instanceof ApiError && e.status === 404) return cerrarPanel();
    } finally {
      cargando = false;
    }
  }

  // ── enviar ─────────────────────────────────

  function ajustarAltura() {
    texto.style.height = "auto";
    texto.style.height = `${Math.min(texto.scrollHeight + 2, 144)}px`;
    const n = texto.value.length;
    contador.textContent = n > MAX_TEXTO - 200 ? `${n}/${MAX_TEXTO}` : "";
  }

  async function enviar() {
    const valor = texto.value.trim();
    if (!actual || !valor || enviarBtn.disabled || actual.cerrado) return;
    errorForm.textContent = "";
    enviarBtn.disabled = true;
    cerrarComandos();
    try {
      const r = await api<{ mensajes: Mensaje[] }>(`${base()}/${actual.id}/mensajes`, {
        method: "POST",
        body: JSON.stringify({ texto: valor }),
      });
      texto.value = "";
      ajustarAltura();
      r.mensajes.forEach(pintarMensaje);
      pintarVisto();
      bajar();
      cargarLista();
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) return irALogin();
      if (e instanceof ApiError && e.status === 409) cargarMensajes();
      errorForm.textContent = e instanceof ApiError ? e.message : "Sin conexión. Inténtalo de nuevo.";
    } finally {
      enviarBtn.disabled = false;
      texto.focus({ preventScroll: true });
    }
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    enviar();
  });

  // ── comandos (/estado-proyecto) ────────────

  const cajaCmds = $<HTMLUListElement>(".chat-cmds");
  let sugeridos: Comando[] = [];
  let elegido = 0;

  function cerrarComandos() {
    sugeridos = [];
    cajaCmds.hidden = true;
    texto.removeAttribute("aria-activedescendant");
  }

  function pintarComandos() {
    cajaCmds.replaceChildren(
      ...sugeridos.map((c, i) => {
        const li = el("li");
        li.id = `chat-cmd-${i}`;
        li.setAttribute("role", "option");
        li.setAttribute("aria-selected", String(i === elegido));
        li.append(el("code", "", c.nombre), el("span", "", c.descripcion));
        li.addEventListener("mousedown", (e) => {
          e.preventDefault(); // que el textarea no pierda el foco
          completar(i);
        });
        return li;
      }),
    );
    cajaCmds.hidden = !sugeridos.length;
    if (sugeridos.length) texto.setAttribute("aria-activedescendant", `chat-cmd-${elegido}`);
  }

  function actualizarComandos() {
    const v = texto.value;
    sugeridos = /^\/[\w-]*$/.test(v) ? (yo?.comandos ?? []).filter((c) => c.nombre.startsWith(v.toLowerCase()) && c.nombre !== v) : [];
    elegido = 0;
    pintarComandos();
  }

  function completar(i: number) {
    const c = sugeridos[i];
    if (!c) return;
    texto.value = c.nombre;
    cerrarComandos();
    ajustarAltura();
    texto.focus({ preventScroll: true });
  }

  texto.addEventListener("keydown", (e) => {
    if (sugeridos.length) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        elegido = (elegido + (e.key === "ArrowDown" ? 1 : -1) + sugeridos.length) % sugeridos.length;
        pintarComandos();
        return;
      }
      if (e.key === "Tab" || (e.key === "Enter" && !e.shiftKey)) {
        e.preventDefault();
        completar(elegido);
        return;
      }
      if (e.key === "Escape") return cerrarComandos();
    }
    if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      enviar();
    }
  });

  texto.addEventListener("input", () => {
    errorForm.textContent = "";
    ajustarAltura();
    actualizarComandos();
  });

  texto.addEventListener("blur", cerrarComandos);

  // ── estado del ticket abierto y cierre ─────

  function pintarEstadoTicket(t: Ticket | null) {
    if (t && actual && t.id === actual.id) actual = t;
    const abierto = !!t && !t.cerrado;
    cajaTicket.hidden = !t;
    cajaTicket.classList.toggle("is-open", abierto);
    if (t) badgeTicket.textContent = `${t.numero}${t.asunto ? ` · ${t.asunto}` : ""} · ${abierto ? "abierto" : "cerrado"}`;
    botonCerrar.hidden = !abierto;
    if (!abierto) cerrarConfirmacion();
    // Ticket cerrado: no se puede escribir; el cliente puede abrir otro desde aquí
    if (t && !abierto) app.dataset.cerrado = "";
    else delete app.dataset.cerrado;
    notaCerrado.hidden = !(t && !abierto);
    $<HTMLButtonElement>(".chat-reopen").hidden = !!yo?.admin;
  }

  // La confirmación es un popover: va en la capa superior del navegador (por encima de
  // cualquier cosa) y se coloca a mano debajo del botón.
  const abiertaConfirmacion = () => confirmar.matches(":popover-open");
  function cerrarConfirmacion() {
    if (abiertaConfirmacion()) confirmar.hidePopover();
  }
  function colocarConfirmacion() {
    const r = botonCerrar.getBoundingClientRect();
    const ancho = confirmar.offsetWidth || 272;
    confirmar.style.top = `${r.bottom + 10}px`;
    confirmar.style.left = `${Math.max(12, Math.min(r.right - ancho, window.innerWidth - ancho - 12))}px`;
  }
  // Al pulsar el botón con el popover abierto, el «clic fuera» ya lo cierra: no reabrir
  let cerradaEn = 0;
  confirmar.addEventListener("toggle", (e) => {
    if ((e as ToggleEvent).newState === "closed") cerradaEn = Date.now();
  });
  botonCerrar.addEventListener("click", () => {
    if (abiertaConfirmacion()) return cerrarConfirmacion();
    if (Date.now() - cerradaEn < 250) return;
    confirmar.showPopover();
    colocarConfirmacion();
    $<HTMLButtonElement>(".chat-ticket__no").focus();
  });
  window.addEventListener("resize", () => abiertaConfirmacion() && colocarConfirmacion());
  window.addEventListener("scroll", () => abiertaConfirmacion() && colocarConfirmacion(), { passive: true });
  $<HTMLButtonElement>(".chat-ticket__no").addEventListener("click", cerrarConfirmacion);
  $<HTMLButtonElement>(".chat-ticket__yes").addEventListener("click", async (e) => {
    const b = e.currentTarget as HTMLButtonElement;
    if (!actual) return;
    b.disabled = true;
    try {
      const r = await api<{ mensajes: Mensaje[]; ticket: Ticket }>(`${base()}/${actual.id}/cerrar`, { method: "POST" });
      cerrarConfirmacion();
      pintarEstadoTicket({ ...actual, ...r.ticket });
      r.mensajes.forEach(pintarMensaje);
      bajar();
      cargarLista();
    } catch (err) {
      errorForm.textContent = err instanceof ApiError ? err.message : "No se pudo cerrar el ticket.";
    } finally {
      b.disabled = false;
    }
  });

  // ── nuevo ticket (cliente) ─────────────────

  function abrirFormNuevo(si: boolean) {
    formNuevo.hidden = !si;
    botonNuevo.hidden = si || !!yo?.admin;
    $<HTMLElement>(".chat-newform__error").textContent = "";
    if (si) formNuevo.querySelector("input")!.focus({ preventScroll: true });
  }

  botonNuevo.addEventListener("click", () => abrirFormNuevo(true));
  $<HTMLButtonElement>(".chat-newform__cancel").addEventListener("click", () => abrirFormNuevo(false));
  $<HTMLButtonElement>(".chat-reopen").addEventListener("click", () => {
    main.dataset.view = "lista";
    abrirFormNuevo(true);
  });

  formNuevo.addEventListener("submit", async (e) => {
    e.preventDefault();
    const input = formNuevo.querySelector("input")!;
    const ok = $<HTMLButtonElement>(".chat-newform__ok");
    ok.disabled = true;
    try {
      const r = await api<{ ticket: Ticket; mensajes: Mensaje[] }>("/api/chat/tickets", {
        method: "POST",
        body: JSON.stringify({ asunto: input.value.trim() || null }),
      });
      input.value = "";
      abrirFormNuevo(false);
      await cargarLista();
      abrirTicket(tickets.find((t) => t.id === r.ticket.id) ?? r.ticket);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return irALogin();
      $<HTMLElement>(".chat-newform__error").textContent = err instanceof ApiError ? err.message : "No se pudo abrir el ticket.";
    } finally {
      ok.disabled = false;
    }
  });

  // ── lista de tickets ───────────────────────

  function pasaFiltro(t: Ticket): boolean {
    const q = buscador.value.trim().toLowerCase().replace(/^@/, "");
    const texto = `${t.numero} ${t.asunto ?? ""} ${t.usuario ? `${t.usuario.nombre} ${t.usuario.usuario} ${t.usuario.id}` : ""}`;
    if (q && !texto.toLowerCase().includes(q)) return false;
    if (filtro === "abiertos") return !t.cerrado;
    if (filtro === "cerrados") return !!t.cerrado;
    if (filtro === "sinleer") return (t.sinLeer ?? 0) > 0;
    return true;
  }

  function chip(nombreIcono: string, txt: string, clase = "") {
    const s = el("span", `chat-chip ${clase}`.trim());
    s.append(icono(nombreIcono, 11), txt);
    return s;
  }

  function pintarLista() {
    const abiertos = tickets.filter((t) => !t.cerrado).length;
    cuenta.textContent = `${tickets.length} · ${abiertos} abierto${abiertos === 1 ? "" : "s"}`;
    lista.replaceChildren(
      ...tickets.filter(pasaFiltro).map((t) => {
        const b = el("button", "chat-conv" + (t.sinLeer ? " is-unread" : ""));
        b.type = "button";
        b.dataset.id = String(t.id);
        if (t.id === actual?.id) b.setAttribute("aria-current", "true");

        const av = el("span", "chat-avatar");
        if (yo?.admin && t.usuario) pintarAvatar(av, t.usuario.avatar, t.usuario.nombre);
        else {
          av.classList.add("is-ticket");
          if (t.cerrado) av.classList.add("is-closed");
          av.append(icono(t.cerrado ? "lock" : "ticket", 20));
        }

        const txt = el("span", "chat-conv__text");
        const arriba = el("span", "chat-conv__top");
        if (yo?.admin && t.usuario) {
          arriba.append(crudo(el("span", "chat-conv__name", t.usuario.nombre)), crudo(el("span", "chat-conv__user", `@${t.usuario.usuario}`)));
        } else {
          arriba.append(crudo(el("span", "chat-conv__name", tituloTicket(t))), el("span", "chat-conv__user", t.numero));
        }
        const ultimo = el("span", "chat-conv__last");
        if (t.ultimo) {
          const linea = t.ultimo.texto.split("\n")[0];
          if (t.ultimo.de === "sistema") {
            // avisos: su icono de Font Awesome en vez del emoji del texto
            const { icono: ico, texto } = sinEmojis(linea);
            ultimo.append(...(ico ? [ico, " "] : []), texto);
          } else {
            const mio = (t.ultimo.de === "admin") === !!yo?.admin;
            ultimo.append(...(mio ? [el("span", "", "Tú:"), " "] : []), crudo(el("span", "", linea)));
          }
        } else ultimo.textContent = "Sin mensajes todavía";

        const chips = el("span", "chat-conv__chips");
        chips.append(chip(t.cerrado ? "lock" : "ticket", `${t.numero} ${t.cerrado ? "cerrado" : "abierto"}`, t.cerrado ? "is-closed" : "is-open"));
        if (yo?.admin && t.asunto) chips.append(crudo(chip("message", t.asunto)));
        if (yo?.admin && t.proyectos) chips.append(chip("folder", `${t.proyectos} proyecto${t.proyectos === 1 ? "" : "s"}`));
        txt.append(arriba, ultimo, chips);

        const lado = el("span", "chat-conv__side");
        lado.append(el("span", "", horaCorta(t.ultimo?.creado ?? t.abierto)));
        if (t.sinLeer) {
          const badge = el("span", "chat-conv__badge", String(t.sinLeer));
          badge.setAttribute("aria-label", `${t.sinLeer} sin leer`);
          lado.append(badge);
        }

        b.append(av, txt, lado);
        b.addEventListener("click", () => abrirTicket(t));
        const li = el("li");
        li.append(b);
        return li;
      }),
    );

    const total = tickets.reduce((n, t) => n + (t.sinLeer ?? 0), 0);
    document.title = total ? `(${total}) ${tituloBase}` : tituloBase;
  }

  async function cargarLista() {
    try {
      tickets = await api<Ticket[]>(base());
      pintarLista();
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) irALogin();
    }
  }

  // ── abrir / cerrar el panel de un ticket ───

  function abrirTicket(t: Ticket) {
    actual = t;
    app.dataset.conv = String(t.id);
    main.dataset.view = "conv";
    // el nombre y el asunto los escribe la gente
    crudo(paneNombre);
    if (yo?.admin && t.usuario) {
      pintarAvatar(paneAvatar, t.usuario.avatar, t.usuario.nombre);
      paneNombre.textContent = t.usuario.nombre;
      paneSub.textContent = `@${t.usuario.usuario} · ID ${t.usuario.id}`;
    } else if (yo) {
      paneNombre.textContent = tituloTicket(t);
      paneSub.replaceChildren(el("span", "status-dot"), document.createTextNode(`${yo.adminNombre} suele responder en ${respuesta}`));
    }
    pintarEstadoTicket(t);
    reiniciarMensajes();
    lista.querySelectorAll(".chat-conv").forEach((b) => {
      if ((b as HTMLElement).dataset.id === String(t.id)) b.setAttribute("aria-current", "true");
      else b.removeAttribute("aria-current");
    });
    history.replaceState(null, "", `/chat?t=${t.id}`);
    cargarMensajes(true).then(cargarLista);
    // Sin preventScroll el navegador baja la página hasta la caja de escribir
    if (!t.cerrado) texto.focus({ preventScroll: true });
  }

  function cerrarPanel() {
    actual = null;
    delete app.dataset.conv;
    main.dataset.view = "lista";
    pintarEstadoTicket(null);
    reiniciarMensajes();
    pintarLista();
    history.replaceState(null, "", "/chat");
  }

  $<HTMLButtonElement>(".chat-back").addEventListener("click", cerrarPanel);

  buscador.addEventListener("input", pintarLista);
  // el fondo del filtro activo se desliza hasta el que pulses
  const moverPildora = pildora($<HTMLElement>(".chat-filters"), "button.is-on");
  app.querySelectorAll<HTMLButtonElement>(".chat-filters button").forEach((b) =>
    b.addEventListener("click", () => {
      filtro = b.dataset.filtro ?? "todos";
      app.querySelectorAll(".chat-filters button").forEach((x) => x.classList.toggle("is-on", x === b));
      moverPildora();
      pintarLista();
    }),
  );

  // ── sondeo ─────────────────────────────────

  function pararTimers() {
    clearTimeout(timerChat);
    clearTimeout(timerLista);
  }

  function programar() {
    pararTimers();
    if (!yo || document.hidden) return;
    const bucleChat = async () => {
      await cargarMensajes();
      timerChat = window.setTimeout(bucleChat, POLL_CHAT);
    };
    const bucleLista = async () => {
      await cargarLista();
      timerLista = window.setTimeout(bucleLista, POLL_LISTA);
    };
    timerChat = window.setTimeout(bucleChat, POLL_CHAT);
    timerLista = window.setTimeout(bucleLista, POLL_LISTA);
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) return pararTimers();
    if (!yo) return;
    cargarMensajes();
    cargarLista();
    programar();
  });

  // ── idioma: fechas y textos ya pintados se rehacen en el idioma nuevo ──
  window.addEventListener("aj:idioma", () => {
    if (!yo) return;
    pintarLista();
    if (actual) {
      reiniciarMensajes();
      cargarMensajes(true);
    }
  });

  // ── cerrar sesión ──────────────────────────

  $<HTMLButtonElement>(".chat-logout").addEventListener("click", async () => {
    pararTimers();
    await cerrarSesion();
    location.replace("/");
  });

  // ── arranque ───────────────────────────────

  async function arrancar() {
    try {
      yo = await api<Yo>("/api/me");
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) return irALogin();
      return pantallaLogin("El chat no está disponible ahora mismo. Prueba más tarde o usa el formulario de contacto.");
    }

    pintarAvatar(meAvatar, yo.avatar, yo.nombre);
    crudo(meAvatar).title = yo.nombre;
    crudo(meNombre).textContent = yo.usuario ? `@${yo.usuario}` : yo.nombre;
    app.dataset.lista = "";
    if (yo.admin) {
      app.dataset.admin = "";
      buscador.placeholder = "Buscar por nombre, @usuario, ID o ticket…";
    } else {
      buscador.placeholder = "Buscar ticket…";
      $<HTMLElement>(".chat-convs__h").textContent = "Mis tickets";
      botonNuevo.hidden = false;
      pintarAvatar(paneAvatar, "/logo.png", yo.adminNombre);
      $<HTMLElement>(".chat-pane__placeholder").textContent =
        "Elige uno de tus tickets o pulsa «Nuevo ticket» para hablar de otro tema. Puedes tener varios abiertos a la vez.";
    }
    main.dataset.view = "lista";
    mostrar("chat");
    await cargarLista();

    // ?t=<ticket> abre ese ticket; ?c=<cliente> (admin) abre el último de ese cliente
    const params = new URLSearchParams(location.search);
    const pedido = Number(params.get("t"));
    const cliente = params.get("c");
    let abrir = tickets.find((t) => t.id === pedido);
    if (!abrir && cliente && yo.admin) {
      const suyos = tickets.filter((t) => t.usuario?.id === cliente);
      abrir = suyos.find((t) => !t.cerrado) ?? suyos[0];
      if (!abrir) {
        try {
          const r = await api<{ ticket: Ticket }>(`/api/admin/clientes/${encodeURIComponent(cliente)}/tickets`, {
            method: "POST",
            body: JSON.stringify({ asunto: "Seguimiento de tu proyecto" }),
          });
          await cargarLista();
          abrir = tickets.find((t) => t.id === r.ticket.id);
        } catch {}
      }
    }
    // ?nuevo: el cliente va directo a «Nuevo ticket» (ver CLAVE_NUEVO más abajo)
    let nuevo = false;
    try {
      nuevo = sessionStorage.getItem(CLAVE_NUEVO) === "1";
      sessionStorage.removeItem(CLAVE_NUEVO);
    } catch {}
    if (nuevo && !yo.admin && !abrir) {
      vacio();
      abrirFormNuevo(true);
      programar();
      return;
    }
    // El cliente entra directamente en su ticket abierto más reciente (si tiene)
    if (!abrir && !yo.admin) abrir = tickets.find((t) => !t.cerrado);
    if (abrir) abrirTicket(abrir);
    else vacio();
    programar();
  }

  // /chat?nuevo (tarjeta «Ahora mismo» de la portada) abre «Nuevo ticket». Se recuerda en
  // sessionStorage antes de arrancar, por si primero hay que pasar por /login.
  if (new URLSearchParams(location.search).has("nuevo")) {
    try { sessionStorage.setItem(CLAVE_NUEVO, "1"); } catch {}
    history.replaceState(null, "", location.pathname);
  }

  arrancar();
}
