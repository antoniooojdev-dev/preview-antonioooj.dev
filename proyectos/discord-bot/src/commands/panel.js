import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import * as tickets from "../features/tickets.js";
import * as verification from "../features/verification.js";
import { ok } from "../lib/embeds.js";

export default {
  data: new SlashCommandBuilder()
    .setName("panel")
    .setDescription("Publica un panel interactivo en este canal")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((s) => s.setName("tickets").setDescription("Panel para abrir tickets de soporte"))
    .addSubcommand((s) => s.setName("verificacion").setDescription("Panel con botón de verificación")),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const message = sub === "tickets" ? tickets.panelMessage() : verification.panelMessage();
    await interaction.channel.send(message);
    await interaction.reply({ embeds: [ok("Panel publicado.")], flags: MessageFlags.Ephemeral });
  },
};
