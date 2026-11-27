// Piezas de interfaz minimalista con los componentes v2 de Discord:
// contenedores, textos con markdown (# ## ### -# __ ** *), separadores,
// secciones con miniatura o botón y galerías de imágenes.

import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  MediaGalleryBuilder,
  MessageFlags,
  SectionBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  TextDisplayBuilder,
  ThumbnailBuilder,
} from "discord.js";

export const ACCENT = 0xf2f2f2; // blanco de la marca AJ

// ── Estilo AJ de los títulos: en MAYÚSCULAS y __subrayados__, con un solo emoji delante ──
// Las menciones (<@…> <#…> <t:…>) y los enlaces se dejan tal cual para no romperlos.
export const MAYUS = (t) =>
  String(t)
    .split(/(<[^>]+>|\]\([^)]+\))/)
    .map((x, i) => (i % 2 ? x : x.toLocaleUpperCase("es-ES")))
    .join("");
const titulo = (nivel) => (t, emoji) => `${nivel} ${emoji ? `${emoji} ` : ""}__${MAYUS(t)}__`;
/** `# 📜 __NORMAS__` */
export const h1 = titulo("#");
/** `## ⚖️ __SANCIONES__` */
export const h2 = titulo("##");
/** `### __APARTADO__` */
export const h3 = titulo("###");
/** Línea pequeña de contexto: `-# **ETIQUETA** · resto` */
export const etiqueta = (t, ...resto) => `-# **${MAYUS(t)}**${resto.filter(Boolean).length ? `  ·  ${resto.filter(Boolean).join("  ·  ")}` : ""}`;

export const text = (...lines) => new TextDisplayBuilder().setContent(lines.flat().filter((l) => l !== null && l !== undefined && l !== false).join("\n"));

export const sep = (large = false, divider = true) =>
  new SeparatorBuilder().setDivider(divider).setSpacing(large ? SeparatorSpacingSize.Large : SeparatorSpacingSize.Small);

/** Texto con miniatura a la derecha */
export const withThumb = (url, ...lines) =>
  new SectionBuilder().addTextDisplayComponents(text(...lines)).setThumbnailAccessory(new ThumbnailBuilder().setURL(url));

/** Texto con un botón a la derecha */
export const withButton = (button, ...lines) => new SectionBuilder().addTextDisplayComponents(text(...lines)).setButtonAccessory(button);

export const gallery = (...urls) => new MediaGalleryBuilder().addItems(urls.filter(Boolean).map((url) => ({ media: { url } })));

export const row = (...components) => new ActionRowBuilder().addComponents(components.flat());

export const linkBtn = (label, url, emoji) => {
  const b = new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel(label).setURL(url);
  if (emoji) b.setEmoji(emoji);
  return b;
};

export const btn = (customId, label, { emoji, style = ButtonStyle.Secondary, disabled = false } = {}) => {
  const b = new ButtonBuilder().setCustomId(customId).setLabel(label).setStyle(style).setDisabled(disabled);
  if (emoji) b.setEmoji(emoji);
  return b;
};

/**
 * Contenedor a partir de una lista de piezas. Acepta:
 *  string → texto · "---" → separador · "===" → separador grande · builders tal cual
 */
export function box(parts, accent = ACCENT) {
  const c = new ContainerBuilder();
  if (accent !== null) c.setAccentColor(accent);
  for (const p of parts.flat()) {
    if (p === null || p === undefined || p === false) continue;
    if (p === "---") c.addSeparatorComponents(sep());
    else if (p === "===") c.addSeparatorComponents(sep(true));
    else if (typeof p === "string") c.addTextDisplayComponents(text(p));
    else if (p instanceof TextDisplayBuilder) c.addTextDisplayComponents(p);
    else if (p instanceof SeparatorBuilder) c.addSeparatorComponents(p);
    else if (p instanceof SectionBuilder) c.addSectionComponents(p);
    else if (p instanceof MediaGalleryBuilder) c.addMediaGalleryComponents(p);
    else if (p instanceof ActionRowBuilder) c.addActionRowComponents(p);
    else throw new Error("Pieza de interfaz desconocida");
  }
  return c;
}

/** Mensaje v2 listo para send()/edit()/reply() */
export const v2 = (...components) => ({ components: components.flat(), flags: MessageFlags.IsComponentsV2 });

/** Igual pero efímero (solo lo ve quien pulsa) */
export const v2Ephemeral = (...components) => ({
  components: components.flat(),
  flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
});

export { ButtonStyle };
