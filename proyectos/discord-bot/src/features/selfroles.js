// Roles auto-asignables (avisos e intereses) con menús desplegables, debajo de la guía.
// Mismo estilo que normas y verificación: recuadro con el texto y, debajo y fuera de él,
// los menús y los botones. Las respuestas (solo las ve quien pulsa) siguen el mismo diseño.

import { ButtonStyle, StringSelectMenuBuilder } from "discord.js";
import { box, btn, etiqueta, h1, h3, row, v2, v2Ephemeral } from "../lib/ui.js";
import config from "../config.js";
import { roles as planRoles } from "../servidor/plan.js";

const GROUPS = {
  avisos: { placeholder: "🔔 Elegir avisos…", emoji: "🔔", titulo: "Avisos" },
  intereses: { placeholder: "🧠 Elegir intereses…", emoji: "🧠", titulo: "Intereses" },
};

const groupRoles = (group) => planRoles.filter((r) => r.group === group && config.ids.roles[r.key]);
const etiquetaRol = (r) => r.label ?? r.name.replace(/^\S+\s/, "");
const mencion = (id) => `<@&${id}>`;

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
          .addOptions(list.map((r) => ({ label: etiquetaRol(r), value: r.key, emoji: r.emoji, description: r.desc }))),
      );
    });

  const lista = (g) => groupRoles(g).map((r) => `${r.emoji} ${etiquetaRol(r)}`).join("  ·  ");
  return v2(
    box([
      h1("Tus roles"),
      "Cada menú de aquí debajo deja los roles **tal cual se marquen**: lo que se desmarca, se quita.",
      "---",
      [
        "**`01`  AVISOS**",
        "Solo llegan menciones de lo que se elija.",
        `-# ${lista("avisos")}`,
        "",
        "**`02`  INTERESES**",
        "Para que la comunidad sepa de **qué te gusta hablar**.",
        `-# ${lista("intereses")}`,
      ].join("\n"),
    ]),
    // menús y botones debajo, fuera del recuadro
    selects,
    row(
      btn("roles:mine", "Ver mis roles", { emoji: "👤" }),
      btn("roles:clear", "Quitar todos", { emoji: "🧹", style: ButtonStyle.Danger }),
    ),
  );
}

const responder = (interaction, ...partes) => interaction.reply(v2Ephemeral(box(partes)));

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
    return responder(
      interaction,
      etiqueta("❌ Roles"),
      h3("No se han podido cambiar"),
      "El rol del bot tiene que estar **por encima** de estos roles. El equipo lo puede revisar.",
    );
  }

  const { emoji, titulo } = GROUPS[group];
  if (!add.length && !remove.length) {
    return responder(interaction, etiqueta(`${emoji} ${titulo}`), "**Sin cambios**: los roles ya estaban así.");
  }
  return responder(
    interaction,
    etiqueta(`${emoji} ${titulo}`, "**actualizados**"),
    h3("Roles actualizados", "✅"),
    "---",
    [add.length && `**AÑADIDOS**\n${add.map((id) => `➕ ${mencion(id)}`).join("\n")}`, remove.length && `**QUITADOS**\n${remove.map((id) => `➖ ${mencion(id)}`).join("\n")}`]
      .filter(Boolean)
      .join("\n\n"),
  );
}

export async function onButton(interaction, action) {
  const ids = (g) => groupRoles(g).map((r) => config.ids.roles[r.key]).filter((id) => interaction.member.roles.cache.has(id));
  const mine = Object.keys(GROUPS).flatMap(ids);

  if (action === "mine") {
    if (!mine.length) return responder(interaction, etiqueta("👤 Tus roles"), "**Ningún rol** de avisos ni intereses por ahora. Se eligen en los menús de la guía.");
    return responder(
      interaction,
      etiqueta("👤 Tus roles"),
      h3("Tus roles"),
      "---",
      Object.entries(GROUPS)
        .map(([g, { emoji, titulo }]) => `**${emoji} ${titulo.toLocaleUpperCase("es-ES")}**\n${ids(g).map(mencion).join("  ") || "-# Ninguno"}`)
        .join("\n\n"),
    );
  }
  if (action === "clear") {
    if (!mine.length) return responder(interaction, etiqueta("🧹 Roles"), "**Sin cambios**: no había roles de avisos ni intereses.");
    await interaction.member.roles.remove(mine, "Auto-roles: quitar todos").catch(() => {});
    return responder(interaction, etiqueta("🧹 Roles", "**quitados**"), h3("Roles quitados", "🧹"), `Se han quitado **${mine.length}** roles de avisos e intereses.`);
  }
}
