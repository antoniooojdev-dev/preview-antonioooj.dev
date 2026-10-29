import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { create } from "../features/giveaways.js";
import { parseDuration } from "../lib/duration.js";
import { fail } from "../lib/embeds.js";

export default {
  data: new SlashCommandBuilder()
    .setName("sorteo")
    .setDescription("Crea un sorteo con botón de participación y ganadores automáticos")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption((o) => o.setName("premio").setDescription("¿Qué se sortea?").setRequired(true).setMaxLength(200))
    .addStringOption((o) => o.setName("duracion").setDescription("Ej: 1h, 3d, 1w").setRequired(true))
    .addIntegerOption((o) => o.setName("ganadores").setDescription("Número de ganadores (1–20)").setMinValue(1).setMaxValue(20)),

  async execute(interaction) {
    const duration = parseDuration(interaction.options.getString("duracion"));
    if (!duration || duration < 60_000) {
      return interaction.reply({ embeds: [fail("Duración no válida (mínimo 1m). Ej: `1h`, `3d`.")], flags: MessageFlags.Ephemeral });
    }
    await create(interaction, interaction.options.getString("premio"), interaction.options.getInteger("ganadores") ?? 1, duration);
  },
};
