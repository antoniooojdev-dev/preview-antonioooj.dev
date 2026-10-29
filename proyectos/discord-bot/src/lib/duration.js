// "1d2h30m" → milisegundos  ·  milisegundos → "1 d 2 h 30 min"

const UNITS = { s: 1_000, m: 60_000, h: 3_600_000, d: 86_400_000, w: 604_800_000 };

/**
 * @param {string} input ej. "10m", "2h", "1d12h", "1w"
 * @returns {number|null} milisegundos o null si no es válido
 */
export function parseDuration(input) {
  const clean = String(input).toLowerCase().replace(/\s+/g, "");
  if (!/^(\d+[smhdw])+$/.test(clean)) return null;
  let total = 0;
  for (const [, n, unit] of clean.matchAll(/(\d+)([smhdw])/g)) total += Number(n) * UNITS[unit];
  return total > 0 ? total : null;
}

/** @param {number} ms */
export function formatDuration(ms) {
  const parts = [];
  const d = Math.floor(ms / UNITS.d);
  const h = Math.floor((ms % UNITS.d) / UNITS.h);
  const m = Math.floor((ms % UNITS.h) / UNITS.m);
  if (d) parts.push(`${d} d`);
  if (h) parts.push(`${h} h`);
  if (m || !parts.length) parts.push(`${Math.max(m, 1)} min`);
  return parts.join(" ");
}

/** Marca de tiempo de Discord que cada usuario ve en su zona horaria. */
export const discordTime = (ms, style = "R") => `<t:${Math.floor(ms / 1000)}:${style}>`;
