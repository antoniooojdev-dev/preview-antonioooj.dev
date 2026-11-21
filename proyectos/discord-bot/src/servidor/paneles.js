// Mensajes fijos de los canales informativos, en estilo minimalista (componentes v2).
// `npm run setup` los publica y, al volver a ejecutarlo, edita los mismos mensajes.
// Cada panel devuelve un mensaje o una lista de mensajes.

import { ButtonStyle } from "discord.js";
import config from "../config.js";
import { panelMessage as ticketPanel } from "../features/tickets.js";
import { panelMessage as verificationPanel } from "../features/verification.js";
import { panelMessage as rolesPanel } from "../features/selfroles.js";
import { box, btn, linkBtn, row, v2, withThumb } from "../lib/ui.js";
import { LOGO, projectCategories, roles as planRoles, SITE, socials } from "./plan.js";

const chan = (key) => (config.ids.channels[key] ? `<#${config.ids.channels[key]}>` : `#${key}`);
const role = (key) => (config.ids.roles[key] ? `<@&${config.ids.roles[key]}>` : key);
const levelRoles = () => planRoles.filter((r) => r.level).sort((a, b) => a.level - b.level);

// ── #normas (con verificación al final) ──────────────────────
function normas() {
  const rules = [
    ["Respeto ante todo", "Nada de insultos, acoso ni discriminación. Se puede discrepar *sin faltar*."],
    ["Cero spam", "Sin flood, cadenas, menciones masivas ni publicidad. Las invitaciones a otros servidores se borran solas."],
    ["Contenido apropiado", "Nada NSFW, violento o ilegal. __Tampoco leaks, cracks ni recursos robados__ (MLOs y scripts filtrados incluidos)."],
    ["Cada cosa en su sitio", `Las dudas de código van a ${chan("ayuda")} con el código y el error completo.`],
    ["Privacidad", "No compartas datos personales tuyos ni de otros. **Nunca** pidas ni des contraseñas o tokens."],
    ["Encargos solo por ticket", `Presupuestos y pagos __únicamente__ por ${chan("abrir_ticket")}. Desconfía de quien te escriba por privado haciéndose pasar por el staff.`],
    ["Perfil correcto", "Sin nombres ni avatares ofensivos o que imiten al staff."],
    ["Decide el staff", "El equipo puede actuar ante cualquier conducta que perjudique a la comunidad, aunque no esté escrita aquí."],
  ];
  return v2(
    box([
      "# 📜 Normas",
      "*Pocas y claras. Al verificarte las aceptas.*",
      "---",
      rules.map(([t, d], i) => `**${i + 1}. ${t}**\n${d}`).join("\n\n"),
      "---",
      "## ⚖️ Sanciones",
      "**1–2** advertencias → aviso  ·  **3** → aislamiento *1 h*  ·  **5** → expulsión\n-# Las faltas graves pueden suponer baneo directo.",
      "===",
      "## ✅ Verificación",
      "Pulsa el botón para __desbloquear el servidor__. Frena bots y raids: gracias por la paciencia.",
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
        "# AJ · DEV",
        "*La comunidad de **AntonioooJ***",
        `Webs, aplicaciones web, scripts de FiveM y bots de Discord. Aquí se __aprende__, se __comparte__ y se siguen los proyectos de [antonioooj.dev](${SITE}).`,
      ),
      "---",
      "## 🧭 Empieza aquí",
      [
        "1. Elige tus **avisos** e **intereses** justo debajo ↓",
        `2. Mira los proyectos en ${chan("proyectos")}`,
        `3. Saluda en ${chan("general")} 👋`,
      ].join("\n"),
      "---",
      "## 🗺️ Canales",
      [
        `**Información** — ${chan("anuncios")} · ${chan("novedades")} · ${chan("contenido")}`,
        `**Proyectos** — ${chan("proyectos")} · ${chan("sugerencias")} · ${chan("bugs")}`,
        `**Comunidad** — ${chan("general")} · ${chan("media")} · ${chan("comandos")} · ${chan("eventos")}`,
        `**Desarrollo** — ${chan("programacion")} · ${chan("ayuda")} · ${chan("tus_proyectos")}`,
        `**Voz** — entra en *➕ Crear sala* y tendrás una sala propia que se borra al vaciarse`,
        `**Encargos y ayuda** — ${chan("servicios")} · ${chan("abrir_ticket")}`,
      ].join("\n"),
      "---",
      "## 🚀 Novedades por categoría",
      `Cada proyecto tiene su post en ${chan("proyectos")} con __todo su historial__. Los cambios nuevos se anuncian en ${chan("novedades")} y solo te avisan de lo que elijas:`,
      cats.map((c) => `${c.emoji} **${c.label}** → ${role(c.role)}`).join("\n"),
      "---",
      "## 🏅 Niveles",
      `Hablar da XP *(una vez por minuto, el spam no cuenta)*. Al subir ganas rol:\n${levelRoles()
        .map((r) => `**${r.level}** ${role(r.key)}`)
        .join("  ·  ")}\n-# \`/nivel\` para tu progreso · \`/ranking\` para el top 10`,
      "---",
      row(socials.links.slice(0, 5).map((l) => linkBtn(l.label, l.url, l.emoji))),
    ]),
  );
  return [guide, rolesPanel()];
}

// ── #servicios ───────────────────────────────────────────────
function servicios() {
  const items = [
    ["🌐", "Páginas web", "Negocios, portfolios, reservas y tiendas. *Rápidas, con SEO y fáciles de mantener.*"],
    ["🧩", "Aplicaciones web", "Paneles de gestión, agendas, áreas de clientes y herramientas internas."],
    ["🎮", "Scripts de FiveM", "Lua para ESX con interfaz NUI: tablets, teléfonos, trabajos, policía, bandas… *optimizados*."],
    ["🤖", "Bots de Discord", "Tickets, verificación, niveles, automod, avisos de redes… como el que gestiona este servidor."],
  ];
  return v2(
    box([
      withThumb(LOGO, "# 💼 Servicios", "*Proyectos a medida, del diseño al despliegue.*", "Cada encargo incluye __seguimiento__ y __soporte__ tras la entrega."),
      "---",
      items.map(([e, t, d]) => `### ${e} ${t}\n${d}`).join("\n"),
      "---",
      "## 📋 Cómo funciona",
      "**1.** Abres ticket con tu idea → **2.** presupuesto *sin compromiso* → **3.** desarrollo con avances → **4.** entrega y soporte",
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
