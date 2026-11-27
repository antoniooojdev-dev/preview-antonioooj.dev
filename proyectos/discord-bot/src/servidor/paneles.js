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
      "---",
      h3("Sanciones", "⚖️"),
      "**1–2** avisos → advertencia  ·  **3** → aislamiento *1 h*  ·  **5** → expulsión\n-# Las faltas graves pueden suponer **baneo directo**.",
    ]),
    row(
      btn("verify:go", "He leído y acepto las normas", { emoji: "✅", style: ButtonStyle.Success }),
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
      ["normas", "Cómo funciona la comunidad y la verificación."],
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
      ["proyectos", "Un post por proyecto con su ficha y __todo su historial__."],
      ["sugerencias", "Ideas para el servidor o los proyectos, con **votos**."],
      ["bugs", "Fallos encontrados, uno por post."],
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
        `**\`02\`**  Los proyectos están en ${chan("proyectos")}`,
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

/** canal (key del plano) → función que construye el/los mensaje(s) */
export const paneles = {
  normas,
  guia,
  servicios,
  abrir_ticket: ticketPanel,
};

/** Paneles sueltos para /panel */
export const panelesSueltos = { ...paneles, verificacion: verificationPanel, roles: rolesPanel };
