import { PermissionFlagsBits } from "discord.js";
import config from "../config.js";
import { sendLog } from "../lib/logger.js";

const INVITE_RE = /(discord\.gg|discord(?:app)?\.com\/invite)\/[\w-]+/i;
const recent = new Map(); // userId → timestamps de mensajes recientes

/** Normaliza para que "PåL4BR0TA" coincida con "palabrota" */
function normalize(text) {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[0134578@$]/g, (c) => ({ 0: "o", 1: "i", 3: "e", 4: "a", 5: "s", 7: "t", 8: "b", "@": "a", $: "s" })[c]);
}

const bannedRe = config.automod.bannedWords.length
  ? new RegExp(`\\b(${config.automod.bannedWords.map((w) => normalize(w).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\b`, "i")
  : null;

/** @param {import("discord.js").Message} message */
function detect(message) {
  const { automod } = config;

  if (bannedRe?.test(normalize(message.content))) return { reason: "Lenguaje no permitido" };
  if (automod.blockInvites && INVITE_RE.test(message.content)) return { reason: "Invitaciones a otros servidores" };

  const mentions = message.mentions.users.size + message.mentions.roles.size;
  if (mentions > automod.maxMentions) return { reason: `Spam de menciones (${mentions})`, timeout: true };

  // anti-flood: N mensajes en X segundos
  const now = Date.now();
  const windowMs = automod.spam.seconds * 1000;
  const times = (recent.get(message.author.id) ?? []).filter((t) => now - t < windowMs);
  times.push(now);
  recent.set(message.author.id, times);
  if (times.length >= automod.spam.messages) {
    recent.delete(message.author.id);
    return { reason: `Flood (${times.length} mensajes en ${automod.spam.seconds} s)`, timeout: true };
  }

  return null;
}

/**
 * Revisa un mensaje. Devuelve true si se ha eliminado (para no darle XP, etc.).
 * @param {import("discord.js").Message} message
 */
export async function handleMessage(message) {
  if (!config.automod.enabled) return false;

  const { member } = message;
  if (!member) return false;
  if (member.permissions.has(PermissionFlagsBits.ManageMessages)) return false;
  if (config.automod.exemptRoles.some((r) => member.roles.cache.has(r))) return false;

  const hit = detect(message);
  if (!hit) return false;

  await message.delete().catch(() => {});

  if (hit.timeout && member.moderatable) {
    await member.timeout(config.automod.spam.timeoutMinutes * 60_000, `Automod: ${hit.reason}`).catch(() => {});
  }

  const notice = await message.channel
    .send(`⚠️ ${message.author}, tu mensaje se ha eliminado: **${hit.reason}**.`)
    .catch(() => null);
  if (notice) setTimeout(() => notice.delete().catch(() => {}), 6000);

  await sendLog(message.guild, {
    title: "🛡️ Automod",
    color: config.colors.danger,
    fields: [
      { name: "Usuario", value: `${message.author} (${message.author.id})`, inline: true },
      { name: "Canal", value: message.channel.toString(), inline: true },
      { name: "Motivo", value: hit.reason + (hit.timeout ? ` · aislado ${config.automod.spam.timeoutMinutes} min` : "") },
      { name: "Mensaje", value: message.content.slice(0, 1000) || "(vacío)" },
    ],
  });
  return true;
}
