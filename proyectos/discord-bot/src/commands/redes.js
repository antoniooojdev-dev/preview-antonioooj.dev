import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import config from "../config.js";
import { LOGO, socials } from "../servidor/plan.js";

export default {
  data: new SlashCommandBuilder().setName("redes").setDescription("Enlaces a la web y las redes de AntonioooJ"),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setAuthor({ name: "antonioooj.dev", iconURL: LOGO })
      .setTitle("🔗 REDES")
      .setDescription(socials.links.map((l) => `${l.emoji} **[${l.label}](${l.url})**`).join("\n"));
    const row = new ActionRowBuilder().addComponents(
      socials.links.slice(0, 5).map((l) => new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel(l.label).setEmoji(l.emoji).setURL(l.url)),
    );
    await interaction.reply({ embeds: [embed], components: [row] });
  },
};
