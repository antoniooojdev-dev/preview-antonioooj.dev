// ─────────────────────────────────────────────────────────────
//  Plano del servidor de Discord. `npm run setup` lo aplica:
//  crea lo que falta y actualiza lo que ya existe (no duplica).
//  Cada elemento tiene una `key` fija: puedes cambiar nombres
//  aquí y al volver a ejecutar el setup se renombra en Discord.
// ─────────────────────────────────────────────────────────────

export const SITE = "https://antonioooj.dev";
export const LOGO = "https://antonioooj.dev/logo.png";

/** Ajustes generales del servidor */
export const guildSettings = {
  description: "Comunidad de AntonioooJ · desarrollo web, scripts de FiveM, bots y proyectos. Aprende, comparte y pide tu proyecto.",
  verificationLevel: "Medium", // cuenta registrada hace más de 5 min
  explicitContentFilter: "AllMembers",
  defaultMessageNotifications: "OnlyMentions",
  afkTimeout: 900, // 15 min
  community: true, // canales de anuncios seguibles, foros, normas oficiales
};

// ── Roles (de arriba abajo) ──────────────────────────────────
// separator: rol divisor decorativo · group: rol auto-asignable desde #roles
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
  { key: "ping_anuncios", name: "🔔 Anuncios", group: "avisos", emoji: "🔔", desc: "Novedades importantes del servidor" },
  { key: "ping_videos", name: "🎬 Vídeos", group: "avisos", emoji: "🎬", desc: "Cuando sale un vídeo nuevo" },
  { key: "ping_directos", name: "🔴 Directos", group: "avisos", emoji: "🔴", desc: "Cuando empieza un directo" },
  { key: "ping_proyectos", name: "🚀 Proyectos", group: "avisos", emoji: "🚀", desc: "Changelog y lanzamientos de scripts/webs" },
  { key: "ping_sorteos", name: "🎉 Sorteos", group: "avisos", emoji: "🎉", desc: "Sorteos y regalos" },
  { key: "ping_eventos", name: "📅 Eventos", group: "avisos", emoji: "📅", desc: "Eventos, encuestas y quedadas" },

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
// access: inicio · verificacion · lectura · chat · voz · stats · staff · soporte · registros
// type: text (por defecto) · announcement · forum · voice
export const categories = [
  {
    key: "cat_stats",
    name: "📊 ESTADÍSTICAS",
    access: "stats",
    channels: [
      { key: "stat_miembros", name: "👥 Miembros: …", type: "voice", stat: "miembros" },
      { key: "stat_boosts", name: "🚀 Mejoras: …", type: "voice", stat: "boosts" },
    ],
  },
  {
    key: "cat_inicio",
    name: "🏠 INICIO",
    access: "inicio",
    channels: [
      { key: "guia", name: "📖・guía", topic: "Qué es este servidor y cómo moverte por él." },
      { key: "normas", name: "📜・normas", topic: "Normas de la comunidad. Leerlas es obligatorio." },
      { key: "verificacion", name: "✅・verificación", access: "verificacion", topic: "Pulsa el botón para entrar al servidor." },
      { key: "bienvenidas", name: "👋・bienvenidas", topic: "Cada persona nueva que llega a la comunidad." },
    ],
  },
  {
    key: "cat_info",
    name: "📢 INFORMACIÓN",
    access: "lectura",
    channels: [
      { key: "anuncios", name: "📢・anuncios", type: "announcement", topic: "Anuncios oficiales. Puedes seguir este canal desde tu servidor." },
      { key: "novedades", name: "📰・novedades", type: "announcement", topic: "Novedades de la web, el servidor y los proyectos." },
      { key: "roles", name: "🎭・roles", topic: "Elige qué avisos quieres recibir y tus intereses." },
      { key: "redes", name: "🔗・redes", topic: "Todas las redes de AntonioooJ." },
      { key: "servicios", name: "💼・servicios", topic: "Webs, scripts de FiveM y bots a medida. Pide presupuesto." },
      { key: "niveles", name: "🏅・niveles", topic: "Subidas de nivel y recompensas por actividad." },
      { key: "partners", name: "🤝・partners", topic: "Comunidades aliadas." },
    ],
  },
  {
    key: "cat_contenido",
    name: "📺 CONTENIDO",
    access: "lectura",
    channels: [
      { key: "youtube", name: "🎬・youtube", topic: "Cada vídeo nuevo del canal, al momento." },
      { key: "directos", name: "🔴・directos", topic: "Aviso cuando empieza un directo." },
      { key: "instagram", name: "📸・instagram", topic: "Publicaciones de @antonioooj.dev." },
      { key: "tiktok", name: "🎵・tiktok", topic: "Nuevos TikToks." },
      { key: "github", name: "💻・github", topic: "Actividad pública en github.com/antonioooj." },
    ],
  },
  {
    key: "cat_comunidad",
    name: "💬 COMUNIDAD",
    access: "chat",
    channels: [
      { key: "general", name: "💬・general", topic: "Charla general. Sé buena gente." },
      { key: "presentaciones", name: "🙋・presentaciones", topic: "Preséntate: quién eres, qué haces y qué te gusta.", slowmode: 300 },
      { key: "media", name: "🖼️・media", topic: "Capturas, clips y vídeos." },
      { key: "memes", name: "😂・memes", topic: "Memes (de programación, mejor)." },
      { key: "gaming", name: "🕹️・gaming", topic: "Busca grupo, comparte partidas." },
      { key: "comandos", name: "🤖・comandos", topic: "Usa aquí los comandos del bot: /nivel, /ranking, /recordatorio…" },
    ],
  },
  {
    key: "cat_dev",
    name: "💻 DESARROLLO",
    access: "chat",
    channels: [
      { key: "programacion", name: "💻・programación", topic: "Programación en general." },
      { key: "web", name: "🌐・desarrollo-web", topic: "Frontend, backend, despliegues, hosting." },
      { key: "fivem_dev", name: "🎮・fivem-dev", topic: "Lua, ESX, QBCore, MLOs y servidores RP." },
      { key: "recursos", name: "📚・recursos", topic: "Tutoriales, herramientas y enlaces útiles. Solo contenido de calidad." },
      {
        key: "ayuda",
        name: "🆘・ayuda-código",
        type: "forum",
        topic: "Abre un post por duda. Pega el código (con ```), el error completo y qué has probado. Marca la etiqueta ✅ Resuelto cuando esté.",
        tags: ["🌐 Web", "⚛️ JavaScript", "🐍 Python", "🐘 PHP", "🎮 FiveM / Lua", "🗄️ Bases de datos", "✅ Resuelto"],
        reaction: "👍",
      },
      {
        key: "tus_proyectos",
        name: "🚀・tus-proyectos",
        type: "forum",
        topic: "Enseña lo que estás construyendo: capturas, enlace y qué tecnologías usas. Se valora el feedback constructivo.",
        tags: ["🌐 Web", "🎮 FiveM", "🤖 Bot", "📱 App", "🎨 Diseño", "🧪 En desarrollo", "✅ Terminado"],
        reaction: "🔥",
      },
    ],
  },
  {
    key: "cat_proyectos",
    name: "🧩 PROYECTOS AJ",
    access: "chat",
    channels: [
      { key: "changelog", name: "📋・changelog", type: "announcement", access: "lectura", topic: "Cambios de la web, los scripts y el bot." },
      { key: "scripts_fivem", name: "🧩・scripts-fivem", topic: "Scripts antoniooojdev_* para FiveM: dudas, ideas y vídeos." },
      {
        key: "sugerencias",
        name: "💡・sugerencias",
        type: "forum",
        topic: "Una sugerencia por post. Explica la idea y por qué mejoraría el servidor o los proyectos. Vota con 👍 / 👎.",
        tags: ["🌐 Web", "🎮 FiveM", "🤖 Bot", "💬 Discord", "🟡 En revisión", "✅ Aceptada", "❌ Rechazada"],
        reaction: "👍",
        suggestions: true,
      },
      {
        key: "bugs",
        name: "🐛・bugs",
        type: "forum",
        topic: "Reporta un fallo: qué hacías, qué esperabas, qué pasó y capturas. Un bug por post.",
        tags: ["🌐 Web", "🎮 FiveM", "🤖 Bot", "🔴 Crítico", "🟡 Confirmado", "✅ Arreglado"],
        bugs: true,
      },
    ],
  },
  {
    key: "cat_eventos",
    name: "🎉 EVENTOS",
    access: "lectura",
    channels: [
      { key: "eventos", name: "📅・eventos", topic: "Eventos de la comunidad." },
      { key: "sorteos", name: "🎉・sorteos", topic: "Sorteos activos. Pulsa el botón para participar." },
      { key: "encuestas", name: "📊・encuestas", topic: "Vota y decide el rumbo del servidor." },
    ],
  },
  {
    key: "cat_voz",
    name: "🔊 VOZ",
    access: "voz",
    channels: [
      { key: "crear_sala", name: "➕ Crear sala", type: "voice", tempVoice: true },
      { key: "voz_general", name: "🔊 General", type: "voice" },
      { key: "voz_programando", name: "💻 Programando", type: "voice" },
      { key: "voz_gaming", name: "🎮 Gaming", type: "voice" },
      { key: "voz_musica", name: "🎵 Música", type: "voice" },
      { key: "voz_afk", name: "💤 AFK", type: "voice", afk: true },
    ],
  },
  {
    key: "cat_soporte",
    name: "🎫 SOPORTE",
    access: "chat",
    channels: [{ key: "abrir_ticket", name: "🎫・abrir-ticket", access: "lectura", topic: "Abre un ticket privado con el equipo." }],
  },
  { key: "cat_tickets", name: "📂 TICKETS", access: "soporte", channels: [] },
  {
    key: "cat_staff",
    name: "🛡️ STAFF",
    access: "staff",
    channels: [
      { key: "staff_chat", name: "💬・staff", topic: "Chat interno del equipo." },
      { key: "staff_avisos", name: "📣・avisos-discord", topic: "Avisos oficiales de Discord para administradores de comunidades." },
      { key: "staff_comandos", name: "🤖・comandos-staff", topic: "/anuncio, /panel, /sorteo…" },
      { key: "staff_voz", name: "🔊 Staff", type: "voice" },
    ],
  },
  {
    key: "cat_registros",
    name: "📁 REGISTROS",
    access: "registros",
    channels: [
      { key: "logs", name: "📋・registro", topic: "Entradas, salidas, mensajes borrados y verificaciones." },
      { key: "mod_logs", name: "🛡️・moderación", topic: "Automod, advertencias y sanciones." },
      { key: "ticket_logs", name: "🎫・transcripciones", topic: "Tickets cerrados con su transcripción." },
    ],
  },
];

