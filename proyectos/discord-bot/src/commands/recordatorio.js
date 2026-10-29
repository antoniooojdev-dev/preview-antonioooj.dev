import { randomUUID } from "node:crypto";
import { MessageFlags, SlashCommandBuilder } from "discord.js";
import { db, save } from "../lib/store.js";
import { discordTime, formatDuration, parseDuration } from "../lib/duration.js";
import { fail, info, ok } from "../lib/embeds.js";

const MAX_PER_USER = 10;

export default {
  data: new SlashCommandBuilder()
    .setName("recordatorio")
    .setDescription("Te recuerdo algo por mensaje privado")
    .addSubcommand((s) =>
      s
        .setName("crear")
        .setDescription("Nuevo recordatorio")
        .addStringOption((o) => o.setName("en").setDescription("Dentro de cuánto: 10m, 2h, 1d…").setRequired(true))
        .addStringOption((o) => o.setName("texto").setDescription("¿Qué te recuerdo?").setRequired(true).setMaxLength(500)),
    )
    .addSubcommand((s) => s.setName("lista").setDescription("Tus recordatorios pendientes"))
    .addSubcommand((s) => s.setName("borrar").setDescription("Borra todos tus recordatorios")),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const userId = interaction.user.id;
    const mine = db.reminders.filter((r) => r.userId === userId).sort((a, b) => a.at - b.at);
    const reply = (embed) => interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });

    if (sub === "lista") {
      if (!mine.length) return reply(info("No tienes recordatorios pendientes."));
      return reply(info(mine.map((r, i) => `**${i + 1}.** ${discordTime(r.at)} — ${r.text}`).join("\n")));
    }

    if (sub === "borrar") {
      db.reminders = db.reminders.filter((r) => r.userId !== userId);
      save();
      return reply(ok(`Borrados ${mine.length} recordatorios.`));
    }

    const ms = parseDuration(interaction.options.getString("en"));
    if (!ms || ms > 365 * 86_400_000) return reply(fail("Tiempo no válido. Ej: `10m`, `2h30m`, `3d`."));
    if (mine.length >= MAX_PER_USER) return reply(fail(`Máximo ${MAX_PER_USER} recordatorios a la vez.`));

    const at = Date.now() + ms;
    db.reminders.push({
      id: randomUUID(),
      userId,
      channelId: interaction.channelId,
      text: interaction.options.getString("texto"),
      at,
    });
    save();
    return reply(ok(`Te lo recuerdo en **${formatDuration(ms)}** (${discordTime(at, "f")}).`));
  },
};
