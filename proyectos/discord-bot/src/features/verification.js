import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags } from "discord.js";
import config from "../config.js";
import { fail, info, ok } from "../lib/embeds.js";
import { sendLog } from "../lib/logger.js";

export function panelMessage() {
  const embed = new EmbedBuilder()
    .setColor(config.colors.success)
    .setTitle("✅ Verificación")
    .setDescription("Lee las normas del servidor y pulsa el botón para acceder al resto de canales.");
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
  return reply(ok("¡Verificado! Ya tienes acceso al servidor."));
}
