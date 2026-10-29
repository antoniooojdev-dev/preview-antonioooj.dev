import { EmbedBuilder, Events } from "discord.js";
import config from "../config.js";
import { discordTime } from "../lib/duration.js";
import { log, sendLog } from "../lib/logger.js";

const NEW_ACCOUNT_DAYS = 7;

export default {
  name: Events.GuildMemberAdd,

  /** @param {import("discord.js").GuildMember} member */
  async execute(member) {
    const { guild, user } = member;

    // bienvenida
    const welcome = config.channels.welcome && guild.channels.cache.get(config.channels.welcome);
    if (welcome?.isTextBased()) {
      const embed = new EmbedBuilder()
        .setColor(config.colors.primary)
        .setTitle(`¡Bienvenido/a a ${guild.name}!`)
        .setDescription(`Hola ${user}, eres el miembro número **${guild.memberCount}**. Pásate por las normas y preséntate 👋`)
        .setThumbnail(user.displayAvatarURL({ size: 256 }));
      await welcome.send({ content: user.toString(), embeds: [embed] }).catch(() => {});
    }

    // rol automático
    if (config.roles.autoRole && !user.bot) {
      await member.roles.add(config.roles.autoRole, "Auto-rol de entrada").catch((err) => log.warn("Auto-rol:", err.message));
    }

    // log con aviso de cuentas recientes (posibles multicuentas o raids)
    const ageDays = (Date.now() - user.createdTimestamp) / 86_400_000;
    await sendLog(guild, {
      title: "📥 Nuevo miembro",
      color: ageDays < NEW_ACCOUNT_DAYS ? config.colors.warning : config.colors.success,
      fields: [
        { name: "Usuario", value: `${user} (${user.tag})`, inline: true },
        { name: "Cuenta creada", value: discordTime(user.createdTimestamp), inline: true },
        ...(ageDays < NEW_ACCOUNT_DAYS ? [{ name: "⚠️ Atención", value: `Cuenta con menos de ${NEW_ACCOUNT_DAYS} días` }] : []),
      ],
    });
  },
};
