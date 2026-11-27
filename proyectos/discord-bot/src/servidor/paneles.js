// Mensajes fijos de los canales informativos, en estilo minimalista (componentes v2).
// `npm run setup` los publica y, al volver a ejecutarlo, edita los mismos mensajes.
// Cada panel devuelve un mensaje o una lista de mensajes.

import { ButtonStyle } from "discord.js";
import config from "../config.js";
import { panelMessage as ticketPanel } from "../features/tickets.js";
import { panelMessage as verificationPanel } from "../features/verification.js";
import { panelMessage as rolesPanel } from "../features/selfroles.js";
import { box, btn, h1, h2, h3, linkBtn, MAYUS, row, v2, withThumb } from "../lib/ui.js";
import { LOGO, projectCategories, roles as planRoles, SITE, socials } from "./plan.js";

const chan = (key) => (config.ids.channels[key] ? `<#${config.ids.channels[key]}>` : `#${key}`);
const role = (key) => (config.ids.roles[key] ? `<@&${config.ids.roles[key]}>` : key);
const levelRoles = () => planRoles.filter((r) => r.level).sort((a, b) => a.level - b.level);

// ── #normas (con verificación al final) ──────────────────────
function normas() {
  const rules = [
    ["Respeto", "Nada de insultos, acoso ni discriminación. Se puede discrepar *sin faltar*."],
    ["Cero spam", "Sin flood, cadenas, menciones masivas ni **publicidad**."],
    ["Contenido", "Nada NSFW, violento o ilegal. __Ni leaks, cracks ni recursos robados__."],
    ["Cada cosa en su sitio", `Las dudas de código, en ${chan("ayuda")} con el **código** y el **error**.`],
    ["Privacidad", "**Nunca** pidas ni des contraseñas, tokens o datos personales."],
    ["Encargos por ticket", `Presupuestos y pagos __solo__ por ${chan("abrir_ticket")}.`],
    ["Decide el staff", "Puede actuar ante cualquier conducta que perjudique a la comunidad."],
  ];
  return v2(
    box([
      h1("Normas", "📜"),
      "-# Pocas y claras. Al verificarte, las aceptas.",
      "---",
      rules.map(([t, d], i) => `**\`${String(i + 1).padStart(2, "0")}\`  ${MAYUS(t)}**
${d}`).join("\n\n"),
      "---",
      h3("Sanciones", "⚖️"),
      "**1–2** avisos → advertencia  ·  **3** → aislamiento *1 h*  ·  **5** → expulsión\n-# Las faltas graves pueden suponer **baneo directo**.",
      "===",
      h2("Verificación", "✅"),
      "Pulsa el botón para __desbloquear el servidor__.",
      row(
        btn("verify:go", "Acepto, verificarme", { emoji: "✅", style: ButtonStyle.Success }),
        linkBtn("Directrices de Discord", "https://discord.com/guidelines", "📘"),
      ),
    ]),
  );
}

// ── #guía (guía + elección de roles) ─────────────────────────
function guia() {
  const cats = Object.values(projectCategories);
  const guide = v2(
    box([
      withThumb(
        LOGO,
        h1("AJ · Dev"),
        "**Webs**, **aplicaciones web**, **scripts de FiveM** y **bots de Discord**.",
        `-# La comunidad de [antonioooj.dev](${SITE})`,
      ),
      "---",
      h3("Empieza aquí", "🧭"),
      [
        "**`01`**  Elige tus **avisos** e **intereses** aquí debajo",
        `**\`02\`**  Mira los proyectos en ${chan("proyectos")}`,
        `**\`03\`**  Saluda en ${chan("general")}`,
      ].join("\n"),
      "---",
      h3("Canales", "🗺️"),
      [
        `**INICIO** — ${chan("anuncios")} ${chan("novedades")}`,
        `**COMUNIDAD** — ${chan("general")} ${chan("media")} ${chan("comandos")}`,
        `**PROYECTOS** — ${chan("proyectos")} ${chan("sugerencias")} ${chan("bugs")}`,
        `**DESARROLLO** — ${chan("programacion")} ${chan("ayuda")} ${chan("tus_proyectos")}`,
        `**SERVICIOS** — ${chan("servicios")} ${chan("abrir_ticket")}`,
        "**VOZ** — entra en *➕ Crear sala* y tendrás una sala __solo tuya__",
      ].join("\n"),
      "---",
      h3("Novedades", "🚀"),
      `Cada proyecto tiene su post en ${chan("proyectos")} con __todo su historial__. Solo te avisamos de lo que elijas:`,
      cats.map((c) => `${c.emoji} **${c.label}** → ${role(c.role)}`).join("\n"),
      "---",
      h3("Niveles", "🏅"),
      `Hablar da **XP** y al subir ganas rol:
${levelRoles()
        .map((r) => `**${r.level}** ${role(r.key)}`)
        .join("  ·  ")}
-# \`/nivel\` tu progreso  ·  \`/ranking\` el top 10`,
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
