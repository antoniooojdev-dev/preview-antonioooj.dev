import { MessageFlags, SlashCommandBuilder } from "discord.js";
import { info } from "../lib/embeds.js";

export default {
  data: new SlashCommandBuilder().setName("ping").setDescription("Comprueba la latencia del bot"),

  async execute(interaction) {
    const sent = Date.now();
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const roundtrip = Date.now() - sent;
    await interaction.editReply({
      embeds: [info(`🏓 **Pong!**\nAPI: \`${roundtrip} ms\` · WebSocket: \`${interaction.client.ws.ping} ms\``)],
    });
  },
};
