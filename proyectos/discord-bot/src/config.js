// ─────────────────────────────────────────────────────────────
//  Configuración del bot.
//  Los IDs de canales y roles salen solos de data/servidor.json,
//  que genera `npm run setup` a partir de src/servidor/plan.js.
//  Un ID vacío desactiva esa función.
// ─────────────────────────────────────────────────────────────

import { fillChannelKeys, loadServidor } from "./lib/servidor.js";
import { roles as planRoles, scheduled as planScheduled, STAFF, SUPPORT } from "./servidor/plan.js";

const ids = loadServidor();
const ch = (key) => ids.channels[key] ?? "";
const role = (key) => ids.roles[key] ?? "";

export default {
  timezone: "Europe/Madrid",
  ids,

  colors: {
    primary: 0xf2f2f2, // blanco de la marca AJ (estilo monocromo de antonioooj.dev)
    success: 0x57f287,
    warning: 0xfee75c,
    danger: 0xed4245,
    neutral: 0x2b2d31,
  },

  channels: {
    welcome: ch("bienvenidas"), // mensaje de bienvenida
    logs: ch("logs"), // entradas/salidas, mensajes borrados, verificaciones
    modLogs: ch("mod_logs") || ch("logs"), // automod, advertencias
    ticketLogs: ch("ticket_logs") || ch("logs"), // tickets y transcripciones
    levelUp: ch("niveles"), // subidas de nivel (vacío = en el mismo canal)
    ticketCategory: ch("cat_tickets"), // categoría donde se crean los tickets
    rules: ch("normas"),
    roles: ch("roles"),
    guide: ch("guia"),
  },

  roles: {
    autoRole: "", // la entrada se hace con verificación, no con auto-rol
    verified: role("miembro"),
    support: role("soporte"),
    staff: STAFF.map(role).filter(Boolean),
    supportTeam: SUPPORT.map(role).filter(Boolean),
  },

  automod: {
    enabled: true,
    exemptRoles: STAFF.map(role).filter(Boolean),
    bannedWords: ["gilipollas", "subnormal", "maricon", "retrasado", "hijoputa", "malparido"],
    blockInvites: true,
    maxMentions: 5,
    spam: { messages: 5, seconds: 6, timeoutMinutes: 5 },
  },

  levels: {
    enabled: true,
    xpMin: 15,
    xpMax: 25,
    cooldownSeconds: 60,
    // nivel → ID de rol (sale del plano: roles con `level`)
    rewards: Object.fromEntries(planRoles.filter((r) => r.level && role(r.key)).map((r) => [r.level, role(r.key)])),
  },

  warns: {
    timeoutAt: 3,
    timeoutMinutes: 60,
    kickAt: 5,
  },

  // Mensajes automáticos del plano, con las claves de canal ya traducidas a IDs
  scheduled: planScheduled
    .filter((j) => j.message && ch(j.channel))
    .map((j) => ({ ...j, channel: ch(j.channel), message: fillChannelKeys(j.message, ids) })),
};
