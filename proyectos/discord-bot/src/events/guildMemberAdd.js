import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, Events } from "discord.js";
import config from "../config.js";
import { discordTime } from "../lib/duration.js";
import { log, sendLog } from "../lib/logger.js";
import { updateStats } from "../features/stats.js";

const NEW_ACCOUNT_DAYS = 7;

const GREETINGS = [
  "acaba de aterrizar 🛬",
  "ha hecho `git clone` del servidor 💻",
  "ha entrado sin romper producción 🚀",
  "se ha unido a la party 🎉",
  "ha compilado a la primera ✨",
];

export default {
  name: Events.GuildMemberAdd,

  /** @param {import("discord.js").GuildMember} member */
  async execute(member) {
    const { guild, user } = member;

    // bienvenida
    const welcome = config.channels.welcome && guild.channels.cache.get(config.channels.welcome);
    if (welcome?.isTextBased()) {
      const greet = GREETINGS[Math.floor(Math.random() * GREETINGS.length)];
      const embed = new EmbedBuilder()
        .setColor(config.colors.primary)
        .setAuthor({ name: `${member.displayName} ${greet}`, iconURL: user.displayAvatarURL() })
        .setTitle(`¡Bienvenido/a a ${guild.name}!`)
        .setDescription(
          [
            `Hola ${user}, eres el miembro **#${guild.memberCount}** 🎉`,
            "",
            config.channels.rules && `📜 Lee las <#${config.channels.rules}>`,
            config.ids.channels.verificacion && `✅ Verifícate en <#${config.ids.channels.verificacion}>`,
            config.channels.roles && `🎭 Elige tus roles en <#${config.channels.roles}>`,
          ]
            .filter((l) => l !== false && l !== undefined && l !== "")
            .join("\n"),
        )
        .setThumbnail(user.displayAvatarURL({ size: 256 }))
        .setFooter({ text: guild.name, iconURL: guild.iconURL() ?? undefined })
        .setTimestamp();

      const components = [];
      if (config.channels.guide) {
        components.push(
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setStyle(ButtonStyle.Link)
              .setLabel("Guía del servidor")
              .setEmoji("📖")
              .setURL(`https://discord.com/channels/${guild.id}/${config.channels.guide}`),
          ),
        );
      }
      await welcome.send({ content: user.toString(), embeds: [embed], components }).catch(() => {});
    }

    // rol automático
    if (config.roles.autoRole && !user.bot) {
      await member.roles.add(config.roles.autoRole, "Auto-rol de entrada").catch((err) => log.warn("Auto-rol:", err.message));
    }

    await updateStats(guild);

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
