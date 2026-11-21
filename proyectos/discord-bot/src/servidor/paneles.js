// Mensajes fijos de los canales informativos. `npm run setup` los publica
// y, al volver a ejecutarlo, edita los mismos mensajes en vez de duplicarlos.

import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import config from "../config.js";
import { panelMessage as ticketPanel } from "../features/tickets.js";
import { panelMessage as verificationPanel } from "../features/verification.js";
import { panelMessage as rolesPanel } from "../features/selfroles.js";
import { LOGO, roles as planRoles, SITE, socials } from "./plan.js";

const C = config.colors.primary;
const chan = (key) => (config.ids.channels[key] ? `<#${config.ids.channels[key]}>` : `#${key}`);
const role = (key) => (config.ids.roles[key] ? `<@&${config.ids.roles[key]}>` : key);
const linkButton = (label, url, emoji) => {
  const b = new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel(label).setURL(url);
  if (emoji) b.setEmoji(emoji);
  return b;
};
const channelUrl = (key) => `https://discord.com/channels/${config.ids.guildId}/${config.ids.channels[key]}`;

// Banner de texto para la cabecera de cada panel (sin depender de imágenes)
const header = (title) => new EmbedBuilder().setColor(C).setAuthor({ name: "AJ · DEV", iconURL: LOGO, url: SITE }).setTitle(title);

function guia() {
  const welcome = header("Bienvenido/a a la comunidad de AntonioooJ")
    .setThumbnail(LOGO)
    .setDescription(
      [
        "Aquí hablamos de **desarrollo web**, **scripts de FiveM**, **bots** y de todo lo que se construye en [antonioooj.dev](" + SITE + ").",
        "",
        "Puedes venir a aprender, enseñar lo que haces, resolver dudas o pedir un proyecto a medida.",
      ].join("\n"),
    );

  const pasos = new EmbedBuilder()
    .setColor(C)
    .setTitle("🧭 Primeros pasos")
    .setDescription(
      [
        `**1.** Lee las ${chan("normas")}`,
        `**2.** Verifícate en ${chan("verificacion")} para ver el resto del servidor`,
        `**3.** Elige tus avisos e intereses en ${chan("roles")}`,
        `**4.** Preséntate en ${chan("presentaciones")} 👋`,
      ].join("\n"),
    );

  const mapa = new EmbedBuilder()
    .setColor(C)
    .setTitle("🗺️ Mapa del servidor")
    .addFields(
      { name: "📢 Información", value: `${chan("anuncios")} · ${chan("novedades")} · ${chan("redes")} · ${chan("servicios")}` },
      { name: "📺 Contenido", value: `${chan("youtube")} · ${chan("directos")} · ${chan("github")} — avisos automáticos` },
      { name: "💬 Comunidad", value: `${chan("general")} · ${chan("media")} · ${chan("memes")} · ${chan("gaming")}` },
      { name: "💻 Desarrollo", value: `${chan("programacion")} · ${chan("web")} · ${chan("fivem_dev")}\n${chan("ayuda")} para dudas · ${chan("tus_proyectos")} para enseñar lo tuyo` },
      { name: "🧩 Proyectos AJ", value: `${chan("changelog")} · ${chan("scripts_fivem")} · ${chan("sugerencias")} · ${chan("bugs")}` },
      { name: "🔊 Voz", value: `Entra en **➕ Crear sala** y tendrás un canal de voz propio que se borra al quedarse vacío.` },
      { name: "🎫 Soporte", value: `¿Problema o encargo? ${chan("abrir_ticket")}` },
    );

  const niveles = new EmbedBuilder()
    .setColor(C)
    .setTitle("🏅 Actividad y niveles")
    .setDescription(`Hablar en el servidor da XP. Al subir de nivel ganas roles: ${levelRewardsText()}. Mira tu perfil con \`/nivel\` y el top con \`/ranking\`.`)
    .setFooter({ text: "AJ · DEV — antonioooj.dev", iconURL: LOGO });

  const row = new ActionRowBuilder().addComponents(
    linkButton("Normas", channelUrl("normas"), "📜"),
    linkButton("Roles", channelUrl("roles"), "🎭"),
    linkButton("Web", SITE, "🌐"),
  );
  return { embeds: [welcome, pasos, mapa, niveles], components: [row] };
}

function levelRewardsText() {
  return planRoles
    .filter((r) => r.level)
    .sort((a, b) => a.level - b.level)
    .map((r) => role(r.key))
    .join(" → ");
}

