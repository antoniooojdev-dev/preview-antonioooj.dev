// Mensajes fijos de los canales informativos, en estilo minimalista (componentes v2).
// `npm run setup` los publica y, al volver a ejecutarlo, edita los mismos mensajes.
// Cada panel devuelve un mensaje o una lista de mensajes.

import { ButtonStyle } from "discord.js";
import config from "../config.js";
import { panelMessage as ticketPanel } from "../features/tickets.js";
import { panelMessage as verificationPanel } from "../features/verification.js";
import { panelMessage as rolesPanel } from "../features/selfroles.js";
import { box, btn, h1, h3, linkBtn, MAYUS, row, v2, withThumb } from "../lib/ui.js";
import { LOGO, projectCategories, roles as planRoles, SITE, socials } from "./plan.js";

const chan = (key) => (config.ids.channels[key] ? `<#${config.ids.channels[key]}>` : `#${key}`);
const role = (key) => (config.ids.roles[key] ? `<@&${config.ids.roles[key]}>` : key);
const levelRoles = () => planRoles.filter((r) => r.level).sort((a, b) => a.level - b.level);

// ── #normas (el botón de verificación va debajo, fuera del recuadro) ──
// Redactadas en tono enunciativo: describen cómo funciona la comunidad, no dan órdenes.
function normas() {
  const rules = [
    ["Respeto", "Se puede discrepar *sin faltar*. Los insultos, el acoso y la discriminación no tienen cabida."],
    ["Cero spam", "El flood, las cadenas, las menciones masivas y la **publicidad** no están permitidos."],
    ["Contenido", "El contenido NSFW, violento o ilegal no está permitido, __como tampoco los leaks, cracks o recursos robados__."],
    ["Cada cosa en su sitio", `Las dudas de código van en ${chan("ayuda")}, con el **código** y el **error**.`],
    ["Privacidad", "Las contraseñas, los tokens y los datos personales **nunca** se piden ni se comparten."],
    ["Encargos por ticket", `Los presupuestos y los pagos se gestionan __solo__ por ${chan("abrir_ticket")}.`],
    ["Decisión del equipo", "El equipo puede actuar ante cualquier conducta que perjudique a la comunidad."],
  ];
  return v2(
    box([
      h1("Normas"),
      "---",
      rules.map(([t, d], i) => `**\`${String(i + 1).padStart(2, "0")}\`  ${MAYUS(t)}**\n${d}`).join("\n\n"),
    ]),
    row(
      btn("verify:normas", "He leído y acepto las normas", { emoji: "✅", style: ButtonStyle.Success }),
      linkBtn("Directrices de Discord", "https://discord.com/guidelines", "📘"),
    ),
  );
}

// ── #guía: un recuadro por categoría del servidor + elección de roles ──
// Todo va en un mismo mensaje con varios contenedores (máx. 40 piezas por mensaje).
const GUIA_CATEGORIAS = [
  {
    t: "Inicio",
    canales: [
      ["normas", "Cómo funciona la comunidad. Se aceptan con su botón."],
      ["anuncios", "Avisos **oficiales** del servidor."],
      ["novedades", "Proyectos nuevos y actualizados, **vídeos** y **directos**."],
    ],
  },
  {
    t: "Comunidad",
    canales: [
      ["general", "La charla de siempre. Un buen sitio para **presentarse**."],
      ["media", "Capturas, clips y memes."],
      ["comandos", "`/nivel`, `/ranking`, `/recordatorio` y las **subidas de nivel**."],
    ],
  },
  {
    t: "Proyectos",
    canales: [
      ["proy_web", "Las **webs**, cada una con su ficha y __su historial__."],
      ["proy_bot", "Los **bots de Discord**."],
      ["proy_fivem", "Los **scripts de FiveM**."],
      ["proy_app", "Las **aplicaciones web**."],
      ["sugerencias", "Ideas para el servidor o los proyectos, con **votos**."],
      ["bugs", "Fallos encontrados, uno por post."],
    ],
  },
  {
    t: "Contenido",
    canales: [
      ["instagram", "Webs, scripts y diseño en **imágenes**."],
      ["tiktok", "**Clips** cortos de lo que se va construyendo."],
      ["github", "**Código**: repositorios nuevos y versiones."],
    ],
  },
  {
    t: "Desarrollo",
    canales: [
      ["programacion", "Webs, FiveM, bots… cualquier tema de **desarrollo**."],
      ["ayuda", "Un post por duda, con el **código** y el **error**."],
      ["tus_proyectos", "Lo que está construyendo la comunidad."],
    ],
  },
  {
    t: "Servicios",
    canales: [
      ["servicios", "Webs, apps, scripts de FiveM y bots **a medida**."],
      ["abrir_ticket", "Tickets **privados** con el equipo: soporte y presupuestos."],
    ],
  },
  {
    t: "Voz",
    canales: [
      ["crear_sala", "Al entrar se crea una sala __solo tuya__, que se borra al vaciarse."],
      ["voz_general", "Para hablar con quien esté conectado."],
    ],
  },
];

