import { randomInt } from "node:crypto";
import { EmbedBuilder } from "discord.js";
import config from "../config.js";
import { guildBucket, save } from "../lib/store.js";
import { log } from "../lib/logger.js";

const cooldowns = new Map(); // `${guildId}:${userId}` → timestamp

/** XP necesaria para pasar del nivel N al N+1 (curva cuadrática) */
export const xpForLevel = (level) => 5 * level ** 2 + 50 * level + 100;

/** @returns {{ xp: number, level: number, total: number }} */
export function getProfile(guildId, userId) {
  const bucket = guildBucket("levels", guildId);
  bucket[userId] ??= { xp: 0, level: 0, total: 0 };
  return bucket[userId];
}

/** Igual que getProfile pero sin crear la entrada (para consultas) */
export function peekProfile(guildId, userId) {
  return guildBucket("levels", guildId)[userId] ?? { xp: 0, level: 0, total: 0 };
}

/** Ranking del servidor ordenado por XP total */
export function leaderboard(guildId) {
  return Object.entries(guildBucket("levels", guildId))
    .map(([userId, p]) => ({ userId, ...p }))
    .sort((a, b) => b.total - a.total);
}

/** @param {import("discord.js").Message} message */
export async function handleMessage(message) {
  if (!config.levels.enabled) return;

  const key = `${message.guild.id}:${message.author.id}`;
  const now = Date.now();
  if (now - (cooldowns.get(key) ?? 0) < config.levels.cooldownSeconds * 1000) return;
  cooldowns.set(key, now);

  const profile = getProfile(message.guild.id, message.author.id);
  const gained = randomInt(config.levels.xpMin, config.levels.xpMax + 1);
  profile.xp += gained;
  profile.total += gained;

  let leveledUp = false;
  while (profile.xp >= xpForLevel(profile.level)) {
    profile.xp -= xpForLevel(profile.level);
    profile.level++;
    leveledUp = true;
  }
  save();

  if (leveledUp) await onLevelUp(message, profile.level);
}

async function onLevelUp(message, level) {
  const embed = new EmbedBuilder()
    .setColor(config.colors.success)
    .setDescription(`🎉 ${message.author} ha subido al **nivel ${level}**.`);

  // recompensas: todos los roles de niveles <= nivel actual
  const rewards = Object.entries(config.levels.rewards)
    .filter(([lvl]) => Number(lvl) <= level)
    .map(([, roleId]) => roleId)
    .filter((roleId) => !message.member.roles.cache.has(roleId));

  if (rewards.length) {
    try {
      await message.member.roles.add(rewards, `Recompensa por nivel ${level}`);
      embed.addFields({ name: "Nuevo rol", value: rewards.map((r) => `<@&${r}>`).join(" ") });
    } catch (err) {
      log.warn("No se pudo dar el rol de recompensa:", err.message);
    }
  }

  const channel = (config.channels.levelUp && message.guild.channels.cache.get(config.channels.levelUp)) || message.channel;
  await channel.send({ embeds: [embed] }).catch(() => {});
}
