import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import config from "../config.js";
import { leaderboard, peekProfile, xpForLevel } from "../features/levels.js";
import { progressBar } from "../lib/embeds.js";

export default {
  data: new SlashCommandBuilder()
    .setName("nivel")
    .setDescription("Muestra tu nivel o el de otro usuario")
    .addUserOption((o) => o.setName("usuario").setDescription("Usuario a consultar")),

  async execute(interaction) {
    const user = interaction.options.getUser("usuario") ?? interaction.user;
    const profile = peekProfile(interaction.guildId, user.id);
    const need = xpForLevel(profile.level);
    const position = leaderboard(interaction.guildId).findIndex((p) => p.userId === user.id) + 1;

    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setAuthor({ name: user.displayName, iconURL: user.displayAvatarURL() })
      .addFields(
        { name: "Nivel", value: `**${profile.level}**`, inline: true },
        { name: "Puesto", value: position ? `#${position}` : "—", inline: true },
        { name: "XP total", value: profile.total.toLocaleString("es-ES"), inline: true },
        { name: `Progreso · ${profile.xp}/${need} XP`, value: progressBar(profile.xp, need, 16) },
      );

    await interaction.reply({ embeds: [embed] });
  },
};
