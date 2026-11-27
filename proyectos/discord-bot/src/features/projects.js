// Proyectos y novedades.
//  · Cada proyecto es un post del foro #proyectos con su ficha (categoría, estado,
//    versión, tecnologías, enlace) y, debajo, todo su historial de cambios.
//  · Cada novedad se publica en el post del proyecto y como tarjeta en #novedades,
//    avisando solo al rol de esa categoría (FiveM, Web, App web, Bot).

import { AttachmentBuilder, ChannelType, MessageFlags } from "discord.js";
import config from "../config.js";
import { db, save } from "../lib/store.js";
import { log } from "../lib/logger.js";
import { box, btn, etiqueta, gallery, h1, h2, linkBtn, row, v2 } from "../lib/ui.js";
import { projectCategories, projectStatus, updateTypes } from "../servidor/plan.js";

const ts = (ms, style = "R") => `<t:${Math.floor(ms / 1000)}:${style}>`;
const roleMention = (key) => (config.ids.roles[key] ? `<@&${config.ids.roles[key]}>` : "");

/** «+ algo» ✨ · «~ algo» 🛠️ · «- algo» 🐛 · resto • */
export function formatChanges(raw) {
  return raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const m = l.match(/^([+~*!-])\s*(.*)$/);
      if (!m) return `- ${l}`;
      const icon = { "+": "✨", "~": "🛠️", "*": "🛠️", "-": "🐛", "!": "⚠️" }[m[1]];
      return `- ${icon} ${m[2]}`;
    })
    .join("\n");
}

async function imageFile(url, base) {
  if (!url) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) return null;
    const type = res.headers.get("content-type") ?? "";
    if (!type.startsWith("image/")) return null;
    const ext = type.split("/")[1].split(";")[0].replace("jpeg", "jpg");
    const name = `${base}.${ext}`;
    return { file: new AttachmentBuilder(Buffer.from(await res.arrayBuffer()), { name }), ref: `attachment://${name}` };
  } catch {
    return null;
  }
}

function forum(guild) {
  const ch = guild.channels.cache.get(config.channels.projects);
  return ch?.type === ChannelType.GuildForum ? ch : null;
}

const tagId = (forumChannel, name) => forumChannel.availableTags.find((t) => t.name === name)?.id;

function tagsFor(forumChannel, p) {
  const cat = projectCategories[p.category];
  const st = projectStatus[p.status];
  return [tagId(forumChannel, cat.short), st && tagId(forumChannel, st.label)].filter(Boolean);
}

// ── Ficha del proyecto (primer mensaje del post) ─────────────

export function projectCard(p) {
  const cat = projectCategories[p.category];
  const st = projectStatus[p.status] ?? projectStatus.activo;
  const last = p.updates.at(-1);
  const rol = roleMention(cat.role);
  const buttons = [
    p.link && linkBtn("Ver proyecto", p.link, "🔗"),
    btn(`proyecto:historial:${p.threadId}`, "Historial", { emoji: "📜" }),
  ].filter(Boolean);

  return v2(
    box([
      p.imageRef && gallery(p.imageRef),
      etiqueta(`${cat.emoji} ${cat.label}`, `${st.emoji} **${st.label}**`),
      h1(p.name),
      p.summary,
      "---",
      [
        `**VERSIÓN** · \`${p.version || "—"}\``,
        `**NOVEDADES** · ${p.updates.length}`,
        `**ACTUALIZADO** · ${ts(last?.at ?? p.createdAt)}`,
        p.stack && `**TECNOLOGÍAS** · ${p.stack}`,
      ]
        .filter(Boolean)
        .join("\n"),
      "---",
      `-# Los **cambios** se publican en este post, debajo de la ficha${rol ? `  ·  avisos con ${rol}` : ""}`,
    ]),
    row(buttons),
  );
}

/**
 * Tarjeta de una novedad: en el post del proyecto o, con `threadUrl`, en #novedades
 * (con la categoría, el proyecto y la mención al rol de avisos).
 */
export function updateCard({ p, u, body, imageRef, link, author, threadUrl, ping }) {
  const cat = projectCategories[p.category];
  const kind = updateTypes[u.type] ?? updateTypes.funcion;
  const enNovedades = !!threadUrl;
  const texto = enNovedades && body.length > 1400 ? `${body.slice(0, 1400)}\n- *…y más en el post del proyecto*` : body;
  const meta = [`${kind.emoji} **${kind.label}**`, u.version && `\`${u.version}\``, ts(u.at, "D"), author && `por **${author}**`];
  const botones = [
    enNovedades && linkBtn("Ver proyecto", threadUrl, "📂"),
    link && linkBtn(enNovedades ? "Enlace" : "Ver cambios", link, "🔗"),
  ].filter(Boolean);
  return v2(
    box([
      imageRef && gallery(imageRef),
      enNovedades ? etiqueta(`${cat.emoji} ${cat.label}`, `**${p.name}**`, ping && `<@&${ping}>`) : etiqueta("Novedad", `**${p.name}**`),
      enNovedades ? h1(u.title) : h2(u.title, kind.emoji),
      "---",
      texto,
      "---",
      `-# ${meta.filter(Boolean).join("  ·  ")}`,
    ]),
    botones.length ? row(botones) : [],
  );
}