function normas() {
  const rules = [
    ["🤝 Respeto ante todo", "Nada de insultos, acoso, discriminación ni ataques personales. Se puede discrepar sin faltar."],
    ["🚫 Cero spam", "Sin flood, cadenas, menciones masivas ni publicidad. Las invitaciones a otros servidores se borran solas."],
    ["🔞 Contenido apropiado", "Nada NSFW, gore, violento o ilegal. Tampoco cracks, leaks ni recursos robados (MLOs/scripts filtrados incluidos)."],
    ["📍 Cada cosa en su canal", "Usa el canal que toca. Las dudas de código van a su foro, con el código y el error completo."],
    ["🔐 Privacidad", "No compartas datos personales tuyos ni de otros. Nunca pidas ni des contraseñas o tokens."],
    ["🧾 Encargos por ticket", "Los presupuestos y pagos se gestionan solo por ticket oficial. Desconfía de cualquiera que te escriba por privado haciéndose pasar por el staff."],
    ["🎭 Nombre y perfil", "Sin nombres ni avatares ofensivos o que imiten al staff."],
    ["⚖️ Decisión del staff", "El equipo puede actuar ante cualquier comportamiento que perjudique a la comunidad aunque no esté escrito aquí."],
  ];
  const embed = header("📜 Normas de la comunidad")
    .setDescription(rules.map(([t, d], i) => `**${i + 1}. ${t}**\n${d}`).join("\n\n"))
    .addFields({
      name: "⚖️ Sanciones",
      value: "1–2 advertencias: aviso · **3**: aislamiento 1 h · **5**: expulsión. Las faltas graves pueden suponer baneo directo.",
    })
    .setFooter({ text: "Al verificarte aceptas estas normas y las Directrices de la comunidad de Discord." });
  const row = new ActionRowBuilder().addComponents(
    linkButton("Directrices de Discord", "https://discord.com/guidelines", "📘"),
    linkButton("Verificarme", channelUrl("verificacion"), "✅"),
  );
  return { embeds: [embed], components: [row] };
}

function redes() {
  const embed = header("🔗 Redes de AntonioooJ")
    .setThumbnail(LOGO)
    .setDescription(
      socials.links.map((l) => `${l.emoji} **${l.label}** — ${l.url.replace(/^https?:\/\/(www\.)?/, "")}`).join("\n") +
        `\n\nLas publicaciones nuevas llegan solas a ${chan("youtube")}, ${chan("directos")}, ${chan("instagram")}, ${chan("tiktok")} y ${chan("github")}.` +
        ` Activa los avisos que quieras en ${chan("roles")}.`,
    );
  const rows = [];
  for (let i = 0; i < socials.links.length; i += 5) {
    rows.push(new ActionRowBuilder().addComponents(socials.links.slice(i, i + 5).map((l) => linkButton(l.label, l.url, l.emoji))));
  }
  return { embeds: [embed], components: rows };
}

function servicios() {
  const embed = header("💼 Servicios")
    .setThumbnail(LOGO)
    .setDescription("Proyectos a medida, del diseño al despliegue. Cada encargo incluye seguimiento y soporte tras la entrega.")
    .addFields(
      { name: "🌐 Webs", value: "Webs para negocios, portfolios, paneles de gestión, reservas, tiendas. Rápidas y con SEO.", inline: false },
      { name: "🎮 Scripts de FiveM", value: "Scripts ESX en Lua con interfaz NUI: tablets, teléfonos, trabajos, policía, bandas… optimizados.", inline: false },
      { name: "🤖 Bots de Discord", value: "Tickets, verificación, niveles, automod, avisos de redes… como el que gestiona este servidor.", inline: false },
      { name: "🖥️ Apps y paneles", value: "Apps de escritorio y paneles internos (agendas, gestión de clientes).", inline: false },
      { name: "📋 Cómo funciona", value: "**1.** Abres ticket con tu idea → **2.** Presupuesto sin compromiso → **3.** Desarrollo con avances → **4.** Entrega y soporte" },
    )
    .setFooter({ text: "Mira trabajos reales en antonioooj.dev" });
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("ticket:quick:presupuesto").setStyle(ButtonStyle.Primary).setLabel("Pedir presupuesto").setEmoji("💼"),
    linkButton("Ver proyectos", SITE, "🌐"),
  );
  return { embeds: [embed], components: [row] };
}

function niveles() {
  const embed = header("🏅 Niveles")
    .setDescription(
      [
        "Cada mensaje da entre **15 y 25 XP** (como mucho una vez por minuto, así que el spam no sirve de nada).",
        "",
        ...planRoles
          .filter((r) => r.level)
          .sort((a, b) => a.level - b.level)
          .map((r) => `**Nivel ${r.level}** → ${role(r.key)}`),
        "",
        "`/nivel` para ver tu progreso · `/ranking` para el top 10. Las subidas de nivel se anuncian aquí.",
      ].join("\n"),
    );
  return { embeds: [embed] };
}

function partners() {
  const embed = header("🤝 Partners")
    .setDescription(
      "Comunidades y proyectos aliados aparecerán aquí.\n\n¿Tienes una comunidad de desarrollo, FiveM o gaming y quieres colaborar? Abre un ticket de **Partnership**.",
    );
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("ticket:quick:partner").setStyle(ButtonStyle.Secondary).setLabel("Solicitar partnership").setEmoji("🤝"),
  );
  return { embeds: [embed], components: [row] };
}

/** canal (key del plano) → función que construye el mensaje */
export const paneles = {
  guia,
  normas,
  verificacion: verificationPanel,
  roles: rolesPanel,
  redes,
  servicios,
  niveles,
  partners,
  abrir_ticket: ticketPanel,
};
