import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags } from "discord.js";
import config from "../config.js";
import { LOGO } from "../servidor/plan.js";
import { fail, info, ok } from "../lib/embeds.js";
import { sendLog } from "../lib/logger.js";

export function panelMessage() {
  const rules = config.channels.rules ? `<#${config.channels.rules}>` : "las normas";
  const embed = new EmbedBuilder()
    .setColor(config.colors.primary)
    .setAuthor({ name: "AJ · DEV", iconURL: LOGO })
    .setTitle("✅ Verificación")
    .setDescription(
      `Para ver el resto del servidor, lee ${rules} y pulsa **Verificarme**.

` +
        "Al hacerlo confirmas que las aceptas. Este paso frena bots y raids: ¡gracias por la paciencia! 🤝",
    );
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("verify:go").setLabel("Verificarme").setEmoji("✅").setStyle(ButtonStyle.Success),
  );
  return { embeds: [embed], components: [row] };
}

/** @param {import("discord.js").ButtonInteraction} interaction */
export async function onButton(interaction) {
  const reply = (embed) => interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  const roleId = config.roles.verified;

  if (!roleId) return reply(fail("La verificación no está configurada (`roles.verified`)."));
  if (interaction.member.roles.cache.has(roleId)) return reply(info("Ya estás verificado 👍"));

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
  const roles = config.channels.roles ? ` Elige tus avisos en <#${config.channels.roles}>.` : "";
  return reply(ok(`¡Verificado! Ya tienes acceso al servidor.${roles}`));
}
