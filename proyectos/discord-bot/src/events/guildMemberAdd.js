import { Events } from "discord.js";
import { box, v2, withThumb } from "../lib/ui.js";
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
      const ch = (k) => config.ids.channels[k] && `<#${config.ids.channels[k]}>`;
      await welcome
        .send({
          ...v2(
            box([
              withThumb(
                user.displayAvatarURL({ size: 256 }),
                `-# Miembro #${guild.memberCount}`,
                `## 👋 ¡Hola, ${member.displayName}!`,
                `${user} *${greet}*`,
              ),
              "---",
              `-# Verifícate en ${ch("normas") ?? "las normas"} · después pásate por ${ch("guia") ?? "la guía"}`,
            ]),
          ),
          allowedMentions: { users: [user.id] },
        })
        .catch(() => {});
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
