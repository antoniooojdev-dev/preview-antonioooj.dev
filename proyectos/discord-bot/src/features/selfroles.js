// Roles auto-asignables (avisos e intereses) con menús desplegables en #roles.

import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags, StringSelectMenuBuilder } from "discord.js";
import config from "../config.js";
import { LOGO, roles as planRoles } from "../servidor/plan.js";
import { fail, ok } from "../lib/embeds.js";

const GROUPS = {
  avisos: { title: "🔔 Avisos", placeholder: "Elige qué avisos quieres recibir…" },
  intereses: { title: "🧠 Intereses", placeholder: "¿Qué te interesa?" },
};

const groupRoles = (group) => planRoles.filter((r) => r.group === group && config.ids.roles[r.key]);

export function panelMessage() {
  const embed = new EmbedBuilder()
    .setColor(config.colors.primary)
    .setAuthor({ name: "AJ · DEV", iconURL: LOGO })
    .setTitle("🎭 Elige tus roles")
    .setDescription(
      [
        "Abre los menús y marca lo que quieras. Puedes cambiarlo cuando te apetezca: lo que desmarques se quita.",
        "",
        ...Object.entries(GROUPS).map(
          ([g, { title }]) => `**${title}**\n${groupRoles(g).map((r) => `${r.emoji} <@&${config.ids.roles[r.key]}> — ${r.desc}`).join("\n")}`,
        ),
      ].join("\n"),
    );

  const rows = Object.entries(GROUPS)
    .filter(([g]) => groupRoles(g).length)
    .map(([g, { placeholder }]) => {
      const list = groupRoles(g);
      return new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(`roles:pick:${g}`)
          .setPlaceholder(placeholder)
          .setMinValues(0)
          .setMaxValues(list.length)
          .addOptions(list.map((r) => ({ label: r.name.replace(/^\S+\s/, ""), value: r.key, emoji: r.emoji, description: r.desc }))),
      );
    });
  rows.push(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("roles:mine").setLabel("Ver mis roles").setEmoji("👤").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("roles:clear").setLabel("Quitar todos").setEmoji("🧹").setStyle(ButtonStyle.Danger),
    ),
  );
  return { embeds: [embed], components: rows };
}

const reply = (interaction, embed) => interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });

/** Menú desplegable: deja el grupo exactamente como lo ha marcado el usuario */
export async function onSelect(interaction, action, group) {
  if (action !== "pick" || !GROUPS[group]) return;
  const member = interaction.member;
  const all = groupRoles(group).map((r) => config.ids.roles[r.key]);
  const wanted = interaction.values.map((k) => config.ids.roles[k]).filter((id) => all.includes(id));

  const add = wanted.filter((id) => !member.roles.cache.has(id));
  const remove = all.filter((id) => !wanted.includes(id) && member.roles.cache.has(id));

  try {
    if (add.length) await member.roles.add(add, "Auto-roles");
    if (remove.length) await member.roles.remove(remove, "Auto-roles");
  } catch {
    return reply(interaction, fail("No he podido cambiar tus roles. Avisa al staff (el rol del bot debe estar por encima)."));
  }

  const lines = [...add.map((id) => `➕ <@&${id}>`), ...remove.map((id) => `➖ <@&${id}>`)];
  return reply(interaction, ok(lines.length ? `Roles actualizados:\n${lines.join("\n")}` : "No había nada que cambiar."));
}

export async function onButton(interaction, action) {
  const all = Object.keys(GROUPS).flatMap((g) => groupRoles(g).map((r) => config.ids.roles[r.key]));
  const mine = all.filter((id) => interaction.member.roles.cache.has(id));

  if (action === "mine") {
    return reply(interaction, ok(mine.length ? `Tus roles: ${mine.map((id) => `<@&${id}>`).join(" ")}` : "No tienes ningún rol de avisos ni intereses."));
  }
  if (action === "clear") {
    if (mine.length) await interaction.member.roles.remove(mine, "Auto-roles: quitar todos").catch(() => {});
    return reply(interaction, ok("Te he quitado todos los roles de avisos e intereses."));
  }
}
