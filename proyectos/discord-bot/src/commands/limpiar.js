import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import config from "../config.js";
import { fail, ok } from "../lib/embeds.js";
import { sendLog } from "../lib/logger.js";

const FOURTEEN_DAYS = 14 * 86_400_000;

export default {
  data: new SlashCommandBuilder()
    .setName("limpiar")
    .setDescription("Borra mensajes recientes del canal")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addIntegerOption((o) => o.setName("cantidad").setDescription("Cuántos (1–100)").setRequired(true).setMinValue(1).setMaxValue(100))
    .addUserOption((o) => o.setName("usuario").setDescription("Solo los mensajes de este usuario")),

  async execute(interaction) {
    const amount = interaction.options.getInteger("cantidad");
    const user = interaction.options.getUser("usuario");
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const fetched = await interaction.channel.messages.fetch({ limit: 100 });
    // Discord no permite borrar en bloque mensajes de más de 14 días
    const toDelete = [...fetched.values()]
      .filter((m) => Date.now() - m.createdTimestamp < FOURTEEN_DAYS)
      .filter((m) => !user || m.author.id === user.id)
      .slice(0, amount);

    if (!toDelete.length) return interaction.editReply({ embeds: [fail("No hay mensajes que se puedan borrar.")] });

    const deleted = await interaction.channel.bulkDelete(toDelete, true);
    await interaction.editReply({ embeds: [ok(`Borrados **${deleted.size}** mensajes${user ? ` de ${user}` : ""}.`)] });

    await sendLog(interaction.guild, {
      title: "🧹 Limpieza de mensajes",
      color: config.colors.neutral,
      fields: [
        { name: "Canal", value: interaction.channel.toString(), inline: true },
        { name: "Cantidad", value: String(deleted.size), inline: true },
        { name: "Moderador", value: interaction.user.toString(), inline: true },
      ],
    });
  },
};
