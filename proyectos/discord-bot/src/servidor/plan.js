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
// forum: el foro de PROYECTOS donde van los de esa categoría (uno por tipo)
export const projectCategories = {
  web: { label: "Páginas web", short: "Web", emoji: "🌐", role: "ping_web", forum: "proy_web" },
  bot: { label: "Bots de Discord", short: "Bot", emoji: "🤖", role: "ping_bots", forum: "proy_bot" },
  fivem: { label: "Scripts de FiveM", short: "FiveM", emoji: "🎮", role: "ping_fivem", forum: "proy_fivem" },
  app: { label: "Aplicaciones web", short: "App web", emoji: "🧩", role: "ping_apps", forum: "proy_app" },
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
// Estilo AJ: nombres en MAYÚSCULAS con un solo emoji y separadores finos por bloques.
// separator: rol divisor decorativo · group: rol auto-asignable desde #guía (label: texto del menú)
const sep = (key, t) => ({ key, name: `────  ${t}  ────`, separator: true });

export const roles = [
  { key: "fundador", name: "👑 FUNDADOR", color: 0xffffff, hoist: true, perms: ["Administrator"] },
  { key: "administrador", name: "🛡️ ADMINISTRADOR", color: 0xe0e0e0, hoist: true, perms: ["Administrator"] },
  {
    key: "moderador",
    name: "⚔️ MODERADOR",
    color: 0xc2c2c2,
    hoist: true,
    perms: [
      "KickMembers", "BanMembers", "ModerateMembers", "ManageMessages", "ManageThreads", "ManageNicknames",
      "MuteMembers", "DeafenMembers", "MoveMembers", "ViewAuditLog", "MentionEveryone",
    ],
  },
  { key: "soporte", name: "🎧 SOPORTE", color: 0xa3a3a3, hoist: true, perms: ["ManageThreads"] },

  sep("sep_especiales", "ESPECIALES"),
  { key: "partner", name: "🤝 PARTNER", color: 0xd6d6d6, hoist: true },
  { key: "cliente", name: "💼 CLIENTE", color: 0xbababa, hoist: true },
  { key: "creador", name: "🎥 CREADOR", color: 0x9e9e9e },

  sep("sep_niveles", "NIVELES"),
  { key: "nivel50", name: "👾 ÉLITE · NV 50", color: 0xf5f5f5, level: 50 },
  { key: "nivel35", name: "🏆 LEYENDA · NV 35", color: 0xdcdcdc, level: 35 },
  { key: "nivel20", name: "⚡ VETERANO · NV 20", color: 0xc4c4c4, level: 20 },
  { key: "nivel10", name: "🔥 ACTIVO · NV 10", color: 0xababab, level: 10 },
  { key: "nivel5", name: "🌱 NOVATO · NV 5", color: 0x929292, level: 5 },

  sep("sep_comunidad", "COMUNIDAD"),
  { key: "miembro", name: "✅ MIEMBRO", color: 0x7a7a7a, hoist: true },

  sep("sep_avisos", "AVISOS"),
  { key: "ping_anuncios", name: "🔔 ANUNCIOS", label: "Anuncios", group: "avisos", emoji: "🔔", desc: "Anuncios importantes del servidor" },
  { key: "ping_fivem", name: "🎮 NOVEDADES FIVEM", label: "Novedades de FiveM", group: "avisos", emoji: "🎮", desc: "Scripts de FiveM nuevos y actualizados" },
  { key: "ping_web", name: "🌐 NOVEDADES WEB", label: "Novedades de webs", group: "avisos", emoji: "🌐", desc: "Páginas web nuevas y cambios" },
  { key: "ping_apps", name: "🧩 NOVEDADES APPS", label: "Novedades de apps web", group: "avisos", emoji: "🧩", desc: "Aplicaciones web nuevas y cambios" },
  { key: "ping_bots", name: "🤖 NOVEDADES BOTS", label: "Novedades de bots", group: "avisos", emoji: "🤖", desc: "Bots de Discord nuevos y cambios" },
  { key: "ping_videos", name: "🎬 VÍDEOS Y DIRECTOS", label: "Vídeos y directos", group: "avisos", emoji: "🎬", desc: "Vídeos nuevos y directos" },
  { key: "ping_eventos", name: "📅 EVENTOS Y SORTEOS", label: "Eventos y sorteos", group: "avisos", emoji: "📅", desc: "Eventos, sorteos y encuestas" },

  sep("sep_intereses", "INTERESES"),
  { key: "int_web", name: "🌐 DESARROLLO WEB", label: "Desarrollo web", group: "intereses", emoji: "🌐", desc: "HTML, CSS, Astro, React…" },
  { key: "int_js", name: "⚛️ JAVASCRIPT", label: "JavaScript", group: "intereses", emoji: "⚛️", desc: "JS, TypeScript, Node" },
  { key: "int_python", name: "🐍 PYTHON", label: "Python", group: "intereses", emoji: "🐍", desc: "Python, FastAPI, bots" },
  { key: "int_php", name: "🐘 PHP", label: "PHP", group: "intereses", emoji: "🐘", desc: "PHP y backend clásico" },
  { key: "int_fivem", name: "🎮 FIVEM", label: "FiveM", group: "intereses", emoji: "🎮", desc: "Scripts Lua, ESX, QBCore, Qbox" },
  { key: "int_diseno", name: "🎨 DISEÑO", label: "Diseño", group: "intereses", emoji: "🎨", desc: "UI/UX, Figma, branding" },
  { key: "int_gaming", name: "🕹️ GAMING", label: "Gaming", group: "intereses", emoji: "🕹️", desc: "Jugar con la comunidad" },
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
      // un foro por tipo de proyecto: el staff publica la ficha y la comunidad comenta dentro
      ...[
        ["proy_web", "🌐・webs", "Las webs hechas por AntonioooJ: un post por web con su ficha y su historial de cambios."],
        ["proy_bot", "🤖・bots-discord", "Los bots de Discord: un post por bot con su ficha y su historial de cambios."],
        ["proy_fivem", "🎮・scripts-fivem", "Los scripts de FiveM: un post por script con su ficha y su historial de cambios."],
        ["proy_app", "🧩・apps-web", "Las aplicaciones web: un post por app con su ficha y su historial de cambios."],
      ].map(([key, name, topic]) => ({
        key,
        name,
        type: "forum",
        access: "escaparate",
        topic: topic + " Se puede comentar dentro de cada post.",
        tags: ["🟢 Activo", "🧪 En desarrollo", "⏸️ Pausado"],
        moderatedAll: true,
        reaction: "🔥",
        projects: true,
      })),
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
    // una red por canal: un panel fijo con la info de esa red y, debajo, sus publicaciones nuevas
    key: "cat_contenido",
    name: "CONTENIDO",
    access: "lectura",
    channels: [
      { key: "instagram", name: "📸・instagram", topic: "Instagram de antonioooj.dev: webs, scripts y diseño en imágenes." },
      { key: "tiktok", name: "🎵・tiktok", topic: "TikTok de antonioooj.dev: clips cortos de webs, scripts y bots." },
      { key: "github", name: "💻・github", topic: "GitHub de antonioooj.dev: repositorios nuevos y versiones publicadas." },
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
      channel: "github",
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
    { key: "instagram", name: "Instagram", emoji: "📸", url: process.env.INSTAGRAM_FEED || "", channel: "instagram" },
    { key: "tiktok", name: "TikTok", emoji: "🎵", url: process.env.TIKTOK_FEED || "", channel: "tiktok", ping: "ping_videos", video: true },
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
