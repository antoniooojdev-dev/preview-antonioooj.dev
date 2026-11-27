// Confirmaciones del bot (las que solo ve quien usa un comando o pulsa un botón).
// Mismo estilo que los paneles: encabezado en MAYÚSCULAS y subrayado con un emoji, el texto
// debajo y, si hace falta, una línea pequeña al pie. Son embeds normales (sirven en cualquier
// respuesta), pero los encabezados y el subrayado van dentro de la descripción.

import { EmbedBuilder } from "discord.js";
import config from "../config.js";
import { h3 } from "./ui.js";

const base = (color, encabezado, emoji, text, pie) =>
  new EmbedBuilder().setColor(color).setDescription([h3(encabezado, emoji), text, pie && `-# ${pie}`].filter(Boolean).join("\n"));

/** Algo salió bien. `titulo` cambia el encabezado («Hecho» por defecto). */
export const ok = (text, titulo = "Hecho", pie) => base(config.colors.primary, titulo, "✅", text, pie);
/** No se pudo hacer algo. */
export const fail = (text, titulo = "No se ha podido", pie) => base(config.colors.danger, titulo, "❌", text, pie);
/** Información sin más. */
export const info = (text, titulo = "Información", pie) => base(config.colors.neutral, titulo, "ℹ️", text, pie);

/** Barra de progreso de texto: ▰▰▰▰▱▱▱▱▱▱ */
export function progressBar(value, max, size = 10) {
  const filled = Math.round((Math.min(value, max) / max) * size);
  return "▰".repeat(filled) + "▱".repeat(size - filled);
}
