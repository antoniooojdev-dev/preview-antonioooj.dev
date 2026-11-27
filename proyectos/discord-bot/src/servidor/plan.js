// ─────────────────────────────────────────────────────────────
//  Plano del servidor de Discord. `npm run setup` lo aplica:
//  crea lo que falta y actualiza lo que ya existe (no duplica).
//  Cada elemento tiene una `key` fija: puedes cambiar nombres
//  aquí y al volver a ejecutar el setup se renombra en Discord.
//  `aliases`: claves antiguas cuyo canal se reaprovecha.
// ─────────────────────────────────────────────────────────────

export const SITE = "https://antonioooj.dev";
export const LOGO = "https://antonioooj.dev/logo.png";
export const DISCORD_INVITE = "https://discord.gg/FufV5PJxC";

/** Ajustes generales del servidor */
export const guildSettings = {
  description: "Comunidad de AntonioooJ · webs, aplicaciones web, scripts de FiveM y bots de Discord. Aprende, comparte y sigue los proyectos.",
  verificationLevel: "Medium", // cuenta registrada hace más de 5 min
  explicitContentFilter: "AllMembers",
  defaultMessageNotifications: "OnlyMentions",
  afkTimeout: 900, // 15 min
  community: true, // canales de anuncios seguibles, foros, normas oficiales
};

// ── Categorías de proyectos (novedades, foro de proyectos, avisos) ──
export const projectCategories = {
  fivem: { label: "Scripts de FiveM", short: "FiveM", emoji: "🎮", role: "ping_fivem" },
  web: { label: "Páginas web", short: "Web", emoji: "🌐", role: "ping_web" },
  app: { label: "Aplicaciones web", short: "App web", emoji: "🧩", role: "ping_apps" },
  bot: { label: "Bots de Discord", short: "Bot", emoji: "🤖", role: "ping_bots" },
};

export const updateTypes = {
  lanzamiento: { label: "Lanzamiento", emoji: "🚀" },
  funcion: { label: "Nueva función", emoji: "✨" },
  mejora: { label: "Mejora", emoji: "🛠️" },
  correccion: { label: "Corrección", emoji: "🐛" },
};

export const projectStatus = {
  activo: { label: "Activo", emoji: "🟢" },
  desarrollo: { label: "En desarrollo", emoji: "🧪" },
  pausado: { label: "Pausado", emoji: "⏸️" },
};