function guia() {
  const cats = Object.values(projectCategories);
  const guide = v2(
    // portada
    box([
      withThumb(
        LOGO,
        h1("Guía"),
        "**Webs**, **aplicaciones web**, **scripts de FiveM** y **bots de Discord**.",
        `-# La comunidad de [antonioooj.dev](${SITE})`,
      ),
      "---",
      [
        "**`01`**  Los **avisos** e **intereses** se eligen al final de esta guía",
        `**\`02\`**  Los proyectos están en ${chan("proy_web")} ${chan("proy_bot")} ${chan("proy_fivem")} ${chan("proy_app")}`,
        `**\`03\`**  La conversación, en ${chan("general")}`,
      ].join("\n"),
    ]),
    // una caja por categoría
    GUIA_CATEGORIAS.map((c) =>
      box([[h3(c.t), ...c.canales.map(([k, d]) => `${chan(k)}\n-# ${d}`)].join("\n")]),
    ),
    // novedades, niveles y redes
    box([
      h3("Novedades", "🚀"),
      `Cada proyecto anuncia sus cambios en ${chan("novedades")}. Solo llegan avisos de lo que se elija:`,
      cats.map((c) => `${c.emoji} **${c.label}** → ${role(c.role)}`).join("\n"),
      "---",
      h3("Niveles", "🏅"),
      `Hablar da **XP** y cada nivel trae su rol:\n${levelRoles()
        .map((r) => `**${r.level}** ${role(r.key)}`)
        .join("  ·  ")}\n-# \`/nivel\` muestra el progreso  ·  \`/ranking\` el top 10`,
      "---",
      row(socials.links.slice(0, 5).map((l) => linkBtn(l.label, l.url, l.emoji))),
    ]),
  );
  return [guide, rolesPanel()];
}

// ── #servicios ───────────────────────────────────────────────
function servicios() {
  const items = [
    ["🌐", "Páginas web", "Negocios, portfolios, reservas y tiendas. **Rápidas** y con **SEO**."],
    ["🧩", "Aplicaciones web", "Paneles de gestión, agendas, áreas de clientes y herramientas internas."],
    ["🎮", "Scripts de FiveM", "**ESX**, **QBCore** y **Qbox** con interfaz propia: tablets, trabajos, policía, bandas…"],
    ["🤖", "Bots de Discord", "Tickets, verificación, niveles, automod… __como el de este servidor__."],
  ];
  return v2(
    box([
      withThumb(LOGO, h1("Servicios", "💼"), "Proyectos **a medida**, del diseño al despliegue.", "-# Con __seguimiento__ y __soporte__ tras la entrega."),
      "---",
      items.map(([e, t, d]) => `${e} **${MAYUS(t)}**
${d}`).join("\n\n"),
      "---",
      h3("Cómo funciona", "📋"),
      "**`01`** Ticket con tu idea  →  **`02`** Presupuesto *sin compromiso*  →  **`03`** Desarrollo  →  **`04`** Entrega y soporte",
      row(
        btn("ticket:quick:presupuesto", "Pedir presupuesto", { emoji: "💼", style: ButtonStyle.Primary }),
        btn("ticket:quick:partner", "Colaborar", { emoji: "🤝" }),
        linkBtn("Ver trabajos", SITE, "🌐"),
      ),
    ]),
  );
}

// ── #comandos ────────────────────────────────────────────────
// Solo los que puede usar cualquiera (los de staff no se anuncian).
function comandos() {
  const grupos = [
    ["Scripts y web", "🛒", [
      ["/script", "Ficha de un script de FiveM: qué incluye, **precio** y enlaces. Sin nombre, el catálogo entero."],
      ["/redes", "La web y las redes de **antonioooj.dev**."],
    ]],
    ["Niveles", "🏅", [
      ["/nivel", "El nivel y la **XP**, propios o de otra persona."],
      ["/ranking", "El **top 10** de la comunidad."],
    ]],
    ["Utilidades", "🧰", [
      ["/recordatorio", "Un aviso por **privado** cuando toque (`crear`, `lista`, `borrar`)."],
      ["/encuesta", "Una votación con **botones** que se cierra sola."],
      ["/ayuda", "Los comandos disponibles para cada persona."],
      ["/ping", "La latencia del bot."],
    ]],
  ];
  return v2(
    box([
      h1("Comandos"),
      "Los comandos del bot se usan en este canal, donde también se anuncian las **subidas de nivel**.",
      ...grupos.flatMap(([t, e, cmds]) => ["---", [h3(t, e), ...cmds.map(([c, d]) => `**\`${c}\`**\n-# ${d}`)].join("\n")]),
    ]),
  );
}

