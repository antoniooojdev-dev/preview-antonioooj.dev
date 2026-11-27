import {
  ActionRowBuilder,
  MessageFlags,
  ModalBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { autocomplete, postUpdate } from "../features/projects.js";
import { db } from "../lib/store.js";
import { fail, ok } from "../lib/embeds.js";
import { updateTypes } from "../servidor/plan.js";

const pending = new Map(); // userId → datos del comando

export default {
  data: new SlashCommandBuilder()
    .setName("novedad")
    .setDescription("Publica una novedad de un proyecto (en su post y en #novedades)")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption((o) => o.setName("proyecto").setDescription("Proyecto").setRequired(true).setAutocomplete(true))
    .addStringOption((o) =>
      o
        .setName("tipo")
        .setDescription("Tipo de novedad")
        .setRequired(true)
        .addChoices(...Object.entries(updateTypes).map(([value, t]) => ({ name: `${t.emoji} ${t.label}`, value }))),
    )
    .addStringOption((o) => o.setName("version").setDescription("Versión (ej. v1.3.0)").setMaxLength(30))
    .addAttachmentOption((o) => o.setName("imagen").setDescription("Captura del cambio"))
    .addStringOption((o) => o.setName("enlace").setDescription("Enlace (demo, vídeo, commit…)").setMaxLength(300)),

  autocomplete,

  async execute(interaction) {
    const threadId = interaction.options.getString("proyecto");
    const p = db.projects[threadId];
    if (!p) return interaction.reply({ embeds: [fail("Elige un proyecto de la lista (o créalo con `/proyecto nuevo`).")], flags: MessageFlags.Ephemeral });
    const link = interaction.options.getString("enlace");
    if (link && !/^https?:\/\//.test(link)) return interaction.reply({ embeds: [fail("El enlace debe empezar por https://")], flags: MessageFlags.Ephemeral });

    pending.set(interaction.user.id, {
      threadId,
      type: interaction.options.getString("tipo"),
      version: interaction.options.getString("version"),
      image: interaction.options.getAttachment("imagen")?.url ?? null,
      link,
    });

    const t = updateTypes[interaction.options.getString("tipo")];
    const modal = new ModalBuilder()
      .setCustomId("novedad:enviar")
      .setTitle(`${t.emoji} ${p.name}`.slice(0, 45))
      .addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("titulo").setLabel("Título").setStyle(TextInputStyle.Short).setMaxLength(120).setPlaceholder("Ej: Nuevo menú de radio y arreglos en el MDT"),
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("cambios")
            .setLabel("Cambios (uno por línea)")
            .setStyle(TextInputStyle.Paragraph)
            .setMaxLength(3000)
            .setPlaceholder("+ Algo nuevo\n~ Algo mejorado\n- Algo arreglado\nTexto normal también vale"),
        ),
      );
    return interaction.showModal(modal);
  },
};

export async function onModal(interaction, action) {
  if (action !== "enviar") return;
  const data = pending.get(interaction.user.id);
  if (!data) return interaction.reply({ embeds: [fail("El formulario ha caducado. Vuelve a usar /novedad.")], flags: MessageFlags.Ephemeral });
  pending.delete(interaction.user.id);

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const { newsMsg, inThread } = await postUpdate(
    interaction.guild,
    data.threadId,
    {
      ...data,
      title: interaction.fields.getTextInputValue("titulo").trim(),
      changes: interaction.fields.getTextInputValue("cambios"),
    },
    interaction.user.toString(),
  );
  return interaction.editReply({ embeds: [ok(`En su post: ${inThread.url}${newsMsg ? `
En novedades: ${newsMsg.url}` : ""}`, "Novedad publicada")] });
}
