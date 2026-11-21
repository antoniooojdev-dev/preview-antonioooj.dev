// ─────────────────────────────────────────────────────────────
//  Monta el servidor de Discord según src/servidor/plan.js
//
//    npm run setup                → crea/actualiza todo (no duplica nada)
//    npm run setup -- --revisar   → solo enseña lo que hay ahora, sin tocar nada
//    npm run setup -- --limpiar   → además BORRA canales y roles que no estén en el plano
//
//  Se puede ejecutar las veces que haga falta: edita los mismos canales,
//  roles y mensajes de los paneles en vez de crear otros nuevos.
// ─────────────────────────────────────────────────────────────

import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  AutoModerationActionType,
  AutoModerationRuleEventType,
  AutoModerationRuleKeywordPresetType,
  AutoModerationRuleTriggerType,
  ChannelType,
  Client,
  GatewayIntentBits,
  GuildDefaultMessageNotifications,
  GuildExplicitContentFilter,
  GuildFeature,
  GuildSystemChannelFlags,
  GuildVerificationLevel,
  OverwriteType,
  PermissionFlagsBits as P,
  PermissionsBitField,
} from "discord.js";
import { categories, guildSettings, roles as planRoles, STAFF, SUPPORT } from "./servidor/plan.js";
import { loadServidor, saveServidor } from "./lib/servidor.js";

const args = new Set(process.argv.slice(2));
const DRY = args.has("--revisar");
const CLEAN = args.has("--limpiar");
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const say = (icon, text) => console.log(`${icon}  ${text}`);
const norm = (s) => s.normalize("NFKD").replace(/[^\p{L}\p{N}]/gu, "").toLowerCase();