// ── CONTENIDO: un panel por red ──────────────────────────────
// El enlace sale de socials.links; si una red aún no tiene enlace (TikTok: TIKTOK_URL en .env),
// el panel sale igual pero sin botón. «Llega aquí solo» solo se dice si su feed está configurado.
const red = (label) => socials.links.find((l) => l.label === label)?.url ?? "";
const conFeed = (key) => !!socials.feeds.find((f) => f.key === key)?.url;
const TIKTOK = (process.env.TIKTOK_URL || "").trim();

function panelRed({ titulo, emoji, usuario, intro, apartados, feed, boton, url }) {
  return v2(
    box([
      withThumb(LOGO, `-# **${emoji} ${MAYUS(titulo)}**${usuario ? `  ·  **${usuario}**` : ""}`, h1(titulo), intro),
      ...apartados.flatMap(([t, e, lineas]) => [
        "---",
        [h3(t, e), ...lineas.map((l, i) => `**\`${String(i + 1).padStart(2, "0")}\`**  ${l}`)].join("\n"),
      ]),
      "---",
      feed ? `-# 🔔 Cada publicación nueva llega **sola** a este canal` : "-# Las publicaciones destacadas se comparten en este canal",
    ]),
    url ? row(linkBtn(boton, url, emoji), linkBtn("antonioooj.dev", SITE, "🌐")) : row(linkBtn("antonioooj.dev", SITE, "🌐")),
  );
}

function instagram() {
  const url = red("Instagram");
  return panelRed({
    titulo: "Instagram",
    emoji: "📸",
    usuario: "@" + (url.split("/").filter(Boolean).pop() || "antonioooj.dev"),
    intro: "El lado **visual** de antonioooj.dev: lo que se diseña y se programa, contado en imágenes.",
    apartados: [
      ["Qué se publica", "🖼️", [
        "**Webs** recién terminadas: portadas, móvil y detalles del diseño",
        "Interfaces de **scripts de FiveM**: tablets, MDT, menús y HUD",
        "El **antes y después** de cada rediseño",
        "Pequeños trucos de **diseño** y desarrollo web",
      ]],
      ["Para quién", "🎯", [
        "Negocios que buscan **web propia** y quieren ver resultados reales",
        "Servidores de **FiveM** que buscan scripts con interfaz cuidada",
      ]],
    ],
    feed: conFeed("instagram"),
    boton: "Seguir en Instagram",
    url,
  });
}

function tiktok() {
  return panelRed({
    titulo: "TikTok",
    emoji: "🎵",
    usuario: TIKTOK ? "@" + TIKTOK.split("@").pop().split(/[/?]/)[0] : "",
    intro: "**Clips cortos** de lo que se va construyendo: del código a la pantalla en segundos.",
    apartados: [
      ["Qué se publica", "🎬", [
        "**Scripts de FiveM** funcionando dentro del juego",
        "**Webs** en movimiento: animaciones, transiciones y versión móvil",
        "**Bots de Discord** en acción, como el de este servidor",
        "El proceso: de la **idea** al resultado final",
      ]],
    ],
    feed: conFeed("tiktok"),
    boton: "Seguir en TikTok",
    url: TIKTOK,
  });
}

function github() {
  const url = red("GitHub");
  return panelRed({
    titulo: "GitHub",
    emoji: "💻",
    usuario: "@" + (url.split("/").filter(Boolean).pop() || "antonioooj"),
    intro: "El **código** detrás de antonioooj.dev: repositorios, versiones y experimentos.",
    apartados: [
      ["Con qué se trabaja", "🧰", [
        "**Webs**: Astro, TypeScript, HTML y CSS a mano",
        "**Backend**: Python con FastAPI y Node.js",
        "**FiveM**: Lua para ESX Legacy, QBCore y Qbox, con interfaces NUI",
        "**Bots**: discord.js y discord.py",
      ]],
      ["Qué llega aquí", "📦", [
        "**Repositorios nuevos** cuando se publican",
        "**Versiones** (releases) de los proyectos",
      ]],
    ],
    feed: conFeed("github"),
    boton: "Ver en GitHub",
    url,
  });
}

/** canal (key del plano) → función que construye el/los mensaje(s) */
export const paneles = {
  normas,
  guia,
  servicios,
  comandos,
  instagram,
  tiktok,
  github,
  abrir_ticket: ticketPanel,
  verificacion: verificationPanel,
};

/** Paneles sueltos para /panel */
export const panelesSueltos = { ...paneles, roles: rolesPanel };
