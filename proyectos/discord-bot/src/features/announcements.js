// Sistema de anuncios: /anuncio abre un formulario y publica un embed con la marca
// en el canal elegido, con mención opcional y publicación automática a seguidores.

import {
  ActionRowBuilder,
  MessageFlags,
  ModalBuilder,
  PermissionFlagsBits,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import config from "../config.js";
import { fail, ok } from "../lib/embeds.js";
import { box, etiqueta, gallery, h1, linkBtn, row as uiRow, v2 } from "../lib/ui.js";

export const DESTINOS = {
  anuncios: { label: "📢 Anuncios", ping: "ping_anuncios" },
  general: { label: "💬 General", ping: null },
  // las novedades de proyectos van con /novedad (avisan por categoría)
};

export const ESTILOS = {
  marca: { label: "⚪ Marca (blanco)", color: config.colors.primary, prefix: "" },
  importante: { label: "🔴 Importante", color: config.colors.danger, prefix: "🚨 " },
  novedad: { label: "🟢 Novedad", color: config.colors.success, prefix: "✨ " },
  aviso: { label: "🟡 Aviso", color: config.colors.warning, prefix: "⚠️ " },
};

/** Paso 1 (comando): abre el formulario con los datos elegidos en el customId */
export function openForm(interaction, destino, mencion, estilo) {
  const modal = new ModalBuilder()
    .setCustomId(`anuncio:send:${destino}:${mencion}:${estilo}`)
    .setTitle(`Nuevo anuncio → ${DESTINOS[destino].label}`.slice(0, 45))
    .addComponents(
      row("titulo", "Título", TextInputStyle.Short, { max: 256 }),
      row("mensaje", "Mensaje (admite **markdown**)", TextInputStyle.Paragraph, { max: 4000 }),
      row("imagen", "Imagen (URL)", TextInputStyle.Short, { required: false, placeholder: "https://… .png / .gif" }),
      row("boton", "Botón: texto | enlace", TextInputStyle.Short, { required: false, placeholder: "Ver en la web | https://antonioooj.dev" }),
    );
  return interaction.showModal(modal);
}

function row(id, label, style, { max = 1000, required = true, placeholder } = {}) {
  const input = new TextInputBuilder().setCustomId(id).setLabel(label).setStyle(style).setMaxLength(max).setRequired(required);
  if (placeholder) input.setPlaceholder(placeholder);
  return new ActionRowBuilder().addComponents(input);
}

const isUrl = (s) => /^https?:\/\/\S+$/i.test(s);

/** Paso 2 (formulario enviado): publica */
export async function onModal(interaction, action, destino, mencion, estilo) {
  if (action !== "send") return;
  if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild)) {
    return interaction.reply({ embeds: [fail("No tienes permiso para publicar anuncios.")], flags: MessageFlags.Ephemeral });
  }

  const channel = interaction.guild.channels.cache.get(config.ids.channels[destino]);
  if (!channel?.isTextBased()) {
    return interaction.reply({ embeds: [fail("Ese canal no existe todavía. Ejecuta `npm run setup`.")], flags: MessageFlags.Ephemeral });
  }

  const get = (id) => interaction.fields.getTextInputValue(id)?.trim() ?? "";
  const style = ESTILOS[estilo] ?? ESTILOS.marca;

  const image = get("imagen");
  if (image && !isUrl(image)) {
    return interaction.reply({ embeds: [fail("La imagen tiene que ser una URL (https://…).")], flags: MessageFlags.Ephemeral });
  }
  const button = get("boton");
  let link = null;
  if (button) {
    const [label, url] = button.split("|").map((x) => x.trim());
    if (!label || !isUrl(url ?? "")) {
      return interaction.reply({ embeds: [fail("El botón va así: `Texto | https://enlace`")], flags: MessageFlags.Ephemeral });
    }
    link = linkBtn(label.slice(0, 80), url);
  }

  // mención: ninguna · rol de avisos del canal · @everyone
  const pingRole = mencion === "rol" ? config.ids.roles[DESTINOS[destino].ping ?? ""] : null;
  const mentionText = mencion === "everyone" ? "@everyone" : pingRole ? `<@&${pingRole}>` : null;

  const message = await channel.send({
    ...v2(
      box(
        [
          etiqueta(DESTINOS[destino].label, mentionText),
          h1(get("titulo"), style.prefix.trim()),
          get("mensaje"),
          image && gallery(image),
          link && uiRow(link),
          "---",
          `-# **${interaction.member.displayName}**  ·  <t:${Math.floor(Date.now() / 1000)}:f>`,
        ],
        style.color,
      ),
    ),
    allowedMentions: { parse: mencion === "everyone" ? ["everyone"] : [], roles: pingRole ? [pingRole] : [] },
  });
  if (message.crosspostable) await message.crosspost().catch(() => {});

  return interaction.reply({ embeds: [ok(`Anuncio publicado en ${channel}: ${message.url}`)], flags: MessageFlags.Ephemeral });
}
