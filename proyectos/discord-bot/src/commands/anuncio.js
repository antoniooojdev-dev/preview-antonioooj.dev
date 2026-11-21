import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { DESTINOS, ESTILOS, openForm } from "../features/announcements.js";

export default {
  data: new SlashCommandBuilder()
    .setName("anuncio")
    .setDescription("Publica un anuncio con formato (abre un formulario)")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption((o) =>
      o
        .setName("canal")
        .setDescription("Dónde se publica")
        .setRequired(true)
        .addChoices(...Object.entries(DESTINOS).map(([value, d]) => ({ name: d.label, value }))),
    )
    .addStringOption((o) =>
      o
        .setName("mencion")
        .setDescription("A quién avisar")
        .addChoices(
          { name: "Nadie", value: "ninguna" },
          { name: "Rol de avisos del canal (recomendado)", value: "rol" },
          { name: "@everyone", value: "everyone" },
        ),
    )
    .addStringOption((o) =>
      o
        .setName("estilo")
        .setDescription("Color y tono del anuncio")
        .addChoices(...Object.entries(ESTILOS).map(([value, e]) => ({ name: e.label, value }))),
    ),

  async execute(interaction) {
    await openForm(
      interaction,
      interaction.options.getString("canal"),
      interaction.options.getString("mencion") ?? "rol",
      interaction.options.getString("estilo") ?? "marca",
    );
  },
};
