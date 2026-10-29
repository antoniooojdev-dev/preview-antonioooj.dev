import { EmbedBuilder, MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import config from "../config.js";
import { guildBucket, save } from "../lib/store.js";
import { discordTime } from "../lib/duration.js";
import { ok } from "../lib/embeds.js";

export default {
  data: new SlashCommandBuilder()
    .setName("advertencias")
    .setDescription("Consulta o limpia las advertencias de un usuario")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((o) => o.setName("usuario").setDescription("Usuario").setRequired(true))
    .addBooleanOption((o) => o.setName("limpiar").setDescription("Borrar todas sus advertencias")),

  async execute(interaction) {
    const user = interaction.options.getUser("usuario");
    const bucket = guildBucket("warns", interaction.guildId);
    const warns = bucket[user.id] ?? [];

    if (interaction.options.getBoolean("limpiar")) {
      delete bucket[user.id];
      save();
      return interaction.reply({ embeds: [ok(`Borradas ${warns.length} advertencias de ${user}.`)], flags: MessageFlags.Ephemeral });
    }

    const embed = new EmbedBuilder()
      .setColor(config.colors.warning)
      .setAuthor({ name: `Advertencias de ${user.displayName}`, iconURL: user.displayAvatarURL() })
      .setDescription(
        warns.length
          ? warns
              .slice(-15)
              .map((w, i) => `**${i + 1}.** ${w.reason}\n└ por <@${w.by}> ${discordTime(w.at)}`)
              .join("\n")
          : "Sin advertencias. 👌",
      )
      .setFooter({ text: `Total: ${warns.length}` });

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};
