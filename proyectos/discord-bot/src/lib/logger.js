import { EmbedBuilder } from "discord.js";
import config from "../config.js";

const time = () => new Date().toLocaleTimeString("es-ES", { hour12: false });

export const log = {
  info: (...args) => console.log(`\x1b[90m${time()}\x1b[0m \x1b[36minfo\x1b[0m `, ...args),
  warn: (...args) => console.warn(`\x1b[90m${time()}\x1b[0m \x1b[33mwarn\x1b[0m `, ...args),
  error: (...args) => console.error(`\x1b[90m${time()}\x1b[0m \x1b[31merror\x1b[0m`, ...args),
};

/**
 * Envía un embed al canal de logs del servidor (si está configurado).
 * @param {import("discord.js").Guild} guild
 * @param {{ title: string, description?: string, color?: number, fields?: {name:string,value:string,inline?:boolean}[] }} entry
 * @param {import("discord.js").AttachmentBuilder[]} [files]
 */
export async function sendLog(guild, { title, description, color = config.colors.neutral, fields = [] }, files = []) {
  if (!config.channels.logs) return;
  const channel = guild.channels.cache.get(config.channels.logs);
  if (!channel?.isTextBased()) return;

  const embed = new EmbedBuilder().setTitle(title).setColor(color).setTimestamp();
  if (description) embed.setDescription(description.slice(0, 4000));
  if (fields.length) embed.addFields(fields);

  await channel.send({ embeds: [embed], files }).catch((err) => log.warn("No se pudo enviar al canal de logs:", err.message));
}
