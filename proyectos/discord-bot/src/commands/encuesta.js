import { MessageFlags, SlashCommandBuilder } from "discord.js";
import { create } from "../features/polls.js";
import { parseDuration } from "../lib/duration.js";
import { fail } from "../lib/embeds.js";

export default {
  data: new SlashCommandBuilder()
    .setName("encuesta")
    .setDescription("Crea una encuesta con botones que se cierra sola")
    .addStringOption((o) => o.setName("pregunta").setDescription("¿Qué quieres preguntar?").setRequired(true).setMaxLength(200))
    .addStringOption((o) =>
      o.setName("opciones").setDescription("Opciones separadas por | (ej: Pizza | Sushi | Tacos)").setRequired(true),
    )
    .addStringOption((o) => o.setName("duracion").setDescription("Ej: 30m, 2h, 1d (por defecto 1d)")),

  async execute(interaction) {
    const question = interaction.options.getString("pregunta");
    const options = interaction.options
      .getString("opciones")
      .split("|")
      .map((s) => s.trim())
      .filter(Boolean);
    const duration = parseDuration(interaction.options.getString("duracion") ?? "1d");

    const error =
      options.length < 2 ? "Necesito al menos 2 opciones separadas por `|`."
      : options.length > 10 ? "Máximo 10 opciones."
      : options.some((o) => o.length > 80) ? "Cada opción puede tener como mucho 80 caracteres."
      : !duration ? "Duración no válida. Usa por ejemplo `30m`, `2h` o `1d`."
      : duration > 30 * 86_400_000 ? "La duración máxima es de 30 días."
      : null;

    if (error) return interaction.reply({ embeds: [fail(error)], flags: MessageFlags.Ephemeral });
    await create(interaction, question, options, duration);
  },
};
