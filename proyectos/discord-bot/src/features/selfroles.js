// Roles auto-asignables (avisos e intereses) con menús desplegables en #roles.

import { ButtonStyle, MessageFlags, StringSelectMenuBuilder } from "discord.js";
import { box, btn, h1, h3, row, v2 } from "../lib/ui.js";
import config from "../config.js";
import { roles as planRoles } from "../servidor/plan.js";
import { fail, ok } from "../lib/embeds.js";

const GROUPS = {
  avisos: { placeholder: "Elige tus avisos…" },
  intereses: { placeholder: "Elige tus intereses…" },
};

const groupRoles = (group) => planRoles.filter((r) => r.group === group && config.ids.roles[r.key]);

export function panelMessage() {
  const selects = Object.entries(GROUPS)
    .filter(([g]) => groupRoles(g).length)
    .map(([g, { placeholder }]) => {
      const list = groupRoles(g);
      return row(
        new StringSelectMenuBuilder()
          .setCustomId(`roles:pick:${g}`)
          .setPlaceholder(placeholder)
          .setMinValues(0)
          .setMaxValues(list.length)
          .addOptions(list.map((r) => ({ label: r.name.replace(/^\S+\s/, ""), value: r.key, emoji: r.emoji, description: r.desc }))),
      );
    });

  return v2(
    box([
      h1("Tus roles", "🎭"),
      "-# Marca lo que quieras. Lo que **desmarques**, se quita.",
      "---",
      h3("Avisos", "🔔"),
      "-# Solo te mencionamos por lo que **elijas**.",
      selects[0],
      h3("Intereses", "🧠"),
      "-# Para que la comunidad sepa de **qué te gusta hablar**.",
      selects[1],
      "---",
      row(
        btn("roles:mine", "Ver mis roles", { emoji: "👤" }),
        btn("roles:clear", "Quitar todos", { emoji: "🧹", style: ButtonStyle.Danger }),
      ),
    ]),
  );
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