// ── Roles (de arriba abajo) ──────────────────────────────────
// separator: rol divisor decorativo · group: rol auto-asignable desde #guía
export const roles = [
  { key: "fundador", name: "👑 Fundador", color: 0xffffff, hoist: true, perms: ["Administrator"] },
  { key: "administrador", name: "🛡️ Administrador", color: 0xe0e0e0, hoist: true, perms: ["Administrator"] },
  {
    key: "moderador",
    name: "⚔️ Moderador",
    color: 0xc2c2c2,
    hoist: true,
    perms: [
      "KickMembers", "BanMembers", "ModerateMembers", "ManageMessages", "ManageThreads", "ManageNicknames",
      "MuteMembers", "DeafenMembers", "MoveMembers", "ViewAuditLog", "MentionEveryone",
    ],
  },
  { key: "soporte", name: "🎧 Soporte", color: 0xa3a3a3, hoist: true, perms: ["ManageThreads"] },

  { key: "sep_especiales", name: "━━━━━ ESPECIALES ━━━━━", separator: true },
  { key: "partner", name: "🤝 Partner", color: 0xd6d6d6, hoist: true },
  { key: "cliente", name: "💼 Cliente", color: 0xbababa, hoist: true },
  { key: "creador", name: "🎥 Creador de contenido", color: 0x9e9e9e },

  { key: "sep_niveles", name: "━━━━━ NIVELES ━━━━━", separator: true },
  { key: "nivel50", name: "👾 Élite · Nv 50", color: 0xf5f5f5, level: 50 },
  { key: "nivel35", name: "🏆 Leyenda · Nv 35", color: 0xdcdcdc, level: 35 },
  { key: "nivel20", name: "⚡ Veterano · Nv 20", color: 0xc4c4c4, level: 20 },
  { key: "nivel10", name: "🔥 Activo · Nv 10", color: 0xababab, level: 10 },
  { key: "nivel5", name: "🌱 Novato · Nv 5", color: 0x929292, level: 5 },

  { key: "sep_comunidad", name: "━━━━━ COMUNIDAD ━━━━━", separator: true },
  { key: "miembro", name: "✅ Miembro", color: 0x7a7a7a, hoist: true },

  { key: "sep_avisos", name: "━━━━━ AVISOS ━━━━━", separator: true },
  { key: "ping_anuncios", name: "🔔 Anuncios", group: "avisos", emoji: "🔔", desc: "Anuncios importantes del servidor" },
  { key: "ping_fivem", name: "🎮 Novedades FiveM", group: "avisos", emoji: "🎮", desc: "Scripts de FiveM nuevos y actualizados" },
  { key: "ping_web", name: "🌐 Novedades Web", group: "avisos", emoji: "🌐", desc: "Páginas web nuevas y cambios" },
  { key: "ping_apps", name: "🧩 Novedades Apps", group: "avisos", emoji: "🧩", desc: "Aplicaciones web nuevas y cambios" },
  { key: "ping_bots", name: "🤖 Novedades Bots", group: "avisos", emoji: "🤖", desc: "Bots de Discord nuevos y cambios" },
  { key: "ping_videos", name: "🎬 Vídeos y directos", group: "avisos", emoji: "🎬", desc: "Vídeos nuevos y directos" },
  { key: "ping_eventos", name: "📅 Eventos y sorteos", group: "avisos", emoji: "📅", desc: "Eventos, sorteos y encuestas" },

  { key: "sep_intereses", name: "━━━━━ INTERESES ━━━━━", separator: true },
  { key: "int_web", name: "🌐 Desarrollo web", group: "intereses", emoji: "🌐", desc: "HTML, CSS, Astro, React…" },
  { key: "int_js", name: "⚛️ JavaScript", group: "intereses", emoji: "⚛️", desc: "JS, TypeScript, Node" },
  { key: "int_python", name: "🐍 Python", group: "intereses", emoji: "🐍", desc: "Python, FastAPI, bots" },
  { key: "int_php", name: "🐘 PHP", group: "intereses", emoji: "🐘", desc: "PHP y backend clásico" },
  { key: "int_fivem", name: "🎮 FiveM", group: "intereses", emoji: "🎮", desc: "Scripts Lua, ESX, servidores RP" },
  { key: "int_diseno", name: "🎨 Diseño", group: "intereses", emoji: "🎨", desc: "UI/UX, Figma, branding" },
  { key: "int_gaming", name: "🕹️ Gaming", group: "intereses", emoji: "🕹️", desc: "Jugar con la comunidad" },
];

export const STAFF = ["fundador", "administrador", "moderador"];
export const SUPPORT = [...STAFF, "soporte"];

