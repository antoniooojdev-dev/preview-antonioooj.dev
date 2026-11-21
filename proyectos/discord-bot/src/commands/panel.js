import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { panelesSueltos as paneles } from "../servidor/paneles.js";
import { ok } from "../lib/embeds.js";

const NOMBRES = {
  guia: "🧭 Guía + roles",
  normas: "📜 Normas + verificación",
  verificacion: "✅ Solo verificación",
  roles: "🎭 Solo roles",
  servicios: "💼 Servicios",
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
    for (const msg of [build()].flat()) await interaction.channel.send(msg);
    await interaction.reply({ embeds: [ok("Panel publicado.")], flags: MessageFlags.Ephemeral });
  },
};