export async function refreshCard(guild, p) {
  const thread = await guild.channels.fetch(p.threadId).catch(() => null);
  const starter = await thread?.fetchStarterMessage().catch(() => null);
  if (starter) await starter.edit({ ...projectCard(p), allowedMentions: { parse: [] } }).catch((e) => log.warn("Ficha:", e.message));
  if (thread) {
    const f = forum(guild);
    if (f) await thread.setAppliedTags(tagsFor(f, p)).catch(() => {});
    if (thread.name !== p.name) await thread.setName(p.name.slice(0, 100)).catch(() => {});
  }
}

// ── Crear / editar ───────────────────────────────────────────

/** @returns {Promise<import("discord.js").ThreadChannel>} */
export async function createProject(guild, data) {
  const f = forum(guild);
  if (!f) throw new Error("No existe el foro de proyectos. Ejecuta `npm run setup`.");

  const img = await imageFile(data.image, "portada");
  const p = {
    name: data.name,
    category: data.category,
    status: data.status ?? "activo",
    summary: data.summary ?? "",
    link: data.link ?? "",
    stack: data.stack ?? "",
    version: data.version ?? "",
    imageRef: img?.ref ?? null,
    createdAt: Date.now(),
    updates: [],
  };

  const thread = await f.threads.create({
    name: p.name.slice(0, 100),
    appliedTags: tagsFor(f, p),
    message: { ...projectCard({ ...p, threadId: "0" }), files: img ? [img.file] : [], allowedMentions: { parse: [] } },
  });
  p.threadId = thread.id;
  db.projects[thread.id] = p;
  save();
  // ya con el id real del post (para el botón de historial)
  await refreshCard(guild, p);
  return thread;
}

export async function editProject(guild, threadId, changes) {
  const p = db.projects[threadId];
  if (!p) throw new Error("Proyecto no encontrado.");
  for (const [k, v] of Object.entries(changes)) if (v !== null && v !== undefined) p[k] = v;
  save();
  await refreshCard(guild, p);
  return p;
}

// ── Novedades ────────────────────────────────────────────────

export async function postUpdate(guild, threadId, { type, title, changes, version, image, link }, author) {
  const p = db.projects[threadId];
  if (!p) throw new Error("Proyecto no encontrado.");
  const cat = projectCategories[p.category];
  const at = Date.now();
  const body = formatChanges(changes);
  const u = { type, title, version: version || null, at };

  const thread = await guild.channels.fetch(threadId);

  // 1) en el post del proyecto
  const imgThread = await imageFile(image, `novedad-${p.updates.length + 1}`);
  const inThread = await thread.send({
    ...updateCard({ p, u, body, imageRef: imgThread?.ref, link, author }),
    files: imgThread ? [imgThread.file] : [],
    allowedMentions: { parse: [] },
  });

  // 2) tarjeta en #novedades con aviso a la categoría
  const news = guild.channels.cache.get(config.channels.news);
  let newsMsg = null;
  if (news?.isTextBased()) {
    const imgNews = await imageFile(image, "novedad");
    const ping = config.ids.roles[cat.role];
    newsMsg = await news.send({
      ...updateCard({ p, u, body, imageRef: imgNews?.ref, link, author, threadUrl: inThread.url, ping }),
      files: imgNews ? [imgNews.file] : [],
      allowedMentions: { roles: ping ? [ping] : [] },
    });
    if (newsMsg.crosspostable) await newsMsg.crosspost().catch(() => {});
  }

  // 3) historial y ficha
  // texto, enlace y autor se guardan para poder rehacer las tarjetas si cambia el diseño
  p.updates.push({ ...u, body, link: link || null, author: author || null, messageUrl: inThread.url, newsUrl: newsMsg?.url ?? null });
  if (version) p.version = version;
  if (type === "lanzamiento" && p.status === "desarrollo") p.status = "activo";
  save();
  await refreshCard(guild, p);
  return { inThread, newsMsg };
}

// ── Consultas ────────────────────────────────────────────────

export const allProjects = () =>
  Object.values(db.projects).sort((a, b) => (b.updates.at(-1)?.at ?? b.createdAt) - (a.updates.at(-1)?.at ?? a.createdAt));

export function autocomplete(interaction) {
  const q = interaction.options.getFocused().toLowerCase();
  return interaction.respond(
    allProjects()
      .filter((p) => p.name.toLowerCase().includes(q))
      .slice(0, 25)
      .map((p) => ({ name: `${projectCategories[p.category].emoji} ${p.name}`.slice(0, 100), value: p.threadId })),
  );
}

export function historyMessage(p) {
  const kinds = Object.fromEntries(Object.entries(updateTypes).map(([k, v]) => [k, v.emoji]));
  const lines = p.updates
    .slice(-20)
    .reverse()
    .map(
      (u, i) =>
        `**\`${String(i + 1).padStart(2, "0")}\`**  ${kinds[u.type] ?? "•"} **[${u.title}](${u.messageUrl})**${u.version ? ` \`${u.version}\`` : ""}\n-# ${ts(u.at, "d")}`,
    );
  return box([
    etiqueta("Historial", `**${p.name}**`),
    h2("Novedades", "📜"),
    "---",
    lines.length ? lines.join("\n") : "Todavía no hay novedades.",
    p.updates.length > 20 && `-# Las 20 últimas de ${p.updates.length}`,
  ]);
}

export async function onButton(interaction, action, threadId) {
  if (action !== "historial") return;
  const p = db.projects[threadId];
  if (!p) return interaction.reply({ content: "Proyecto no encontrado.", flags: MessageFlags.Ephemeral });
  return interaction.reply({ ...v2(historyMessage(p)), flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
}
