// IDs reales del servidor (canales, roles, mensajes de paneles).
// Los escribe `npm run setup` en data/servidor.json; el resto del bot los lee de aquí.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const SERVIDOR_FILE = join(dirname(fileURLToPath(import.meta.url)), "../../data/servidor.json");

const EMPTY = { guildId: "", roles: {}, channels: {}, messages: {} };

export function loadServidor() {
  try {
    if (existsSync(SERVIDOR_FILE)) return { ...structuredClone(EMPTY), ...JSON.parse(readFileSync(SERVIDOR_FILE, "utf8")) };
  } catch {
    // archivo corrupto: se regenera con el siguiente setup
  }
  return structuredClone(EMPTY);
}

export function saveServidor(data) {
  mkdirSync(dirname(SERVIDOR_FILE), { recursive: true });
  writeFileSync(SERVIDOR_FILE, JSON.stringify(data, null, 2));
}

/** Sustituye {clave} por el ID del canal (para usar como <#{clave}>) */
export function fillChannelKeys(text, ids) {
  return text.replace(/\{(\w+)\}/g, (m, key) => ids.channels[key] ?? m);
}
