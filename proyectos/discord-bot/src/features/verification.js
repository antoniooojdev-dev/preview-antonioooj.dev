import { ButtonStyle, MessageFlags } from "discord.js";
import { box, btn, h2, row, v2, v2Ephemeral } from "../lib/ui.js";
import config from "../config.js";
import { fail } from "../lib/embeds.js";
import { sendLog } from "../lib/logger.js";

export function panelMessage() {
  const rules = config.channels.rules ? `<#${config.channels.rules}>` : "las normas";
  return v2(
    box([
      h2("Verificación", "✅"),
      `Lee ${rules} y pulsa el botón para __desbloquear el servidor__.`,
      row(btn("verify:go", "He leído y acepto las normas", { emoji: "✅", style: ButtonStyle.Success })),
    ]),
  );
}

/** @param {import("discord.js").ButtonInteraction} interaction */
export async function onButton(interaction) {
  const reply = (embed) => interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  const roleId = config.roles.verified;

  if (!roleId) return reply(fail("La verificación no está configurada (`roles.verified`)."));
  // el mensaje de #normas es el mismo para todos: a quien ya aceptó se le enseña (solo a él)
  // el botón cambiado, desactivado
  const confirmado = (texto) =>
    interaction.reply(
      v2Ephemeral(
        box([texto]),
        row(btn("verify:hecho", "Ya has confirmado la lectura de las normas", { emoji: "✅", style: ButtonStyle.Success, disabled: true })),
      ),
    );
  if (interaction.member.roles.cache.has(roleId)) return confirmado("Las normas ya están **aceptadas**: tienes acceso a todo el servidor.");

  try {
    await interaction.member.roles.add(roleId, "Verificación por botón");
  } catch {
    return reply(fail("No puedo darte el rol. Avisa a un administrador (el rol del bot debe estar por encima)."));
  }

  await sendLog(interaction.guild, {
    title: "✅ Usuario verificado",
    color: config.colors.success,
    description: `${interaction.user} (${interaction.user.id})`,
  });
  const roles = config.channels.guide ? `
-# En <#${config.channels.guide}> se eligen los avisos e intereses.` : "";
  return confirmado(`**¡Listo!** Ya tienes acceso al servidor.${roles}`);
}
