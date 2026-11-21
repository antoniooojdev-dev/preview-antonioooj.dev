// Sistema de anuncios: /anuncio abre un formulario y publica un embed con la marca
// en el canal elegido, con mención opcional y publicación automática a seguidores.

import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
  ModalBuilder,
  PermissionFlagsBits,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import config from "../config.js";
import { fail, ok } from "../lib/embeds.js";
import { LOGO } from "../servidor/plan.js";

export const DESTINOS = {
  anuncios: { label: "📢 Anuncios", ping: "ping_anuncios" },
  novedades: { label: "📰 Novedades", ping: "ping_anuncios" },
  changelog: { label: "📋 Changelog", ping: "ping_proyectos" },
  eventos: { label: "📅 Eventos", ping: "ping_eventos" },
  sorteos: { label: "🎉 Sorteos", ping: "ping_sorteos" },
  general: { label: "💬 General", ping: null },
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
  const embed = new EmbedBuilder()
    .setColor(style.color)
    .setAuthor({ name: "AJ · DEV", iconURL: LOGO, url: "https://antonioooj.dev" })
    .setTitle(`${style.prefix}${get("titulo")}`.slice(0, 256))
    .setDescription(get("mensaje"))
    .setFooter({ text: `Publicado por ${interaction.member.displayName}`, iconURL: interaction.user.displayAvatarURL() })
    .setTimestamp();

  const image = get("imagen");
  if (image) {
    if (!isUrl(image)) return interaction.reply({ embeds: [fail("La imagen tiene que ser una URL (https://…).")], flags: MessageFlags.Ephemeral });
    embed.setImage(image);
  }

  const components = [];
  const button = get("boton");
  if (button) {
    const [text, url] = button.split("|").map((s) => s.trim());
    if (!text || !isUrl(url ?? "")) {
      return interaction.reply({ embeds: [fail("El botón va así: `Texto | https://enlace`")], flags: MessageFlags.Ephemeral });
    }
    components.push(new ActionRowBuilder().addComponents(new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel(text.slice(0, 80)).setURL(url)));
  }

  // mención: ninguna · rol de avisos del canal · @everyone
  const pingRole = mencion === "rol" ? config.ids.roles[DESTINOS[destino].ping ?? ""] : null;
  const content = mencion === "everyone" ? "@everyone" : pingRole ? `<@&${pingRole}>` : undefined;

  const message = await channel.send({
    content,
    allowedMentions: { parse: mencion === "everyone" ? ["everyone"] : [], roles: pingRole ? [pingRole] : [] },
    embeds: [embed],
    components,
  });
  if (message.crosspostable) await message.crosspost().catch(() => {});

  return interaction.reply({ embeds: [ok(`Anuncio publicado en ${channel}: ${message.url}`)], flags: MessageFlags.Ephemeral });
}
