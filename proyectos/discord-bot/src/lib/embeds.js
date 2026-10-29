import { EmbedBuilder } from "discord.js";
import config from "../config.js";

const base = (color, text) => new EmbedBuilder().setColor(color).setDescription(text);

export const ok = (text) => base(config.colors.success, `✅ ${text}`);
export const fail = (text) => base(config.colors.danger, `❌ ${text}`);
export const info = (text) => base(config.colors.primary, text);

/** Barra de progreso de texto: ▰▰▰▰▱▱▱▱▱▱ */
export function progressBar(value, max, size = 10) {
  const filled = Math.round((Math.min(value, max) / max) * size);
  return "▰".repeat(filled) + "▱".repeat(size - filled);
}