// ── Redes sociales ───────────────────────────────────────────
// Los avisos automáticos leen feeds RSS/Atom. Instagram y TikTok no tienen
// RSS oficial: si quieres avisos, crea un feed (rss.app, RSSHub…) y pega la URL.
export const socials = {
  links: [
    { label: "Web", emoji: "🌐", url: SITE },
    { label: "GitHub", emoji: "💻", url: "https://github.com/antonioooj" },
    { label: "Instagram", emoji: "📸", url: "https://instagram.com/antonioooj.dev" },
    { label: "LinkedIn", emoji: "💼", url: "https://www.linkedin.com/in/antonioooj" },
    { label: "YouTube", emoji: "🎬", url: "https://www.youtube.com/@antonioooj_dev" },
    // { label: "TikTok", emoji: "🎵", url: "https://tiktok.com/@tu-usuario" },
  ],
  feeds: [
    {
      key: "github",
      name: "GitHub",
      url: "https://github.com/antonioooj.atom",
      channel: "github",
      color: 0xf0f0f0,
      // solo publicaciones interesantes: repos nuevos, releases y pushes
      include: /(created a repository|released|published|pushed)/i,
    },
    {
      key: "youtube",
      name: "YouTube",
      // canal @antonioooj_dev (se puede cambiar con YOUTUBE_FEED en .env)
      url: process.env.YOUTUBE_FEED || "https://www.youtube.com/feeds/videos.xml?channel_id=UCHjQUn1elIj-QlJkvYov_yA",
      channel: "youtube",
      ping: "ping_videos",
      color: 0xff0033,
      backfill: 5, // al estrenar el canal, publica los 5 últimos vídeos (sin mencionar)
      message: "🎬 **¡Vídeo nuevo!** {title}\n{link}",
    },
    { key: "instagram", name: "Instagram", url: process.env.INSTAGRAM_FEED || "", channel: "instagram", color: 0xe1306c },
    { key: "tiktok", name: "TikTok", url: process.env.TIKTOK_FEED || "", channel: "tiktok", color: 0x25f4ee, ping: "ping_videos" },
  ],
  // Directos de Twitch: TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET y TWITCH_USER en .env
  twitch: { channel: "directos", ping: "ping_directos" },
};

// ── Tipos de ticket ──────────────────────────────────────────
export const ticketTypes = {
  soporte: {
    label: "Soporte",
    emoji: "🛠️",
    desc: "Problemas con un script, la web o el servidor",
    fields: [
      { id: "asunto", label: "Asunto", style: "short", max: 100 },
      { id: "detalle", label: "Explica el problema", style: "paragraph", max: 1500, placeholder: "Qué hacías, qué esperabas y qué ha pasado" },
    ],
  },
  presupuesto: {
    label: "Pedir presupuesto",
    emoji: "💼",
    desc: "Web, script de FiveM, bot o app a medida",
    fields: [
      { id: "tipo", label: "¿Qué necesitas?", style: "short", max: 100, placeholder: "Web, script de FiveM, bot de Discord…" },
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
  { time: "18:00", days: [5], channel: "general", message: "🚀 **Viernes de proyectos**: enseñad lo que habéis hecho esta semana en <#{tus_proyectos}>. ¡El feedback es gratis!" },
];
