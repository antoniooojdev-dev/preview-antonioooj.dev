import { Events } from "discord.js";
import config from "../config.js";
import { discordTime } from "../lib/duration.js";
import { sendLog } from "../lib/logger.js";

export default {
  name: Events.GuildMemberRemove,

  /** @param {import("discord.js").GuildMember | import("discord.js").PartialGuildMember} member */
  async execute(member) {
    await sendLog(member.guild, {
      title: "📤 Miembro ha salido",
      color: config.colors.neutral,
      fields: [
        { name: "Usuario", value: `${member.user} (${member.user.tag})`, inline: true },
        { name: "Se unió", value: member.joinedTimestamp ? discordTime(member.joinedTimestamp) : "desconocido", inline: true },
      ],
    });
  },
};