if (!process.env.DISCORD_TOKEN) {
  console.error("Falta DISCORD_TOKEN en .env");
  process.exit(1);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const ready = new Promise((r) => client.once("clientReady", r));
await client.login(process.env.DISCORD_TOKEN);
await ready;

// ── Servidor ─────────────────────────────────────────────────
const ids = loadServidor();
const guildId = process.env.GUILD_ID || ids.guildId;
let guild = guildId ? client.guilds.cache.get(guildId) : null;
if (!guild) {
  const list = [...client.guilds.cache.values()];
  guild = list.length === 1 ? list[0] : list.find((g) => /antonio/i.test(g.name));
}
if (!guild) {
  console.error(`No encuentro el servidor. Estoy en: ${client.guilds.cache.map((g) => `${g.name} (${g.id})`).join(", ") || "ninguno"}`);
  process.exit(1);
}
guild = await guild.fetch();
await guild.channels.fetch();
await guild.roles.fetch();
const me = await guild.members.fetchMe();
ids.guildId = guild.id;
say("🏠", `Servidor: ${guild.name} (${guild.id}) · ${guild.memberCount} miembros`);

if (!me.permissions.has(P.Administrator)) {
  console.error("El bot necesita el permiso de Administrador para montar el servidor.");
  process.exit(1);
}

// ── Modo revisión ────────────────────────────────────────────
if (DRY) {
  say("🎭", "Roles:");
  guild.roles.cache
    .sort((a, b) => b.position - a.position)
    .forEach((r) => console.log(`     ${r.position.toString().padStart(3)} ${r.name}${r.managed ? " (integración)" : ""}`));
  say("📁", "Canales:");
  const cats = guild.channels.cache.filter((c) => c.type === ChannelType.GuildCategory).sort((a, b) => a.position - b.position);
  const print = (c, pad) => console.log(`${pad}${ChannelType[c.type]}: ${c.name}`);
  guild.channels.cache.filter((c) => !c.parentId && c.type !== ChannelType.GuildCategory).forEach((c) => print(c, "     "));
  cats.forEach((cat) => {
    print(cat, "     ");
    guild.channels.cache.filter((c) => c.parentId === cat.id).sort((a, b) => a.position - b.position).forEach((c) => print(c, "        "));
  });
  say("⚙️", `Comunidad: ${guild.features.includes(GuildFeature.Community) ? "sí" : "no"} · Verificación: ${GuildVerificationLevel[guild.verificationLevel]}`);
  await client.destroy();
  process.exit(0);
}

// ── 1. Roles ─────────────────────────────────────────────────
say("🎭", "Roles…");
const findRole = (def) =>
  guild.roles.cache.get(ids.roles[def.key]) ?? guild.roles.cache.find((r) => !r.managed && norm(r.name) === norm(def.name));

for (const def of planRoles) {
  const data = {
    name: def.name,
    colors: { primaryColor: def.separator ? 0 : (def.color ?? 0) },
    hoist: !!def.hoist,
    mentionable: false,
    permissions: new PermissionsBitField((def.perms ?? []).map((p) => P[p])),
  };
  let role = findRole(def);
  if (!role) {
    role = await guild.roles.create({ ...data, reason: "Setup AJ" });
    say("  ➕", def.name);
  } else if (role.position < me.roles.highest.position) {
    await role.edit({ ...data, reason: "Setup AJ" });
  } else {
    say("  ⚠️", `${role.name} está por encima del bot: no lo puedo editar`);
  }
  ids.roles[def.key] = role.id;
}

// orden: justo debajo del rol del bot, en el orden del plano
{
  await me.fetch(true);
  let pos = me.roles.highest.position - 1;
  const positions = planRoles.map((def) => ({ role: ids.roles[def.key], position: pos-- })).filter((p) => p.position > 0);
  const current = planRoles.map((def) => guild.roles.cache.get(ids.roles[def.key])?.position ?? 0);
  const ordered = current.every((p, i) => i === 0 || p < current[i - 1]);
  if (!ordered) await guild.roles.setPositions(positions).catch((err) => say("  ⚠️", `No pude ordenar los roles: ${err.message}`));
}

// permisos base de @everyone (lo que se ve lo controlan los canales)
await guild.roles.everyone.setPermissions(
  [
    P.ViewChannel, P.ReadMessageHistory, P.SendMessages, P.SendMessagesInThreads, P.CreatePublicThreads, P.EmbedLinks,
    P.AttachFiles, P.AddReactions, P.UseExternalEmojis, P.UseExternalStickers, P.UseApplicationCommands, P.ChangeNickname,
    P.CreateInstantInvite, P.Connect, P.Speak, P.Stream, P.UseVAD, P.UseSoundboard, P.UseEmbeddedActivities, P.SendVoiceMessages,
    P.RequestToSpeak, P.SendPolls,
  ],
  "Setup AJ: permisos base",
);

// el fundador recibe su rol
const owner = await guild.fetchOwner();
if (!owner.roles.cache.has(ids.roles.fundador)) await owner.roles.add(ids.roles.fundador, "Setup AJ").catch(() => {});

// ── 2. Permisos por tipo de canal ────────────────────────────
const R = (key) => ids.roles[key];
const READ = [P.ViewChannel, P.ReadMessageHistory];
const WRITE = [
  P.SendMessages, P.SendMessagesInThreads, P.CreatePublicThreads, P.AddReactions, P.AttachFiles, P.EmbedLinks,
  P.UseApplicationCommands, P.UseExternalEmojis,
];
const NOWRITE = [P.SendMessages, P.SendMessagesInThreads, P.CreatePublicThreads, P.CreatePrivateThreads];
const VOICE = [P.ViewChannel, P.Connect, P.Speak, P.Stream, P.UseVAD, P.UseSoundboard, P.UseEmbeddedActivities, P.SendMessages, P.ReadMessageHistory];

function overwrites(access, def = {}) {
  const everyone = guild.roles.everyone.id;
  const member = R("miembro");
  const team = (keys, allow, deny = []) => keys.map((k) => ({ id: R(k), type: OverwriteType.Role, allow, deny }));
  const bot = {
    id: client.user.id,
    type: OverwriteType.Member,
    allow: [...READ, P.SendMessages, P.EmbedLinks, P.AttachFiles, P.ManageChannels, P.ManageMessages, P.ManageThreads, P.Connect, P.MoveMembers],
  };
  const role = (id, allow = [], deny = []) => ({ id, type: OverwriteType.Role, allow, deny });

  const presets = {
    inicio: [role(everyone, [...READ, P.AddReactions], NOWRITE), ...team(STAFF, [P.SendMessages])],
    verificacion: [role(everyone, READ, [...NOWRITE, P.AddReactions]), role(member, [], [P.ViewChannel]), ...team(STAFF, [P.ViewChannel, P.SendMessages])],
    lectura: [role(everyone, [], [P.ViewChannel]), role(member, [...READ, P.AddReactions], NOWRITE), ...team(STAFF, [...READ, P.SendMessages, P.SendMessagesInThreads])],
    chat: [role(everyone, [], [P.ViewChannel]), role(member, [...READ, ...WRITE]), ...team(STAFF, READ)],
    voz: [role(everyone, [], [P.ViewChannel]), role(member, VOICE, def.afk ? [P.Speak, P.Stream] : [])],
    stats: [role(everyone, [P.ViewChannel], [P.Connect])],
    staff: [role(everyone, [], [P.ViewChannel]), ...team(STAFF, [...READ, ...WRITE, ...VOICE])],
    soporte: [role(everyone, [], [P.ViewChannel]), ...team(SUPPORT, [...READ, ...WRITE])],
    registros: [role(everyone, [], [P.ViewChannel]), ...team(STAFF, [...READ, P.AddReactions], NOWRITE)],
  };
  if (!presets[access]) throw new Error(`Acceso desconocido: ${access}`);
  return [...presets[access].filter((o) => o.id), bot];
}

// ── 3. Ajustes previos a Comunidad ───────────────────────────
await guild.edit({
  verificationLevel: GuildVerificationLevel[guildSettings.verificationLevel],
  explicitContentFilter: GuildExplicitContentFilter[guildSettings.explicitContentFilter],
  defaultMessageNotifications: GuildDefaultMessageNotifications[guildSettings.defaultMessageNotifications],
  reason: "Setup AJ",
});

// ── 4. Categorías y canales ──────────────────────────────────
say("📁", "Categorías y canales…");
const TYPES = {
  text: ChannelType.GuildText,
  announcement: ChannelType.GuildAnnouncement,
  forum: ChannelType.GuildForum,
  voice: ChannelType.GuildVoice,
  category: ChannelType.GuildCategory,
};
const isCommunity = () => guild.features.includes(GuildFeature.Community);

/** texto/anuncios se consideran el mismo "tipo" al buscar (se puede convertir uno en otro) */
const sameFamily = (a, b) => a === b || ([ChannelType.GuildText, ChannelType.GuildAnnouncement].includes(a) && [ChannelType.GuildText, ChannelType.GuildAnnouncement].includes(b));

function findChannel(def, type) {
  const byId = guild.channels.cache.get(ids.channels[def.key]);
  if (byId) return byId;
  // los contadores cambian de nombre: se buscan por su prefijo
  const target = def.stat ? norm(def.name.split(":")[0]) : norm(def.name);
  return guild.channels.cache.find((c) => sameFamily(c.type, type) && (def.stat ? norm(c.name).startsWith(target) : norm(c.name) === target));
}

// etiquetas de estado que solo puede poner el staff
const MODERATED_TAGS = new Set(["En revisión", "Aceptada", "Rechazada", "Confirmado", "Arreglado", "Crítico"]);

function forumTags(def, existing) {
  return def.tags.map((t) => {
    const [emoji, ...rest] = t.split(" ");
    const name = rest.join(" ").slice(0, 20);
    const prev = existing?.availableTags?.find((x) => x.name === name);
    return { ...(prev?.id ? { id: prev.id } : {}), name, emoji: { id: null, name: emoji }, moderated: MODERATED_TAGS.has(name) };
  });
}

async function upsertChannel(def, { parent, access, wantedType }) {
  let type = wantedType;
  if (type === ChannelType.GuildAnnouncement && !isCommunity()) type = ChannelType.GuildText; // se convierte luego

  const data = {
    name: def.name,
    permissionOverwrites: overwrites(access, def),
    ...(parent ? { parent: parent.id } : {}),
    ...(def.topic && type !== ChannelType.GuildVoice && type !== ChannelType.GuildCategory ? { topic: def.topic } : {}),
    ...(def.slowmode ? { rateLimitPerUser: def.slowmode } : {}),
  };

  let channel = findChannel(def, type);
  if (type === ChannelType.GuildForum) {
    data.availableTags = forumTags(def, channel);
    if (def.reaction) data.defaultReactionEmoji = { id: null, name: def.reaction };
  }

  try {
    if (!channel) {
      channel = await guild.channels.create({ ...data, type, reason: "Setup AJ" });
      say("  ➕", def.name);
    } else {
      // el nombre de los contadores lo gestiona el bot
      if (def.stat) delete data.name;
      if (wantedType === ChannelType.GuildAnnouncement && isCommunity() && channel.type === ChannelType.GuildText) data.type = ChannelType.GuildAnnouncement;
      channel = await channel.edit({ ...data, reason: "Setup AJ" });
    }
  } catch (err) {
    if (type === ChannelType.GuildForum) {
      say("  ⚠️", `${def.name}: no se pudo crear como foro (${err.message}); lo creo como texto`);
      return upsertChannel({ ...def, type: "text" }, { parent, access, wantedType: ChannelType.GuildText });
    }
    throw err;
  }
  ids.channels[def.key] = channel.id;
  return channel;
}

async function buildChannels() {
  for (const cat of categories) {
    const category = await upsertChannel(cat, { access: cat.access, wantedType: ChannelType.GuildCategory });
    for (const def of cat.channels) {
      await upsertChannel(def, { parent: category, access: def.access ?? cat.access, wantedType: TYPES[def.type ?? "text"] });
    }
  }
}
await buildChannels();
saveServidor(ids);

// ── 5. Comunidad ─────────────────────────────────────────────
if (guildSettings.community && !isCommunity()) {
  say("🌐", "Activando Comunidad (anuncios seguibles, foros, normas oficiales)…");
  try {
    guild = await guild.edit({
      features: [...guild.features, GuildFeature.Community],
      rulesChannel: ids.channels.normas,
      publicUpdatesChannel: ids.channels.staff_avisos,
      safetyAlertsChannel: ids.channels.mod_logs,
      reason: "Setup AJ",
    });
    // segunda pasada: canales de anuncios y foros que antes no se podían
    await buildChannels();
  } catch (err) {
    say("  ⚠️", `No se pudo activar Comunidad: ${err.message}`);
  }
} else if (isCommunity()) {
  await guild
    .edit({ rulesChannel: ids.channels.normas, publicUpdatesChannel: ids.channels.staff_avisos, safetyAlertsChannel: ids.channels.mod_logs })
    .catch(() => {});
}

// ── 6. Orden ─────────────────────────────────────────────────
say("↕️", "Ordenando…");
await guild.channels.setPositions(categories.map((cat, i) => ({ channel: ids.channels[cat.key], position: i }))).catch((e) => say("  ⚠️", e.message));
for (const cat of categories) {
  // el padre ya se fija al crear/editar cada canal; aquí solo el orden
  const pos = cat.channels.map((def, i) => ({ channel: ids.channels[def.key], position: i })).filter((p) => p.channel);
  if (pos.length) await guild.channels.setPositions(pos).catch((e) => say("  ⚠️", e.message));
}

// ── 7. Ajustes del servidor ──────────────────────────────────
say("⚙️", "Ajustes del servidor…");
const afk = categories.flatMap((c) => c.channels).find((c) => c.afk);
const iconPath = join(ROOT, "assets", "logo.png");
await guild
  .edit({
    description: guildSettings.description,
    afkChannel: afk ? ids.channels[afk.key] : null,
    afkTimeout: guildSettings.afkTimeout,
    systemChannel: ids.channels.bienvenidas,
    // la bienvenida la hace el bot; Discord solo avisa de las mejoras
    systemChannelFlags: [
      GuildSystemChannelFlags.SuppressJoinNotifications,
      GuildSystemChannelFlags.SuppressGuildReminderNotifications,
      GuildSystemChannelFlags.SuppressJoinNotificationReplies,
    ],
    ...(existsSync(iconPath) ? { icon: iconPath } : {}),
    reason: "Setup AJ",
  })
  .catch((err) => say("  ⚠️", `Ajustes: ${err.message}`));
await me.setNickname("AJ Bot").catch(() => {});

// ── 8. AutoMod nativo de Discord ─────────────────────────────
say("🛡️", "AutoMod de Discord…");
const alert = ids.channels.mod_logs;
const exemptRoles = STAFF.map(R).filter(Boolean);
const automodRules = [
  {
    name: "AJ · Lenguaje ofensivo",
    triggerType: AutoModerationRuleTriggerType.KeywordPreset,
    triggerMetadata: {
      // sin "Profanity": bloquearía tacos inofensivos ("wtf") en un servidor de devs
      presets: [AutoModerationRuleKeywordPresetType.SexualContent, AutoModerationRuleKeywordPresetType.Slurs],
    },
  },
  {
    name: "AJ · Insultos",
    triggerType: AutoModerationRuleTriggerType.Keyword,
    triggerMetadata: {
      keywordFilter: ["subnormal*", "gilipollas", "maricon*", "maricón*", "retrasad*", "hijoputa*", "hijo de puta", "malparid*", "sudaca*", "moro de mierda"],
    },
  },
  { name: "AJ · Spam", triggerType: AutoModerationRuleTriggerType.Spam, triggerMetadata: {} },
  {
    name: "AJ · Spam de menciones",
    triggerType: AutoModerationRuleTriggerType.MentionSpam,
    triggerMetadata: { mentionTotalLimit: 6, mentionRaidProtectionEnabled: true },
    timeout: 600,
  },
];
const existingRules = await guild.autoModerationRules.fetch().catch(() => new Map());
for (const rule of automodRules) {
  const actions = [
    { type: AutoModerationActionType.BlockMessage, metadata: { customMessage: "Mensaje bloqueado por las normas del servidor." } },
    ...(alert ? [{ type: AutoModerationActionType.SendAlertMessage, metadata: { channel: alert } }] : []),
    ...(rule.timeout ? [{ type: AutoModerationActionType.Timeout, metadata: { durationSeconds: rule.timeout } }] : []),
  ];
  const data = {
    name: rule.name,
    eventType: AutoModerationRuleEventType.MessageSend,
    triggerType: rule.triggerType,
    triggerMetadata: rule.triggerMetadata,
    actions,
    enabled: true,
    exemptRoles,
    reason: "Setup AJ",
  };
  try {
    // solo reglas creadas por el bot (las predeterminadas de Discord no se pueden editar)
    const mine = [...existingRules.values()].filter((r) => r.creatorId === client.user.id);
    const prev = mine.find((r) => r.name === rule.name) ?? mine.find((r) => r.triggerType === rule.triggerType && rule.triggerType !== AutoModerationRuleTriggerType.Keyword);
    if (prev) {
      const { triggerType, ...edit } = data;
      await prev.edit(edit);
    } else {
      await guild.autoModerationRules.create(data);
      say("  ➕", rule.name);
    }
  } catch (err) {
    say("  ⚠️", `${rule.name}: ${err.message} ${JSON.stringify(err.rawError?.errors ?? "")}`);
  }
}

// ── 9. Limpieza opcional ─────────────────────────────────────
const planned = new Set(Object.values(ids.channels));
const leftovers = guild.channels.cache.filter(
  (c) => !planned.has(c.id) && c.parentId !== ids.channels.cat_tickets && !c.isThread() && !c.name.startsWith("🔊 Sala de"),
);
const plannedRoles = new Set(Object.values(ids.roles));
const leftoverRoles = guild.roles.cache.filter((r) => !plannedRoles.has(r.id) && !r.managed && r.id !== guild.id && r.position < me.roles.highest.position);

if (leftovers.size || leftoverRoles.size) {
  if (CLEAN) {
    say("🧹", "Borrando lo que no está en el plano…");
    // primero los canales hijos, después las categorías
    const isCat = (c) => (c.type === ChannelType.GuildCategory ? 1 : 0);
    for (const c of [...leftovers.values()].sort((a, b) => isCat(a) - isCat(b))) {
      await c.delete("Setup AJ: limpieza").then(() => say("  🗑️", c.name)).catch((e) => say("  ⚠️", `${c.name}: ${e.message}`));
    }
    for (const r of leftoverRoles.values()) {
      await r.delete("Setup AJ: limpieza").then(() => say("  🗑️", `@${r.name}`)).catch((e) => say("  ⚠️", `@${r.name}: ${e.message}`));
    }
  } else {
    say("ℹ️", "Hay cosas que no están en el plano (no se han tocado; usa --limpiar para borrarlas):");
    leftovers.forEach((c) => console.log(`     # ${c.name}`));
    leftoverRoles.forEach((r) => console.log(`     @ ${r.name}`));
  }
}

saveServidor(ids);

// ── 10. Paneles (se importan ahora para que lean los IDs nuevos) ──
say("🧾", "Paneles…");
const { paneles } = await import("./servidor/paneles.js");
for (const [key, build] of Object.entries(paneles)) {
  const channel = guild.channels.cache.get(ids.channels[key]);
  if (!channel?.isTextBased()) continue;
  const payload = build();
  const prev = ids.messages[key] && (await channel.messages.fetch(ids.messages[key]).catch(() => null));
  if (prev) {
    await prev.edit(payload);
  } else {
    const msg = await channel.send(payload);
    ids.messages[key] = msg.id;
    say("  ➕", `panel ${key}`);
  }
}
saveServidor(ids);

say("✅", `Listo. IDs guardados en data/servidor.json. Ahora: npm run deploy && npm start`);
await client.destroy();
process.exit(0);
