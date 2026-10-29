// Persistencia en JSON con escritura diferida y atómica (archivo temporal + rename).
// Suficiente para un servidor; para varios cientos de miles de usuarios, cambiar por SQLite/Postgres.

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { log } from "./logger.js";

const FILE = join(dirname(fileURLToPath(import.meta.url)), "../../data/db.json");

const DEFAULTS = {
  warns: {}, // guildId → userId → [{ reason, by, at }]
  levels: {}, // guildId → userId → { xp, level }
  reminders: [], // { id, userId, channelId, text, at }
  polls: {}, // messageId → { channelId, question, options, votes: { userId: index }, endsAt }
  giveaways: {}, // messageId → { channelId, prize, winners, entrants: [], endsAt, hostId }
  tickets: {}, // channelId → { ownerId, number, openedAt }
  counters: { ticket: 0 },
  scheduledRuns: {}, // jobKey → "YYYY-MM-DD" del último envío
};

function load() {
  try {
    if (existsSync(FILE)) return { ...structuredClone(DEFAULTS), ...JSON.parse(readFileSync(FILE, "utf8")) };
  } catch (err) {
    log.error("No se pudo leer data/db.json, se empieza vacío", err);
  }
  return structuredClone(DEFAULTS);
}

export const db = load();

let timer = null;

/** Guarda en disco como mucho una vez por segundo. */
export function save() {
  if (timer) return;
  timer = setTimeout(flush, 1000);
}

export function flush() {
  clearTimeout(timer);
  timer = null;
  mkdirSync(dirname(FILE), { recursive: true });
  const tmp = `${FILE}.tmp`;
  writeFileSync(tmp, JSON.stringify(db, null, 2));
  renameSync(tmp, FILE);
}

/** Devuelve (creándolo si no existe) db[root][guildId] */
export function guildBucket(root, guildId) {
  db[root][guildId] ??= {};
  return db[root][guildId];
}

// guarda al cerrar el proceso para no perder cambios
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    flush();
    process.exit(0);
  });
}
