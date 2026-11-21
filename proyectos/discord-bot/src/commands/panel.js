import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { paneles } from "../servidor/paneles.js";
import { ok } from "../lib/embeds.js";

const NOMBRES = {
  guia: "📖 Guía del servidor",
  normas: "📜 Normas",
  verificacion: "✅ Verificación",
  roles: "🎭 Auto-roles",
  redes: "🔗 Redes",
  servicios: "💼 Servicios",
  niveles: "🏅 Niveles",
  partners: "🤝 Partners",
  abrir_ticket: "🎫 Tickets",
};

export default {
  data: new SlashCommandBuilder()
    .setName("panel")
    .setDescription("Publica un panel en este canal (el setup ya los coloca en su sitio)")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption((o) =>
      o
        .setName("tipo")
        .setDescription("Qué panel")
        .setRequired(true)
        .addChoices(...Object.keys(paneles).map((value) => ({ name: NOMBRES[value] ?? value, value }))),
    ),

  async execute(interaction) {
    const build = paneles[interaction.options.getString("tipo")];
    await interaction.channel.send(build());
    await interaction.reply({ embeds: [ok("Panel publicado.")], flags: MessageFlags.Ephemeral });
  },
};
