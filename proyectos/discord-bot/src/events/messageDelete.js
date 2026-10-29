import { Events } from "discord.js";
import config from "../config.js";
import { sendLog } from "../lib/logger.js";

export default {
  name: Events.MessageDelete,

  /** @param {import("discord.js").Message | import("discord.js").PartialMessage} message */
  async execute(message) {
    // mensajes anteriores al arranque del bot llegan "parciales" y sin contenido
    if (message.partial || !message.inGuild() || message.author.bot) return;
    if (!message.content && !message.attachments.size) return;

    await sendLog(message.guild, {
      title: "🗑️ Mensaje eliminado",
      color: config.colors.danger,
      fields: [
        { name: "Autor", value: `${message.author} (${message.author.id})`, inline: true },
        { name: "Canal", value: message.channel.toString(), inline: true },
        { name: "Contenido", value: message.content.slice(0, 1000) || "(sin texto)" },
        ...(message.attachments.size
          ? [{ name: "Adjuntos", value: message.attachments.map((a) => a.name).join(", ").slice(0, 1000) }]
          : []),
      ],
    });
  },
};
