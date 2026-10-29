import { EmbedBuilder, MessageFlags, PermissionsBitField, SlashCommandBuilder } from "discord.js";
import config from "../config.js";

export default {
  data: new SlashCommandBuilder().setName("ayuda").setDescription("Lista de comandos disponibles"),

  async execute(interaction) {
    // solo muestra los comandos que el usuario puede usar
    const visible = [...interaction.client.commands.values()].filter(({ data }) => {
      const perms = data.default_member_permissions;
      return !perms || interaction.memberPermissions?.has(new PermissionsBitField(BigInt(perms)));
    });

    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle("📖 Comandos")
      .setDescription(visible.map(({ data }) => `**/${data.name}** — ${data.description}`).join("\n"))
      .setFooter({ text: "Además: automod, niveles por actividad, bienvenidas y mensajes programados." });

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};
