// Canales de voz-contador (👥 Miembros: N). Discord solo deja renombrar un canal
// 2 veces cada 10 min, así que se actualiza como mucho cada 6 min por canal.

import config from "../config.js";
import { categories } from "../servidor/plan.js";
import { log } from "../lib/logger.js";

const MIN_INTERVAL = 6 * 60_000;
const lastEdit = new Map(); // channelId → timestamp
const pending = new Map(); // guildId → timeout

const statChannels = categories.flatMap((c) => c.channels).filter((c) => c.stat);

const LABELS = {
  miembros: (g) => `👥 Miembros: ${g.members.cache.filter((m) => !m.user.bot).size || g.memberCount}`,
  boosts: (g) => `🚀 Mejoras: ${g.premiumSubscriptionCount ?? 0} · Nv ${g.premiumTier}`,
};

/** @param {import("discord.js").Guild} guild */
export async function updateStats(guild) {
  let retryIn = 0;
  for (const def of statChannels) {
    const channel = guild.channels.cache.get(config.ids.channels[def.key]);
    if (!channel) continue;
    const name = LABELS[def.stat]?.(guild);
    if (!name || channel.name === name) continue;

    const wait = (lastEdit.get(channel.id) ?? 0) + MIN_INTERVAL - Date.now();
    if (wait > 0) {
      retryIn = Math.max(retryIn, wait);
      continue;
    }
    lastEdit.set(channel.id, Date.now());
    await channel.setName(name, "Contador de estadísticas").catch((err) => log.warn("Estadísticas:", err.message));
  }

  // si algo quedó pendiente por el límite, se reintenta solo
  if (retryIn && !pending.has(guild.id)) {
    pending.set(
      guild.id,
      setTimeout(() => {
        pending.delete(guild.id);
        updateStats(guild);
      }, retryIn + 1000),
    );
  }
}

export async function startStats(client) {
  for (const guild of client.guilds.cache.values()) {
    await guild.members.fetch().catch(() => {}); // para contar sin bots
    await updateStats(guild);
  }
  setInterval(() => client.guilds.cache.forEach((g) => updateStats(g)), 15 * 60_000);
}
