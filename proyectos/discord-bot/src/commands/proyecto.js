import {
  ActionRowBuilder,
  MessageFlags,
  ModalBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { allProjects, autocomplete, createProject, editProject } from "../features/projects.js";
import { db } from "../lib/store.js";
import { fail, ok } from "../lib/embeds.js";
import { box, h2, h3, v2 } from "../lib/ui.js";
import { projectCategories, projectStatus } from "../servidor/plan.js";

// datos elegidos en el comando que esperan al formulario (userId → datos)
export const pending = new Map();

const catChoices = Object.entries(projectCategories).map(([value, c]) => ({ name: `${c.emoji} ${c.label}`, value }));
const statusChoices = Object.entries(projectStatus).map(([value, s]) => ({ name: `${s.emoji} ${s.label}`, value }));

export default {
  data: new SlashCommandBuilder()
    .setName("proyecto")
    .setDescription("Gestiona los proyectos del foro #proyectos")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((s) =>
      s
        .setName("nuevo")
        .setDescription("Crea la ficha de un proyecto (abre un formulario)")
        .addStringOption((o) => o.setName("categoria").setDescription("Tipo de proyecto").setRequired(true).addChoices(...catChoices))
        .addStringOption((o) => o.setName("estado").setDescription("Estado (por defecto: Activo)").addChoices(...statusChoices))
        .addAttachmentOption((o) => o.setName("imagen").setDescription("Captura o portada")),
    )
    .addSubcommand((s) =>
      s
        .setName("editar")
        .setDescription("Cambia estado, versión, enlace o tecnologías de un proyecto")
        .addStringOption((o) => o.setName("proyecto").setDescription("Proyecto").setRequired(true).setAutocomplete(true))
        .addStringOption((o) => o.setName("estado").setDescription("Nuevo estado").addChoices(...statusChoices))
        .addStringOption((o) => o.setName("categoria").setDescription("Nueva categoría").addChoices(...catChoices))
        .addStringOption((o) => o.setName("version").setDescription("Versión actual (ej. v1.4.0)").setMaxLength(30))
        .addStringOption((o) => o.setName("enlace").setDescription("URL del proyecto").setMaxLength(300))
        .addStringOption((o) => o.setName("tecnologias").setDescription("Ej: Lua · ESX · NUI").setMaxLength(200))
        .addStringOption((o) => o.setName("nombre").setDescription("Nuevo nombre").setMaxLength(90)),
    )
    .addSubcommand((s) => s.setName("lista").setDescription("Lista de proyectos por categoría")),

  autocomplete,

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === "nuevo") {
      pending.set(interaction.user.id, {
        category: interaction.options.getString("categoria"),
        status: interaction.options.getString("estado") ?? "activo",
        image: interaction.options.getAttachment("imagen")?.url ?? null,
      });
      const field = (id, label, style, opts = {}) => {
        const i = new TextInputBuilder().setCustomId(id).setLabel(label).setStyle(style).setRequired(opts.required ?? true).setMaxLength(opts.max ?? 100);
        if (opts.placeholder) i.setPlaceholder(opts.placeholder);
        return new ActionRowBuilder().addComponents(i);
      };
      const modal = new ModalBuilder()
        .setCustomId("proyecto:crear")
        .setTitle("Nuevo proyecto")
        .addComponents(
          field("nombre", "Nombre", TextInputStyle.Short, { max: 90, placeholder: "antoniooojdev_police, Web de Navaja & Peine…" }),
          field("resumen", "Resumen (1–2 frases)", TextInputStyle.Paragraph, { max: 300 }),
          field("tecnologias", "Tecnologías", TextInputStyle.Short, { required: false, max: 200, placeholder: "Lua · ESX · NUI" }),
          field("enlace", "Enlace", TextInputStyle.Short, { required: false, max: 300, placeholder: "https://…" }),
          field("version", "Versión", TextInputStyle.Short, { required: false, max: 30, placeholder: "v1.0.0" }),
        );
      return interaction.showModal(modal);
    }

    if (sub === "editar") {
      const id = interaction.options.getString("proyecto");
      if (!db.projects[id]) return interaction.reply({ embeds: [fail("Elige un proyecto de la lista.")], flags: MessageFlags.Ephemeral });
      const link = interaction.options.getString("enlace");
      if (link && !/^https?:\/\//.test(link)) return interaction.reply({ embeds: [fail("El enlace debe empezar por https://")], flags: MessageFlags.Ephemeral });
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const p = await editProject(interaction.guild, id, {
        status: interaction.options.getString("estado"),
        category: interaction.options.getString("categoria"),
        version: interaction.options.getString("version"),
        link,
        stack: interaction.options.getString("tecnologias"),
        name: interaction.options.getString("nombre"),
      });
      return interaction.editReply({ embeds: [ok(`Ficha de **${p.name}** actualizada: <#${p.threadId}>`)] });
    }

    // lista
    const list = allProjects();
    const sections = Object.entries(projectCategories).map(([key, c]) => {
      const items = list.filter((p) => p.category === key);
      return [
        h3(c.label, c.emoji),
        items.length
          ? items.map((p) => `- <#${p.threadId}> ${projectStatus[p.status]?.emoji ?? ""} ${p.version ? `\`${p.version}\`` : ""}`).join("\n")
          : "-# *Nada por aquí todavía*",
      ].join("\n");
    });
    return interaction.reply({
      ...v2(box([h2("Proyectos", "📂"), ...sections.flatMap((s, i) => (i ? ["---", s] : [s]))])),
      flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
    });
  },
};

/** Formulario de «/proyecto nuevo» enviado */
export async function onModal(interaction, action) {
  if (action !== "crear") return;
  const data = pending.get(interaction.user.id);
  if (!data) return interaction.reply({ embeds: [fail("El formulario ha caducado. Vuelve a usar /proyecto nuevo.")], flags: MessageFlags.Ephemeral });
  pending.delete(interaction.user.id);

  const get = (id) => interaction.fields.getTextInputValue(id)?.trim() ?? "";
  const link = get("enlace");
  if (link && !/^https?:\/\//.test(link)) return interaction.reply({ embeds: [fail("El enlace debe empezar por https://")], flags: MessageFlags.Ephemeral });

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const thread = await createProject(interaction.guild, {
    ...data,
    name: get("nombre"),
    summary: get("resumen"),
    stack: get("tecnologias"),
    link,
    version: get("version"),
  });
  return interaction.editReply({ embeds: [ok(`Proyecto creado: ${thread}. Publica su primera novedad con \`/novedad\`.`)] });
}
