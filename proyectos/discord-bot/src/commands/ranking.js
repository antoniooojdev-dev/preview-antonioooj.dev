import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import config from "../config.js";
import { leaderboard } from "../features/levels.js";

const MEDALS = ["🥇", "🥈", "🥉"];

export default {
  data: new SlashCommandBuilder().setName("ranking").setDescription("Top 10 de usuarios más activos"),

  async execute(interaction) {
    const top = leaderboard(interaction.guildId).slice(0, 10);
    const lines = top.map(
      (p, i) => `${MEDALS[i] ?? `\`#${i + 1}\``} <@${p.userId}> — nivel **${p.level}** · ${p.total.toLocaleString("es-ES")} XP`,
    );

    const embed = new EmbedBuilder()
      .setColor(config.colors.warning)
      .setTitle(`🏆 Ranking de ${interaction.guild.name}`)
      .setDescription(lines.join("\n") || "Todavía nadie tiene XP. ¡Empezad a hablar!");

    await interaction.reply({ embeds: [embed], allowedMentions: { users: [] } });
  },
};