// ── Categorías y canales ─────────────────────────────────────
// Servidor minimalista: categorías en mayúsculas sin emoji, pocos canales y cada uno con un
// solo emoji. Sin categoría de staff: el registro (logs, transcripciones y avisos de Discord)
// va en TICKETS, que solo ve el equipo.
// access: inicio · lectura · chat · escaparate · voz · stats · staff · soporte · registros
// type: text (por defecto) · announcement · forum · voice
export const categories = [
  {
    key: "cat_inicio",
    name: "INICIO",
    access: "inicio",
    channels: [
      { key: "normas", name: "📜・normas", topic: "Normas de la comunidad. Se aceptan con el botón de debajo." },
      // solo lo ven quienes aún no están verificados (al verificarse desaparece)
      { key: "verificacion", name: "✅・verificación", access: "verificacion", topic: "Con las normas aceptadas, un botón desbloquea el servidor." },
      { key: "guia", name: "🧭・guía", access: "lectura", aliases: ["roles"], topic: "Cómo funciona el servidor y elección de roles." },
      { key: "anuncios", name: "📢・anuncios", type: "announcement", access: "lectura", topic: "Anuncios oficiales. Puedes seguir este canal desde tu servidor." },
      {
        key: "novedades",
        name: "🚀・novedades",
        type: "announcement",
        access: "lectura",
        topic: "Proyectos nuevos y actualizados, vídeos y directos. Elige de qué recibir aviso en #guía.",
      },
    ],
  },
  {
    key: "cat_comunidad",
    name: "COMUNIDAD",
    access: "chat",
    channels: [
      { key: "general", name: "💬・general", topic: "Charla general. Preséntate, comenta y sé buena gente." },
      { key: "media", name: "🖼️・media", aliases: ["memes"], topic: "Capturas, clips y memes." },
      { key: "comandos", name: "🤖・comandos", topic: "Comandos del bot (/nivel, /ranking, /recordatorio…) y subidas de nivel." },
    ],
  },
  {
    key: "cat_proyectos",
    name: "PROYECTOS",
    access: "chat",
    channels: [
      {
        key: "proyectos",
        name: "📂・proyectos",
        type: "forum",
        access: "escaparate",
        topic: "Un post por proyecto con su ficha y todo su historial de cambios. Filtra por categoría con las etiquetas. Puedes comentar dentro de cada post.",
        tags: ["🎮 FiveM", "🌐 Web", "🧩 App web", "🤖 Bot", "🟢 Activo", "🧪 En desarrollo", "⏸️ Pausado"],
        moderatedAll: true,
        reaction: "🔥",
      },
      {
        key: "sugerencias",
        name: "💡・sugerencias",
        type: "forum",
        topic: "Una sugerencia por post. Explica la idea y por qué mejoraría el servidor o los proyectos. Vota con 👍 / 👎.",
        tags: ["🎮 FiveM", "🌐 Web", "🧩 App web", "🤖 Bot", "💬 Discord", "🟡 En revisión", "✅ Aceptada", "❌ Rechazada"],
        reaction: "👍",
        suggestions: true,
      },
      {
        key: "bugs",
        name: "🐛・bugs",
        type: "forum",
        topic: "Reporta un fallo: qué hacías, qué esperabas, qué pasó y capturas. Un bug por post.",
        tags: ["🎮 FiveM", "🌐 Web", "🧩 App web", "🤖 Bot", "🔴 Crítico", "🟡 Confirmado", "✅ Arreglado"],
        bugs: true,
      },
    ],
  },
  {
    key: "cat_dev",
    name: "DESARROLLO",
    access: "chat",
    channels: [
      { key: "programacion", name: "💻・programación", topic: "Webs, FiveM, bots… cualquier tema de desarrollo. Recursos útiles también aquí." },
      {
        key: "ayuda",
        name: "🆘・ayuda",
        type: "forum",
        topic: "Abre un post por duda. Pega el código (con ```), el error completo y qué has probado. Marca ✅ Resuelto cuando esté.",
        tags: ["🌐 Web", "⚛️ JavaScript", "🐍 Python", "🐘 PHP", "🎮 FiveM / Lua", "🗄️ Bases de datos", "✅ Resuelto"],
        reaction: "👍",
      },
      {
        key: "tus_proyectos",
        name: "✨・tus-proyectos",
        type: "forum",
        topic: "Enseña lo que estás construyendo: capturas, enlace y tecnologías. Se valora el feedback constructivo.",
        tags: ["🎮 FiveM", "🌐 Web", "🧩 App web", "🤖 Bot", "🎨 Diseño", "🧪 En desarrollo", "✅ Terminado"],
        reaction: "🔥",
      },
    ],
  },
  {
    // reaprovecha la antigua categoría INFORMACIÓN
    key: "cat_info",
    name: "SERVICIOS",
    access: "lectura",
    channels: [
      { key: "servicios", name: "💼・servicios", topic: "Webs, apps, scripts de FiveM y bots a medida." },
      { key: "abrir_ticket", name: "🎫・soporte", topic: "Abre un ticket privado con el equipo." },
    ],
  },
  {
    key: "cat_voz",
    name: "VOZ",
    access: "voz",
    channels: [
      { key: "crear_sala", name: "➕ Crear sala", type: "voice", tempVoice: true },
      { key: "voz_general", name: "🔊 General", type: "voice" },
      { key: "voz_afk", name: "💤 AFK", type: "voice", afk: true },
    ],
  },
  {
    key: "cat_tickets",
    name: "TICKETS",
    access: "soporte",
    channels: [
      {
        key: "logs",
        name: "📋・registro",
        access: "registros",
        topic: "Entradas, salidas, mensajes borrados, verificaciones, automod, sanciones, tickets cerrados y avisos de Discord.",
      },
    ],
  },
];

