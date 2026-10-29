// ─────────────────────────────────────────────────────────────
//  Configuración del bot. Los IDs vacíos desactivan esa función.
//  (Discord → Ajustes → Avanzado → Modo desarrollador → clic derecho → Copiar ID)
// ─────────────────────────────────────────────────────────────

export default {
  timezone: "Europe/Madrid",

  colors: {
    primary: 0x5865f2,
    success: 0x57f287,
    warning: 0xfee75c,
    danger: 0xed4245,
    neutral: 0x2b2d31,
  },

  channels: {
    welcome: "", // mensaje de bienvenida
    logs: "", // registro de moderación, tickets, entradas/salidas, mensajes borrados
    levelUp: "", // anuncios de subida de nivel (vacío = en el mismo canal)
    ticketCategory: "", // categoría donde se crean los tickets
  },

  roles: {
    autoRole: "", // rol que se da al entrar
    verified: "", // rol que se da al pulsar "Verificarme"
    support: "", // equipo que ve los tickets
  },

  automod: {
    enabled: true,
    exemptRoles: [], // IDs de roles que no pasan por el automod
    bannedWords: ["palabrota1", "palabrota2"],
    blockInvites: true,
    maxMentions: 5,
    spam: { messages: 5, seconds: 6, timeoutMinutes: 5 },
  },

  levels: {
    enabled: true,
    xpMin: 15,
    xpMax: 25,
    cooldownSeconds: 60,
    // nivel → ID de rol que se entrega al alcanzarlo
    rewards: {
      // 5: "123456789012345678",
      // 10: "123456789012345678",
    },
  },

  warns: {
    // al llegar a N advertencias se aplica la sanción
    timeoutAt: 3,
    timeoutMinutes: 60,
    kickAt: 5,
  },

  // Mensajes automáticos. days: 0 = domingo … 6 = sábado
  scheduled: [
    // {
    //   time: "09:00",
    //   days: [1, 2, 3, 4, 5],
    //   channel: "123456789012345678",
    //   message: "☀️ ¡Buenos días! Recordad leer las normas en #normas.",
    // },
  ],
};
