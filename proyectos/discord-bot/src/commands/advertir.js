import { EmbedBuilder, MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import config from "../config.js";
import { guildBucket, save } from "../lib/store.js";
import { fail } from "../lib/embeds.js";
import { sendLog } from "../lib/logger.js";

export default {
  data: new SlashCommandBuilder()
    .setName("advertir")
    .setDescription("Advierte a un usuario (con sanciones automáticas por acumulación)")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((o) => o.setName("usuario").setDescription("Usuario a advertir").setRequired(true))
    .addStringOption((o) => o.setName("motivo").setDescription("Motivo").setRequired(true).setMaxLength(300)),

  async execute(interaction) {
    const target = interaction.options.getMember("usuario");
    const reason = interaction.options.getString("motivo");
    const failReply = (text) => interaction.reply({ embeds: [fail(text)], flags: MessageFlags.Ephemeral });

    if (!target) return failReply("Ese usuario no está en el servidor.");
    if (target.user.bot) return failReply("No se puede advertir a un bot.");
    if (target.id === interaction.user.id) return failReply("No puedes advertirte a ti mismo.");
    if (target.roles.highest.position >= interaction.member.roles.highest.position && interaction.guild.ownerId !== interaction.user.id) {
      return failReply("No puedes advertir a alguien con un rol igual o superior al tuyo.");
    }

    const bucket = guildBucket("warns", interaction.guildId);
    bucket[target.id] ??= [];
    bucket[target.id].push({ reason, by: interaction.user.id, at: Date.now() });
    save();
    const count = bucket[target.id].length;

    // sanción escalonada
    const { timeoutAt, timeoutMinutes, kickAt } = config.warns;
    let sanction = null;
    if (count >= kickAt && target.kickable) {
      await target.send(`Has sido expulsado de **${interaction.guild.name}** por acumular ${count} advertencias.`).catch(() => {});
      await target.kick(`Acumula ${count} advertencias`);
      sanction = "👢 Expulsado del servidor";
    } else if (count >= timeoutAt && target.moderatable) {
      await target.timeout(timeoutMinutes * 60_000, `Acumula ${count} advertencias`);
      sanction = `🔇 Aislado ${timeoutMinutes} min`;
    }

    if (!sanction || !sanction.startsWith("👢")) {
      await target
        .send(`⚠️ Has recibido una advertencia en **${interaction.guild.name}**.\n**Motivo:** ${reason}\n**Total:** ${count}`)
        .catch(() => {});
    }

    const embed = new EmbedBuilder()
      .setColor(config.colors.warning)
      .setTitle("⚠️ Advertencia")
      .addFields(
        { name: "Usuario", value: target.toString(), inline: true },
        { name: "Total", value: String(count), inline: true },
        { name: "Motivo", value: reason },
      );
    if (sanction) embed.addFields({ name: "Sanción automática", value: sanction });

    await interaction.reply({ embeds: [embed] });
    await sendLog(interaction.guild, {
      title: "⚠️ Advertencia",
      color: config.colors.warning,
      fields: [
        { name: "Usuario", value: `${target} (${target.id})`, inline: true },
        { name: "Moderador", value: interaction.user.toString(), inline: true },
        { name: "Motivo", value: reason },
        ...(sanction ? [{ name: "Sanción", value: sanction }] : []),
      ],
    });
  },
};