// ── Redes sociales ───────────────────────────────────────────
// Los avisos automáticos leen feeds RSS/Atom. Instagram y TikTok no tienen
// RSS oficial: si quieres avisos, crea un feed (rss.app, RSSHub…) y pega la URL.
export const socials = {
  links: [
    { label: "Web", emoji: "🌐", url: SITE },
    { label: "YouTube", emoji: "🎬", url: "https://www.youtube.com/@antonioooj_dev" },
    { label: "Instagram", emoji: "📸", url: "https://instagram.com/antonioooj.dev" },
    { label: "GitHub", emoji: "💻", url: "https://github.com/antonioooj" },
    { label: "LinkedIn", emoji: "💼", url: "https://www.linkedin.com/in/antonioooj" },
  ],
  feeds: [
    {
      key: "github",
      name: "GitHub",
      emoji: "💻",
      url: "https://github.com/antonioooj.atom",
      channel: "novedades",
      // solo lo importante (repos nuevos y releases): el canal es novedades, sin pushes
      include: /(created a repository|released|published)/i,
    },
    {
      key: "youtube",
      name: "YouTube",
      emoji: "🎬",
      // canal @antonioooj_dev (se puede cambiar con YOUTUBE_FEED en .env)
      url: process.env.YOUTUBE_FEED || "https://www.youtube.com/feeds/videos.xml?channel_id=UCHjQUn1elIj-QlJkvYov_yA",
      channel: "novedades",
      ping: "ping_videos",
      video: true, // enlace suelto para que Discord muestre el reproductor
      backfill: 5, // al estrenar el canal, publica los 5 últimos vídeos (sin mencionar)
    },
    { key: "instagram", name: "Instagram", emoji: "📸", url: process.env.INSTAGRAM_FEED || "", channel: "novedades" },
    { key: "tiktok", name: "TikTok", emoji: "🎵", url: process.env.TIKTOK_FEED || "", channel: "novedades", ping: "ping_videos", video: true },
  ],
  // Directos de Twitch: TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET y TWITCH_USER en .env
  twitch: { channel: "novedades", ping: "ping_videos" },
};

// ── Tipos de ticket ──────────────────────────────────────────
export const ticketTypes = {
  soporte: {
    label: "Soporte",
    emoji: "🛠️",
    desc: "Problemas con un script, una web o el servidor",
    fields: [
      { id: "asunto", label: "Asunto", style: "short", max: 100 },
      { id: "detalle", label: "Explica el problema", style: "paragraph", max: 1500, placeholder: "Qué hacías, qué esperabas y qué ha pasado" },
    ],
  },
  presupuesto: {
    label: "Pedir presupuesto",
    emoji: "💼",
    desc: "Web, app web, script de FiveM o bot a medida",
    fields: [
      { id: "tipo", label: "¿Qué necesitas?", style: "short", max: 100, placeholder: "Web, app web, script de FiveM, bot de Discord…" },
      { id: "detalle", label: "Cuéntame la idea", style: "paragraph", max: 1500 },
      { id: "presupuesto", label: "Presupuesto aproximado", style: "short", max: 60, required: false, placeholder: "Opcional" },
      { id: "plazo", label: "¿Para cuándo?", style: "short", max: 60, required: false, placeholder: "Opcional" },
    ],
  },
  reporte: {
    label: "Reportar a alguien",
    emoji: "🚨",
    desc: "Un usuario se salta las normas",
    fields: [
      { id: "usuario", label: "Usuario reportado", style: "short", max: 100, placeholder: "Nombre o ID" },
      { id: "detalle", label: "¿Qué ha pasado?", style: "paragraph", max: 1500, placeholder: "Añade enlaces a los mensajes si puedes" },
    ],
  },
  partner: {
    label: "Partnership / colaboración",
    emoji: "🤝",
    desc: "Alianzas entre comunidades o colaboraciones",
    fields: [
      { id: "comunidad", label: "Tu comunidad o proyecto", style: "short", max: 100 },
      { id: "detalle", label: "Propuesta", style: "paragraph", max: 1500 },
    ],
  },
  otro: {
    label: "Otro",
    emoji: "❓",
    desc: "Cualquier otra cosa",
    fields: [
      { id: "asunto", label: "Asunto", style: "short", max: 100 },
      { id: "detalle", label: "Detalle", style: "paragraph", max: 1500 },
    ],
  },
};

// ── Mensajes programados (días: 0 domingo … 6 sábado) ────────
export const scheduled = [
  { time: "09:30", days: [1], channel: "programacion", message: "☕ **¡Buen lunes!** ¿En qué estáis trabajando esta semana? Contadlo aquí 👇" },
  { time: "18:00", days: [5], channel: "general", message: "✨ **Viernes de proyectos** — enseñad lo que habéis hecho esta semana en <#{tus_proyectos}>." },
];
